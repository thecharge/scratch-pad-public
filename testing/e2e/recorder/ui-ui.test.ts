import { afterAll, beforeAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { E2E_TEST_TIMEOUT_MS, EnvironmentName } from "@platform/constants";
import { all } from "@platform/util";

setDefaultTimeout(E2E_TEST_TIMEOUT_MS);

import { cp, mkdtemp, readdir, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DocCategory, UiActionKind } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import type { UiScenario } from "@platform/types";
import { stackDown, stackUp } from "../../../apps/infra/src/cli.ts";
import { REPO_ROOT } from "../../packages/recorder/src/repo.ts";
import { uiScenarios } from "../../packages/recorder/src/scenarios/ui.ts";
import { recordUi as runRecordUi } from "../../packages/recorder/src/ui/record.ts";
import { UiScenarioFailure } from "../../packages/recorder/src/ui/runner.ts";

const directories: string[] = [];

beforeAll(async () => {
  expect(await stackUp(EnvironmentName.Test)).toBe(0);
}, 240_000);

async function recordUi(scenarios: readonly UiScenario[], root: string, source?: string) {
  return runRecordUi(scenarios, root, source, undefined, false);
}

afterAll(async () => {
  expect(await stackDown(EnvironmentName.Test)).toBe(0);
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

async function scratch(): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "ui-e2e-"));
  directories.push(root);
  return root;
}

const CONSOLE_DIR = join(REPO_ROOT, "apps/console");
const BROWSER_ENCODER = "btoa(String.fromCharCode(...bytes))";
const NODE_ENCODER = 'Buffer.from(bytes).toString("base64")';

async function consoleWithNodeBuffer(): Promise<string> {
  const copy = await scratch();
  await all(
    ["src", "index.html", "vite.config.ts", "package.json"].map(
      (entry) => async () => cp(join(CONSOLE_DIR, entry), join(copy, entry), { recursive: true }),
    ),
  );
  await symlink(join(CONSOLE_DIR, "node_modules"), join(copy, "node_modules"));
  const pkce = Bun.file(join(copy, "src/pkce.ts"));
  await Bun.write(pkce, (await pkce.text()).replace(BROWSER_ENCODER, NODE_ENCODER));
  return copy;
}

const CONTRADICTION: UiScenario = {
  id: "console-contradiction",
  title: "A page that claims something false",
  intent: "A browser scenario whose expectation is false must fail and publish nothing.",
  category: DocCategory.Ui,
  scopes: ["read", "write", "admin"],
  steps: [
    {
      description: "Open the console and expect text that is not there",
      place: "The console address",
      action: "Open the console page",
      expected: "Text that is not on the page",
      kind: UiActionKind.Goto,
      expectVisible: ["this text is not on the page"],
      expectHidden: [],
      forbidRequests: [],
      expectNoTokenInStorage: false,
    },
  ],
};

describe("browser end-to-end scenarios", () => {
  test("every console scenario passes in a real browser and publishes a page with screenshots", async () => {
    const root = await scratch();
    const written = await recordUi(uiScenarios(), root);
    const screenshots = await readdir(join(root, "ui", "shots"));
    expect([written.length, screenshots.length > written.length]).toEqual([
      uiScenarios().length,
      true,
    ]);
  });

  test("the published console pages carry the flag, each check and the screenshot", async () => {
    const root = await scratch();
    const [first] = uiScenarios();
    const [path] = await recordUi([first as UiScenario], root);
    const text = await Bun.file(path as string).text();
    expect(text).toContain("Flag: **PASSED**");
    expect(text).toContain("Text expected visible:");
    expect(text).toContain("Token is not in browser storage");
    expect(text).toContain("![");
  });

  test("a scenario whose expectation is false fails and publishes nothing", async () => {
    const root = await scratch();
    const failure = await thrownBy(() => recordUi([CONTRADICTION], root));
    expect([failure instanceof UiScenarioFailure, await readdir(root)]).toEqual([true, []]);
  });

  test("one failing scenario among passing ones publishes none of them", async () => {
    const root = await scratch();
    const [first] = uiScenarios();
    await thrownBy(() => recordUi([first as UiScenario, CONTRADICTION], root));
    expect(await readdir(root)).toEqual([]);
  });

  test("the Node Buffer used in the browser fails the sign-in scenario and publishes nothing", async () => {
    const defective = await consoleWithNodeBuffer();
    const realSource = await Bun.file(join(CONSOLE_DIR, "src/pkce.ts")).text();
    const copySource = await Bun.file(join(defective, "src/pkce.ts")).text();
    const root = await scratch();
    const signIn = uiScenarios().filter((scenario) => scenario.id === "console-sign-in");
    const failure = await thrownBy(() => recordUi(signIn, root, defective));
    expect([
      realSource.includes("Buffer"),
      copySource.includes("Buffer"),
      failure instanceof UiScenarioFailure,
      (failure as Error).message.includes("Buffer is not defined"),
      await readdir(root),
    ]).toEqual([false, true, true, true, []]);
  });

  test("the reader scenario proves no data request is made without the admin scope", () => {
    const reader = uiScenarios().find((scenario) => scenario.id === "console-without-admin");
    const forbidden = reader?.steps.flatMap((step) => step.forbidRequests);
    expect(forbidden).toEqual(["/v1/stats", "/v1/logs", "/v1/events"]);
  });
});
