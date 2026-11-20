import { afterAll, describe, expect, setDefaultTimeout, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { E2E_TEST_TIMEOUT_MS } from "@platform/constants";
import { all } from "@platform/util";
import { recordInto, scanPages } from "../../../tooling/scripts/record-kb.ts";

setDefaultTimeout(E2E_TEST_TIMEOUT_MS);

const directories: string[] = [];

afterAll(async () => {
  await all(
    directories.map((directory) => async () => rm(directory, { recursive: true, force: true })),
  );
});

const random = (alphabet: string, length: number) =>
  Array.from(
    crypto.getRandomValues(new Uint8Array(length)),
    (byte) => alphabet[byte % alphabet.length],
  ).join("");

async function page(text: string): Promise<string> {
  const directory = await mkdtemp(join(tmpdir(), "kb-scan-"));
  directories.push(directory);
  const path = join(directory, "page.mdx");
  await Bun.write(path, text);
  return path;
}

describe("knowledge base secret scan", () => {
  test("the pages generated from the scenarios contain no secret", async () => {
    const directory = await mkdtemp(join(tmpdir(), "kb-all-"));
    directories.push(directory);
    expect(await scanPages(await recordInto(directory))).toBe(0);
  });

  test("a page containing a credential is rejected", async () => {
    const fake = `aws_access_key_id = AKIA${random("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", 16)}\naws_secret_access_key = ${random("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40)}\n`;
    expect(await scanPages([await page(fake)])).not.toBe(0);
  });
});
