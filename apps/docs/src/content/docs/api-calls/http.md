---
title: "HTTP reference"
description: "Every operation of the generated OpenAPI document."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

### `POST /v1/assets`

assets.create

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "x-content-sha256",
      "in": "header",
      "schema": {
        "type": "string",
        "pattern": "^[a-f0-9]{64}$"
      },
      "required": true
    }
  ],
  "requestBody": {
    "required": true,
    "content": {
      "application/octet-stream": {
        "schema": {
          "type": "string",
          "format": "binary"
        }
      },
      "application/pdf": {
        "schema": {
          "type": "string",
          "format": "binary"
        }
      },
      "image/png": {
        "schema": {
          "type": "string",
          "format": "binary"
        }
      },
      "image/jpeg": {
        "schema": {
          "type": "string",
          "format": "binary"
        }
      },
      "text/plain": {
        "schema": {
          "type": "string",
          "format": "binary"
        }
      }
    }
  }
}
```

### `GET /v1/assets`

assets.list

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "pageSize",
      "in": "query",
      "schema": {
        "type": "integer"
      },
      "required": false
    },
    {
      "name": "pageToken",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    }
  ]
}
```

### `GET /v1/assets/{asset}`

assets.get

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "asset",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `POST /v1/publishers/{publisher}/books/{book}:archive`

books.archive

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "book",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `POST /v1/publishers/{publisher}/books:batchCreate`

books.batchCreate

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ],
  "requestBody": {
    "content": {
      "application/json": {
        "examples": {
          "default": {
            "value": {
              "requests": []
            }
          }
        },
        "schema": {
          "type": "object",
          "properties": {
            "requests": {
              "type": "array",
              "items": {
                "type": "object",
                "properties": {
                  "bookId": {
                    "type": "string",
                    "fieldBehavior": "REQUIRED"
                  },
                  "title": {
                    "type": "string",
                    "fieldBehavior": "REQUIRED"
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
            "requests"
          ],
          "additionalProperties": false
        }
      },
      "application/x-ndjson": {
        "schema": {
          "type": "object",
          "properties": {
            "bookId": {
              "type": "string",
              "fieldBehavior": "REQUIRED"
            },
            "title": {
              "type": "string",
              "fieldBehavior": "REQUIRED"
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
    }
  }
}
```

### `GET /v1/publishers/{publisher}/books:batchGet`

books.batchGet

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "names",
      "in": "query",
      "schema": {
        "type": "array",
        "items": {
          "type": "string"
        }
      },
      "required": true
    }
  ]
}
```

### `POST /v1beta/publishers/{publisher}/books:count`

books.count

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `POST /v1/publishers/{publisher}/books`

books.create

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "bookId",
      "in": "query",
      "schema": {
        "type": "string",
        "fieldBehavior": "REQUIRED"
      },
      "required": false
    },
    {
      "name": "requestId",
      "in": "query",
      "schema": {
        "type": "string",
        "format": "uuid"
      },
      "required": false
    },
    {
      "name": "validateOnly",
      "in": "query",
      "schema": {
        "type": "boolean"
      },
      "required": false
    }
  ],
  "requestBody": {
    "content": {
      "application/json": {
        "examples": {
          "default": {
            "value": {}
          }
        },
        "schema": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string",
              "fieldBehavior": "REQUIRED"
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
    }
  }
}
```

### `GET /v1/publishers/{publisher}/books`

books.list

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "pageSize",
      "in": "query",
      "schema": {
        "type": "integer"
      },
      "required": false
    },
    {
      "name": "pageToken",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    },
    {
      "name": "orderBy",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    },
    {
      "name": "filter",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    },
    {
      "name": "showDeleted",
      "in": "query",
      "schema": {
        "type": "boolean"
      },
      "required": false
    }
  ]
}
```

### `DELETE /v1/publishers/{publisher}/books/{book}`

books.delete

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "book",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "etag",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    }
  ]
}
```

### `GET /v1/publishers/{publisher}/books/{book}`

books.get

Authentication: `[{},{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "book",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "view",
      "in": "query",
      "schema": {
        "type": "string",
        "enum": [
          "BASIC",
          "FULL"
        ]
      },
      "required": false
    }
  ]
}
```

### `PATCH /v1/publishers/{publisher}/books/{book}`

books.update

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "book",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "updateMask",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    }
  ],
  "requestBody": {
    "content": {
      "application/json": {
        "examples": {
          "default": {
            "value": {}
          }
        },
        "schema": {
          "type": "object",
          "properties": {
            "title": {
              "type": "string"
            },
            "author": {
              "type": "string"
            },
            "authorEmail": {
              "type": "string"
            },
            "etag": {
              "type": "string"
            }
          },
          "additionalProperties": false
        }
      }
    }
  }
}
```

### `POST /v1/publishers/{publisher}/books:reindex`

books.reindex

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `POST /v1alpha/publishers/{publisher}/books:suggest`

books.suggest

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `POST /v1/publishers/{publisher}/books/{book}:undelete`

books.undelete

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "book",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `GET /v1/config`

config.get

Authentication: `[]`

```json
{}
```

### `PATCH /v1/config`

config.update

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "requestBody": {
    "content": {
      "application/json": {
        "examples": {
          "default": {
            "value": {}
          }
        },
        "schema": {
          "type": "object",
          "properties": {
            "bannerText": {
              "type": "string"
            },
            "pageSizeDefault": {
              "type": "integer",
              "exclusiveMinimum": 0
            }
          },
          "additionalProperties": false
        }
      }
    }
  }
}
```

### `GET /v1/events`

events.get

Authentication: `[{"bearerAuth":[]}]`

```json
{}
```

### `GET /v1/logs`

logs.list

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "kind",
      "in": "query",
      "schema": {
        "type": "string",
        "enum": [
          "request",
          "decision",
          "error",
          "cache",
          "mask"
        ]
      },
      "required": false
    },
    {
      "name": "capability",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    },
    {
      "name": "pageSize",
      "in": "query",
      "schema": {
        "type": "integer"
      },
      "required": false
    },
    {
      "name": "pageToken",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    }
  ]
}
```

### `POST /v1/operations/{operation}:cancel`

operations.cancel

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "operation",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `DELETE /v1/operations/{operation}`

operations.delete

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "operation",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `GET /v1/operations/{operation}`

operations.get

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "operation",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `GET /v1/operations`

operations.list

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "pageSize",
      "in": "query",
      "schema": {
        "type": "integer"
      },
      "required": false
    },
    {
      "name": "pageToken",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    },
    {
      "name": "filter",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    }
  ]
}
```

### `POST /v1/operations/{operation}:wait`

operations.wait

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "operation",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ],
  "requestBody": {
    "content": {
      "application/json": {
        "examples": {
          "default": {
            "value": {}
          }
        },
        "schema": {
          "type": "object",
          "properties": {
            "timeout": {
              "type": "string",
              "pattern": "^\\d+(\\.\\d+)?s$"
            }
          },
          "additionalProperties": false
        }
      }
    }
  }
}
```

### `DELETE /v1/publishers/{publisher}`

publishers.delete

Authentication: `[{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "publisher",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    },
    {
      "name": "force",
      "in": "query",
      "schema": {
        "type": "boolean"
      },
      "required": false
    }
  ]
}
```

### `GET /v1/skills/{skill}`

skills.get

Authentication: `[{},{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "skill",
      "in": "path",
      "schema": {
        "type": "string"
      },
      "required": true
    }
  ]
}
```

### `GET /v1/skills`

skills.list

Authentication: `[{},{"bearerAuth":[]}]`

```json
{
  "parameters": [
    {
      "name": "pageSize",
      "in": "query",
      "schema": {
        "type": "integer"
      },
      "required": false
    },
    {
      "name": "pageToken",
      "in": "query",
      "schema": {
        "type": "string"
      },
      "required": false
    }
  ]
}
```

### `GET /v1/stats`

stats.get

Authentication: `[{"bearerAuth":[]}]`

```json
{}
```
