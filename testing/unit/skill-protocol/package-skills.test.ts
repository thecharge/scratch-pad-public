import { afterAll, describe, expect, test } from "bun:test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { ServerContext } from "@modelcontextprotocol/server";
import { CapabilityRegistry, defineCapability } from "@platform/capability";
import { ApiVersion, AuthMode, MethodKind, PrincipalKind } from "@platform/constants";
import { allowedBy, DeclarativePolicyEngine, visibleTo } from "@platform/policy";
import {
  createSkillSource,
  exceedsSkillLimits,
  inspectSkill,
  listVisibleSkills,
  loadPackageSkills,
  readVisibleSkill,
  skillFileNames,
  skillPackageProblems,
  visibleBundles,
} from "@platform/skill-protocol";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  ANONYMOUS_PRINCIPAL,
  type AuthInfo,
  type CapabilityDefinition,
  type Principal,
  type SkillAppOptions,
} from "@platform/types";
import { z } from "zod";

afterAll(removeAll);

const engine = new DeclarativePolicyEngine();
const READER: Principal = {
  kind: PrincipalKind.User,
  subject: "reader",
  scopes: ["read"],
  roles: [],
};
const TOKEN: AuthInfo = { token: "t", clientId: "c", scopes: ["read"], expiresAt: 9e9 };

function skillText(name: string, metadata = ""): string {
  const block = metadata.length === 0 ? "" : `metadata:\n${metadata}`;
  return `---\nname: ${name}\ndescription: The skill ${name}.\n${block}---\n\n# ${name}\n`;
}

const SCOPED = "  auth: required\n  scopes: read\n";

async function rootOf(files: Record<string, string>): Promise<string> {
  const dir = await makeDir();
  await writeFiles(dir, files);
  return dir;
}

const good = await rootOf({
  "alpha/SKILL.md": skillText("alpha"),
  "alpha/references/guide.md": "# guide\n",
  "beta/SKILL.md": skillText("beta", SCOPED),
});
const other = await rootOf({
  "alpha/SKILL.md": skillText("alpha", "  auth: none\n"),
  "gamma/SKILL.md": skillText("gamma"),
});
const wrongName = await rootOf({ "one/SKILL.md": skillText("two") });
const noDescription = await rootOf({ "one/SKILL.md": "---\nname: one\n---\n\nbody\n" });
const badPolicy = await rootOf({ "one/SKILL.md": skillText("one", "  auth: sometimes\n") });
const badKind = await rootOf({ "one/SKILL.md": skillText("one", "  kinds: robot\n") });
const noFrontmatter = await rootOf({ "one/SKILL.md": "# no frontmatter\n" });
const empty = await makeDir();
await mkdir(join(empty, "one"));
const binary = await makeDir();
await mkdir(join(binary, "one"));
await writeFile(join(binary, "one", "SKILL.md"), skillText("one"));
await writeFile(join(binary, "one", "data.bin"), new Uint8Array([0xff, 0xfe, 0xfd]));
const missing = await makeDir();

const OVERRIDE = {
  name: "books",
  files: { "SKILL.md": skillText("books"), "extra.md": "extra\n" },
};
const GUIDE_FILE = { path: "references/guide.md", content: "# guide\n" };
const SKILL_ALPHA = {
  name: "alpha",
  files: { "SKILL.md": skillText("alpha"), "references/guide.md": "# guide\n" },
  auth: AuthMode.None,
};
const SKILL_BETA = {
  name: "beta",
  files: { "SKILL.md": skillText("beta", SCOPED) },
  auth: AuthMode.Required,
  policy: { requiredScopes: ["read"] },
};

unit(exceedsSkillLimits, {
  positive: [
    positive("accepts a small skill", [{ "SKILL.md": "x" }], false),
    positive("accepts exactly the file limit", [files(512, 1)], false),
  ],
  negative: [
    rejected("flags more files than the limit", [files(513, 1)], true),
    rejected("flags more bytes than the limit", [files(1, 16 * 1024 * 1024 + 1)], true),
  ],
});

function files(count: number, size: number): Record<string, string> {
  return Object.fromEntries(
    Array.from({ length: count }, (_, index) => [`f${index}.md`, "x".repeat(size)]),
  );
}

unit(skillFileNames, {
  positive: [
    positive(
      "lists every file below the skill, sorted",
      [join(good, "alpha")],
      ["SKILL.md", "references/guide.md"],
    ),
    positive("lists a single file", [join(good, "beta")], ["SKILL.md"]),
  ],
  negative: [
    negative("fails for a directory that does not exist", [join(good, "nowhere")], {
      code: "ENOENT",
    }),
    negative("fails for a second directory that does not exist", [join(good, "none")], {
      code: "ENOENT",
    }),
  ],
});

unit(inspectSkill, {
  positive: [
    positive("accepts a public skill with its supporting file", [good, "alpha"], {
      skill: SKILL_ALPHA,
      problems: [],
    }),
    positive("reads the policy from the metadata", [good, "beta"], {
      skill: SKILL_BETA,
      problems: [],
    }),
  ],
  negative: [
    rejected("flags a name that differs from the directory", [wrongName, "one"], {
      problems: [expect.stringContaining('must match the last path segment "one"')],
    }),
    rejected("flags a missing description", [noDescription, "one"], {
      problems: [expect.stringContaining("must contain string")],
    }),
    rejected("flags a missing frontmatter", [noFrontmatter, "one"], {
      problems: [expect.stringContaining("must begin with")],
    }),
    rejected("flags an unknown auth mode", [badPolicy, "one"], {
      problems: [expect.stringContaining("access policy")],
    }),
    rejected("flags an unknown principal kind", [badKind, "one"], {
      problems: [expect.stringContaining("access policy")],
    }),
    rejected("flags a directory with no files", [empty, "one"], {
      problems: [expect.stringContaining("holds no files")],
    }),
    rejected("flags a file that is not text", [binary, "one"], {
      problems: [expect.stringContaining("not valid UTF-8")],
    }),
  ],
});

unit(skillPackageProblems, {
  positive: [
    positive("finds nothing wrong with compliant skills", [good], []),
    positive("finds nothing wrong with a directory that does not exist", [missing], []),
  ],
  negative: [
    rejected(
      "names the file with the wrong name",
      [wrongName],
      [expect.stringContaining(join(wrongName, "one", "SKILL.md"))],
    ),
    rejected(
      "names the skill without a description",
      [noDescription],
      [expect.stringContaining(join(noDescription, "one", "SKILL.md"))],
    ),
  ],
});

unit(loadPackageSkills, {
  positive: [
    positive("loads the valid skills sorted by name", [[good]], [SKILL_ALPHA, SKILL_BETA]),
    positive(
      "keeps the skill of the first directory when two share a name",
      [[good, other]],
      [SKILL_ALPHA, SKILL_BETA, expect.objectContaining({ name: "gamma" })],
    ),
  ],
  negative: [
    rejected("skips every invalid skill", [[wrongName, noDescription, badPolicy]], []),
    rejected("loads nothing from directories that do not exist", [[missing]], []),
  ],
});

const CAPABILITY = await defineCapability({
  id: "books.open",
  version: ApiVersion.V1,
  method: MethodKind.Get,
  resource: "publishers/{publisher}/books/{book}",
  summary: "summary",
  description: "description",
  auth: AuthMode.None,
  input: z.strictObject({ name: z.string() }),
  output: z.object({ echoed: z.string() }),
  handler: () => ({ echoed: "x" }),
} as CapabilityDefinition<z.ZodType, z.ZodType>);

async function optionsFor(dirs: string[], authEnabled = true): Promise<SkillAppOptions> {
  const registry = new CapabilityRegistry();
  await registry.register(CAPABILITY.id, () => CAPABILITY);
  return {
    source: registry,
    visible: async (capability, principal) => visibleTo(engine, capability, principal),
    allowed: async (block, principal) => allowedBy(engine, block, principal),
    authEnabled,
    skillDirs: dirs,
  };
}

const served = await optionsFor([good]);
const overriding = await optionsFor([
  await rootOf({ "books/SKILL.md": skillText("books"), "books/extra.md": "extra\n" }),
]);
const noPackages = await optionsFor([]);
const authOff = await optionsFor([good], false);
const SUMMARY = (name: string) =>
  expect.objectContaining({
    name,
    uri: `skill://${name}/SKILL.md`,
    digest: expect.stringMatching(/^sha256:/),
  });

unit(visibleBundles, {
  positive: [
    positive(
      "serves generated and package skills to a caller who holds the scope",
      [served, READER],
      [
        { name: "alpha", files: SKILL_ALPHA.files },
        { name: "beta", files: SKILL_BETA.files },
        expect.objectContaining({ name: "books" }),
      ],
    ),
    positive(
      "replaces a generated skill with the package skill of the same name",
      [overriding, ANONYMOUS_PRINCIPAL],
      [OVERRIDE],
    ),
  ],
  negative: [
    rejected(
      "hides a skill that needs a token from an anonymous caller",
      [served, ANONYMOUS_PRINCIPAL],
      [{ name: "alpha", files: SKILL_ALPHA.files }, expect.objectContaining({ name: "books" })],
    ),
    rejected(
      "hides a skill whose scope the caller lacks",
      [served, { ...READER, scopes: [] }],
      [{ name: "alpha", files: SKILL_ALPHA.files }, expect.objectContaining({ name: "books" })],
    ),
    rejected(
      "hides every skill that needs a token when authentication is off",
      [authOff, READER],
      [{ name: "alpha", files: SKILL_ALPHA.files }, expect.objectContaining({ name: "books" })],
    ),
  ],
});

unit(listVisibleSkills, {
  positive: [
    positive(
      "lists every visible skill with its digest",
      [served, READER],
      [SUMMARY("alpha"), SUMMARY("beta"), SUMMARY("books")],
    ),
    positive(
      "lists the generated skill when no package is configured",
      [noPackages, READER],
      [SUMMARY("books")],
    ),
  ],
  negative: [
    rejected(
      "leaves out the skill that needs a token for an anonymous caller",
      [served, ANONYMOUS_PRINCIPAL],
      [SUMMARY("alpha"), SUMMARY("books")],
    ),
    rejected(
      "leaves out the skill whose scope is missing",
      [served, { ...READER, scopes: [] }],
      [SUMMARY("alpha"), SUMMARY("books")],
    ),
  ],
});

const ALPHA_DOCUMENT = {
  name: "alpha",
  description: "The skill alpha.",
  uri: "skill://alpha/SKILL.md",
  digest: expect.stringMatching(/^sha256:/),
  files: [{ path: "SKILL.md", content: SKILL_ALPHA.files["SKILL.md"] }, GUIDE_FILE],
};

unit(readVisibleSkill, {
  positive: [
    positive(
      "returns the files of a package skill, sorted",
      [served, READER, "alpha"],
      ALPHA_DOCUMENT,
    ),
    positive(
      "returns a generated skill",
      [served, READER, "books"],
      expect.objectContaining({
        name: "books",
      }),
    ),
  ],
  negative: [
    rejected(
      "returns nothing for a skill that does not exist",
      [served, READER, "nothing"],
      undefined,
    ),
    rejected(
      "returns nothing for a skill the caller may not read",
      [served, ANONYMOUS_PRINCIPAL, "beta"],
      undefined,
    ),
  ],
});

function context(info?: AuthInfo): ServerContext {
  return { http: info === undefined ? undefined : { authInfo: info } } as unknown as ServerContext;
}

describe("the skills extension source serves package skills", () => {
  test("lists package skills next to the generated one", async () => {
    const { skills } = await (await createSkillSource(served)).list({}, context(TOKEN));
    expect(skills.map((skill) => skill.frontmatter.name)).toEqual(["alpha", "beta", "books"]);
  });

  test("hides a guarded package skill from an anonymous caller", async () => {
    const { skills } = await (await createSkillSource(served)).list({}, context());
    expect(skills.map((skill) => skill.frontmatter.name)).toEqual(["alpha", "books"]);
  });

  test("get refuses a guarded skill for an anonymous caller", async () => {
    expect(
      await (await createSkillSource(served)).get("skill://beta/SKILL.md", context()),
    ).toBeUndefined();
  });

  test("get returns the entry with a digest for an allowed caller", async () => {
    const entry = await (await createSkillSource(served)).get(
      "skill://beta/SKILL.md",
      context(TOKEN),
    );
    expect(entry?.frontmatter.name).toBe("beta");
  });

  test.each([
    ["the main file", "skill://alpha/SKILL.md", "text/markdown", "# alpha"],
    ["a supporting markdown file", "skill://alpha/references/guide.md", "text/markdown", "# guide"],
  ])("read serves %s", async (_name, uri, mimeType, text) => {
    expect(await (await createSkillSource(served)).read(uri, context())).toMatchObject({
      mimeType,
      text: expect.stringContaining(text),
    });
  });

  test("read refuses a guarded skill for an anonymous caller", async () => {
    expect(
      await (await createSkillSource(served)).read("skill://beta/SKILL.md", context()),
    ).toBeUndefined();
  });

  test("names are the same through the bundle view", async () => {
    expect((await visibleBundles(served, READER)).map((bundle) => bundle.name)).toEqual([
      "alpha",
      "beta",
      "books",
    ]);
  });
});
