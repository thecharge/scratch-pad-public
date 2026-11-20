import { join } from "node:path";
import {
  COVERAGE_DECLARATION_SUFFIX,
  COVERAGE_EXCLUDED,
  COVERAGE_NON_CODE_LINE,
  LcovTag,
  Separator,
  Text,
  UNIT_SOURCE_GLOBS,
} from "@platform/constants";
import { filterAsync } from "@platform/store";
import type { CoverageGap, LcovFile } from "@platform/types";
import { all } from "@platform/util";
import { REPO_ROOT } from "./tools.ts";

const RADIX = 10;
const LINE_NUMBER = 0;
const LINE_HITS = 1;

async function number(value: string): Promise<number> {
  return Number.parseInt(value, RADIX);
}

async function emptyFile(file: string): Promise<LcovFile> {
  return { file, lines: {}, functionsFound: 0, functionsHit: 0 };
}

export async function parseLcov(text: string): Promise<LcovFile[]> {
  const files: LcovFile[] = [];
  let current: LcovFile | undefined;
  for (const line of text.split(Text.Newline)) {
    if (line.startsWith(LcovTag.SourceFile)) {
      current = await emptyFile(line.slice(LcovTag.SourceFile.length));
      files.push(current);
    } else if (current !== undefined && line.startsWith(LcovTag.Line)) {
      const parts = line.slice(LcovTag.Line.length).split(Separator.List);
      current.lines[parts[LINE_NUMBER] as string] = await number(parts[LINE_HITS] as string);
    } else if (current !== undefined && line.startsWith(LcovTag.FunctionsFound)) {
      current.functionsFound = await number(line.slice(LcovTag.FunctionsFound.length));
    } else if (current !== undefined && line.startsWith(LcovTag.FunctionsHit)) {
      current.functionsHit = await number(line.slice(LcovTag.FunctionsHit.length));
    }
  }
  return files;
}

async function settled(file: LcovFile, runs: number, listed: Record<string, number>) {
  const lines = Object.fromEntries(
    Object.entries(file.lines).filter(([line, hits]) => hits > 0 || listed[line] === runs),
  );
  return { ...file, lines };
}

export async function mergeLcov(runs: readonly (readonly LcovFile[])[]): Promise<LcovFile[]> {
  const merged = new Map<string, LcovFile>();
  const runCount = new Map<string, number>();
  const listings = new Map<string, Record<string, number>>();
  for (const file of runs.flat()) {
    const known = merged.get(file.file) ?? (await emptyFile(file.file));
    const listed = listings.get(file.file) ?? {};
    for (const [line, hits] of Object.entries(file.lines)) {
      known.lines[line] = Math.max(known.lines[line] ?? 0, hits);
      listed[line] = (listed[line] ?? 0) + 1;
    }
    known.functionsFound = Math.max(known.functionsFound, file.functionsFound);
    known.functionsHit = Math.max(known.functionsHit, file.functionsHit);
    merged.set(file.file, known);
    listings.set(file.file, listed);
    runCount.set(file.file, (runCount.get(file.file) ?? 0) + 1);
  }
  return await all(
    [...merged.values()].map(
      (file) => async () =>
        settled(file, runCount.get(file.file) ?? 0, listings.get(file.file) ?? {}),
    ),
  );
}

export async function productFiles(files: readonly LcovFile[]): Promise<LcovFile[]> {
  return files.filter((file) => !COVERAGE_EXCLUDED.some((pattern) => pattern.test(file.file)));
}

async function sourceLines(root: string, file: string): Promise<string[] | undefined> {
  const source = Bun.file(join(root, file));
  return (await source.exists()) ? (await source.text()).split(Text.Newline) : undefined;
}

async function isCode(lines: readonly string[] | undefined, line: number): Promise<boolean> {
  const text = lines?.[line - 1];
  return text === undefined || !COVERAGE_NON_CODE_LINE.test(text);
}

export async function coverageGaps(
  files: readonly LcovFile[],
  root: string = REPO_ROOT,
): Promise<CoverageGap[]> {
  return (
    await all(
      (
        await productFiles(files)
      ).map((file) => async () => {
        const lines = await sourceLines(root, file.file);
        const missed = await all(
          Object.entries(file.lines)
            .filter(([, hits]) => hits === 0)
            .map(
              ([line]) =>
                async () =>
                  number(line),
            ),
        );
        const code = await filterAsync(missed, async (line) => isCode(lines, line));
        return {
          file: file.file,
          uncoveredLines: code.sort((left, right) => left - right),
          functionsMissing: file.functionsFound - file.functionsHit,
        };
      }),
    )
  ).filter((gap) => gap.uncoveredLines.length > 0 || gap.functionsMissing > 0);
}

export async function unloadedProducts(
  files: readonly LcovFile[],
  root: string = REPO_ROOT,
): Promise<CoverageGap[]> {
  const loaded = new Set(files.map((file) => file.file));
  const listed = await all(
    UNIT_SOURCE_GLOBS.map(
      (glob) => async () => Array.fromAsync(new Bun.Glob(glob).scan({ cwd: root })),
    ),
  );
  return listed
    .flat()
    .filter(
      (file) =>
        !loaded.has(file) &&
        !file.endsWith(COVERAGE_DECLARATION_SUFFIX) &&
        !COVERAGE_EXCLUDED.some((pattern) => pattern.test(file)),
    )
    .sort()
    .map((file) => ({ file, uncoveredLines: [], functionsMissing: 1 }));
}
