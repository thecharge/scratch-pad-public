import { expect } from "bun:test";
import { McpServer, type ServerContext } from "@modelcontextprotocol/server";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  ErrorReason,
  MediaType,
  MethodKind,
  PrincipalKind,
  SKILL_MAX_BYTES,
  SKILL_MAX_RESOURCES,
  SKILLS_EXTENSION_ID,
  SkillFileName,
} from "@platform/constants";
import {
  assertSkillLimits,
  createSkillSource,
  createSkillsExtension,
  getPrincipal,
  skillFilesFor,
} from "@platform/skill-protocol";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { settlesAs } from "@platform/test-framework";
import type { AuthInfo, CapabilityDefinition, ReferenceCache } from "@platform/types";
import { z } from "zod";

const BOOK = "publishers/{publisher}/books/{book}";

async function define(overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>>) {
  return defineCapability({
    id: "books.x",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: BOOK,
    summary: "summary",
    description: "description",
    auth: AuthMode.None,
    input: z.strictObject({ name: z.string() }),
    output: z.object({ echoed: z.string() }),
    handler: () => ({ echoed: "x" }),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const OPEN = await define({ id: "books.open" });
const PRIVATE = await define({ id: "books.private", auth: AuthMode.Required });
const SHELF = await define({
  id: "shelves.read",
  resource: "shelves/{shelf}",
  auth: AuthMode.Required,
});
const UNREPRESENTABLE = await define({ id: "books.dated", output: z.object({ at: z.date() }) });

const BOOKS = { name: "books", capabilities: [OPEN, PRIVATE] };
const EMPTY = { name: "empty", capabilities: [] };
const BROKEN = { name: "broken", capabilities: [UNREPRESENTABLE] };

const TOKEN: AuthInfo = { token: "t", clientId: "c", scopes: ["read"], expiresAt: 9e9 };
const AGENT: AuthInfo = { ...TOKEN, extra: { principal_kind: "agent" } };

const contextOf = (info?: AuthInfo) =>
  ({ http: info === undefined ? undefined : { authInfo: info } }) as unknown as ServerContext;

const options = (authEnabled = true) => ({
  source: { list: async () => [OPEN, PRIVATE, SHELF] },
  visible: async () => true,
  allowed: async () => false,
  skillDirs: [],
  authEnabled,
});
const HIDING = { ...options(), visible: () => false };
const NO_SKILLS = { ...options(), source: { list: async () => [] } };

const FRONTMATTER = z.object({ name: z.string() });
const NAMED = z.object({ skills: z.array(z.object({ frontmatter: FRONTMATTER })) });
const skillNames = (result: unknown) =>
  NAMED.parse(result)
    .skills.map((skill) => skill.frontmatter.name)
    .sort();
const filesOf = (count: number, size: number) =>
  Object.fromEntries(
    Array.from({ length: count }, (_, index) => [`f${index}.md`, "x".repeat(size)]),
  );
const server = () => new McpServer({ name: "skills", version: "1" });
const attached = server();
const doubled = server();
const DECLARED = { [SKILLS_EXTENSION_ID]: {} };
doubled.server.registerCapabilities({ extensions: DECLARED });
const wired = server();
(await createSkillsExtension(options())).attach(doubled);

const BOOKS_FILES = [SkillFileName.Main, "references/books.open.md", "references/books.private.md"];
const MAIN_TEXT = expect.stringContaining("name: books");
const REFERENCE_TEXT = expect.stringContaining("# books.open");

unit(getPrincipal, {
  positive: [
    positive("a token makes a user", [contextOf(TOKEN)], {
      kind: PrincipalKind.User,
      scopes: ["read"],
      roles: [],
    }),
    positive("an agent claim makes an agent", [contextOf(AGENT)], {
      kind: PrincipalKind.Agent,
      scopes: ["read"],
      roles: [],
    }),
  ],
  negative: [
    rejected("no http context is anonymous", [contextOf()], {
      kind: PrincipalKind.Anonymous,
      scopes: [],
      roles: [],
    }),
    negative("a missing context throws", [undefined], { name: "TypeError" }),
  ],
});

const KEPT: ReferenceCache = { get: () => "kept text", set: () => undefined };
const FILLED_TEXTS: string[] = [];
const FILLED: ReferenceCache = {
  get: () => undefined,
  set: (_capability, text) => FILLED_TEXTS.push(text),
};

unit(skillFilesFor, {
  positive: [
    positive(
      "a reference kept for a capability is reused",
      [BOOKS, KEPT],
      expect.objectContaining({ "references/books.open.md": "kept text" }),
    ),
    positive(
      "a reference that was built is kept for the next call",
      [BOOKS, FILLED],
      seen(() => FILLED_TEXTS.some((text) => text.includes("# books.open")), true),
    ),
    positive(
      "a skill has a main file and one reference per capability",
      [BOOKS],
      settlesAs((files) => Object.keys(files as object).sort(), BOOKS_FILES),
    ),
    positive(
      "the main file names the skill",
      [BOOKS],
      expect.objectContaining({ [SkillFileName.Main]: MAIN_TEXT }),
    ),
    positive(
      "a reference describes its capability",
      [BOOKS],
      expect.objectContaining({ "references/books.open.md": REFERENCE_TEXT }),
    ),
  ],
  negative: [
    rejected(
      "a skill without capabilities has only the main file",
      [EMPTY],
      settlesAs((files) => Object.keys(files as object), [SkillFileName.Main]),
    ),
    negative("a capability that cannot be described in JSON Schema throws", [BROKEN], {
      name: "Error",
    }),
  ],
});

unit(assertSkillLimits, {
  positive: [
    positive(
      "the resource count limit is accepted",
      ["books", filesOf(SKILL_MAX_RESOURCES, 1)],
      undefined,
    ),
    positive("the byte limit is accepted", ["books", filesOf(1, SKILL_MAX_BYTES)], undefined),
  ],
  negative: [
    negative("one resource too many", ["books", filesOf(SKILL_MAX_RESOURCES + 1, 1)], {
      reason: ErrorReason.BatchTooLarge,
    }),
    negative("one byte too many", ["books", filesOf(1, SKILL_MAX_BYTES + 1)], {
      reason: ErrorReason.BatchTooLarge,
    }),
  ],
});

unit(createSkillSource, {
  positive: [
    positive(
      "an anonymous list has the skills with an authless capability",
      [options()],
      settlesAs(skillNames, ["books"]),
      ["list", {}, contextOf()],
    ),
    positive(
      "a token adds the skills that need one",
      [options()],
      settlesAs(skillNames, ["books", "shelves"]),
      ["list", {}, contextOf(TOKEN)],
    ),
    positive(
      "a reference file is served as markdown",
      [options()],
      { text: expect.stringContaining("books.open"), mimeType: MediaType.Markdown },
      ["read", "skill://books/references/books.open.md", contextOf()],
    ),
    positive(
      "the main file is the default",
      [options()],
      expect.objectContaining({ text: MAIN_TEXT }),
      ["read", "skill://books", contextOf()],
    ),
  ],
  negative: [
    rejected(
      "with auth off nothing that needs a token is listed",
      [options(false)],
      settlesAs(skillNames, ["books"]),
      ["list", {}, contextOf(TOKEN)],
    ),
    rejected("a skill that is not visible is not listed", [HIDING], settlesAs(skillNames, []), [
      "list",
      {},
      contextOf(TOKEN),
    ]),
    rejected("get of an unknown skill is nothing", [options()], undefined, [
      "get",
      "skill://nothing/SKILL.md",
      contextOf(),
    ]),
    rejected("get of a skill the caller may not see is nothing", [options()], undefined, [
      "get",
      "skill://shelves/SKILL.md",
      contextOf(),
    ]),
    rejected("a missing file is nothing", [options()], undefined, [
      "read",
      "skill://books/references/none.md",
      contextOf(),
    ]),
    rejected("read of a catalog without skills is nothing", [NO_SKILLS], undefined, [
      "read",
      "skill://books/SKILL.md",
      contextOf(),
    ]),
  ],
});

unit(createSkillsExtension, {
  positive: [
    positive(
      "the extension carries the skills id",
      [options()],
      expect.objectContaining({ id: SKILLS_EXTENSION_ID }),
    ),
    positive(
      "attaching declares the extension on the server",
      [options()],
      settlesAs(() => wired.server.getCapabilities().extensions, DECLARED),
      ["attach", wired],
    ),
  ],
  negative: [
    negative(
      "attaching a second skills extension to a server throws",
      [options()],
      { message: expect.stringContaining("already attached") },
      ["attach", doubled],
    ),
    negative(
      "attaching to something that is not a server throws",
      [options()],
      { name: "TypeError" },
      ["attach", {}],
    ),
  ],
});

void attached;
