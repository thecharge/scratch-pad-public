import { expect } from "bun:test";
import { positive, rejected, unit } from "@platform/test-factories";
import {
  firstDifferentLine,
  isSkipped,
  stripComments,
  stripMarkupComments,
  stripSource,
  stripYamlComments,
  styleOf,
} from "../../../tooling/scripts/strip-comments.ts";

const TS_WITH_COMMENT = "const a = 1; // note\nconst b = 2;\n";
const TS_WITHOUT = "const a = 1;\nconst b = 2;\n";
const BLOCK = "/* top */\nconst a = 1;\n";

unit(styleOf, {
  positive: [
    positive("a TypeScript file", ["src/a.ts"], expect.any(String)),
    positive("a YAML file", ["lefthook.yml"], expect.any(String)),
  ],
  negative: [
    rejected("an image has no comment style", ["logo.png"], undefined),
    rejected("a lock file has no comment style", ["bun.lock"], undefined),
  ],
});

unit(stripYamlComments, {
  positive: [
    positive("a comment line is removed", ["# note\na: 1"], "a: 1"),
    positive("an indented comment line is removed", ["a:\n  # note\n  b: 1"], "a:\n  b: 1"),
  ],
  negative: [
    rejected("a value containing a hash stays", ["a: 'x # y'"], "a: 'x # y'"),
    rejected("text without comments is unchanged", ["a: 1\nb: 2"], "a: 1\nb: 2"),
  ],
});

unit(stripComments, {
  positive: [
    positive("a trailing line comment is removed", ["a.ts", TS_WITH_COMMENT], TS_WITHOUT),
    positive("a block comment line is removed", ["a.ts", BLOCK], "const a = 1;\n"),
  ],
  negative: [
    rejected("code without comments is unchanged", ["a.ts", TS_WITHOUT], TS_WITHOUT),
    rejected(
      "a slash pair inside a string stays",
      ["a.ts", 'const u = "a//b";\n'],
      'const u = "a//b";\n',
    ),
  ],
});

unit(stripMarkupComments, {
  positive: [
    positive("an HTML comment is removed", ["a <!-- note --> b"], "a b"),
    positive(
      "a comment inside a code fence stays",
      ["```\n<!-- keep -->\n```"],
      "```\n<!-- keep -->\n```",
    ),
  ],
  negative: [
    rejected("plain text is unchanged", ["hello"], "hello"),
    rejected("empty text is unchanged", [""], ""),
  ],
});

unit(stripSource, {
  positive: [
    positive("a TypeScript file is stripped", ["a.ts", TS_WITH_COMMENT], TS_WITHOUT),
    positive("a YAML file is stripped", ["a.yml", "# n\na: 1"], "a: 1"),
  ],
  negative: [
    rejected("a file with no style is left alone", ["a.png", "// x"], "// x"),
    rejected("a clean TypeScript file is unchanged", ["a.ts", TS_WITHOUT], TS_WITHOUT),
  ],
});

unit(firstDifferentLine, {
  positive: [
    positive("the second line differs", ["a\nb\nc", "a\nx\nc"], 2),
    positive("the first line differs", ["a", "b"], 1),
  ],
  negative: [
    rejected("equal text has no difference", ["a\nb", "a\nb"], 0),
    rejected("a removed last line is a difference", ["a\nb", "a"], 2),
  ],
});

unit(isSkipped, {
  positive: [
    positive("node_modules is skipped", ["node_modules/x/a.ts"], true),
    positive("a file without a comment style is skipped", ["a.png"], true),
  ],
  negative: [
    rejected("a source file is not skipped", ["packages/a/src/x.ts"], false),
    rejected("a script is not skipped", ["tooling/scripts/x.ts"], false),
  ],
});
