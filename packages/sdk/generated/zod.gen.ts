import * as z from 'zod';

export const zAssetsListQuery = z.object({
    pageSize: z.int().optional(),
    pageToken: z.string().optional()
});

export const zAssetsListResponse = z.object({
    assets: z.array(z.object({
        sizeBytes: z.int().gte(0),
        sha256: z.string().regex(/^[a-f0-9]{64}$/),
        mediaType: z.string().min(1),
        name: z.string().min(1),
        uri: z.string().min(1),
        createTime: z.iso.datetime()
    })),
    nextPageToken: z.string()
});

export const zAssetsCreateBody = z.string();

export const zAssetsCreateHeaders = z.object({
    'x-content-sha256': z.string().regex(/^[a-f0-9]{64}$/)
});

export const zAssetsCreateResponse = z.object({
    sizeBytes: z.int().gte(0),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    mediaType: z.string().min(1),
    name: z.string().min(1),
    uri: z.string().min(1),
    createTime: z.iso.datetime()
});

export const zAssetsGetPath = z.object({
    asset: z.string()
});

export const zAssetsGetResponse = z.object({
    sizeBytes: z.int().gte(0),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    mediaType: z.string().min(1),
    name: z.string().min(1),
    uri: z.string().min(1),
    createTime: z.iso.datetime(),
    downloadUrl: z.url()
});

export const zBooksArchivePath = z.object({
    publisher: z.string(),
    book: z.string()
});

export const zBooksArchiveResponse = z.object({
    name: z.string().readonly(),
    title: z.string(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
    createTime: z.iso.datetime().optional(),
    updateTime: z.iso.datetime().optional(),
    deleteTime: z.iso.datetime().optional(),
    purgeTime: z.iso.datetime().optional(),
    etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
});

export const zBooksBatchCreateBody = z.object({
    requests: z.array(z.object({
        bookId: z.string().optional(),
        title: z.string().optional(),
        author: z.string().optional(),
        authorEmail: z.string().optional()
    }))
});

export const zBooksBatchCreatePath = z.object({
    publisher: z.string()
});

export const zBooksBatchCreateResponse = z.object({
    books: z.array(z.object({
        name: z.string().readonly(),
        title: z.string(),
        author: z.string().optional(),
        authorEmail: z.string().optional(),
        state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
        createTime: z.iso.datetime().optional(),
        updateTime: z.iso.datetime().optional(),
        deleteTime: z.iso.datetime().optional(),
        purgeTime: z.iso.datetime().optional(),
        etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
    }))
});

export const zBooksBatchGetPath = z.object({
    publisher: z.string()
});

export const zBooksBatchGetQuery = z.object({
    names: z.array(z.string())
});

export const zBooksBatchGetResponse = z.object({
    books: z.array(z.object({
        name: z.string().readonly(),
        title: z.string(),
        author: z.string().optional(),
        authorEmail: z.string().optional(),
        state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
        createTime: z.iso.datetime().optional(),
        updateTime: z.iso.datetime().optional(),
        deleteTime: z.iso.datetime().optional(),
        purgeTime: z.iso.datetime().optional(),
        etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
    }))
});

export const zBooksCountPath = z.object({
    publisher: z.string()
});

export const zBooksCountResponse = z.object({
    count: z.int()
});

export const zBooksListPath = z.object({
    publisher: z.string()
});

export const zBooksListQuery = z.object({
    pageSize: z.int().optional(),
    pageToken: z.string().optional(),
    orderBy: z.string().optional(),
    filter: z.string().optional(),
    showDeleted: z.boolean().optional()
});

export const zBooksListResponse = z.object({
    books: z.array(z.object({
        name: z.string().readonly(),
        title: z.string(),
        author: z.string().optional(),
        authorEmail: z.string().optional(),
        state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
        createTime: z.iso.datetime().optional(),
        updateTime: z.iso.datetime().optional(),
        deleteTime: z.iso.datetime().optional(),
        purgeTime: z.iso.datetime().optional(),
        etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
    })),
    nextPageToken: z.string()
});

export const zBooksCreateBody = z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    authorEmail: z.string().optional()
});

export const zBooksCreatePath = z.object({
    publisher: z.string()
});

export const zBooksCreateQuery = z.object({
    bookId: z.string().optional(),
    requestId: z.uuid().optional(),
    validateOnly: z.boolean().optional()
});

export const zBooksCreateResponse = z.object({
    name: z.string().readonly(),
    title: z.string(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
    createTime: z.iso.datetime().optional(),
    updateTime: z.iso.datetime().optional(),
    deleteTime: z.iso.datetime().optional(),
    purgeTime: z.iso.datetime().optional(),
    etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
});

export const zBooksDeletePath = z.object({
    publisher: z.string(),
    book: z.string()
});

export const zBooksDeleteQuery = z.object({
    etag: z.string().optional()
});

export const zBooksDeleteResponse = z.object({
    name: z.string().readonly(),
    title: z.string(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
    createTime: z.iso.datetime().optional(),
    updateTime: z.iso.datetime().optional(),
    deleteTime: z.iso.datetime().optional(),
    purgeTime: z.iso.datetime().optional(),
    etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
});

export const zBooksGetPath = z.object({
    publisher: z.string(),
    book: z.string()
});

export const zBooksGetQuery = z.object({
    view: z.enum(['BASIC', 'FULL']).optional()
});

export const zBooksGetResponse = z.object({
    name: z.string().readonly(),
    title: z.string(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
    createTime: z.iso.datetime().optional(),
    updateTime: z.iso.datetime().optional(),
    deleteTime: z.iso.datetime().optional(),
    purgeTime: z.iso.datetime().optional(),
    etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
});

export const zBooksUpdateBody = z.object({
    title: z.string().optional(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    etag: z.string().optional()
});

export const zBooksUpdatePath = z.object({
    publisher: z.string(),
    book: z.string()
});

export const zBooksUpdateQuery = z.object({
    updateMask: z.string().optional()
});

export const zBooksUpdateResponse = z.object({
    name: z.string().readonly(),
    title: z.string(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
    createTime: z.iso.datetime().optional(),
    updateTime: z.iso.datetime().optional(),
    deleteTime: z.iso.datetime().optional(),
    purgeTime: z.iso.datetime().optional(),
    etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
});

export const zBooksReindexPath = z.object({
    publisher: z.string()
});

export const zBooksReindexResponse = z.object({
    name: z.string(),
    done: z.boolean(),
    metadata: z.unknown().optional(),
    response: z.unknown().optional(),
    error: z.object({
        code: z.int(),
        message: z.string(),
        status: z.enum([
            'OK',
            'CANCELLED',
            'UNKNOWN',
            'INVALID_ARGUMENT',
            'DEADLINE_EXCEEDED',
            'NOT_FOUND',
            'ALREADY_EXISTS',
            'PERMISSION_DENIED',
            'UNAUTHENTICATED',
            'RESOURCE_EXHAUSTED',
            'FAILED_PRECONDITION',
            'ABORTED',
            'OUT_OF_RANGE',
            'UNIMPLEMENTED',
            'INTERNAL',
            'UNAVAILABLE',
            'DATA_LOSS'
        ]),
        details: z.array(z.object({
            '@type': z.enum(['type.googleapis.com/google.rpc.ErrorInfo']),
            reason: z.enum([
                'ACCEPT_REQUIRED',
                'ACCEPT_UNSUPPORTED',
                'CONTENT_TYPE_REQUIRED',
                'CONTENT_TYPE_UNSUPPORTED',
                'PROXY_REQUIRED',
                'AUTH_NOT_ENABLED',
                'TOKEN_MISSING',
                'TOKEN_INVALID',
                'TOKEN_EXPIRED',
                'POLICY_DENIED',
                'RATE_LIMITED',
                'VALIDATION_FAILED',
                'UNKNOWN_FIELD',
                'RESOURCE_NOT_FOUND',
                'RESOURCE_ALREADY_EXISTS',
                'ETAG_MISMATCH',
                'INVALID_STATE_TRANSITION',
                'UNKNOWN_VERB',
                'METHOD_NOT_ALLOWED',
                'INTERNAL_ERROR',
                'INVALID_FILTER',
                'INVALID_ORDER_BY',
                'INVALID_FIELD_MASK',
                'INVALID_PAGE_TOKEN',
                'INVALID_PAGE_SIZE',
                'INVALID_RESOURCE_NAME',
                'INVALID_RESOURCE_ID',
                'BATCH_TOO_LARGE',
                'FIELD_IMMUTABLE',
                'OPERATION_NOT_FOUND',
                'OPERATION_CANCELLED',
                'REQUIRED_FIELD_MISSING',
                'ORIGIN_NOT_ALLOWED',
                'HAS_CHILDREN',
                'CAPABILITY_DISABLED'
            ]),
            domain: z.string(),
            metadata: z.record(z.string(), z.string()).optional()
        })).min(1)
    }).optional()
});

export const zBooksSuggestPath = z.object({
    publisher: z.string()
});

export const zBooksSuggestResponse = z.object({
    books: z.array(z.object({
        name: z.string().readonly(),
        title: z.string(),
        author: z.string().optional(),
        authorEmail: z.string().optional(),
        state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
        createTime: z.iso.datetime().optional(),
        updateTime: z.iso.datetime().optional(),
        deleteTime: z.iso.datetime().optional(),
        purgeTime: z.iso.datetime().optional(),
        etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
    }))
});

export const zBooksUndeletePath = z.object({
    publisher: z.string(),
    book: z.string()
});

export const zBooksUndeleteResponse = z.object({
    name: z.string().readonly(),
    title: z.string(),
    author: z.string().optional(),
    authorEmail: z.string().optional(),
    state: z.enum(['ACTIVE', 'ARCHIVED']).readonly(),
    createTime: z.iso.datetime().optional(),
    updateTime: z.iso.datetime().optional(),
    deleteTime: z.iso.datetime().optional(),
    purgeTime: z.iso.datetime().optional(),
    etag: z.string().regex(/^(W\/)?"[^"]*"$/).optional()
});

export const zConfigGetResponse = z.object({
    name: z.string().readonly(),
    bannerText: z.string(),
    pageSizeDefault: z.int().gt(0)
});

export const zConfigUpdateBody = z.object({
    bannerText: z.string().optional(),
    pageSizeDefault: z.int().gt(0).optional()
});

export const zConfigUpdateResponse = z.object({
    name: z.string().readonly(),
    bannerText: z.string(),
    pageSizeDefault: z.int().gt(0)
});

export const zEventsGetResponse = z.object({
    events: z.array(z.union([
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['request']),
            status: z.int(),
            latencyMs: z.number().gte(0),
            cacheHit: z.boolean()
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['decision']),
            outcome: z.enum(['allow', 'deny']),
            reason: z.enum([
                'allowed',
                'kind_not_allowed',
                'missing_scope',
                'missing_role'
            ])
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['error']),
            status: z.string(),
            reason: z.string()
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['cache']),
            hit: z.boolean()
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['mask']),
            maskedPaths: z.array(z.string())
        })
    ]))
});

export const zLogsListQuery = z.object({
    kind: z.enum([
        'request',
        'decision',
        'error',
        'cache',
        'mask'
    ]).optional(),
    capability: z.string().optional(),
    pageSize: z.int().optional(),
    pageToken: z.string().optional()
});

export const zLogsListResponse = z.object({
    events: z.array(z.union([
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['request']),
            status: z.int(),
            latencyMs: z.number().gte(0),
            cacheHit: z.boolean()
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['decision']),
            outcome: z.enum(['allow', 'deny']),
            reason: z.enum([
                'allowed',
                'kind_not_allowed',
                'missing_scope',
                'missing_role'
            ])
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['error']),
            status: z.string(),
            reason: z.string()
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['cache']),
            hit: z.boolean()
        }),
        z.object({
            time: z.string(),
            requestId: z.string(),
            capability: z.string(),
            transport: z.enum(['http', 'mcp']),
            principalKind: z.enum([
                'anonymous',
                'user',
                'agent'
            ]),
            kind: z.enum(['mask']),
            maskedPaths: z.array(z.string())
        })
    ])),
    nextPageToken: z.string()
});

export const zOperationsCancelPath = z.object({
    operation: z.string()
});

export const zOperationsCancelResponse = z.record(z.string(), z.never());

export const zOperationsDeletePath = z.object({
    operation: z.string()
});

export const zOperationsDeleteResponse = z.record(z.string(), z.never());

export const zOperationsGetPath = z.object({
    operation: z.string()
});

export const zOperationsGetResponse = z.object({
    name: z.string(),
    done: z.boolean(),
    metadata: z.unknown().optional(),
    response: z.unknown().optional(),
    error: z.object({
        code: z.int(),
        message: z.string(),
        status: z.enum([
            'OK',
            'CANCELLED',
            'UNKNOWN',
            'INVALID_ARGUMENT',
            'DEADLINE_EXCEEDED',
            'NOT_FOUND',
            'ALREADY_EXISTS',
            'PERMISSION_DENIED',
            'UNAUTHENTICATED',
            'RESOURCE_EXHAUSTED',
            'FAILED_PRECONDITION',
            'ABORTED',
            'OUT_OF_RANGE',
            'UNIMPLEMENTED',
            'INTERNAL',
            'UNAVAILABLE',
            'DATA_LOSS'
        ]),
        details: z.array(z.object({
            '@type': z.enum(['type.googleapis.com/google.rpc.ErrorInfo']),
            reason: z.enum([
                'ACCEPT_REQUIRED',
                'ACCEPT_UNSUPPORTED',
                'CONTENT_TYPE_REQUIRED',
                'CONTENT_TYPE_UNSUPPORTED',
                'PROXY_REQUIRED',
                'AUTH_NOT_ENABLED',
                'TOKEN_MISSING',
                'TOKEN_INVALID',
                'TOKEN_EXPIRED',
                'POLICY_DENIED',
                'RATE_LIMITED',
                'VALIDATION_FAILED',
                'UNKNOWN_FIELD',
                'RESOURCE_NOT_FOUND',
                'RESOURCE_ALREADY_EXISTS',
                'ETAG_MISMATCH',
                'INVALID_STATE_TRANSITION',
                'UNKNOWN_VERB',
                'METHOD_NOT_ALLOWED',
                'INTERNAL_ERROR',
                'INVALID_FILTER',
                'INVALID_ORDER_BY',
                'INVALID_FIELD_MASK',
                'INVALID_PAGE_TOKEN',
                'INVALID_PAGE_SIZE',
                'INVALID_RESOURCE_NAME',
                'INVALID_RESOURCE_ID',
                'BATCH_TOO_LARGE',
                'FIELD_IMMUTABLE',
                'OPERATION_NOT_FOUND',
                'OPERATION_CANCELLED',
                'REQUIRED_FIELD_MISSING',
                'ORIGIN_NOT_ALLOWED',
                'HAS_CHILDREN',
                'CAPABILITY_DISABLED'
            ]),
            domain: z.string(),
            metadata: z.record(z.string(), z.string()).optional()
        })).min(1)
    }).optional()
});

export const zOperationsListQuery = z.object({
    pageSize: z.int().optional(),
    pageToken: z.string().optional(),
    filter: z.string().optional()
});

export const zOperationsListResponse = z.object({
    operations: z.array(z.object({
        name: z.string(),
        done: z.boolean(),
        metadata: z.unknown().optional(),
        response: z.unknown().optional(),
        error: z.object({
            code: z.int(),
            message: z.string(),
            status: z.enum([
                'OK',
                'CANCELLED',
                'UNKNOWN',
                'INVALID_ARGUMENT',
                'DEADLINE_EXCEEDED',
                'NOT_FOUND',
                'ALREADY_EXISTS',
                'PERMISSION_DENIED',
                'UNAUTHENTICATED',
                'RESOURCE_EXHAUSTED',
                'FAILED_PRECONDITION',
                'ABORTED',
                'OUT_OF_RANGE',
                'UNIMPLEMENTED',
                'INTERNAL',
                'UNAVAILABLE',
                'DATA_LOSS'
            ]),
            details: z.array(z.object({
                '@type': z.enum(['type.googleapis.com/google.rpc.ErrorInfo']),
                reason: z.enum([
                    'ACCEPT_REQUIRED',
                    'ACCEPT_UNSUPPORTED',
                    'CONTENT_TYPE_REQUIRED',
                    'CONTENT_TYPE_UNSUPPORTED',
                    'PROXY_REQUIRED',
                    'AUTH_NOT_ENABLED',
                    'TOKEN_MISSING',
                    'TOKEN_INVALID',
                    'TOKEN_EXPIRED',
                    'POLICY_DENIED',
                    'RATE_LIMITED',
                    'VALIDATION_FAILED',
                    'UNKNOWN_FIELD',
                    'RESOURCE_NOT_FOUND',
                    'RESOURCE_ALREADY_EXISTS',
                    'ETAG_MISMATCH',
                    'INVALID_STATE_TRANSITION',
                    'UNKNOWN_VERB',
                    'METHOD_NOT_ALLOWED',
                    'INTERNAL_ERROR',
                    'INVALID_FILTER',
                    'INVALID_ORDER_BY',
                    'INVALID_FIELD_MASK',
                    'INVALID_PAGE_TOKEN',
                    'INVALID_PAGE_SIZE',
                    'INVALID_RESOURCE_NAME',
                    'INVALID_RESOURCE_ID',
                    'BATCH_TOO_LARGE',
                    'FIELD_IMMUTABLE',
                    'OPERATION_NOT_FOUND',
                    'OPERATION_CANCELLED',
                    'REQUIRED_FIELD_MISSING',
                    'ORIGIN_NOT_ALLOWED',
                    'HAS_CHILDREN',
                    'CAPABILITY_DISABLED'
                ]),
                domain: z.string(),
                metadata: z.record(z.string(), z.string()).optional()
            })).min(1)
        }).optional()
    })),
    nextPageToken: z.string()
});

export const zOperationsWaitBody = z.object({
    timeout: z.string().regex(/^\d+(\.\d+)?s$/).optional()
});

export const zOperationsWaitPath = z.object({
    operation: z.string()
});

export const zOperationsWaitResponse = z.object({
    name: z.string(),
    done: z.boolean(),
    metadata: z.unknown().optional(),
    response: z.unknown().optional(),
    error: z.object({
        code: z.int(),
        message: z.string(),
        status: z.enum([
            'OK',
            'CANCELLED',
            'UNKNOWN',
            'INVALID_ARGUMENT',
            'DEADLINE_EXCEEDED',
            'NOT_FOUND',
            'ALREADY_EXISTS',
            'PERMISSION_DENIED',
            'UNAUTHENTICATED',
            'RESOURCE_EXHAUSTED',
            'FAILED_PRECONDITION',
            'ABORTED',
            'OUT_OF_RANGE',
            'UNIMPLEMENTED',
            'INTERNAL',
            'UNAVAILABLE',
            'DATA_LOSS'
        ]),
        details: z.array(z.object({
            '@type': z.enum(['type.googleapis.com/google.rpc.ErrorInfo']),
            reason: z.enum([
                'ACCEPT_REQUIRED',
                'ACCEPT_UNSUPPORTED',
                'CONTENT_TYPE_REQUIRED',
                'CONTENT_TYPE_UNSUPPORTED',
                'PROXY_REQUIRED',
                'AUTH_NOT_ENABLED',
                'TOKEN_MISSING',
                'TOKEN_INVALID',
                'TOKEN_EXPIRED',
                'POLICY_DENIED',
                'RATE_LIMITED',
                'VALIDATION_FAILED',
                'UNKNOWN_FIELD',
                'RESOURCE_NOT_FOUND',
                'RESOURCE_ALREADY_EXISTS',
                'ETAG_MISMATCH',
                'INVALID_STATE_TRANSITION',
                'UNKNOWN_VERB',
                'METHOD_NOT_ALLOWED',
                'INTERNAL_ERROR',
                'INVALID_FILTER',
                'INVALID_ORDER_BY',
                'INVALID_FIELD_MASK',
                'INVALID_PAGE_TOKEN',
                'INVALID_PAGE_SIZE',
                'INVALID_RESOURCE_NAME',
                'INVALID_RESOURCE_ID',
                'BATCH_TOO_LARGE',
                'FIELD_IMMUTABLE',
                'OPERATION_NOT_FOUND',
                'OPERATION_CANCELLED',
                'REQUIRED_FIELD_MISSING',
                'ORIGIN_NOT_ALLOWED',
                'HAS_CHILDREN',
                'CAPABILITY_DISABLED'
            ]),
            domain: z.string(),
            metadata: z.record(z.string(), z.string()).optional()
        })).min(1)
    }).optional()
});

export const zPublishersDeletePath = z.object({
    publisher: z.string()
});

export const zPublishersDeleteQuery = z.object({
    force: z.boolean().optional()
});

export const zPublishersDeleteResponse = z.object({
    name: z.string(),
    deletedBooks: z.int()
});

export const zSkillsGetPath = z.object({
    skill: z.string()
});

export const zSkillsGetResponse = z.object({
    name: z.string(),
    description: z.string(),
    uri: z.string(),
    digest: z.string(),
    files: z.array(z.object({
        path: z.string(),
        content: z.string()
    }))
});

export const zSkillsListQuery = z.object({
    pageSize: z.int().optional(),
    pageToken: z.string().optional()
});

export const zSkillsListResponse = z.object({
    skills: z.array(z.object({
        name: z.string(),
        description: z.string(),
        uri: z.string(),
        digest: z.string()
    })),
    nextPageToken: z.string()
});

export const zStatsGetResponse = z.object({
    name: z.string(),
    total: z.int(),
    errors: z.int(),
    cacheHits: z.int(),
    byCapability: z.record(z.string(), z.object({
        count: z.int(),
        errors: z.int(),
        cacheHits: z.int(),
        totalLatencyMs: z.number(),
        firstSeen: z.string(),
        lastSeen: z.string()
    })),
    process: z.object({
        rssBytes: z.number(),
        heapTotalBytes: z.number(),
        heapUsedBytes: z.number(),
        externalBytes: z.number(),
        cpuUserMicros: z.number(),
        cpuSystemMicros: z.number(),
        eventLoopDelayMaxMs: z.number(),
        uptimeSeconds: z.number(),
        requestsInFlight: z.int(),
        startRssBytes: z.number(),
        openStreams: z.int(),
        runningOperations: z.int(),
        heapCollections: z.int(),
        heapFreedBytes: z.number()
    }),
    stages: z.record(z.string(), z.object({
        count: z.int(),
        totalMs: z.number(),
        maxMs: z.number()
    })),
    operations: z.record(z.string(), z.object({
        count: z.int(),
        errors: z.int(),
        totalMs: z.number(),
        maxMs: z.number(),
        bytes: z.number(),
        buckets: z.array(z.int()),
        firstByteTotalMs: z.number(),
        firstByteMaxMs: z.number(),
        firstByteBuckets: z.array(z.int())
    }))
});
