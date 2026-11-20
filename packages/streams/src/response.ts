import { HttpHeader, MediaType } from "@platform/constants";
import type { JsonDocument } from "@platform/types";
import { writeJson } from "./json.ts";

async function* elementsOf(values: readonly unknown[]): AsyncGenerator<unknown> {
  for (const value of values) {
    yield value;
  }
}

async function streamable(body: JsonDocument): Promise<JsonDocument> {
  return Object.fromEntries(
    Object.entries(body).map(([key, value]) => [
      key,
      Array.isArray(value) ? elementsOf(value) : value,
    ]),
  );
}

export async function jsonResponse(
  status: number,
  body: unknown,
  headers: Headers = new Headers(),
) {
  headers.set(HttpHeader.ContentType, MediaType.Json);
  if (body instanceof Object && !Array.isArray(body)) {
    return new Response(await writeJson(await streamable(body as JsonDocument)), {
      status,
      headers,
    });
  }
  return new Response(JSON.stringify(body), { status, headers });
}
