# @platform/config

The only reader of the environment. `loadConfig(environment)` validates it with the schemas in `@platform/types` and returns a typed `AppConfig`; `loadConfigFromProcess()` reads `process.env`.

- Errors are `ConfigError` with `issues` naming the variable and a `ConfigIssueCode`; **values are never included**, so a bad secret is never echoed.
- Production requires an explicit `AUTH_ENABLED`, a Better Auth secret of at least 32 characters when that provider is on, and no localhost in `TRUSTED_ORIGINS`.

```ts
import { loadConfig } from "@platform/config";

const config = loadConfig({ AUTH_ENABLED: "false" });
```
