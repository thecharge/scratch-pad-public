import { Database } from "bun:sqlite";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createApi } from "@platform/api/app";
import { createRegistry } from "@platform/api/registry";
import { createJwksProvider, metadataUrl } from "@platform/auth";
import { FOREIGN_AUDIENCE, LOOPBACK_NAME, LOOPBACK_ORIGIN } from "@platform/config/urls";
import {
  AuthProviderKind,
  BetterAuthPath,
  CheckKind,
  DOCS_DOMAIN,
  DOCS_PROXY_SECRET,
  DOCS_REINDEX_STEP_MS,
  EXPIRED_TOKEN_SECONDS,
  HTTP_OK,
  KB_STATUS_SEPARATOR,
  McpEra,
  MessageId,
  OutcomeLabel,
  PathSegment,
  PREVIOUS_REFERENCE_PREFIX,
  PROXY_BACKEND_ENV,
  Separator,
  StepFlag,
  StepSource,
  TAMPER_DATABASE_PREFIX,
  TAMPER_DATABASE_SUFFIX,
  Text,
  TokenFlaw,
  TransportKind,
} from "@platform/constants";
import { createFlags } from "@platform/flags";
import { message } from "@platform/messages";
import { customCapabilities, GREETING_SKILL_DIRS } from "@platform/test-custom-capability";
import {
  createTestIssuer,
  createTickClock,
  isolatedDatabasePath,
  PACKAGE_SKILL_DIRS,
  startServer,
  tokenFor,
} from "@platform/test-framework";
import type {
  Capability,
  CheckResult,
  DocsAuthSetup,
  Exchange,
  FeatureFlags,
  IssueOptions,
  JsonObject,
  Scenario,
  ScenarioStep,
  StepResult,
  StepRun,
  TestIssuer,
} from "@platform/types";
import { z } from "zod";
import { createDocsBetterAuth } from "./better-auth.ts";
import { callHttp, callMcp, specFor } from "./callers.ts";
import { startProxyDocsApi } from "./proxy-session.ts";
import { stabilizeResults } from "./stabilize.ts";

export class ScenarioFailure extends Error {}

const SOURCES: Readonly<Record<TransportKind, StepSource>> = {
  [TransportKind.Http]: StepSource.Http,
  [TransportKind.Mcp]: StepSource.Mcp,
};

export function servedOver(step: ScenarioStep, transport: TransportKind): boolean {
  return (
    (step.httpOnly !== true || transport === TransportKind.Http) &&
    (step.mcpOnly !== true || transport === TransportKind.Mcp)
  );
}

function databaseFor(scenario: Scenario): string {
  return scenario.steps.some((step) => step.tamper !== undefined)
    ? join(tmpdir(), `${TAMPER_DATABASE_PREFIX}${crypto.randomUUID()}${TAMPER_DATABASE_SUFFIX}`)
    : isolatedDatabasePath();
}

async function tokenOf(issuer: TestIssuer, step: ScenarioStep): Promise<string | undefined> {
  const flawed: Readonly<Record<TokenFlaw, IssueOptions>> = {
    [TokenFlaw.Expired]: { scopes: step.scopes, expiresInSeconds: EXPIRED_TOKEN_SECONDS },
    [TokenFlaw.Foreign]: { scopes: step.scopes, audience: FOREIGN_AUDIENCE },
  };
  return step.tokenFlaw === undefined
    ? tokenFor(issuer, step.scopes)
    : issuer.issue(flawed[step.tokenFlaw]);
}

async function callStep(
  origin: string,
  token: string | undefined,
  transport: TransportKind,
  capability: Capability,
  step: ScenarioStep,
  input: JsonObject,
  proxySecret?: string,
) {
  return transport === TransportKind.Http
    ? callHttp(origin, token, capability, await specFor(capability, input, step), proxySecret)
    : callMcp(origin, token, capability, input, step.face);
}

function resolve(input: JsonObject, previous: JsonObject): JsonObject {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => {
      const text = z.string().safeParse(value);
      const isReference = text.success && text.data.startsWith(PREVIOUS_REFERENCE_PREFIX);
      const field = text.success ? text.data.slice(PREVIOUS_REFERENCE_PREFIX.length) : Text.Empty;
      return [key, isReference ? previous[field] : value];
    }),
  );
}

function outcomeLabel(failed: boolean): string {
  return failed ? OutcomeLabel.AnError : OutcomeLabel.Success;
}

function responseOutcome(exchange: Exchange): string {
  const label = exchange.failed ? OutcomeLabel.Error : OutcomeLabel.Ok;
  return exchange.status === undefined ? label : [label, exchange.status].join(KB_STATUS_SEPARATOR);
}

function outcomeCheck(expected: string, passed: boolean): CheckResult {
  const label = message(MessageId.CheckOutcome, { expected });
  return { kind: CheckKind.Outcome, label, passed };
}

function reasonChecks(
  transport: TransportKind,
  step: ScenarioStep,
  exchange: Exchange,
): CheckResult[] {
  const text = transport === TransportKind.Mcp ? step.mcpText : undefined;
  const wanted = text ?? step.reason;
  const id = text === undefined ? MessageId.CheckReason : MessageId.CheckResultText;
  return wanted === undefined
    ? []
    : [
        {
          kind: CheckKind.Reason,
          label: message(id, { reason: wanted }),
          passed: exchange.response.includes(wanted),
        },
      ];
}

async function statusChecks(
  transport: TransportKind,
  step: ScenarioStep,
  exchange: Exchange,
): Promise<CheckResult[]> {
  const wanted = transport === TransportKind.Mcp ? step.mcpStatus : step.status;
  const url = await metadataUrl(LOOPBACK_ORIGIN);
  const status: CheckResult = {
    kind: CheckKind.Status,
    label: message(MessageId.CheckStatus, { status: wanted ?? HTTP_OK }),
    passed: (exchange.status ?? HTTP_OK) === wanted,
  };
  const challenge: CheckResult = {
    kind: CheckKind.Challenge,
    label: message(MessageId.CheckChallenge, { url }),
    passed: exchange.challenge?.includes(url) === true,
  };
  return [
    ...(wanted === undefined ? [] : [status]),
    ...(step.challenge === true ? [challenge] : []),
  ];
}

function expectationOf(step: ScenarioStep): string {
  if (step.reason !== undefined) {
    const id =
      step.expectError === true ? MessageId.ApiExpectReason : MessageId.ApiExpectSuccessReason;
    return message(id, { reason: step.reason });
  }
  return message(step.expectError === true ? MessageId.ApiExpectError : MessageId.ApiExpectSuccess);
}

function actionOf(step: ScenarioStep, summary: string): string {
  const scopes =
    step.scopes.length === 0
      ? message(MessageId.ApiNoToken)
      : step.scopes.join(Separator.ListSpaced);
  return message(MessageId.ApiAction, { id: step.capability, summary, scopes });
}

export async function resultOf(
  transport: TransportKind,
  step: ScenarioStep,
  exchange: Exchange,
  summary: string = step.description,
): Promise<StepResult> {
  const expected = outcomeLabel(step.expectError === true);
  const actual = outcomeLabel(exchange.failed);
  const checks = [
    outcomeCheck(expected, expected === actual),
    ...reasonChecks(transport, step, exchange),
    ...(await statusChecks(transport, step, exchange)),
    ...(exchange.checks ?? []),
  ];
  return {
    source: SOURCES[transport],
    capability: step.capability,
    description: step.description,
    flag: checks.every((check) => check.passed) ? StepFlag.Passed : StepFlag.Failed,
    place: exchange.request,
    action: actionOf(step, summary),
    expectation: expectationOf(step),
    checks,
    evidence: {
      request: exchange.request,
      requestBody: exchange.requestBody,
      note: exchange.note,
      reason: step.reason,
      method: exchange.method,
      path: exchange.path,
      headers: exchange.headers,
      authorized: exchange.authorized,
      tool: exchange.tool,
      args: exchange.args,
      scopes: step.scopes,
      response: exchange.response,
      challenge: exchange.challenge,
      outcome: responseOutcome(exchange),
      expected,
      actual,
    },
  };
}

async function tamperWith(databasePath: string, statement: string | undefined): Promise<void> {
  if (statement !== undefined) {
    const database = new Database(databasePath);
    database.run(statement);
    database.close();
  }
}

async function runStep(
  origin: string,
  databasePath: string,
  issuer: TestIssuer,
  transport: TransportKind,
  step: ScenarioStep,
  previous: JsonObject,
  flags: FeatureFlags,
  extras: readonly Capability[],
  proxySecret?: string,
): Promise<StepRun> {
  await flags.set(step.flags ?? {});
  await tamperWith(databasePath, step.tamper);
  const capability =
    extras.find((candidate) => candidate.id === step.capability) ??
    (await (await createRegistry()).get(step.capability));
  const token = await tokenOf(issuer, step);
  const call = await callStep(
    origin,
    token,
    transport,
    capability,
    step,
    resolve(step.input, previous),
    proxySecret,
  );
  return {
    result: await resultOf(transport, step, call.exchange, capability.summary),
    body: call.body,
  };
}

async function runSteps(
  origin: string,
  databasePath: string,
  issuer: TestIssuer,
  transport: TransportKind,
  steps: readonly ScenarioStep[],
  flags: FeatureFlags,
  extras: readonly Capability[],
  proxySecret?: string,
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  let previous: JsonObject = {};
  for (const step of steps.filter((candidate) => servedOver(candidate, transport))) {
    const run = await runStep(
      origin,
      databasePath,
      issuer,
      transport,
      step,
      previous,
      flags,
      extras,
      proxySecret,
    );
    results.push(run.result);
    previous = { ...previous, ...run.body };
    if (run.result.flag === StepFlag.Failed) {
      break;
    }
  }
  return results;
}

async function jwksSetup(): Promise<DocsAuthSetup> {
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
  return { issuer, provider };
}

async function authSetup(kind: AuthProviderKind): Promise<DocsAuthSetup> {
  return kind === AuthProviderKind.BetterAuth
    ? await createDocsBetterAuth(LOOPBACK_ORIGIN)
    : await jwksSetup();
}

export async function startDocsApi(
  authEnabled: boolean,
  databasePath: string,
  kind: AuthProviderKind = AuthProviderKind.Jwks,
  extras: readonly Capability[] = [],
  proxySecret?: string,
) {
  const { issuer, provider, authApp } = await authSetup(kind);
  const flags = await createFlags();
  const api = await createApi({
    auth: { enabled: authEnabled, provider },
    ...(authApp === undefined ? {} : { authApp }),
    domain: DOCS_DOMAIN,
    resource: LOOPBACK_ORIGIN,
    databasePath,
    era: McpEra.Stateless,
    host: LOOPBACK_NAME,
    allowedHosts: [LOOPBACK_NAME],
    allowedOrigins: [],
    flags,
    skillDirs: [...PACKAGE_SKILL_DIRS, ...(extras.length === 0 ? [] : GREETING_SKILL_DIRS)],
    extraCapabilities: [...extras],
    now: await createTickClock(),
    reindexStepMs: DOCS_REINDEX_STEP_MS,
    ...(proxySecret === undefined ? {} : { proxySecret }),
  });
  return { issuer, flags, server: await startServer(api) };
}

export async function runScenario(
  scenario: Scenario,
  transport: TransportKind,
  start: typeof startDocsApi = scenarioApi,
): Promise<StepResult[]> {
  const databasePath = databaseFor(scenario);
  const extras = scenario.custom === true ? await customCapabilities() : [];
  const proxySecret = scenario.behindProxy === true ? DOCS_PROXY_SECRET : undefined;
  const { issuer, flags, server } = await start(
    scenario.authEnabled,
    databasePath,
    scenario.provider,
    extras,
    proxySecret,
  );
  try {
    return await stabilizeResults(
      await runSteps(
        server.origin,
        databasePath,
        issuer,
        transport,
        scenario.steps,
        flags,
        extras,
        proxySecret,
      ),
    );
  } finally {
    if (databasePath !== PathSegment.InMemoryDatabase) await rm(databasePath, { force: true });
    await server.stop();
  }
}

async function scenarioApi(...args: Parameters<typeof startDocsApi>) {
  return Bun.env[PROXY_BACKEND_ENV] === undefined
    ? startDocsApi(...args)
    : startProxyDocsApi(...args);
}
