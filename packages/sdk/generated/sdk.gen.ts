import type { Client, ClientMeta, Options as Options2, RequestResult, TDataShape } from './client';
import { client } from './client.gen';
import type { AssetsCreateData, AssetsCreateErrors, AssetsCreateResponses, AssetsGetData, AssetsGetErrors, AssetsGetResponses, AssetsListData, AssetsListErrors, AssetsListResponses, BooksArchiveData, BooksArchiveErrors, BooksArchiveResponses, BooksBatchCreateData, BooksBatchCreateErrors, BooksBatchCreateResponses, BooksBatchGetData, BooksBatchGetErrors, BooksBatchGetResponses, BooksCountData, BooksCountErrors, BooksCountResponses, BooksCreateData, BooksCreateErrors, BooksCreateResponses, BooksDeleteData, BooksDeleteErrors, BooksDeleteResponses, BooksGetData, BooksGetErrors, BooksGetResponses, BooksListData, BooksListErrors, BooksListResponses, BooksReindexData, BooksReindexErrors, BooksReindexResponses, BooksSuggestData, BooksSuggestErrors, BooksSuggestResponses, BooksUndeleteData, BooksUndeleteErrors, BooksUndeleteResponses, BooksUpdateData, BooksUpdateErrors, BooksUpdateResponses, ConfigGetData, ConfigGetErrors, ConfigGetResponses, ConfigUpdateData, ConfigUpdateErrors, ConfigUpdateResponses, EventsGetData, EventsGetErrors, EventsGetResponses, LogsListData, LogsListErrors, LogsListResponses, OperationsCancelData, OperationsCancelErrors, OperationsCancelResponses, OperationsDeleteData, OperationsDeleteErrors, OperationsDeleteResponses, OperationsGetData, OperationsGetErrors, OperationsGetResponses, OperationsListData, OperationsListErrors, OperationsListResponses, OperationsWaitData, OperationsWaitErrors, OperationsWaitResponses, PublishersDeleteData, PublishersDeleteErrors, PublishersDeleteResponses, SkillsGetData, SkillsGetErrors, SkillsGetResponses, SkillsListData, SkillsListErrors, SkillsListResponses, StatsGetData, StatsGetErrors, StatsGetResponses } from './types.gen';

export type Options<TData extends TDataShape = TDataShape, ThrowOnError extends boolean = boolean, TResponse = unknown> = Options2<TData, ThrowOnError, TResponse> & {
    client?: Client;
    meta?: keyof ClientMeta extends never ? Record<string, unknown> : ClientMeta;
};

export const assetsList = <ThrowOnError extends boolean = false>(options?: Options<AssetsListData, ThrowOnError>): RequestResult<AssetsListResponses, AssetsListErrors, ThrowOnError> => (options?.client ?? client).get<AssetsListResponses, AssetsListErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/assets',
    ...options
});

export const assetsCreate = <ThrowOnError extends boolean = false>(options: Options<AssetsCreateData, ThrowOnError>): RequestResult<AssetsCreateResponses, AssetsCreateErrors, ThrowOnError> => (options.client ?? client).post<AssetsCreateResponses, AssetsCreateErrors, ThrowOnError>({
    bodySerializer: null,
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/assets',
    ...options,
    headers: {
        'Content-Type': 'application/octet-stream',
        ...options.headers
    }
});

export const assetsGet = <ThrowOnError extends boolean = false>(options: Options<AssetsGetData, ThrowOnError>): RequestResult<AssetsGetResponses, AssetsGetErrors, ThrowOnError> => (options.client ?? client).get<AssetsGetResponses, AssetsGetErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/assets/{asset}',
    ...options
});

export const booksArchive = <ThrowOnError extends boolean = false>(options: Options<BooksArchiveData, ThrowOnError>): RequestResult<BooksArchiveResponses, BooksArchiveErrors, ThrowOnError> => (options.client ?? client).post<BooksArchiveResponses, BooksArchiveErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books/{book}:archive',
    ...options
});

export const booksBatchCreate = <ThrowOnError extends boolean = false>(options: Options<BooksBatchCreateData, ThrowOnError>): RequestResult<BooksBatchCreateResponses, BooksBatchCreateErrors, ThrowOnError> => (options.client ?? client).post<BooksBatchCreateResponses, BooksBatchCreateErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books:batchCreate',
    ...options,
    headers: {
        'Content-Type': 'application/json',
        ...options.headers
    }
});

export const booksBatchGet = <ThrowOnError extends boolean = false>(options: Options<BooksBatchGetData, ThrowOnError>): RequestResult<BooksBatchGetResponses, BooksBatchGetErrors, ThrowOnError> => (options.client ?? client).get<BooksBatchGetResponses, BooksBatchGetErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books:batchGet',
    ...options
});

export const booksCount = <ThrowOnError extends boolean = false>(options: Options<BooksCountData, ThrowOnError>): RequestResult<BooksCountResponses, BooksCountErrors, ThrowOnError> => (options.client ?? client).post<BooksCountResponses, BooksCountErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1beta/publishers/{publisher}/books:count',
    ...options
});

export const booksList = <ThrowOnError extends boolean = false>(options: Options<BooksListData, ThrowOnError>): RequestResult<BooksListResponses, BooksListErrors, ThrowOnError> => (options.client ?? client).get<BooksListResponses, BooksListErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books',
    ...options
});

export const booksCreate = <ThrowOnError extends boolean = false>(options: Options<BooksCreateData, ThrowOnError>): RequestResult<BooksCreateResponses, BooksCreateErrors, ThrowOnError> => (options.client ?? client).post<BooksCreateResponses, BooksCreateErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books',
    ...options,
    headers: {
        'Content-Type': 'application/json',
        ...options.headers
    }
});

export const booksDelete = <ThrowOnError extends boolean = false>(options: Options<BooksDeleteData, ThrowOnError>): RequestResult<BooksDeleteResponses, BooksDeleteErrors, ThrowOnError> => (options.client ?? client).delete<BooksDeleteResponses, BooksDeleteErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books/{book}',
    ...options
});

export const booksGet = <ThrowOnError extends boolean = false>(options: Options<BooksGetData, ThrowOnError>): RequestResult<BooksGetResponses, BooksGetErrors, ThrowOnError> => (options.client ?? client).get<BooksGetResponses, BooksGetErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books/{book}',
    ...options
});

export const booksUpdate = <ThrowOnError extends boolean = false>(options: Options<BooksUpdateData, ThrowOnError>): RequestResult<BooksUpdateResponses, BooksUpdateErrors, ThrowOnError> => (options.client ?? client).patch<BooksUpdateResponses, BooksUpdateErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books/{book}',
    ...options,
    headers: {
        'Content-Type': 'application/json',
        ...options.headers
    }
});

export const booksReindex = <ThrowOnError extends boolean = false>(options: Options<BooksReindexData, ThrowOnError>): RequestResult<BooksReindexResponses, BooksReindexErrors, ThrowOnError> => (options.client ?? client).post<BooksReindexResponses, BooksReindexErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books:reindex',
    ...options
});

export const booksSuggest = <ThrowOnError extends boolean = false>(options: Options<BooksSuggestData, ThrowOnError>): RequestResult<BooksSuggestResponses, BooksSuggestErrors, ThrowOnError> => (options.client ?? client).post<BooksSuggestResponses, BooksSuggestErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1alpha/publishers/{publisher}/books:suggest',
    ...options
});

export const booksUndelete = <ThrowOnError extends boolean = false>(options: Options<BooksUndeleteData, ThrowOnError>): RequestResult<BooksUndeleteResponses, BooksUndeleteErrors, ThrowOnError> => (options.client ?? client).post<BooksUndeleteResponses, BooksUndeleteErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}/books/{book}:undelete',
    ...options
});

export const configGet = <ThrowOnError extends boolean = false>(options?: Options<ConfigGetData, ThrowOnError>): RequestResult<ConfigGetResponses, ConfigGetErrors, ThrowOnError> => (options?.client ?? client).get<ConfigGetResponses, ConfigGetErrors, ThrowOnError>({ url: '/v1/config', ...options });

export const configUpdate = <ThrowOnError extends boolean = false>(options?: Options<ConfigUpdateData, ThrowOnError>): RequestResult<ConfigUpdateResponses, ConfigUpdateErrors, ThrowOnError> => (options?.client ?? client).patch<ConfigUpdateResponses, ConfigUpdateErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/config',
    ...options,
    headers: {
        'Content-Type': 'application/json',
        ...options?.headers
    }
});

export const eventsGet = <ThrowOnError extends boolean = false>(options?: Options<EventsGetData, ThrowOnError>): RequestResult<EventsGetResponses, EventsGetErrors, ThrowOnError> => (options?.client ?? client).get<EventsGetResponses, EventsGetErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/events',
    ...options
});

export const logsList = <ThrowOnError extends boolean = false>(options?: Options<LogsListData, ThrowOnError>): RequestResult<LogsListResponses, LogsListErrors, ThrowOnError> => (options?.client ?? client).get<LogsListResponses, LogsListErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/logs',
    ...options
});

export const operationsCancel = <ThrowOnError extends boolean = false>(options: Options<OperationsCancelData, ThrowOnError>): RequestResult<OperationsCancelResponses, OperationsCancelErrors, ThrowOnError> => (options.client ?? client).post<OperationsCancelResponses, OperationsCancelErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/operations/{operation}:cancel',
    ...options
});

export const operationsDelete = <ThrowOnError extends boolean = false>(options: Options<OperationsDeleteData, ThrowOnError>): RequestResult<OperationsDeleteResponses, OperationsDeleteErrors, ThrowOnError> => (options.client ?? client).delete<OperationsDeleteResponses, OperationsDeleteErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/operations/{operation}',
    ...options
});

export const operationsGet = <ThrowOnError extends boolean = false>(options: Options<OperationsGetData, ThrowOnError>): RequestResult<OperationsGetResponses, OperationsGetErrors, ThrowOnError> => (options.client ?? client).get<OperationsGetResponses, OperationsGetErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/operations/{operation}',
    ...options
});

export const operationsList = <ThrowOnError extends boolean = false>(options?: Options<OperationsListData, ThrowOnError>): RequestResult<OperationsListResponses, OperationsListErrors, ThrowOnError> => (options?.client ?? client).get<OperationsListResponses, OperationsListErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/operations',
    ...options
});

export const operationsWait = <ThrowOnError extends boolean = false>(options: Options<OperationsWaitData, ThrowOnError>): RequestResult<OperationsWaitResponses, OperationsWaitErrors, ThrowOnError> => (options.client ?? client).post<OperationsWaitResponses, OperationsWaitErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/operations/{operation}:wait',
    ...options,
    headers: {
        'Content-Type': 'application/json',
        ...options.headers
    }
});

export const publishersDelete = <ThrowOnError extends boolean = false>(options: Options<PublishersDeleteData, ThrowOnError>): RequestResult<PublishersDeleteResponses, PublishersDeleteErrors, ThrowOnError> => (options.client ?? client).delete<PublishersDeleteResponses, PublishersDeleteErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/publishers/{publisher}',
    ...options
});

export const skillsGet = <ThrowOnError extends boolean = false>(options: Options<SkillsGetData, ThrowOnError>): RequestResult<SkillsGetResponses, SkillsGetErrors, ThrowOnError> => (options.client ?? client).get<SkillsGetResponses, SkillsGetErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/skills/{skill}',
    ...options
});

export const skillsList = <ThrowOnError extends boolean = false>(options?: Options<SkillsListData, ThrowOnError>): RequestResult<SkillsListResponses, SkillsListErrors, ThrowOnError> => (options?.client ?? client).get<SkillsListResponses, SkillsListErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/skills',
    ...options
});

export const statsGet = <ThrowOnError extends boolean = false>(options?: Options<StatsGetData, ThrowOnError>): RequestResult<StatsGetResponses, StatsGetErrors, ThrowOnError> => (options?.client ?? client).get<StatsGetResponses, StatsGetErrors, ThrowOnError>({
    security: [{ scheme: 'bearer', type: 'http' }],
    url: '/v1/stats',
    ...options
});
