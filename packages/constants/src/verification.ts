import { VerifyStep } from "./tooling.ts";

export const VERIFICATION_PLAN_VERSION = 1;
export const VERIFICATION_PLAN_FILE = "plan.json";
export const VERIFICATION_ROOT_FLAG = "--root";
export const VERIFICATION_HASH = "sha256";
export const VERIFICATION_HASH_PATTERN = /^[a-f0-9]{64}$/;
export const VERIFICATION_COMMIT_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;
export const VERIFICATION_GUIDE_PATTERNS: readonly string[] = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "DEV_RULES.md",
  "docs/*.md",
  ".claude/skills/*/SKILL.md",
  ".claude/commands/**/*.md",
  "openspec/**/*.md",
  "openspec/changes/*/evidence/*.json",
];
export const VERIFICATION_BROAD_PATTERNS: readonly string[] = [
  "*.json",
  "*.yaml",
  "*.yml",
  "*.toml",
  "bun.lock",
  "**/package.json",
  "packages/**",
  "apps/infra/**",
  "tooling/**",
  "openspec/config.yaml",
  ".claude/skills/skill-paths.json",
];
export const VERIFICATION_SOURCE_PATTERNS: readonly string[] = ["apps/**", "testing/**"];
export const VERIFICATION_RUNTIME_CANDIDATES: readonly string[] = [VerifyStep.E2e, VerifyStep.Kb];
export const VERIFICATION_FULL_AFTER_ATTEMPTS = 5;
export const VERIFICATION_FULL_MAX_AGE_MS = 24 * 60 * 60 * 1000;
export const VERIFICATION_POLICY = {
  fullAfterAttempts: VERIFICATION_FULL_AFTER_ATTEMPTS,
  fullMaxAgeMs: VERIFICATION_FULL_MAX_AGE_MS,
};
export const VERIFICATION_GIT_FILES: readonly string[] = [
  "git",
  "ls-files",
  "--cached",
  "--others",
  "--exclude-standard",
  "-z",
];
export const VERIFICATION_GIT_UNTRACKED: readonly string[] = [
  "git",
  "ls-files",
  "--others",
  "--exclude-standard",
  "-z",
];
export const VERIFICATION_GIT_DIFF: readonly string[] = [
  "git",
  "diff",
  "--name-only",
  "--no-renames",
  "-z",
];
export const VERIFICATION_GIT_HEAD: readonly string[] = ["git", "rev-parse", "--verify", "HEAD"];
export const VERIFICATION_GIT_COMMIT: readonly string[] = [
  "git",
  "rev-parse",
  "--verify",
  "--end-of-options",
];
export const VERIFICATION_COMMIT_SUFFIX = "^{commit}";
export const VERIFICATION_PATH_SEPARATOR = "/";
export const VERIFICATION_PATH_END = "--";
export const VERIFICATION_PARENT = "..";
export const VERIFICATION_CURRENT = ".";

export enum VerificationInputKind {
  File = "file",
  Symlink = "symlink",
}

export enum VerificationArea {
  Guide = "guide",
  Broad = "broad",
  Source = "source",
  Unknown = "unknown",
}

export enum VerificationReason {
  ReportOnly = "report-only",
  MissingEvidence = "missing-evidence",
  MissingRange = "missing-range",
  InspectionFailed = "inspection-failed",
  DirtyTree = "dirty-tree",
  BroadChange = "broad-change",
  SourceChange = "source-change",
  UnknownPath = "unknown-path",
  LiveCheck = "live-check",
  Candidate = "candidate-requires-evidence",
  UnsafePath = "unsafe-path",
  UnsupportedInput = "unsupported-input",
  InvalidPolicy = "invalid-policy",
}
