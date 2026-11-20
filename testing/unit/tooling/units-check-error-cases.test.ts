import { afterAll } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  checkErrorCases,
  findMissing,
  generatedPagesText,
  operationsIn,
  reasonsIn,
} from "../../../tooling/scripts/check-error-cases.ts";

const SITE = "apps/docs/src/content/docs";
const REASONS = { reason: { enum: ["NOT_THERE", "TOO_BIG"] } };
const CONTENT = { content: { details: REASONS } };
const OPERATION = { operationId: "a.get", responses: { default: CONTENT } };
const GET_OPERATION = { get: OPERATION };
const PATHS = { "/v1/a": GET_OPERATION };
const DOCUMENT = { paths: PATHS };
const CALL = "Call a.get to read. Token scopes: read.";
const NOT_THERE = "The call fails with the reason NOT_THERE.";
const TOO_BIG = "The call fails with the reason TOO_BIG.";
const ALL_SHOWN = `${CALL} ${NOT_THERE} ${TOO_BIG}`;
async function mapOf(entries: [string, string[]][]): Promise<Map<string, string[]>> {
  return new Map(entries);
}

const OPERATIONS = await mapOf([["a.get", ["NOT_THERE", "TOO_BIG"]]]);
const UNREACHABLE = await mapOf([["x", ["FIELD_IMMUTABLE"]]]);
const NO_OPERATIONS = await mapOf([]);
const BOTH_RESPONSES = { 200: CONTENT, default: CONTENT };
const REPEATED_OPERATION = { get: { operationId: "a.get", responses: BOTH_RESPONSES } };
const REPEATED = { paths: { "/v1/a": REPEATED_OPERATION } };
const NO_RESPONSES = {};
const ANONYMOUS_OPERATION = { get: { responses: NO_RESPONSES } };
const NO_ID = { paths: { "/v1/a": ANONYMOUS_OPERATION } };
const EMPTY_PATHS = { paths: NO_RESPONSES };
const ENUM_OF_NAMES = { reason: { enum: ["not a reason"] } };
const found = (
  operations: string[],
  reasons: string[],
  checkedReasons: number,
  checkedOperations = 1,
) => ({
  operations,
  reasons,
  checkedOperations,
  checkedReasons,
});

async function repo(pages: string, document: object): Promise<string> {
  const root = await makeDir();
  await writeFiles(root, {
    [`${SITE}/p.md`]: pages,
    "openapi/baseline.json": JSON.stringify(document),
  });
  return root;
}

const complete = await repo(ALL_SHOWN, DOCUMENT);
const incomplete = await repo(CALL, DOCUMENT);
const silent = await repo("", DOCUMENT);
const bare = await makeDir();
afterAll(removeAll);

unit(reasonsIn, {
  positive: [
    positive("an enum of reasons is read", [CONTENT], ["NOT_THERE", "TOO_BIG"]),
    positive(
      "reasons in a list are all found",
      [[CONTENT, CONTENT]],
      ["NOT_THERE", "TOO_BIG", "NOT_THERE", "TOO_BIG"],
    ),
  ],
  negative: [
    rejected("text has no reasons", ["NOT_THERE"], []),
    rejected("null has no reasons", [null], []),
    rejected("names that are not reasons are ignored", [ENUM_OF_NAMES], []),
  ],
});

unit(operationsIn, {
  positive: [
    positive("an operation maps to its reasons", [DOCUMENT], OPERATIONS),
    positive("a repeated reason is listed once", [REPEATED], OPERATIONS),
  ],
  negative: [
    rejected("a document without paths has none", [{}], NO_OPERATIONS),
    rejected("an operation without an id is skipped", [NO_ID], NO_OPERATIONS),
  ],
});

unit(findMissing, {
  positive: [
    positive("every call and reason shown", [OPERATIONS, ALL_SHOWN], found([], [], 2)),
    positive("an unreachable reason is exempt", [UNREACHABLE, "Call x to y"], found([], [], 1)),
  ],
  negative: [
    rejected(
      "a missing call is named",
      [OPERATIONS, `${NOT_THERE} ${TOO_BIG}`],
      found(["a.get"], [], 2),
    ),
    rejected(
      "a missing reason is named",
      [OPERATIONS, `${CALL} ${NOT_THERE}`],
      found([], ["TOO_BIG"], 2),
    ),
  ],
});

unit(generatedPagesText, {
  positive: [
    positive("the text of the pages", [complete], ALL_SHOWN),
    positive("an empty page gives empty text", [silent], ""),
  ],
  negative: [
    negative("a root without a site throws", [bare], { code: "ENOENT" }),
    negative("a missing root throws", [`${bare}/absent`], { code: "ENOENT" }),
  ],
});

unit(checkErrorCases, {
  positive: [
    positive("every call and reason shown exits with 0", [complete], 0),
    positive("an empty baseline exits with 0", [await repo("", EMPTY_PATHS)], 0),
  ],
  negative: [
    rejected("pages that show nothing exit with 1", [silent], 1),
    rejected("pages that show only the call exit with 1", [incomplete], 1),
    negative("a root without a baseline throws", [bare], { code: "ENOENT" }),
  ],
});
