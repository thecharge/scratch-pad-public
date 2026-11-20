export enum RepoFile {
  PackageJson = "package.json",
  License = "LICENSE",
  LicenseMarkdown = "LICENSE.md",
  LicenseText = "LICENSE.txt",
  Copying = "COPYING",
  DevRules = "DEV_RULES.md",
  QuickstartDeveloper = "docs/quickstart-developer.md",
  QuickstartApiConsumer = "docs/quickstart-api-consumer.md",
  QuickstartAgent = "docs/quickstart-agent.md",
}

export const WORKSPACE_DIRS = ["packages", "apps", "tooling"] as const;
export const LICENSE_FILES = [
  RepoFile.License,
  RepoFile.LicenseMarkdown,
  RepoFile.LicenseText,
  RepoFile.Copying,
] as const;
export const REQUIRED_DOCUMENTS = [
  RepoFile.DevRules,
  RepoFile.QuickstartDeveloper,
  RepoFile.QuickstartApiConsumer,
  RepoFile.QuickstartAgent,
] as const;
export const SDK_MANIFEST_PATH = "packages/sdk/package.json";
export const SDK_PACKAGE_DIR = "packages/sdk";
export const SDK_LICENSE_ID = "Apache-2.0";
export const SDK_LICENSE_MARKERS = ["Apache License", "Version 2.0, January 2004"] as const;
export const SDK_REQUIRED_FIELDS = ["version", "files", "exports", "types"] as const;
export const DEPENDENCY_FIELDS = [
  "dependencies",
  "peerDependencies",
  "optionalDependencies",
] as const;
export const WORKSPACE_PROTOCOL = "workspace:";
