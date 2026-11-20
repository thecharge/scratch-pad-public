import { afterAll } from "bun:test";
import { CoverageMode, MessageId, UNIT_DEBT_FILE } from "@platform/constants";
import { message } from "@platform/messages";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { gitRepoWithOrigin, makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  changeLines,
  coverageMode,
  debtCount,
  devStatus,
  parseGitPosition,
  readOpenChanges,
  taskCounts,
  tierCounts,
} from "../../../tooling/scripts/dev-status.ts";

afterAll(removeAll);

const DEBT_UNAVAILABLE = message(MessageId.DevStatusUnavailable, { source: UNIT_DEBT_FILE });
const TASKS = "## 1. Group\n\n- [x] 1.1 done\n- [ ] 1.2 open\n- [ ] 1.3 open\n";
const ALL_DONE = "- [x] 1.1 a\n- [x] 1.2 b\n";
const NO_TASKS = "## nothing to do\n";

const repo = await gitRepoWithOrigin({
  "openspec/changes/alpha/tasks.md": TASKS,
  "openspec/changes/archive/old/tasks.md": ALL_DONE,
  "testing/unit-debt.json": "[]",
  "testing/unit/a/x.test.ts": "",
  "testing/integration/a/y.test.ts": "",
  ".claude/skills/project-a/SKILL.md": "---\nname: project-a\ndescription: A.\n---\n",
  ".claude/commands/dev/status.md": "x",
});
const noChanges = await makeDir();
const twoChanges = await makeDir();
await writeFiles(twoChanges, {
  "openspec/changes/alpha/tasks.md": TASKS,
  "openspec/changes/beta/tasks.md": ALL_DONE,
});
const empty = await makeDir();
const badDebt = await makeDir();
await writeFiles(badDebt, { "testing/unit-debt.json": '{"a":1}' });

unit(taskCounts, {
  positive: [
    positive("counts done and all tasks", [TASKS], { completedTasks: 1, totalTasks: 3 }),
    positive("counts a finished list", [ALL_DONE], { completedTasks: 2, totalTasks: 2 }),
  ],
  negative: [
    rejected("counts nothing in text without tasks", [NO_TASKS], {
      completedTasks: 0,
      totalTasks: 0,
    }),
    rejected("counts nothing in empty text", [""], { completedTasks: 0, totalTasks: 0 }),
  ],
});

unit(readOpenChanges, {
  positive: [
    positive(
      "reads the open change and skips the archive",
      [repo],
      [{ name: "alpha", completedTasks: 1, totalTasks: 3 }],
    ),
    positive(
      "reads two open changes in order",
      [twoChanges],
      [
        { name: "alpha", completedTasks: 1, totalTasks: 3 },
        { name: "beta", completedTasks: 2, totalTasks: 2 },
      ],
    ),
  ],
  negative: [
    negative("fails for a folder without the changes folder", [empty], { code: "ENOENT" }),
    negative("fails for a second folder without the changes folder", [noChanges], {
      code: "ENOENT",
    }),
  ],
});

unit(parseGitPosition, {
  positive: [
    positive("reads tab separated counts", ["2\t5\n"], { behind: 2, ahead: 5 }),
    positive("reads space separated counts", ["0 0"], { behind: 0, ahead: 0 }),
  ],
  negative: [
    negative("rejects empty output", [""], { name: "ZodError" }),
    negative("rejects words", ["x y"], { name: "ZodError" }),
  ],
});

unit(changeLines, {
  positive: [
    positive("says there is no open change", [[]], [message(MessageId.DevStatusNoChange)]),
    positive(
      "lists one change with its progress",
      [[{ name: "a", completedTasks: 1, totalTasks: 2 }]],
      [message(MessageId.DevStatusChange, { name: "a", done: 1, total: 2 })],
    ),
  ],
  negative: [
    rejected(
      "still lists a change with no tasks",
      [[{ name: "b", completedTasks: 0, totalTasks: 0 }]],
      [message(MessageId.DevStatusChange, { name: "b", done: 0, total: 0 })],
    ),
    rejected(
      "lists two changes on two lines",
      [
        [
          { name: "a", completedTasks: 1, totalTasks: 2 },
          { name: "b", completedTasks: 2, totalTasks: 2 },
        ],
      ],
      [
        message(MessageId.DevStatusChange, { name: "a", done: 1, total: 2 }),
        message(MessageId.DevStatusChange, { name: "b", done: 2, total: 2 }),
      ],
    ),
  ],
});

unit(debtCount, {
  positive: [
    positive("counts no debt", ["[]"], 0),
    positive("counts two listed units", ['["a","b"]'], 2),
  ],
  negative: [
    negative("rejects an object", ['{"a":1}'], { message: DEBT_UNAVAILABLE }),
    negative("rejects text that is not JSON", ["oops"], { name: "SyntaxError" }),
  ],
});

unit(coverageMode, {
  positive: [
    positive("is blocking when the flag is on", [true], CoverageMode.Blocking),
    positive("follows the repository flag by default", [], CoverageMode.Blocking),
  ],
  negative: [
    rejected("is report-only when the flag is off", [false], CoverageMode.ReportOnly),
    rejected("is report-only for a falsy value", [0], CoverageMode.ReportOnly),
  ],
});

unit(tierCounts, {
  positive: [
    positive(
      "counts one file per tier",
      [["testing/unit/a/x.test.ts", "testing/integration/a/y.test.ts", "testing/e2e/a/z.test.ts"]],
      { unit: 1, integration: 1, e2e: 1 },
    ),
    positive("counts two unit files", [["testing/unit/a/x.test.ts", "testing/unit/b/y.test.ts"]], {
      unit: 2,
      integration: 0,
      e2e: 0,
    }),
  ],
  negative: [
    rejected("counts nothing for no files", [[]], { unit: 0, integration: 0, e2e: 0 }),
    rejected("counts a file outside the tier folders nowhere", [["src/a.test.ts"]], {
      unit: 0,
      integration: 0,
      e2e: 0,
    }),
  ],
});

unit(devStatus, {
  positive: [
    positive("reports a repository with every source readable", [repo], 0),
    positive("reports a repository with a second source set", [repo], 0),
  ],
  negative: [
    rejected("exits 1 when no source can be read", [empty], 1),
    rejected("exits 1 when the unit debt file is not a list", [badDebt], 1),
  ],
});
