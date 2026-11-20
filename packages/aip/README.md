# @platform/aip

Google AIP building blocks for a JSON/HTTP API.

| Area                               | Exports                                                                            |
| ---------------------------------- | ---------------------------------------------------------------------------------- |
| Names (AIP-122, 210)               | `parseResourceName`, `buildResourceName`, `isValidResourceId`, `normalizeNfc`      |
| Wire format (127, 142)             | `normalizeInput`, `toWire`                                                         |
| Paging (158)                       | `resolvePageSize`, `createPageTokenCodec`, `paginate`                              |
| Masks and views (157, 161)         | `parseFieldMask`, `validateFieldMask`, `selectFields`, `applyUpdateMask`           |
| Filters and order (132, 160)       | `parseFilter`, `matchesFilter`, `parseOrderBy`, `comparatorFor`                    |
| Concurrency (154, 155, 163)        | `computeEtag`, `checkEtag`, `RequestIdStore`, `executeOrPreview`                   |
| Lifecycle (151, 164, 216, 231-235) | `OperationStore`, `softDelete`, `undelete`, `transition`, `batchGet`, `atomically` |

The filter parser follows the published grammar: `OR` binds tighter than `AND`.
