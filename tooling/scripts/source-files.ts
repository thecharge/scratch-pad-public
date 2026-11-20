import { join } from "node:path";
import type { SourceFile } from "@platform/types";
import { all } from "@platform/util";

export async function readSources(globs: readonly string[], root: string): Promise<SourceFile[]> {
  const found = await all(
    globs.map((glob) => async () => Array.fromAsync(new Bun.Glob(glob).scan({ cwd: root }))),
  );
  return all(
    found
      .flat()
      .map((file) => async () => ({ file, text: await Bun.file(join(root, file)).text() })),
  );
}
