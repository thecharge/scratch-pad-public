import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { MessageId, RepoPath } from "@platform/constants";
import { message } from "@platform/messages";
import { all } from "@platform/util";
import { REPO_ROOT } from "./tools.ts";

export async function packagesWithoutReadme(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const names = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
  const present = await all(
    names.map((name) => async () => Bun.file(join(directory, name, RepoPath.Readme)).exists()),
  );
  return names.filter((_name, index) => !present[index]);
}

export async function checkReadmes(root: string = REPO_ROOT): Promise<number> {
  const directory = join(root, RepoPath.Packages);
  const missing = await packagesWithoutReadme(directory);
  for (const name of missing) {
    console.error(message(MessageId.ReadmeMissing, { package: name }));
  }
  const count = (await readdir(directory)).length;
  console.log(message(MessageId.ReadmesOk, { count: count - missing.length }));
  return missing.length === 0 ? 0 : 1;
}

if (import.meta.main) process.exit(await checkReadmes());
