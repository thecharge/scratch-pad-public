import { join } from "node:path";
import {
  API_CALL_SEPARATOR,
  CheckKind,
  DETAIL_SEPARATOR,
  EVENT_PAGE_ERROR,
  EVENT_REQUEST,
  EVENT_REQUEST_FAILED,
  Glyph,
  IGNORED_FAILURE,
  JWT_PATTERN,
  MessageId,
  NETWORK_IDLE,
  Separator,
  SHOT_EXTENSION,
  SHOT_FOLDER_URL,
  STORAGE_SCRIPT,
  StepFlag,
  StepSource,
  Text,
  UI_CLOSE_TIMEOUT_MS,
  UI_SETTLE_MS,
  UI_STEP_TIMEOUT_MS,
  UI_VIEWPORT_HEIGHT,
  UI_VIEWPORT_WIDTH,
  UiActionKind,
  UiFocus,
  WAIT_HIDDEN,
  WAIT_VISIBLE,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { CheckResult, StepResult, UiRun, UiScenario, UiStep } from "@platform/types";
import { all } from "@platform/util";
import type { Browser, BrowserContext, Page } from "playwright-core";
import { closeBrowser, launchBrowser } from "./browser.ts";
import { startStack } from "./stack.ts";

export class UiScenarioFailure extends Error {}

export class UiHandles {
  stack?: Awaited<ReturnType<typeof startStack>>;
  browser?: Browser;
  context?: BrowserContext;
}

async function perform(
  page: Page,
  step: UiStep,
  stack: Awaited<ReturnType<typeof startStack>>,
): Promise<unknown> {
  const target = step.target ?? Text.Empty;
  const [method = Text.Empty, path = Text.Empty] = target.split(API_CALL_SEPARATOR);
  const actions: Record<UiActionKind, () => Promise<unknown>> = {
    [UiActionKind.Goto]: () => page.goto(stack.consoleOrigin, { waitUntil: NETWORK_IDLE }),
    [UiActionKind.Click]: () => page.getByText(target, { exact: true }).click(),
    [UiActionKind.Fill]: () => page.getByLabel(target).fill(step.value ?? Text.Empty),
    [UiActionKind.Api]: () => stack.call(method, path),
    [UiActionKind.Reload]: () => page.reload({ waitUntil: NETWORK_IDLE }),
    [UiActionKind.Look]: async () => undefined,
  };
  return actions[step.kind]();
}

async function visibleCheck(page: Page, text: string): Promise<CheckResult> {
  const passed = await page
    .getByText(text)
    .first()
    .waitFor({ state: WAIT_VISIBLE, timeout: UI_STEP_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  return { kind: CheckKind.Visible, label: message(MessageId.CheckVisible, { text }), passed };
}

async function hiddenCheck(page: Page, text: string): Promise<CheckResult> {
  const passed = await page
    .getByText(text)
    .first()
    .waitFor({ state: WAIT_HIDDEN, timeout: UI_STEP_TIMEOUT_MS })
    .then(() => true)
    .catch(() => false);
  return { kind: CheckKind.Hidden, label: message(MessageId.CheckHidden, { text }), passed };
}

function requestCheck(fragment: string, requests: readonly string[]): CheckResult {
  const passed = !requests.some((url) => url.includes(fragment));
  return {
    kind: CheckKind.ForbiddenRequest,
    label: message(MessageId.CheckForbiddenRequest, { fragment }),
    passed,
  };
}

async function storageChecks(page: Page, step: UiStep): Promise<CheckResult[]> {
  if (!step.expectNoTokenInStorage) {
    return [];
  }
  const stored = String(await page.evaluate(STORAGE_SCRIPT));
  const label = message(MessageId.CheckTokenStorage);
  return [{ kind: CheckKind.TokenStorage, label, passed: !JWT_PATTERN.test(stored) }];
}

function pageErrorChecks(errors: readonly string[]): CheckResult[] {
  const failed = errors.map((error) => ({
    kind: CheckKind.PageError,
    label: message(MessageId.UiDetailPageError, { error }),
    passed: false,
  }));
  const clean = {
    kind: CheckKind.PageError,
    label: message(MessageId.CheckNoPageError),
    passed: true,
  };
  return errors.length === 0 ? [clean] : failed;
}

async function checksAfter(
  page: Page,
  step: UiStep,
  requests: readonly string[],
  errors: readonly string[],
): Promise<CheckResult[]> {
  const visible = await all(step.expectVisible.map((text) => async () => visibleCheck(page, text)));
  const hidden = await all(step.expectHidden.map((text) => async () => hiddenCheck(page, text)));
  const forbidden = step.forbidRequests.map((fragment) => requestCheck(fragment, requests));
  return [
    ...visible,
    ...hidden,
    ...forbidden,
    ...(await storageChecks(page, step)),
    ...pageErrorChecks(errors),
  ];
}

async function focusShot(page: Page, step: UiStep): Promise<Uint8Array> {
  const wanted = page.locator(step.focus ?? UiFocus.Root).first();
  const target = (await wanted.count()) > 0 ? wanted : page.locator(UiFocus.Root).first();
  return target.screenshot();
}

function evidenceOf(page: Page, step: UiStep) {
  const [method = Text.Empty, path = Text.Empty] = (step.target ?? Text.Empty).split(
    API_CALL_SEPARATOR,
  );
  const url = new URL(page.url());
  return step.kind === UiActionKind.Api
    ? { method, path, authorized: true }
    : { pagePath: [url.pathname, url.hash].join(Text.Empty) };
}

function watch(page: Page, errors: string[], requests: string[]): void {
  page.on(EVENT_PAGE_ERROR, (error) => errors.push(error.message));
  page.on(EVENT_REQUEST, (request) => requests.push(request.url()));
  page.on(EVENT_REQUEST_FAILED, (failed) => {
    const reason = failed.failure()?.errorText ?? Text.Empty;
    if (!reason.includes(IGNORED_FAILURE)) {
      errors.push([failed.url(), reason].join(Glyph.Space));
    }
  });
}

export function assertUiPassed(scenario: UiScenario, results: readonly StepResult[]): void {
  const failed = results.find((result) => result.flag === StepFlag.Failed);
  if (failed !== undefined) {
    const detail = failed.checks
      .filter((check) => !check.passed)
      .map((check) => check.label)
      .join(DETAIL_SEPARATOR);
    throw new UiScenarioFailure(
      message(MessageId.UiScenarioFailed, { id: scenario.id, step: failed.description, detail }),
    );
  }
}

async function runSteps(
  scenario: UiScenario,
  page: Page,
  stack: Awaited<ReturnType<typeof startStack>>,
  outDir: string,
): Promise<UiRun> {
  const errors: string[] = [];
  const requests: string[] = [];
  watch(page, errors, requests);
  const run: UiRun = { results: [], files: {} };
  for (const [index, step] of scenario.steps.entries()) {
    await perform(page, step, stack);
    const checks = await checksAfter(page, step, requests, errors);
    await page.waitForTimeout(UI_SETTLE_MS);
    const file = [scenario.id, index + 1].join(Glyph.Minus).concat(SHOT_EXTENSION);
    run.files[join(outDir, file)] = new Uint8Array(await focusShot(page, step));
    const flag = checks.every((check) => check.passed) ? StepFlag.Passed : StepFlag.Failed;
    const screenshot = [SHOT_FOLDER_URL, file].join(Separator.Resource);
    run.results.push({
      source: StepSource.Console,
      description: step.description,
      flag,
      place: step.place,
      action: step.action,
      expectation: step.expected,
      checks,
      evidence: { screenshot, ...evidenceOf(page, step) },
    });
    if (flag === StepFlag.Failed) {
      break;
    }
  }
  return run;
}

export async function releaseHandles(held: UiHandles): Promise<void> {
  await held.stack?.stop().catch(() => undefined);
  await Promise.race([
    held.context?.close().catch(() => undefined),
    Bun.sleep(UI_CLOSE_TIMEOUT_MS),
  ]);
  await Promise.race([
    held.browser?.close().catch(() => undefined),
    Bun.sleep(UI_CLOSE_TIMEOUT_MS),
  ]);
}

export async function runUiScenario(
  scenario: UiScenario,
  consoleDist: string,
  outDir: string,
  seed: (stack: Awaited<ReturnType<typeof startStack>>) => Promise<void>,
  held: UiHandles = new UiHandles(),
  connect: typeof startStack = startStack,
): Promise<UiRun> {
  const stack = await connect(scenario.scopes, consoleDist);
  held.stack = stack;
  const browser = await launchBrowser();
  held.browser = browser;
  const context = await browser.newContext({
    viewport: { width: UI_VIEWPORT_WIDTH, height: UI_VIEWPORT_HEIGHT },
  });
  held.context = context;
  try {
    const page = await context.newPage();
    page.setDefaultTimeout(UI_STEP_TIMEOUT_MS);
    page.setDefaultNavigationTimeout(UI_STEP_TIMEOUT_MS);
    await seed(stack);
    return await runSteps(scenario, page, stack, outDir);
  } finally {
    await stack.stop();
    await Promise.race([context.close(), Bun.sleep(UI_CLOSE_TIMEOUT_MS)]);
    await closeBrowser(browser);
  }
}
