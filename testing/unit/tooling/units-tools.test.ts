import { expect } from "bun:test";
import { ToolBinary } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { finish, resolveTool, run } from "../../../tooling/scripts/tools.ts";

const ABSENT = "no-such-tool-anywhere";
const ROOT = "/";

unit(resolveTool, {
  positive: [
    positive(
      "a tool installed in node_modules resolves to its path",
      [ToolBinary.Biome],
      expect.stringContaining(ToolBinary.Biome),
    ),
    positive(
      "a tool installed locally resolves to its path",
      [ToolBinary.Gitleaks],
      expect.stringContaining(ToolBinary.Gitleaks),
    ),
  ],
  negative: [
    negative("an unknown tool is reported missing", [ABSENT], {
      message: expect.stringContaining(ABSENT),
    }),
    negative("an empty name is reported missing", [""], {
      message: expect.stringContaining("Required tool"),
    }),
  ],
});

unit(run, {
  positive: [
    positive("a command that succeeds returns its output", [["echo", "hello"]], {
      exitCode: 0,
      stdout: "hello\n",
      stderr: "",
    }),
    positive("stdin is passed to the command", [["cat"], { stdin: "fed" }], {
      exitCode: 0,
      stdout: "fed",
      stderr: "",
    }),
    positive("the working directory is honoured", [["pwd"], { cwd: ROOT }], {
      exitCode: 0,
      stdout: "/\n",
      stderr: "",
    }),
  ],
  negative: [
    rejected("a failing command returns its exit code", [["sh", "-c", "echo bad >&2; exit 3"]], {
      exitCode: 3,
      stdout: "",
      stderr: "bad\n",
    }),
    negative("a command that does not exist throws", [[ABSENT]], { code: "ENOENT" }),
  ],
});

unit(finish, {
  positive: [
    positive("no problems is exit code 0", [[], "fine"], 0),
    positive("an empty ok text still gives exit code 0", [[], ""], 0),
  ],
  negative: [
    rejected("one problem is exit code 1", [["broken"], "fine"], 1),
    rejected("many problems are exit code 1", [["a", "b"], "fine"], 1),
  ],
});
