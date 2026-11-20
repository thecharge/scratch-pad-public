---
title: Authentication modes and providers
description: Switchable authentication, per-capability modes and pluggable token verification.
---

Authentication has three layers.

1. **Enablement.** The `AUTH_ENABLED` setting turns authentication on or off for the whole server. In production it must be set explicitly.
2. **Capability auth mode.** Every capability declares `none`, `optional` or `required`.
3. **Provider.** A provider verifies bearer tokens. `better-auth` is the reference implementation; `jwks` verifies tokens from any external OpenID Connect issuer.

```mermaid
flowchart TB
    REQ["incoming request"] --> EN{"auth enabled?"}
    EN -->|"no"| M1{"capability auth mode"}
    M1 -->|"none or optional"| ANON["anonymous principal, serve"]
    M1 -->|"required"| F1["401 UNAUTHENTICATED<br/>reason AUTH_NOT_ENABLED"]
    EN -->|"yes"| M2{"capability auth mode"}
    M2 -->|"none"| ANON
    M2 -->|"optional"| TOK{"bearer token present?"}
    TOK -->|"no"| ANON
    TOK -->|"yes"| VER
    M2 -->|"required"| VER["verify signature, issuer, audience, expiry"]
    VER -->|"valid"| PR["principal with scopes and roles"]
    VER -->|"invalid"| F2["401 with WWW-Authenticate"]
```

A required capability is also absent from MCP tool lists and skill listings for callers who could not use it.

## How an agent gets a token

```mermaid
sequenceDiagram
    autonumber
    participant C as Agent client
    participant S as API
    participant A as Authorization server
    C->>S: POST /mcp with a bad token
    S-->>C: 401 WWW-Authenticate Bearer resource_metadata=URL
    C->>S: GET /.well-known/oauth-protected-resource
    S-->>C: resource and authorization servers
    C->>A: authorize with PKCE and the resource parameter
    A-->>C: JWT access token for this resource
    C->>S: POST /mcp with the token
    S-->>C: result
```

Tokens are short lived because a JWT cannot be revoked on the server. Dynamic client registration is off; clients identify themselves with Client ID Metadata Documents.
