import {
  HTTP_DATE_PATTERN,
  KB_HTTP_DATE,
  KB_OBSERVED_TIME,
  KB_STABLE_YEAR,
  STABLE_UUID_DIGITS,
  STABLE_UUID_PREFIX,
  Text,
  TIMESTAMP_PATTERN,
  UUID_PATTERN,
  ZERO_DIGIT,
} from "@platform/constants";
import { type StepResult, StepResultSchema } from "@platform/types";
import { z } from "zod";

function ordinalId(index: number): string {
  return [STABLE_UUID_PREFIX, String(index + 1).padStart(STABLE_UUID_DIGITS, ZERO_DIGIT)].join(
    Text.Empty,
  );
}

export async function stabilizeText(text: string): Promise<string> {
  const seen: string[] = [];
  const identified = text
    .replace(HTTP_DATE_PATTERN, KB_HTTP_DATE)
    .replace(UUID_PATTERN, (found) => {
      const known = seen.indexOf(found);
      const index = known < 0 ? seen.push(found) - 1 : known;
      return ordinalId(index);
    });
  return identified.replace(TIMESTAMP_PATTERN, (found) =>
    found.startsWith(KB_STABLE_YEAR) ? found : KB_OBSERVED_TIME,
  );
}

export async function stabilizeResults(results: readonly StepResult[]): Promise<StepResult[]> {
  const text = await stabilizeText(JSON.stringify(results));
  return z.array(StepResultSchema).parse(JSON.parse(text));
}
