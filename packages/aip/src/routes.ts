import {
  AipParam,
  type ApiVersion,
  CUSTOM_VERB_SEPARATOR,
  HttpMethod,
  ID_FIELD_SUFFIX,
  InputField,
  MethodKind,
  PARAM_SEGMENT_PATTERN,
  PathStyle,
  ROUTE_PARAM_PREFIX,
  RouteScope,
  Separator,
  Text,
  VERB_PATH_SEGMENT,
} from "@platform/constants";
import { filterAsync } from "@platform/store";
import type { Capability, InputSplit, JsonObject, RouteSpec, StringRecord } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import { buildResourceName } from "./resource-name.ts";

const METHODS: Readonly<Record<MethodKind, HttpMethod>> = {
  [MethodKind.Get]: HttpMethod.Get,
  [MethodKind.List]: HttpMethod.Get,
  [MethodKind.Create]: HttpMethod.Post,
  [MethodKind.Update]: HttpMethod.Patch,
  [MethodKind.Delete]: HttpMethod.Delete,
  [MethodKind.Custom]: HttpMethod.Post,
  [MethodKind.BatchGet]: HttpMethod.Get,
  [MethodKind.BatchCreate]: HttpMethod.Post,
  [MethodKind.BatchUpdate]: HttpMethod.Post,
  [MethodKind.BatchDelete]: HttpMethod.Post,
};

const SCOPES: Readonly<Record<MethodKind, RouteScope>> = {
  [MethodKind.Get]: RouteScope.Item,
  [MethodKind.List]: RouteScope.Collection,
  [MethodKind.Create]: RouteScope.Collection,
  [MethodKind.Update]: RouteScope.Item,
  [MethodKind.Delete]: RouteScope.Item,
  [MethodKind.Custom]: RouteScope.Declared,
  [MethodKind.BatchGet]: RouteScope.Collection,
  [MethodKind.BatchCreate]: RouteScope.Collection,
  [MethodKind.BatchUpdate]: RouteScope.Collection,
  [MethodKind.BatchDelete]: RouteScope.Collection,
};

const BATCH_KINDS: readonly MethodKind[] = [
  MethodKind.BatchGet,
  MethodKind.BatchCreate,
  MethodKind.BatchUpdate,
  MethodKind.BatchDelete,
];

const QUERY_ONLY_FIELDS: readonly string[] = [
  AipParam.UpdateMask,
  AipParam.AllowMissing,
  AipParam.RequestId,
  AipParam.ValidateOnly,
  AipParam.Force,
];

const NO_BODY_METHODS: readonly HttpMethod[] = [HttpMethod.Get, HttpMethod.Delete];

async function endsWithParam(segments: readonly string[]): Promise<boolean> {
  return PARAM_SEGMENT_PATTERN.test(segments.at(-1) ?? Text.Empty);
}

async function resolveScope(kind: MethodKind, segments: readonly string[]): Promise<RouteScope> {
  const scope = SCOPES[kind];
  if (scope !== RouteScope.Declared) {
    return scope;
  }
  return (await endsWithParam(segments)) ? RouteScope.Item : RouteScope.Collection;
}

async function verbOf(capability: Capability): Promise<string | undefined> {
  if (capability.method === MethodKind.Custom) {
    return capability.customVerb;
  }
  return BATCH_KINDS.includes(capability.method) ? capability.method : undefined;
}

async function targetOf(
  scope: RouteScope,
  segments: readonly string[],
): Promise<InputField | undefined> {
  if (scope === RouteScope.Item) {
    return InputField.Name;
  }
  return segments.length > 1 ? InputField.Parent : undefined;
}

export async function routeFor(capability: Capability): Promise<RouteSpec> {
  const declared = capability.resource.split(Separator.Resource);
  const scope = await resolveScope(capability.method, declared);
  const segments =
    scope === RouteScope.Collection && (await endsWithParam(declared))
      ? declared.slice(0, -1)
      : declared;
  const verb = await verbOf(capability);
  const method =
    capability.method === MethodKind.Custom
      ? (capability.httpMethod ?? METHODS[MethodKind.Custom])
      : METHODS[capability.method];
  const target = await targetOf(scope, segments);
  return {
    method,
    segments,
    scope,
    ...(verb === undefined ? {} : { verb }),
    ...(target === undefined ? {} : { target }),
  };
}

async function styled(segment: string, style: PathStyle): Promise<string> {
  const name = PARAM_SEGMENT_PATTERN.exec(segment)?.[1];
  if (name === undefined) {
    return segment;
  }
  return style === PathStyle.OpenApi ? segment : [ROUTE_PARAM_PREFIX, name].join(Text.Empty);
}

export async function publicPath(route: RouteSpec, version: ApiVersion, style = PathStyle.OpenApi) {
  const base = [
    version,
    ...(await all(route.segments.map((segment) => async () => styled(segment, style)))),
  ];
  const path = [Text.Empty, ...base].join(Separator.Resource);
  if (route.verb === undefined) {
    return path;
  }
  return style === PathStyle.OpenApi
    ? [path, route.verb].join(CUSTOM_VERB_SEPARATOR)
    : [path, VERB_PATH_SEGMENT, route.verb].join(Separator.Resource);
}

export async function pathInput(route: RouteSpec, params: StringRecord): Promise<JsonObject> {
  if (route.target === undefined) {
    return {};
  }
  const own = route.target === InputField.Name ? route.segments : route.segments.slice(0, -1);
  return { [route.target]: await buildResourceName(own.join(Separator.Resource), params) };
}

async function shapeKeys(capability: Capability): Promise<string[]> {
  return capability.input instanceof z.ZodObject ? Object.keys(capability.input.shape) : [];
}

async function isQueryField(
  key: string,
  method: HttpMethod,
  capability: Capability,
): Promise<boolean> {
  const isCreateId = capability.method === MethodKind.Create && key.endsWith(ID_FIELD_SUFFIX);
  return NO_BODY_METHODS.includes(method) || QUERY_ONLY_FIELDS.includes(key) || isCreateId;
}

export async function splitInput(capability: Capability, route: RouteSpec): Promise<InputSplit> {
  const derived: string[] = [InputField.Name, InputField.Parent];
  const keys = (await shapeKeys(capability)).filter((key) => !derived.includes(key));
  const query = await filterAsync(keys, async (key) => isQueryField(key, route.method, capability));
  return {
    path: (await shapeKeys(capability)).filter((key) => derived.includes(key)),
    query,
    body: keys.filter((key) => !query.includes(key)),
  };
}
