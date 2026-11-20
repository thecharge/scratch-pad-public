import { afterAll, expect, test } from "bun:test";
import { CHECKS_RUNNER_COMMAND, VERIFY_COMMANDS } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll } from "@platform/test-scenarios";
import {
  DOCUMENT_SHIPPING_SOURCE_ONLY,
  DocumentPhase,
  DocumentScopeReason,
} from "../../../packages/constants/src/document-shipping.ts";
import { documentCommands, documentShipping } from "../../../tooling/scripts/document-shipping.ts";

afterAll(removeAll);
const commands = Object.fromEntries(
  Object.entries(VERIFY_COMMANDS).map(([step, command]) => [
    step,
    [...CHECKS_RUNNER_COMMAND, ...command],
  ]),
);
const expected = Object.fromEntries(
  Object.entries(commands).filter(([step]) => !DOCUMENT_SHIPPING_SOURCE_ONLY.includes(step)),
);
const changed = { ...commands, sources: ["passing-fake-source-check"] };
unit(documentCommands, {
  positive: [
    positive("complete registry retains every applicable check", [commands], expected),
    positive("copied complete registry preserves every check", [{ ...commands }], expected),
  ],
  negative: [
    negative("missing mandatory registry", [{}], {
      message: "Document shipment requires the complete unchanged command registry",
    }),
    negative("changed command", [changed], {
      message: "Document shipment requires the complete unchanged command registry",
    }),
  ],
});
const root = await makeDir();
const scope = {
  phase: DocumentPhase.Push,
  eligible: true,
  reason: DocumentScopeReason.Eligible,
  head: "a".repeat(40),
  snapshot: "b".repeat(40),
  changed: ["docs/guide.md"],
};
const inspect = async () => scope;
const broad = async () => ({ ...scope, eligible: false, reason: DocumentScopeReason.Unsupported });
const execute = async () => 0;
const fail = async () => 1;
const push = { updates: [], reasons: [] };
unit(documentShipping, {
  positive: [
    positive("eligible snapshot runs fresh checks", [push, commands, inspect, execute, root], 0),
    positive(
      "source scope requests broader lane",
      [push, commands, broad, execute, root],
      undefined,
    ),
  ],
  negative: [
    rejected("failed check remains blocking", [push, commands, inspect, fail, root], 1),
    rejected("time budget remains blocking", [push, commands, inspect, execute, root, -1], 1),
  ],
});

test("a snapshot mutation during checks blocks shipment", async () => {
  let calls = 0;
  const changing = async () => ({ ...scope, snapshot: String(calls++) });
  expect(await documentShipping(push, commands, changing, execute, root)).toBe(1);
});

test("complete unique selected registry and final residue check", async () => {
  const executed: string[] = [];
  const capture = async (command: readonly string[]) => {
    executed.push(JSON.stringify(command));
    return 0;
  };
  expect(await documentShipping(push, commands, inspect, capture, root)).toBe(0);
  expect(executed.toSorted()).toEqual(
    Object.values(expected)
      .map((command) => JSON.stringify(command))
      .toSorted(),
  );
  expect(new Set(executed).size).toBe(executed.length);
  expect(executed.at(-1)).toBe(JSON.stringify(commands.untracked));
});
