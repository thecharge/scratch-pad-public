import { expect, test } from "bun:test";
import { fetchLiveInterfaces } from "@platform/kb-recorder";
import { checkInterfaces } from "../../../tooling/scripts/check-interfaces.ts";

const result = await checkInterfaces();
const live = await fetchLiveInterfaces();
const reversed = { ...live, tools: [...live.tools].reverse() };
const withoutTools = { ...live, tools: [] };
const emptyDocument = { ...live.document, paths: {} };
const withoutOperations = { ...live, document: emptyDocument };
const watched = { operationId: "operations.watch", responses: {} };
const watchRoute = { get: watched };
const leakedPaths = { ...live.document.paths, "/watch": watchRoute };
const leakedDocument = { ...live.document, paths: leakedPaths };
const leaked = { ...live, document: leakedDocument };

test.each(["the running api and tool server match"])("%s", async () => {
  expect(result).toBe(0);
});

test.each([
  ["the fresh proxy interfaces match", live],
  ["tool order does not affect the fresh proxy comparison", reversed],
] as const)("%s", async (_name, interfaces) => {
  expect(await checkInterfaces(async () => interfaces)).toBe(0);
});

test.each([
  ["removing the proxy tools is rejected", withoutTools],
  ["removing the proxy operations is rejected", withoutOperations],
  ["serving a tool-only capability as an operation is rejected", leaked],
] as const)("%s", async (_name, interfaces) => {
  expect(await checkInterfaces(async () => interfaces)).toBe(1);
});
