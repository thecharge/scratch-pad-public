import { join } from "node:path";
import { LOOPBACK_ORIGIN } from "@platform/config/urls";
import {
  AppEnvironment,
  ASTRO_BUILD_ARGS,
  DETAIL_SEPARATOR,
  DIAGRAM_SELECTOR,
  DIAGRAM_SVG_SELECTOR,
  DOCS_BROWSE_LABEL,
  DOCS_E2E_SHOT_PATH,
  DOCS_FOCUS_SELECTORS,
  DOCS_PAGE_GLOB,
  DOCS_ROOT_PAGE,
  DOCS_SEARCH_BUTTON,
  DOCS_SEARCH_DIALOG,
  DOCS_SEARCH_INPUT,
  DOCS_SKIPPED_PAGES,
  EVENT_PAGE_ERROR,
  EVENT_REQUEST_FAILED,
  Glyph,
  HEADING_SELECTOR,
  IGNORED_FAILURE,
  IMAGE_SELECTOR,
  IMAGES_BLANK_SCRIPT,
  IMAGES_BROKEN_SCRIPT,
  IMAGES_EAGER_SCRIPT,
  INDEX_FILE,
  LOAD_STATE_SETTLE_MS,
  MessageId,
  NETWORK_IDLE,
  NODE_ENV_NAME,
  PathSegment,
  RepoPath,
  Runner,
  SEARCH_RESULTS_FOR,
  SEARCH_TERM,
  Separator,
  SHOT_EXTENSION,
  StdioMode,
  Text,
  UI_RECORDING_TIMEOUT_MS,
  UI_STEP_TIMEOUT_MS,
  UI_VIEWPORT_HEIGHT,
  UI_VIEWPORT_WIDTH,
  WAIT_VISIBLE,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { DocsPageResult } from "@platform/types";
import { all } from "@platform/util";
import type { Page } from "playwright-core";
import { withDeadline } from "../deadline.ts";
import { REPO_ROOT } from "../repo.ts";
import { closeBrowser, launchBrowser } from "./browser.ts";
import { withUiLock } from "./lock.ts";
import { PORTS } from "./ports.ts";
import { staticServer } from "./stack.ts";

export class DocsE2eFailure extends Error {}

function slugOf(path: string): string {
  const slug = path
    .split(Separator.Resource)
    .filter((part) => part.length > 0)
    .join(Glyph.Minus);
  return slug.length === 0 ? PathSegment.Home : slug;
}

async function pageProblems(
  page: Page,
  expectedDiagrams: number,
  errors: string[],
): Promise<string[]> {
  await page.evaluate(IMAGES_EAGER_SCRIPT);
  const heading = (await page.locator(HEADING_SELECTOR).first().textContent()) ?? Text.Empty;
  const broken = Number(await page.evaluate(IMAGES_BROKEN_SCRIPT));
  const blank = Number(await page.evaluate(IMAGES_BLANK_SCRIPT));
  const drawn = await page.locator(DIAGRAM_SVG_SELECTOR).count();
  return [
    ...(heading.trim().length === 0 ? [message(MessageId.DocsE2eNoHeading)] : []),
    ...(broken > 0 ? [message(MessageId.DocsE2eImage, { count: broken })] : []),
    ...(blank > 0 ? [message(MessageId.DocsE2eBlank, { count: blank })] : []),
    ...(drawn < expectedDiagrams
      ? [message(MessageId.DocsE2eDiagram, { drawn, expected: expectedDiagrams })]
      : []),
    ...(errors.length > 0
      ? [message(MessageId.DocsE2eError, { count: errors.length, first: errors[0] ?? Text.Empty })]
      : []),
  ];
}

async function focusShot(page: Page, path: string): Promise<void> {
  const counts = await all(
    DOCS_FOCUS_SELECTORS.map((selector) => async () => page.locator(selector).count()),
  );
  const index = counts.findIndex((count) => count > 0);
  const selector = DOCS_FOCUS_SELECTORS[index];
  await (index < 0 || selector === undefined
    ? page.screenshot({ path })
    : page.locator(selector).first().screenshot({ path }));
}

async function checkPage(
  page: Page,
  origin: string,
  path: string,
  shotsDir: string,
): Promise<DocsPageResult> {
  const errors: string[] = [];
  page.removeAllListeners(EVENT_PAGE_ERROR);
  page.removeAllListeners(EVENT_REQUEST_FAILED);
  page.on(EVENT_PAGE_ERROR, (error) => errors.push(error.message));
  page.on(EVENT_REQUEST_FAILED, (failed) => {
    if (!(failed.failure()?.errorText ?? Text.Empty).includes(IGNORED_FAILURE)) {
      errors.push(failed.url());
    }
  });
  await page.goto([origin, path].join(Text.Empty), { waitUntil: NETWORK_IDLE });
  const expected = await page.locator(DIAGRAM_SELECTOR).count();
  await page
    .locator(DIAGRAM_SVG_SELECTOR)
    .first()
    .waitFor({
      state: WAIT_VISIBLE,
      timeout: expected > 0 ? UI_STEP_TIMEOUT_MS : LOAD_STATE_SETTLE_MS,
    })
    .catch(() => undefined);
  const problems = await pageProblems(page, expected, errors);
  if (problems.length > 0) {
    throw new DocsE2eFailure(
      message(MessageId.DocsE2eFailed, { path, detail: problems.join(DETAIL_SEPARATOR) }),
    );
  }
  const file = [slugOf(path), SHOT_EXTENSION].join(Text.Empty);
  await focusShot(page, join(shotsDir, file));
  return {
    path,
    title: ((await page.locator(HEADING_SELECTOR).first().textContent()) ?? Text.Empty).trim(),
    diagrams: expected,
    images: await page.locator(IMAGE_SELECTOR).count(),
    screenshot: [DOCS_E2E_SHOT_PATH, file].join(Separator.Resource),
  };
}

async function searchFinds(page: Page, origin: string): Promise<void> {
  await page.goto([origin, DOCS_ROOT_PAGE].join(Text.Empty), { waitUntil: NETWORK_IDLE });
  await page.locator(DOCS_SEARCH_BUTTON).first().click();
  await page.locator(DOCS_SEARCH_INPUT).first().fill(SEARCH_TERM);
  await page
    .locator(DOCS_SEARCH_DIALOG)
    .getByText(new RegExp(`${SEARCH_RESULTS_FOR}${SEARCH_TERM}`))
    .first()
    .waitFor({ state: WAIT_VISIBLE, timeout: UI_STEP_TIMEOUT_MS })
    .catch(() => {
      throw new DocsE2eFailure(message(MessageId.DocsE2eSearch, { term: SEARCH_TERM }));
    });
}

export async function pathsOf(distDir: string): Promise<string[]> {
  const found = await Array.fromAsync(new Bun.Glob(DOCS_PAGE_GLOB).scan({ cwd: distDir }));
  return found
    .map((file) => [Separator.Resource, file.replace(/index\.html$/, Text.Empty)].join(Text.Empty))
    .filter((path) => !DOCS_SKIPPED_PAGES.some((skipped) => path.includes(skipped)))
    .sort();
}

async function browseDocs(distDir: string, shotsDir: string): Promise<DocsPageResult[]> {
  const server = staticServer(distDir, PORTS.docs);
  const browser = await launchBrowser();
  const origin = [LOOPBACK_ORIGIN, Glyph.Colon, PORTS.docs].join(Text.Empty);
  try {
    const page = await browser.newPage({
      viewport: { width: UI_VIEWPORT_WIDTH, height: UI_VIEWPORT_HEIGHT },
    });
    const results: DocsPageResult[] = [];
    for (const path of await pathsOf(distDir)) {
      results.push(await checkPage(page, origin, path, shotsDir));
    }
    await searchFinds(page, origin);
    return results;
  } finally {
    await closeBrowser(browser);
    await server.stop(true);
  }
}

export async function ensureDocsDist(distDir: string): Promise<void> {
  if (await Bun.file(join(distDir, INDEX_FILE)).exists()) {
    return;
  }
  const build = Bun.spawn([Runner.Bunx, ...ASTRO_BUILD_ARGS], {
    cwd: join(REPO_ROOT, RepoPath.DocsApp),
    env: { ...Bun.env, [NODE_ENV_NAME]: AppEnvironment.Production },
    stdout: StdioMode.Ignore,
    stderr: StdioMode.Ignore,
  });
  if ((await build.exited) !== 0) {
    throw new DocsE2eFailure(message(MessageId.DocsDistFailed));
  }
}

export async function runDocsE2e(distDir: string, shotsDir: string): Promise<DocsPageResult[]> {
  await ensureDocsDist(distDir);
  return withUiLock(() =>
    withDeadline(browseDocs(distDir, shotsDir), DOCS_BROWSE_LABEL, UI_RECORDING_TIMEOUT_MS),
  );
}

export function docsReport(results: readonly DocsPageResult[]): string {
  const rows = results
    .map((result) =>
      message(MessageId.DocsE2eRow, {
        title: result.title,
        path: result.path,
        diagrams: result.diagrams,
        images: result.images,
        shot: result.screenshot,
      }),
    )
    .join(Text.Empty);
  return message(MessageId.DocsE2eReport, { count: results.length, rows });
}
