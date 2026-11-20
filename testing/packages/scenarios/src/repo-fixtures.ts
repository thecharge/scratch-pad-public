import { cp, mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  BIOME_PLUGIN_DIR,
  BIOME_PLUGIN_EXTENSION,
  ConfigFile,
  Encoding,
  FIXTURE_TEMP_PREFIX,
} from "@platform/constants";
import { REPO_ROOT } from "@platform/test-framework";
import { all } from "@platform/util";

const created: string[] = [];

export async function makeDir(): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), FIXTURE_TEMP_PREFIX));
  created.push(dir);
  return dir;
}

export async function removeAll(): Promise<void> {
  await all(created.map((dir) => async () => rm(dir, { recursive: true, force: true })));
}

export async function writeFiles(
  dir: string,
  files: Readonly<Record<string, string>>,
): Promise<void> {
  await all(
    Object.entries(files).map(([name, content]) => async () => {
      await mkdir(dirname(join(dir, name)), { recursive: true });
      await writeFile(join(dir, name), content);
    }),
  );
}

export async function copyConfigs(dir: string, names: readonly ConfigFile[]): Promise<void> {
  await all(names.map((name) => async () => cp(join(REPO_ROOT, name), join(dir, name))));
}

export async function copyPlugins(dir: string): Promise<void> {
  const files = (await readdir(join(REPO_ROOT, BIOME_PLUGIN_DIR))).filter((file) =>
    file.endsWith(BIOME_PLUGIN_EXTENSION),
  );
  await mkdir(join(dir, BIOME_PLUGIN_DIR), { recursive: true });
  await all(
    files.map(
      (file) => async () =>
        cp(join(REPO_ROOT, BIOME_PLUGIN_DIR, file), join(dir, BIOME_PLUGIN_DIR, file)),
    ),
  );
}

export async function writeBiomeConfig(dir: string, withPlugins: boolean): Promise<void> {
  const config = JSON.parse(await readFile(join(REPO_ROOT, ConfigFile.Biome), Encoding.Utf8));
  const adjusted = {
    ...config,
    vcs: { enabled: false },
    plugins: withPlugins ? config.plugins : [],
  };
  await writeFile(join(dir, ConfigFile.Biome), JSON.stringify(adjusted));
}
