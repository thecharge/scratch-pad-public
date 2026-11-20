import { MessageId, TIMEOUT_ERROR_NAME } from "@platform/constants";
import { message } from "@platform/messages";

const MS_PER_SECOND = 1000;

export class DeadlineExceeded extends Error {}

export async function withDeadline<T>(
  work: Promise<T>,
  what: string,
  limitMs: number,
  onExpire?: () => Promise<void>,
): Promise<T> {
  let handle: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_resolve, reject) => {
    handle = setTimeout(async () => {
      await onExpire?.().catch(() => undefined);
      reject(
        new DeadlineExceeded(
          message(MessageId.DeadlineExceeded, { what, seconds: limitMs / MS_PER_SECOND }),
        ),
      );
    }, limitMs);
  });
  try {
    return await Promise.race([work, expiry]);
  } finally {
    clearTimeout(handle);
  }
}

export async function retryOnDeadline<T>(attempt: () => Promise<T>, attempts: number): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    const timedOut =
      error instanceof DeadlineExceeded || (error as Error).name === TIMEOUT_ERROR_NAME;
    if (!timedOut || attempts <= 1) {
      throw error;
    }
    return retryOnDeadline(attempt, attempts - 1);
  }
}
