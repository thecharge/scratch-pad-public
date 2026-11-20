import { join } from "node:path";
import {
  DOCS_CONTENT_DIR,
  DOCS_CONTENT_GLOB,
  ENUM_KEY,
  ERROR_REASON_PATTERN,
  MessageId,
  REASON_ENUM_KEY,
  RepoPath,
  Text,
  UNREACHABLE_REASONS,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync, flatMapAsync } from "@platform/store";
import type { ErrorCaseFindings } from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";
import { finish, REPO_ROOT } from "./tools.ts";

const RecordSchema = z.record(z.string(), z.unknown());

async function asRecord(value: unknown): Promise<Record<string, unknown> | undefined> {
  const parsed = RecordSchema.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

export async function reasonsIn(node: unknown): Promise<string[]> {
  const record = await asRecord(node);
  const list = Array.isArray(node) ? node : Object.values(record ?? {});
  const own = (await asRecord(record?.[REASON_ENUM_KEY]))?.[ENUM_KEY];
  const names = z.array(z.string().regex(ERROR_REASON_PATTERN)).safeParse(own);
  return [...(names.success ? names.data : []), ...(await flatMapAsync(list, reasonsIn))];
}

export async function operationsIn(
  document: Record<string, unknown>,
): Promise<Map<string, string[]>> {
  const paths = Object.values((await asRecord(document.paths)) ?? {});
  const operations = await flatMapAsync(paths, async (methods) =>
    Object.values((await asRecord(methods)) ?? {}),
  );
  return new Map(
    await all(
      (await all(operations.map((operation) => async () => asRecord(operation))))
        .filter((operation) => z.string().safeParse(operation?.operationId).success)
        .map(
          (operation) => async (): Promise<[string, string[]]> => [
            operation?.operationId as string,
            [...new Set(await reasonsIn(operation?.responses))],
          ],
        ),
    ),
  );
}

export async function findMissing(
  operations: ReadonlyMap<string, string[]>,
  pages: string,
): Promise<ErrorCaseFindings> {
  const reasons = [...new Set([...operations.values()].flat())];
  const shown = async (reason: string) =>
    pages.includes(message(MessageId.ApiExpectReason, { reason })) ||
    pages.includes(message(MessageId.CheckResultText, { reason }));
  return {
    operations: [...operations.keys()].filter(
      (id) => !pages.includes(message(MessageId.ApiCallNeedle, { id })),
    ),
    reasons: await filterAsync(
      reasons,
      async (reason) => !UNREACHABLE_REASONS.includes(reason) && !(await shown(reason)),
    ),
    checkedOperations: operations.size,
    checkedReasons: reasons.length,
  };
}

export async function generatedPagesText(root: string): Promise<string> {
  const directory = join(root, DOCS_CONTENT_DIR);
  const files = await Array.fromAsync(new Bun.Glob(DOCS_CONTENT_GLOB).scan({ cwd: directory }));
  const texts = await all(files.map((file) => async () => Bun.file(join(directory, file)).text()));
  return texts.join(Text.Newline);
}

export async function checkErrorCases(root: string = REPO_ROOT): Promise<number> {
  const document = await Bun.file(join(root, RepoPath.OpenApiBaseline)).json();
  const found = await findMissing(await operationsIn(document), await generatedPagesText(root));
  return finish(
    [
      ...found.operations.map((id) => message(MessageId.OperationNotExercised, { id })),
      ...found.reasons.map((reason) => message(MessageId.ReasonNotShown, { reason })),
    ],
    message(MessageId.ErrorCasesOk, {
      operations: found.checkedOperations,
      reasons: found.checkedReasons,
    }),
  );
}

if (import.meta.main) process.exit(await checkErrorCases());
