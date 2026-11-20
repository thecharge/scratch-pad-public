import { afterAll, expect } from "bun:test";
import { join } from "node:path";
import { Separator, ToolBinary } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import { installBundles } from "../../../apps/infra/src/tools.ts";
import { run } from "../../../tooling/scripts/tools.ts";

afterAll(removeAll);

const platform = [process.platform, process.arch].join(Separator.Platform);
const ARCHIVE_FILE = "bundle.tar.gz";
const payload = await makeDir();
await writeFiles(payload, {
  [`${ToolBinary.Pulumi}/${ToolBinary.Pulumi}`]: "#!/bin/sh\nexit 0\n",
  [`${ToolBinary.Pulumi}/pulumi-language-bun`]: "#!/bin/sh\nexit 0\n",
});
await run(["tar", "czf", join(payload, ARCHIVE_FILE), "-C", payload, ToolBinary.Pulumi]);
const archive = new Uint8Array(await Bun.file(join(payload, ARCHIVE_FILE)).arrayBuffer());
const BAD_ARCHIVE = new TextEncoder().encode("this is not an archive");
const sha = (bytes: Uint8Array) => new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
const releaseOf = (bytes: Uint8Array, files: Record<string, string>) => ({
  version: "1.0.0",
  files,
  sha256: { [platform]: sha(bytes) },
});
const releasesFor = (
  bytes: Uint8Array,
  files: Record<string, string> = { [platform]: ARCHIVE_FILE },
) => ({ [ToolBinary.Pulumi]: releaseOf(bytes, files) }) as never;
const serving = (bytes: Uint8Array, status = 200) => {
  const calls: string[] = [];
  const fetcher = async (input: RequestInfo | URL) => {
    calls.push(String(input));
    return new Response(bytes as never, { status });
  };
  return { calls, fetcher: fetcher as never };
};
const exists = (path: string) => async () => Bun.file(path).exists();

const rootA = await makeDir();
const rootB = await makeDir();
const rootC = await makeDir();
const rootD = await makeDir();
const rootE = await makeDir();
const rootF = await makeDir();
const rootG = await makeDir();
await writeFiles(rootB, { [`${ToolBinary.Pulumi}/${ToolBinary.Pulumi}`]: "" });
const served = serving(archive);
const unneeded = serving(archive);
const GOOD = releasesFor(archive);
const NO_PLATFORM = releasesFor(archive, {});
const ONLY = [ToolBinary.Pulumi] as never;

unit(installBundles, {
  positive: [
    positive(
      "the bundle is downloaded, verified and unpacked",
      [rootA, served.fetcher, ONLY, GOOD],
      0,
    ),
    positive(
      "the whole directory is on disk, the language host next to the command",
      [rootG, serving(archive).fetcher, ONLY, GOOD],
      seen(exists(join(rootG, ToolBinary.Pulumi, "pulumi-language-bun")), true),
    ),
    positive(
      "a bundle that is already there is not downloaded again",
      [rootB, unneeded.fetcher, ONLY, GOOD],
      seen(async () => unneeded.calls.length, 0),
    ),
  ],
  negative: [
    negative(
      "an archive that does not match its checksum is refused",
      [rootC, serving(archive).fetcher, ONLY, releasesFor(BAD_ARCHIVE)],
      { message: expect.stringContaining(ARCHIVE_FILE) },
    ),
    negative(
      "a download that fails is reported with its status",
      [rootD, serving(archive, 404).fetcher, ONLY, GOOD],
      { message: expect.stringContaining("404") },
    ),
    negative(
      "an archive that cannot be unpacked is reported",
      [rootE, serving(BAD_ARCHIVE).fetcher, ONLY, releasesFor(BAD_ARCHIVE)],
      { message: expect.stringContaining("Extraction failed") },
    ),
    rejected("a platform without an archive fails", [rootF, served.fetcher, ONLY, NO_PLATFORM], 1),
  ],
});
