import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  ErrorReason,
  HttpHeader,
  HttpMethod,
  MethodKind,
} from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import type { RouteSpec } from "@platform/types";
import { z } from "zod";
import { requireAccept, requireContentType } from "../../../packages/http-adapter/src/headers.ts";

const URL_OF = "http://localhost/v1/ticks/t1";
const JSON_TYPE = "application/json";
const STREAM_TYPE = "text/event-stream";

async function* nothing(): AsyncGenerator<unknown> {}

const TICK_EVENTS = { name: "tick", source: async () => nothing() };

const BATCH_INPUT = z.object({
  parent: z.string(),
  requests: z.array(z.object({ id: z.string() })),
});
const PLAIN_INPUT = z.object({ name: z.string() });

async function capabilityOf(events: boolean, collection = false) {
  return defineCapability({
    id: "ticks.get",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: "ticks/{tick}",
    summary: "Get a tick",
    description: "Gets a tick.",
    auth: AuthMode.None,
    input: collection ? BATCH_INPUT : PLAIN_INPUT,
    output: z.object({ n: z.number() }),
    handler: async () => ({ n: 0 }),
    ...(events ? { events: TICK_EVENTS } : {}),
  });
}

const plain = await capabilityOf(false);
const streaming = await capabilityOf(true);
const batch = await capabilityOf(false, true);
const asking = (accept?: string) =>
  new Request(URL_OF, { headers: accept === undefined ? {} : { [HttpHeader.Accept]: accept } });

unit(requireAccept, {
  positive: [
    positive("application/json is served", [asking(JSON_TYPE), plain], undefined),
    positive("any media type is served", [asking("*/*"), plain], undefined),
    positive(
      "a type range and a quality list are served",
      [asking("text/*;q=0.5, application/*"), streaming],
      undefined,
    ),
    positive(
      "an event capability serves the event stream",
      [asking(STREAM_TYPE), streaming],
      undefined,
    ),
  ],
  negative: [
    negative("a missing Accept is ACCEPT_REQUIRED", [asking(), plain], {
      reason: ErrorReason.AcceptRequired,
    }),
    negative("an empty Accept is ACCEPT_REQUIRED", [asking(" "), plain], {
      reason: ErrorReason.AcceptRequired,
    }),
    negative("text/html alone is ACCEPT_UNSUPPORTED", [asking("text/html"), plain], {
      reason: ErrorReason.AcceptUnsupported,
    }),
    negative(
      "the event stream on a plain operation is ACCEPT_UNSUPPORTED",
      [asking(STREAM_TYPE), plain],
      {
        reason: ErrorReason.AcceptUnsupported,
      },
    ),
    negative(
      "a refused quality of zero is ACCEPT_UNSUPPORTED",
      [asking("application/json;q=0"), plain],
      {
        reason: ErrorReason.AcceptUnsupported,
      },
    ),
  ],
});

const POST_ROUTE = { method: HttpMethod.Post } as RouteSpec;
const GET_ROUTE = { method: HttpMethod.Get } as RouteSpec;
const sending = (contentType?: string, body: string | null = "{}") =>
  new Request(URL_OF, {
    method: "POST",
    ...(body === null ? {} : { body }),
    headers: contentType === undefined ? {} : { [HttpHeader.ContentType]: contentType },
  });
const LINES = "application/x-ndjson";

unit(requireContentType, {
  positive: [
    positive(
      "a JSON body with its type is accepted",
      [sending(JSON_TYPE), POST_ROUTE, plain],
      undefined,
    ),
    positive(
      "a JSON type with a charset is accepted",
      [sending("application/json; charset=utf-8"), POST_ROUTE, plain],
      undefined,
    ),
    positive(
      "a line-delimited body is accepted where the operation takes a collection",
      [sending(LINES), POST_ROUTE, batch],
      undefined,
    ),
    positive(
      "a request without a body needs no type",
      [sending(undefined, null), POST_ROUTE, plain],
      undefined,
    ),
    positive("a GET never needs a type", [sending(undefined), GET_ROUTE, plain], undefined),
  ],
  negative: [
    negative(
      "a body without a type is CONTENT_TYPE_REQUIRED",
      [sending(undefined), POST_ROUTE, plain],
      {
        reason: ErrorReason.ContentTypeRequired,
      },
    ),
    negative("text/plain is CONTENT_TYPE_UNSUPPORTED", [sending("text/plain"), POST_ROUTE, plain], {
      reason: ErrorReason.ContentTypeUnsupported,
    }),
    negative(
      "form data is CONTENT_TYPE_UNSUPPORTED",
      [sending("multipart/form-data"), POST_ROUTE, plain],
      { reason: ErrorReason.ContentTypeUnsupported },
    ),
    negative(
      "a line-delimited body is refused where the operation takes no collection",
      [sending(LINES), POST_ROUTE, plain],
      { reason: ErrorReason.ContentTypeUnsupported },
    ),
  ],
});
