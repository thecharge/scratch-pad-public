import { afterAll, expect, test } from "bun:test";
import { join } from "node:path";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll } from "@platform/test-scenarios";
import type { StepTiming } from "@platform/types";
import { FAST_SHIP_SCAN_COMMAND } from "../../../packages/constants/src/fast-shipping.ts";
import { fastShipping, shippingCommands } from "../../../tooling/scripts/fast-shipping.ts";

afterAll(removeAll);
const root = await makeDir();
const pass = async () => 0;
const fail = async () => 7;
const calls: string[] = [];
const record = async (command: readonly string[]) => {
  calls.push(command[0] ?? "");
  return 0;
};
const finalIsLast = async () => calls.at(-1);
const keys = async (commands: Readonly<Record<string, readonly string[]>>) => Object.keys(commands);
unit(shippingCommands, {
  positive: [
    positive(
      "keeps source checks and adds both test tiers",
      [{ typecheck: ["tsc"] }],
      seen(keys, ["unit", "integration", "unit-scans", "typecheck"]),
    ),
    positive(
      "keeps a mandatory security check",
      [{ audit: ["audit"] }],
      seen(keys, ["unit", "integration", "unit-scans", "audit"]),
    ),
  ],
  negative: [
    rejected(
      "full E2E stays in the full lane",
      [{ e2e: ["e2e"] }],
      seen(keys, ["unit", "integration", "unit-scans"]),
    ),
    rejected(
      "coverage and generation stay in the full lane",
      [{ coverage: ["coverage"], kb: ["kb"] }],
      seen(keys, ["unit", "integration", "unit-scans"]),
    ),
  ],
});
unit(fastShipping, {
  positive: [
    positive(
      "residue is checked after parallel work",
      [{ untracked: ["residue"], lint: ["lint"] }, record, root],
      seen(finalIsLast, "residue"),
    ),
    positive("all required results must pass", [{ typecheck: ["tsc"] }, pass, root], 0),
    positive(
      "conflicting SDK jobs precede parallel checks",
      [{ sdk: ["sdk"], "sdk-pack": ["pack"] }, pass, root],
      0,
    ),
  ],
  negative: [
    rejected("a test failure blocks shipment", [{ lint: ["lint"] }, fail, root], 1),
    rejected("the shipment time budget is blocking", [{}, pass, root, 0], 1),
  ],
});

test.each([true, false])(
  "scanner completion precedes competing verification work, sdk=%s",
  async (prepared) => {
    const commands: Record<string, readonly string[]> = prepared
      ? { sdk: ["sdk"], "sdk-pack": ["pack"] }
      : {};
    const expected = prepared
      ? [["sdk"], ["sdk"], ["pack"], ["pack"], FAST_SHIP_SCAN_COMMAND, FAST_SHIP_SCAN_COMMAND]
      : [FAST_SHIP_SCAN_COMMAND, FAST_SHIP_SCAN_COMMAND];
    const events: (readonly string[])[] = [];
    const execute = async (command: readonly string[]) => {
      events.push(command);
      await Bun.sleep(1);
      events.push(command);
      return 0;
    };
    expect(await fastShipping(commands, execute, root)).toBe(0);
    expect(events.slice(0, expected.length)).toEqual(expected);
  },
);

test.each([0, 7])(
  "formatting follows scanner completion and retains every failure, exit=%s",
  async (code) => {
    const commands = {
      sdk: ["sdk"],
      "sdk-pack": ["pack"],
      dprint: ["format"],
      untracked: ["residue"],
    };
    const events: string[] = [];
    let active = 0;
    let peak = 0;
    const execute = async (command: readonly string[]) => {
      const name = command[0] ?? "";
      active += 1;
      peak = Math.max(peak, active);
      events.push(name);
      await Bun.sleep(name === "format" ? 20 : 1);
      active -= 1;
      events.push(`${name}:done`);
      return name === "format" ? code : 0;
    };
    expect(await fastShipping(commands, execute, root)).toBe(code === 0 ? 0 : 1);
    expect(events.indexOf("format")).toBeGreaterThan(events.indexOf("pack:done"));
    expect(events.indexOf("format")).toBeGreaterThan(events.indexOf("bun:done"));
    expect(events.indexOf("pack")).toBeGreaterThan(events.indexOf("sdk:done"));
    expect(events.filter((event) => event === "format")).toHaveLength(1);
    expect(events.at(-1)).toBe("residue:done");
    expect(active).toBe(0);
    expect(peak).toBeLessThanOrEqual(4);
    const report = await Bun.file(join(root, ".stack/verify/fast-shipping.json")).json();
    expect(report.map((result: StepTiming) => result.step).sort()).toEqual([
      "dprint",
      "integration",
      "sdk",
      "sdk-pack",
      "unit",
      "unit-scans",
      "untracked",
    ]);
  },
);

test.each([1, 10])("completed formatting releases its worker, delay=%s", async (delay) => {
  const commands = Object.fromEntries([
    ["dprint", ["format"]],
    ...Array.from({ length: 8 }, (_, index) => [`check-${index}`, [`check-${index}`]]),
  ]);
  let formattingDone = false;
  let prepared = false;
  let active = 0;
  let peak = 0;
  const scan = async () => {
    await Bun.sleep(2);
    prepared = true;
    return 0;
  };
  const format = async () => {
    await Bun.sleep(delay);
    formattingDone = true;
    return 0;
  };
  const check = async () => {
    expect(prepared).toBe(true);
    active += 1;
    peak = Math.max(peak, formattingDone ? active : 0);
    await Bun.sleep(5);
    active -= 1;
    return 0;
  };
  const execute = async (command: readonly string[]) =>
    (command === FAST_SHIP_SCAN_COMMAND ? scan : command[0] === "format" ? format : check)();
  expect(await fastShipping(commands, execute, root)).toBe(0);
  expect(peak).toBe(4);
  expect(active).toBe(0);
});
