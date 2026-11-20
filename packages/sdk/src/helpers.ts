import {
  CanonicalCode,
  SDK_DEFAULT_WAIT_INTERVAL_MS,
  SDK_DEFAULT_WAIT_TIMEOUT_MS,
  Text,
} from "@platform/constants";
import type { Operation, SdkPage, WaitOptions } from "@platform/types";
import { ApiClientError } from "./error.ts";

export async function* paginate<T>(
  fetchPage: (pageToken: string | undefined) => Promise<SdkPage<T>>,
): AsyncGenerator<T> {
  let token: string | undefined;
  do {
    const page = await fetchPage(token);
    yield* page.items;
    token = page.nextPageToken === Text.Empty ? undefined : page.nextPageToken;
  } while (token !== undefined);
}

async function pause(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function waitForOperation(
  read: () => Promise<Operation>,
  options: Partial<WaitOptions> = {},
): Promise<Operation> {
  const interval = options.intervalMs ?? SDK_DEFAULT_WAIT_INTERVAL_MS;
  const deadline = Date.now() + (options.timeoutMs ?? SDK_DEFAULT_WAIT_TIMEOUT_MS);
  let operation = await read();
  while (!operation.done && Date.now() < deadline) {
    await pause(interval);
    operation = await read();
  }
  if (!operation.done) {
    throw new ApiClientError(CanonicalCode.DeadlineExceeded, operation.name);
  }
  return operation;
}
