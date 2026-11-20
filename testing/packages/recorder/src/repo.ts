import { resolve } from "node:path";
import { RepoPath } from "@platform/constants";

export const REPO_ROOT = resolve(import.meta.dir, RepoPath.RootFromTestingPackage);
