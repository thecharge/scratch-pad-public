export const FAST_SHIP_ENV = "PLATFORM_FAST_SHIP";
export const FAST_SHIP_EXCLUDED: readonly string[] = ["e2e", "kb", "coverage"];
export const FAST_SHIP_SERIAL: readonly string[] = ["sdk", "sdk-pack", "unit-scans"];
export const FAST_SHIP_EARLY: readonly string[] = ["dprint"];
export const FAST_SHIP_UNIT = "unit";
export const FAST_SHIP_INTEGRATION = "integration";
export const FAST_SHIP_UNIT_COMMAND = ["bun", "run", "test:unit", "--fast", "--fast-rest"] as const;
export const FAST_SHIP_INTEGRATION_COMMAND = ["bun", "run", "test:integration", "--fast"] as const;
export const FAST_SHIP_REPORT = "fast-shipping.json";
export const FAST_SHIP_BUDGET_SECONDS = 55;
export const FAST_SHIP_BANNER =
  "Fast source shipment: blocking static checks, all unit tests and all integration tests. Full E2E, coverage and documentation remain in bun run verify.";
export const FAST_SHIP_TIMING = "Fast shipment verification seconds:";
export const FAST_SHIP_CONCURRENCY = 4;
export const FAST_SHIP_TEST_FLAG = "--fast";
export const FAST_SHIP_TEST_CONCURRENCY = 4;
export const FAST_SHIP_INTEGRATION_CONCURRENCY = 6;
export const FAST_SHIP_FINAL = "untracked";
export const FAST_SHIP_SHARD_PREFIX = "testing/unit/tooling/";
export const FAST_SHIP_SDK_UNITS: readonly string[] = [
  "testing/unit/tooling/units-script-runs-b.test.ts",
  "testing/unit/tooling/units-recorders.test.ts",
];
export const FAST_SHIP_TOOLING_GROUPS = 2;

export const FAST_SHIP_SCAN_UNITS: readonly string[] = [
  "testing/unit/tooling/units-check-runs.test.ts",
  "testing/unit/tooling/units-check-runs-more.test.ts",
];

export const FAST_SHIP_SCAN_STEP = "unit-scans";
export const FAST_SHIP_SCAN_FLAG = "--fast-scans";
export const FAST_SHIP_REST_FLAG = "--fast-rest";
export const FAST_SHIP_SCAN_COMMAND = [
  "bun",
  "run",
  "test:unit",
  "--fast",
  "--fast-scans",
] as const;
