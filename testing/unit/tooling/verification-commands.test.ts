import { positive, rejected, unit } from "@platform/test-factories";
import { verificationCommands } from "../../../tooling/scripts/verify.ts";

const source = ["bunx", "--no-install", "biome", "ci", "."];
const wrapped = ["bun", "run", "apps/infra/src/runner.ts", ...source];
const tier = ["bun", "run", "tooling/scripts/run-tier.ts", "e2e"];
const coverage = ["bun", "run", "tooling/scripts/run-coverage.ts", "unit", "integration"];

unit(verificationCommands, {
  positive: [
    positive("lint runs in the shared container", [{ biome: source }], { biome: wrapped }),
    positive("other checks use the same boundary", [{ typecheck: source }], { typecheck: wrapped }),
  ],
  negative: [
    rejected("end-to-end lifecycle cannot escape the container boundary", [{ e2e: tier }], {
      e2e: ["bun", "run", "apps/infra/src/runner.ts", ...tier],
    }),
    rejected("coverage has no host execution exception", [{ coverage }], {
      coverage: ["bun", "run", "apps/infra/src/runner.ts", ...coverage],
    }),
  ],
});
