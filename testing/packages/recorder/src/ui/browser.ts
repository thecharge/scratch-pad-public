import {
  CHROME_ARGS,
  CHROME_CANDIDATES,
  MessageId,
  UI_CLOSE_TIMEOUT_MS,
} from "@platform/constants";
import { message } from "@platform/messages";
import { all } from "@platform/util";
import { type Browser, chromium } from "playwright-core";

export async function findChrome(): Promise<string> {
  const present = await all(CHROME_CANDIDATES.map((path) => async () => Bun.file(path).exists()));
  const found = CHROME_CANDIDATES.find((_path, index) => present[index]);
  if (found === undefined) {
    throw new Error(message(MessageId.BrowserMissing));
  }
  return found;
}

export async function launchBrowser() {
  return chromium.launch({ executablePath: await findChrome(), args: [...CHROME_ARGS] });
}

export async function closeBrowser(browser: Browser): Promise<void> {
  await Promise.race([browser.close(), Bun.sleep(UI_CLOSE_TIMEOUT_MS)]);
}
