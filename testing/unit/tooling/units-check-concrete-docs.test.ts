import { afterAll, expect } from "bun:test";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  checkConcreteDocs,
  vagueSteps,
  vagueStepsIn,
} from "../../../tooling/scripts/check-concrete-docs.ts";

const SITE = "apps/docs/src/content/docs";
const CURL = "curl --request GET 'https://api.example/v1/config' \\\n  --header 'a: b'";
const HTTP_OK = `### HTTP: Read\n\n${CURL}\n\n`;
const HTTP_VAGUE = "### HTTP: Read\n\ncurl --request GET '/v1/config'\n\n";
const MCP_OK = "### MCP: Call\n\nEndpoint: `https://api.example/mcp`\n\n";
const MCP_VAGUE = "### MCP: Call\n\ntools/call books.get\n\n";
const CONSOLE_VAGUE = "### CONSOLE: Open\n\nWhere: the console in the browser\n\n";

const clean = await makeDir();
await writeFiles(clean, { [`${SITE}/a.md`]: HTTP_OK, [`${SITE}/b.md`]: MCP_OK });
const vague = await makeDir();
await writeFiles(vague, { [`${SITE}/a.md`]: HTTP_OK, [`${SITE}/b.md`]: HTTP_VAGUE });
const empty = await makeDir();
await writeFiles(empty, { [`${SITE}/keep.txt`]: "" });
const consoleSite = await makeDir();
await writeFiles(consoleSite, { [`${SITE}/c.md`]: CONSOLE_VAGUE });
afterAll(removeAll);

unit(vagueSteps, {
  positive: [
    positive("an http step with a curl command", ["p.md", HTTP_OK], []),
    positive("an mcp step with an endpoint", ["p.md", MCP_OK], []),
    positive("a page without steps", ["p.md", "## Goal\n\ntext\n"], []),
  ],
  negative: [
    rejected(
      "an http step with a path and no domain",
      ["p.md", HTTP_VAGUE],
      [expect.stringContaining("Read")],
    ),
    rejected(
      "an mcp step with no endpoint",
      ["p.md", MCP_VAGUE],
      [expect.stringContaining("Call")],
    ),
    rejected(
      "a console step with no url",
      ["p.md", CONSOLE_VAGUE],
      [expect.stringContaining("Open")],
    ),
  ],
});

unit(vagueStepsIn, {
  positive: [
    positive("concrete pages give no problems", [clean], []),
    positive("a site without pages gives no problems", [empty], []),
  ],
  negative: [
    rejected("a vague page is named", [vague], [expect.stringContaining("b.md")]),
    negative("a missing root throws on the page read", [`${empty}/absent`], {
      code: "ENOENT",
    }),
  ],
});

unit(checkConcreteDocs, {
  positive: [
    positive("concrete pages exit with 0", [clean], 0),
    positive("a site without pages exits with 0", [empty], 0),
  ],
  negative: [
    rejected("a vague page exits with 1", [vague], 1),
    rejected("a site with a vague console step exits with 1", [consoleSite], 1),
  ],
});
