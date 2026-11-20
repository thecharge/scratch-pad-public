# @platform/openapi

Generates the OpenAPI 3.1 document from the capability registry; no path is written by hand. `generateOpenApi(capabilities, options)` registers one operation per capability through `@hono/zod-openapi` (`getOpenAPI31Document`), using the same route derivation as the HTTP adapter so the documented path is the public one (`/v1/publishers/{publisher}/books/{book}:archive`).

- Input fields are split into path, query and body parameters with `splitInput` from `@platform/aip`.
- A single `bearerAuth` scheme (`http`, `bearer`, JWT). `required` capabilities list it, `optional` ones list an empty alternative plus it, `none` ones declare no security.
- Field behavior `OUTPUT_ONLY` and `INPUT_ONLY` become `readOnly` and `writeOnly`.
- Errors are described once as the AIP-193 body under `default`.
- `openApiApp(source, options)` serves the document at `/openapi.json`. The document is built on the first request, and `@hono/zod-openapi` is imported only then.

`bun run openapi:check` compares the generated document with `openapi/baseline.json` using `oasdiff breaking --fail-on ERR`, and `bun run openapi:update` rewrites the baseline after an intended change.
