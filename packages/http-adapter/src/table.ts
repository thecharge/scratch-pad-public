import { parseResourceName } from "@platform/aip";
import {
  CUSTOM_VERB_SEPARATOR,
  PARAM_SEGMENT_PATTERN,
  RouteOutcome,
  Separator,
  Text,
} from "@platform/constants";
import { filterAsync } from "@platform/store";
import type { RouteMatch, RouteSpec, VerbSplit } from "@platform/types";

const FORBIDDEN_IN_ID: readonly string[] = [Separator.Resource, CUSTOM_VERB_SEPARATOR];

async function decode(segment: string): Promise<string | undefined> {
  try {
    return decodeURIComponent(segment);
  } catch {
    return undefined;
  }
}

async function splitVerb(last: string): Promise<VerbSplit> {
  const at = last.lastIndexOf(CUSTOM_VERB_SEPARATOR);
  return at < 0 ? { id: last } : { id: last.slice(0, at), verb: last.slice(at + 1) };
}

async function decodedSegments(rest: readonly string[], id: string): Promise<string[] | undefined> {
  const decoded: (string | undefined)[] = [];
  for (const item of [...rest.slice(0, -1), id]) {
    decoded.push(await decode(item));
  }
  const clean = decoded.every(
    (segment) => segment !== undefined && !FORBIDDEN_IN_ID.some((mark) => segment.includes(mark)),
  );
  return clean ? (decoded as string[]) : undefined;
}

async function pathMatches(route: RouteSpec, segments: readonly string[]): Promise<boolean> {
  const name = segments.join(Separator.Resource);
  return (await parseResourceName(route.segments.join(Separator.Resource), name)) !== undefined;
}

async function missing(
  verb: string | undefined,
  routes: readonly RouteSpec[],
): Promise<RouteMatch> {
  const unknown = verb !== undefined && routes.every((route) => route.verb !== verb);
  return {
    outcome: unknown ? RouteOutcome.UnknownVerb : RouteOutcome.NotFound,
    allowed: [],
    ...(verb === undefined ? {} : { verb }),
  };
}

export async function matchRoute(
  routes: readonly RouteSpec[],
  method: string,
  rest: readonly string[],
): Promise<RouteMatch> {
  const { id, verb } = await splitVerb(rest.at(-1) ?? Text.Empty);
  const segments = await decodedSegments(rest, id);
  const candidates = await filterAsync(
    routes
      .map((route, index) => ({ route, index }))
      .filter(
        ({ route }) =>
          route.verb === verb &&
          (segments === undefined ||
            (route.segments.length === segments.length &&
              route.segments.every(
                (part, at) => PARAM_SEGMENT_PATTERN.test(part) || part === segments[at],
              ))),
      ),
    async ({ route }) => segments !== undefined && (await pathMatches(route, segments)),
  );
  if (candidates.length === 0) {
    return missing(verb, routes);
  }
  const hit = candidates.find(({ route }) => route.method === method);
  const allowed = candidates.map(({ route }) => route.method);
  return hit === undefined
    ? { outcome: RouteOutcome.WrongMethod, allowed }
    : { outcome: RouteOutcome.Matched, index: hit.index, allowed, ...(verb ? { verb } : {}) };
}
