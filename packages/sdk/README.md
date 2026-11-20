# @platform/sdk

A typed TypeScript client for the API. The code in `generated/` is produced by `@hey-api/openapi-ts` from `openapi/baseline.json` (`bun run sdk:generate`); it is never edited by hand, comments are stripped from it, and the `sdk` pre-commit job and `verify` step fail when it differs from a fresh generation or does not type-check.

The code in `src/` is a thin wrapper: `await createSdkClient(...)` (base URL and bearer token), `unwrap` (turn the result into data or an `ApiClientError` with the AIP-193 status and reason), `paginate` (lazy async iteration over page tokens), `waitForOperation` (bounded polling of a long-running operation) and `followOperation` (reads the event-stream form of an operation: each state until it is done, a typed error for an operation that ended with an error, an unavailable error when the stream ends first). Tests call the generated functions against a real running server.

The package has its own `tsconfig.json` because generated code does not satisfy `exactOptionalPropertyTypes`; hand-written code in the rest of the repository still does.

## Standalone package

`bun run build` in this folder runs `tooling/scripts/build-sdk.ts`. It bundles `src/`, `generated/` and the parts of `@platform/constants` and `@platform/types` that the SDK uses into `dist/index.js` and `dist/index.d.ts` (the `dist` folder is not committed). The manifest is publishable: it is not private, has a version, lists `files`, and points `exports` and `types` at `dist`. Its only runtime dependency is `zod`.

`tooling/scripts/check-sdk-pack.ts` packs the built package with `bun pm pack` and fails when the tarball imports `@platform/*`, a workspace dependency or a source path (the `sdk-pack` pre-commit job).

## License

The SDK is the only licensed part of the repository. It is under the Apache License 2.0: see `LICENSE` in this folder and the `license` field of `package.json`. The rest of the repository is private and has no license; `tooling/scripts/check-repo.ts` fails when any other manifest has a `license` field or any other folder has a license file.

## Tests

- Unit: `testing/unit/sdk/error.test.ts`, `unwrap.test.ts`, `helpers.test.ts`.
- Integration: `testing/integration/sdk/sdk.test.ts` calls the generated functions from source against a running server.
- End to end: `testing/e2e/sdk/sdk.test.ts` packs the SDK, installs the tarball into an empty project and runs calls against a running API. The same run writes the pages under `apps/docs/src/content/docs/sdk-usage/` (`tooling/scripts/generate-sdk-docs.ts`), and the documentation build fails if the SDK build or that run fails.
