import { afterAll } from "bun:test";
import { join } from "node:path";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { negative, positive, seen, unit } from "@platform/test-factories";
import { createTestIssuer } from "@platform/test-framework";
import { makeDir, removeAll } from "@platform/test-scenarios";
import { generateSdkDocs } from "../../../tooling/scripts/generate-sdk-docs.ts";

afterAll(removeAll);
const issuer = await createTestIssuer();
const server = { origin: TEST_PROXY_ORIGIN, stop: async () => undefined };
const connect = async () => ({ issuer, server });
const execute = async (_command: readonly string[], _directory: string) => "stub output";
const stopped: boolean[] = [];
const supplied: string[] = [];
const start = async (tarball: string) => {
  stopped.length = 0;
  supplied.push(tarball);
  return {
    connect,
    execute,
    stop: async () => {
      stopped.push(true);
    },
  };
};
const failedStart = async (_tarball: string) => {
  throw new Error("stub stack failed");
};
const pack = async () => {
  const directory = await makeDir();
  return { directory: join(directory, "package"), tarball: "fixture.tgz" };
};
const record = async (...args: Parameters<NonNullable<Parameters<typeof generateSdkDocs>[1]>>) => {
  const [scenarios, tarball, directory, session, runner] = args;
  supplied.push(
    String(scenarios.length),
    tarball,
    String(session === connect),
    String(runner === execute),
  );
  return [join(directory, "sdk.mdx")];
};
const failedRecord = async () => {
  throw new Error("stub recorder failed");
};
const output = await makeDir();
unit(generateSdkDocs, {
  positive: [
    positive(
      "returns the injected recorder paths",
      [output, record, pack, start],
      [join(output, "sdk.mdx")],
    ),
    positive(
      "closes the proxy after recording",
      [output, record, pack, start],
      seen(async () => stopped.length, 1),
    ),
    positive(
      "forwards the scoped session and executor",
      [output, record, pack, start],
      seen(async () => supplied.slice(-5), ["fixture.tgz", "3", "fixture.tgz", "true", "true"]),
    ),
  ],
  negative: [
    negative("propagates proxy startup failure", [output, record, pack, failedStart], {
      message: "stub stack failed",
    }),
    negative("propagates recording failure", [output, failedRecord, pack, start], {
      message: "stub recorder failed",
    }),
    negative("rejects a missing output directory", [undefined, record, pack, start], {
      name: "TypeError",
    }),
  ],
});
