import { VerifyStep } from "./tooling.ts";

export enum DocumentPhase {
  Commit = "commit",
  Push = "push",
}

export enum DocumentScopeReason {
  Eligible = "document-only",
  MissingRange = "missing-or-ambiguous-range",
  Empty = "empty-change",
  Dirty = "snapshot-differs-from-working-tree",
  Unsupported = "unsupported-path-or-file-mode",
  Inspection = "git-inspection-failed",
}

export const DOCUMENT_SCOPE_FILE = "document-scope.json";
export const DOCUMENT_SCOPE_PATTERNS = [
  "README.md",
  "docs/*.md",
  "openspec/specs/**/*.md",
  "openspec/changes/**/*.md",
] as const;
export const DOCUMENT_SCOPE_EXCLUDED = [
  "docs/e2e/**",
  "**/evidence/**",
  "**/sources/**",
  "openspec/changes/archive/**",
] as const;
export const DOCUMENT_PATH_PATTERN = /^[A-Za-z0-9_./-]+$/;
export const DOCUMENT_FILE_MODE = "100644";
export const DOCUMENT_GIT_TREE_MODE = /^(\d+) /;
export const DOCUMENT_GIT_DIFF = ["git", "diff", "--name-only", "--no-renames", "-z"] as const;
export const DOCUMENT_GIT_INDEX = ["git", "write-tree"] as const;
export const DOCUMENT_GIT_DIRTY = [
  "git",
  "diff-files",
  "--quiet",
  "--ignore-submodules=none",
] as const;
export const DOCUMENT_GIT_TREE = ["git", "ls-tree", "-r", "-z"] as const;
export const DOCUMENT_GIT_ANCESTOR = ["git", "merge-base", "--is-ancestor"] as const;
export const DOCUMENT_GIT_INDEX_TREE = ["git", "diff", "--cached", "--quiet"] as const;
export const DOCUMENT_GIT_FLAGS = ["git", "ls-files", "-v", "-z"] as const;
export const DOCUMENT_GIT_NORMAL_FLAG = "H ";

export const DOCUMENT_LINK_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
export const DOCUMENT_LINK_ALLOWED_SCHEMES = ["https:", "http:", "mailto:"] as const;
export const DOCUMENT_LINK_FRAGMENT = "#";
export const DOCUMENT_LINK_QUERY = "?";
export const DOCUMENT_MARKDOWN_SUFFIX = ".md";
export const DOCUMENT_ROOT = "/";
export const DOCUMENT_ARCHIVE = "openspec/changes/archive/**";
export const DOCUMENT_NODE_LINK = "link";
export const DOCUMENT_NODE_IMAGE = "image";
export const DOCUMENT_NODE_DEFINITION = "definition";
export const DOCUMENT_NODE_HEADING = "heading";
export const DOCUMENT_NODE_CHILDREN = "children";

export const DOCUMENT_SHIPPING_REPORT = "document-shipping.json";
export const DOCUMENT_SHIPPING_BUDGET_SECONDS = 60;
export const DOCUMENT_SHIPPING_CONCURRENCY = 4;
export const DOCUMENT_SHIPPING_BANNER =
  "Document/OpenSpec shipment: fresh document, source, security and repository checks; source/runtime changes require a broader lane.";
export const DOCUMENT_SHIPPING_SOURCE_ONLY: readonly string[] = [
  VerifyStep.Biome,
  VerifyStep.Structure,
  VerifyStep.Typecheck,
  VerifyStep.Knip,
  VerifyStep.Audit,
  VerifyStep.E2e,
  VerifyStep.OpenApi,
  VerifyStep.Migrations,
  VerifyStep.Kb,
  VerifyStep.Sdk,
  VerifyStep.SdkPack,
  VerifyStep.Tiers,
  VerifyStep.Schemas,
  VerifyStep.Interfaces,
  VerifyStep.UrlLiterals,
  VerifyStep.InfraFiles,
  VerifyStep.Coverage,
  VerifyStep.TestingArea,
  VerifyStep.UnitCases,
  VerifyStep.AsyncFunctions,
  VerifyStep.PromiseAll,
  VerifyStep.PackageGraph,
];

export const DOCUMENT_GIT_INDEX_ENTRIES = ["git", "ls-files", "--stage", "-z"] as const;
export const DOCUMENT_INDEX_ENTRY = /^(100644|100755|120000) ([a-f0-9]{40}|[a-f0-9]{64}) 0\t(.+)$/s;
export const DOCUMENT_SYMLINK_MODE = "120000";
export const DOCUMENT_EXECUTABLE_MODE = "100755";
export const DOCUMENT_EXECUTABLE_BITS = 0o111;
export const DOCUMENT_BLOB_PREFIX = "blob ";
export const DOCUMENT_SHA1 = "sha1";
export const DOCUMENT_SHA1_LENGTH = 40;
