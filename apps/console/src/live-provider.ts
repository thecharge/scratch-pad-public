import {
  AuthScheme,
  CONSOLE_OWN_READS,
  EndpointPath,
  Glyph,
  HttpHeader,
  HttpMethod,
  MediaType,
  SSE_DATA_PREFIX,
  SSE_FRAME_SEPARATOR,
  Text,
} from "@platform/constants";
import {
  ApiEventSchema,
  type ConsoleConfig,
  type CountedLiveProvider,
  type LiveSubscription,
  type ParsedFrames,
  type TokenStore,
} from "@platform/types";
import { all } from "@platform/util/browser";
import type { LiveEvent } from "@refinedev/core";
import { hasAdminScope } from "./claims.ts";

export async function parseFrames(buffer: string): Promise<ParsedFrames> {
  const frames = buffer.split(SSE_FRAME_SEPARATOR);
  const rest = frames.pop() ?? Text.Empty;
  const events = frames.flatMap((frame) =>
    frame
      .split(Text.Newline)
      .filter((line) => line.startsWith(SSE_DATA_PREFIX))
      .map((line) => line.slice(SSE_DATA_PREFIX.length).trim()),
  );
  return { events, rest };
}

async function validEvent(text: unknown): Promise<ReturnType<typeof ApiEventSchema.safeParse>> {
  try {
    return ApiEventSchema.safeParse(JSON.parse(String(text)));
  } catch {
    return ApiEventSchema.safeParse(undefined);
  }
}

export function createLiveProvider(
  config: ConsoleConfig,
  tokens: TokenStore,
  fetcher: typeof fetch = fetch,
): CountedLiveProvider {
  const counts = { dropped: 0 };

  async function pump(
    signal: AbortSignal,
    deliver: (event: unknown) => Promise<void>,
  ): Promise<void> {
    const response = await fetcher(new URL(EndpointPath.Events, config.apiOrigin), {
      method: HttpMethod.Get,
      signal,
      headers: {
        [HttpHeader.Authorization]: [AuthScheme.Bearer, tokens.get()].join(Glyph.Space),
        [HttpHeader.Accept]: MediaType.EventStream,
      },
    });
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let pending: string = Text.Empty;
    while (reader !== undefined && !signal.aborted) {
      const chunk = await reader.read();
      if (chunk.done) {
        return;
      }
      const parsed = await parseFrames(pending + decoder.decode(chunk.value));
      pending = parsed.rest;
      await all(parsed.events.map((event) => async () => deliver(event)));
    }
  }

  function deliverTo(channel: string, callback: (event: LiveEvent) => void) {
    return async (raw: unknown) => {
      const parsed = await validEvent(raw);
      if (!parsed.success) {
        counts.dropped += 1;
        return;
      }
      if (CONSOLE_OWN_READS.includes(parsed.data.capability)) {
        return;
      }
      callback({ channel, type: parsed.data.kind, payload: parsed.data, date: new Date() });
    };
  }

  return {
    dropped: async () => counts.dropped,
    subscribe: ({ channel, callback }): LiveSubscription => {
      const controller = new AbortController();
      if (hasAdminScope(tokens.get())) {
        void pump(controller.signal, deliverTo(channel, callback)).catch(() => undefined);
      }
      return { abort: () => controller.abort() };
    },
    unsubscribe: (subscription: LiveSubscription) => subscription.abort(),
  };
}
