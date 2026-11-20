---
title: "MCP tool reference"
description: "Every tool the MCP endpoint offers, with its input schema."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

### assets.get

Get an asset download link. Part of the assets/{asset} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string",
      "minLength": 1
    }
  },
  "required": [
    "name"
  ]
}
```

### assets.list

List your assets. Part of the assets resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "pageToken": {
      "type": "string"
    }
  }
}
```

### books.archive

Archive a book. Part of the publishers/{publisher}/books/{book} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### books.batchCreate

Create several books atomically. Part of the publishers/{publisher}/books resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    },
    "requests": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "bookId": {
            "fieldBehavior": "REQUIRED",
            "type": "string"
          },
          "title": {
            "fieldBehavior": "REQUIRED",
            "type": "string"
          },
          "author": {
            "type": "string"
          },
          "authorEmail": {
            "type": "string"
          }
        },
        "additionalProperties": false
      }
    }
  },
  "required": [
    "parent",
    "requests"
  ],
  "additionalProperties": false
}
```

### books.batchGet

Get several books at once. Part of the publishers/{publisher}/books/{book} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    },
    "names": {
      "type": "array",
      "items": {
        "type": "string"
      }
    }
  },
  "required": [
    "parent",
    "names"
  ],
  "additionalProperties": false
}
```

### books.count

Count the books of a publisher. Part of the publishers/{publisher}/books resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    }
  },
  "required": [
    "parent"
  ],
  "additionalProperties": false
}
```

### books.create

Create a book. Part of the publishers/{publisher}/books/{book} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    },
    "name": {
      "fieldBehavior": "OUTPUT_ONLY",
      "type": "string"
    },
    "bookId": {
      "fieldBehavior": "REQUIRED",
      "type": "string"
    },
    "title": {
      "fieldBehavior": "REQUIRED",
      "type": "string"
    },
    "author": {
      "type": "string"
    },
    "authorEmail": {
      "type": "string"
    },
    "requestId": {
      "type": "string",
      "format": "uuid",
      "pattern": "^([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-8][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}|00000000-0000-0000-0000-000000000000|ffffffff-ffff-ffff-ffff-ffffffffffff)$"
    },
    "validateOnly": {
      "type": "boolean"
    }
  },
  "required": [
    "parent"
  ],
  "additionalProperties": false
}
```

### books.delete

Delete a book (soft delete). Part of the publishers/{publisher}/books/{book} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "etag": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### books.get

Get a book. Part of the publishers/{publisher}/books/{book} resource.

Authentication: optional

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "view": {
      "type": "string",
      "enum": [
        "BASIC",
        "FULL"
      ]
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### books.list

List the books of a publisher. Part of the publishers/{publisher}/books/{book} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    },
    "pageSize": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "pageToken": {
      "type": "string"
    },
    "orderBy": {
      "type": "string"
    },
    "filter": {
      "type": "string"
    },
    "showDeleted": {
      "type": "boolean"
    }
  },
  "required": [
    "parent"
  ],
  "additionalProperties": false
}
```

### books.reindex

Reindex the books of a publisher. Part of the publishers/{publisher}/books resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    }
  },
  "required": [
    "parent"
  ],
  "additionalProperties": false
}
```

### books.suggest

Suggest a book from a publisher. Part of the publishers/{publisher}/books resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "parent": {
      "type": "string"
    }
  },
  "required": [
    "parent"
  ],
  "additionalProperties": false
}
```

### books.undelete

Restore a deleted book. Part of the publishers/{publisher}/books/{book} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### books.update

Update a book. Part of the publishers/{publisher}/books/{book} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "title": {
      "type": "string"
    },
    "author": {
      "type": "string"
    },
    "authorEmail": {
      "type": "string"
    },
    "updateMask": {
      "type": "string"
    },
    "etag": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### config.get

Get the public configuration. Part of the config resource.

Authentication: none

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### config.update

Update the configuration. Part of the config resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "bannerText": {
      "type": "string"
    },
    "pageSizeDefault": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### events.get

Get the recent request events, or follow them as they happen. Part of the events resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### events.watch

Returns the states this resource goes through, for at most maxEvents events or timeoutMs milliseconds, whichever comes first. Get the recent request events, or follow them as they happen

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "timeoutMs": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "maxEvents": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### logs.list

List recent request events, newest first. Part of the logs/{log} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "kind": {
      "type": "string",
      "enum": [
        "request",
        "decision",
        "error",
        "cache",
        "mask"
      ]
    },
    "capability": {
      "type": "string"
    },
    "pageSize": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "pageToken": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
```

### operations.cancel

Asks the server to stop an operation. A cancelled operation is kept and carries the CANCELLED error.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### operations.delete

Removes the record of an operation. It does not cancel the operation.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### operations.get

Returns the current state of a long-running operation.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### operations.list

Returns one page of long-running operations, newest first.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "pageToken": {
      "type": "string"
    },
    "filter": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
```

### operations.wait

Returns the operation when it is done or when the timeout passes, whichever comes first.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "timeout": {
      "type": "string",
      "pattern": "^\\d+(\\.\\d+)?s$"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### operations.watch

Returns the states this resource goes through, for at most maxEvents events or timeoutMs milliseconds, whichever comes first. Get a long-running operation

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "timeoutMs": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    },
    "maxEvents": {
      "type": "integer",
      "exclusiveMinimum": 0,
      "maximum": 9007199254740991
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### publishers.delete

Delete a publisher and, with force, its books. Part of the publishers/{publisher} resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    },
    "force": {
      "type": "boolean"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### skills.get

Get one agent skill with its files by its resource name, for example skills/working-with-books. Part of the skills/{skill} resource.

Authentication: optional

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```

### skills.list

List the agent skills the caller may read. Part of the skills resource.

Authentication: optional

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "pageSize": {
      "type": "integer",
      "minimum": -9007199254740991,
      "maximum": 9007199254740991
    },
    "pageToken": {
      "type": "string"
    }
  },
  "additionalProperties": false
}
```

### stats.get

Get request statistics. Part of the stats resource.

Authentication: required

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "type": "object",
  "properties": {
    "name": {
      "type": "string"
    }
  },
  "required": [
    "name"
  ],
  "additionalProperties": false
}
```
