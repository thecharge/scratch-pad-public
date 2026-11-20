---
title: "SDK reference"
description: "Every function of the SDK, one for each API operation."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

The SDK has one function for each operation of the OpenAPI document. The names below are read from the built SDK package. A name that the package does not export fails the build of this page.

## assetsCreate

Calls POST /v1/assets. Operation id: `assets.create`. Version: v1.

## assetsList

Calls GET /v1/assets. Operation id: `assets.list`. Version: v1.

## assetsGet

Calls GET /v1/assets/{asset}. Operation id: `assets.get`. Version: v1.

## booksArchive

Calls POST /v1/publishers/{publisher}/books/{book}:archive. Operation id: `books.archive`. Version: v1.

## booksBatchCreate

Calls POST /v1/publishers/{publisher}/books:batchCreate. Operation id: `books.batchCreate`. Version: v1.

## booksBatchGet

Calls GET /v1/publishers/{publisher}/books:batchGet. Operation id: `books.batchGet`. Version: v1.

## booksCreate

Calls POST /v1/publishers/{publisher}/books. Operation id: `books.create`. Version: v1.

## booksList

Calls GET /v1/publishers/{publisher}/books. Operation id: `books.list`. Version: v1.

## booksDelete

Calls DELETE /v1/publishers/{publisher}/books/{book}. Operation id: `books.delete`. Version: v1.

## booksGet

Calls GET /v1/publishers/{publisher}/books/{book}. Operation id: `books.get`. Version: v1.

## booksUpdate

Calls PATCH /v1/publishers/{publisher}/books/{book}. Operation id: `books.update`. Version: v1.

## booksReindex

Calls POST /v1/publishers/{publisher}/books:reindex. Operation id: `books.reindex`. Version: v1.

## booksUndelete

Calls POST /v1/publishers/{publisher}/books/{book}:undelete. Operation id: `books.undelete`. Version: v1.

## configGet

Calls GET /v1/config. Operation id: `config.get`. Version: v1.

## configUpdate

Calls PATCH /v1/config. Operation id: `config.update`. Version: v1.

## eventsGet

Calls GET /v1/events. Operation id: `events.get`. Version: v1.

## logsList

Calls GET /v1/logs. Operation id: `logs.list`. Version: v1.

## operationsCancel

Calls POST /v1/operations/{operation}:cancel. Operation id: `operations.cancel`. Version: v1.

## operationsDelete

Calls DELETE /v1/operations/{operation}. Operation id: `operations.delete`. Version: v1.

## operationsGet

Calls GET /v1/operations/{operation}. Operation id: `operations.get`. Version: v1.

## operationsList

Calls GET /v1/operations. Operation id: `operations.list`. Version: v1.

## operationsWait

Calls POST /v1/operations/{operation}:wait. Operation id: `operations.wait`. Version: v1.

## publishersDelete

Calls DELETE /v1/publishers/{publisher}. Operation id: `publishers.delete`. Version: v1.

## skillsGet

Calls GET /v1/skills/{skill}. Operation id: `skills.get`. Version: v1.

## skillsList

Calls GET /v1/skills. Operation id: `skills.list`. Version: v1.

## statsGet

Calls GET /v1/stats. Operation id: `stats.get`. Version: v1.

## booksCount

Calls POST /v1beta/publishers/{publisher}/books:count. Operation id: `books.count`. Version: v1beta.

## booksSuggest

Calls POST /v1alpha/publishers/{publisher}/books:suggest. Operation id: `books.suggest`. Version: v1alpha.
