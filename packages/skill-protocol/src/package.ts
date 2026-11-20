import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { SkillCatalogError, skillEntry } from "@modelcontextprotocol/server/ext/skills";
import {
  Encoding,
  MessageId,
  SKILL_MAX_BYTES,
  SKILL_MAX_RESOURCES,
  SKILL_METADATA_KEY,
  SkillFileName,
} from "@platform/constants";
import { message } from "@platform/messages";
import {
  type PackageSkill,
  type SkillAccess,
  type SkillAccessResult,
  SkillAccessSchema,
  type SkillFiles,
  SkillFilesSchema,
  type SkillInspection,
} from "@platform/types";
import { all } from "@platform/util";
import { exceedsSkillLimits } from "./generate.ts";

const DECODER = new TextDecoder(Encoding.Utf8, { fatal: true });

async function decoded(bytes: Uint8Array): Promise<string | undefined> {
  try {
    return DECODER.decode(bytes);
  } catch {
    return undefined;
  }
}

async function directories(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true }).catch(() => []);
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

export async function skillFileNames(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(directory, join(entry.parentPath, entry.name)))
    .sort();
}

async function frontmatterResult(
  name: string,
  files: SkillFiles,
  path: string,
  entryOf: typeof skillEntry,
): Promise<SkillAccessResult> {
  const main = join(path, SkillFileName.Main);
  try {
    const entry = await entryOf(name, files);
    const access = SkillAccessSchema.safeParse(entry.frontmatter[SKILL_METADATA_KEY] ?? {});
    return access.success
      ? { access: access.data, problems: [] }
      : { problems: [message(MessageId.SkillPackagePolicy, { path: main })] };
  } catch (error) {
    if (error instanceof SkillCatalogError) {
      return {
        problems: error.problems.map((problem) =>
          message(MessageId.SkillPackageProblem, { path: main, problem: problem.message }),
        ),
      };
    }
    throw error;
  }
}

async function packageSkillOf(
  name: string,
  files: SkillFiles,
  access: SkillAccess,
): Promise<PackageSkill> {
  const policy = access.policy === undefined ? {} : { policy: access.policy };
  return { name, files, auth: access.auth, ...policy };
}

export async function inspectSkill(
  root: string,
  name: string,
  entryOf: typeof skillEntry = skillEntry,
): Promise<SkillInspection> {
  const path = join(root, name);
  const names = await skillFileNames(path);
  if (names.length === 0) {
    return { problems: [message(MessageId.SkillPackageEmpty, { path })] };
  }
  const texts = await all(
    names.map((file) => async () => decoded(await readFile(join(path, file)))),
  );
  const unreadable = names
    .filter((_file, index) => texts[index] === undefined)
    .map((file) => message(MessageId.SkillPackageEncoding, { path: join(path, file) }));
  if (unreadable.length > 0) {
    return { problems: unreadable };
  }
  const files = SkillFilesSchema.parse(
    Object.fromEntries(names.map((file, index) => [file, texts[index]])),
  );
  if (await exceedsSkillLimits(files)) {
    return {
      problems: [
        message(MessageId.SkillPackageLimit, {
          path,
          resources: SKILL_MAX_RESOURCES,
          bytes: SKILL_MAX_BYTES,
        }),
      ],
    };
  }
  const found = await frontmatterResult(name, files, path, entryOf);
  return found.access === undefined
    ? { problems: found.problems }
    : { skill: await packageSkillOf(name, files, found.access), problems: [] };
}

export async function skillPackageProblems(root: string): Promise<string[]> {
  const inspected = await all(
    (await directories(root)).map((name) => async () => inspectSkill(root, name)),
  );
  return inspected.flatMap((result) => result.problems);
}

export async function loadPackageSkills(roots: readonly string[]): Promise<PackageSkill[]> {
  const inspected = await all(
    roots.map(
      (root) => async () =>
        all((await directories(root)).map((name) => async () => inspectSkill(root, name))),
    ),
  );
  const skills = inspected
    .flat()
    .flatMap((result) => (result.skill === undefined ? [] : [result.skill]));
  const first = skills.filter(
    (skill, index) => skills.findIndex((other) => other.name === skill.name) === index,
  );
  return first.sort((left, right) =>
    left.name < right.name ? -1 : Number(left.name > right.name),
  );
}
