import { positive, rejected, unit } from "@platform/test-factories";
import { makeDir, writeFiles } from "@platform/test-scenarios";
import type { LcovFile } from "@platform/types";
import {
  coverageGaps,
  mergeLcov,
  parseLcov,
  productFiles,
} from "../../../tooling/scripts/coverage.ts";

const lcov = (
  file: string,
  lines: Record<string, number>,
  found: number,
  hit: number,
): LcovFile => ({
  file,
  lines,
  functionsFound: found,
  functionsHit: hit,
});

const RECORD = "SF:packages/a/src/x.ts\nFNF:2\nFNH:1\nDA:1,3\nDA:2,0\nend_of_record\n";
const TWO_RECORDS = `${RECORD}SF:packages/b/src/y.ts\nFNF:0\nFNH:0\nDA:5,1\nend_of_record\n`;

unit(parseLcov, {
  positive: [
    positive("one record", [RECORD], [lcov("packages/a/src/x.ts", { "1": 3, "2": 0 }, 2, 1)]),
    positive(
      "two records",
      [TWO_RECORDS],
      [
        lcov("packages/a/src/x.ts", { "1": 3, "2": 0 }, 2, 1),
        lcov("packages/b/src/y.ts", { "5": 1 }, 0, 0),
      ],
    ),
  ],
  negative: [
    rejected("empty text has no files", [""], []),
    rejected("lines before any source file are ignored", ["DA:1,1\nFNF:3\n"], []),
  ],
});

unit(mergeLcov, {
  positive: [
    positive(
      "a line hit in either run counts as hit",
      [[[lcov("a.ts", { "1": 0, "2": 4 }, 2, 1)], [lcov("a.ts", { "1": 2, "2": 0 }, 2, 2)]]],
      [lcov("a.ts", { "1": 2, "2": 4 }, 2, 2)],
    ),
    positive(
      "files from different runs are kept apart",
      [[[lcov("a.ts", { "1": 1 }, 0, 0)], [lcov("b.ts", { "1": 1 }, 0, 0)]]],
      [lcov("a.ts", { "1": 1 }, 0, 0), lcov("b.ts", { "1": 1 }, 0, 0)],
    ),
  ],
  negative: [
    positive(
      "a line a run leaves out is not a gap when another run lists it as missed",
      [[[lcov("a.ts", { "1": 0, "2": 3 }, 2, 2)], [lcov("a.ts", { "2": 3 }, 2, 2)]]],
      [lcov("a.ts", { "2": 3 }, 2, 2)],
    ),
    rejected("no runs merge to nothing", [[]], []),
    rejected(
      "a line missed in every run stays missed",
      [[[lcov("a.ts", { "1": 0 }, 1, 0)], [lcov("a.ts", { "1": 0 }, 1, 0)]]],
      [lcov("a.ts", { "1": 0 }, 1, 0)],
    ),
  ],
});

unit(productFiles, {
  positive: [
    positive(
      "keeps product source",
      [[lcov("packages/a/src/x.ts", {}, 0, 0)]],
      [lcov("packages/a/src/x.ts", {}, 0, 0)],
    ),
    positive(
      "keeps tooling scripts",
      [[lcov("tooling/scripts/x.ts", {}, 0, 0)]],
      [lcov("tooling/scripts/x.ts", {}, 0, 0)],
    ),
  ],
  negative: [
    rejected(
      "drops the testing area",
      [[lcov("testing/packages/framework/src/x.ts", {}, 0, 0)]],
      [],
    ),
    rejected("drops generated files", [[lcov("packages/sdk/generated/x.ts", {}, 0, 0)]], []),
  ],
});

const sourceRoot = await makeDir();
await writeFiles(sourceRoot, { "packages/a/src/x.ts": "const a = 1;\n}\n\nconst b = 2;\n" });
const phantom = lcov("packages/a/src/x.ts", { "2": 0, "3": 0 }, 1, 1);
const real = lcov("packages/a/src/x.ts", { "1": 0, "2": 0, "4": 0 }, 1, 1);

unit(coverageGaps, {
  positive: [
    positive(
      "a fully covered file has no gap",
      [[lcov("packages/a/src/x.ts", { "1": 2 }, 1, 1)]],
      [],
    ),
    positive("closing braces and blank lines are not code", [[phantom], sourceRoot], []),
    positive(
      "a covered test-area file is ignored",
      [[lcov("testing/unit/x.ts", { "1": 0 }, 1, 0)]],
      [],
    ),
  ],
  negative: [
    rejected(
      "uncovered lines are listed in order",
      [[lcov("packages/a/src/x.ts", { "9": 0, "3": 0, "4": 1 }, 1, 1)]],
      [{ file: "packages/a/src/x.ts", uncoveredLines: [3, 9], functionsMissing: 0 }],
    ),
    rejected(
      "code lines stay when brace lines are dropped",
      [[real], sourceRoot],
      [{ file: "packages/a/src/x.ts", uncoveredLines: [1, 4], functionsMissing: 0 }],
    ),
    rejected(
      "a function never called is a gap",
      [[lcov("packages/a/src/x.ts", { "1": 1 }, 3, 1)]],
      [{ file: "packages/a/src/x.ts", uncoveredLines: [], functionsMissing: 2 }],
    ),
  ],
});
