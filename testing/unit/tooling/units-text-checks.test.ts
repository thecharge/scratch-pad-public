import { afterAll, expect } from "bun:test";
import { SLASH_COMMENT_PATTERN } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type {
  AstNode,
  MermaidBlock,
  MermaidFailure,
  StructureViolation,
  UrlLiteralFinding,
} from "@platform/types";
import { parse } from "oxc-parser";
import { checkBlocks, extractBlocks } from "../../../tooling/scripts/check-mermaid.ts";
import {
  checkTypesPackage,
  dataShapeViolations,
  inferredNames,
} from "../../../tooling/scripts/check-schemas.ts";
import {
  findUrlLiterals,
  isAllowed,
  urlLiteralsIn,
} from "../../../tooling/scripts/check-url-literals.ts";
import { discover, stripPatternComments } from "../../../tooling/scripts/strip-comments.ts";

afterAll(removeAll);

async function programOf(source: string) {
  const parsed = await parse("a.ts", source, { lang: "ts" });
  return parsed.program as unknown as AstNode;
}

const literalsOf = (found: UrlLiteralFinding[]) => found.map((item) => item.literal);
const linesOf = (found: UrlLiteralFinding[]) => found.map((item) => item.line);
const detailsOf = (found: StructureViolation[]) => found.map((item) => item.detail);
const ALLOW_TESTS = { allowedPaths: [".test.ts"] };
const ALLOW_NOTHING = { allowedPaths: [] };

unit(urlLiteralsIn, {
  positive: [
    positive(
      "an http address is found",
      ["a.ts", 'const a = "http://example.test";'],
      seen(literalsOf, ["http://example.test"]),
    ),
    positive(
      "localhost is found",
      ["a.ts", 'const a = "localhost";'],
      seen(literalsOf, ["localhost"]),
    ),
    positive(
      "the line number is kept",
      ["a.ts", "a;\nb;\nconst c = '127.0.0.1';"],
      seen(linesOf, [3]),
    ),
  ],
  negative: [
    rejected("a plain string has none", ["a.ts", 'const a = "hello";'], seen(literalsOf, [])),
    rejected(
      "a name from the config package has none",
      ["a.ts", "const a = LOOPBACK_ORIGIN;"],
      seen(literalsOf, []),
    ),
  ],
});

unit(isAllowed, {
  positive: [
    positive(
      "the config package may hold addresses",
      ["packages/config/src/urls.ts", ALLOW_NOTHING],
      true,
    ),
    positive(
      "a path named in the config is allowed",
      ["apps/api/src/a.test.ts", ALLOW_TESTS],
      true,
    ),
  ],
  negative: [
    rejected("a source file is not allowed", ["apps/api/src/app.ts", ALLOW_TESTS], false),
    rejected(
      "without allowed paths only the config package is allowed",
      ["apps/api/src/a.test.ts", ALLOW_NOTHING],
      false,
    ),
  ],
});

const root = await makeDir();
await writeFiles(root, {
  "src/a.ts": 'export const a = "http://example.test";\n',
  "src/b.ts": "export const b = 1;\n",
  "src/c.test.ts": 'export const c = "localhost";\n',
});

unit(findUrlLiterals, {
  positive: [
    positive(
      "a file with an address is reported",
      [["src/a.ts"], ALLOW_NOTHING, root],
      seen(literalsOf, ["http://example.test"]),
    ),
    positive(
      "an allowed path is not read",
      [["src/c.test.ts"], ALLOW_TESTS, root],
      seen(literalsOf, []),
    ),
  ],
  negative: [
    rejected(
      "a clean file has no findings",
      [["src/b.ts"], ALLOW_NOTHING, root],
      seen(literalsOf, []),
    ),
    rejected("no files give no findings", [[], ALLOW_NOTHING, root], seen(literalsOf, [])),
    negative("a file that is not there throws", [["src/absent.ts"], ALLOW_NOTHING, root], {
      code: "ENOENT",
    }),
  ],
});

const BLOCK_FILE = "doc.md";
const GOOD_DIAGRAM = "graph TD\n  A --> B\n";
const BAD_DIAGRAM = "graph TD\n  A -->\n";
const fenced = (body: string) => `text\n\`\`\`mermaid\n${body}\`\`\`\n`;
const blockOf = (source: string) => ({ file: BLOCK_FILE, index: 1, source });
const sourcesOf = (blocks: MermaidBlock[]) => blocks.map((block) => block.source);
const indexesOf = (blocks: MermaidBlock[]) => blocks.map((block) => block.index);
const filesOf = (failures: MermaidFailure[]) => failures.map((failure) => failure.block.file);

unit(extractBlocks, {
  positive: [
    positive(
      "a fenced block is extracted with its source",
      [BLOCK_FILE, fenced(GOOD_DIAGRAM)],
      seen(sourcesOf, [GOOD_DIAGRAM]),
    ),
    positive(
      "blocks are numbered from one",
      [BLOCK_FILE, fenced(GOOD_DIAGRAM) + fenced(BAD_DIAGRAM)],
      seen(indexesOf, [1, 2]),
    ),
  ],
  negative: [
    rejected("text without a block has none", [BLOCK_FILE, "just text"], seen(sourcesOf, [])),
    rejected(
      "another fence language is ignored",
      [BLOCK_FILE, "```ts\nconst a = 1;\n```\n"],
      seen(sourcesOf, []),
    ),
  ],
});

unit(checkBlocks, {
  positive: [
    positive("a valid diagram has no failure", [[blockOf(GOOD_DIAGRAM)]], []),
    positive("no blocks have no failure", [[]], []),
  ],
  negative: [
    rejected(
      "an invalid diagram is reported with its file",
      [[blockOf(BAD_DIAGRAM)]],
      seen(filesOf, [BLOCK_FILE]),
    ),
    rejected(
      "only the invalid block is reported",
      [[blockOf(GOOD_DIAGRAM), blockOf(BAD_DIAGRAM)]],
      seen((failures: MermaidFailure[]) => failures.length, 1),
    ),
  ],
});

unit(stripPatternComments, {
  positive: [
    positive("a line comment is removed", ["a // note\nb\n", SLASH_COMMENT_PATTERN], "a\nb\n"),
    positive(
      "a whole comment line disappears",
      ["a\n// note\nb\n", SLASH_COMMENT_PATTERN],
      "a\nb\n",
    ),
  ],
  negative: [
    rejected(
      "a comment marker inside a string stays",
      ['const a = "//x";\n', SLASH_COMMENT_PATTERN],
      'const a = "//x";\n',
    ),
    rejected("text without comments is unchanged", ["a\nb\n", SLASH_COMMENT_PATTERN], "a\nb\n"),
  ],
});

const hasPath = (name: string) => (files: string[]) => files.includes(name);
const hasSuffix = (suffix: string) => (files: string[]) =>
  files.some((file) => file.endsWith(suffix));
const hasFolder = (folder: string) => (files: string[]) =>
  files.some((file) => file.includes(folder));

unit(discover, {
  positive: [
    positive(
      "a tracked source file is listed",
      [],
      seen(hasPath("tooling/scripts/tools.ts"), true),
    ),
    positive("a tracked yaml file is listed", [], seen(hasPath("lefthook.yml"), true)),
  ],
  negative: [
    rejected("dependencies are not listed", [], seen(hasFolder("node_modules/"), false)),
    rejected("images have no comment style and are not listed", [], seen(hasSuffix(".png"), false)),
  ],
});

const interfaceSource = "export interface A { a: string; b?: number }";
const funcSource = "export interface A { run(): void }";
const inferredSource =
  "export const BSchema = z.object({}); export type B = z.infer<typeof BSchema>; export interface A { b: B }";
const aliasSource = "export type A = { a: boolean; b: string[] };";
const containerSource = "export interface C { r: Record<string, string>; u: string | number }";
const interfaceProgram = await programOf(interfaceSource);
const funcProgram = await programOf(funcSource);
const inferredProgram = await programOf(inferredSource);
const aliasProgram = await programOf(aliasSource);
const containerProgram = await programOf(containerSource);
const EMPTY_KNOWN = await knownOf([]);
const B_KNOWN = await knownOf(["B"]);

async function knownOf(names: string[]): Promise<ReadonlySet<string>> {
  return new Set(names);
}

unit(inferredNames, {
  positive: [
    positive("a type inferred from a schema is named", [inferredSource, inferredProgram], ["B"]),
    positive(
      "a second inferred type is named too",
      [
        "export type C = z.infer<typeof CSchema>;",
        await programOf("export type C = z.infer<typeof CSchema>;"),
      ],
      ["C"],
    ),
  ],
  negative: [
    rejected("a plain alias is not inferred", [aliasSource, aliasProgram], []),
    rejected("an interface is not inferred", [interfaceSource, interfaceProgram], []),
  ],
});

unit(dataShapeViolations, {
  positive: [
    positive(
      "an interface of primitives must be a schema",
      ["a.ts", interfaceSource, interfaceProgram, EMPTY_KNOWN],
      seen(detailsOf, [expect.stringContaining("A")]),
    ),
    positive(
      "a type literal of primitives must be a schema",
      ["a.ts", aliasSource, aliasProgram, EMPTY_KNOWN],
      seen((found: StructureViolation[]) => found.length, 1),
    ),
    positive(
      "an interface that holds an inferred type must be a schema",
      ["a.ts", inferredSource, inferredProgram, B_KNOWN],
      seen((found: StructureViolation[]) => found.length, 1),
    ),
  ],
  negative: [
    positive(
      "a record and a union of primitives are still data",
      ["a.ts", containerSource, containerProgram, EMPTY_KNOWN],
      seen((found: StructureViolation[]) => found.length, 1),
    ),
    rejected(
      "an interface with a method is a contract",
      ["a.ts", funcSource, funcProgram, EMPTY_KNOWN],
      seen(detailsOf, []),
    ),
    rejected(
      "an unknown reference is not data",
      ["a.ts", inferredSource, inferredProgram, EMPTY_KNOWN],
      seen(detailsOf, []),
    ),
  ],
});

const typesRoot = await makeDir();
await writeFiles(typesRoot, {
  "packages/types/src/ok.ts":
    "export const ASchema = {};\nexport type A = z.infer<typeof ASchema>;\n",
});
const badRoot = await makeDir();
await writeFiles(badRoot, { "packages/types/src/bad.ts": `${interfaceSource}\n` });
const emptyRoot = await makeDir();

unit(checkTypesPackage, {
  positive: [
    positive("schemas only give no violations", [typesRoot], []),
    positive("a root without a types package gives no violations", [emptyRoot], []),
  ],
  negative: [
    rejected(
      "an interface of data is reported with its file",
      [badRoot],
      seen(
        (found: StructureViolation[]) => found.map((item) => item.file),
        ["packages/types/src/bad.ts"],
      ),
    ),
    rejected(
      "the rule is data shape not schema",
      [badRoot],
      seen(
        (found: StructureViolation[]) => found.map((item) => item.rule),
        ["data-shape-not-schema"],
      ),
    ),
  ],
});
