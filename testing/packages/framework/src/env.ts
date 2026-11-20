import { afterEach, beforeEach } from "bun:test";

function restoreOne(variable: string, previous: string | undefined): void {
  delete process.env[variable];
  if (previous !== undefined) {
    process.env[variable] = previous;
  }
}

export function processEnvScenarios(
  variables: readonly string[],
  scenarios: readonly Record<string, string>[],
): void {
  const saved = new Map<string, string | undefined>();
  let next = 0;
  beforeEach(async () => {
    variables.forEach((variable) => {
      saved.set(variable, process.env[variable]);
      delete process.env[variable];
    });
    Object.assign(process.env, scenarios[next]);
    next += 1;
  });
  afterEach(async () => {
    variables.forEach((variable) => {
      restoreOne(variable, saved.get(variable));
    });
  });
}
