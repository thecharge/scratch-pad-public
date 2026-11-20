---
name: working-with-books
description: Read, create, change and remove books of a publisher through the platform API, by HTTP or as MCP tools. Use when a task needs book data, names like publishers/acme/books/dune, paging, soft delete or an etag.
metadata:
  auth: none
---

# Working with books

Every book belongs to a publisher. A book name has the form `publishers/{publisher}/books/{book}`, for example `publishers/acme/books/dune`. A publisher name is `publishers/{publisher}`.

The same operation is an HTTP route and an MCP tool with the same input. The tool id is the operation id: `books.get`, `books.list`, `books.create`, `books.update`, `books.delete`, `books.undelete`, `books.archive`, `books.batchGet`, `books.count`.

## Access

| Operation                                      | Needs a token | Scope   |
| ---------------------------------------------- | ------------- | ------- |
| `books.get`                                    | no            | none    |
| `books.list`, `books.batchGet`                 | yes           | `read`  |
| `books.create`, `books.update`, `books.delete` | yes           | `write` |
| `books.undelete`, `books.archive`              | yes           | `write` |
| `books.count`                                  | yes           | `read`  |

A tool you are not allowed to call is not listed. If a tool you expect is missing, the token lacks the scope.

## Steps

1. Find books: call `books.list` with `parent` set to the publisher name. Pass `pageSize` to limit the page and pass the returned `nextPageToken` as `pageToken` to read the next page. An empty `nextPageToken` means the last page.
2. Read one book: call `books.get` with `name`. Use `view` to ask for the basic fields only.
3. Create a book: call `books.create` with `parent`, `bookId` and `title`. `author` and `authorEmail` are optional. Send a UUID as `requestId` so a retry does not create a second book.
4. Change a book: call `books.update` with `name`, the changed fields and `updateMask` naming them. Pass `etag` from the last read to stop a write over a newer change.
5. Remove a book: call `books.delete` with `name`. The book is soft deleted and `books.undelete` brings it back. `books.list` hides deleted books unless `showDeleted` is true.

Read [the field reference](references/fields.md) for the fields of a book and the errors you can expect.
