import { afterAll } from "bun:test";
import { join } from "node:path";
import { SOURCE_TABLE_HEADER, SOURCE_TABLE_MARKER } from "@platform/constants";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import type { SourceDocument, SourceRecord } from "@platform/types";
import {
  checkSources,
  documentSourceProblems,
  sourceProblems,
} from "../../../tooling/scripts/check-sources.ts";

afterAll(removeAll);
const hash = (text: string) => new Bun.CryptoHasher("sha256").update(text).digest("hex");
const record: SourceRecord = {
  id: "S1",
  url: "https://example.test/reference",
  fetchedAt: "2026-11-07T20:00:00Z",
  status: 200,
  sha256: hash("document"),
  quotes: ["document"],
  attempt: "search the passage",
  output: "one match",
};
const fetcher = async () => new Response("document");
const altered = async () => new Response("different");
const refused = async () => new Response("document", { status: 403 });
const failed = async () => {
  throw new Error("offline");
};
const count = (problems: string[]) => problems.length;
const registryRecord = {
  ...record,
  url: "https://registry-1.docker.io/v2/rustfs/rustfs/manifests/1.0.4",
};
const publicRegistry = async (url: string, init?: RequestInit) =>
  url.includes("auth.docker.io")
    ? Response.json({ token: "public-anonymous-pull" })
    : new Headers(init?.headers).has("authorization")
      ? new Response("document")
      : new Response("challenge", { status: 401 });
const invalidRegistryToken = async (url: string) =>
  url.includes("auth.docker.io") ? Response.json({}) : new Response("challenge", { status: 401 });
const refusedRegistryToken = async (url: string) =>
  new Response("refused", { status: url.includes("auth.docker.io") ? 403 : 401 });
unit(sourceProblems, {
  positive: [
    positive(
      "public registry pulls need only anonymous challenge tokens",
      [registryRecord, publicRegistry],
      [],
    ),
    positive("matching bytes, status and passage pass", [record, fetcher], []),
    positive(
      "markup does not change passage matching",
      [{ ...record, quotes: ["DOCUMENT!"] }, fetcher],
      [],
    ),
  ],
  negative: [
    rejected(
      "a malformed public registry token fails",
      [registryRecord, invalidRegistryToken],
      seen(count, 1),
    ),
    rejected(
      "a refused public registry token fails",
      [registryRecord, refusedRegistryToken],
      seen(count, 1),
    ),
    rejected("changed bytes fail", [record, altered], seen(count, 1)),
    rejected("changed status fails", [record, refused], seen(count, 1)),
    rejected(
      "a missing passage fails",
      [{ ...record, quotes: ["missing"] }, fetcher],
      seen(count, 1),
    ),
    rejected("a fetch failure fails closed", [record, failed], seen(count, 1)),
  ],
});
const body = "Local evidence.\n";
const local: SourceDocument = {
  file: "evidence.md",
  sha256: hash(body.replace(/\s+/g, "")),
  sourceIds: [],
};
const linked: SourceDocument = {
  file: "evidence.md",
  sha256: hash("SourceS1."),
  sourceIds: ["S1"],
};
const sourceBody = "Source S1.\n";
const row = `| S1 | ${record.url} | ${record.fetchedAt} | 200 | ${record.sha256} | document | search the passage \\| one match |\n`;
const linkedContent = `${sourceBody}${SOURCE_TABLE_MARKER}\n${SOURCE_TABLE_HEADER}${row}`;
unit(documentSourceProblems, {
  positive: [
    positive("reviewed local evidence needs no external table", [body, local, [record]], []),
    positive(
      "external evidence ends with the exact source record",
      [linkedContent, linked, [record]],
      [],
    ),
  ],
  negative: [
    rejected("prose without review fails", ["Changed evidence", local, [record]], seen(count, 1)),
    rejected(
      "an statement without a source reference fails",
      [sourceBody, local, [record]],
      seen(count, 1),
    ),
    rejected("a missing source record fails", [linkedContent, linked, []], seen(count, 1)),
    rejected("a missing final table fails", [sourceBody, linked, [record]], seen(count, 1)),
    rejected(
      "a modified table fails",
      [linkedContent.replace("one match", "no match"), linked, [record]],
      seen(count, 1),
    ),
  ],
});
const empty = await makeDir();
const valid = await makeDir();
const missingDocument = await makeDir();
const missingIndex = await makeDir();
const malformed = await makeDir();
const unreadable = await makeDir();
const base = "openspec/changes/sample";
const indexPath = join(base, "source-records.json");
const index = JSON.stringify({ records: [record], documents: [local] });
await writeFiles(valid, { [indexPath]: index, [join(base, local.file)]: body });
await writeFiles(missingDocument, {
  [indexPath]: index,
  [join(base, local.file)]: body,
  [join(base, "missing-source.md")]: "A new fact",
});
await writeFiles(missingIndex, {
  [join(base, "tasks.md")]: "- [ ] 1.0 Sourcing and verification: required",
});
await writeFiles(malformed, { [indexPath]: "{}" });
await writeFiles(unreadable, { [indexPath]: index });
unit(checkSources, {
  positive: [
    positive("no source-bearing change passes", [empty, fetcher], 0),
    positive("all reviewed files and fresh sources pass", [valid, fetcher], 0),
  ],
  negative: [
    rejected("a new statement file without a review fails", [missingDocument, fetcher], 1),
    rejected("deleting the required index fails", [missingIndex, fetcher], 1),
    rejected("a malformed index fails", [malformed, fetcher], 1),
    rejected("an unreadable reviewed file fails", [unreadable, fetcher], 1),
    rejected("a changed live source fails", [valid, altered], 1),
  ],
});
