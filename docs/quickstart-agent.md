# Agent quickstart

> The MCP endpoint is served at `/mcp` by `packages/mcp-adapter`, and skills are served through the Skills extension and as the tools `skills.list` and `skills.get`. This guide covers the authentication flow and the contract the adapter serves.

## What an agent gets

- **Tools** are the capabilities the agent is allowed to call. `tools/list` is filtered by the caller's authorization, so an agent never sees a tool it cannot call, and lists are cache-hinted `private`.
- **Skills** are generated from the capability registry or written by hand in a skill package. They are served under `skill://<skill-path>/SKILL.md` through the MCP Skills extension (`io.modelcontextprotocol/skills`, `skills/list`, `skills/get`) and through the tools `skills.list` and `skills.get`, and are filtered the same way.
- **Authless tools** (`auth: none`) work without a token.

## Authenticating (implemented and tested)

1. Call the MCP endpoint without a token. A protected capability answers `401` with `WWW-Authenticate: Bearer resource_metadata="<url>"`.
2. Fetch that URL (RFC 9728). It names the `resource` and the `authorization_servers`.
3. Discover the authorization server (`.well-known/oauth-authorization-server`).
4. Obtain a token bound to the resource (RFC 8707 `resource` parameter): authorization code with PKCE for a user-facing agent, or client credentials for a service agent.
5. Send `Authorization: Bearer <token>` on every request.

Client identity uses Client ID Metadata Documents. Dynamic client registration is off. The metadata fetch refuses private, loopback and cloud-metadata addresses and does not follow redirects.

## Errors an agent should handle

| Status                   | Meaning                             | Action                     |
| ------------------------ | ----------------------------------- | -------------------------- |
| 401 `UNAUTHENTICATED`    | No or invalid token                 | Re-run the flow above      |
| 403 `PERMISSION_DENIED`  | Policy denies this capability       | Do not retry               |
| 429 `RESOURCE_EXHAUSTED` | Rate limited                        | Wait `Retry-After` seconds |
| 400 `INVALID_ARGUMENT`   | Bad input; `reason` says which rule | Fix the input              |
| 409 `ABORTED`            | Stale etag                          | Re-read, then retry        |

## Skills: generated and written in a package

Skills come from two sources and the agent sees one list.

- **Generated skills.** One skill per resource collection, built from the capability registry. Each carries the group's description and the exact input schema, with no scripts or tool allow-lists. Change a capability's description and its skill (and digest) change.
- **Package skills.** Skills written by hand in a skill package, a directory of skill directories. The default package is `packages/skills/skills`; set `SKILL_DIRS` to a comma-separated list to serve other directories. A skill is `<name>/SKILL.md` whose frontmatter `name` equals the directory name and has a `description`, plus optional text files such as `references/guide.md`. A skill with the name of a generated skill replaces it.

A package skill is served at `skill://<name>/SKILL.md` with its digest, like any other skill. It declares who may see it in the frontmatter `metadata`: `auth` (`none`, `optional` or `required`) and the comma-separated lists `scopes`, `roles` and `kinds`. The same policy engine that filters tools filters skills, so a caller that is not allowed does not see the skill in `skills/list`, `skills/get` or the tools below.

```yaml
---
name: operating-the-service
description: Look at the running service as an administrator.
metadata:
  auth: required
  scopes: admin
---
```

The pre-commit job `skill-packages` (`bun run tooling/scripts/check-skill-packages.ts`) fails a skill that does not follow this format.

## Skills as tools

A client or model that does not read `skill://` resources uses two tools: `skills.list` returns the name, description, URI and digest of each skill the caller may read, and `skills.get` with `name` set to `skills/<name>` returns the skill with all its files. They are capabilities, so they are also `GET /v1/skills` and `GET /v1/skills/{skill}` over HTTP and appear in the OpenAPI document. A skill the caller may not read is answered as not found.
