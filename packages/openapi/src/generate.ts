import { collectionOf, publicPath, routeFor, splitInput } from "@platform/aip";
import {
  API_VERSION_STABILITY,
  ASSET_BINARY_FORMAT,
  ASSET_CHECKSUM_PATTERN,
  AuthMode,
  EXAMPLE_NAME,
  EXAMPLES_KEY,
  ExampleIo,
  type HttpMethod,
  MediaType,
  MessageId,
  NOT_ACCEPTABLE_STATUS,
  OK_STATUS,
  OPENAPI_STABILITY_KEY,
  OpenApiLiteral,
  SAMPLE_NUMBER,
  SAMPLE_STRING,
  SchemaKey,
  SchemaType,
  SchemaUnrepresentable,
  TransportKind,
  UNSUPPORTED_MEDIA_TYPE_STATUS,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync } from "@platform/store";
import {
  ApiErrorBodySchema,
  type Capability,
  type JsonObject,
  type OpenApiDocument,
  OpenApiDocumentSchema,
  type OpenApiOptions,
  type RouteSpec,
} from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";

const BEARER = { [OpenApiLiteral.BearerScheme]: [] };
const SECURITY: Readonly<Record<AuthMode, JsonObject[] | undefined>> = {
  [AuthMode.None]: undefined,
  [AuthMode.Optional]: [{}, BEARER],
  [AuthMode.Required]: [BEARER],
};

async function pick(
  capability: Capability,
  keys: readonly string[],
): Promise<z.ZodObject | undefined> {
  const input = capability.input;
  if (!(input instanceof z.ZodObject) || keys.length === 0) {
    return undefined;
  }
  const wanted = Object.fromEntries(keys.map((key) => [key, true] as const));
  return input.pick(wanted as never);
}

async function pathParams(route: RouteSpec): Promise<z.ZodObject> {
  const names = route.segments.flatMap((segment) => segment.match(/\{(\w+)\}/g) ?? []);
  return z.object(Object.fromEntries(names.map((name) => [name.slice(1, -1), z.string()])));
}

const SCALAR_SAMPLES: Readonly<Record<string, unknown>> = {
  [SchemaType.String]: SAMPLE_STRING,
  [SchemaType.Number]: SAMPLE_NUMBER,
  [SchemaType.Integer]: SAMPLE_NUMBER,
  [SchemaType.Boolean]: false,
  [SchemaType.Null]: null,
  [SchemaType.Array]: [],
};

async function objectSample(node: JsonObject): Promise<JsonObject> {
  const properties = (node[SchemaKey.Properties] ?? {}) as Record<string, JsonObject>;
  const required = (node[SchemaKey.Required] ?? []) as string[];
  const present = required.filter((key) => key in properties);
  return Object.fromEntries(
    await all(
      present.map((key) => async () => [key, await sampleOf(properties[key] as JsonObject)]),
    ),
  );
}

async function sampleOf(node: JsonObject): Promise<unknown> {
  const options = (node[SchemaKey.AnyOf] ?? node[SchemaKey.Enum]) as unknown[] | undefined;
  if (SchemaKey.Const in node) {
    return node[SchemaKey.Const];
  }
  if (options !== undefined) {
    return node[SchemaKey.AnyOf] === undefined
      ? options[0]
      : await sampleOf(options[0] as JsonObject);
  }
  return node[SchemaKey.Type] === SchemaType.Object
    ? await objectSample(node)
    : SCALAR_SAMPLES[String(node[SchemaKey.Type])];
}

export async function exampleFor(schema: z.ZodType, io: ExampleIo): Promise<unknown> {
  const described = z.toJSONSchema(schema, {
    io: io as never,
    unrepresentable: SchemaUnrepresentable.Any as never,
  }) as JsonObject;
  return sampleOf(described);
}

async function jsonContent(schema: z.ZodType, io: ExampleIo) {
  const example = { [EXAMPLE_NAME]: { value: await exampleFor(schema, io) } };
  const media = { schema, [EXAMPLES_KEY]: example };
  const content = { [MediaType.Json]: media };
  return { content };
}

async function successContent(capability: Capability) {
  const json = await jsonContent(capability.output, ExampleIo.Output);
  if (capability.events === undefined) {
    return json;
  }
  const item =
    capability.events.item === undefined
      ? json.content[MediaType.Json]
      : (await jsonContent(capability.events.item, ExampleIo.Output)).content[MediaType.Json];
  return { content: { ...json.content, [MediaType.EventStream]: item } };
}

async function responsesFor(capability: Capability, hasBody: boolean) {
  const success = {
    description: OpenApiLiteral.OkDescription,
    ...(await successContent(capability)),
  };
  const failure = {
    description: OpenApiLiteral.ErrorDescription,
    ...(await jsonContent(ApiErrorBodySchema, ExampleIo.Output)),
  };
  const notAcceptable = { ...failure, description: OpenApiLiteral.NotAcceptableDescription };
  const unsupported = { ...failure, description: OpenApiLiteral.UnsupportedMediaTypeDescription };
  return {
    [OK_STATUS]: success,
    [NOT_ACCEPTABLE_STATUS]: notAcceptable,
    ...(hasBody ? { [UNSUPPORTED_MEDIA_TYPE_STATUS]: unsupported } : {}),
    [OpenApiLiteral.DefaultResponse]: failure,
  };
}

async function bodyContent(body: z.ZodType) {
  const json = await jsonContent(body, ExampleIo.Input);
  const collection = await collectionOf(body);
  const lines = { schema: collection?.element };
  const content = { ...json.content, [MediaType.Ndjson]: lines };
  return collection === undefined ? json : { content };
}

async function requestFor(capability: Capability, route: RouteSpec) {
  if (capability.media !== undefined) {
    const content = Object.fromEntries(
      capability.media.mediaTypes.map((mediaType) => [
        mediaType,
        { schema: z.string().meta({ format: ASSET_BINARY_FORMAT }) },
      ]),
    );
    const headers = z.object({
      [capability.media.checksumHeader]: z.string().regex(ASSET_CHECKSUM_PATTERN),
    });
    return { params: await pathParams(route), headers, body: { required: true, content } };
  }
  const split = await splitInput(capability, route);
  const query = await pick(capability, split.query);
  const body = await pick(capability, split.body);
  return {
    params: await pathParams(route),
    ...(query === undefined ? {} : { query }),
    ...(body === undefined ? {} : { body: await bodyContent(body) }),
  };
}

async function operationFor(capability: Capability) {
  const route = await routeFor(capability);
  const request = await requestFor(capability, route);
  const security = SECURITY[capability.auth];
  return {
    method: route.method.toLowerCase() as Lowercase<HttpMethod>,
    path: await publicPath(route, capability.version),
    operationId: capability.id,
    [OPENAPI_STABILITY_KEY]: API_VERSION_STABILITY[capability.version],
    summary: capability.summary,
    description: capability.description,
    request,
    responses: await responsesFor(capability, request.body !== undefined),
    ...(security === undefined ? {} : { security }),
  };
}

export async function generateOpenApi(
  capabilities: readonly Capability[],
  options: OpenApiOptions,
): Promise<OpenApiDocument> {
  const { OpenAPIHono } = await import("@hono/zod-openapi");
  const app = new OpenAPIHono();
  app.openAPIRegistry.registerComponent(
    OpenApiLiteral.SecuritySchemes,
    OpenApiLiteral.BearerScheme,
    {
      type: OpenApiLiteral.HttpType,
      scheme: OpenApiLiteral.BearerKeyword,
      bearerFormat: OpenApiLiteral.JwtFormat,
    },
  );
  const served = await filterAsync(
    capabilities,
    async (capability) => capability.onlyOver !== TransportKind.Mcp,
  );
  for (const capability of served) {
    app.openAPIRegistry.registerPath((await operationFor(capability)) as never);
  }
  const document = app.getOpenAPI31Document({
    openapi: OpenApiLiteral.Version,
    info: {
      title: options.title,
      version: options.version,
      description: message(MessageId.OpenApiHeadersDescription),
    },
  });
  return OpenApiDocumentSchema.parse(JSON.parse(JSON.stringify(document)));
}
