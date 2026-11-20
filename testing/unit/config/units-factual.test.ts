import { afterAll } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { LOCAL_URLS } from "@platform/config/urls";
import { MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import { negative, positive, unit } from "@platform/test-factories";
import { loadFactualUrls, resolveDocsUrls } from "../../../packages/config/src/factual.ts";

const FULL = {
  console: "https://console.example",
  api: "https://api.example",
  mcp: "https://api.example/mcp",
  docs: "https://docs.example",
};
const OTHER = { ...FULL, api: "https://other.example", mcp: "https://other.example/mcp" };
const directory = await mkdtemp(join(tmpdir(), "factual-units-"));

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function fileWith(name: string, content: string): Promise<string> {
  const path = join(directory, name);
  await Bun.write(path, content);
  return path;
}

const FULL_FILE = await fileWith("full.json", JSON.stringify(FULL));
const OTHER_FILE = await fileWith("other.json", JSON.stringify(OTHER));
const NO_MCP_FILE = await fileWith("no-mcp.json", JSON.stringify({ ...FULL, mcp: "" }));
const NO_DOCS_NOR_API = await fileWith("two.json", JSON.stringify({ ...FULL, api: "", docs: "x" }));
const BROKEN_FILE = await fileWith("broken.json", "{not json");
const WRONG_SHAPE_FILE = await fileWith("shape.json", JSON.stringify({ console: 1 }));
const MISSING_FILE = join(directory, "absent.json");

const RESOLVED_FULL = { urls: FULL, missing: [] };
const RESOLVED_NO_MCP = { urls: { ...FULL, mcp: LOCAL_URLS.mcp }, missing: ["mcp"] };
const RESOLVED_NO_DOCS_NOR_API = {
  urls: { ...FULL, api: LOCAL_URLS.api, docs: LOCAL_URLS.docs },
  missing: ["api", "docs"],
};
const MISSING_MCP = { message: message(MessageId.FactualUrlMissing, { surfaces: "mcp" }) };
const MISSING_API_DOCS = {
  message: message(MessageId.FactualUrlMissing, { surfaces: "api, docs" }),
};

unit(loadFactualUrls, {
  positive: [
    positive("a complete file loads as it is", [FULL_FILE], FULL),
    positive("another complete file loads its own values", [OTHER_FILE], OTHER),
  ],
  negative: [
    negative("an empty value names its surface", [NO_MCP_FILE], MISSING_MCP),
    negative("every unusable surface is named", [NO_DOCS_NOR_API], MISSING_API_DOCS),
    negative("text that is not json is rejected", [BROKEN_FILE], { name: "SyntaxError" }),
    negative("json of the wrong shape is rejected", [WRONG_SHAPE_FILE], { name: "ZodError" }),
    negative("a file that does not exist is rejected", [MISSING_FILE], { code: "ENOENT" }),
  ],
});

unit(resolveDocsUrls, {
  positive: [
    positive("a complete file gives every url and nothing missing", [FULL_FILE], RESOLVED_FULL),
    positive(
      "an unset surface falls back to the local url and is reported",
      [NO_MCP_FILE],
      RESOLVED_NO_MCP,
    ),
    positive("every unusable surface falls back", [NO_DOCS_NOR_API], RESOLVED_NO_DOCS_NOR_API),
  ],
  negative: [
    negative("text that is not json is rejected", [BROKEN_FILE], { name: "SyntaxError" }),
    negative("json of the wrong shape is rejected", [WRONG_SHAPE_FILE], { name: "ZodError" }),
    negative("a file that does not exist is rejected", [MISSING_FILE], { code: "ENOENT" }),
  ],
});
