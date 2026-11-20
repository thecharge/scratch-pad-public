import { positive, rejected, unit } from "@platform/test-factories";
import { networkReady } from "../../packages/scenarios/src/network-ready.ts";

const READY = "fe8000000000000010f4fdfffe8eb8da 02 40 20 80 eth0";
const TENTATIVE = "fe8000000000000010f4fdfffe8eb8da 02 40 20 c0 eth0";

unit(networkReady, {
  positive: [
    positive("an assigned address is ready", [READY], true),
    positive("a namespace without IPv6 addresses is ready", [""], true),
  ],
  negative: [
    rejected("an address under duplicate detection is not ready", [TENTATIVE], false),
    rejected(
      "one pending address keeps a mixed namespace unready",
      [`${READY}\n${TENTATIVE}`],
      false,
    ),
  ],
});
