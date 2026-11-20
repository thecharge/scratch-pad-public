import { join } from "node:path";
import {
  DOCS_PAGE_TOKEN,
  DOCS_PAGE_TOKEN_KEY,
  Glyph,
  HTTP_API_DOC_PATH,
  HTTP_API_RECORD_PATH,
  HttpHeader,
  MARKDOWN_INLINE_CODE_MARK,
  MessageId,
  SIGNED_DOWNLOAD_PLACE,
  SIGNED_DOWNLOAD_QUERY,
  SIGNED_DOWNLOAD_URL_PATTERN,
  Text,
  URL_QUERY_SEPARATOR,
} from "@platform/constants";
import { message } from "@platform/messages";
import { RecordedPageSchema, type StepResult, type SurfaceUrls } from "@platform/types";
import { all } from "@platform/util";

export async function generateHttpApiDocs(
  content: string,
  root: string,
  urls?: SurfaceUrls,
  recording = HTTP_API_RECORD_PATH,
  destination = HTTP_API_DOC_PATH,
): Promise<boolean> {
  const file = Bun.file(join(root, recording));
  if (!(await file.exists())) return false;
  const page = RecordedPageSchema.parse(await file.json());
  if (page.results.length === 0) return false;
  const { assertPassed, toMdx, guidePage } = await import("@platform/kb-recorder");
  assertPassed(page.id, page.results);
  const shown = await guidePage(page);
  const results = await all(
    shown.results.map(
      (result, index) => async () => prepareResult(result, shown.results[index - 1], urls),
    ),
  );
  await Bun.write(
    join(content, destination),
    toMdx(
      {
        ...shown,
        intent: [shown.intent, message(MessageId.OpaqueRecordingValues)].join(Glyph.Space),
        results: await displayResults(results),
      },
      urls,
    ),
  );
  return true;
}

async function prepareResult(
  result: StepResult,
  previous?: StepResult,
  urls?: SurfaceUrls,
): Promise<StepResult> {
  const headers = Object.fromEntries(
    Object.entries(result.evidence.headers ?? {}).filter(
      ([name]) => name.toLowerCase() !== HttpHeader.Authorization,
    ),
  );
  const prepared = { ...result, evidence: { ...result.evidence, headers } };
  if (result.evidence.path?.includes(SIGNED_DOWNLOAD_QUERY))
    return signedDownload(prepared, previous, urls);
  return {
    ...prepared,
    place:
      urls === undefined
        ? result.place
        : `${MARKDOWN_INLINE_CODE_MARK}${urls.api}${result.evidence.path ?? Text.Empty}${MARKDOWN_INLINE_CODE_MARK}`,
  };
}

async function signedDownload(
  result: StepResult,
  previous?: StepResult,
  urls?: SurfaceUrls,
): Promise<StepResult> {
  const metadata = previous?.evidence.path;
  if (metadata === undefined) throw new Error(message(MessageId.SignedDownloadMetadataRequired));
  const evidence = { ...result.evidence };
  delete evidence.method;
  delete evidence.path;
  evidence.request = message(MessageId.SignedDownloadRequest, {
    metadata: `${urls?.api ?? Text.Empty}${metadata}`,
  });
  return {
    ...result,
    description: result.description.split(URL_QUERY_SEPARATOR)[0] ?? result.description,
    place: SIGNED_DOWNLOAD_PLACE,
    evidence,
  };
}

async function displayResults(results: readonly StepResult[]): Promise<StepResult[]> {
  let text = JSON.stringify(results).replace(SIGNED_DOWNLOAD_URL_PATTERN, SIGNED_DOWNLOAD_PLACE);
  const tokens = results
    .map(
      (result) =>
        new URLSearchParams(result.evidence.path?.split(URL_QUERY_SEPARATOR)[1]).get(
          DOCS_PAGE_TOKEN_KEY,
        ) ?? Text.Empty,
    )
    .filter((token) => token.length > 0);
  for (const token of tokens)
    text = text
      .replaceAll(encodeURIComponent(token), DOCS_PAGE_TOKEN)
      .replaceAll(token, DOCS_PAGE_TOKEN);
  return JSON.parse(text);
}
