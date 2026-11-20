import { afterAll } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { RunResult } from "@platform/types";
import {
  DocumentPhase,
  DocumentScopeReason,
} from "../../../packages/constants/src/document-shipping.ts";
import {
  inspectDocumentScope,
  recordDocumentScope,
} from "../../../tooling/scripts/document-scope.ts";

const matchesIndex = async () => true;
const head = "a".repeat(40);
const snapshot = "b".repeat(40);
const expected = {
  phase: DocumentPhase.Commit,
  eligible: true,
  reason: DocumentScopeReason.Eligible,
  head,
  snapshot,
  changed: ["docs/guide.md"],
};
const fallback = {
  ...expected,
  eligible: false,
  reason: DocumentScopeReason.Unsupported,
  changed: ["apps/api/src/entry.ts"],
};
const fixture = async (command: readonly string[]): Promise<RunResult> => {
  const output = command.includes("rev-parse")
    ? head
    : command.includes("write-tree")
      ? snapshot
      : command.includes("--name-only")
        ? "docs/guide.md\0"
        : command.includes("ls-tree")
          ? "100644 blob fixture\tdocs/guide.md\0"
          : command.includes("-v")
            ? "H docs/guide.md\0"
            : "";
  return { exitCode: 0, stdout: output, stderr: "" };
};
const source = async (command: readonly string[]): Promise<RunResult> =>
  command.includes("--name-only")
    ? { exitCode: 0, stdout: "apps/api/src/entry.ts\0", stderr: "" }
    : fixture(command);
const failure = async (): Promise<RunResult> => {
  throw new Error("git unavailable");
};
unit(inspectDocumentScope, {
  positive: [
    positive(
      "classifies the index snapshot",
      [DocumentPhase.Commit, undefined, "/fixture", fixture, matchesIndex],
      expected,
    ),
    positive(
      "source changes broaden",
      [DocumentPhase.Commit, undefined, "/fixture", source, matchesIndex],
      fallback,
    ),
  ],
  negative: [
    rejected(
      "missing push metadata broadens",
      [DocumentPhase.Push, undefined, "/fixture", fixture, matchesIndex],
      {
        ...expected,
        phase: DocumentPhase.Push,
        eligible: false,
        reason: DocumentScopeReason.MissingRange,
        changed: [],
      },
    ),
    positive(
      "failed inspection broadens",
      [DocumentPhase.Commit, undefined, "/fixture", failure, matchesIndex],
      {
        phase: DocumentPhase.Commit,
        eligible: false,
        reason: DocumentScopeReason.Inspection,
        head: "",
        snapshot: "",
        changed: [],
      },
    ),
  ],
});

afterAll(removeAll);
const root = await makeDir();
const blocked = await makeDir();
await writeFiles(blocked, { ".stack": "blocked output" });
const recorded = async () => expected;
const rejectedScope = async () => fallback;
const crashed = async () => {
  throw new Error("inspection unavailable");
};
unit(recordDocumentScope, {
  positive: [
    positive(
      "records eligible index evidence",
      [DocumentPhase.Commit, undefined, root, recorded],
      expected,
    ),
    positive(
      "records conservative broadening",
      [DocumentPhase.Commit, undefined, root, rejectedScope],
      fallback,
    ),
  ],
  negative: [
    negative("blocked report path fails", [DocumentPhase.Commit, undefined, blocked, recorded], {
      code: "ENOTDIR",
    }),
    negative("failed inspection rejects", [DocumentPhase.Commit, undefined, root, crashed], {
      message: "inspection unavailable",
    }),
  ],
});
