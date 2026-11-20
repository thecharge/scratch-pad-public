# @platform/types

The only place types are declared.

- **Data shapes** are Zod schemas with their types inferred: `PrincipalSchema`/`Principal`, `AppConfigSchema`/`AppConfig`, `ApiErrorBodySchema`, `FilterNodeSchema`, `OperationSchema`, … Use the schema to validate and the type everywhere else.
- **Contracts** (interfaces with methods) live in `src/contracts`: `AuthProvider`, `RateLimiter`, `PolicyEngine`, `ResponseCache`, `Masker`, `Observer`, `PipelineDeps`, `Capability`.
- Folders group by domain: `aip`, `auth`, `capability`, `config`, `errors`, `events`.

```ts
import { PrincipalSchema, type Principal } from "@platform/types";

const principal: Principal = PrincipalSchema.parse(input);
```

Other packages must not declare `interface`, type aliases or inline object types; the `no-local-types` Biome plugin blocks the commit.
