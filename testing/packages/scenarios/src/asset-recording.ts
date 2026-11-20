import { join } from "node:path";
import { resolveDocsUrls } from "@platform/config/factual";
import {
  ASSET_RECORD_PATH,
  CheckKind,
  DocCategory,
  HttpHeader,
  StepFlag,
  StepSource,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import type { StepResult, StringRecord } from "@platform/types";

const results: StepResult[] = [];
async function save() {
  await Bun.write(
    join(REPO_ROOT, ASSET_RECORD_PATH),
    JSON.stringify({
      id: "private-assets",
      title: "Upload and download private assets",
      intent:
        "Stream a file with its media type and SHA-256 checksum. Read your metadata to obtain a signed download URL. Replace the example checksum with the SHA-256 of your file.",
      category: DocCategory.ApiCalls,
      results,
    }),
  );
}

export async function recordedAssetStep(
  description: string,
  path: string,
  headers: StringRecord,
  run: () => Promise<string>,
  bodyFile?: string,
  source = StepSource.Http,
): Promise<string> {
  const method = bodyFile === undefined ? "GET" : "POST";
  const evidence = {
    method,
    path,
    headers,
    authorized: headers[HttpHeader.Authorization] !== undefined,
    scopes: ["read", "write"],
    ...(bodyFile === undefined ? {} : { requestBodyFile: bodyFile }),
  };
  const result: StepResult = {
    source,
    description,
    flag: StepFlag.Failed,
    place: `${method} ${path}`,
    action: description,
    expectation: "The recorded request passes every asset check.",
    checks: [],
    evidence,
  };
  result.evidence.headers = Object.fromEntries(
    Object.entries(headers).filter(([name]) => name !== HttpHeader.Authorization),
  );
  if (path.startsWith("$")) {
    const metadataPath = results.at(-1)?.evidence.path;
    const { urls } = await resolveDocsUrls();
    delete result.evidence.method;
    delete result.evidence.path;
    result.evidence.request = [
      `DOWNLOAD_URL=$(curl --request GET '${urls.api}${metadataPath}' -H 'accept: application/json' -H 'authorization: Bearer <YOUR_ACCESS_TOKEN>' | jq -r '.downloadUrl')\n`,
      "curl",
      ...Object.entries(headers).map(([name, value]) => `-H '${name}: ${value}'`),
      `"${path}"`,
    ].join(" ");
    result.evidence.scopes = [];
  }
  results.push(result);
  await save();
  const response = await run();
  result.evidence.response = response.replace(
    /"downloadUrl"\s*:\s*"[^"]*"/g,
    '"downloadUrl":"<signed download URL>"',
  );
  result.checks.push({
    kind: CheckKind.Outcome,
    label: "The recorded request passes every asset check.",
    passed: true,
  });
  result.flag = StepFlag.Passed;
  await save();
  return response;
}
