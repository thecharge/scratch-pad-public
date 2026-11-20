# API consumer quickstart

> The HTTP routes are served by `packages/http-adapter`. This guide documents the contract implemented and tested in `packages/aip`, `packages/auth` and `packages/auth-better-auth`, so clients can be written against it.

## Conventions (Google AIP)

- **Paths** start with the major version: `/v1/publishers/p1/books/b1` (AIP-185).
- **Fields** are lowerCamelCase on output; snake_case input is also accepted. Sending both spellings of one field is an error.
- **Timestamps** are RFC 3339 strings, durations are strings such as `1.5s`, int64 values are strings.
- **Custom methods** use a colon suffix: `POST /v1/publishers/p1/books/b1:archive`.

## Errors

Every error has this body (AIP-193). `code` is the HTTP status; `details` always contains an `ErrorInfo` with a machine-readable `reason`.

```json
{
  "error": {
    "code": 429,
    "message": "Too many requests. Retry in 6 seconds.",
    "status": "RESOURCE_EXHAUSTED",
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "reason": "RATE_LIMITED",
        "domain": "api.example.com",
        "metadata": { "retryAfterSeconds": "6" }
      }
    ]
  }
}
```

A `429` also carries `Retry-After`. Retry `UNAVAILABLE`; do not retry `INVALID_ARGUMENT` or `PERMISSION_DENIED` (AIP-194).

## Lists

`GET` with `pageSize`, `pageToken`, `orderBy`, `filter`, `view` and `showDeleted`.

- `pageSize` unset or `0` uses the default (50); the maximum is 1000; negative is an error.
- The response holds `nextPageToken`; an **empty** token means the end. Tokens are opaque and tied to the other arguments: change `filter` and the token is rejected.
- `orderBy=rating desc, title` (ascending is the default).
- `filter` follows AIP-160: comparisons (`= != < <= > >=`), `:` for "has", `AND`, `OR`, `NOT` or `-`, parentheses. **`OR` binds tighter than `AND`.** Keywords are upper case. Example: `rating >= 4 AND state = ACTIVE`, `title = "Les*"`, `tags:classic`. Unknown fields and mistyped values are `INVALID_ARGUMENT`.

## Updates

`PATCH` with `updateMask=title,author.givenName`. Without a mask, every field you send is updated. Output-only fields are ignored; changing an immutable field is `INVALID_ARGUMENT`. Send `etag` to guard against lost updates (a stale etag gives `ABORTED`, HTTP 409). Send `requestId` (a UUID) to make a create safely retryable.

## Getting a token

When authentication is on, send `Authorization: Bearer <JWT>`. Tokens in the query string are ignored.

1. Fetch `/.well-known/oauth-protected-resource` for the resource and its authorization server.
2. Fetch the authorization server metadata from `<origin>/api/auth/.well-known/oauth-authorization-server`.
3. For a service, an **admin** creates a client with a server-owned scope ceiling, then the client requests a token with the OAuth client-credentials grant and the `resource` parameter set to the API origin:

   ```sh
   curl -u "$CLIENT_ID:$CLIENT_SECRET" \
     -d grant_type=client_credentials -d scope=read -d resource="$API_ORIGIN" \
     "$API_ORIGIN/api/auth/oauth2/token"
   ```

Tokens are JWTs signed with EdDSA; keys are at `<origin>/api/auth/jwks`. A token for another resource is refused. Capabilities declared `none` or `optional` work without a token.
