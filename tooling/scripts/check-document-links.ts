import { realpath, stat } from "node:fs/promises";
import { dirname, isAbsolute, join, relative } from "node:path";
import {
  MessageId,
  NUL,
  Text,
  VERIFICATION_GIT_FILES,
  VERIFICATION_PARENT,
  VERIFICATION_PATH_SEPARATOR,
} from "@platform/constants";
import { message } from "@platform/messages";
import GithubSlugger from "github-slugger";
import type { Definition, Image, Link, Nodes } from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { toString as markdownText } from "mdast-util-to-string";
import {
  DOCUMENT_ARCHIVE,
  DOCUMENT_LINK_ALLOWED_SCHEMES,
  DOCUMENT_LINK_FRAGMENT,
  DOCUMENT_LINK_QUERY,
  DOCUMENT_LINK_SCHEME,
  DOCUMENT_MARKDOWN_SUFFIX,
  DOCUMENT_NODE_CHILDREN,
  DOCUMENT_NODE_DEFINITION,
  DOCUMENT_NODE_HEADING,
  DOCUMENT_NODE_IMAGE,
  DOCUMENT_NODE_LINK,
  DOCUMENT_ROOT,
  DOCUMENT_SCOPE_EXCLUDED,
  DOCUMENT_SCOPE_PATTERNS,
} from "../../packages/constants/src/document-shipping.ts";
import {
  type DocumentLinkTarget,
  DocumentLinkTargetSchema,
} from "../../packages/types/src/document-shipping.ts";
import { finish, REPO_ROOT, run } from "./tools.ts";

async function nodes(content: string): Promise<Nodes[]> {
  const pending: Nodes[] = [...fromMarkdown(content).children];
  const result: Nodes[] = [];
  while (pending.length > 0) {
    const node = pending.shift() as Nodes;
    result.push(node);
    if (DOCUMENT_NODE_CHILDREN in node) pending.unshift(...node.children);
  }
  return result;
}

async function anchors(content: string): Promise<string[]> {
  const slugger = new GithubSlugger();
  return (await nodes(content))
    .filter((node) => node.type === DOCUMENT_NODE_HEADING)
    .map((node) => slugger.slug(markdownText(node)));
}

async function safePath(path: string): Promise<boolean> {
  return (
    !isAbsolute(path) &&
    path !== VERIFICATION_PARENT &&
    !path.startsWith(VERIFICATION_PARENT + VERIFICATION_PATH_SEPARATOR)
  );
}

async function readTarget(root: string, path: string): Promise<DocumentLinkTarget> {
  try {
    const resolved = relative(await realpath(root), await realpath(join(root, path)));
    if (!(await safePath(resolved))) return { exists: false };
    const target = join(root, resolved);
    const info = await stat(target);
    const markdown =
      info.isFile() && target.endsWith(DOCUMENT_MARKDOWN_SUFFIX)
        ? await Bun.file(target).text()
        : undefined;
    return DocumentLinkTargetSchema.parse({
      exists: info.isFile() || info.isDirectory(),
      markdown,
    });
  } catch {
    return { exists: false };
  }
}

async function validLink(
  source: string,
  target: string,
  content: string,
  load: (path: string) => Promise<DocumentLinkTarget>,
): Promise<boolean> {
  if (DOCUMENT_LINK_SCHEME.test(target))
    return DOCUMENT_LINK_ALLOWED_SCHEMES.some((scheme) => target.toLowerCase().startsWith(scheme));
  if (target.startsWith(DOCUMENT_ROOT + DOCUMENT_ROOT)) return false;
  const [encodedPath = Text.Empty, fragment] = target.split(DOCUMENT_LINK_FRAGMENT);
  const path = decodeURIComponent(encodedPath.split(DOCUMENT_LINK_QUERY)[0] ?? Text.Empty);
  const file =
    path === Text.Empty
      ? source
      : path.startsWith(DOCUMENT_ROOT)
        ? path.slice(1)
        : join(dirname(source), path);
  if (!(await safePath(file))) return false;
  const loaded = file === source ? { exists: true, markdown: content } : await load(file);
  if (!loaded.exists) return false;
  if (fragment === undefined || fragment === Text.Empty) return true;
  return (
    loaded.markdown !== undefined &&
    (await anchors(loaded.markdown)).includes(decodeURIComponent(fragment))
  );
}

export async function documentLinkProblems(
  source: string,
  content: string,
  load: (path: string) => Promise<DocumentLinkTarget> = async (path) => readTarget(REPO_ROOT, path),
): Promise<string[]> {
  const parsed = await nodes(content);
  const links = parsed.filter(
    (node) =>
      node.type === DOCUMENT_NODE_LINK ||
      node.type === DOCUMENT_NODE_IMAGE ||
      node.type === DOCUMENT_NODE_DEFINITION,
  );
  const problems: string[] = [];
  for (const node of links) {
    const target = (node as Link | Image | Definition).url;
    const valid = await validLink(source, target, content, load).catch(async () => false);
    if (!valid) problems.push(message(MessageId.DocumentLinkInvalid, { file: source, target }));
  }
  return problems;
}

export async function checkDocumentLinks(root = REPO_ROOT, execute = run): Promise<number> {
  const tracked = await execute(VERIFICATION_GIT_FILES, { cwd: root });
  if (tracked.exitCode !== 0) return 1;
  const paths = tracked.stdout
    .split(NUL)
    .filter(
      (path) =>
        DOCUMENT_SCOPE_PATTERNS.some((pattern) => new Bun.Glob(pattern).match(path)) &&
        ![...DOCUMENT_SCOPE_EXCLUDED, DOCUMENT_ARCHIVE].some((pattern) =>
          new Bun.Glob(pattern).match(path),
        ),
    );
  const problems: string[] = [];
  for (const path of paths) {
    const document = await readTarget(root, path);
    if (document.markdown !== undefined)
      problems.push(
        ...(await documentLinkProblems(path, document.markdown, async (target) =>
          readTarget(root, target),
        )),
      );
  }
  return finish(problems, message(MessageId.DocumentLinksOk));
}

if (import.meta.main) process.exit(await checkDocumentLinks());
