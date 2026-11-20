import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApi } from "@platform/api/app";
import { createJwksProvider } from "@platform/auth";
import { LOOPBACK_NAME, LOOPBACK_ORIGIN } from "@platform/config/urls";
import {
  BetterAuthPath,
  BUILD_TIMEOUT_MS,
  CheckKind,
  DOCS_DOMAIN,
  KB_STATUS_SEPARATOR,
  McpEra,
  MessageId,
  OutcomeLabel,
  RepoFile,
  Runner,
  SDK_CLIENT_ARGUMENT,
  SDK_CONSUMER_FILE,
  SDK_CONSUMER_MANIFEST,
  SDK_CONSUMER_SOURCE,
  SDK_INSTALL_ARGS,
  SDK_INSTALLED_ENTRY,
  SDK_PROJECT_PREFIX,
  SDK_STEP_LABEL,
  SDK_STEPS_FILE,
  Separator,
  StdioMode,
  StepFlag,
  StepSource,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  createTestIssuer,
  createTickClock,
  isolatedDatabasePath,
  startServer,
  tokenFor,
} from "@platform/test-framework";
import {
  type CheckResult,
  type SdkObservation,
  type SdkRunOutput,
  SdkRunOutputSchema,
  type SdkScenario,
  type SdkStep,
  type SdkTokenStep,
  type StepResult,
} from "@platform/types";
import { all } from "@platform/util";
import { withDeadline } from "./deadline.ts";
import { stabilizeResults } from "./stabilize.ts";

async function spawnText(command: readonly string[], cwd: string): Promise<string> {
  const child = Bun.spawn([...command], {
    cwd,
    stdout: StdioMode.Pipe,
    stderr: StdioMode.Pipe,
  });
  const [out, err, code] = (await withDeadline(
    all<string | number>([
      async () => new Response(child.stdout).text(),
      async () => new Response(child.stderr).text(),
      async () => child.exited,
    ]),
    SDK_STEP_LABEL,
    BUILD_TIMEOUT_MS,
    async () => {
      child.kill();
    },
  )) as [string, string, number];
  if (code !== 0) {
    throw new Error(message(MessageId.SdkConsumerFailed, { detail: err + out }));
  }
  return out;
}

async function installPackage(
  project: string,
  tarball: string,
  execute: typeof spawnText,
): Promise<void> {
  await Bun.write(join(project, RepoFile.PackageJson), SDK_CONSUMER_MANIFEST);
  await Bun.write(join(project, SDK_CONSUMER_FILE), SDK_CONSUMER_SOURCE);
  try {
    await execute([...SDK_INSTALL_ARGS, tarball], project);
  } catch (error) {
    throw new Error(message(MessageId.SdkInstallFailed, { detail: String(error) }));
  }
}

function outcomeLabel(failed: boolean): string {
  return failed ? OutcomeLabel.AnError : OutcomeLabel.Success;
}

function observationOutcome(observation: SdkObservation): string {
  const label = observation.ok ? OutcomeLabel.Ok : OutcomeLabel.Error;
  return observation.httpStatus === undefined
    ? label
    : [label, observation.httpStatus].join(KB_STATUS_SEPARATOR);
}

function responseOf(observation: SdkObservation): string {
  const { ok, body, status, reason } = observation;
  return JSON.stringify(ok ? body : { status, reason }, undefined, 2);
}

function checksOf(step: SdkStep, observation: SdkObservation): CheckResult[] {
  const expected = outcomeLabel(step.expectError === true);
  const outcome = {
    kind: CheckKind.Outcome,
    label: message(MessageId.CheckOutcome, { expected }),
    passed: expected === outcomeLabel(!observation.ok),
  };
  const reason =
    step.reason === undefined
      ? []
      : [
          {
            kind: CheckKind.Reason,
            label: message(MessageId.CheckReason, { reason: step.reason }),
            passed: observation.reason === step.reason,
          },
        ];
  return [outcome, ...reason];
}

function expectationOf(step: SdkStep): string {
  if (step.reason !== undefined) {
    return message(MessageId.ApiExpectReason, { reason: step.reason });
  }
  return message(step.expectError === true ? MessageId.ApiExpectError : MessageId.ApiExpectSuccess);
}

function argumentsOf(step: SdkStep): string {
  const items = Object.entries(step.params).map(([name, value]) =>
    message(MessageId.SdkArgItem, { name, value: JSON.stringify(value) }),
  );
  return [SDK_CLIENT_ARGUMENT, ...items].join(Separator.ListSpaced);
}

export function sdkResultOf(step: SdkStep, observation: SdkObservation): StepResult {
  const checks = checksOf(step, observation);
  const scopes =
    step.scopes.length === 0
      ? message(MessageId.ApiNoToken)
      : step.scopes.join(Separator.ListSpaced);
  const request = message(MessageId.SdkCallText, { call: step.call, args: argumentsOf(step) });
  return {
    source: StepSource.Sdk,
    description: step.description,
    flag: checks.every((check) => check.passed) ? StepFlag.Passed : StepFlag.Failed,
    place: step.place,
    action: message(MessageId.SdkActionText, { call: step.call, summary: step.summary, scopes }),
    expectation: expectationOf(step),
    checks,
    evidence: {
      request,
      response: responseOf(observation),
      outcome: observationOutcome(observation),
      expected: outcomeLabel(step.expectError === true),
      actual: outcomeLabel(!observation.ok),
    },
  };
}

export function installResult(entry: string, project: string): StepResult {
  const wanted = join(project, SDK_INSTALLED_ENTRY);
  const passed = entry.endsWith(wanted);
  const label = message(MessageId.SdkInstallCheck, { path: SDK_INSTALLED_ENTRY });
  return {
    source: StepSource.Sdk,
    description: message(MessageId.SdkInstallDescription),
    flag: passed ? StepFlag.Passed : StepFlag.Failed,
    place: message(MessageId.SdkInstallPlace),
    action: message(MessageId.SdkInstallAction),
    expectation: message(MessageId.SdkInstallExpectation),
    checks: [{ kind: CheckKind.Outcome, label, passed }],
    evidence: {},
  };
}

async function consume(
  project: string,
  origin: string,
  steps: readonly SdkTokenStep[],
  execute: typeof spawnText,
): Promise<SdkRunOutput> {
  await Bun.write(join(project, SDK_STEPS_FILE), JSON.stringify(steps));
  const out = await execute(
    [Runner.Bun, join(project, SDK_CONSUMER_FILE), join(project, SDK_STEPS_FILE), origin],
    project,
  );
  return SdkRunOutputSchema.parse(JSON.parse(out));
}

async function startSdkApi() {
  const issuer = await createTestIssuer(
    [LOOPBACK_ORIGIN, BetterAuthPath.Base].join(Text.Empty),
    LOOPBACK_ORIGIN,
  );
  const provider = await createJwksProvider({
    issuer: issuer.issuer,
    audience: issuer.audience,
    resource: LOOPBACK_ORIGIN,
    keys: issuer.keys,
  });
  const server = await startServer(
    await createApi({
      auth: { enabled: true, provider },
      domain: DOCS_DOMAIN,
      resource: LOOPBACK_ORIGIN,
      databasePath: isolatedDatabasePath(),
      era: McpEra.Stateless,
      host: LOOPBACK_NAME,
      allowedHosts: [LOOPBACK_NAME],
      allowedOrigins: [],
      now: await createTickClock(),
    }),
  );
  return { issuer, server };
}

export async function runSdkScenario(
  scenario: SdkScenario,
  tarball: string,
  connect: typeof startSdkApi = startSdkApi,
  execute: typeof spawnText = spawnText,
): Promise<StepResult[]> {
  const { issuer, server } = await connect();
  const project = await mkdtemp(join(tmpdir(), SDK_PROJECT_PREFIX));
  try {
    await installPackage(project, tarball, execute);
    const tokens = await all(
      scenario.steps.map((step) => async () => tokenFor(issuer, step.scopes)),
    );
    const steps = scenario.steps.map((step, index) => ({
      ...step,
      token: tokens[index] as string,
    }));
    const output = await consume(project, server.origin, steps, execute);
    return await stabilizeResults([
      installResult(output.entry, project),
      ...scenario.steps.map((step, index) =>
        sdkResultOf(step, output.observed[index] ?? { ok: false }),
      ),
    ]);
  } finally {
    await server.stop();
    await rm(project, { recursive: true, force: true });
  }
}
