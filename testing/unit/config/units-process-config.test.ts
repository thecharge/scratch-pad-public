import { loadConfigFromProcess } from "@platform/config";
import { ConfigIssueCode, EnvVar } from "@platform/constants";
import { negative, positive, unit } from "@platform/test-factories";
import { processEnvScenarios } from "@platform/test-framework";
import { AUTH_ON, DEFAULTS, SECURED, SECURED_ENV } from "./config-fixtures.ts";

const issue = (variable: EnvVar, code: ConfigIssueCode) => ({ issues: [{ variable, code }] });

processEnvScenarios(Object.values(EnvVar), [
  {},
  SECURED_ENV,
  { [EnvVar.Port]: "not-a-number" },
  AUTH_ON,
]);

unit(loadConfigFromProcess, {
  positive: [
    positive("an environment with nothing set gives the defaults", [], DEFAULTS),
    positive("variables set in the process environment are read", [], SECURED),
  ],
  negative: [
    negative(
      "a port that is not a number in the process environment",
      [],
      issue(EnvVar.Port, ConfigIssueCode.Invalid),
    ),
    negative(
      "auth enabled in the process environment without a secret",
      [],
      issue(EnvVar.BetterAuthSecret, ConfigIssueCode.Required),
    ),
  ],
});
