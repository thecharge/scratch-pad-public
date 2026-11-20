import {
  AuthScheme,
  CanonicalCode,
  ConsoleApiPath,
  ConsoleFilterKey,
  ConsoleQuery,
  ConsoleResource,
  DEFAULT_LOG_LIMIT,
  ErrorReason,
  Glyph,
  HttpHeader,
  HttpMethod,
  MediaType,
  MessageId,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { type ConsoleConfig, EventListSchema, type TokenStore } from "@platform/types";
import type { DataProvider } from "@refinedev/core";
import { hasAdminScope } from "./claims.ts";

const PATHS: Readonly<Record<string, ConsoleApiPath>> = {
  [ConsoleResource.Stats]: ConsoleApiPath.Stats,
  [ConsoleResource.Logs]: ConsoleApiPath.Logs,
};

async function readOnly(): Promise<never> {
  throw new ApiError(
    CanonicalCode.FailedPrecondition,
    ErrorReason.MethodNotAllowed,
    MessageId.UiReadOnly,
  );
}

async function get(
  config: ConsoleConfig,
  tokens: TokenStore,
  fetcher: typeof fetch,
  path: string,
  query: URLSearchParams = new URLSearchParams(),
): Promise<unknown> {
  const url = new URL(path, config.apiOrigin);
  url.search = query.toString();
  const response = await fetcher(url, {
    method: HttpMethod.Get,
    headers: {
      [HttpHeader.Authorization]: [AuthScheme.Bearer, tokens.get()].join(Glyph.Space),
      [HttpHeader.Accept]: MediaType.Json,
    },
  });
  return response.json();
}

export function createDataProvider(
  config: ConsoleConfig,
  tokens: TokenStore,
  fetcher: typeof fetch = fetch,
): DataProvider {
  return {
    getApiUrl: () => config.apiOrigin,
    getList: async ({ resource, filters }) => {
      if (!hasAdminScope(tokens.get())) {
        return { data: [], total: 0 };
      }
      const query = new URLSearchParams([
        ...(filters ?? []).flatMap((filter) =>
          ConsoleFilterKey.Field in filter &&
          filter.value !== undefined &&
          filter.value !== Text.Empty
            ? [[filter.field, String(filter.value)]]
            : [],
        ),
        [ConsoleQuery.PageSize, String(DEFAULT_LOG_LIMIT)],
      ]);
      const body = await get(config, tokens, fetcher, PATHS[resource] ?? resource, query);
      const events = EventListSchema.parse(body).events.toReversed();
      return { data: events as never, total: events.length };
    },
    getOne: async ({ resource, id }) => {
      if (!hasAdminScope(tokens.get())) {
        return { data: {} as never };
      }
      return {
        data: {
          id,
          ...((await get(config, tokens, fetcher, PATHS[resource] ?? resource)) as object),
        } as never,
      };
    },
    create: async () => readOnly(),
    update: async () => readOnly(),
    deleteOne: async () => readOnly(),
  };
}
