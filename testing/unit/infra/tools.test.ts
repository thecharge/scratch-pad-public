import { afterAll, expect, mock } from "bun:test";
import { join } from "node:path";
import { ToolBinary } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { installBundles } from "../../../apps/infra/src/tools.ts";

afterAll(removeAll);

const payload = new Uint8Array([1, 2, 3]);
const digest = new Bun.CryptoHasher("sha256").update(payload).digest("hex");
const platform = `${process.platform}-${process.arch}`;
const release = {
  version: "1.0.0",
  files: { [platform]: "bundle.tar.gz" },
  sha256: { [platform]: digest },
};
const releases = { [ToolBinary.Pulumi]: release } as never;
const unavailableRelease = { ...release, files: {} };
const unavailable = { [ToolBinary.Pulumi]: unavailableRelease } as never;
const only = [ToolBinary.Pulumi] as never;
const root = await makeDir();
const present = await makeDir();
const badExtractRoot = await makeDir();
await writeFiles(present, { [join(ToolBinary.Pulumi, ToolBinary.Pulumi)]: "existing binary" });
const fetcher = mock(async () => new Response(payload));
const unused = mock(async () => {
  throw new Error("an existing tool must not be downloaded");
});
const corrupt = mock(async () => new Response("changed archive"));
const extract = mock(async () => ({ exitCode: 0, stdout: "", stderr: "" }));
const brokenExtract = mock(async () => ({
  exitCode: 9,
  stdout: "",
  stderr: "archive extraction failed",
}));

unit(installBundles, {
  positive: [
    positive(
      "verified bundles reach the supplied extractor",
      [root, fetcher, only, releases, extract],
      seen(async (exitCode: number) => ({ exitCode, calls: extract.mock.calls.length }), {
        exitCode: 0,
        calls: 1,
      }),
    ),
    positive(
      "an installed bundle requires no fetch or process",
      [present, unused, only, releases, extract],
      0,
    ),
  ],
  negative: [
    rejected(
      "unsupported platforms cannot succeed",
      [root, fetcher, only, unavailable, extract],
      1,
    ),
    negative("corrupt downloads never reach extraction", [root, corrupt, only, releases, extract], {
      message: expect.stringContaining("Checksum mismatch"),
    }),
    negative(
      "extractor failures propagate",
      [badExtractRoot, fetcher, only, releases, brokenExtract],
      { message: expect.stringContaining("archive extraction failed") },
    ),
  ],
});
