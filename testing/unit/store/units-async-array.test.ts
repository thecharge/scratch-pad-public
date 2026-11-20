import {
  everyAsync,
  filterAsync,
  findAsync,
  flatMapAsync,
  reduceAsync,
  someAsync,
} from "@platform/store";
import { negative, positive, unit } from "@platform/test-factories";

const NUMBERS = [1, 2, 3, 4];
const FAILURE = new Error("predicate failed");
const isEven = async (item: number) => item % 2 === 0;
const isAbove = async (item: number) => item > 10;
const isNegative = async (item: number) => item < 0;
const broken = async (): Promise<boolean> => {
  throw FAILURE;
};
const brokenStep = async (): Promise<number> => {
  throw FAILURE;
};
const FAILED = { message: "predicate failed" };

unit(filterAsync, {
  positive: [
    positive("keeps the items the predicate accepts", [NUMBERS, isEven], [2, 4]),
    positive("keeps nothing when the predicate rejects all", [NUMBERS, isAbove], []),
  ],
  negative: [
    negative("a rejecting predicate rejects the call", [NUMBERS, broken], FAILED),
    negative("a rejecting predicate rejects even for one item", [[1], broken], FAILED),
  ],
});

unit(flatMapAsync, {
  positive: [
    positive(
      "joins what each item expands to",
      [NUMBERS, async (item: number) => [item, item]],
      [1, 1, 2, 2, 3, 3, 4, 4],
    ),
    positive("an empty list gives an empty list", [[], async (item: number) => [item]], []),
  ],
  negative: [
    negative("a rejecting expansion rejects the call", [NUMBERS, brokenStep], FAILED),
    negative("a rejecting expansion rejects for one item", [[1], brokenStep], FAILED),
  ],
});

unit(someAsync, {
  positive: [
    positive("true when one item passes", [NUMBERS, isEven], true),
    positive("false when none passes", [NUMBERS, isAbove], false),
  ],
  negative: [
    negative("a rejecting test rejects the call", [NUMBERS, broken], FAILED),
    negative("a rejecting test rejects for one item", [[1], broken], FAILED),
  ],
});

unit(everyAsync, {
  positive: [
    positive("true when every item passes", [NUMBERS, async (item: number) => item > 0], true),
    positive("false when one fails", [NUMBERS, isEven], false),
  ],
  negative: [
    negative("a rejecting test rejects the call", [NUMBERS, broken], FAILED),
    negative("a rejecting test rejects for one item", [[1], broken], FAILED),
  ],
});

unit(findAsync, {
  positive: [
    positive("returns the first item that passes", [NUMBERS, isEven], 2),
    positive("returns undefined when none passes", [NUMBERS, isNegative], undefined),
  ],
  negative: [
    negative("a rejecting test rejects the call", [NUMBERS, broken], FAILED),
    negative("a rejecting test rejects for one item", [[1], broken], FAILED),
  ],
});

unit(reduceAsync, {
  positive: [
    positive(
      "folds the items in order",
      [NUMBERS, async (sum: number, item: number) => sum + item, 0],
      10,
    ),
    positive("an empty list gives the initial value", [[], async (sum: number) => sum, 7], 7),
  ],
  negative: [
    negative("a rejecting step rejects the call", [NUMBERS, brokenStep, 0], FAILED),
    negative("a rejecting step rejects for one item", [[1], brokenStep, 0], FAILED),
  ],
});
