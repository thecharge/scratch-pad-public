import { negative, positive, unit } from "@platform/test-factories";
import { percentileMs } from "../../../packages/events/src/percentile.ts";

const EMPTY = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const SPREAD = [90, 0, 0, 0, 0, 0, 0, 9, 1, 0, 0, 0, 0];
const OVERFLOW = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5];

unit(percentileMs, {
  positive: [
    positive("the median of mostly fast samples is the first bound", [SPREAD, 0.5], 1),
    positive("the 95th percentile lands in the bucket that holds it", [SPREAD, 0.95], 250),
    positive("a sample above every bound reports the last bound", [OVERFLOW, 0.99], 5000),
    positive("no samples report zero", [EMPTY, 0.95], 0),
  ],
  negative: [
    negative("needs the buckets", [undefined, 0.5], { name: "TypeError" }),
    negative("needs a list it can add up", [{}, 0.5], { name: "TypeError" }),
  ],
});
