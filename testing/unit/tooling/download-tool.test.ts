import { expect } from "bun:test";
import { releaseUrl } from "@platform/config/urls";
import { ToolBinary } from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import { downloadTool } from "../../../tooling/scripts/download-tool.ts";

const url = await releaseUrl(ToolBinary.Pulumi, "1.0.0", "archive.tar.gz");
const bytes = new Uint8Array([42]);
const empty = new Uint8Array();
const digest = new Bun.CryptoHasher("sha256").update(bytes).digest("hex");
const emptyDigest = new Bun.CryptoHasher("sha256").update(empty).digest("hex");
const serving = async () => new Response(bytes);
const servingEmpty = async () => new Response(empty);
const missing = async () => new Response(null, { status: 404 });

unit(downloadTool, {
  positive: [
    positive(
      "verified archive bytes are returned unchanged",
      [url, "archive.tar.gz", digest, serving],
      bytes,
    ),
    positive(
      "an empty payload still requires its exact digest",
      [url, "empty.tar.gz", emptyDigest, servingEmpty],
      empty,
    ),
  ],
  negative: [
    negative(
      "failed downloads report their HTTP status",
      [url, "archive.tar.gz", digest, missing],
      { message: expect.stringContaining("404") },
    ),
    negative(
      "mismatched bytes are refused before extraction",
      [url, "archive.tar.gz", emptyDigest, serving],
      { message: expect.stringContaining("Checksum mismatch") },
    ),
  ],
});
