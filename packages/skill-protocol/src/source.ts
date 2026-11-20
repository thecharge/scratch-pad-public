import type { ServerContext } from "@modelcontextprotocol/server";
import {
  type Skill,
  type SkillReadResult,
  type SkillSource,
  SkillsExtension,
  skillEntry,
} from "@modelcontextprotocol/server/ext/skills";
import { isCallable, principalFromAuthInfo } from "@platform/auth";
import {
  FileSuffix,
  MediaType,
  Separator,
  SKILL_BASE_URI,
  SKILL_DYNAMIC_RESOURCES,
  SkillFileName,
  Text,
} from "@platform/constants";
import { filterAsync, findAsync } from "@platform/store";
import {
  ANONYMOUS_PRINCIPAL,
  type Capability,
  type PackageSkill,
  type Principal,
  type ReferenceCache,
  type SkillAppOptions,
  type SkillBundle,
  type SkillDocument,
  type SkillGroup,
  type SkillLocation,
  type SkillSummary,
} from "@platform/types";
import { all } from "@platform/util";
import { assertSkillLimits, groupCapabilities, skillFilesFor } from "./generate.ts";
import { loadPackageSkills } from "./package.ts";

export async function getPrincipal(context: ServerContext): Promise<Principal> {
  const info = context.http?.authInfo;
  return info === undefined
    ? ANONYMOUS_PRINCIPAL
    : await principalFromAuthInfo({ ...info, expiresAt: info.expiresAt ?? 0 });
}

async function visibleGroups(
  options: SkillAppOptions,
  principal: Principal,
): Promise<SkillGroup[]> {
  const usable = async (capability: Capability) =>
    (await isCallable(capability.auth, principal, options.authEnabled)) &&
    (await options.visible(capability, principal));
  const listed = await options.source.list();
  const flags = await all(listed.map((item) => async () => usable(item)));
  return groupCapabilities(listed.filter((_capability, index) => flags[index]));
}

async function permitted(
  options: SkillAppOptions,
  principal: Principal,
  skill: PackageSkill,
): Promise<boolean> {
  return (
    (await isCallable(skill.auth, principal, options.authEnabled)) &&
    (skill.policy === undefined || (await options.allowed(skill.policy, principal)))
  );
}

async function bundleOf(group: SkillGroup, references?: ReferenceCache): Promise<SkillBundle> {
  return { name: group.name, files: await skillFilesFor(group, references) };
}

export async function visibleBundles(
  options: SkillAppOptions,
  principal: Principal,
): Promise<SkillBundle[]> {
  const generated = await all(
    (await visibleGroups(options, principal)).map(
      (item) => async () => bundleOf(item, options.references),
    ),
  );
  const packaged = await filterAsync(await loadPackageSkills(options.skillDirs), async (skill) =>
    permitted(options, principal, skill),
  );
  const names = packaged.map((skill) => skill.name);
  return [
    ...generated.filter((bundle) => !names.includes(bundle.name)),
    ...packaged.map(({ name, files }) => ({ name, files })),
  ].sort((left, right) => (left.name < right.name ? -1 : Number(left.name > right.name)));
}

async function locate(uri: string): Promise<SkillLocation> {
  const [group = Text.Empty, ...rest] = uri.slice(SKILL_BASE_URI.length).split(Separator.Resource);
  return { group, path: rest.join(Separator.Resource) };
}

async function entryFor(bundle: SkillBundle): Promise<Skill> {
  await assertSkillLimits(bundle.name, bundle.files);
  return skillEntry(bundle.name, bundle.files, { baseUri: SKILL_BASE_URI });
}

async function summaryOf(bundle: SkillBundle): Promise<SkillSummary> {
  const entry = await entryFor(bundle);
  const resources = entry.resources === SKILL_DYNAMIC_RESOURCES ? [] : entry.resources;
  return {
    name: bundle.name,
    description: entry.frontmatter.description,
    uri: entry.uri,
    digest: resources.find((resource) => resource.uri === entry.uri)?.digest ?? Text.Empty,
  };
}

export async function listVisibleSkills(
  options: SkillAppOptions,
  principal: Principal,
): Promise<SkillSummary[]> {
  return all((await visibleBundles(options, principal)).map((item) => async () => summaryOf(item)));
}

export async function readVisibleSkill(
  options: SkillAppOptions,
  principal: Principal,
  name: string,
): Promise<SkillDocument | undefined> {
  const found = (await visibleBundles(options, principal)).find((bundle) => bundle.name === name);
  return found === undefined
    ? undefined
    : {
        ...(await summaryOf(found)),
        files: Object.entries(found.files)
          .sort(([left], [right]) => (left < right ? -1 : Number(left > right)))
          .map(([path, content]) => ({ path, content })),
      };
}

export async function createSkillSource(options: SkillAppOptions): Promise<SkillSource> {
  return {
    async list(_params, context) {
      const bundles = await visibleBundles(options, await getPrincipal(context));
      return { skills: await all(bundles.map((item) => async () => entryFor(item))) };
    },
    async get(uri, context) {
      const bundles = await visibleBundles(options, await getPrincipal(context));
      const found = await findAsync(
        bundles,
        async (bundle) => bundle.name === (await locate(uri)).group,
      );
      return found === undefined ? undefined : entryFor(found);
    },
    async read(uri, context): Promise<SkillReadResult | undefined> {
      const { group, path } = await locate(uri);
      const bundles = await visibleBundles(options, await getPrincipal(context));
      const found = bundles.find((candidate) => candidate.name === group);
      const file = path || SkillFileName.Main;
      const text = found === undefined ? undefined : found.files[file];
      const mimeType = file.endsWith(FileSuffix.Markdown)
        ? MediaType.Markdown
        : MediaType.PlainText;
      return text === undefined ? undefined : { text, mimeType };
    },
  };
}

export async function createSkillsExtension(options: SkillAppOptions): Promise<SkillsExtension> {
  return new SkillsExtension({ source: await createSkillSource(options), baseUri: SKILL_BASE_URI });
}
