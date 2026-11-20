# Scratch Pad

Scratch Pad is a single-host example of a Hono API backed by SQLite. The same capability definitions serve HTTP routes, OpenAPI, MCP tools and skills. The repository includes a read-only console, a generated TypeScript SDK and a documentation site.

## Run locally

Use Bun 1.3.10, rootless Podman and a running Podman socket. Follow the [stack guide](apps/infra/README.md) for local host names and Caddy's development certificate.

```sh
bun install --frozen-lockfile
bun run tools:install
bun run dev
```

Run `bun run stack:down development` to stop the stack and retain its data. The local development and test identities are for this example. See [authentication modes](docs/auth-modes.md) for the provider configuration.

## Verify and build the docs

```sh
bun run test:e2e
bun run verify
```

The end-to-end suite installs the packed SDK in a clean consumer project, drives the API through Caddy and checks MCP and skills with protocol clients. It covers HTTP/1.1, HTTP/2 and HTTP/3 with TLS verification. Passing scenarios generate documentation. The build checks those pages, opens the site in a browser and selects the resulting publication only after all checks pass.

- [Developer quickstart](docs/quickstart-developer.md)
- [API consumer quickstart](docs/quickstart-api-consumer.md)
- [Agent quickstart](docs/quickstart-agent.md)
- [SDK](docs/sdk.md)
- [Testing](docs/testing.md)

## Layout

| Path                                      | Purpose                                                                 |
| ----------------------------------------- | ----------------------------------------------------------------------- |
| `packages/constants`                      | Every enum and fixed value. The only home of strings (with `messages`). |
| `packages/types`                          | The only home of types: Zod schemas with inferred types, and contracts. |
| `packages/messages`                       | The text catalog for errors and tooling output.                         |
| `packages/config`                         | Reads and validates the environment.                                    |
| `packages/errors`                         | `ApiError`, the AIP-193 error model.                                    |
| `packages/capability`                     | `defineCapability()`, the registry, field behavior.                     |
| `packages/pipeline`                       | The shared pipeline every capability runs through.                      |
| `packages/aip`                            | Google AIP building blocks: names, paging, masks, filters, operations.  |
| `packages/auth`                           | Auth providers, the Hono middleware, Protected Resource Metadata.       |
| `packages/auth-better-auth`               | Better Auth (JWT, MCP, CIMD, admin) as the shipped auth provider.       |
| `packages/ratelimit`, `cache`, `security` | Rate limiting, response caching, security headers.                      |
| `packages/db`                             | Drizzle schema and committed migrations on `bun:sqlite`.                |
| `testing/packages/framework`              | Test framework: token issuer, servers, helpers.                         |
| `tooling/`                                | Biome plugins and the scripts behind hooks and `verify`.                |
| `openspec/`                               | Proposal, design, specs and tasks. The source of truth for scope.       |

## Principles

- **One definition per endpoint**, projected everywhere.
- **No hardcoded strings.** Enums live in `constants`, text in `messages`.
- **One place for types.** Zod schemas and contracts live in `types`; nothing else declares a type.
- **Every rule is blocking.** Rules run in the pre-commit hook and again in `bun run verify`.
- **Auth is a switch.** Capabilities declare `none`, `optional` or `required`; Better Auth with JWT is the shipped provider and any JWKS issuer can replace it.

## License

The SDK package is licensed under Apache-2.0. See its [license](packages/sdk/LICENSE).
