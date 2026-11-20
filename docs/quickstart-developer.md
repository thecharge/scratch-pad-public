# Developer quickstart

## Set up

```sh
bun install            # also installs the lefthook git hooks
bun run tools:install  # pinned gitleaks binary, checksum verified
bun run verify         # everything the hooks check, over the whole repository
```

Hooks that cannot find a tool **fail**; they never skip silently.

## Define a capability

A capability is one object. It declares its auth mode explicitly.

```ts
import { defineCapability } from "@platform/capability";
import { ApiVersion, AuthMode, MethodKind } from "@platform/constants";
import { z } from "zod";

const Input = z.strictObject({ name: z.string() });
const Output = z.object({ name: z.string(), title: z.string() });

export const getBook = defineCapability({
  id: BOOKS_GET,                 // a CapabilityId enum member
  version: ApiVersion.V1,
  method: MethodKind.Get,
  resource: "publishers/{publisher}/books/{book}",
  summary: "…",                  // text comes from the messages package
  description: "…",
  auth: AuthMode.Required,       // none | optional | required, always explicit
  input: Input,
  output: Output,
  handler: ({ name }) => ({ name, title: "…" }),
});
```

The string literals above are shown for readability only. In this repository ids, resource patterns and text are constants and messages (see [DEV_RULES.md](../DEV_RULES.md)).

## Run it through the pipeline

```ts
import { createPipeline } from "@platform/pipeline";

const invoke = createPipeline({ /* rateLimiter, policy, cache, masker, observer */ });
const { output } = await invoke(getBook, { name: "publishers/p1/books/b1" }, context);
```

The pipeline runs auth, rate limit, policy, validation, cache, handler, mask, observe, in that order. A block a capability declares (`policy`, `mask`, `rateLimit`) without an implementation **fails before the handler runs**.

## Authentication

```ts
import { createJwksProvider, authMiddleware } from "@platform/auth";
import { createBetterAuth, createBetterAuthProvider, betterAuthApp } from "@platform/auth-better-auth";
```

- `auth.enabled` (config) switches authentication on or off.
- With auth off, `none` and `optional` capabilities work and `required` ones fail closed.
- Better Auth issues JWT access tokens; any other issuer works through `createJwksProvider`.

## Rules you will hit

Read [DEV_RULES.md](../DEV_RULES.md). In short: no inline strings, no local types, two levels of nesting at most, flat table-driven tests. The hook tells you the file and line.

## Where things live

New enum → `packages/constants`. New shape or contract → `packages/types`. New text → `packages/messages`. New AIP behavior → `packages/aip`. New check → `tooling/scripts` and the `RULE_JOBS` registry.
