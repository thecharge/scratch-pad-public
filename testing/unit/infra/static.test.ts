import { afterAll, expect, mock, test } from "bun:test";
import { environmentFor } from "@platform/config/environments";
import { EnvironmentName } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll, TEST_PROXY_SECRET, writeFiles } from "@platform/test-scenarios";
import type { RunOptions } from "@platform/types";
import { buildStaticSites, publishStaticSites } from "../../../apps/infra/src/static.ts";

afterAll(removeAll);
const root = await makeDir();
const empty = await makeDir();
const credentials = {
  RUSTFS_ACCESS_KEY: "fixture-access",
  RUSTFS_SECRET_KEY: "fixture-secret-for-object-store",
};
const configured = await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET, credentials);
const ordinary = await environmentFor(EnvironmentName.Test, TEST_PROXY_SECRET);
const ok = { exitCode: 0, stdout: "", stderr: "" };
const failed = { exitCode: 7, stdout: "", stderr: "fixture failure" };
const builds = mock(async () => ok);
const skipped = mock(async () => ok);
const brokenBuild = mock(async () => failed);
const brokenCreate = mock(async () => ok)
  .mockResolvedValueOnce(ok)
  .mockResolvedValueOnce(failed);
const brokenCopy = mock(async () => ok)
  .mockResolvedValueOnce(ok)
  .mockResolvedValueOnce(ok)
  .mockResolvedValueOnce(failed);
const brokenRemove = mock(async () => ok)
  .mockResolvedValueOnce(ok)
  .mockResolvedValueOnce(ok)
  .mockResolvedValueOnce(ok)
  .mockResolvedValueOnce(failed);

unit(buildStaticSites, {
  positive: [
    positive(
      "builds and exports separate app images and removes export containers",
      [configured, root, builds],
      seen(async (code: number) => [code, builds.mock.calls.length], [0, 8]),
    ),
    positive(
      "without a configured store no app build is started",
      [ordinary, root, skipped],
      seen(async (code: number) => [code, skipped.mock.calls.length], [0, 0]),
    ),
  ],
  negative: [
    rejected("a failed app build blocks startup", [configured, root, brokenBuild], 7),
    rejected(
      "a failed export container creation blocks startup",
      [configured, root, brokenCreate],
      7,
    ),
    rejected(
      "a failed copy still removes the export container",
      [configured, root, brokenCopy],
      seen(async (code: number) => [code, brokenCopy.mock.calls.length], [7, 4]),
    ),
    rejected(
      "a failed export container removal remains blocking",
      [configured, root, brokenRemove],
      7,
    ),
  ],
});

await writeFiles(root, {
  ".stack/static/test/console/index.html": "<html>console</html>",
  ".stack/static/test/console/assets/with space.js": "console.log(1)",
  ".stack/static/test/docs/index.html": "<html>docs</html>",
});
const commands: (readonly string[])[] = [];
let input = "";
const publisher = mock(async (command: readonly string[], options?: RunOptions) => {
  commands.push(command);
  input = options?.stdin ?? "";
  return ok;
});
const publishFailure = mock(async () => failed);
const noPublication = mock(async () => ok);
unit(publishStaticSites, {
  positive: [
    positive("publishes both builds with a single edge client", [configured, root, publisher], 0),
    positive(
      "does not publish without a store",
      [ordinary, root, noPublication],
      seen(async (code: number) => [code, noPublication.mock.calls.length], [0, 0]),
    ),
  ],
  negative: [
    rejected("an upload error blocks startup", [configured, root, publishFailure], 7),
    negative("an absent built index refuses publication", [configured, empty, publisher], {
      message: expect.stringContaining("no built index"),
    }),
  ],
});

test("publication keeps credentials on stdin and only grants reads to app buckets", async () => {
  await publishStaticSites(configured, root, publisher);
  expect(commands[0]?.join(" ")).toContain("--network platform-test-edge");
  expect(commands[0]?.join(" ")).not.toContain(credentials.RUSTFS_SECRET_KEY);
  expect(input).toContain(credentials.RUSTFS_SECRET_KEY);
  expect(input).toContain("/console/assets/with%20space.js");
  expect(input).toContain("s3:GetObject");
  expect(input).not.toContain("s3:PutObject");
  expect(input).toContain("arn:aws:s3:::console/*");
  expect(input).toContain("arn:aws:s3:::docs/*");
  expect(input).toContain("/site/console/index.html");
});
