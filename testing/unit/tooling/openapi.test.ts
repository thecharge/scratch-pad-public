import { describe, expect, test } from "bun:test";
import { compare, currentDocument } from "../../../tooling/scripts/openapi-check.ts";

const OK_RESPONSES = { "200": { description: "ok" } };

function operation(id: string) {
  return { get: { operationId: id, responses: OK_RESPONSES } };
}

const REMOVED_ENDPOINT = JSON.stringify({
  openapi: "3.1.0",
  info: { title: "T", version: "1" },
  paths: {
    "/v1/operations/{operation}": operation("operations.get"),
    "/v1/removed": operation("removed.get"),
  },
});

const ADDED_PATH = JSON.stringify({ "/v1/added": operation("added.get") });

describe("breaking change gate", () => {
  test("the generated document is compatible with itself", async () => {
    const current = await currentDocument();
    expect(await compare(current, current)).toBe(0);
  });

  test("removing an endpoint within v1 is rejected", async () => {
    const current = await currentDocument();
    expect(await compare(REMOVED_ENDPOINT, current)).not.toBe(0);
  });

  test("adding an endpoint is allowed", async () => {
    const current = await currentDocument();
    const document = JSON.parse(current);
    const extended = { ...document, paths: { ...document.paths, ...JSON.parse(ADDED_PATH) } };
    expect(await compare(current, JSON.stringify(extended))).toBe(0);
  });
});
