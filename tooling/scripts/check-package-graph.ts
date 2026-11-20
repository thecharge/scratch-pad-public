import { join } from "node:path";
import {
  BUNDLE_DEFINE_KEY,
  BUNDLE_DEFINE_VALUE,
  BUNDLE_FORBIDDEN_INPUTS,
  BUNDLE_FORBIDDEN_TEXT,
  BUNDLE_TARGET,
  CONSOLE_BUNDLE_ENTRY,
  CYCLE_JOINER,
  MessageId,
  PACKAGE_MANIFEST_GLOBS,
  PLATFORM_SCOPE,
} from "@platform/constants";
import { message } from "@platform/messages";
import type { PackageGraph } from "@platform/types";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

export async function workspaceGraph(root: string): Promise<PackageGraph> {
  const found = await all(
    PACKAGE_MANIFEST_GLOBS.map(
      (glob) => async () => Array.fromAsync(new Bun.Glob(glob).scan({ cwd: root })),
    ),
  );
  const manifests = await all(
    found.flat().map((file) => async () => Bun.file(join(root, file)).json()),
  );
  const names = manifests.map((manifest) => String(manifest.name));
  const graph: PackageGraph = {};
  for (const manifest of manifests) {
    graph[String(manifest.name)] = Object.keys(manifest.dependencies ?? {}).filter(
      (dependency) => dependency.startsWith(PLATFORM_SCOPE) && names.includes(dependency),
    );
  }
  return graph;
}

async function walk(
  graph: PackageGraph,
  node: string,
  path: readonly string[],
  done: string[],
): Promise<string[]> {
  if (path.includes(node)) {
    return [[...path.slice(path.indexOf(node)), node].join(CYCLE_JOINER)];
  }
  if (done.includes(node)) {
    return [];
  }
  const cycles: string[] = [];
  for (const next of graph[node] ?? []) {
    cycles.push(...(await walk(graph, next, [...path, node], done)));
  }
  done.push(node);
  return cycles;
}

export async function packageCycles(graph: PackageGraph): Promise<string[]> {
  const done: string[] = [];
  const cycles: string[] = [];
  for (const node of Object.keys(graph)) {
    cycles.push(...(await walk(graph, node, [], done)));
  }
  return cycles;
}

export async function bundleLeaks(root: string, entry: string): Promise<string[]> {
  const built = await Bun.build({
    entrypoints: [join(root, entry)],
    target: BUNDLE_TARGET,
    define: { [BUNDLE_DEFINE_KEY]: BUNDLE_DEFINE_VALUE },
    metafile: true,
    throw: false,
  });
  if (built.outputs.length === 0) {
    throw new Error(message(MessageId.BundleFailed, { entry }));
  }
  const inputs = Object.keys(built.metafile?.inputs ?? {});
  const leaks = BUNDLE_FORBIDDEN_INPUTS.filter((file) =>
    inputs.some((input) => input.endsWith(file)),
  );
  const texts = await all(built.outputs.map((output) => async () => output.text()));
  return texts.some((text) => text.includes(BUNDLE_FORBIDDEN_TEXT))
    ? [...leaks, BUNDLE_FORBIDDEN_TEXT]
    : leaks;
}

export async function checkPackageGraph(root: string = REPO_ROOT): Promise<number> {
  const cycles = await packageCycles(await workspaceGraph(root));
  const leaks = await bundleLeaks(root, CONSOLE_BUNDLE_ENTRY);
  return finish(
    [
      ...cycles.map((cycle) => message(MessageId.PackageCycle, { cycle })),
      ...leaks.map((leak) => message(MessageId.BundleLeak, { leak })),
    ],
    message(MessageId.PackageGraphOk),
  );
}

if (import.meta.main) process.exit(await checkPackageGraph(Bun.argv[2]));
