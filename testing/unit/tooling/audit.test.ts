import { expect, mock, test } from "bun:test";
import { AUDIT_COMMAND, VERIFY_COMMANDS, VerifyStep } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import type { RunResult } from "@platform/types";
import { runAudit } from "../../../tooling/scripts/audit.ts";

const clean = { exitCode: 0, stdout: "No vulnerabilities found", stderr: "" };
const disconnected = {
  exitCode: 1,
  stdout: "",
  stderr: "error: ConnectionClosed: audit request failed",
};
const timedOut = { exitCode: 124, stdout: "", stderr: "" };
const findings = { exitCode: 1, stdout: "1 high vulnerability", stderr: "" };
const malformed = { exitCode: 1, stdout: "", stderr: "Invalid audit response" };
const cleanRun = mock(async (): Promise<RunResult> => clean);
const recovered = mock(async (): Promise<RunResult> => clean).mockResolvedValueOnce(disconnected);
const timeoutRecovery = mock(async (): Promise<RunResult> => clean).mockResolvedValueOnce(timedOut);
const disconnectedRun = mock(async (): Promise<RunResult> => disconnected);
const timeoutRun = mock(async (): Promise<RunResult> => timedOut);
const findingsRun = mock(async (): Promise<RunResult> => findings);
const malformedRun = mock(async (): Promise<RunResult> => malformed);
const mixedRun = mock(
  async (): Promise<RunResult> => ({ ...findings, stderr: disconnected.stderr }),
);
const missingRun = mock(async (): Promise<RunResult> => {
  throw new Error("missing timeout executable");
});
const pause = mock(async (): Promise<void> => {});
const cleanResult = async (exitCode: number) => ({ exitCode, calls: cleanRun.mock.calls.length });
const recoveredResult = async (exitCode: number) => ({
  exitCode,
  calls: recovered.mock.calls.length,
});
const timeoutResult = async (exitCode: number) => ({
  exitCode,
  calls: timeoutRecovery.mock.calls.length,
});
const failedResult = async (exitCode: number) => ({
  exitCode,
  calls: disconnectedRun.mock.calls.length,
});
const exhaustedResult = async (exitCode: number) => ({
  exitCode,
  calls: timeoutRun.mock.calls.length,
});
const findingsResult = async (exitCode: number) => ({
  exitCode,
  calls: findingsRun.mock.calls.length,
});
const malformedResult = async (exitCode: number) => ({
  exitCode,
  calls: malformedRun.mock.calls.length,
});
const mixedResult = async (exitCode: number) => ({ exitCode, calls: mixedRun.mock.calls.length });

unit(runAudit, {
  positive: [
    positive(
      "clean audit runs once",
      [cleanRun, pause],
      seen(cleanResult, { exitCode: 0, calls: 1 }),
    ),
    positive(
      "connection failure requires a fresh clean result",
      [recovered, pause],
      seen(recoveredResult, { exitCode: 0, calls: 2 }),
    ),
    positive(
      "timeout can recover on a fresh attempt",
      [timeoutRecovery, pause],
      seen(timeoutResult, { exitCode: 0, calls: 2 }),
    ),
  ],
  negative: [
    negative("a missing timeout executable fails closed", [missingRun, pause], {
      message: "missing timeout executable",
    }),
    rejected(
      "connection failure exhausts three attempts",
      [disconnectedRun, pause],
      seen(failedResult, { exitCode: 1, calls: 3 }),
    ),
    rejected(
      "timeouts cannot pass without a clean result",
      [timeoutRun, pause],
      seen(exhaustedResult, { exitCode: 1, calls: 3 }),
    ),
    rejected(
      "vulnerabilities fail immediately",
      [findingsRun, pause],
      seen(findingsResult, { exitCode: 1, calls: 1 }),
    ),
    rejected(
      "malformed reports fail immediately",
      [malformedRun, pause],
      seen(malformedResult, { exitCode: 1, calls: 1 }),
    ),
    rejected(
      "findings take precedence over a transport error",
      [mixedRun, pause],
      seen(mixedResult, { exitCode: 1, calls: 1 }),
    ),
  ],
});

test("audit step invokes the bounded wrapper without advisory filters", async () => {
  expect(VERIFY_COMMANDS[VerifyStep.Audit]).toEqual(["bun", "run", "tooling/scripts/audit.ts"]);
  expect(AUDIT_COMMAND).toEqual(["timeout", "-k", "5", "60", "bun", "audit"]);
});
