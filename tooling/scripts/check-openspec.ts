import { basename, dirname, join } from "node:path";
import {
  Glyph,
  MessageId,
  RepoPath,
  SPEC_DELTA_GLOB,
  SPEC_FILE,
  SPEC_MAIN_GLOB,
  SPEC_PLACEHOLDER_PATTERN,
  SPEC_PURPOSE_PATTERN,
  SPEC_RENAME_PATTERN,
  SPEC_REQUIREMENT_PATTERN,
  SPEC_SECTION_PATTERN,
  SpecOperation,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

async function normalized(name: string): Promise<string> {
  return name.trim().replace(/\s+/g, Glyph.Space);
}

async function requirements(content: string): Promise<string[]> {
  return all(
    [...content.matchAll(SPEC_REQUIREMENT_PATTERN)].map(
      (match) => async () => normalized(match[1] ?? Text.Empty),
    ),
  );
}

export async function purposeProblems(content: string): Promise<string[]> {
  const purpose = SPEC_PURPOSE_PATTERN.exec(content)?.[1]?.trim();
  return !purpose || SPEC_PLACEHOLDER_PATTERN.test(purpose)
    ? [message(MessageId.SpecPurposeInvalid)]
    : [];
}

async function renameProblems(names: Set<string>, delta: string): Promise<string[]> {
  const problems: string[] = [];
  for (const match of delta.matchAll(SPEC_RENAME_PATTERN)) {
    const from = await normalized(match[1] ?? Text.Empty);
    const to = await normalized(match[2] ?? Text.Empty);
    if (!names.has(from)) {
      problems.push(message(MessageId.SpecTargetMissing, { name: from }));
    } else if (names.has(to)) {
      problems.push(message(MessageId.SpecTargetExists, { name: to }));
    } else {
      names.delete(from);
      names.add(to);
    }
  }
  return problems;
}

export async function deltaProblems(main: string, delta: string): Promise<string[]> {
  const names = new Set(await requirements(main));
  const problems = await renameProblems(names, delta);
  const sections = delta.split(SPEC_SECTION_PATTERN);
  for (let index = 1; index < sections.length; index += 2) {
    const operation = sections[index];
    const targets = await requirements(sections[index + 1] ?? Text.Empty);
    const adding = operation === SpecOperation.Added;
    const invalid = targets.filter((name) => names.has(name) === adding);
    problems.push(
      ...invalid.map((name) =>
        message(adding ? MessageId.SpecTargetExists : MessageId.SpecTargetMissing, { name }),
      ),
    );
  }
  return problems;
}

async function mainProblems(root: string, file: string): Promise<string[]> {
  const problems = await purposeProblems(await Bun.file(join(root, file)).text());
  return problems.map((problem) => [file, problem].join(`${Glyph.Colon}${Glyph.Space}`));
}

async function activeProblems(root: string, file: string): Promise<string[]> {
  const main = Bun.file(join(root, RepoPath.OpenSpecSpecs, basename(dirname(file)), SPEC_FILE));
  const content = (await main.exists()) ? await main.text() : Text.Empty;
  const problems = await deltaProblems(content, await Bun.file(join(root, file)).text());
  return problems.map((problem) => [file, problem].join(`${Glyph.Colon}${Glyph.Space}`));
}

export async function checkOpenSpec(root: string = REPO_ROOT): Promise<number> {
  const mains = await Array.fromAsync(new Bun.Glob(SPEC_MAIN_GLOB).scan({ cwd: root }));
  const deltas = await Array.fromAsync(new Bun.Glob(SPEC_DELTA_GLOB).scan({ cwd: root }));
  const problems = await all([
    ...mains.map((file) => async () => mainProblems(root, file)),
    ...deltas.map((file) => async () => activeProblems(root, file)),
  ]);
  return finish(problems.flat(), message(MessageId.SpecsOk));
}

if (import.meta.main) process.exit(await checkOpenSpec());
