import { afterAll, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DocCategory, StepFlag, TransportKind } from "@platform/constants";
import {
  recordAll,
  recordScenario,
  runScenario,
  ScenarioFailure,
  scenarios,
  scrubSecrets,
  servedOver,
  toMdx,
} from "@platform/kb-recorder";
import { thrownBy } from "@platform/test-framework";
import type { Scenario } from "@platform/types";
import { all } from "@platform/util";
import {
  finishProxyIntegration,
  proxyBackendRefused,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const BEARER_VALUE = "Bearer abc.def.ghi";
const JWT = "eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJ1MSJ9.c2lnbmF0dXJl";
const OPAQUE = "A".repeat(48);
const directories: string[] = [];

afterAll(async () => {
  await finishProxyIntegration();
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

async function scratch(): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "kb-test-"));
  directories.push(directory);
  return directory;
}

describe("scrubSecrets", () => {
  test.each([
    ["a bearer header value", `Authorization: ${BEARER_VALUE}`, "abc.def.ghi"],
    ["a JWT", `token ${JWT}`, JWT],
    ["a long opaque string", `key ${OPAQUE}`, OPAQUE],
  ])("removes %s", (_name, text, secret) => {
    expect(scrubSecrets(text)).not.toContain(secret);
  });

  test("leaves ordinary text alone", () => {
    expect(scrubSecrets("publishers/acme/books/dune")).toBe("publishers/acme/books/dune");
  });
});

describe("every scenario passes on both transports", () => {
  test.each(scenarios().map((scenario) => [scenario.id, scenario] as const))(
    "%s",
    async (_id, scenario) => {
      const [http = [], mcp = []] = await all([
        async () => runScenario(scenario, TransportKind.Http),
        async () => runScenario(scenario, TransportKind.Mcp),
      ]);
      const flags = [...http, ...mcp].map((result) => result.flag);
      const served = (transport: TransportKind) =>
        scenario.steps.filter((step) => servedOver(step, transport)).length;
      expect([http.length, mcp.length]).toEqual([
        served(TransportKind.Http),
        served(TransportKind.Mcp),
      ]);
      expect(flags.every((flag) => flag === StepFlag.Passed)).toBe(true);
    },
  );
});

describe("recording", () => {
  const wrongStep = {
    description: "Claim a public read fails",
    capability: "config.get",
    input: { name: "config" },
    scopes: [],
    expectError: true,
  };
  const failing: Scenario = {
    id: "wrong-expectation",
    title: "A step that does not behave as declared",
    intent: "The recorder must refuse to publish a page whose claims are false.",
    category: DocCategory.Troubleshooting,
    authEnabled: true,
    steps: [wrongStep],
  };

  test.each([[TransportKind.Http], [TransportKind.Mcp]])(
    "a step that contradicts the service is flagged failed over %s with expected and actual",
    async (transport) => {
      const [result] = await runScenario(failing, transport);
      expect([result?.flag, result?.evidence.expected, result?.evidence.actual]).toEqual([
        StepFlag.Failed,
        "an error",
        "success",
      ]);
    },
  );

  test.each([[TransportKind.Http], [TransportKind.Mcp]])(
    "a failing step over %s fails the run naming scenario, step and reason, and publishes nothing",
    async (transport) => {
      const directory = await scratch();
      const failure = await thrownBy(() =>
        recordAll([...scenarios().slice(0, 1), failing], directory, [transport]),
      );
      expect([failure instanceof ScenarioFailure, await readdir(directory)]).toEqual([true, []]);
      expect((failure as Error).message).toContain(failing.id);
      expect((failure as Error).message).toContain(wrongStep.description);
      expect((failure as Error).message).toContain("Outcome is an error");
    },
  );

  test("recording a failing scenario throws instead of returning a page", async () => {
    expect(await thrownBy(() => recordScenario(failing))).toBeInstanceOf(ScenarioFailure);
  });

  test("a passing run writes one page per scenario with both transports and no credential", async () => {
    const directory = await scratch();
    const [first] = scenarios();
    const paths = await recordAll([first as Scenario], directory);
    const text = await Bun.file(paths[0] as string).text();
    expect([paths.length, text.includes("## HTTP"), text.includes("## MCP")]).toEqual([
      1,
      true,
      true,
    ]);
    expect(text).toContain("Flag: **PASSED**");
    expect(text).toContain("Expected outcome:");
    expect(text).toContain("Tool call:");
    expect(text).not.toMatch(/Bearer\s+eyJ|eyJ[\w-]+\./);
  });

  test("a page keeps its title and intent in the front matter", () => {
    const text = toMdx({
      id: "x",
      title: "A title",
      intent: "An intent",
      category: DocCategory.General,
      results: [],
    });
    expect(text).toContain('title: "A title"');
  });
});

test("the edge client cannot reach the backend directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
