import { afterAll, describe, expect, test } from "bun:test";
import { chmod, readFile } from "node:fs/promises";
import { join } from "node:path";
import { ToolBinary } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { AppConfigSchema } from "@platform/types";
import { scanText } from "../../../tooling/scripts/secret-scan.ts";
import { REPO_ROOT, resolveTool, run } from "../../../tooling/scripts/tools.ts";
import { runSteps } from "../../../tooling/scripts/verify.ts";

afterAll(removeAll);

const TIMEOUT_MS = 120_000;
const random = (alphabet: string, length: number) =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");
const FAKE = `aws_access_key_id = AKIA${random("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 16)}\naws_secret_access_key = ${random("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40)}\n`;
const CLEAN = "nothing sensitive here\n";
const KNIP_FILES = {
  "package.json": '{"name":"fx","version":"0.0.0","private":true,"type":"module"}',
  "knip.json": '{"entry":["index.ts"],"project":["*.ts"]}',
  "index.ts": 'import { used } from "./lib.ts";\nconsole.log(used);\n',
};

async function stubScanner(): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, { "stub.sh": "#!/bin/sh\ngrep -q AKIA && exit 1\nexit 0\n" });
  await chmod(join(dir, "stub.sh"), 0o755);
  return join(dir, "stub.sh");
}

async function knipExitCode(lib: string): Promise<number> {
  const dir = await makeDir();
  await writeFiles(dir, { ...KNIP_FILES, "lib.ts": lib });
  const result = await run([await resolveTool(ToolBinary.Knip)], { cwd: dir });
  return result.exitCode;
}

describe("scanner is swappable", () => {
  test("the wrapper names the scanner binary only through ToolBinary", async () => {
    const source = await readFile(join(REPO_ROOT, "tooling/scripts/secret-scan.ts"), "utf8");
    expect(source).not.toMatch(/["'`]gitleaks["'`]/);
  });

  test.each([
    ["clean text", CLEAN],
    ["a fake credential", FAKE],
  ])("a stub scanner gives the same verdict as the real one for %s", async (_name, text) => {
    const stubbed = (await scanText(text, await stubScanner())) === 0;
    const real = (await scanText(text)) === 0;
    expect(stubbed).toBe(real);
  });
});

describe("dead code gate", () => {
  test(
    "knip fails on an unused export",
    async () => {
      expect(await knipExitCode("export const used = 1;\nexport const unused = 2;\n")).not.toBe(0);
    },
    TIMEOUT_MS,
  );

  test(
    "knip passes when every export is used",
    async () => {
      expect(await knipExitCode("export const used = 1;\n")).toBe(0);
    },
    TIMEOUT_MS,
  );
});

describe("verify step runner", () => {
  test("a failing step gives a non-zero status and later steps still run", async () => {
    const marker = join(await makeDir(), "later");
    const status = await runSteps({ first: ["false"], second: ["touch", marker] });
    expect(status).toBe(1);
    expect(await Bun.file(marker).exists()).toBe(true);
  });

  test("all steps passing gives a zero status", async () => {
    expect(await runSteps({ first: ["true"], second: ["true"] })).toBe(0);
  });
});

describe("configuration is a schema", () => {
  test("AppConfigSchema is a Zod schema that rejects an empty object", async () => {
    expect(typeof AppConfigSchema.parse).toBe("function");
    expect(await thrownBy(() => AppConfigSchema.parse({}))).toBeDefined();
  });

  test("the config type is inferred from the schema", async () => {
    const source = await readFile(
      join(REPO_ROOT, "packages/types/src/config/app-config.ts"),
      "utf8",
    );
    expect(source).toContain("export type AppConfig = z.infer<typeof AppConfigSchema>");
  });
});
