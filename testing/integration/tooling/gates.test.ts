import { afterAll, describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ConfigFile, ToolBinary } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import {
  copyConfigs,
  makeDir,
  removeAll,
  writeBiomeConfig,
  writeFiles,
} from "@platform/test-scenarios";
import { all } from "@platform/util";
import { checkBlocks, extractBlocks } from "../../../tooling/scripts/check-mermaid.ts";
import { scanText } from "../../../tooling/scripts/secret-scan.ts";
import { resolveTool, run } from "../../../tooling/scripts/tools.ts";

const TIMEOUT_MS = 120_000;
const WITH_STUBS = [ConfigFile.Dprint, ConfigFile.Cspell, ConfigFile.ProjectWords];

afterAll(removeAll);

async function fixture(files: Record<string, string>): Promise<string> {
  const dir = await makeDir();
  await copyConfigs(dir, WITH_STUBS);
  await writeBiomeConfig(dir, false);
  await writeFiles(dir, files);
  return dir;
}

const tool = async (binary: ToolBinary, ...args: string[]) => [await resolveTool(binary), ...args];
const read = (dir: string, names: string[]) =>
  all(names.map((name) => async () => readFile(join(dir, name), "utf8")));

const random = (alphabet: string, length: number) =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");

describe("secret scan gate", () => {
  test("accepts clean text", async () => {
    expect(await scanText("nothing sensitive here\n")).toBe(0);
  });

  test("rejects a generated fake credential", async () => {
    const fake = `aws_access_key_id = AKIA${random("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 16)}\naws_secret_access_key = ${random("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40)}\n`;
    expect(await scanText(fake)).not.toBe(0);
  });
});

describe("mermaid gate", () => {
  test("parses a valid diagram", async () => {
    expect(
      await checkBlocks(await extractBlocks("ok.md", "```mermaid\nflowchart LR\n  A --> B\n```\n")),
    ).toEqual([]);
  });

  test("names the file and block of a broken diagram", async () => {
    const failures = await checkBlocks(
      await extractBlocks("bad.md", "```mermaid\nflowchart LR\n  A[broken -->\n```\n"),
    );
    expect(failures.map((failure) => [failure.block.file, failure.block.index])).toEqual([
      ["bad.md", 1],
    ]);
  });
});

const UNFORMATTED = {
  "sample.ts": "const   a  =   {b:1,   c:2}\nexport {a}\n",
  "data.json": '{"a":1,\n"b":[1,2,3]}',
  "style.css": "a{color:red;background:blue}\n",
  "README.md": "#   Title\n\n*   item one\n*   item two\n",
  "config.toml": 'a   =   "x"\n[section]\nb=1\n',
  "ci.yaml": "key:    value\nlist:\n    -   a\n    -   b\n",
  Dockerfile: "FROM   oven/bun:1\nRUN   echo   hi\n",
};
const BIOME_OWNED = ["sample.ts", "data.json", "style.css"];
const DPRINT_OWNED = ["README.md", "config.toml", "ci.yaml", "Dockerfile"];
const BIOME_FIX = ["check", "--write", "--files-ignore-unknown=true", "."];

describe("formatter ownership", () => {
  test(
    "Biome leaves the dprint-owned files untouched",
    async () => {
      const dir = await fixture(UNFORMATTED);
      await run(await tool(ToolBinary.Biome, ...BIOME_FIX), { cwd: dir });
      expect(await read(dir, DPRINT_OWNED)).toEqual(
        DPRINT_OWNED.map((name) => UNFORMATTED[name as keyof typeof UNFORMATTED]),
      );
    },
    TIMEOUT_MS,
  );

  test(
    "dprint does not even list the Biome-owned files",
    async () => {
      const dir = await fixture(UNFORMATTED);
      const listed = await run(await tool(ToolBinary.Dprint, "file-paths"), { cwd: dir });
      expect(BIOME_OWNED.filter((name) => listed.stdout.includes(name))).toEqual([]);
    },
    TIMEOUT_MS,
  );

  test(
    "running both formatters twice changes nothing the second time and both checks pass",
    async () => {
      const dir = await fixture(UNFORMATTED);
      await run(await tool(ToolBinary.Biome, ...BIOME_FIX), { cwd: dir });
      await run(await tool(ToolBinary.Dprint, "fmt"), { cwd: dir });
      const once = await read(dir, Object.keys(UNFORMATTED));
      await run(await tool(ToolBinary.Biome, ...BIOME_FIX), { cwd: dir });
      await run(await tool(ToolBinary.Dprint, "fmt"), { cwd: dir });
      const twice = await read(dir, Object.keys(UNFORMATTED));
      const checks = await all([
        async () =>
          run(await tool(ToolBinary.Biome, "ci", "--files-ignore-unknown=true", "."), {
            cwd: dir,
          }),
        async () => run(await tool(ToolBinary.Dprint, "check"), { cwd: dir }),
      ]);
      expect([twice, checks.map((check) => check.exitCode)]).toEqual([once, [0, 0]]);
    },
    TIMEOUT_MS,
  );
});

describe("gates reject known-bad input", () => {
  test.each([
    [
      "Biome on an unformatted TypeScript file",
      ToolBinary.Biome,
      ["ci", "--files-ignore-unknown=true", "."],
      { "bad.ts": "const   a  =   1\nexport {a}\n" },
    ],
    [
      "dprint on an unformatted Markdown file",
      ToolBinary.Dprint,
      ["check"],
      { "bad.md": "#   Title\n\n*   item\n" },
    ],
    [
      "cspell on a misspelled word",
      ToolBinary.Cspell,
      ["--no-progress", "--no-must-find-files", "note.md"],
      { "note.md": `We ${"reci"}${"eved"} the message.\n` },
    ],
  ])(
    "%s",
    async (_name, binary, args, files) => {
      const dir = await fixture(files);
      expect((await run(await tool(binary, ...args), { cwd: dir })).exitCode).not.toBe(0);
    },
    TIMEOUT_MS,
  );

  test(
    "cspell accepts the word once it is in the project list",
    async () => {
      const dir = await fixture({
        "note.md": "We recieved the message.\n",
        [ConfigFile.ProjectWords]: "recieved\n",
      });
      const result = await run(
        await tool(ToolBinary.Cspell, "--no-progress", "--no-must-find-files", "note.md"),
        { cwd: dir },
      );
      expect(result.exitCode).toBe(0);
    },
    TIMEOUT_MS,
  );

  test.each([
    ["a correct message", "feat: add the capability registry\n", 0],
    ["a misspelled message", `feat: ${"reci"}${"eved"} registry\n`, 1],
  ])(
    "cspell checks commit messages: %s",
    async (_name, content, expected) => {
      const dir = await fixture({ COMMIT_EDITMSG: content });
      const command = `${await resolveTool(ToolBinary.Cspell)} --no-progress stdin://COMMIT_EDITMSG.md < COMMIT_EDITMSG`;
      expect((await run(["sh", "-c", command], { cwd: dir })).exitCode).toBe(expected);
    },
    TIMEOUT_MS,
  );

  test("a missing tool fails instead of being skipped", async () => {
    expect(
      await thrownBy(() => resolveTool("definitely-not-installed" as ToolBinary)),
    ).toBeInstanceOf(Error);
  });
});
