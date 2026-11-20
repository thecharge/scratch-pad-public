import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { CURL_IMAGE_REPOSITORY } from "@platform/config/environments";
import { HTTP_API_RECORD_PATH } from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { JsonObjectSchema, OpenApiDocumentSchema, type RecordedPage } from "@platform/types";
import { runPodman } from "./proxy-fixtures.ts";

async function removeHttpCurl(name: string) {
  const removed = await runPodman(["rm", name]);
  if (removed.exitCode !== 0) throw new Error(removed.stderr);
}

export async function prepareHttpCurl() {
  const name = `platform-http-curl-${crypto.randomUUID()}`;
  const target = join(REPO_ROOT, ".stack/e2e/http-curl");
  await mkdir(dirname(target), { recursive: true });
  const created = await runPodman(["create", "--name", name, `${CURL_IMAGE_REPOSITORY}:latest`]);
  if (created.exitCode !== 0) throw new Error(created.stderr);
  try {
    const copied = await runPodman(["cp", `${name}:/curl`, target]);
    if (copied.exitCode !== 0) throw new Error(copied.stderr);
    return target;
  } finally {
    await removeHttpCurl(name);
  }
}

export async function publishHttpPage(
  page: RecordedPage,
  recordings: RecordedPage[],
  count: number,
) {
  recordings.push(page);
  if (recordings.length !== count) return;
  await Bun.write(
    join(REPO_ROOT, HTTP_API_RECORD_PATH),
    JSON.stringify({ ...page, results: recordings.flatMap((recorded) => recorded.results) }),
  );
}

export async function assertHttpCoverage(page: RecordedPage) {
  const baseline = OpenApiDocumentSchema.parse(
    await Bun.file(join(REPO_ROOT, "openapi/baseline.json")).json(),
  );
  const entries = Object.entries(baseline.paths).flatMap(([path, methods]) =>
    Object.entries(methods).map(([method, operation]) => ({ path, method, operation })),
  );
  for (const { path, method, operation } of entries) {
    const pattern = new RegExp(`^${path.replace(/\{[^}]+\}/g, "[^/]+").replaceAll(":", "\\:")}$`);
    const matching = page.results.filter(
      (result) =>
        result.evidence.outcome === "HTTP 200" &&
        result.evidence.method?.toLowerCase() === method &&
        pattern.test((result.evidence.path ?? "").split("?")[0] ?? ""),
    );
    const success = JsonObjectSchema.parse(operation.responses["200"]);
    const forms = Object.keys(JsonObjectSchema.parse(success.content));
    const missing = forms.filter(
      (form) => !matching.some((result) => result.evidence.headers?.accept === form),
    );
    if (missing.length > 0)
      throw new Error(`Missing ${operation.operationId} response forms: ${missing.join(", ")}`);
  }
}
