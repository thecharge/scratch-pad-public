import { describe, expect, test } from "bun:test";
import { STATE_MIME_TYPE } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { oneTick, stubServer, tickCapability } from "@platform/test-scenarios";
import type { Invoke, ReadStateCallback } from "@platform/types";
import { ANONYMOUS_PRINCIPAL } from "@platform/types";
import { registerStateResource } from "../../../packages/mcp-adapter/src/events.ts";

const answering: Invoke = async () => ({ output: { n: 7 } }) as never;
const refusing: Invoke = async () => {
  throw new Error("denied");
};
const withEvents = await tickCapability(oneTick);
const withoutEvents = await tickCapability();
const forTemplate = stubServer();
const forRead = stubServer();
const forNothing = stubServer();
const forRefusal = stubServer(new Error("server refused"));
const forDenied = stubServer();
const URI = new URL("state://ticks/t1");
const VARIABLES = { tick: "t1" };

const templateOf = (calls: unknown[][]) => {
  const [name, template, config] = calls[0] ?? [];
  return [
    name,
    String(Reflect.get(Object(template), "uriTemplate")),
    Reflect.get(Object(config), "mimeType"),
  ];
};
const readOf = (calls: unknown[][]) => {
  const registration = calls[0] ?? [];
  return (registration[3] as ReadStateCallback)(URI, VARIABLES);
};
const EXPECTED_TEMPLATE = ["ticks.get", "state://ticks/{tick}", STATE_MIME_TYPE];
const EXPECTED_CONTENTS = {
  contents: [{ uri: "state://ticks/t1", mimeType: STATE_MIME_TYPE, text: '{"n":7}' }],
};
const REFUSED = { message: "server refused" };

unit(registerStateResource, {
  positive: [
    positive(
      "registers a resource template named after the capability",
      [forTemplate.server, withEvents, answering, ANONYMOUS_PRINCIPAL, false, "r1"],
      seen(() => templateOf(forTemplate.calls), EXPECTED_TEMPLATE),
    ),
    positive(
      "its read callback returns the state as JSON text",
      [forRead.server, withEvents, answering, ANONYMOUS_PRINCIPAL, false, "r1"],
      seen(() => readOf(forRead.calls), EXPECTED_CONTENTS),
    ),
  ],
  negative: [
    rejected(
      "registers nothing for a capability without an event source",
      [forNothing.server, withoutEvents, answering, ANONYMOUS_PRINCIPAL, false, "r1"],
      seen(() => forNothing.calls.length, 0),
    ),
    negative(
      "fails when the server refuses the registration",
      [forRefusal.server, withEvents, answering, ANONYMOUS_PRINCIPAL, false, "r1"],
      REFUSED,
    ),
  ],
});

describe("the read callback of a state resource", () => {
  test("fails when the capability refuses the caller", async () => {
    await registerStateResource(
      forDenied.server,
      withEvents,
      refusing,
      ANONYMOUS_PRINCIPAL,
      false,
      "r1",
    );
    await expect(readOf(forDenied.calls)).rejects.toThrow("denied");
  });
});
