import { loadConfig } from "@platform/config";
import { loopbackOrigin, releaseUrl } from "@platform/config/urls";
import { ConfigIssueCode, EnvVar, ToolBinary } from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { AUTH_ON, DEFAULTS, SECURED, SECURED_ENV } from "./config-fixtures.ts";

const issue = (variable: EnvVar, code: ConfigIssueCode) => ({ issues: [{ variable, code }] });

unit(loadConfig, {
  positive: [
    positive("an empty environment gives the local development defaults", [{}], DEFAULTS),
    positive(
      "auth, a port and feature flags are read from the environment",
      [SECURED_ENV],
      SECURED,
    ),
  ],
  negative: [
    negative(
      "production without an auth decision",
      [{ [EnvVar.AppEnv]: "production" }],
      issue(EnvVar.AuthEnabled, ConfigIssueCode.Required),
    ),
    negative(
      "auth on without a secret",
      [AUTH_ON],
      issue(EnvVar.BetterAuthSecret, ConfigIssueCode.Required),
    ),
    negative(
      "auth on with a short secret",
      [{ ...AUTH_ON, [EnvVar.BetterAuthSecret]: "short" }],
      issue(EnvVar.BetterAuthSecret, ConfigIssueCode.TooShort),
    ),
    negative(
      "a port that is not a number",
      [{ [EnvVar.Port]: "not-a-number" }],
      issue(EnvVar.Port, ConfigIssueCode.Invalid),
    ),
    negative(
      "a default page size above the maximum",
      [{ [EnvVar.PageSizeDefault]: "500", [EnvVar.PageSizeMax]: "100" }],
      issue(EnvVar.PageSizeDefault, ConfigIssueCode.Invalid),
    ),
  ],
});

unit(loopbackOrigin, {
  positive: [
    positive("the port is appended to the loopback origin", [3000], "http://localhost:3000"),
    positive("another port gives another origin", [8080], "http://localhost:8080"),
  ],
  negative: [
    rejected(
      "an undefined port yields an unusable origin",
      [undefined],
      "http://localhost:undefined",
    ),
    rejected(
      "a port that is not a number yields an unusable origin",
      [Number.NaN],
      "http://localhost:NaN",
    ),
  ],
});

unit(releaseUrl, {
  positive: [
    positive(
      "gitleaks resolves to its release download",
      [ToolBinary.Gitleaks, "8.30.1", "gitleaks.tar.gz"],
      "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/gitleaks.tar.gz",
    ),
    positive(
      "oasdiff resolves to its release download",
      [ToolBinary.Oasdiff, "1.35.0", "oasdiff.tar.gz"],
      "https://github.com/oasdiff/oasdiff/releases/download/v1.35.0/oasdiff.tar.gz",
    ),
  ],
  negative: [
    rejected(
      "a tool that is not installable has no release base",
      ["unknown", "1.0.0", "f"],
      ["undefined", "v1.0.0/f"].join(""),
    ),
    rejected(
      "an empty file name leaves a directory url",
      [ToolBinary.Gitleaks, "8.30.1", ""],
      "https://github.com/gitleaks/gitleaks/releases/download/v8.30.1/",
    ),
  ],
});
