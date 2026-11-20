import { join } from "node:path";
import { MessageId, RepoPath, Separator } from "@platform/constants";
import { message } from "@platform/messages";
import { flatMapAsync } from "@platform/store";
import { all } from "@platform/util";
import { REPO_ROOT } from "./tools.ts";

export async function buildSkills(outputDir: string): Promise<number> {
  const { groupCapabilities, skillFilesFor } = await import("@platform/skill-protocol");
  const { createRegistry } = await import("@platform/api/registry");
  const groups = await groupCapabilities(await (await createRegistry()).list());
  const written = await flatMapAsync(groups, async (group) =>
    Object.entries(await skillFilesFor(group)).map(([path, text]) => ({
      target: join(outputDir, group.name, ...path.split(Separator.Resource)),
      text,
    })),
  );
  await all(
    written.map(
      ({ target, text }) =>
        async () =>
          Bun.write(target, text),
    ),
  );
  return written.length;
}

export async function runBuildSkills(
  outputDir: string = join(REPO_ROOT, RepoPath.SkillsOutput),
): Promise<number> {
  const count = await buildSkills(outputDir);
  console.log(message(MessageId.SkillsWritten, { count, path: RepoPath.SkillsOutput }));
  return 0;
}

if (import.meta.main) process.exit(await runBuildSkills());
