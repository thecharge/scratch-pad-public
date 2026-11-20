import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pid } from "node:process";
import {
  FS_EXISTS_CODE,
  MessageId,
  NO_PROCESS_SIGNAL,
  UI_LOCK_NAME,
  UI_LOCK_OWNER_FILE,
  UI_LOCK_POLL_MS,
  UI_LOCK_WAIT_MS,
  UTF8,
} from "@platform/constants";
import { message } from "@platform/messages";

const MS_PER_SECOND = 1000;

export class UiLockTimeout extends Error {}

async function alive(owner: number): Promise<boolean> {
  try {
    process.kill(owner, NO_PROCESS_SIGNAL);
    return true;
  } catch {
    return false;
  }
}

async function ownerOf(directory: string): Promise<number | undefined> {
  const text = await readFile(join(directory, UI_LOCK_OWNER_FILE), UTF8).catch(() => undefined);
  const parsed = Number(text);
  return text === undefined || Number.isNaN(parsed) ? undefined : parsed;
}

async function tryAcquire(directory: string): Promise<boolean> {
  try {
    await mkdir(directory);
    await writeFile(join(directory, UI_LOCK_OWNER_FILE), String(pid));
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== FS_EXISTS_CODE) {
      throw error;
    }
    return false;
  }
}

async function releaseIfAbandoned(directory: string): Promise<void> {
  const owner = await ownerOf(directory);
  if (owner !== undefined && !(await alive(owner))) {
    await rm(directory, { recursive: true, force: true });
  }
}

async function acquire(directory: string, limitMs: number): Promise<void> {
  const deadline = Date.now() + limitMs;
  let held = await tryAcquire(directory);
  while (!held) {
    if (Date.now() > deadline) {
      throw new UiLockTimeout(
        message(MessageId.UiLockTimeout, { seconds: limitMs / MS_PER_SECOND }),
      );
    }
    await releaseIfAbandoned(directory);
    await Bun.sleep(UI_LOCK_POLL_MS);
    held = await tryAcquire(directory);
  }
}

export async function withUiLock<T>(
  work: () => Promise<T>,
  limitMs: number = UI_LOCK_WAIT_MS,
  name: string = UI_LOCK_NAME,
): Promise<T> {
  const directory = join(tmpdir(), name);
  await acquire(directory, limitMs);
  try {
    return await work();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
