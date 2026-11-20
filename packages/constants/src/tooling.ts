export enum ToolBinary {
  Biome = "biome",
  Dprint = "dprint",
  Cspell = "cspell",
  Secretlint = "secretlint",
  Tsc = "tsc",
  Knip = "knip",
  Gitleaks = "gitleaks",
  Pulumi = "pulumi",
  Commitlint = "commitlint",
  Oasdiff = "oasdiff",
}

export enum Runner {
  Bun = "bun",
  Run = "run",
  TestCommand = "test",
  Bunx = "bunx",
  Git = "git",
  Tar = "tar",
  Podman = "podman",
  Mkdir = "mkdir",
  Rm = "rm",
  Du = "du",
  Grep = "grep",
}

export enum RepoPath {
  RootFromScripts = "../..",
  ParentDir = "..",
  RootFromTestingPackage = "../../../..",
  ToolsDir = ".tools",
  Bin = "bin",
  NodeModules = "node_modules",
  NodeBin = ".bin",
  Workflows = ".github/workflows",
  Lefthook = "lefthook.yml",
  Packages = "packages",
  Readme = "README.md",
  Scripts = "tooling/scripts",
  OpenApiBaseline = "openapi/baseline.json",
  ApiCapabilities = "apps/api/src/registry.ts",
  OpenApiCurrent = "current.json",
  SkillsOutput = "dist/skills",
  DbSchema = "packages/db/src/schema/index.ts",
  DbMigrations = "packages/db/drizzle",
  DbPackage = "packages/db",
  DocsApp = "apps/docs",
  ConsoleApp = "apps/console",
  SdkPackage = "packages/sdk",
  SdkGenerated = "packages/sdk/generated",
  SdkTsconfig = "tsconfig.json",
  SdkDist = "dist",
  SdkBuildTsconfig = "packages/tsconfig.sdk-build.json",
  OpenSpecSpecs = "openspec/specs",
  OpenSpecChanges = "openspec/changes",
}

export const SPEC_MAIN_GLOB = "openspec/specs/*/spec.md";
export const SPEC_DELTA_GLOB = "openspec/changes/*/specs/*/spec.md";
export const SPEC_FILE = "spec.md";
export const SPEC_PURPOSE_PATTERN = /^## Purpose\s*\n([\s\S]*?)(?=^## |$(?![\s\S]))/m;
export const SPEC_PLACEHOLDER_PATTERN = /\bTBD\b/i;
export const SPEC_REQUIREMENT_PATTERN = /^### Requirement:\s*(.+)$/gm;
export const SPEC_SECTION_PATTERN = /^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements\s*$/m;
export const SPEC_RENAME_PATTERN =
  /^- FROM: `### Requirement: (.+)`\s*\n- TO: `### Requirement: (.+)`\s*$/gm;

export enum SpecOperation {
  Added = "ADDED",
  Modified = "MODIFIED",
  Removed = "REMOVED",
  Renamed = "RENAMED",
}

export enum FileGlob {
  Markdown = "**/*.md",
  Typescript = "**/*.ts",
  YamlFiles = "**/*.{yml,yaml}",
  Tsx = "**/*.tsx",
  PackageDirs = "*",
}

export enum FileSuffix {
  Markdown = ".md",
  TypeScript = ".ts",
  Tsx = ".tsx",
  Yaml = ".yml",
  Mdx = ".mdx",
  Sql = ".sql",
  YamlLong = ".yaml",
  Json = ".json",
  Test = ".test.ts",
  Generated = ".generated.ts",
}

export enum SkippedDir {
  NodeModules = "node_modules/",
  Git = ".git/",
  Claude = ".claude/",
  Tools = ".tools/",
  Dist = "dist/",
  Astro = ".astro/",
  Drizzle = "drizzle/",
  Generated = "generated/",
  Vendored = "components/ui/",
}

export enum Platform {
  LinuxX64 = "linux-x64",
}

export enum ScanMode {
  Staged = "staged",
  Repo = "repo",
  Stdin = "stdin",
}

export enum VerifyStep {
  DocumentScope = "document-scope",
  DocumentLinks = "document-links",
  Sources = "sources",
  Untracked = "untracked",
  OpenSpec = "openspec",
  Biome = "biome",
  Dprint = "dprint",
  Cspell = "cspell",
  SecretScan = "secret-scan",
  Secretlint = "secretlint",
  Mermaid = "mermaid",
  Workflows = "workflows",
  Structure = "structure",
  Rules = "rules",
  Readmes = "readmes",
  Repo = "repo",
  Typecheck = "typecheck",
  Knip = "knip",
  Audit = "audit",
  OpenApi = "openapi",
  Migrations = "migrations",
  Kb = "kb",
  Coverage = "coverage",
  TestingArea = "testing-area",
  UnitCases = "unit-cases",
  AgentKnowledge = "agent-knowledge",
  SkillPackages = "skill-packages",
  SkillsFresh = "skills-fresh",
  AsyncFunctions = "async-functions",
  PromiseAll = "promise-all",
  PackageGraph = "package-graph",
  Sdk = "sdk",
  Tiers = "tiers",
  E2e = "e2e",
  DocsScope = "docs-scope",
  PlainLanguage = "plain-language",
  Schemas = "schemas",
  ErrorCases = "error-cases",
  Interfaces = "interfaces",
  UrlLiterals = "url-literals",
  ConcreteDocs = "concrete-docs",
  InfraFiles = "infra-files",
  SdkPack = "sdk-pack",
}

export const AUDIT_COMMAND = ["timeout", "-k", "5", "60", "bun", "audit"] as const;
export const AUDIT_ATTEMPTS = 3;
export const AUDIT_RETRY_DELAY_MS = 1000;
export const AUDIT_TIMEOUT_EXIT = 124;
export const AUDIT_CONNECTION_FAILURE = "ConnectionClosed: audit request failed";

export const VERIFY_COMMANDS: Readonly<Record<VerifyStep, readonly string[]>> = {
  [VerifyStep.DocumentScope]: ["bun", "run", "tooling/scripts/document-scope.ts"],
  [VerifyStep.DocumentLinks]: ["bun", "run", "tooling/scripts/check-document-links.ts"],
  [VerifyStep.Sources]: ["bun", "run", "tooling/scripts/check-sources.ts"],
  [VerifyStep.OpenSpec]: ["bun", "run", "tooling/scripts/check-openspec.ts"],
  [VerifyStep.Biome]: ["bunx", "--no-install", "biome", "ci", "."],
  [VerifyStep.Dprint]: ["bun", "run", "tooling/scripts/check-formatting.ts"],
  [VerifyStep.Cspell]: [
    "bunx",
    "--no-install",
    "cspell",
    "--no-progress",
    "--cache",
    "--no-must-find-files",
    ".",
  ],
  [VerifyStep.SecretScan]: ["bun", "run", "tooling/scripts/secret-scan.ts", "repo"],
  [VerifyStep.Secretlint]: ["bunx", "--no-install", "secretlint", "**/*"],
  [VerifyStep.Mermaid]: ["bun", "run", "tooling/scripts/check-mermaid.ts"],
  [VerifyStep.Workflows]: ["bun", "run", "tooling/scripts/lint-workflows.ts"],
  [VerifyStep.Structure]: ["bun", "run", "tooling/scripts/check-structure.ts"],
  [VerifyStep.Rules]: ["bun", "run", "tooling/scripts/check-rules.ts"],
  [VerifyStep.Readmes]: ["bun", "run", "tooling/scripts/check-readmes.ts"],
  [VerifyStep.Repo]: ["bun", "run", "tooling/scripts/check-repo.ts"],
  [VerifyStep.Typecheck]: ["bunx", "--no-install", "tsc", "--noEmit", "-p", "tsconfig.json"],
  [VerifyStep.Knip]: ["bunx", "--no-install", "knip"],
  [VerifyStep.Audit]: ["bun", "run", "tooling/scripts/audit.ts"],
  [VerifyStep.E2e]: ["bun", "run", "tooling/scripts/run-tier.ts", "e2e"],
  [VerifyStep.OpenApi]: ["bun", "run", "tooling/scripts/openapi-check.ts", "check"],
  [VerifyStep.Migrations]: ["bun", "run", "tooling/scripts/check-migrations.ts"],
  [VerifyStep.Kb]: ["bun", "run", "tooling/scripts/record-kb.ts", "check"],
  [VerifyStep.Sdk]: ["bun", "run", "tooling/scripts/generate-sdk.ts", "check"],
  [VerifyStep.SdkPack]: ["bun", "run", "tooling/scripts/check-sdk-pack.ts"],
  [VerifyStep.Tiers]: ["bun", "run", "tooling/scripts/check-tiers.ts"],
  [VerifyStep.DocsScope]: ["bun", "run", "tooling/scripts/check-docs-scope.ts"],
  [VerifyStep.PlainLanguage]: ["bun", "run", "tooling/scripts/check-plain-language.ts"],
  [VerifyStep.Schemas]: ["bun", "run", "tooling/scripts/check-schemas.ts"],
  [VerifyStep.ErrorCases]: ["bun", "run", "tooling/scripts/check-error-cases.ts"],
  [VerifyStep.Interfaces]: ["bun", "run", "tooling/scripts/check-interfaces.ts"],
  [VerifyStep.UrlLiterals]: ["bun", "run", "tooling/scripts/check-url-literals.ts"],
  [VerifyStep.ConcreteDocs]: ["bun", "run", "tooling/scripts/check-concrete-docs.ts"],
  [VerifyStep.InfraFiles]: ["bun", "run", "tooling/scripts/check-infra-files.ts"],
  [VerifyStep.Coverage]: ["bun", "run", "tooling/scripts/run-coverage.ts", "unit", "integration"],
  [VerifyStep.TestingArea]: ["bun", "run", "tooling/scripts/check-testing-area.ts"],
  [VerifyStep.UnitCases]: ["bun", "run", "tooling/scripts/check-unit-cases.ts"],
  [VerifyStep.AgentKnowledge]: ["bun", "run", "tooling/scripts/check-agent-knowledge.ts"],
  [VerifyStep.SkillPackages]: ["bun", "run", "tooling/scripts/check-skill-packages.ts"],
  [VerifyStep.SkillsFresh]: ["bun", "run", "tooling/scripts/check-skills-fresh.ts"],
  [VerifyStep.AsyncFunctions]: ["bun", "run", "tooling/scripts/check-async-functions.ts"],
  [VerifyStep.PromiseAll]: ["bun", "run", "tooling/scripts/check-promise-all.ts"],
  [VerifyStep.PackageGraph]: ["bun", "run", "tooling/scripts/check-package-graph.ts"],
  [VerifyStep.Untracked]: ["bun", "run", "tooling/scripts/check-untracked.ts"],
};

export const GITLEAKS_VERSION = "8.30.1";
export const GITLEAKS_ARCHIVE_FILES: Readonly<Record<Platform, string>> = {
  [Platform.LinuxX64]: `gitleaks_${GITLEAKS_VERSION}_linux_x64.tar.gz`,
};
export const GITLEAKS_ARCHIVE_SHA256: Readonly<Record<Platform, string>> = {
  [Platform.LinuxX64]: "551f6fc83ea457d62a0d98237cbad105af8d557003051f41f3e7ca7b3f2470eb",
};
export const OASDIFF_VERSION = "1.35.0";
export const OASDIFF_ARCHIVE_FILES: Readonly<Record<Platform, string>> = {
  [Platform.LinuxX64]: `oasdiff_${OASDIFF_VERSION}_linux_amd64.tar.gz`,
};
export const OASDIFF_ARCHIVE_SHA256: Readonly<Record<Platform, string>> = {
  [Platform.LinuxX64]: "a8023002fcb2eaa7f5758148a9303cb63d33b939886df312268bc0fc7b939140",
};
export const TOOL_TEMP_PREFIX = "tool-";
export const SCANNER_ARGS = ["--no-banner", "--redact", "--exit-code", "1"] as const;
export const SCANNER_VERBOSE = "-v";
export const SCANNER_GIT_LOG_OPTS = "--log-opts=--all";
export const GIT_STAGED_DIFF = ["diff", "--cached", "--no-color", "--unified=0"] as const;
export const TAR_EXTRACT = ["-xzf"] as const;
export const TAR_DIRECTORY_FLAG = "-C";
export const GITLEAKS_GIT_COMMAND = "git";

export const MERMAID_FENCE = /```mermaid\n([\s\S]*?)```/g;
export const MERMAID_HTML = "<!doctype html><html><body></body></html>";

export enum StdioMode {
  Pipe = "pipe",
  Ignore = "ignore",
  Inherit = "inherit",
}

export enum StructureRule {
  NestingDepth = "nesting-depth",
  ObjectDepth = "object-depth",
  TestControlFlow = "test-control-flow",
  NoComments = "no-comments",
  SyncApi = "sync-api",
  EagerCollection = "eager-collection",
  EagerInvocation = "eager-invocation",
  HeavyImport = "heavy-import",
  DataShapeNotSchema = "data-shape-not-schema",
}

export const MAX_NESTING_DEPTH = 2;
export const MAX_OBJECT_DEPTH = 2;
export const TEST_FILE_SUFFIXES = [".test.ts", ".test.tsx"] as const;

export enum DataNodeType {
  Interface = "TSInterfaceDeclaration",
  TypeAlias = "TSTypeAliasDeclaration",
  TypeLiteral = "TSTypeLiteral",
  PropertySignature = "TSPropertySignature",
  StringKeyword = "TSStringKeyword",
  NumberKeyword = "TSNumberKeyword",
  BooleanKeyword = "TSBooleanKeyword",
  NullKeyword = "TSNullKeyword",
  UndefinedKeyword = "TSUndefinedKeyword",
  UnknownKeyword = "TSUnknownKeyword",
  LiteralType = "TSLiteralType",
  ArrayType = "TSArrayType",
  UnionType = "TSUnionType",
  TypeReference = "TSTypeReference",
  ExportNamed = "ExportNamedDeclaration",
}

export const SCHEMA_INFER_MARKER = "z.infer";
export const DATA_CONTAINER_TYPES: readonly string[] = [
  "Readonly",
  "Record",
  "Array",
  "ReadonlyArray",
];
export const TYPES_SOURCE_GLOB = "packages/types/src/**/*.ts";

export enum DevRule {
  DocumentScope = "document-scope",
  DocumentLinks = "document-links",
  Sources = "sources",
  Untracked = "untracked",
  OpenSpec = "openspec",
  Formatting = "formatting",
  Linting = "linting",
  NoInlineStrings = "no-inline-strings",
  NoLocalTypes = "no-local-types",
  NoStringLiteralTypes = "no-string-literal-types",
  MaxNesting = "max-nesting",
  FlatTests = "flat-tests",
  NoComments = "no-comments",
  LazyAsync = "lazy-async",
  Spelling = "spelling",
  SecretScanning = "secret-scanning",
  DiagramValidity = "diagram-validity",
  PackageReadmes = "package-readmes",
  RepoHygiene = "repo-hygiene",
  TestTiers = "test-tiers",
  TestingArea = "testing-area",
  UnitCases = "unit-cases",
  AgentKnowledge = "agent-knowledge",
  SkillPackages = "skill-packages",
  SkillsFresh = "skills-fresh",
  AsyncFunctions = "async-functions",
  PromiseAll = "promise-all",
  PackageGraph = "package-graph",
  FullCoverage = "full-coverage",
  ApiCompatibility = "api-compatibility",
  MigrationDrift = "migration-drift",
  KnowledgeBase = "knowledge-base",
  DocsBuild = "docs-build",
  DocsSeparation = "docs-separation",
  PlainLanguage = "plain-language",
  SdkInSync = "sdk-in-sync",
  SdkStandalone = "sdk-standalone",
  PluginFixtures = "plugin-fixtures",
  CommitMessages = "commit-messages",
  RuleRegistry = "rule-registry",
  WorkflowsDisabled = "workflows-disabled",
  TypeCheck = "type-check",
  UnusedCode = "unused-code",
  ZodSchemas = "zod-schemas",
  ErrorCasesDocumented = "error-cases-documented",
  InterfacesMatch = "interfaces-match",
  UrlsInConfig = "urls-in-config",
  ConcreteDocs = "concrete-docs",
  InfraFiles = "infra-files",
  CommentsWiped = "comments-wiped",
}

export enum HookJob {
  DocumentScope = "document-scope",
  DocumentLinks = "document-links",
  Sources = "sources",
  Untracked = "untracked",
  OpenSpec = "openspec",
  Biome = "biome",
  Dprint = "dprint",
  Cspell = "cspell",
  SecretScan = "secret-scan",
  Secretlint = "secretlint",
  Mermaid = "mermaid",
  BiomePluginFixtures = "biome-plugin-fixtures",
  Structure = "structure",
  Readmes = "readmes",
  Repo = "repo",
  Tiers = "tiers",
  TestingArea = "testing-area",
  UnitCases = "unit-cases",
  AgentKnowledge = "agent-knowledge",
  SkillPackages = "skill-packages",
  SkillsFresh = "skills-fresh",
  AsyncFunctions = "async-functions",
  PromiseAll = "promise-all",
  PackageGraph = "package-graph",
  Coverage = "coverage",
  E2e = "e2e",
  OpenApi = "openapi",
  Migrations = "migrations",
  Kb = "kb",
  Docs = "docs",
  DocsScope = "docs-scope",
  PlainLanguage = "plain-language",
  Sdk = "sdk",
  SdkPack = "sdk-pack",
  Commitlint = "commitlint",
  CspellMessage = "cspell-message",
  Rules = "rules",
  Workflows = "workflows",
  Typecheck = "typecheck",
  Knip = "knip",
  Schemas = "schemas",
  ErrorCases = "error-cases",
  Interfaces = "interfaces",
  UrlLiterals = "url-literals",
  ConcreteDocs = "concrete-docs",
  InfraFiles = "infra-files",
  Comments = "comments",
}

export const RULE_JOBS: Readonly<Record<DevRule, readonly HookJob[]>> = {
  [DevRule.DocumentScope]: [HookJob.DocumentScope],
  [DevRule.DocumentLinks]: [HookJob.DocumentLinks],
  [DevRule.Sources]: [HookJob.Sources],
  [DevRule.Untracked]: [HookJob.Untracked],
  [DevRule.OpenSpec]: [HookJob.OpenSpec],
  [DevRule.Formatting]: [HookJob.Biome, HookJob.Dprint],
  [DevRule.Linting]: [HookJob.Biome],
  [DevRule.NoInlineStrings]: [HookJob.Biome, HookJob.BiomePluginFixtures],
  [DevRule.NoLocalTypes]: [HookJob.Biome, HookJob.BiomePluginFixtures],
  [DevRule.NoStringLiteralTypes]: [HookJob.Biome, HookJob.BiomePluginFixtures],
  [DevRule.MaxNesting]: [HookJob.Structure],
  [DevRule.FlatTests]: [HookJob.Structure],
  [DevRule.NoComments]: [HookJob.Structure],
  [DevRule.LazyAsync]: [HookJob.Structure],
  [DevRule.Spelling]: [HookJob.Cspell, HookJob.CspellMessage],
  [DevRule.SecretScanning]: [HookJob.SecretScan, HookJob.Secretlint],
  [DevRule.DiagramValidity]: [HookJob.Mermaid],
  [DevRule.PackageReadmes]: [HookJob.Readmes],
  [DevRule.RepoHygiene]: [HookJob.Repo],
  [DevRule.TestTiers]: [HookJob.Tiers],
  [DevRule.TestingArea]: [HookJob.TestingArea],
  [DevRule.UnitCases]: [HookJob.UnitCases],
  [DevRule.AgentKnowledge]: [HookJob.AgentKnowledge],
  [DevRule.SkillPackages]: [HookJob.SkillPackages],
  [DevRule.SkillsFresh]: [HookJob.SkillsFresh],
  [DevRule.AsyncFunctions]: [HookJob.AsyncFunctions],
  [DevRule.PromiseAll]: [HookJob.PromiseAll],
  [DevRule.PackageGraph]: [HookJob.PackageGraph],
  [DevRule.FullCoverage]: [HookJob.Coverage],
  [DevRule.ApiCompatibility]: [HookJob.OpenApi],
  [DevRule.MigrationDrift]: [HookJob.Migrations],
  [DevRule.KnowledgeBase]: [HookJob.Kb],
  [DevRule.DocsBuild]: [HookJob.Docs],
  [DevRule.DocsSeparation]: [HookJob.DocsScope],
  [DevRule.PlainLanguage]: [HookJob.PlainLanguage],
  [DevRule.SdkInSync]: [HookJob.Sdk],
  [DevRule.SdkStandalone]: [HookJob.SdkPack],
  [DevRule.PluginFixtures]: [HookJob.BiomePluginFixtures],
  [DevRule.CommitMessages]: [HookJob.Commitlint],
  [DevRule.RuleRegistry]: [HookJob.Rules],
  [DevRule.WorkflowsDisabled]: [HookJob.Workflows],
  [DevRule.TypeCheck]: [HookJob.Typecheck],
  [DevRule.UnusedCode]: [HookJob.Knip],
  [DevRule.ZodSchemas]: [HookJob.Schemas],
  [DevRule.ErrorCasesDocumented]: [HookJob.ErrorCases],
  [DevRule.InterfacesMatch]: [HookJob.Interfaces],
  [DevRule.UrlsInConfig]: [HookJob.UrlLiterals],
  [DevRule.ConcreteDocs]: [HookJob.ConcreteDocs],
  [DevRule.InfraFiles]: [HookJob.InfraFiles],
  [DevRule.CommentsWiped]: [HookJob.Comments],
};

export const JOB_VERIFY_STEPS: Readonly<Record<HookJob, VerifyStep>> = {
  [HookJob.DocumentScope]: VerifyStep.DocumentScope,
  [HookJob.DocumentLinks]: VerifyStep.DocumentLinks,
  [HookJob.Untracked]: VerifyStep.Untracked,
  [HookJob.OpenSpec]: VerifyStep.OpenSpec,
  [HookJob.Sources]: VerifyStep.Sources,
  [HookJob.Biome]: VerifyStep.Biome,
  [HookJob.Dprint]: VerifyStep.Dprint,
  [HookJob.Cspell]: VerifyStep.Cspell,
  [HookJob.SecretScan]: VerifyStep.SecretScan,
  [HookJob.Secretlint]: VerifyStep.Secretlint,
  [HookJob.Mermaid]: VerifyStep.Mermaid,
  [HookJob.BiomePluginFixtures]: VerifyStep.Coverage,
  [HookJob.Structure]: VerifyStep.Structure,
  [HookJob.Readmes]: VerifyStep.Readmes,
  [HookJob.Repo]: VerifyStep.Repo,
  [HookJob.Tiers]: VerifyStep.Tiers,
  [HookJob.TestingArea]: VerifyStep.TestingArea,
  [HookJob.UnitCases]: VerifyStep.UnitCases,
  [HookJob.AgentKnowledge]: VerifyStep.AgentKnowledge,
  [HookJob.SkillPackages]: VerifyStep.SkillPackages,
  [HookJob.SkillsFresh]: VerifyStep.SkillsFresh,
  [HookJob.AsyncFunctions]: VerifyStep.AsyncFunctions,
  [HookJob.PromiseAll]: VerifyStep.PromiseAll,
  [HookJob.PackageGraph]: VerifyStep.PackageGraph,
  [HookJob.Coverage]: VerifyStep.Coverage,
  [HookJob.E2e]: VerifyStep.E2e,
  [HookJob.OpenApi]: VerifyStep.OpenApi,
  [HookJob.Migrations]: VerifyStep.Migrations,
  [HookJob.Kb]: VerifyStep.Kb,
  [HookJob.Docs]: VerifyStep.E2e,
  [HookJob.DocsScope]: VerifyStep.DocsScope,
  [HookJob.PlainLanguage]: VerifyStep.PlainLanguage,
  [HookJob.Sdk]: VerifyStep.Sdk,
  [HookJob.SdkPack]: VerifyStep.SdkPack,
  [HookJob.Commitlint]: VerifyStep.Coverage,
  [HookJob.CspellMessage]: VerifyStep.Coverage,
  [HookJob.Rules]: VerifyStep.Rules,
  [HookJob.Workflows]: VerifyStep.Workflows,
  [HookJob.Typecheck]: VerifyStep.Typecheck,
  [HookJob.Knip]: VerifyStep.Knip,
  [HookJob.Schemas]: VerifyStep.Schemas,
  [HookJob.ErrorCases]: VerifyStep.ErrorCases,
  [HookJob.Interfaces]: VerifyStep.Interfaces,
  [HookJob.UrlLiterals]: VerifyStep.UrlLiterals,
  [HookJob.ConcreteDocs]: VerifyStep.ConcreteDocs,
  [HookJob.InfraFiles]: VerifyStep.InfraFiles,
  [HookJob.Comments]: VerifyStep.Structure,
};

export enum HookStage {
  PreCommit = "pre-commit",
  CommitMsg = "commit-msg",
  PrePush = "pre-push",
}

export const MESSAGE_JOBS: readonly HookJob[] = [HookJob.Commitlint, HookJob.CspellMessage];

export enum AstNodeType {
  If = "IfStatement",
  For = "ForStatement",
  ForIn = "ForInStatement",
  ForOf = "ForOfStatement",
  While = "WhileStatement",
  DoWhile = "DoWhileStatement",
  Switch = "SwitchStatement",
  Try = "TryStatement",
  FunctionDeclaration = "FunctionDeclaration",
  FunctionExpression = "FunctionExpression",
  ArrowFunction = "ArrowFunctionExpression",
  Block = "BlockStatement",
  Call = "CallExpression",
  Object = "ObjectExpression",
  Identifier = "Identifier",
  New = "NewExpression",
  Method = "MethodDefinition",
  Member = "MemberExpression",
  Declarator = "VariableDeclarator",
  Import = "ImportDeclaration",
  ExportNamed = "ExportNamedDeclaration",
  Variable = "VariableDeclaration",
  Array = "ArrayExpression",
  Property = "Property",
  Literal = "Literal",
}

export const PRODUCT_AREA_ALIASES: Readonly<Record<string, string>> = {
  "tooling/scripts": "tooling",
};

export const NESTING_EXEMPT_FUNCTIONS = ["expect"] as const;

export enum StructureFlag {
  TestFile = "test",
}
export const STRUCTURE_PARSER_LANG = "ts";

export enum ConfigFile {
  Biome = "biome.json",
  Dprint = "dprint.json",
  Cspell = "cspell.json",
  ProjectWords = "project-words.txt",
}

export const BIOME_PLUGIN_DIR = "tooling/biome";
export const BIOME_PLUGIN_EXTENSION = ".grit";
export const FIXTURE_TEMP_PREFIX = "fixture-";

export const SYNC_API_SUFFIX = "Sync";
export const EAGER_COLLECTIONS = ["Map", "Set", "WeakMap", "WeakSet"] as const;
export const STORE_PACKAGE_PATH = "packages/store/";
export const YAML_COMMENT = /^\s*#/;

export enum CommentStyle {
  Typescript = "typescript",
  Tsx = "tsx",
  Hash = "hash",
  Markup = "markup",
  Slash = "slash",
  Block = "block",
}

export const COMMENT_SUFFIX_STYLES: Readonly<Record<string, CommentStyle>> = {
  ".ts": CommentStyle.Typescript,
  ".tsx": CommentStyle.Tsx,
  ".yml": CommentStyle.Hash,
  ".yaml": CommentStyle.Hash,
  ".toml": CommentStyle.Hash,
  ".gitignore": CommentStyle.Hash,
  ".env.example": CommentStyle.Hash,
  ".md": CommentStyle.Markup,
  ".mdx": CommentStyle.Markup,
  ".html": CommentStyle.Markup,
  ".json": CommentStyle.Slash,
  ".grit": CommentStyle.Slash,
  ".css": CommentStyle.Block,
};
export const COMMENT_NAME_STYLES: Readonly<Record<string, CommentStyle>> = {
  CODEOWNERS: CommentStyle.Hash,
  Dockerfile: CommentStyle.Hash,
};
export const COMMENT_MARK = "\uE000";
export const COMMENT_OPENER = /^(\/\/|\/\*|<!--|\{\/\*)/;
export const SLASH_COMMENT_PATTERN =
  /"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g;
export const BLOCK_COMMENT_PATTERN = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\/\*[\s\S]*?\*\//g;
export const MARKUP_COMMENT_PATTERN = /`[^`\n]*`|<!--[\s\S]*?-->|\{\/\*[\s\S]*?\*\/\}/g;
export const MARKDOWN_FENCE = /(^```[\s\S]*?^```)/m;
export const MARKED_LINE = /^[ \t]*\uE000+[ \t]*\n?/gm;
export const MARK_RESIDUE = /[ \t]*\uE000/g;
export const TSX_PARSER_LANG = "tsx";
export const STDIN_FLAG = "--stdin";
export const COMMENT_CHECK_FLAG = "--check";
export const FORMATTING_COMMAND = [
  "bunx",
  "--no-install",
  "dprint",
  "check",
  "--incremental=false",
] as const;
export const COMMENT_FILE_LIST = [
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
] as const;
export const CONSTRUCTOR_KIND = "constructor";
export const EXECUTABLE_MODE = 0o755;
export const EXTERNAL_TOOL_FILES: readonly string[] = ["openspec/config.yaml"];
export const HEAVY_MODULES: readonly string[] = [
  "jsdom",
  "mermaid",
  "better-auth",
  "drizzle-orm",
  "@modelcontextprotocol/",
  "@opentelemetry/",
  "pino",
  "astro",
  "react",
];
export const LAZY_IGNORED_PATHS: readonly string[] = [
  "packages/types/",
  "testing/",
  "packages/constants/",
  "packages/messages/",
  ".test.ts",
  ".config.ts",
  ".generated.ts",
  "tooling/scripts/",
  "apps/console/",
  "apps/docs/",
];

export enum OpenApiMode {
  Check = "check",
  Update = "update",
  Ui = "ui",
}

export const DRIZZLE_KIT = "drizzle-kit";
export const DRIZZLE_GENERATE_ARGS = ["generate", "--dialect", "sqlite"] as const;
export const DRIZZLE_SCHEMA_FLAG = "--schema";
export const DRIZZLE_OUT_FLAG = "--out";
export const DRIZZLE_NO_CHANGES = "No schema changes";
export const DRIZZLE_NEEDS_ANSWER = "Interactive prompts require a TTY";
export const DRIZZLE_GENERATED = "SQL migration file";
export const BUN_FLAG = "--bun";
export const NO_INSTALL_FLAG = "--no-install";
export const MIGRATIONS_TEMP_PREFIX = "migrations-";
export const OASDIFF_ARGS = ["breaking", "--fail-on", "ERR"] as const;
export const OPENAPI_TEMP_PREFIX = "openapi-";

export const INSTALLABLE_TOOLS = [ToolBinary.Gitleaks, ToolBinary.Oasdiff] as const;
export const BUNDLED_TOOLS = [ToolBinary.Pulumi] as const;
export const PULUMI_VERSION = "3.273.0";
export const PULUMI_DOCKER_PLUGIN_VERSION = "5.2.0";
export const PULUMI_DOCKER_PLUGIN_SHA256 =
  "cedc3247a844c12f5995c6908d593338454aed36829e0b789f00cdeb88ccbaea";
export const PULUMI_ARCHIVE_FILES: Readonly<Record<Platform, string>> = {
  [Platform.LinuxX64]: `pulumi-v${PULUMI_VERSION}-linux-x64.tar.gz`,
};
export const PULUMI_ARCHIVE_SHA256: Readonly<Record<Platform, string>> = {
  [Platform.LinuxX64]: "ec08f86671fd58f0a186540e1cee00066393beaf5c6716b0075f690919800432",
};
export const BUNDLE_RELEASES = {
  [ToolBinary.Pulumi]: {
    version: PULUMI_VERSION,
    files: PULUMI_ARCHIVE_FILES,
    sha256: PULUMI_ARCHIVE_SHA256,
  },
} as const;

export const TOOL_RELEASES = {
  [ToolBinary.Gitleaks]: {
    version: GITLEAKS_VERSION,
    files: GITLEAKS_ARCHIVE_FILES,
    sha256: GITLEAKS_ARCHIVE_SHA256,
  },
  [ToolBinary.Oasdiff]: {
    version: OASDIFF_VERSION,
    files: OASDIFF_ARCHIVE_FILES,
    sha256: OASDIFF_ARCHIVE_SHA256,
  },
} as const;

export const SDK_OUTPUT_ENV = "SDK_OUTPUT";
export const TYPEOF_FUNCTION = "function";
export const SDK_BUILT_ENTRY = "packages/sdk/dist/index.js";
export const SDK_PACKAGE_NAME = "@platform/sdk";
export const SDK_PROJECT_PREFIX = "sdk-consumer-";
export const SDK_CONSUMER_MANIFEST = '{"name":"sdk-consumer","private":true,"type":"module"}';
export const SDK_TYPECHECK_ARGS = [
  "--noEmit",
  "--strict",
  "--module",
  "esnext",
  "--moduleResolution",
  "bundler",
  "--target",
  "esnext",
  "--lib",
  "esnext,dom",
] as const;
export const SDK_CLIENT_ARGUMENT = "client";
export const SDK_CONSUMER_FILE = "consumer.mjs";
export const SDK_STEPS_FILE = "steps.json";
export const SDK_INSTALL_ARGS = ["bun", "add"] as const;
export const SDK_INSTALLED_ENTRY = "node_modules/@platform/sdk/dist/index.js";
export const SDK_CONSUMER_SOURCE = [
  'import { readFile } from "node:fs/promises";',
  'import * as sdk from "@platform/sdk";',
  "const [file, origin] = process.argv.slice(2);",
  'const steps = JSON.parse(await readFile(file, "utf8"));',
  "const observed = [];",
  "for (const step of steps) {",
  "  const client = await sdk.createSdkClient({ origin, token: step.token });",
  "  try {",
  "    const body = await sdk.unwrap(sdk[step.call]({ client, ...step.params }));",
  "    observed.push({ ok: true, body });",
  "  } catch (error) {",
  "    const { status, reason, httpStatus } = error;",
  "    observed.push({ ok: false, status, reason, httpStatus });",
  "  }",
  "}",
  'console.log(JSON.stringify({ entry: import.meta.resolve("@platform/sdk"), observed }));',
].join("\n");
export const SDK_ENTRY = "src/index.ts";
export const SDK_BUILD_FORMATS = ["esm"] as const;
export const SDK_BUILD_LOG_LEVEL = "error";
export const SDK_EXTERNALS = ["zod"];
export const SDK_PACK_ARGS = ["bun", "pm", "pack", "--destination"] as const;
export const SDK_TARBALL_SUFFIX = ".tgz";
export const SDK_PACK_PREFIX = "sdk-pack-";
export const SDK_PACKED_DIR = "package";
export const SDK_SCANNED_SUFFIXES = [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"] as const;
export const SDK_IMPORT_PATTERN =
  /(?:^\s*(?:import|export)\b[^"'`;]*?\bfrom\s*|^\s*import\s*|\bimport\s*\(\s*|\brequire\s*\(\s*)["']([^"'\s]+)["']/gm;
export const SDK_FORBIDDEN_SPECIFIERS: readonly RegExp[] = [
  /^@platform\//,
  /^workspace:/,
  /\/src\//,
  /^\.\.\//,
  /\.tsx?$/,
  /generated\//,
];
export const SDK_GENERATOR = "openapi-ts";
export const SDK_TEMP_PREFIX = "sdk-";
export const TSC_PROJECT_FLAG = "-p";
export const TSC_NO_EMIT_FLAG = "--noEmit";

export const BUILD_DOCS_SCRIPT = "tooling/scripts/build-docs.ts";

export enum TestTier {
  Unit = "unit",
  Integration = "integration",
  E2e = "e2e",
}

export enum TestingPath {
  Root = "testing",
  Packages = "testing/packages",
}

export const TIER_DIRS: Readonly<Record<TestTier, string>> = {
  [TestTier.Unit]: "testing/unit/",
  [TestTier.Integration]: "testing/integration/",
  [TestTier.E2e]: "testing/e2e/",
};

export enum TestingRule {
  OutsideArea = "outside-area",
  StackViolation = "stack-violation",
}

export const TESTING_STACK: readonly string[] = [
  "@platform/test-framework",
  "@platform/test-factories",
  "@platform/test-scenarios",
  "@platform/kb-recorder",
];
export const TESTING_PACKAGE_PREFIX = "@platform/test-";
export const TESTING_FILE_NAME = /\.(test|spec|dom)\.tsx?$/;
export const TESTING_MANIFEST_GLOB = "testing/packages/*/package.json";
export const TESTING_SCAN_EXCLUDED: readonly RegExp[] = [
  /(^|\/)node_modules\//,
  /(^|\/)dist\//,
  /(^|\/)generated\//,
  /\.generated\.ts$/,
  /^apps\/docs\//,
];
export const TESTING_HELPER_NAME =
  /(^|[.-])(fixtures?|harness|mocks?|stubs?|fakes?|testkit)(\.|-|$)/;
export const TESTING_IMPORTS: readonly RegExp[] = [
  /from\s+["']bun:test["']/,
  /(?:from|import)\s+["']@platform\/test-/,
];
export const TESTING_SCANNED_GLOBS: readonly string[] = [
  "apps/**/*.{ts,tsx}",
  "packages/**/*.{ts,tsx}",
  "tooling/**/*.{ts,tsx}",
];
export const MANIFEST_DEPENDENCY_SECTIONS: readonly string[] = ["dependencies", "devDependencies"];
export const UNIT_TEST_GLOB = "testing/unit/**/*.test.{ts,tsx}";

export enum CasePolarity {
  Positive = "positive",
  Negative = "negative",
}

export enum CaseMode {
  Returns = "returns",
  Throws = "throws",
}

export enum CaseFactory {
  Positive = "positive",
  Negative = "negative",
  Rejected = "rejected",
}

export enum UnitRule {
  MissingCases = "missing-cases",
  TooFewPositive = "too-few-positive",
  TooFewNegative = "too-few-negative",
  NotFactoryBuilt = "not-factory-built",
  StaleDebt = "stale-debt",
}

export const UNIT_DEBT_FILE = "testing/unit-debt.json";

export const MIN_CASES_PER_POLARITY = 2;
export const UNIT_FUNCTION = "unit";
export const UNIT_SOURCE_GLOBS: readonly string[] = [
  "packages/*/src/**/*.{ts,tsx}",
  "apps/*/src/**/*.{ts,tsx}",
  "tooling/scripts/*.ts",
];
export const UNIT_SOURCE_EXCLUDED: readonly RegExp[] = [
  /\/generated\//,
  /\.generated\.ts$/,
  /\/components\/ui\//,
];
export const PRODUCT_AREA_PATTERN = /^(?:(?:packages|apps)\/[^/]+|tooling\/scripts)/;
export const PLATFORM_SCOPE = "@platform/";
export const ISOLATED_UNIT_DIRS: readonly string[] = ["testing/unit/console/"];
export const COVERAGE_FLAGS: readonly string[] = ["--coverage", "--coverage-reporter=lcov"];
export const COVERAGE_DIR_FLAG = "--coverage-dir=";
export const COVERAGE_LCOV_FILE = "lcov.info";
export const COVERAGE_REPORT_GLOB = "**/lcov.info";
export const JUNIT_REPORT_GLOB = "**/junit.xml";
export const TEST_CHILD_REPORT_DIR_ENV = "TEST_CHILD_REPORT_DIR";
export const COVERAGE_TEMP_PREFIX = "coverage-";
export const COVERAGE_REQUIRED_PERCENT = 100;
export const GIT_ENV_PREFIX = "GIT_";
export const COVERAGE_DECLARATION_SUFFIX = ".d.ts";
export const COVERAGE_NON_CODE_LINE = /^[\s})\];,]*$/;
export const COVERAGE_BLOCKING = true;
export const COVERAGE_EXCLUDED: readonly RegExp[] = [
  /^testing\//,
  /(^|\/)generated\//,
  /(^|\/)dist\//,
  /node_modules\//,
  /\.generated\.ts$/,
  /\.test\.tsx?$/,
];
export enum LcovTag {
  SourceFile = "SF:",
  Line = "DA:",
  FunctionsFound = "FNF:",
  FunctionsHit = "FNH:",
  EndOfRecord = "end_of_record",
}
export const TEST_FILE_GLOB = "**/*.test.{ts,tsx}";
export const OPENS_PORT_OR_DATABASE: readonly RegExp[] = [
  /Bun\.serve\(/,
  /startServer\(/,
  /createApi\(/,
  /createDatabase\(/,
  /Bun\.spawn\(/,
  /launchBrowser\(/,
  /new Database\(/,
];

export enum PlainRule {
  MissingTitle = "missing-title",
  MissingDescription = "missing-description",
  MissingCategory = "missing-category",
  LongSentence = "sentence-too-long",
  BannedWord = "banned-word",
}

export const PLAIN_MAX_SENTENCE_WORDS = 30;
export const PLAIN_BANNED_WORDS: readonly string[] = ["simply", "obviously", "click here"];
export const PLAIN_FRONT_MATTER = /^---\n([\s\S]*?)\n---\n/;
export const PLAIN_CODE_FENCE = /^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[ \t]*$/gm;
export const PLAIN_INLINE_CODE = /`[^`]*`/g;
export const PLAIN_LINK = /\[([^\]]*)\]\([^)]*\)/g;
export const PLAIN_SENTENCE_END = /(?<=[.!?])\s+/;
export const PLAIN_SKIPPED_LINE = /^(\s*(#|\||!\[|<|import )|\s*$)/;
export const PLAIN_TITLE_FIELD = /^title:\s*\S/m;
export const PLAIN_DESCRIPTION_FIELD = /^description:\s*\S/m;
export const PLAIN_LINK_TEXT = "$1";
export const PLAIN_EXTRA_FOLDERS: readonly string[] = ["e2e"];
export const PLAIN_ROOT_PAGES: readonly string[] = ["index"];
export const DOCS_CONTENT_DIR = "apps/docs/src/content/docs";
export const DOCS_CONTENT_GLOB = "**/*.{md,mdx}";
export const DEVELOPMENT_PAGE_NAMES: readonly string[] = [
  "guidelines",
  "architecture",
  "development",
  "e2e",
  "standards",
  "running-verify",
  "enabling-ci",
  "how-it-is-done",
];

export const UNREACHABLE_REASONS: readonly string[] = ["FIELD_IMMUTABLE"];
export const REASON_ENUM_KEY = "reason";
export const ENUM_KEY = "enum";
export const VERIFY_COMMANDS_NAME = "VERIFY_COMMANDS";
export const FULL_VERIFY_HOOK_NAME = "verify";
export const FULL_VERIFY_HOOK_COMMAND = "bun run verify";
export const CHECKS_RUNNER_COMMAND = ["bun", "run", "apps/infra/src/runner.ts"] as const;
export const E2E_TIMINGS_FILE = "e2e-suites.json";
export const DOCS_TIMINGS_FILE = "docs-phases.json";
export const COVERAGE_TIMINGS_FILE = "coverage-groups.json";
export const E2E_METRICS_PHASE = "end-to-end metric budgets";
export enum DocumentationPhase {
  Record = "record scenarios",
  Reference = "generate reference",
  Sdk = "generate SDK pages",
  Api = "generate API pages",
  Performance = "generate performance report",
  Protocol = "generate protocol report",
  GettingStarted = "generate getting started page",
  Validate = "validate generated documentation",
  Urls = "mark missing URLs",
  Build = "build documentation site",
  Browser = "check documentation in browser",
  Complete = "documentation production",
}
export const PRE_PUSH_ONLY_STEPS: readonly VerifyStep[] = [
  VerifyStep.Sources,
  VerifyStep.Untracked,
  VerifyStep.E2e,
  VerifyStep.Coverage,
  VerifyStep.Audit,
  VerifyStep.Kb,
];
export const GENERATED_FRONT_MATTER = /^---\n[\s\S]*?^generated: true$[\s\S]*?^---\n/m;
export const HAND_WRITTEN_ALLOWED: readonly string[] = ["index"];
export const DEFAULT_STATUS = "default";
export const SUCCESS_STATUS = "200";

export const URL_LITERAL_PATTERN = /https?:\/\/[^\s"'`)]*|\blocalhost\b|\b127\.0\.0\.1\b/g;
export const INFRA_FILE_NAME = "Containerfile";
export const INFRA_COMMENT_PREFIX = "#";
export const INFRA_PORT_PATTERN = /^(?:EXPOSE\s+\d+|ENV\s+\w*PORT\w*=\d+)/;
export const INFRA_DIGEST_PATTERN = /@sha256:[0-9a-f]{64}$/;
export const INFRA_FROM_PATTERN = /^FROM\s+(\S+)(?:\s+AS\s+(\S+))?\s*$/i;
export const INFRA_FROM_KEYWORD = "FROM";
export const INFRA_SCRATCH = "scratch";
export const INFRA_DIRECTORY = "apps/infra/";
export const URL_LITERAL_CONFIG = "url-literals.json";
export const CONFIG_PACKAGE_PATH = "packages/config/";
export const CONCRETE_MISSING = "address";
export const CONCRETE_CURL = /curl --request \w+ 'https?:\/\/[^/'\s]+/;
export const CONCRETE_ENDPOINT = /^Endpoint: `?https?:\/\/[^/\s`]+/m;
export const CONCRETE_CONSOLE =
  /^URL: `?https?:\/\/[^/\s`]+|curl --request \w+ 'https?:\/\/[^/'\s]+/m;

export const CLAUDE_FILE = "CLAUDE.md";
export const AGENTS_FILE = "AGENTS.md";
export const DEV_RULES_FILE = "DEV_RULES.md";
export const SKILLS_DIR = ".claude/skills";
export const COMMANDS_DIR = ".claude/commands";
export const SKILL_FILE = "SKILL.md";
export const SKILL_PATHS_FILE = ".claude/skills/skill-paths.json";
export const SKILL_FILE_GLOB = "*/SKILL.md";
export const MANAGED_SKILL_PREFIX = "openspec-";
export const FRONT_MATTER_PATTERN = /^---\n([\s\S]*?)\n---/;
export const FRONT_NAME_PATTERN = /^name:\s*(.+)$/m;
export const FRONT_DESCRIPTION_PATTERN = /^description:\s*(.+)$/m;
export const OPEN_CHANGES_DIR = "openspec/changes";
export const OPEN_CHANGES_GLOB = "*/tasks.md";
export const TASKS_FILE = "tasks.md";
export const TASK_DONE_PATTERN = /^- \[x\]/gm;
export const TASK_ANY_PATTERN = /^- \[[ x]\]/gm;
export const GIT_AHEAD_BEHIND_COMMAND: readonly string[] = [
  "git",
  "rev-list",
  "--left-right",
  "--count",
  "origin/main...HEAD",
];
export const WHITESPACE = /\s+/;
export enum CoverageMode {
  Blocking = "blocking",
  ReportOnly = "report-only",
}
export enum DevStatusSource {
  OpenSpec = "openspec changes",
  UnitDebt = "testing/unit-debt.json",
  Tests = "test files",
  Inventory = "skills and commands",
  Git = "git position",
}
export const GLOB_MARK = "*";
export const DEV_COMMANDS_DIR = ".claude/commands/dev";
export const DEV_COMMAND_PREFIX = "/dev:";
export const COMMAND_FILE_GLOB = "*.md";
export const COMMAND_FILE_SUFFIX = ".md";
export const FRONT_SKILL_PATTERN = /^Skill:\s*(\S+)\s*$/m;
export const SELF_UPDATE_SKILL = "project-self-update";
export const SELF_UPDATE_SECTIONS: readonly string[] = ["## When to update", "## How to update"];
export const GIT_STAGED_NAMES: readonly string[] = ["git", "diff", "--cached", "--name-only"];
export const NUL = "\u0000";
export const GIT_UNTRACKED_COMMAND: readonly string[] = [
  "git",
  "ls-files",
  "--others",
  "--exclude-standard",
  "-z",
];

export const ASYNC_IGNORE_FILE = "async-ignore.json";
export const PROMISE_ALL_IGNORE_FILE = "promise-all-ignore.json";
export const PROMISE_OBJECT = "Promise";
export const PROMISE_ALL_METHOD = "all";
export const PROMISE_ALL_GLOBS: readonly string[] = [
  "apps/*/src/**/*.{ts,tsx}",
  "packages/*/src/**/*.{ts,tsx}",
  "tooling/scripts/*.ts",
  "testing/unit/**/*.ts",
  "testing/integration/**/*.ts",
  "testing/e2e/**/*.ts",
  "testing/packages/*/src/**/*.ts",
];
export const PACKAGE_MANIFEST_GLOBS: readonly string[] = [
  "packages/*/package.json",
  "apps/*/package.json",
];
export const CONSOLE_BUNDLE_ENTRY = "apps/console/src/main.tsx";
export const BUNDLE_TARGET = "browser";
export const NODE_ENV_NAME = "NODE_ENV";
export const BUNDLE_DEFINE_KEY = "process.env.NODE_ENV";
export const BUNDLE_DEFINE_VALUE = '"production"';
export const BUNDLE_FORBIDDEN_TEXT = "process.env";
export const BUNDLE_FORBIDDEN_INPUTS: readonly string[] = [
  "packages/config/src/index.ts",
  "packages/config/src/load.ts",
  "packages/util/src/index.ts",
  "packages/util/src/all.ts",
  "packages/util/src/env.ts",
];
export const CYCLE_JOINER = " -> ";
export const TYPE_PREDICATE = "TSTypePredicate";
export enum MethodKindName {
  Constructor = "constructor",
  Get = "get",
  Set = "set",
}

export const AST_NODE_FIELDS = ["type", "start", "end"] as const;
export const TYPEOF_OBJECT = "object";
