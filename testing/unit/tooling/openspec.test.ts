import { afterAll } from "bun:test";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  checkOpenSpec,
  deltaProblems,
  purposeProblems,
} from "../../../tooling/scripts/check-openspec.ts";

afterAll(removeAll);

const MAIN =
  "# Sample\n\n## Purpose\nDescribe capability behavior.\n\n## Requirements\n\n### Requirement: Existing\nContent\n";
const OTHER = `${MAIN}\n### Requirement: Other\nContent\n`;
const ADDED = "## ADDED Requirements\n\n### Requirement: New\nContent\n";
const MODIFIED = "## MODIFIED Requirements\n\n### Requirement: Existing\nContent\n";
const MISSING = MODIFIED.replace("Existing", "Missing");
const RENAMED =
  "## RENAMED Requirements\n\n- FROM: `### Requirement: Existing`\n- TO: `### Requirement: New`\n";
const count = (problems: string[]) => problems.length;
const mentions = (text: string) => (problems: string[]) =>
  problems.filter((problem) => problem.includes(text)).length;

unit(purposeProblems, {
  positive: [
    positive("a purpose before requirements passes", [MAIN], []),
    positive("a final purpose section passes", ["## Purpose\nExplain the contract.\n"], []),
  ],
  negative: [
    rejected("a missing purpose fails", ["# Sample\n"], seen(count, 1)),
    rejected("an empty purpose fails", ["## Purpose\n\n## Requirements\n"], seen(count, 1)),
    rejected(
      "an archive placeholder fails",
      ["## Purpose\nTBD - created by archiving change sample.\n"],
      seen(count, 1),
    ),
  ],
});

unit(deltaProblems, {
  positive: [
    positive("an existing modification passes", [MAIN, MODIFIED], []),
    positive("a new capability may add requirements", ["", ADDED], []),
    positive(
      "a removal of an existing requirement passes",
      [MAIN, MODIFIED.replace("MODIFIED", "REMOVED")],
      [],
    ),
    positive(
      "a rename followed by modification uses the new heading",
      [MAIN, `${RENAMED}\n${MODIFIED.replace("Existing", "New")}`],
      [],
    ),
    positive(
      "heading whitespace is normalized",
      [MAIN, MODIFIED.replace("Existing", " Existing ")],
      [],
    ),
  ],
  negative: [
    rejected(
      "a missing modification names its target",
      [MAIN, MISSING],
      seen(mentions("Missing"), 1),
    ),
    rejected(
      "an existing addition fails",
      [MAIN, MODIFIED.replace("MODIFIED", "ADDED")],
      seen(mentions("Existing"), 1),
    ),
    rejected(
      "a missing removal fails",
      [MAIN, MISSING.replace("MODIFIED", "REMOVED")],
      seen(mentions("Missing"), 1),
    ),
    rejected("a rename requires its source", ["", RENAMED], seen(mentions("Existing"), 1)),
    rejected(
      "a rename requires an unused destination",
      [OTHER, RENAMED.replace("New", "Other")],
      seen(mentions("Other"), 1),
    ),
    rejected("a new capability cannot modify an absent requirement", ["", MISSING], seen(count, 1)),
  ],
});

const CLEAN = await makeDir();
const NEW = await makeDir();
const BAD_PURPOSE = await makeDir();
const BAD_DELTA = await makeDir();
const FILE = "openspec/specs/sample/spec.md";
const DELTA = "openspec/changes/update/specs/sample/spec.md";
await writeFiles(CLEAN, {
  [FILE]: MAIN,
  [DELTA]: MODIFIED,
  "openspec/changes/archive/old/specs/sample/spec.md": MISSING,
});
await writeFiles(NEW, { [FILE]: MAIN, "openspec/changes/new/specs/new/spec.md": ADDED });
await writeFiles(BAD_PURPOSE, { [FILE]: "## Purpose\nTBD\n" });
await writeFiles(BAD_DELTA, { [FILE]: MAIN, [DELTA]: MISSING });

unit(checkOpenSpec, {
  positive: [
    positive("valid active specs pass and invalid archived deltas are excluded", [CLEAN], 0),
    positive("a new capability passes without a base spec", [NEW], 0),
  ],
  negative: [
    rejected("an invalid purpose fails the repository check", [BAD_PURPOSE], 1),
    rejected("an invalid active delta fails the repository check", [BAD_DELTA], 1),
  ],
});
