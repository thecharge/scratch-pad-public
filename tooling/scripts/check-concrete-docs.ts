import { join } from "node:path";
import {
  CONCRETE_CONSOLE,
  CONCRETE_CURL,
  CONCRETE_ENDPOINT,
  CONCRETE_MISSING,
  DOCS_CONTENT_DIR,
  DOCS_CONTENT_GLOB,
  MessageId,
  Text,
} from "@platform/constants";
import { message } from "@platform/messages";
import { flatMapAsync } from "@platform/store";
import { all } from "@platform/util";
import { finish, REPO_ROOT } from "./tools.ts";

const STEP_START = /^### (HTTP|MCP|CONSOLE): (.*)$/gm;
const SECTION_END = /^## /m;

export async function vagueSteps(page: string, text: string): Promise<string[]> {
  const starts = [...text.matchAll(STEP_START)];
  return await flatMapAsync(starts, async (match, index) => {
    const from = match.index ?? 0;
    const next = starts[index + 1]?.index ?? text.length;
    const section = text.slice(from, next).split(SECTION_END)[0] ?? Text.Empty;
    const missing = await missingIn(match[1] ?? Text.Empty, section);
    return missing === undefined
      ? []
      : [message(MessageId.VagueStep, { page, step: match[2] ?? Text.Empty, missing })];
  });
}

async function missingIn(source: string, section: string): Promise<string | undefined> {
  const needs: Readonly<Record<string, RegExp>> = {
    [message(MessageId.SourceHttp)]: CONCRETE_CURL,
    [message(MessageId.SourceMcp)]: CONCRETE_ENDPOINT,
    [message(MessageId.SourceConsole)]: CONCRETE_CONSOLE,
  };
  const pattern = needs[source];
  return pattern === undefined || pattern.test(section) ? undefined : CONCRETE_MISSING;
}

export async function vagueStepsIn(root: string): Promise<string[]> {
  const directory = join(root, DOCS_CONTENT_DIR);
  const files = await Array.fromAsync(new Bun.Glob(DOCS_CONTENT_GLOB).scan({ cwd: directory }));
  const found = await all(
    files.map((file) => async () => vagueSteps(file, await Bun.file(join(directory, file)).text())),
  );
  return found.flat();
}

export async function checkConcreteDocs(root: string = REPO_ROOT): Promise<number> {
  return finish(await vagueStepsIn(root), message(MessageId.ConcreteOk));
}

if (import.meta.main) process.exit(await checkConcreteDocs());
