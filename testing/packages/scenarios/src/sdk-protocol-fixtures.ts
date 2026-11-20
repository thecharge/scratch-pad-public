import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  EnvironmentName,
  SDK_CONSUMER_MANIFEST,
  SDK_INSTALL_ARGS,
  SDK_PROTOCOL_RECORD_PATH,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { type RecordedPage, RecordedPageSchema } from "@platform/types";
import { scopedApiFixture } from "./scoped-api-fixtures.ts";
import { sdkProxyRunner } from "./sdk-proxy-fixtures.ts";

export async function runSdkProtocol(tarball: string, curl: string, flag: string, version: string) {
  const fixture = await scopedApiFixture(EnvironmentName.Test, 200, true);
  const project = await mkdtemp(join(tmpdir(), "sdk-protocol-"));
  try {
    const execute = await sdkProxyRunner(tarball, {
      TEST_HTTP_CURL: curl,
      TEST_HTTP_PROTOCOL: flag,
      TEST_HTTP_VERSION: version,
      TEST_HTTP_ORIGIN: TEST_PROXY_ORIGIN,
      TEST_HTTP_ADMIN: fixture.owner,
    });
    await Bun.write(join(project, "package.json"), SDK_CONSUMER_MANIFEST);
    await execute([...SDK_INSTALL_ARGS, tarball], project);
    const source = join(REPO_ROOT, "testing/packages/scenarios/src/sdk-protocol-entry.ts");
    const entry = join(project, "protocol.test.js");
    await execute(
      ["bun", "build", source, "--external", "@platform/sdk", "--target=bun", `--outfile=${entry}`],
      project,
    );
    const output = await execute(["bun", "test", entry], project);
    const line = output.split("\n").find((value) => value.startsWith("[{"));
    return RecordedPageSchema.parse({
      id: "sdk-streamed-responses",
      title: "Read streamed responses with the SDK",
      intent:
        "Read typed results, iterate lists, upload streams and handle operation events with the installed SDK.",
      category: "sdk-usage",
      results: JSON.parse(line ?? "[]"),
    });
  } finally {
    await fixture.stop();
    await rm(project, { recursive: true, force: true });
  }
}

export async function publishSdkProtocols(pages: readonly RecordedPage[]) {
  if (pages.length !== 3) return;
  const page = pages[0];
  await Bun.write(
    join(REPO_ROOT, SDK_PROTOCOL_RECORD_PATH),
    JSON.stringify({ ...page, results: pages.flatMap((recorded) => recorded.results) }),
  );
}
