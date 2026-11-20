import { expect, test } from "bun:test";
import { MessageId } from "@platform/constants";
import { uploadStream } from "@platform/streams/upload";
import { negative, positive, unit } from "@platform/test-factories";
import { bytesOf, cutStream } from "@platform/test-scenarios";
import {
  assetBackpressure,
  assetChecksum,
  assetTarget,
  pendingAssetBody,
} from "../../packages/scenarios/src/asset-fixtures.ts";

const BYTES = new TextEncoder().encode("asset content");
const EMPTY = new Uint8Array();
const HASH = assetChecksum(BYTES);
const HEADERS = { mediaType: "application/octet-stream", checksum: HASH };
const POLICY = { maxBytes: 20_000_000, mediaTypes: [HEADERS.mediaType] };
const RESULT = { sizeBytes: BYTES.length, sha256: HASH, mediaType: HEADERS.mediaType };
const EMPTY_HEADERS = { ...HEADERS, checksum: assetChecksum(EMPTY) };
const EMPTY_RESULT = { ...RESULT, sizeBytes: 0, sha256: EMPTY_HEADERS.checksum };
const WRONG_HASH = { ...HEADERS, checksum: "0".repeat(64) };
const WRONG_TYPE = { ...HEADERS, mediaType: "application/x-invalid" };
const SMALL_POLICY = { ...POLICY, maxBytes: 1 };
const TOO_LARGE = { messageId: MessageId.AssetSizeLimit };
const BAD_HASH = { messageId: MessageId.AssetChecksumMismatch };
const BAD_TYPE = { messageId: MessageId.AssetMediaType };

unit(uploadStream, {
  positive: [
    positive(
      "streams bytes and validates their checksum",
      [bytesOf(BYTES), assetTarget().target, HEADERS, POLICY],
      RESULT,
    ),
    positive(
      "accepts an empty asset with its checksum",
      [bytesOf(), assetTarget().target, EMPTY_HEADERS, POLICY],
      EMPTY_RESULT,
    ),
  ],
  negative: [
    negative(
      "rejects a media type before writing",
      [bytesOf(BYTES), assetTarget().target, WRONG_TYPE, POLICY],
      BAD_TYPE,
    ),
    negative(
      "rejects a mismatched checksum",
      [bytesOf(BYTES), assetTarget().target, WRONG_HASH, POLICY],
      BAD_HASH,
    ),
    negative(
      "enforces the size limit",
      [bytesOf(BYTES), assetTarget().target, HEADERS, SMALL_POLICY],
      TOO_LARGE,
    ),
    negative(
      "rejects a malformed checksum",
      [bytesOf(BYTES), assetTarget().target, { ...HEADERS, checksum: "bad" }, POLICY],
      { name: "ZodError" },
    ),
  ],
});

test.each(["write", "complete"])("cleans up after target %s fails", async (failure) => {
  const fixture = assetTarget(failure);
  await expect(uploadStream(bytesOf(BYTES), fixture.target, HEADERS, POLICY)).rejects.toThrow(
    `${failure} failed`,
  );
  expect(fixture.calls.slice(-2)).toEqual(["abort", "remove"]);
});

test.each(["abort", "remove"])(
  "reports failed %s while still attempting both cleanup operations",
  async (failure) => {
    const fixture = assetTarget(failure);
    await expect(
      uploadStream(bytesOf(BYTES), fixture.target, WRONG_HASH, POLICY),
    ).rejects.toBeInstanceOf(AggregateError);
    expect(fixture.calls.slice(-2)).toEqual(["abort", "remove"]);
  },
);

test.each([false, true])(
  "cancels an idle source when the caller aborts, source cleanup failure %s",
  async (failCancel) => {
    const controller = new AbortController();
    const fixture = assetTarget();
    await expect(
      uploadStream(
        pendingAssetBody(controller, failCancel),
        fixture.target,
        HEADERS,
        POLICY,
        controller.signal,
      ),
    ).rejects.toThrow("cancelled");
    expect(fixture.calls).toEqual(["abort", "remove"]);
  },
);

test("removes partial data when the input connection resets", async () => {
  const fixture = assetTarget();
  await expect(uploadStream(cutStream(), fixture.target, HEADERS, POLICY)).rejects.toThrow(
    "connection reset",
  );
  expect(fixture.calls).toEqual(["abort", "remove"]);
});

test("chunks writes within the memory bound without altering bytes", async () => {
  const bytes = new Uint8Array(140_000).fill(41);
  const fixture = assetTarget();
  await uploadStream(
    bytesOf(bytes),
    fixture.target,
    { ...HEADERS, checksum: assetChecksum(bytes) },
    POLICY,
  );
  expect(fixture.writes.map((chunk) => chunk.length)).toEqual([65_536, 65_536, 8_928]);
  expect(Buffer.concat(fixture.writes)).toEqual(Buffer.from(bytes));
});

test("waits for a write before pulling more input", async () => {
  const headers = { ...HEADERS, checksum: assetChecksum(new Uint8Array([1])) };
  const result = await assetBackpressure(async (body, target) =>
    uploadStream(body, target, headers, POLICY),
  );
  expect(result.duringWrite).toEqual(["pull 1", "write"]);
  expect(result.calls).toEqual(["pull 1", "write", "written", "pull 2"]);
});
