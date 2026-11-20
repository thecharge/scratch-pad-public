import { describe, expect, test } from "bun:test";
import { all } from "@platform/util";
import { findMissing, operationsIn } from "../../../tooling/scripts/check-error-cases.ts";

const REASONS = { reason: { enum: ["NOT_THERE", "TOO_BIG"] } };
const CONTENT = { content: { details: REASONS } };
const OPERATION = { operationId: "a.get", responses: { default: CONTENT } };
const PATHS = { "/v1/a": { get: OPERATION } };
const DOCUMENT = { paths: PATHS };
const CALL = "Call a.get to read. Token scopes: read.";
const NOT_THERE = "The call fails with the reason NOT_THERE.";
const TOO_BIG = "The call fails with the reason TOO_BIG.";

describe("error cases are shown in generated pages", () => {
  test.each([
    ["a missing call", `${NOT_THERE} ${TOO_BIG}`, ["a.get"], []],
    ["a missing reason", `${CALL} ${NOT_THERE}`, [], ["TOO_BIG"]],
    ["nothing", "", ["a.get"], ["NOT_THERE", "TOO_BIG"]],
  ])("reports %s", async (_name, pages, operations, reasons) => {
    const found = await findMissing(await operationsIn(DOCUMENT), pages);
    expect([found.operations, found.reasons]).toEqual([operations, reasons]);
  });

  test("passes when the call and every reason are shown", async () => {
    const found = await findMissing(
      await operationsIn(DOCUMENT),
      `${CALL} ${NOT_THERE} ${TOO_BIG}`,
    );
    expect([found.operations, found.reasons]).toEqual([[], []]);
  });

  test("an unreachable reason is exempt", async () => {
    const responses = { reason: { enum: ["FIELD_IMMUTABLE"] } };
    const operation = { operationId: "x", responses };
    const paths = { "/x": { get: operation } };
    const document = { paths };
    expect((await findMissing(await operationsIn(document), "Call x to y")).reasons).toEqual([]);
  });

  test("no schema uses the immutable field behavior, which keeps FIELD_IMMUTABLE unreachable", async () => {
    const files = await Array.fromAsync(
      new Bun.Glob("{apps/api,packages/types}/src/**/*.ts").scan(),
    );
    const texts = await all(files.map((file) => async () => Bun.file(file).text()));
    const users = files.filter((_file, index) =>
      /FieldBehavior\.Immutable/.test(texts[index] ?? ""),
    );
    expect(users).toEqual([]);
  });
});
