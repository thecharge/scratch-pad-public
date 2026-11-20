import { expect } from "bun:test";
import { createPageTokenCodec, paginate, resolvePageSize } from "@platform/aip";
import { CanonicalCode, ErrorReason } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";

const LIMITS = { defaultPageSize: 10, maxPageSize: 50 };
const SECRET = new Uint8Array(32).fill(7);
const CODEC = await createPageTokenCodec(SECRET);
const OTHER_CODEC = await createPageTokenCodec(new Uint8Array(32).fill(9));
const ITEMS = [1, 2, 3, 4, 5];
const QUERY = { filter: "a" };
const FIRST_TOKEN = await CODEC.encode(2, QUERY);
const OTHER_QUERY_REQUEST = { pageSize: 2, pageToken: FIRST_TOKEN, query: { filter: "b" } };
const BAD_SIZE = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidPageSize };
const BAD_TOKEN = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidPageToken };

unit(resolvePageSize, {
  positive: [
    positive("an unset size uses the default", [undefined, LIMITS], 10),
    positive("zero uses the default", [0, LIMITS], 10),
    positive("a size within limits is kept", [20, LIMITS], 20),
  ],
  negative: [
    negative("a negative size", [-1, LIMITS], BAD_SIZE),
    rejected("a size above the maximum is capped", [500, LIMITS], 50),
  ],
});

unit(createPageTokenCodec, {
  positive: [
    positive(
      "a 32 byte secret gives a codec",
      [SECRET],
      expect.objectContaining({ encode: expect.any(Function), decode: expect.any(Function) }),
    ),
    positive(
      "another secret gives its own codec",
      [new Uint8Array(32).fill(1)],
      expect.objectContaining({ encode: expect.any(Function) }),
    ),
  ],
  negative: [
    negative("a short secret", [new Uint8Array(8)], BAD_TOKEN),
    negative("an empty secret", [new Uint8Array(0)], BAD_TOKEN),
  ],
});

unit(paginate, {
  positive: [
    positive(
      "the first page and a token for the next",
      [ITEMS, { pageSize: 2, query: QUERY }, CODEC, LIMITS],
      { items: [1, 2], nextPageToken: expect.any(String) },
    ),
    positive(
      "the token leads to the next page",
      [ITEMS, { pageSize: 2, pageToken: FIRST_TOKEN, query: QUERY }, CODEC, LIMITS],
      { items: [3, 4], nextPageToken: expect.any(String) },
    ),
    positive("the last page has no token", [ITEMS, { pageSize: 10, query: QUERY }, CODEC, LIMITS], {
      items: ITEMS,
      nextPageToken: "",
    }),
  ],
  negative: [
    negative("a token for another query", [ITEMS, OTHER_QUERY_REQUEST, CODEC, LIMITS], BAD_TOKEN),
    negative(
      "a token from another secret",
      [ITEMS, { pageSize: 2, pageToken: FIRST_TOKEN, query: QUERY }, OTHER_CODEC, LIMITS],
      BAD_TOKEN,
    ),
    negative(
      "a made-up token",
      [ITEMS, { pageSize: 2, pageToken: "garbage", query: QUERY }, CODEC, LIMITS],
      BAD_TOKEN,
    ),
    negative(
      "a negative page size",
      [ITEMS, { pageSize: -5, query: QUERY }, CODEC, LIMITS],
      BAD_SIZE,
    ),
  ],
});
