import { afterAll, expect } from "bun:test";
import { CapabilityRegistry } from "@platform/capability";
import {
  AuthMode,
  ErrorReason,
  MethodKind,
  PrincipalKind,
  SkillCapabilityId,
  TransportKind,
} from "@platform/constants";
import { allowedBy, DeclarativePolicyEngine, visibleTo } from "@platform/policy";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { fakeDeps, makeDir, removeAll, writeFiles } from "@platform/test-scenarios";
import {
  ANONYMOUS_PRINCIPAL,
  type CapabilityContext,
  type Principal,
  type SkillAppOptions,
} from "@platform/types";
import {
  getSkill,
  getSkillHandler,
  listSkills,
  listSkillsHandler,
} from "../../../apps/api/src/capabilities/skills.ts";
import { idleSkillOptions } from "../../../apps/api/src/idle.ts";

afterAll(removeAll);

const engine = new DeclarativePolicyEngine();
const READER: Principal = {
  kind: PrincipalKind.User,
  subject: "reader",
  scopes: ["read"],
  roles: [],
};

function contextOf(principal: Principal): CapabilityContext {
  return { principal, requestId: "request", transport: TransportKind.Mcp, authEnabled: true };
}

function skillText(name: string, metadata = ""): string {
  const block = metadata.length === 0 ? "" : `metadata:\n${metadata}`;
  return `---\nname: ${name}\ndescription: The skill ${name}.\n${block}---\n\n# ${name}\n`;
}

const dir = await makeDir();
await writeFiles(dir, {
  "alpha/SKILL.md": skillText("alpha"),
  "beta/SKILL.md": skillText("beta", "  auth: required\n  scopes: read\n"),
});
const registry = new CapabilityRegistry();

async function provide(): Promise<SkillAppOptions> {
  return {
    source: registry,
    visible: async (capability, principal) => visibleTo(engine, capability, principal),
    allowed: async (block, principal) => allowedBy(engine, block, principal),
    authEnabled: true,
    skillDirs: [dir],
  };
}

async function idle(): Promise<SkillAppOptions> {
  return idleSkillOptions(registry);
}

const SUMMARY = (name: string) =>
  expect.objectContaining({ name, uri: `skill://${name}/SKILL.md` });
const PAGING = await fakeDeps();
const NOT_BETA = expect.not.objectContaining({ name: "beta" });
const ALPHA_DOCUMENT = expect.objectContaining({
  name: "alpha",
  files: [expect.objectContaining({ path: "SKILL.md" })],
});
const ANONYMOUS = contextOf(ANONYMOUS_PRINCIPAL);
const AS_READER = contextOf(READER);
const SIGNED_NAME = { name: "skills/beta" };
const PUBLIC_NAME = { name: "skills/alpha" };

unit(listSkillsHandler, {
  positive: [
    positive(
      "lists every skill a reader may see",
      [provide, {}, AS_READER, PAGING.codec, PAGING.limits],
      {
        skills: [SUMMARY("alpha"), SUMMARY("beta")],
        nextPageToken: "",
      },
    ),
    positive(
      "lists the public skill to an anonymous caller",
      [provide, {}, ANONYMOUS, PAGING.codec, PAGING.limits],
      {
        skills: [SUMMARY("alpha")],
        nextPageToken: "",
      },
    ),
  ],
  negative: [
    rejected(
      "leaves out the guarded skill for an anonymous caller",
      [provide, {}, ANONYMOUS, PAGING.codec, PAGING.limits],
      {
        skills: [NOT_BETA],
        nextPageToken: "",
      },
    ),
    rejected(
      "lists nothing when no skill options are configured",
      [idle, {}, AS_READER, PAGING.codec, PAGING.limits],
      {
        skills: [],
        nextPageToken: "",
      },
    ),
  ],
});

unit(getSkillHandler, {
  positive: [
    positive(
      "returns the guarded skill to a reader",
      [provide, SIGNED_NAME, AS_READER],
      expect.objectContaining({ name: "beta" }),
    ),
    positive(
      "returns the public skill to an anonymous caller",
      [provide, PUBLIC_NAME, ANONYMOUS],
      ALPHA_DOCUMENT,
    ),
  ],
  negative: [
    negative(
      "does not reveal the guarded skill to an anonymous caller",
      [provide, SIGNED_NAME, ANONYMOUS],
      { reason: ErrorReason.ResourceNotFound },
    ),
    negative(
      "does not find a skill that does not exist",
      [provide, { name: "skills/nothing" }, AS_READER],
      { reason: ErrorReason.ResourceNotFound },
    ),
    negative(
      "rejects a name that is not a skill resource name",
      [provide, { name: "beta" }, AS_READER],
      { reason: ErrorReason.InvalidResourceName },
    ),
    negative("finds nothing when no skill options are configured", [idle, PUBLIC_NAME, AS_READER], {
      reason: ErrorReason.ResourceNotFound,
    }),
  ],
});

unit(listSkills, {
  positive: [
    positive(
      "is the list operation of the skills collection",
      [provide],
      expect.objectContaining({
        id: SkillCapabilityId.List,
        method: MethodKind.List,
      }),
    ),
    positive(
      "accepts a token but does not require one",
      [provide],
      expect.objectContaining({
        auth: AuthMode.Optional,
      }),
    ),
  ],
  negative: [
    rejected(
      "is not the get operation",
      [provide],
      expect.not.objectContaining({
        id: SkillCapabilityId.Get,
      }),
    ),
    rejected(
      "does not require a token",
      [provide],
      expect.not.objectContaining({
        auth: AuthMode.Required,
      }),
    ),
  ],
});

unit(getSkill, {
  positive: [
    positive(
      "is the get operation of one skill",
      [provide],
      expect.objectContaining({
        id: SkillCapabilityId.Get,
        method: MethodKind.Get,
      }),
    ),
    positive(
      "accepts a token but does not require one",
      [provide],
      expect.objectContaining({
        auth: AuthMode.Optional,
      }),
    ),
  ],
  negative: [
    rejected(
      "is not the list operation",
      [provide],
      expect.not.objectContaining({
        id: SkillCapabilityId.List,
      }),
    ),
    rejected(
      "does not require a token",
      [provide],
      expect.not.objectContaining({
        auth: AuthMode.Required,
      }),
    ),
  ],
});

unit(idleSkillOptions, {
  positive: [
    positive("serves no package directory", [registry], expect.objectContaining({ skillDirs: [] })),
    positive(
      "keeps the given capability source",
      [registry],
      expect.objectContaining({
        source: registry,
      }),
    ),
  ],
  negative: [
    rejected(
      "does not enable authentication",
      [registry],
      expect.not.objectContaining({
        authEnabled: true,
      }),
    ),
    rejected(
      "does not point at a directory",
      [registry],
      expect.not.objectContaining({
        skillDirs: ["skills"],
      }),
    ),
  ],
});
