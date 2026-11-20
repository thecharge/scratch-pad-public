import { afterAll, describe, expect, test } from "bun:test";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { SkillsClient } from "@modelcontextprotocol/client/ext/skills";
import { AuthScheme, EndpointPath, HttpHeader, SkillCapabilityId } from "@platform/constants";
import {
  ADMIN_SCOPES,
  PACKAGE_SKILL_DIRS,
  READER_SCOPES,
  tokenFor,
} from "@platform/test-framework";
import { SkillDocumentSchema, SkillListSchema } from "@platform/types";
import { all } from "@platform/util";
import {
  finishProxyIntegration,
  proxyBackendRefused,
  proxyFixture,
} from "../../packages/scenarios/src/integration-proxy-client.ts";

const PUBLIC_SKILL = "working-with-books";
const GUARDED_SKILL = "operating-the-service";
const GENERATED_SKILL = "books";

async function boot() {
  const { issuer, origin } = await proxyFixture({
    enabled: true,
    domain: "skills.e2e",
    reindexStepMs: 0,
    skillDirs: [...PACKAGE_SKILL_DIRS],
  });
  const as = async (scopes: readonly string[]) => {
    const headers =
      scopes.length === 0
        ? {}
        : {
            [HttpHeader.Authorization]: [AuthScheme.Bearer, await tokenFor(issuer, scopes)].join(
              " ",
            ),
          };
    const transport = new StreamableHTTPClientTransport(
      new URL([origin, EndpointPath.Mcp].join("")),
      { requestInit: { headers } },
    );
    const client = new Client({ name: "skills-e2e", version: "1" });
    await client.connect(transport);
    return client;
  };
  return { as };
}

async function listedNames(client: Client): Promise<string[]> {
  const { skills } = await new SkillsClient(client).list();
  return skills.map((skill) => skill.frontmatter.name).sort();
}

async function toolSkills(client: Client): Promise<string[]> {
  const result = await client.callTool({ name: SkillCapabilityId.List, arguments: {} });
  return SkillListSchema.parse(result.structuredContent)
    .skills.map((skill) => skill.name)
    .sort();
}

describe("package skills through the Skills extension", () => {
  test("skills/list publishes the package skills next to the generated ones", async () => {
    const { as } = await boot();
    const names = await listedNames(await as(ADMIN_SCOPES));
    expect(names).toEqual(expect.arrayContaining([PUBLIC_SKILL, GUARDED_SKILL, GENERATED_SKILL]));
  });

  test("skills/get and a verified read return the package skill with its digest", async () => {
    const { as } = await boot();
    const skills = new SkillsClient(await as(READER_SCOPES));
    const { skill } = await skills.get(`skill://${PUBLIC_SKILL}/SKILL.md`);
    const main = await skills.read(skill);
    const reference = await skills.read(skill, "references/fields.md");
    expect([
      skill.frontmatter.name,
      main.verified,
      main.text?.includes("books.list"),
      reference.verified,
      reference.text?.includes("ETAG_MISMATCH"),
    ]).toEqual([PUBLIC_SKILL, true, true, true, true]);
  });
});

describe("package skills through the skills tools", () => {
  test("skills.list names the same skills as skills/list", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    expect(await toolSkills(client)).toEqual(await listedNames(client));
  });

  test("skills.get returns the same content and digest as the extension", async () => {
    const { as } = await boot();
    const client = await as(READER_SCOPES);
    const skills = new SkillsClient(client);
    const { skill } = await skills.get(`skill://${PUBLIC_SKILL}/SKILL.md`);
    const main = await skills.read(skill);
    const result = await client.callTool({
      name: SkillCapabilityId.Get,
      arguments: { name: `skills/${PUBLIC_SKILL}` },
    });
    const document = SkillDocumentSchema.parse(result.structuredContent);
    const entry = skill.resources === "dynamic" ? undefined : skill.resources[0];
    expect([
      document.files.find((file) => file.path === "SKILL.md")?.content,
      document.digest,
    ]).toEqual([main.text, entry?.digest]);
  });
});

describe("package skills follow the policy", () => {
  test.each([
    ["a reader", READER_SCOPES],
    ["an anonymous caller", [] as string[]],
  ])("%s is not offered the skill for administrators on either path", async (_name, scopes) => {
    const { as } = await boot();
    const client = await as(scopes);
    const [extension = [], tool = []] = await all([
      async () => listedNames(client),
      async () => toolSkills(client),
    ]);
    expect([extension.includes(GUARDED_SKILL), tool.includes(GUARDED_SKILL)]).toEqual([
      false,
      false,
    ]);
  });

  test.each([
    ["a reader", READER_SCOPES],
    ["an anonymous caller", [] as string[]],
  ])("%s does not receive the guarded skill from skills.get", async (_name, scopes) => {
    const { as } = await boot();
    const client = await as(scopes);
    const result = await client.callTool({
      name: SkillCapabilityId.Get,
      arguments: { name: `skills/${GUARDED_SKILL}` },
    });
    expect(result.isError).toBe(true);
  });

  test("skills/get does not return the guarded skill to a reader", async () => {
    const { as } = await boot();
    const skills = new SkillsClient(await as(READER_SCOPES));
    await expect(skills.get(`skill://${GUARDED_SKILL}/SKILL.md`)).rejects.toThrow();
  });

  test("an administrator receives the guarded skill on both paths", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    const skills = new SkillsClient(client);
    const { skill } = await skills.get(`skill://${GUARDED_SKILL}/SKILL.md`);
    const result = await client.callTool({
      name: SkillCapabilityId.Get,
      arguments: { name: `skills/${GUARDED_SKILL}` },
    });
    expect([
      skill.frontmatter.name,
      SkillDocumentSchema.parse(result.structuredContent).name,
    ]).toEqual([GUARDED_SKILL, GUARDED_SKILL]);
  });
});

afterAll(finishProxyIntegration);

test("the edge consumer cannot reach the API directly", async () => {
  expect(await proxyBackendRefused()).toBe(true);
});
