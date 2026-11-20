import { afterAll, expect, test } from "bun:test";
import { join } from "node:path";
import { LOCAL_URLS } from "@platform/config/urls";
import {
  DocCategory,
  GUIDE_RAW_DIRECTORY,
  HTTP_API_DOC_PATH,
  HTTP_API_RECORD_PATH,
  SDK_PROTOCOL_DOC_PATH,
  SDK_PROTOCOL_RECORD_PATH,
  StepFlag,
  StepSource,
} from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { REPO_ROOT } from "@platform/test-framework";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { RecordedPageSchema } from "@platform/types";
import { generateHttpApiDocs } from "../../../tooling/scripts/generate-http-api-docs.ts";

afterAll(removeAll);
const headers = { authorization: "Bearer fixture" };
const step = {
  source: StepSource.Http,
  description: "Follow a task",
  flag: StepFlag.Passed,
  place: "POST /v1/assets",
  action: "Stream a file",
  expectation: "The checksum matches",
  checks: [],
  evidence: {
    request: "GET /v1/config",
    method: "GET",
    path: "/v1/config",
    authorized: true,
    headers,
    response: "A verified task result",
  },
};
const page = {
  id: "http-api-lifecycle",
  title: "Call the HTTP API",
  intent: "Follow a task and read its result.",
  category: DocCategory.ApiCalls,
  results: [step],
};
const ready = await makeDir();
await writeFiles(ready, { [HTTP_API_RECORD_PATH]: JSON.stringify(page) });
const failed = await makeDir();
const failedStep = { ...step, flag: StepFlag.Failed };
await writeFiles(failed, {
  [HTTP_API_RECORD_PATH]: JSON.stringify({ ...page, results: [failedStep] }),
});
const missing = await makeDir();
const empty = await makeDir();
await writeFiles(empty, { [HTTP_API_RECORD_PATH]: JSON.stringify({ ...page, results: [] }) });
const broken = await makeDir();
await writeFiles(broken, { [HTTP_API_RECORD_PATH]: "{}" });
const sdkReady = await makeDir();
const sdkPage = { ...page, id: "sdk-streamed-responses", category: DocCategory.SdkUsage };
await writeFiles(sdkReady, { [SDK_PROTOCOL_RECORD_PATH]: JSON.stringify(sdkPage) });

test.each([
  [ready, page, HTTP_API_RECORD_PATH, HTTP_API_DOC_PATH],
  [sdkReady, sdkPage, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
] as const)(
  "retains complete input before preparing guide output: %s",
  async (root, input, recording, destination) => {
    const original = RecordedPageSchema.parse(input);
    const digest = new Bun.CryptoHasher("sha256").update(JSON.stringify(original)).digest("hex");
    expect(
      await generateHttpApiDocs(join(root, "raw-proof"), root, LOCAL_URLS, recording, destination),
    ).toBe(true);
    const raw = await Bun.file(
      join(REPO_ROOT, GUIDE_RAW_DIRECTORY, `${input.id}-${digest}.json`),
    ).json();
    expect(raw).toEqual(original);
    expect(raw.results[0].evidence.headers.authorization).toBe("Bearer fixture");
  },
);
const sdkFailed = await makeDir();
await writeFiles(sdkFailed, {
  [SDK_PROTOCOL_RECORD_PATH]: JSON.stringify({ ...sdkPage, results: [failedStep] }),
});
const signed = await makeDir();
const download = {
  ...step,
  description: "Read the signed asset bytes",
  evidence: {
    ...step.evidence,
    path: "/private/file?X-Amz-Signature=fixture",
    response: "asset bytes",
  },
};
await writeFiles(signed, {
  [SDK_PROTOCOL_RECORD_PATH]: JSON.stringify({ ...sdkPage, results: [step, download] }),
});
const orphan = await makeDir();
await writeFiles(orphan, {
  [SDK_PROTOCOL_RECORD_PATH]: JSON.stringify({ ...sdkPage, results: [download] }),
});
const signedContent = join(signed, "content");
const opaque = await makeDir();
const opaqueStep = {
  ...step,
  evidence: {
    ...step.evidence,
    path: "/v1/books?pageToken=fixture-opaque-token",
    response:
      '{"nextPageToken":"fixture-opaque-token","downloadUrl":"https://fixture.invalid/object?X-Amz-Signature=fixture"}',
  },
};
await writeFiles(opaque, {
  [HTTP_API_RECORD_PATH]: JSON.stringify({ ...page, results: [opaqueStep] }),
});
const opaqueContent = join(opaque, "content");

const sdkContent = join(sdkReady, "content");
const content = join(ready, "content");
unit(generateHttpApiDocs, {
  positive: [
    positive(
      "displays named placeholders for opaque pagination values",
      [opaqueContent, opaque, LOCAL_URLS],
      seen(
        async () =>
          (await Bun.file(join(opaqueContent, HTTP_API_DOC_PATH)).text()).includes(
            "pageToken=PAGE_TOKEN",
          ),
        true,
      ),
    ),
    positive(
      "explains how to obtain current opaque values",
      [opaqueContent, opaque, LOCAL_URLS],
      seen(
        async () =>
          (await Bun.file(join(opaqueContent, HTTP_API_DOC_PATH)).text()).includes(
            "Read current values from preceding responses.",
          ),
        true,
      ),
    ),
    positive(
      "obtains a signed download from the preceding metadata response",
      [signedContent, signed, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      seen(
        async () =>
          (await Bun.file(join(signedContent, SDK_PROTOCOL_DOC_PATH)).text()).includes(
            "jq -r '.downloadUrl'",
          ),
        true,
      ),
    ),
    positive(
      "downloads from the returned URL without replacing its object-store host",
      [signedContent, signed, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      seen(
        async () =>
          (await Bun.file(join(signedContent, SDK_PROTOCOL_DOC_PATH)).text()).includes(
            '"$DOWNLOAD_URL"',
          ),
        true,
      ),
    ),
    positive(
      "publishes the explicit SDK protocol recording",
      [sdkContent, sdkReady, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      true,
    ),
    positive(
      "keeps the explicit SDK destination and observed response",
      [sdkContent, sdkReady, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      seen(
        async () =>
          (await Bun.file(join(sdkContent, SDK_PROTOCOL_DOC_PATH)).text()).includes(
            "A verified task result",
          ),
        true,
      ),
    ),
    positive("publishes a passed live recording", [content, ready], true),
    positive(
      "emits one authorization header",
      [content, ready, LOCAL_URLS],
      seen(
        async () =>
          (await Bun.file(join(content, HTTP_API_DOC_PATH)).text()).match(
            /--header 'authorization:/g,
          )?.length,
        1,
      ),
    ),
    positive(
      "uses the configured API address",
      [content, ready, LOCAL_URLS],
      seen(
        async () =>
          (await Bun.file(join(content, HTTP_API_DOC_PATH)).text()).includes(
            `Where: \`${LOCAL_URLS.api}/v1/config\``,
          ),
        true,
      ),
    ),
    positive(
      "keeps the observed checks and response in the client page",
      [content, ready],
      seen(
        async () =>
          (await Bun.file(join(content, HTTP_API_DOC_PATH)).text()).includes(
            "A verified task result",
          ),
        true,
      ),
    ),
  ],
  negative: [
    positive(
      "does not emit a pagination placeholder as an unclosed MDX tag",
      [opaqueContent, opaque, LOCAL_URLS],
      seen(
        async () =>
          (await Bun.file(join(opaqueContent, HTTP_API_DOC_PATH)).text()).includes("<PAGE_TOKEN>"),
        false,
      ),
    ),
    positive(
      "does not publish an opaque page token",
      [opaqueContent, opaque, LOCAL_URLS],
      seen(
        async () =>
          (await Bun.file(join(opaqueContent, HTTP_API_DOC_PATH)).text()).includes(
            "fixture-opaque-token",
          ),
        false,
      ),
    ),
    positive(
      "does not publish a signed object-store URL",
      [opaqueContent, opaque, LOCAL_URLS],
      seen(
        async () =>
          (await Bun.file(join(opaqueContent, HTTP_API_DOC_PATH)).text()).includes(
            "https://fixture.invalid/object",
          ),
        false,
      ),
    ),
    negative(
      "refuses a signed download without preceding metadata",
      [signedContent, orphan, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      { name: "Error" },
    ),
    positive(
      "does not invent an API download path for a signed object-store request",
      [signedContent, signed, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      seen(
        async () =>
          (await Bun.file(join(signedContent, SDK_PROTOCOL_DOC_PATH)).text()).includes(
            `${LOCAL_URLS.api}/private/file?`,
          ),
        false,
      ),
    ),
    negative(
      "refuses failed SDK protocol evidence",
      [sdkContent, sdkFailed, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      { name: "Error" },
    ),
    positive(
      "does not fall back to API evidence when the SDK recording is absent",
      [sdkContent, ready, LOCAL_URLS, SDK_PROTOCOL_RECORD_PATH, SDK_PROTOCOL_DOC_PATH],
      false,
    ),
    negative("refuses a failed recording", [content, failed], { name: "Error" }),
    negative("refuses a malformed recording", [content, broken], { name: "ZodError" }),
    positive("does not publish without live evidence", [content, missing], false),
    positive("does not publish an empty recording", [content, empty], false),
  ],
});
