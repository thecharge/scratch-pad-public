import {
  CanonicalCode,
  HttpHeader,
  MediaType,
  MessageId,
  SDK_STREAM_PARSE,
  Separator,
} from "@platform/constants";
import { message } from "@platform/messages";
import { readEvents, StreamError } from "@platform/streams";
import { type Operation, OperationSchema } from "@platform/types";
import type { Client } from "../generated/client/index.ts";
import { operationsGet } from "../generated/sdk.gen.ts";
import { ApiClientError } from "./error.ts";
import { unwrap } from "./unwrap.ts";

async function ended(operation: Operation): Promise<ApiClientError> {
  const { error } = operation;
  return error === undefined
    ? new ApiClientError(
        CanonicalCode.Unavailable,
        message(MessageId.SdkStreamEnded, { name: operation.name }),
      )
    : new ApiClientError(error.status, error.message, error.details[0]?.reason, error.code);
}

async function* operationsIn(stream: ReadableStream<Uint8Array>): AsyncGenerator<Operation> {
  for await (const event of readEvents(stream)) {
    yield OperationSchema.parse(event.data);
  }
}

async function* untilDone(states: AsyncIterable<Operation>): AsyncGenerator<Operation, boolean> {
  for await (const state of states) {
    yield state;
    if (state.done) {
      return true;
    }
  }
  return false;
}

async function* statesOf(
  stream: ReadableStream<Uint8Array>,
  name: string,
): AsyncGenerator<Operation> {
  let finished = false;
  try {
    finished = yield* untilDone(operationsIn(stream));
  } catch (error) {
    if (error instanceof StreamError) {
      throw new ApiClientError(CanonicalCode.Unavailable, error.message);
    }
    throw error;
  }
  if (!finished) {
    throw await ended({ name, done: false });
  }
}

export async function* followOperation(client: Client, name: string): AsyncGenerator<Operation> {
  const id = name.split(Separator.Resource).at(-1) ?? name;
  const body: unknown = await unwrap(
    operationsGet({
      client,
      path: { operation: id },
      headers: { [HttpHeader.Accept]: MediaType.EventStream },
      parseAs: SDK_STREAM_PARSE,
    }),
  );
  if (!(body instanceof ReadableStream)) {
    throw await ended({ name, done: false });
  }
  for await (const operation of statesOf(body, name)) {
    yield operation;
    if (operation.done && operation.error !== undefined) {
      throw await ended(operation);
    }
  }
}
