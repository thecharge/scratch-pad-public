import { describe, expect, test } from "bun:test";
import type { ServerContext } from "@modelcontextprotocol/server";
import type { Skill } from "@modelcontextprotocol/server/ext/skills";
import { CapabilityRegistry, defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  ErrorReason,
  MethodKind,
  PrincipalKind,
  SkillFileName,
} from "@platform/constants";
import { allowedBy, DeclarativePolicyEngine, visibleTo } from "@platform/policy";
import {
  assertSkillLimits,
  createSkillSource,
  getPrincipal,
  groupCapabilities,
  skillFilesFor,
} from "@platform/skill-protocol";
import { thrownBy } from "@platform/test-framework";
import type { AuthInfo, CapabilityDefinition } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";

const engine = new DeclarativePolicyEngine();
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

const CAPABILITIES = [
  await define({ id: "books.open" }),
  await define({ id: "books.private", auth: AuthMode.Required }),
  await define({ id: "shelves.read", resource: "shelves/{shelf}", auth: AuthMode.Required }),
  await define({
    id: "books.admin",
    auth: AuthMode.Required,
    policy: { requiredScopes: ["admin"] },
  }),
];

const TOKEN: AuthInfo = { token: "t", clientId: "c", scopes: ["read"], expiresAt: 9e9 };

async function source(authEnabled = true) {
  const registry = new CapabilityRegistry();
  await all(
    CAPABILITIES.map(
      (capability) => async () => registry.register(capability.id, () => capability),
    ),
  );
  return createSkillSource({
    source: registry,
    visible: async (capability, principal) => visibleTo(engine, capability, principal),
    allowed: async (block, principal) => allowedBy(engine, block, principal),
    authEnabled,
    skillDirs: [],
  });
}

function digestOf(skill: Skill | undefined): string | undefined {
  const first = skill?.resources[0];
  return typeof first === "string" ? first : first?.digest;
}

function context(info?: AuthInfo): ServerContext {
  return { http: info === undefined ? undefined : { authInfo: info } } as unknown as ServerContext;
}

async function names(info?: AuthInfo, authEnabled = true) {
  const { skills } = await (await source(authEnabled)).list({}, context(info));
  return skills.map((skill) => skill.frontmatter.name).sort();
}

describe("principal", () => {
  test.each([
    ["no auth info is anonymous", undefined, PrincipalKind.Anonymous],
    ["a token is a user or agent", TOKEN, PrincipalKind.User],
  ])("%s", async (_name, info, kind) => {
    expect((await getPrincipal(context(info))).kind).toBe(kind);
  });
});

describe("listing follows the caller", () => {
  test("anonymous callers see only skills with an authless capability", async () => {
    expect(await names()).toEqual(["books"]);
  });

  test("a token adds the skills that need one", async () => {
    expect(await names(TOKEN)).toEqual(["books", "shelves"]);
  });

  test("with auth off nothing that needs a token is listed", async () => {
    expect(await names(TOKEN, false)).toEqual(["books"]);
  });

  test("an anonymous skill file does not mention required capabilities", async () => {
    const result = await (await source()).read("skill://books/SKILL.md", context());
    expect(result).toMatchObject({ text: expect.not.stringContaining("books.private") });
  });

  test("a token with the scope sees the policy-guarded capability", async () => {
    const admin = { ...TOKEN, scopes: ["admin"] };
    const result = await (await source()).read("skill://books/SKILL.md", context(admin));
    expect(result).toMatchObject({ text: expect.stringContaining("books.admin") });
  });
});

describe("get and read", () => {
  test.each([
    ["an unknown skill", "skill://nothing/SKILL.md"],
    ["a skill the caller may not see", "skill://shelves/SKILL.md"],
  ])("get returns nothing for %s", async (_name, uri) => {
    expect(await (await source()).get(uri, context())).toBeUndefined();
  });

  test("a reference file is served as markdown", async () => {
    const result = await (await source()).read("skill://books/references/books.open.md", context());
    expect(result).toMatchObject({
      mimeType: "text/markdown",
      text: expect.stringContaining("books.open"),
    });
  });

  test("a missing file is undefined", async () => {
    expect(
      await (await source()).read("skill://books/references/none.md", context()),
    ).toBeUndefined();
  });
});

describe("generated files", async () => {
  const group = (await groupCapabilities(CAPABILITIES)).find(
    (candidate) => candidate.name === "books",
  );

  test("a skill has a main file and one reference per capability", async () => {
    const files = await skillFilesFor(group as NonNullable<typeof group>);
    expect(Object.keys(files).sort()).toEqual([
      SkillFileName.Main,
      "references/books.admin.md",
      "references/books.open.md",
      "references/books.private.md",
    ]);
  });

  test("no script, hook or allowed-tools is ever generated", async () => {
    const text = Object.values(await skillFilesFor(group as NonNullable<typeof group>)).join("\n");
    expect(text).not.toMatch(/allowed-tools|hooks|scripts/);
  });

  test("changing a capability changes the digest of its skill", async () => {
    const changed = await define({ id: "books.open", summary: "a different summary" });
    const before = await (await source()).get("skill://books/SKILL.md", context());
    const registry = new CapabilityRegistry();
    await registry.register("books.open", () => changed);
    const other = await createSkillSource({
      source: registry,
      visible: async () => true,
      allowed: async () => true,
      authEnabled: true,
      skillDirs: [],
    });
    const after = await other.get("skill://books/SKILL.md", context());
    expect(digestOf(before)).not.toBe(digestOf(after));
  });
});

describe("skill limits", () => {
  const files = (count: number, size: number) =>
    Object.fromEntries(
      Array.from({ length: count }, (_, index) => [`f${index}.md`, "x".repeat(size)]),
    );

  test.each([
    ["512 resources", files(512, 1)],
    ["16 MiB", files(1, 16 * 1024 * 1024)],
  ])("%s is accepted", async (_name, input) => {
    expect(await thrownBy(async () => assertSkillLimits("books", input))).toBeUndefined();
  });

  test.each([
    ["513 resources", files(513, 1)],
    ["more than 16 MiB", files(1, 16 * 1024 * 1024 + 1)],
  ])("%s is a typed build error", async (_name, input) => {
    expect(await thrownBy(async () => assertSkillLimits("books", input))).toMatchObject({
      reason: ErrorReason.BatchTooLarge,
    });
  });
});
