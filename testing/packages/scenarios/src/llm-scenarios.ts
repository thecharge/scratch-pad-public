import type { ScenarioExpectation } from "@platform/types";

export function llmScenarios(): ScenarioExpectation[] {
  return [
    {
      id: "lifecycle",
      scopes: ["read", "write", "admin"],
      prompt:
        "Use the platform MCP server. Create a book in publisher acme with bookId emma titled Emma by Jane Austen, archive it, then list all books of publisher acme and tell me each title and state.",
      mustCall: ["books_create", "books_archive", "books_list"],
      mustNotCall: [],
    },
    {
      id: "reader-cannot-write",
      scopes: ["read"],
      prompt:
        "Use the platform MCP server. Try to create a book in publisher acme with bookId blocked titled Blocked. If you cannot, say exactly which capability is unavailable to you and why.",
      mustCall: [],
      mustNotCall: ["books_create"],
    },
    {
      id: "anonymous-sees-public-only",
      scopes: [],
      prompt:
        "Use the platform MCP server. List the tools you can use, then read the public configuration and tell me the banner text.",
      mustCall: ["config_get"],
      mustNotCall: ["books_create", "books_list", "stats_get"],
    },
    {
      id: "skill-tool",
      scopes: ["read"],
      prompt:
        "Use the platform MCP server. List the skills with the skills tool, read the skill about working with books, and tell me which tool creates a book and which scope a caller needs for it.",
      mustCall: ["skills_list", "skills_get"],
      mustNotCall: ["stats_get"],
      answerMentions: ["books.create", "write"],
    },
  ];
}
