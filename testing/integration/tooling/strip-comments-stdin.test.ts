import { expect, test } from "bun:test";
import { STDIN_FLAG } from "@platform/constants";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

const SCRIPT = "tooling/scripts/strip-comments.ts";
const LARGE_ROWS = 20000;

test("a large file comes back whole through standard input", async () => {
  const rows = Array.from({ length: LARGE_ROWS }, (_, index) => ({ index, name: `row-${index}` }));
  const text = `${JSON.stringify(rows, null, 2)}\n`;
  const child = Bun.spawn(["bun", "run", SCRIPT, STDIN_FLAG, "rows.json"], {
    cwd: REPO_ROOT,
    stdin: new Blob([text]),
    stdout: "pipe",
    stderr: "pipe",
  });
  const out = await new Response(child.stdout).text();
  expect([await child.exited, out.length]).toEqual([0, text.length]);
});

test("a comment is removed from the text on standard input", async () => {
  const child = Bun.spawn(["bun", "run", SCRIPT, STDIN_FLAG, "a.ts"], {
    cwd: REPO_ROOT,
    stdin: new Blob(["export const a = 1; // note\n"]),
    stdout: "pipe",
    stderr: "pipe",
  });
  expect(await new Response(child.stdout).text()).toBe("export const a = 1;\n");
});
