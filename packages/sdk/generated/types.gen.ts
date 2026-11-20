export type ClientOptions = {
    baseUrl: `${string}://${string}` | (string & {});
};

export type AssetsListData = {
    body?: never;
    path?: never;
    query?: {
        pageSize?: number;
        pageToken?: string;
    };
    url: '/v1/assets';
};

export type AssetsListErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type AssetsListError = AssetsListErrors[keyof AssetsListErrors];

export type AssetsListResponses = {
    200: {
        assets: Array<{
            sizeBytes: number;
            sha256: string;
            mediaType: string;
            name: string;
            uri: string;
            createTime: string;
        }>;
        nextPageToken: string;
    };
};

export type AssetsListResponse = AssetsListResponses[keyof AssetsListResponses];

export type AssetsCreateData = {
    body: Blob | File;
    headers: {
        'x-content-sha256': string;
    };
    path?: never;
    query?: never;
    url: '/v1/assets';
};

export type AssetsCreateErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    415: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type AssetsCreateError = AssetsCreateErrors[keyof AssetsCreateErrors];

export type AssetsCreateResponses = {
    200: {
        sizeBytes: number;
        sha256: string;
        mediaType: string;
        name: string;
        uri: string;
        createTime: string;
    };
};

export type AssetsCreateResponse = AssetsCreateResponses[keyof AssetsCreateResponses];

export type AssetsGetData = {
    body?: never;
    path: {
        asset: string;
    };
    query?: never;
    url: '/v1/assets/{asset}';
};

export type AssetsGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type AssetsGetError = AssetsGetErrors[keyof AssetsGetErrors];

export type AssetsGetResponses = {
    200: {
        sizeBytes: number;
        sha256: string;
        mediaType: string;
        name: string;
        uri: string;
        createTime: string;
        downloadUrl: string;
    };
};

export type AssetsGetResponse = AssetsGetResponses[keyof AssetsGetResponses];

export type BooksArchiveData = {
    body?: never;
    path: {
        publisher: string;
        book: string;
    };
    query?: never;
    url: '/v1/publishers/{publisher}/books/{book}:archive';
};

export type BooksArchiveErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksArchiveError = BooksArchiveErrors[keyof BooksArchiveErrors];

export type BooksArchiveResponses = {
    200: {
        readonly name: string;
        title: string;
        author?: string;
        authorEmail?: string;
        readonly state: 'ACTIVE' | 'ARCHIVED';
        createTime?: string;
        updateTime?: string;
        deleteTime?: string;
        purgeTime?: string;
        etag?: string;
    };
};

export type BooksArchiveResponse = BooksArchiveResponses[keyof BooksArchiveResponses];

export type BooksBatchCreateData = {
    body?: {
        requests: Array<{
            bookId?: string;
            title?: string;
            author?: string;
            authorEmail?: string;
        }>;
    };
    path: {
        publisher: string;
    };
    query?: never;
    url: '/v1/publishers/{publisher}/books:batchCreate';
};

export type BooksBatchCreateErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    415: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksBatchCreateError = BooksBatchCreateErrors[keyof BooksBatchCreateErrors];

export type BooksBatchCreateResponses = {
    200: {
        books: Array<{
            readonly name: string;
            title: string;
            author?: string;
            authorEmail?: string;
            readonly state: 'ACTIVE' | 'ARCHIVED';
            createTime?: string;
            updateTime?: string;
            deleteTime?: string;
            purgeTime?: string;
            etag?: string;
        }>;
    };
};

export type BooksBatchCreateResponse = BooksBatchCreateResponses[keyof BooksBatchCreateResponses];

export type BooksBatchGetData = {
    body?: never;
    path: {
        publisher: string;
    };
    query: {
        names: Array<string>;
    };
    url: '/v1/publishers/{publisher}/books:batchGet';
};

export type BooksBatchGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksBatchGetError = BooksBatchGetErrors[keyof BooksBatchGetErrors];

export type BooksBatchGetResponses = {
    200: {
        books: Array<{
            readonly name: string;
            title: string;
            author?: string;
            authorEmail?: string;
            readonly state: 'ACTIVE' | 'ARCHIVED';
            createTime?: string;
            updateTime?: string;
            deleteTime?: string;
            purgeTime?: string;
            etag?: string;
        }>;
    };
};

export type BooksBatchGetResponse = BooksBatchGetResponses[keyof BooksBatchGetResponses];

export type BooksCountData = {
    body?: never;
    path: {
        publisher: string;
    };
    query?: never;
    url: '/v1beta/publishers/{publisher}/books:count';
};

export type BooksCountErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksCountError = BooksCountErrors[keyof BooksCountErrors];

export type BooksCountResponses = {
    200: {
        count: number;
    };
};

export type BooksCountResponse = BooksCountResponses[keyof BooksCountResponses];

export type BooksListData = {
    body?: never;
    path: {
        publisher: string;
    };
    query?: {
        pageSize?: number;
        pageToken?: string;
        orderBy?: string;
        filter?: string;
        showDeleted?: boolean;
    };
    url: '/v1/publishers/{publisher}/books';
};

export type BooksListErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksListError = BooksListErrors[keyof BooksListErrors];

export type BooksListResponses = {
    200: {
        books: Array<{
            readonly name: string;
            title: string;
            author?: string;
            authorEmail?: string;
            readonly state: 'ACTIVE' | 'ARCHIVED';
            createTime?: string;
            updateTime?: string;
            deleteTime?: string;
            purgeTime?: string;
            etag?: string;
        }>;
        nextPageToken: string;
    };
};

export type BooksListResponse = BooksListResponses[keyof BooksListResponses];

export type BooksCreateData = {
    body?: {
        title?: string;
        author?: string;
        authorEmail?: string;
    };
    path: {
        publisher: string;
    };
    query?: {
        bookId?: string;
        requestId?: string;
        validateOnly?: boolean;
    };
    url: '/v1/publishers/{publisher}/books';
};

export type BooksCreateErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    415: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksCreateError = BooksCreateErrors[keyof BooksCreateErrors];

export type BooksCreateResponses = {
    200: {
        readonly name: string;
        title: string;
        author?: string;
        authorEmail?: string;
        readonly state: 'ACTIVE' | 'ARCHIVED';
        createTime?: string;
        updateTime?: string;
        deleteTime?: string;
        purgeTime?: string;
        etag?: string;
    };
};

export type BooksCreateResponse = BooksCreateResponses[keyof BooksCreateResponses];

export type BooksDeleteData = {
    body?: never;
    path: {
        publisher: string;
        book: string;
    };
    query?: {
        etag?: string;
    };
    url: '/v1/publishers/{publisher}/books/{book}';
};

export type BooksDeleteErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksDeleteError = BooksDeleteErrors[keyof BooksDeleteErrors];

export type BooksDeleteResponses = {
    200: {
        readonly name: string;
        title: string;
        author?: string;
        authorEmail?: string;
        readonly state: 'ACTIVE' | 'ARCHIVED';
        createTime?: string;
        updateTime?: string;
        deleteTime?: string;
        purgeTime?: string;
        etag?: string;
    };
};

export type BooksDeleteResponse = BooksDeleteResponses[keyof BooksDeleteResponses];

export type BooksGetData = {
    body?: never;
    path: {
        publisher: string;
        book: string;
    };
    query?: {
        view?: 'BASIC' | 'FULL';
    };
    url: '/v1/publishers/{publisher}/books/{book}';
};

export type BooksGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksGetError = BooksGetErrors[keyof BooksGetErrors];

export type BooksGetResponses = {
    200: {
        readonly name: string;
        title: string;
        author?: string;
        authorEmail?: string;
        readonly state: 'ACTIVE' | 'ARCHIVED';
        createTime?: string;
        updateTime?: string;
        deleteTime?: string;
        purgeTime?: string;
        etag?: string;
    };
};

export type BooksGetResponse = BooksGetResponses[keyof BooksGetResponses];

export type BooksUpdateData = {
    body?: {
        title?: string;
        author?: string;
        authorEmail?: string;
        etag?: string;
    };
    path: {
        publisher: string;
        book: string;
    };
    query?: {
        updateMask?: string;
    };
    url: '/v1/publishers/{publisher}/books/{book}';
};

export type BooksUpdateErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    415: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksUpdateError = BooksUpdateErrors[keyof BooksUpdateErrors];

export type BooksUpdateResponses = {
    200: {
        readonly name: string;
        title: string;
        author?: string;
        authorEmail?: string;
        readonly state: 'ACTIVE' | 'ARCHIVED';
        createTime?: string;
        updateTime?: string;
        deleteTime?: string;
        purgeTime?: string;
        etag?: string;
    };
};

export type BooksUpdateResponse = BooksUpdateResponses[keyof BooksUpdateResponses];

export type BooksReindexData = {
    body?: never;
    path: {
        publisher: string;
    };
    query?: never;
    url: '/v1/publishers/{publisher}/books:reindex';
};

export type BooksReindexErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksReindexError = BooksReindexErrors[keyof BooksReindexErrors];

export type BooksReindexResponses = {
    200: {
        name: string;
        done: boolean;
        metadata?: unknown;
        response?: unknown;
        error?: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksReindexResponse = BooksReindexResponses[keyof BooksReindexResponses];

export type BooksSuggestData = {
    body?: never;
    path: {
        publisher: string;
    };
    query?: never;
    url: '/v1alpha/publishers/{publisher}/books:suggest';
};

export type BooksSuggestErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksSuggestError = BooksSuggestErrors[keyof BooksSuggestErrors];

export type BooksSuggestResponses = {
    200: {
        books: Array<{
            readonly name: string;
            title: string;
            author?: string;
            authorEmail?: string;
            readonly state: 'ACTIVE' | 'ARCHIVED';
            createTime?: string;
            updateTime?: string;
            deleteTime?: string;
            purgeTime?: string;
            etag?: string;
        }>;
    };
};

export type BooksSuggestResponse = BooksSuggestResponses[keyof BooksSuggestResponses];

export type BooksUndeleteData = {
    body?: never;
    path: {
        publisher: string;
        book: string;
    };
    query?: never;
    url: '/v1/publishers/{publisher}/books/{book}:undelete';
};

export type BooksUndeleteErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type BooksUndeleteError = BooksUndeleteErrors[keyof BooksUndeleteErrors];

export type BooksUndeleteResponses = {
    200: {
        readonly name: string;
        title: string;
        author?: string;
        authorEmail?: string;
        readonly state: 'ACTIVE' | 'ARCHIVED';
        createTime?: string;
        updateTime?: string;
        deleteTime?: string;
        purgeTime?: string;
        etag?: string;
    };
};

export type BooksUndeleteResponse = BooksUndeleteResponses[keyof BooksUndeleteResponses];

export type ConfigGetData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/v1/config';
};

export type ConfigGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type ConfigGetError = ConfigGetErrors[keyof ConfigGetErrors];

export type ConfigGetResponses = {
    200: {
        readonly name: string;
        bannerText: string;
        pageSizeDefault: number;
    };
};

export type ConfigGetResponse = ConfigGetResponses[keyof ConfigGetResponses];

export type ConfigUpdateData = {
    body?: {
        bannerText?: string;
        pageSizeDefault?: number;
    };
    path?: never;
    query?: never;
    url: '/v1/config';
};

export type ConfigUpdateErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    415: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type ConfigUpdateError = ConfigUpdateErrors[keyof ConfigUpdateErrors];

export type ConfigUpdateResponses = {
    200: {
        readonly name: string;
        bannerText: string;
        pageSizeDefault: number;
    };
};

export type ConfigUpdateResponse = ConfigUpdateResponses[keyof ConfigUpdateResponses];

export type EventsGetData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/v1/events';
};

export type EventsGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type EventsGetError = EventsGetErrors[keyof EventsGetErrors];

export type EventsGetResponses = {
    200: {
        events: Array<{
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'request';
            status: number;
            latencyMs: number;
            cacheHit: boolean;
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'decision';
            outcome: 'allow' | 'deny';
            reason: 'allowed' | 'kind_not_allowed' | 'missing_scope' | 'missing_role';
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'error';
            status: string;
            reason: string;
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'cache';
            hit: boolean;
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'mask';
            maskedPaths: Array<string>;
        }>;
    };
};

export type EventsGetResponse = EventsGetResponses[keyof EventsGetResponses];

export type LogsListData = {
    body?: never;
    path?: never;
    query?: {
        kind?: 'request' | 'decision' | 'error' | 'cache' | 'mask';
        capability?: string;
        pageSize?: number;
        pageToken?: string;
    };
    url: '/v1/logs';
};

export type LogsListErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type LogsListError = LogsListErrors[keyof LogsListErrors];

export type LogsListResponses = {
    200: {
        events: Array<{
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'request';
            status: number;
            latencyMs: number;
            cacheHit: boolean;
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'decision';
            outcome: 'allow' | 'deny';
            reason: 'allowed' | 'kind_not_allowed' | 'missing_scope' | 'missing_role';
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'error';
            status: string;
            reason: string;
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'cache';
            hit: boolean;
        } | {
            time: string;
            requestId: string;
            capability: string;
            transport: 'http' | 'mcp';
            principalKind: 'anonymous' | 'user' | 'agent';
            kind: 'mask';
            maskedPaths: Array<string>;
        }>;
        nextPageToken: string;
    };
};

export type LogsListResponse = LogsListResponses[keyof LogsListResponses];

export type OperationsCancelData = {
    body?: never;
    path: {
        operation: string;
    };
    query?: never;
    url: '/v1/operations/{operation}:cancel';
};

export type OperationsCancelErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type OperationsCancelError = OperationsCancelErrors[keyof OperationsCancelErrors];

export type OperationsCancelResponses = {
    200: {
        [key: string]: never;
    };
};

export type OperationsCancelResponse = OperationsCancelResponses[keyof OperationsCancelResponses];

export type OperationsDeleteData = {
    body?: never;
    path: {
        operation: string;
    };
    query?: never;
    url: '/v1/operations/{operation}';
};

export type OperationsDeleteErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type OperationsDeleteError = OperationsDeleteErrors[keyof OperationsDeleteErrors];

export type OperationsDeleteResponses = {
    200: {
        [key: string]: never;
    };
};

export type OperationsDeleteResponse = OperationsDeleteResponses[keyof OperationsDeleteResponses];

export type OperationsGetData = {
    body?: never;
    path: {
        operation: string;
    };
    query?: never;
    url: '/v1/operations/{operation}';
};

export type OperationsGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type OperationsGetError = OperationsGetErrors[keyof OperationsGetErrors];

export type OperationsGetResponses = {
    200: {
        name: string;
        done: boolean;
        metadata?: unknown;
        response?: unknown;
        error?: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type OperationsGetResponse = OperationsGetResponses[keyof OperationsGetResponses];

export type OperationsListData = {
    body?: never;
    path?: never;
    query?: {
        pageSize?: number;
        pageToken?: string;
        filter?: string;
    };
    url: '/v1/operations';
};

export type OperationsListErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type OperationsListError = OperationsListErrors[keyof OperationsListErrors];

export type OperationsListResponses = {
    200: {
        operations: Array<{
            name: string;
            done: boolean;
            metadata?: unknown;
            response?: unknown;
            error?: {
                code: number;
                message: string;
                status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
                details: Array<{
                    '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                    reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                    domain: string;
                    metadata?: {
                        [key: string]: string;
                    };
                }>;
            };
        }>;
        nextPageToken: string;
    };
};

export type OperationsListResponse = OperationsListResponses[keyof OperationsListResponses];

export type OperationsWaitData = {
    body?: {
        timeout?: string;
    };
    path: {
        operation: string;
    };
    query?: never;
    url: '/v1/operations/{operation}:wait';
};

export type OperationsWaitErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    415: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type OperationsWaitError = OperationsWaitErrors[keyof OperationsWaitErrors];

export type OperationsWaitResponses = {
    200: {
        name: string;
        done: boolean;
        metadata?: unknown;
        response?: unknown;
        error?: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type OperationsWaitResponse = OperationsWaitResponses[keyof OperationsWaitResponses];

export type PublishersDeleteData = {
    body?: never;
    path: {
        publisher: string;
    };
    query?: {
        force?: boolean;
    };
    url: '/v1/publishers/{publisher}';
};

export type PublishersDeleteErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type PublishersDeleteError = PublishersDeleteErrors[keyof PublishersDeleteErrors];

export type PublishersDeleteResponses = {
    200: {
        name: string;
        deletedBooks: number;
    };
};

export type PublishersDeleteResponse = PublishersDeleteResponses[keyof PublishersDeleteResponses];

export type SkillsGetData = {
    body?: never;
    path: {
        skill: string;
    };
    query?: never;
    url: '/v1/skills/{skill}';
};

export type SkillsGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type SkillsGetError = SkillsGetErrors[keyof SkillsGetErrors];

export type SkillsGetResponses = {
    200: {
        name: string;
        description: string;
        uri: string;
        digest: string;
        files: Array<{
            path: string;
            content: string;
        }>;
    };
};

export type SkillsGetResponse = SkillsGetResponses[keyof SkillsGetResponses];

export type SkillsListData = {
    body?: never;
    path?: never;
    query?: {
        pageSize?: number;
        pageToken?: string;
    };
    url: '/v1/skills';
};

export type SkillsListErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type SkillsListError = SkillsListErrors[keyof SkillsListErrors];

export type SkillsListResponses = {
    200: {
        skills: Array<{
            name: string;
            description: string;
            uri: string;
            digest: string;
        }>;
        nextPageToken: string;
    };
};

export type SkillsListResponse = SkillsListResponses[keyof SkillsListResponses];

export type StatsGetData = {
    body?: never;
    path?: never;
    query?: never;
    url: '/v1/stats';
};

export type StatsGetErrors = {
    406: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
    default: {
        error: {
            code: number;
            message: string;
            status: 'OK' | 'CANCELLED' | 'UNKNOWN' | 'INVALID_ARGUMENT' | 'DEADLINE_EXCEEDED' | 'NOT_FOUND' | 'ALREADY_EXISTS' | 'PERMISSION_DENIED' | 'UNAUTHENTICATED' | 'RESOURCE_EXHAUSTED' | 'FAILED_PRECONDITION' | 'ABORTED' | 'OUT_OF_RANGE' | 'UNIMPLEMENTED' | 'INTERNAL' | 'UNAVAILABLE' | 'DATA_LOSS';
            details: Array<{
                '@type': 'type.googleapis.com/google.rpc.ErrorInfo';
                reason: 'ACCEPT_REQUIRED' | 'ACCEPT_UNSUPPORTED' | 'CONTENT_TYPE_REQUIRED' | 'CONTENT_TYPE_UNSUPPORTED' | 'PROXY_REQUIRED' | 'AUTH_NOT_ENABLED' | 'TOKEN_MISSING' | 'TOKEN_INVALID' | 'TOKEN_EXPIRED' | 'POLICY_DENIED' | 'RATE_LIMITED' | 'VALIDATION_FAILED' | 'UNKNOWN_FIELD' | 'RESOURCE_NOT_FOUND' | 'RESOURCE_ALREADY_EXISTS' | 'ETAG_MISMATCH' | 'INVALID_STATE_TRANSITION' | 'UNKNOWN_VERB' | 'METHOD_NOT_ALLOWED' | 'INTERNAL_ERROR' | 'INVALID_FILTER' | 'INVALID_ORDER_BY' | 'INVALID_FIELD_MASK' | 'INVALID_PAGE_TOKEN' | 'INVALID_PAGE_SIZE' | 'INVALID_RESOURCE_NAME' | 'INVALID_RESOURCE_ID' | 'BATCH_TOO_LARGE' | 'FIELD_IMMUTABLE' | 'OPERATION_NOT_FOUND' | 'OPERATION_CANCELLED' | 'REQUIRED_FIELD_MISSING' | 'ORIGIN_NOT_ALLOWED' | 'HAS_CHILDREN' | 'CAPABILITY_DISABLED';
                domain: string;
                metadata?: {
                    [key: string]: string;
                };
            }>;
        };
    };
};

export type StatsGetError = StatsGetErrors[keyof StatsGetErrors];

export type StatsGetResponses = {
    200: {
        name: string;
        total: number;
        errors: number;
        cacheHits: number;
        byCapability: {
            [key: string]: {
                count: number;
                errors: number;
                cacheHits: number;
                totalLatencyMs: number;
                firstSeen: string;
                lastSeen: string;
            };
        };
        process: {
            rssBytes: number;
            heapTotalBytes: number;
            heapUsedBytes: number;
            externalBytes: number;
            cpuUserMicros: number;
            cpuSystemMicros: number;
            eventLoopDelayMaxMs: number;
            uptimeSeconds: number;
            requestsInFlight: number;
            startRssBytes: number;
            openStreams: number;
            runningOperations: number;
            heapCollections: number;
            heapFreedBytes: number;
        };
        stages: {
            [key: string]: {
                count: number;
                totalMs: number;
                maxMs: number;
            };
        };
        operations: {
            [key: string]: {
                count: number;
                errors: number;
                totalMs: number;
                maxMs: number;
                bytes: number;
                buckets: Array<number>;
                firstByteTotalMs: number;
                firstByteMaxMs: number;
                firstByteBuckets: Array<number>;
            };
        };
    };
};

export type StatsGetResponse = StatsGetResponses[keyof StatsGetResponses];
