---
title: "API versions"
description: "The versions of the API, how stable each one is, and what each one holds."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

The API names its version in the path, as AIP-185 asks. A stable version changes only in ways that do not break clients. A beta version may still change. An alpha version may change or go away without notice.

## v1

Stability: stable. Path prefix: `/v1/`. Reference: [OpenAPI v1](/openapi/v1/).

Capabilities: assets.create, assets.list, assets.get, books.archive, books.batchCreate, books.batchGet, books.create, books.list, books.delete, books.get, books.update, books.reindex, books.undelete, config.get, config.update, events.get, logs.list, operations.cancel, operations.delete, operations.get, operations.list, operations.wait, publishers.delete, skills.get, skills.list, stats.get.

## v1beta

Stability: beta. Path prefix: `/v1beta/`. Reference: [OpenAPI v1beta](/openapi/v1beta/).

Capabilities: books.count.

## v1alpha

Stability: alpha. Path prefix: `/v1alpha/`. Reference: [OpenAPI v1alpha](/openapi/v1alpha/).

Capabilities: books.suggest.



```mermaid
flowchart LR
  V0["v1, stable"] --> O0x0["assets.create"]
  V0["v1, stable"] --> O0x1["assets.list"]
  V0["v1, stable"] --> O0x2["assets.get"]
  V0["v1, stable"] --> O0x3["books.archive"]
  V0["v1, stable"] --> O0x4["books.batchCreate"]
  V0["v1, stable"] --> O0x5["books.batchGet"]
  V0["v1, stable"] --> O0x6["books.create"]
  V0["v1, stable"] --> O0x7["books.list"]
  V0["v1, stable"] --> O0x8["books.delete"]
  V0["v1, stable"] --> O0x9["books.get"]
  V0["v1, stable"] --> O0x10["books.update"]
  V0["v1, stable"] --> O0x11["books.reindex"]
  V0["v1, stable"] --> O0x12["books.undelete"]
  V0["v1, stable"] --> O0x13["config.get"]
  V0["v1, stable"] --> O0x14["config.update"]
  V0["v1, stable"] --> O0x15["events.get"]
  V0["v1, stable"] --> O0x16["logs.list"]
  V0["v1, stable"] --> O0x17["operations.cancel"]
  V0["v1, stable"] --> O0x18["operations.delete"]
  V0["v1, stable"] --> O0x19["operations.get"]
  V0["v1, stable"] --> O0x20["operations.list"]
  V0["v1, stable"] --> O0x21["operations.wait"]
  V0["v1, stable"] --> O0x22["publishers.delete"]
  V0["v1, stable"] --> O0x23["skills.get"]
  V0["v1, stable"] --> O0x24["skills.list"]
  V0["v1, stable"] --> O0x25["stats.get"]
  V1["v1beta, beta"] --> O1x0["books.count"]
  V2["v1alpha, alpha"] --> O2x0["books.suggest"]
```