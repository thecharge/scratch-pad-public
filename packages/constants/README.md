# @platform/constants

Every enum and fixed value in the repository. Together with `@platform/messages` this is the only place where string literals are allowed.

- Closed sets of strings are real TypeScript `enum`s: `AuthMode`, `CanonicalCode`, `ErrorReason`, `EnvVar`, `MessageId`, `HookJob`, and so on.
- Plain constants: `CANONICAL_CODE_HTTP_STATUS`, `ERROR_REASON_PATTERN`, page and batch limits.
- Tooling vocabulary (`VerifyStep`, `RULE_JOBS`, command tables) lives in `tooling.ts`.

```ts
import { AuthMode, CanonicalCode, CANONICAL_CODE_HTTP_STATUS } from "@platform/constants";

CANONICAL_CODE_HTTP_STATUS[CanonicalCode.NotFound]; // 404
```

Add a new closed set here as an `enum`; never declare a string union.
