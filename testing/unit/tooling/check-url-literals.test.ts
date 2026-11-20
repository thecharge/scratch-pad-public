import { describe, expect, test } from "bun:test";
import { isAllowed, urlLiteralsIn } from "../../../tooling/scripts/check-url-literals.ts";

const CONFIG = { allowedPaths: [".test.ts"] };

describe("address literals", () => {
  test.each([
    ["an http address", 'const a = "http://example.test";', "http://example.test"],
    ["an https address", "const a = `https://example.test/x`;", "https://example.test/x"],
    ["localhost", 'const a = "localhost";', "localhost"],
    ["the loopback address", 'const a = "127.0.0.1";', "127.0.0.1"],
  ])("finds %s", async (_name, source, literal) => {
    expect((await urlLiteralsIn("a.ts", source)).map((found) => found.literal)).toEqual([literal]);
  });

  test.each([
    ["a plain string", 'const a = "hello";'],
    ["a word that contains localhost", 'const a = "a-hostname";'],
    ["a name from the config package", "const a = LOOPBACK_ORIGIN;"],
  ])("ignores %s", async (_name, source) => {
    expect(await urlLiteralsIn("a.ts", source)).toEqual([]);
  });

  test.each([
    ["the config package", "packages/config/src/urls.ts", true],
    ["a test file named in the tool config", "apps/api/src/a.test.ts", true],
    ["a source file", "apps/api/src/app.ts", false],
  ])("allows %s: %s", async (_name, file, allowed) => {
    expect(await isAllowed(file, CONFIG)).toBe(allowed);
  });
});
