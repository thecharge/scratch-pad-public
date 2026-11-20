---
title: "OpenAPI v1alpha"
description: "Every operation of the API version v1alpha, from the OpenAPI document."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

This page lists every operation of the version v1alpha. Its stability is alpha. It is generated from the OpenAPI document.

These are recorded examples. Changing measurements and progress counters use labelled placeholders. Stream read boundaries are combined; progress shows representative first and last samples. Repeated working-task polls are shown once per task. Complete recordings and checks remain in internal evidence.

## POST /v1alpha/publishers/{publisher}/books:suggest

Operation id: `books.suggest`. Stability: alpha. Authentication: bearer token.

Suggest a book from a publisher.

Parameters: publisher (path).

Error cases shown in the troubleshooting pages: CAPABILITY_DISABLED.

MCP tool: `books.suggest`. Suggest a book from a publisher. Part of the publishers/{publisher}/books resource.

Input schema of the tool:

```json
{
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    }
  },
  "required": [
    "parent"
  ],
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "additionalProperties": false
}
```

### Checked examples

Each example below was run against the real server by a scenario. The flag is the result of that run.

#### Suggest a book with an alpha call under /v1alpha once its flag is on

Flag: **PASSED**

Over HTTP: `POST /v1alpha/publishers/acme/books:suggest`

Response (ok, HTTP 200):

```json
{
  "books": [
    {
      "author": "Frank Herbert",
      "authorEmail": "frank@example.com",
      "createTime": "2001-01-01T00:00:00.002Z",
      "etag": "\"7f1dfbad1003c615\"",
      "name": "publishers/acme/books/dune",
      "state": "ACTIVE",
      "title": "Dune",
      "updateTime": "2001-01-01T00:00:00.002Z"
    }
  ]
}
```

Over MCP: `tools/call books.suggest`

Result (ok):

```json
{
  "books": [
    {
      "author": "Frank Herbert",
      "authorEmail": "frank@example.com",
      "createTime": "2001-01-01T00:00:00.002Z",
      "etag": "\"7f1dfbad1003c615\"",
      "name": "publishers/acme/books/dune",
      "state": "ACTIVE",
      "title": "Dune",
      "updateTime": "2001-01-01T00:00:00.002Z"
    }
  ]
}
```

#### With the flag off, the call is not served

Flag: **PASSED**

Over HTTP: `POST /v1alpha/publishers/acme/books:suggest`

Response (error, HTTP 404):

```json
{
  "error": {
    "code": 404,
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "domain": "docs.example.test",
        "reason": "CAPABILITY_DISABLED"
      }
    ],
    "message": "The capability books.suggest is switched off.",
    "status": "NOT_FOUND"
  }
}
```

Over MCP: `tools/call books.suggest`

Result (error):

```json
[
  {
    "text": "{\n  \"message\": \"The capability books.suggest is switched off.\",\n  \"metadata\": {},\n  \"reason\": \"CAPABILITY_DISABLED\",\n  \"status\": \"NOT_FOUND\"\n}",
    "type": "text"
  }
]
```

#### With the flag on, the call is served

Flag: **PASSED**

Over HTTP: `POST /v1alpha/publishers/acme/books:suggest`

Response (ok, HTTP 200):

```json
{
  "books": [
    {
      "author": "Frank Herbert",
      "authorEmail": "frank@example.com",
      "createTime": "2001-01-01T00:00:00.002Z",
      "etag": "\"7f1dfbad1003c615\"",
      "name": "publishers/acme/books/dune",
      "state": "ACTIVE",
      "title": "Dune",
      "updateTime": "2001-01-01T00:00:00.002Z"
    }
  ]
}
```

Over MCP: `tools/call books.suggest`

Result (ok):

```json
{
  "books": [
    {
      "author": "Frank Herbert",
      "authorEmail": "frank@example.com",
      "createTime": "2001-01-01T00:00:00.002Z",
      "etag": "\"7f1dfbad1003c615\"",
      "name": "publishers/acme/books/dune",
      "state": "ACTIVE",
      "title": "Dune",
      "updateTime": "2001-01-01T00:00:00.002Z"
    }
  ]
}
```

#### Switching the flag off again stops the call at once

Flag: **PASSED**

Over HTTP: `POST /v1alpha/publishers/acme/books:suggest`

Response (error, HTTP 404):

```json
{
  "error": {
    "code": 404,
    "details": [
      {
        "@type": "type.googleapis.com/google.rpc.ErrorInfo",
        "domain": "docs.example.test",
        "reason": "CAPABILITY_DISABLED"
      }
    ],
    "message": "The capability books.suggest is switched off.",
    "status": "NOT_FOUND"
  }
}
```

Over MCP: `tools/call books.suggest`

Result (error):

```json
[
  {
    "text": "{\n  \"message\": \"The capability books.suggest is switched off.\",\n  \"metadata\": {},\n  \"reason\": \"CAPABILITY_DISABLED\",\n  \"status\": \"NOT_FOUND\"\n}",
    "type": "text"
  }
]
```

### Coverage

| Coverage by the scenarios | Items |
| --- | --- |
| Outcomes seen | ok, HTTP 200, error, HTTP 404 |
| Statuses not covered | 406 |
| Error reasons not covered | ACCEPT_REQUIRED, ACCEPT_UNSUPPORTED, CONTENT_TYPE_REQUIRED, CONTENT_TYPE_UNSUPPORTED, PROXY_REQUIRED, AUTH_NOT_ENABLED, TOKEN_MISSING, TOKEN_INVALID, TOKEN_EXPIRED, POLICY_DENIED, RATE_LIMITED, VALIDATION_FAILED, UNKNOWN_FIELD, RESOURCE_NOT_FOUND, RESOURCE_ALREADY_EXISTS, ETAG_MISMATCH, INVALID_STATE_TRANSITION, UNKNOWN_VERB, METHOD_NOT_ALLOWED, INTERNAL_ERROR, INVALID_FILTER, INVALID_ORDER_BY, INVALID_FIELD_MASK, INVALID_PAGE_TOKEN, INVALID_PAGE_SIZE, INVALID_RESOURCE_NAME, INVALID_RESOURCE_ID, BATCH_TOO_LARGE, FIELD_IMMUTABLE, OPERATION_NOT_FOUND, OPERATION_CANCELLED, REQUIRED_FIELD_MISSING, ORIGIN_NOT_ALLOWED, HAS_CHILDREN |
