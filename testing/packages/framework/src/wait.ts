const POLL_MS = 2;
const DEFAULT_DEADLINE_MS = 3000;

export async function waitUntil(
  check: () => boolean | Promise<boolean>,
  deadlineMs: number = DEFAULT_DEADLINE_MS,
): Promise<void> {
  const limit = Date.now() + deadlineMs;
  let done = await check();
  while (!done && Date.now() < limit) {
    await Bun.sleep(POLL_MS);
    done = await check();
  }
  if (!done) {
    throw new Error(`condition not met within ${deadlineMs} ms`);
  }
}
