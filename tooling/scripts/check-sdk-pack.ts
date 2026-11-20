import { readdir } from "node:fs/promises";
import { join } from "node:path";
import {
  DEPENDENCY_FIELDS,
  MessageId,
  RepoFile,
  SDK_FORBIDDEN_SPECIFIERS,
  SDK_IMPORT_PATTERN,
  SDK_SCANNED_SUFFIXES,
  WORKSPACE_PROTOCOL,
} from "@platform/constants";
import { message } from "@platform/messages";
import { filterAsync, flatMapAsync } from "@platform/store";
import { PackageManifestSchema, type SdkLeak } from "@platform/types";
import { all } from "@platform/util";
import { packSdk } from "./sdk-pack.ts";
import { finish } from "./tools.ts";

async function forbidden(specifier: string): Promise<boolean> {
  return SDK_FORBIDDEN_SPECIFIERS.some((pattern) => pattern.test(specifier));
}

async function scanned(file: string): Promise<boolean> {
  return SDK_SCANNED_SUFFIXES.some((suffix) => file.endsWith(suffix));
}

async function manifestLeaks(file: string, text: string): Promise<SdkLeak[]> {
  const manifest = PackageManifestSchema.parse(JSON.parse(text));
  return (
    await filterAsync(
      DEPENDENCY_FIELDS.flatMap((field) => Object.entries(manifest[field] ?? {})),
      async ([name, range]) => (await forbidden(name)) || range.startsWith(WORKSPACE_PROTOCOL),
    )
  ).map(([name]) => ({ file, specifier: name }));
}

async function importLeaks(file: string, text: string): Promise<SdkLeak[]> {
  return (
    await filterAsync(
      [...text.matchAll(SDK_IMPORT_PATTERN)].map((match) => match[1] ?? file),
      forbidden,
    )
  ).map((specifier) => ({ file, specifier }));
}

export async function sdkLeaks(files: Readonly<Record<string, string>>): Promise<SdkLeak[]> {
  return await flatMapAsync(Object.entries(files), async ([file, text]) => {
    if (file === RepoFile.PackageJson) {
      return manifestLeaks(file, text);
    }
    return (await scanned(file)) ? await importLeaks(file, text) : [];
  });
}

export async function packedFiles(directory: string): Promise<Record<string, string>> {
  const entries = await readdir(directory, { recursive: true, withFileTypes: true });
  const names = entries
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name).slice(directory.length + 1));
  const texts = await all(names.map((name) => async () => Bun.file(join(directory, name)).text()));
  return Object.fromEntries(names.map((name, index) => [name, texts[index] as string]));
}

export async function checkSdkPack(pack: typeof packSdk = packSdk): Promise<number> {
  const packed = await pack();
  const leaks = await sdkLeaks(await packedFiles(packed.directory));
  return finish(
    leaks.map((leak) => message(MessageId.SdkLeak, leak)),
    message(MessageId.SdkLeakOk),
  );
}

if (import.meta.main) process.exit(await checkSdkPack());
