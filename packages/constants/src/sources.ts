export const SOURCE_INDEX_GLOB = "openspec/changes/*/source-records.json";
export const SOURCE_DOCUMENT_GLOB = "**/*.md";
export const SOURCE_CAPTURE_DIRECTORY = "evidence/sources/";
export const SOURCE_TABLE_MARKER = "\n## Verified external sources\n";
export const SOURCE_TABLE_HEADER =
  "| Source | URL | Fetched UTC | HTTP | SHA-256 | Passage | Falsification and output |\n| --- | --- | --- | --- | --- | --- | --- |\n";
export const SOURCE_NORMALIZE_MARKUP = /<[^>]+>|&(?:#\w+|\w+);/g;
export const SOURCE_NORMALIZE_PUNCTUATION = /[^\p{L}\p{N}]/gu;
export const SOURCE_REFERENCE_PATTERN = /\bS\d+\b/g;
export const SOURCE_TIMEOUT_MS = 10000;
export const SOURCE_PIPE = "\\|";
export const SOURCE_ROW_SEPARATOR = " | ";
export const SOURCE_PIPE_PATTERN = /\|/g;
export const SOURCE_TASKS_GLOB = "openspec/changes/*/tasks.md";
export const SOURCE_REQUIREMENT_MARKER = "1.0 Sourcing and verification:";
export const SOURCE_INDEX_FILE = "source-records.json";
export const SOURCE_FETCH_HEADERS = {
  Accept: "application/json, text/plain, text/html",
  "User-Agent": "source-verification",
} as const;
export const SOURCE_REVIEW_WHITESPACE = /\s+/g;
