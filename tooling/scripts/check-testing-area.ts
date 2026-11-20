import { basename, join } from "node:path";
import {
  MANIFEST_DEPENDENCY_SECTIONS,
  MessageId,
  TESTING_FILE_NAME,
  TESTING_HELPER_NAME,
  TESTING_IMPORTS,
  TESTING_MANIFEST_GLOB,
  TESTING_SCAN_EXCLUDED,
  TESTING_SCANNED_GLOBS,
  TESTING_STACK,
  TestingRule,
} from "@platform/constants";
import { message } from "@platform/messages";
import { flatMapAsync } from "@platform/store";
import type { SourceFile, TestingViolation } from "@platform/types";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

export async function outsideReason(source: SourceFile): Promise<string | undefined> {
  const name = basename(source.file);
  if (TESTING_FILE_NAME.test(name)) {
    return name;
  }
  if (TESTING_HELPER_NAME.test(name)) {
    return name;
  }
  return TESTING_IMPORTS.find((pattern) => pattern.test(source.text))?.source;
}

export async function outsideViolations(
  sources: readonly SourceFile[],
): Promise<TestingViolation[]> {
  return await flatMapAsync(sources, async (source) => {
    const detail = await outsideReason(source);
    return detail === undefined
      ? []
      : [{ file: source.file, rule: TestingRule.OutsideArea, detail }];
  });
}

export async function stackViolations(
  manifests: readonly SourceFile[],
): Promise<TestingViolation[]> {
  return manifests.flatMap((manifest) => {
    const parsed = JSON.parse(manifest.text);
    const below = TESTING_STACK.slice(0, TESTING_STACK.indexOf(parsed.name));
    const used = MANIFEST_DEPENDENCY_SECTIONS.flatMap((section) =>
      Object.keys(parsed[section] ?? {}),
    );
    return used
      .filter((name) => TESTING_STACK.includes(name) && !below.includes(name))
      .map((detail) => ({ file: manifest.file, rule: TestingRule.StackViolation, detail }));
  });
}

async function read(files: readonly string[], root: string): Promise<SourceFile[]> {
  return all(
    files.map((file) => async () => ({ file, text: await Bun.file(join(root, file)).text() })),
  );
}

export async function productSources(root: string = REPO_ROOT): Promise<SourceFile[]> {
  const found = await all(
    TESTING_SCANNED_GLOBS.map(
      (glob) => async () => Array.fromAsync(new Bun.Glob(glob).scan({ cwd: root })),
    ),
  );
  const files = found
    .flat()
    .filter((file) => !TESTING_SCAN_EXCLUDED.some((pattern) => pattern.test(file)))
    .sort();
  return read(files, root);
}

export async function testingManifests(root: string = REPO_ROOT): Promise<SourceFile[]> {
  const files = await Array.fromAsync(new Bun.Glob(TESTING_MANIFEST_GLOB).scan({ cwd: root }));
  return read(files, root);
}

export async function checkTestingArea(root: string = REPO_ROOT): Promise<number> {
  const violations = [
    ...(await outsideViolations(await productSources(root))),
    ...(await stackViolations(await testingManifests(root))),
  ];
  return finish(
    violations.map(({ file, rule, detail }) =>
      message(
        rule === TestingRule.OutsideArea
          ? MessageId.TestingOutsideArea
          : MessageId.TestingStackViolation,
        { file, detail },
      ),
    ),
    message(MessageId.TestingAreaOk),
  );
}

if (import.meta.main) process.exit(await checkTestingArea());
