import { expect } from "bun:test";
import { createRegistry } from "@platform/api/registry";
import { TransportKind } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import type { LiveInterfaces } from "@platform/types";
import {
  checkInterfaces,
  interfaceFindings,
  problemsOf,
} from "../../../tooling/scripts/check-interfaces.ts";

const NONE: string[] = [];
const FINDINGS = { operationsWithoutTool: NONE, toolsWithoutOperation: NONE, leaks: NONE };

const capabilities = await (await createRegistry()).list();
const operationIds = capabilities
  .filter((capability) => capability.onlyOver !== TransportKind.Mcp)
  .map(({ id }) => id);
const toolIds = capabilities
  .filter((capability) => capability.onlyOver !== TransportKind.Http)
  .map(({ id }) => id);

const INFO = { title: "t", version: "1" };
const NO_RESPONSES = {};
const described = (id: string) => ({ operationId: id, responses: NO_RESPONSES });
const operation = (id: string) => ({ get: described(id) });
const live = (operations: string[], tools: string[]): (() => Promise<LiveInterfaces>) => {
  const document = {
    openapi: "3.1.0",
    info: INFO,
    paths: Object.fromEntries(operations.map((id) => [`/${id}`, operation(id)])),
    components: {},
  };
  const list = tools.map((name) => ({ name, description: "d", inputSchema: {} }));
  return async () => ({ document, tools: list });
};

unit(interfaceFindings, {
  positive: [
    positive("both interfaces serve every capability", [["a", "b"], ["b", "a"], NONE], FINDINGS),
    positive(
      "a declared one-interface capability is missing from the other",
      [["a", "b"], ["a"], ["b"]],
      FINDINGS,
    ),
  ],
  negative: [
    rejected("an operation without a tool", [["a", "b"], ["a"], NONE], {
      ...FINDINGS,
      operationsWithoutTool: ["b"],
    }),
    rejected("a tool without an operation", [["a"], ["a", "b"], NONE], {
      ...FINDINGS,
      toolsWithoutOperation: ["b"],
    }),
    rejected("a one-interface capability served by both", [["a"], ["a"], ["a"]], {
      ...FINDINGS,
      leaks: ["a"],
    }),
  ],
});

unit(problemsOf, {
  positive: [
    positive("no findings give no problems", [FINDINGS], []),
    positive("empty lists give no problems", [{ ...FINDINGS, leaks: [] }], []),
  ],
  negative: [
    rejected(
      "an operation without a tool is described",
      [{ ...FINDINGS, operationsWithoutTool: ["b"] }],
      [expect.stringContaining("b")],
    ),
    rejected(
      "a leak is described",
      [{ ...FINDINGS, leaks: ["a"] }],
      [expect.stringContaining("a")],
    ),
  ],
});

const listing =
  (...entries: object[]) =>
  async () =>
    entries as never;
const SERVED_ONLY_OVER_TOOLS = listing(
  { id: "a.get" },
  { id: "tool.only", onlyOver: TransportKind.Mcp },
);

unit(checkInterfaces, {
  positive: [
    positive("matching interfaces exit with 0", [live(operationIds, toolIds)], 0),
    positive(
      "a capability served over tools only is expected in the tools alone",
      [live(["a.get"], ["a.get", "tool.only"]), SERVED_ONLY_OVER_TOOLS],
      0,
    ),
    positive(
      "the order of the tools does not matter",
      [live(operationIds, [...toolIds].reverse())],
      0,
    ),
  ],
  negative: [
    rejected(
      "a tools only capability that also has an operation is a leak",
      [live(["a.get", "tool.only"], ["a.get", "tool.only"]), SERVED_ONLY_OVER_TOOLS],
      1,
    ),
    rejected("a missing tool exits with 1", [live(operationIds, toolIds.slice(1))], 1),
    rejected("an extra tool exits with 1", [live(operationIds, [...toolIds, "extra.tool"])], 1),
    negative(
      "a failing load throws",
      [
        async () => {
          throw new Error("offline");
        },
      ],
      { message: "offline" },
    ),
  ],
});
