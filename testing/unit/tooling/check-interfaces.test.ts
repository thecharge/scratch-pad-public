import { describe, expect, test } from "bun:test";
import { interfaceFindings, problemsOf } from "../../../tooling/scripts/check-interfaces.ts";

const NONE: string[] = [];

describe("operations and MCP tools match", () => {
  test.each([
    ["an operation without a tool", ["a", "b"], ["a"], NONE, ["b"], [], []],
    ["a tool without an operation", ["a"], ["a", "b"], NONE, [], ["b"], []],
    ["a one-interface capability served by both", ["a"], ["a"], ["a"], [], [], ["a"]],
  ])("reports %s", async (_name, operations, tools, only, noTool, noOperation, leaks) => {
    const found = await interfaceFindings(operations, tools, only);
    expect([found.operationsWithoutTool, found.toolsWithoutOperation, found.leaks]).toEqual([
      noTool,
      noOperation,
      leaks,
    ]);
  });

  test.each([
    ["both interfaces serve every capability", ["a", "b"], ["b", "a"], NONE],
    ["a declared one-interface capability is missing from the other", ["a", "b"], ["a"], ["b"]],
  ])("accepts %s", async (_name, operations, tools, only) => {
    expect(await problemsOf(await interfaceFindings(operations, tools, only))).toEqual([]);
  });
});
