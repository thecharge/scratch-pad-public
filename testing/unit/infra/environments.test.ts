import { CertificateSource, EnvironmentName } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import type { StackEnvironment } from "@platform/types";
import { containerNameOf, environmentFor } from "../../../packages/config/src/environments.ts";

const view = (environment: StackEnvironment) => [
  environment.name,
  environment.proxy.certificates,
  environment.sourceMount,
  environment.testServices,
];

unit(environmentFor, {
  positive: [
    positive(
      "development mounts the source and uses the internal certificate authority",
      [EnvironmentName.Development],
      seen(view, [EnvironmentName.Development, CertificateSource.Internal, true, false]),
    ),
    positive(
      "test has the test services and no source mount",
      [EnvironmentName.Test],
      seen(view, [EnvironmentName.Test, CertificateSource.Internal, false, true]),
    ),
    positive(
      "production uses the public certificate authority and has no test services",
      [EnvironmentName.Production],
      seen(view, [EnvironmentName.Production, CertificateSource.Public, false, false]),
    ),
  ],
  negative: [
    negative("refuses a name that is not an environment", ["staging" as never], {
      name: "ZodError",
    }),
    negative("refuses a missing name", [undefined as never], { name: "ZodError" }),
  ],
});

unit(containerNameOf, {
  positive: [
    positive(
      "joins the prefix, the environment and the part",
      [EnvironmentName.Test, "proxy"],
      "platform-test-proxy",
    ),
    positive(
      "works for production and a volume name",
      [EnvironmentName.Production, "api-data"],
      "platform-production-api-data",
    ),
  ],
  negative: [
    negative("refuses an environment that does not exist", ["staging" as never, "proxy"], {
      name: "ZodError",
    }),
    negative("refuses an empty part", [EnvironmentName.Test, ""], { name: "ZodError" }),
  ],
});
