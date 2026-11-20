import { mock } from "bun:test";
import type { watch } from "node:fs";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { checkWatchers } from "../../../apps/infra/src/watchers.ts";

const closed = mock(() => undefined);
const otherClosed = mock(() => undefined);
const partialClosed = mock(() => undefined);
const available = mock(() => ({ close: closed })) as unknown as typeof watch;
const otherOpen = mock((_path: unknown, _options: unknown) => ({ close: otherClosed }));
const otherAvailable = otherOpen as unknown as typeof watch;
const options = { recursive: true };
const expectedCalls = [
  ["/other/apps/api/src", options],
  ["/other/packages", options],
];
const exhausted = mock(() => {
  throw new Error("ENOSPC: inotify watcher limit reached");
}) as unknown as typeof watch;
const partlyExhausted = mock(() => {
  throw new Error("EINVAL: watcher unavailable");
}).mockReturnValueOnce({ close: partialClosed } as never) as unknown as typeof watch;

unit(checkWatchers, {
  positive: [
    positive(
      "both recursive watches are released after the probe",
      ["/repo", available],
      seen(async (exitCode: number) => ({ exitCode, closed: closed.mock.calls.length }), {
        exitCode: 0,
        closed: 2,
      }),
    ),
    positive(
      "a selected repository can allocate watches",
      ["/other", otherAvailable],
      seen(async (exitCode: number) => ({ exitCode, calls: otherOpen.mock.calls }), {
        exitCode: 0,
        calls: expectedCalls,
      }),
    ),
  ],
  negative: [
    rejected("an exhausted watcher budget blocks development", ["/repo", exhausted], 1),
    rejected(
      "a later failure releases earlier watches",
      ["/repo", partlyExhausted],
      seen(async (exitCode: number) => ({ exitCode, closed: partialClosed.mock.calls.length }), {
        exitCode: 1,
        closed: 1,
      }),
    ),
  ],
});
