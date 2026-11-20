import { cp, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, relative } from "node:path";
import {
  BUN_FLAG,
  DRIZZLE_GENERATE_ARGS,
  DRIZZLE_GENERATED,
  DRIZZLE_KIT,
  DRIZZLE_NEEDS_ANSWER,
  DRIZZLE_NO_CHANGES,
  DRIZZLE_OUT_FLAG,
  DRIZZLE_SCHEMA_FLAG,
  MessageId,
  MIGRATIONS_TEMP_PREFIX,
  NO_INSTALL_FLAG,
  RepoPath,
  Runner,
  Separator,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { REPO_ROOT, run } from "./tools.ts";

export async function migrationsMatchSchema(
  schema: string = join(REPO_ROOT, RepoPath.DbSchema),
): Promise<boolean> {
  const workDir = await mkdtemp(join(tmpdir(), MIGRATIONS_TEMP_PREFIX));
  try {
    const cwd = join(REPO_ROOT, RepoPath.DbPackage);
    const folder = RepoPath.DbMigrations.split(Separator.Resource).at(-1) ?? Text.Empty;
    const copy = join(workDir, folder);
    await cp(join(REPO_ROOT, RepoPath.DbMigrations), copy, { recursive: true });
    const generated = await run(
      [
        Runner.Bunx,
        NO_INSTALL_FLAG,
        BUN_FLAG,
        DRIZZLE_KIT,
        ...DRIZZLE_GENERATE_ARGS,
        DRIZZLE_SCHEMA_FLAG,
        relative(cwd, schema),
        DRIZZLE_OUT_FLAG,
        relative(cwd, copy),
      ],
      { cwd },
    );
    const output = generated.stdout + generated.stderr;
    if (output.includes(DRIZZLE_NO_CHANGES)) {
      return true;
    }
    if (output.includes(DRIZZLE_GENERATED) || output.includes(DRIZZLE_NEEDS_ANSWER)) {
      return false;
    }
    throw new Error(output);
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function checkMigrations(schema?: string): Promise<number> {
  const inSync = await migrationsMatchSchema(schema);
  console.log(message(inSync ? MessageId.MigrationsInSync : MessageId.MigrationsDrift));
  return inSync ? 0 : 1;
}

if (import.meta.main) process.exit(await checkMigrations());
