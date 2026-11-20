import { expect } from "bun:test";
import { HttpHeader, MediaType } from "@platform/constants";
import { jsonResponse } from "@platform/streams";
import { negative, positive, unit } from "@platform/test-factories";

const JSON_TYPE = { [HttpHeader.ContentType]: MediaType.Json };
const EXTRA_HEADERS = { ...JSON_TYPE, "x-extra": "yes" };
const SAMPLE = { a: 1 };
const WITH_ARRAY = { books: [{ name: "b1" }, { name: "b2" }], nextPageToken: "" };
const TYPE_ERROR = { name: "TypeError" };
const RANGE_ERROR = { name: "RangeError" };

unit(jsonResponse, {
  positive: [
    positive(
      "writes the status, the JSON type and the body",
      [200, SAMPLE],
      expect.objectContaining({ status: 200, headers: JSON_TYPE, body: SAMPLE }),
    ),
    positive(
      "writes an array property element by element and keeps the document",
      [200, WITH_ARRAY],
      expect.objectContaining({ status: 200, headers: JSON_TYPE, body: WITH_ARRAY }),
    ),
    positive(
      "keeps the headers it is given and writes an array body whole",
      [201, [1, 2], new Headers({ "x-extra": "yes" })],
      expect.objectContaining({ status: 201, headers: EXTRA_HEADERS, body: [1, 2] }),
    ),
  ],
  negative: [
    negative("a body that cannot be serialized throws", [200, 1n], TYPE_ERROR),
    negative("a status outside the HTTP range throws", [99, {}], RANGE_ERROR),
  ],
});
