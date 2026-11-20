import { matchesFilter, parseFilter } from "@platform/aip";
import {
  CanonicalCode,
  ErrorReason,
  FilterComparator,
  FilterFieldKind,
  FilterNodeKind,
} from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";

const fields = () =>
  new Map([
    ["title", { kind: FilterFieldKind.String }],
    ["rating", { kind: FilterFieldKind.Number }],
    ["published", { kind: FilterFieldKind.Boolean }],
  ]);
const BAD_FILTER = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidFilter };
const restriction = (field: string, comparator: FilterComparator, value: unknown) => ({
  kind: FilterNodeKind.Restriction,
  field,
  comparator,
  value,
  presence: false,
});
const FIVE = restriction("rating", FilterComparator.Equals, 5);
const PUBLISHED = restriction("published", FilterComparator.Equals, true);

unit(parseFilter, {
  positive: [
    positive("one restriction", ["rating = 5", fields()], FIVE),
    positive("an implicit and", ["rating = 5 published = true", fields()], {
      kind: FilterNodeKind.And,
      children: [FIVE, PUBLISHED],
    }),
    positive("not negates", ["NOT rating = 5", fields()], {
      kind: FilterNodeKind.Not,
      child: FIVE,
    }),
  ],
  negative: [
    rejected("no text means no filter", [undefined, fields()], undefined),
    rejected("blank text means no filter", ["   ", fields()], undefined),
    negative("an unknown field", ["secret = 1", fields()], BAD_FILTER),
    negative("a value of the wrong kind", ["rating = abc", fields()], BAD_FILTER),
    negative("an unclosed group", ["(rating = 5", fields()], BAD_FILTER),
  ],
});

unit(matchesFilter, {
  positive: [
    positive("an equal number matches", [FIVE, fields(), { rating: 5 }], true),
    positive(
      "and needs every child",
      [
        { kind: FilterNodeKind.And, children: [FIVE, PUBLISHED] },
        fields(),
        { rating: 5, published: true },
      ],
      true,
    ),
    positive("no filter matches everything", [undefined, fields(), {}], true),
  ],
  negative: [
    rejected("a different number does not match", [FIVE, fields(), { rating: 4 }], false),
    rejected(
      "and fails when one child fails",
      [
        { kind: FilterNodeKind.And, children: [FIVE, PUBLISHED] },
        fields(),
        { rating: 5, published: false },
      ],
      false,
    ),
    rejected(
      "or fails when no child matches",
      [
        { kind: FilterNodeKind.Or, children: [FIVE, PUBLISHED] },
        fields(),
        { rating: 1, published: false },
      ],
      false,
    ),
    rejected(
      "not flips a match",
      [{ kind: FilterNodeKind.Not, child: FIVE }, fields(), { rating: 5 }],
      false,
    ),
  ],
});
