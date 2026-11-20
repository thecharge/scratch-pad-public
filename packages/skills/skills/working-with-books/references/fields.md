# Book fields and errors

## Fields of a book

| Field                                                 | Meaning                                                  |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `name`                                                | Output only. `publishers/{publisher}/books/{book}`       |
| `title`                                               | Required when you create a book                          |
| `author`                                              | Optional                                                 |
| `authorEmail`                                         | Optional. Removed from the answer unless you hold `read` |
| `state`                                               | Output only. `ACTIVE` or `ARCHIVED`                      |
| `createTime`, `updateTime`, `deleteTime`, `purgeTime` | Output only timestamps                                   |
| `etag`                                                | Output only. Send it back to guard an update or delete   |

## Errors you can expect

| Reason                  | Cause                                 | What to do                                      |
| ----------------------- | ------------------------------------- | ----------------------------------------------- |
| `INVALID_RESOURCE_NAME` | The name does not match the pattern   | Build it as `publishers/{publisher}/books/{id}` |
| `RESOURCE_NOT_FOUND`    | No such book                          | Check the name; the book may be deleted         |
| `ETAG_MISMATCH`         | The book changed after you read it    | Read it again and repeat the change             |
| `INSUFFICIENT_SCOPE`    | The token lacks `read` or `write`     | Ask for a token with the scope                  |
| `INVALID_PAGE_TOKEN`    | The page token is not from this query | Start again without `pageToken`                 |
