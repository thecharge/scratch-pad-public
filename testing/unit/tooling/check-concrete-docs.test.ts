import { describe, expect, test } from "bun:test";
import { vagueSteps } from "../../../tooling/scripts/check-concrete-docs.ts";

const CURL = "curl --request GET 'https://api.example/v1/config' \\\n  --header 'a: b'";
const HTTP_OK = `### HTTP: Read\n\nCommand:\n\n\`\`\`bash\n${CURL}\n\`\`\`\n\n`;
const HTTP_NO_DOMAIN = "### HTTP: Read\n\nRequest:\n\n```http\nGET /v1/config\n```\n\n";
const HTTP_PATH_ONLY = "### HTTP: Read\n\ncurl --request GET '/v1/config'\n\n";
const MCP_OK = "### MCP: Call\n\nEndpoint: `https://api.example/mcp`\n\n";
const MCP_NO_ENDPOINT = "### MCP: Call\n\nTool call:\n\ntools/call books.get\n\n";
const CONSOLE_OK = "### CONSOLE: Open\n\nWhere: the console\n\nURL: `https://console.example/`\n\n";
const CONSOLE_VAGUE = "### CONSOLE: Open\n\nWhere: The console address in the browser\n\n";

describe("concrete documentation", () => {
  test.each([
    ["an http step with a curl command", HTTP_OK],
    ["an mcp step with an endpoint", MCP_OK],
    ["a console step with a url", CONSOLE_OK],
    ["a page without steps", "## Goal\n\ntext\n"],
  ])("accepts %s", async (_name, text) => {
    expect(await vagueSteps("p.md", text)).toEqual([]);
  });

  test.each([
    ["an http step with no curl command", HTTP_NO_DOMAIN],
    ["an http step with a path and no domain", HTTP_PATH_ONLY],
    ["an mcp step with no endpoint", MCP_NO_ENDPOINT],
    ["a console step with no url", CONSOLE_VAGUE],
  ])("rejects %s and names the page and step", async (_name, text) => {
    const [problem] = await vagueSteps("p.md", text);
    expect([
      problem?.includes("p.md"),
      problem?.includes("Read") || problem?.includes("Call") || problem?.includes("Open"),
    ]).toEqual([true, true]);
  });

  test("a vague step among concrete ones is reported once", async () => {
    expect((await vagueSteps("p.md", `${HTTP_OK}${HTTP_NO_DOMAIN}`)).length).toBe(1);
  });
});
