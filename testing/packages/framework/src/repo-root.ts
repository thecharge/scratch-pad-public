import { resolve } from "node:path";
import { DEFAULT_SKILL_DIRS, RepoPath } from "@platform/constants";

export const REPO_ROOT = resolve(import.meta.dir, RepoPath.RootFromTestingPackage);

export const PACKAGE_SKILL_DIRS = [resolve(REPO_ROOT, DEFAULT_SKILL_DIRS)];
