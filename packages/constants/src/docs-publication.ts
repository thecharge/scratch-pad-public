export const DOCS_PUBLICATION_DIRECTORY = ".stack/docs-publications";
export const DOCS_PUBLICATION_CANDIDATE = "candidate-";
export const DOCS_PUBLICATION_WORKSPACE = "workspace";
export const DOCS_PUBLICATION_CURRENT = "current";
export const DOCS_PUBLICATION_LOCK = "publication.lock";
export const DOCS_PUBLICATION_PENDING = "pending-";
export const DOCS_PUBLICATION_MANIFEST = "manifest.json";
export const DOCS_PUBLICATION_VERSION = 1;
export const DOCS_PUBLICATION_CONTENT = "content";
export const DOCS_PUBLICATION_SITE = "site";
export const DOCS_PUBLICATION_REPORTS = "reports";
export const DOCS_PUBLICATION_GROUPS = ["content", "site", "reports"] as const;
export const DOCS_PUBLICATION_INDEX = "site/index.html";
export const DOCS_PUBLICATION_SOURCE = [
  "apps/docs/src",
  "apps/docs/public",
  "apps/docs/astro.config.ts",
  "apps/docs/tsconfig.json",
  "apps/docs/package.json",
  "openapi/baseline.json",
] as const;
export const DOCS_PUBLICATION_INPUTS = [
  ".stack/e2e",
  ".stack/metrics",
  ".stack/benchmarks",
  ".stack/verify",
] as const;
export const DOCS_PUBLICATION_DEPENDENCIES = ["node_modules", "apps/docs/node_modules"] as const;
export const DOCS_PUBLICATION_BAD = "Documentation publication candidate is invalid";
export const DOCS_PUBLICATION_AUTOMATED = "automatically-verified";
export const DOCS_PUBLICATION_PATH = /^(content|site|reports)\/[^\0\\]+$/u;
export const DOCS_ASTRO_CACHE = "./.astro/cache";

export const DOCS_PUBLICATION_EXCLUSIVE_WRITE = "wx";

export const DOCS_PUBLICATION_TEMPLATES = ["apps/docs/src/content/docs/index.mdx"] as const;

export const DOCS_PUBLICATION_REMOVE_TRANSIENT = "EFAULT";
export const DOCS_PUBLICATION_REMOVE_RETRIES = 3;
export const DOCS_PUBLICATION_REMOVE_DELAY_MS = 25;
export const DOCS_PUBLICATION_ERROR_CODE_FIELD = "code";
