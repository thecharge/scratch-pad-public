import { SCRUB_PATTERNS, SCRUBBED_VALUE } from "@platform/constants";

export function scrubSecrets(text: string): string {
  return SCRUB_PATTERNS.reduce(
    (current, pattern) => current.replace(pattern, SCRUBBED_VALUE),
    text,
  );
}
