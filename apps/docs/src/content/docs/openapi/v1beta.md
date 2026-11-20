---
title: "OpenAPI v1beta"
description: "Every operation of the API version v1beta, from the OpenAPI document."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

This page lists every operation of the version v1beta. Its stability is beta. It is generated from the OpenAPI document.

These are recorded examples. Changing measurements and progress counters use labelled placeholders. Stream read boundaries are combined; progress shows representative first and last samples. Repeated working-task polls are shown once per task. Complete recordings and checks remain in internal evidence.

## POST /v1beta/publishers/{publisher}/books:count

Operation id: `books.count`. Stability: beta. Authentication: bearer token.

Count the books of a publisher.

Parameters: publisher (path).

MCP tool: `books.count`. Count the books of a publisher. Part of the publishers/{publisher}/books resource.

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

#### Count the books with a beta call under /v1beta

Flag: **PASSED**

Over HTTP: `POST /v1beta/publishers/acme/books:count`

Response (ok, HTTP 200):

```json
{
  "count": 1
}
```

Over MCP: `tools/call books.count`

Result (ok):

```json
{
  "count": 1
}
```

### Coverage

| Coverage by the scenarios | Items |
| --- | --- |
| Outcomes seen | ok, HTTP 200 |
| Statuses not covered | 406, default |
| Error reasons not covered | ACCEPT_REQUIRED, ACCEPT_UNSUPPORTED, CONTENT_TYPE_REQUIRED, CONTENT_TYPE_UNSUPPORTED, PROXY_REQUIRED, AUTH_NOT_ENABLED, TOKEN_MISSING, TOKEN_INVALID, TOKEN_EXPIRED, POLICY_DENIED, RATE_LIMITED, VALIDATION_FAILED, UNKNOWN_FIELD, RESOURCE_NOT_FOUND, RESOURCE_ALREADY_EXISTS, ETAG_MISMATCH, INVALID_STATE_TRANSITION, UNKNOWN_VERB, METHOD_NOT_ALLOWED, INTERNAL_ERROR, INVALID_FILTER, INVALID_ORDER_BY, INVALID_FIELD_MASK, INVALID_PAGE_TOKEN, INVALID_PAGE_SIZE, INVALID_RESOURCE_NAME, INVALID_RESOURCE_ID, BATCH_TOO_LARGE, FIELD_IMMUTABLE, OPERATION_NOT_FOUND, OPERATION_CANCELLED, REQUIRED_FIELD_MISSING, ORIGIN_NOT_ALLOWED, HAS_CHILDREN, CAPABILITY_DISABLED |
