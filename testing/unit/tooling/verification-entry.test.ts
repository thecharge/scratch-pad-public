import { mock } from "bun:test";
import { TestTier } from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import {
  FAST_SHIP_ENV,
  FAST_SHIP_INTEGRATION_CONCURRENCY,
  FAST_SHIP_REST_FLAG,
  FAST_SHIP_SCAN_FLAG,
  FAST_SHIP_TEST_CONCURRENCY,
  FAST_SHIP_TEST_FLAG,
} from "../../../packages/constants/src/fast-shipping.ts";
import { VERIFICATION_PUSH_ENV } from "../../../packages/constants/src/verification-push.ts";
import { launchShippingCommand } from "../../../tooling/scripts/fast-shipping.ts";
import { runTierEntry } from "../../../tooling/scripts/run-tier.ts";
import { parsePushUpdates } from "../../../tooling/scripts/verification-push.ts";
import { verificationEntry } from "../../../tooling/scripts/verify.ts";

const success = mock(() => ({ exited: Promise.resolve(0) }));
const failure = mock(() => ({ exited: Promise.resolve(7) }));
const crashed = mock(() => ({ exited: Promise.reject(new Error("fixture process failure")) }));

unit(launchShippingCommand, {
  positive: [
    positive("preserves a successful exit", [["fixture"], success as never], 0),
    positive(
      "forwards command arguments without a shell",
      [["fixture", "literal argument"], success as never],
      seen(
        async (code: number) => [code, success.mock.calls.at(-1)],
        [
          0,
          [
            ["fixture", "literal argument"],
            { cwd: process.cwd(), stdout: "inherit", stderr: "inherit" },
          ],
        ],
      ),
    ),
  ],
  negative: [
    rejected("preserves a failed check exit", [["fixture"], failure as never], 7),
    negative("a process failure rejects", [["fixture"], crashed as never], {
      message: "fixture process failure",
    }),
  ],
});

const tier = mock(async () => 0);
const tierFailure = mock(async () => 9);
const tierCrash = mock(async () => {
  throw new Error("fixture tier failure");
});
const tierArguments = async (code: number) => [code, tier.mock.calls.at(-1)];
const normalArguments = [[TestTier.Unit], undefined, undefined, undefined, undefined, 1, undefined];
const fastArguments = [
  [TestTier.Integration],
  undefined,
  undefined,
  undefined,
  undefined,
  FAST_SHIP_INTEGRATION_CONCURRENCY,
  undefined,
];

unit(runTierEntry, {
  positive: [
    positive(
      "scanner invocation forwards its partition",
      [[TestTier.Unit, FAST_SHIP_TEST_FLAG, FAST_SHIP_SCAN_FLAG], tier],
      seen(tierArguments, [
        0,
        [
          [TestTier.Unit],
          undefined,
          undefined,
          undefined,
          undefined,
          FAST_SHIP_TEST_CONCURRENCY,
          true,
        ],
      ]),
    ),
    positive(
      "remaining invocation forwards its partition",
      [[TestTier.Unit, FAST_SHIP_TEST_FLAG, FAST_SHIP_REST_FLAG], tier],
      seen(tierArguments, [
        0,
        [
          [TestTier.Unit],
          undefined,
          undefined,
          undefined,
          undefined,
          FAST_SHIP_TEST_CONCURRENCY,
          false,
        ],
      ]),
    ),
    positive(
      "fast integration flag order preserves its worker count",
      [[FAST_SHIP_TEST_FLAG, TestTier.Integration], tier],
      seen(tierArguments, [0, fastArguments]),
    ),
    positive(
      "normal integration remains serial",
      [[TestTier.Integration], tier],
      seen(tierArguments, [
        0,
        [[TestTier.Integration], undefined, undefined, undefined, undefined, 1, undefined],
      ]),
    ),
    positive(
      "fast units retain four workers",
      [[TestTier.Unit, FAST_SHIP_TEST_FLAG], tier],
      seen(tierArguments, [
        0,
        [
          [TestTier.Unit],
          undefined,
          undefined,
          undefined,
          undefined,
          FAST_SHIP_TEST_CONCURRENCY,
          undefined,
        ],
      ]),
    ),
    positive(
      "mixed fast tiers retain the unit worker limit",
      [[TestTier.Unit, TestTier.Integration, FAST_SHIP_TEST_FLAG], tier],
      seen(tierArguments, [
        0,
        [
          [TestTier.Unit, TestTier.Integration],
          undefined,
          undefined,
          undefined,
          undefined,
          FAST_SHIP_TEST_CONCURRENCY,
          undefined,
        ],
      ]),
    ),
    positive(
      "normal invocation stays serial",
      [[TestTier.Unit], tier],
      seen(tierArguments, [0, normalArguments]),
    ),
    positive(
      "fast invocation removes its flag and selects bounded concurrency",
      [[TestTier.Integration, FAST_SHIP_TEST_FLAG], tier],
      seen(tierArguments, [0, fastArguments]),
    ),
  ],
  negative: [
    rejected("a test failure remains blocking", [[TestTier.Unit], tierFailure], 9),
    negative("a crashed test runner rejects", [[TestTier.Unit], tierCrash], {
      message: "fixture tier failure",
    }),
  ],
});

const base = "a".repeat(40);
const head = "b".repeat(40);
const update = `refs/heads/main ${head} refs/heads/main ${base}\n`;
const full = mock(async () => 0);
const fast = mock(async () => 0);
const failedFull = mock(async () => 3);
const failedFast = mock(async () => 4);
const record = mock(async (input: string) => parsePushUpdates(input));
const noDocuments = mock(async () => undefined);
const pushEnvironment = { [VERIFICATION_PUSH_ENV]: "1" };
const fastEnvironment = { [FAST_SHIP_ENV]: "1", ...pushEnvironment };
const fullResult = async (code: number) => [code, full.mock.calls.at(-1)];
const recorded = await parsePushUpdates(update);
const expectedFull = [undefined, undefined, undefined, recorded];
const fastResult = async (code: number) => [code, record.mock.calls.at(-1), fast.mock.calls.length];

unit(verificationEntry, {
  positive: [
    positive(
      "full push receives the actual proposed update",
      [pushEnvironment, update, full, fast, record, noDocuments],
      seen(fullResult, [0, expectedFull]),
    ),
    positive(
      "fast push records the proposed update before verification",
      [fastEnvironment, update, full, fast, record, noDocuments],
      seen(fastResult, [0, [update], 1]),
    ),
    positive(
      "direct verification requires no stdin or push metadata",
      [{}, undefined, full, fast, record, noDocuments],
      seen(fullResult, [0, [undefined, undefined, undefined, undefined]]),
    ),
  ],
  negative: [
    rejected(
      "a full verification failure blocks",
      [{}, undefined, failedFull, fast, record, noDocuments],
      3,
    ),
    rejected(
      "a fast verification failure blocks",
      [{ [FAST_SHIP_ENV]: "1" }, undefined, full, failedFast, record, noDocuments],
      4,
    ),
  ],
});

const documentPass = mock(async () => 0);
const documentFail = mock(async () => 1);
unit(verificationEntry, {
  positive: [
    positive(
      "document push selects fresh document checks",
      [pushEnvironment, update, failedFull, failedFast, record, documentPass],
      0,
    ),
    positive(
      "document selection also precedes requested source fast lane",
      [fastEnvironment, update, failedFull, failedFast, record, documentPass],
      0,
    ),
  ],
  negative: [
    rejected(
      "failed document checks block a normal push",
      [pushEnvironment, update, full, fast, record, documentFail],
      1,
    ),
    rejected(
      "failed document checks cannot fall through to passing fast checks",
      [fastEnvironment, update, full, fast, record, documentFail],
      1,
    ),
  ],
});
