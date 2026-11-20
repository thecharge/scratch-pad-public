import type { OperationStore } from "@platform/aip";
import {
  applyUpdateMask,
  applyView,
  assertRequired,
  assertResourceId,
  atomically,
  batchGet,
  buildResourceName,
  checkEtag,
  comparatorFor,
  executeOrPreview,
  maskPathsOf,
  matchesFilter,
  paginate,
  parseFieldMask,
  parseFilter,
  parseOrderBy,
  requireResourceName,
  softDelete,
  transition,
  undelete,
  validateFieldMask,
} from "@platform/aip";
import { defineCapability, fieldBehaviors } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  BOOK_BASIC_FIELDS,
  BookCapabilityId,
  BookField,
  BookState,
  BooksOutputField,
  CanonicalCode,
  ConformanceCapabilityId,
  CustomVerb,
  DomainPattern,
  ErrorReason,
  FeatureFlag,
  FilterFieldKind,
  MessageId,
  MethodKind,
  REINDEX_RATE_LIMIT,
  REINDEX_RATE_WINDOW_MS,
  ResourceView,
  Separator,
  SOFT_DELETE_RETENTION_MS,
  Text,
} from "@platform/constants";
import { ApiError, toApiError } from "@platform/errors";
import { filterAsync } from "@platform/store";
import {
  type ApiDeps,
  type BatchBookItem,
  BatchBookItemSchema,
  BatchCreateBooksInputSchema,
  BatchGetBooksInputSchema,
  type Book,
  BookBatchSchema,
  BookCountSchema,
  BookListSchema,
  BookNameInputSchema,
  BookSchema,
  CreateBookInputSchema,
  DeleteBookInputSchema,
  type FilterFields,
  GetBookInputSchema,
  ListBooksInputSchema,
  OperationSchema,
  ParentInputSchema,
  type StringRecord,
  UpdateBookInputSchema,
} from "@platform/types";
import {
  ADMIN_POLICY,
  describe,
  emailMask,
  notFound,
  READ_POLICY,
  stamp,
  WRITE_POLICY,
} from "./support.ts";

const PUBLISHER = DomainPattern.Publisher;
const LIST_PATH = [BooksOutputField.Books, BookField.AuthorEmail].join(Separator.FieldPath);

async function loadBook(deps: ApiDeps, name: string): Promise<Book> {
  await requireResourceName(DomainPattern.Book, name);
  const book = await deps.books.find(name);
  if (book === undefined) {
    throw await notFound(name);
  }
  return book;
}

async function change(
  deps: ApiDeps,
  name: string,
  edit: (book: Book) => Book | Promise<Book>,
  etag?: string,
): Promise<Book> {
  const current = await loadBook(deps, name);
  const saved = await stamp(await edit(current), await deps.now());
  const expected = etag ? (current.etag ?? Text.Empty) : undefined;
  if (!(await deps.books.save(saved, expected))) {
    throw new ApiError(CanonicalCode.Aborted, ErrorReason.EtagMismatch, MessageId.EtagMismatch);
  }
  return saved;
}

async function filterFields(): Promise<FilterFields> {
  return new Map([
    [BookField.Title, { kind: FilterFieldKind.String }],
    [BookField.Author, { kind: FilterFieldKind.String }],
    [BookField.State, { kind: FilterFieldKind.Enum, values: Object.values(BookState) }],
    [BookField.CreateTime, { kind: FilterFieldKind.Timestamp }],
  ]);
}

async function bookNameFor(params: StringRecord, item: BatchBookItem): Promise<string> {
  const bookId = String(item.bookId);
  await assertResourceId(bookId);
  return buildResourceName(DomainPattern.Book, { ...params, book: bookId });
}

async function draftBook(deps: ApiDeps, name: string, item: BatchBookItem): Promise<Book> {
  const now = await deps.now();
  return await stamp(
    {
      name,
      title: String(item.title),
      state: BookState.Active,
      createTime: now.toISOString(),
      ...(item.author === undefined ? {} : { author: item.author }),
      ...(item.authorEmail === undefined ? {} : { authorEmail: item.authorEmail }),
    },
    now,
  );
}

async function insertBook(deps: ApiDeps, name: string, item: BatchBookItem): Promise<Book> {
  if ((await deps.books.find(name)) !== undefined) {
    throw new ApiError(
      CanonicalCode.AlreadyExists,
      ErrorReason.ResourceExists,
      MessageId.AlreadyExists,
      { name },
    );
  }
  const created = await draftBook(deps, name, item);
  await deps.books.insert(created);
  return created;
}

export async function getBook(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Get,
      MethodKind.Get,
      DomainPattern.Book,
      MessageId.SummaryGet,
    )),
    auth: AuthMode.Optional,
    input: GetBookInputSchema,
    output: BookSchema,
    mask: await emailMask(BookField.AuthorEmail),
    handler: async ({ name, view }) => {
      const book = await loadBook(deps, name);
      return view === ResourceView.Basic
        ? BookSchema.parse(await applyView(book, view, BOOK_BASIC_FIELDS))
        : book;
    },
  });
}

export async function listBooks(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.List,
      MethodKind.List,
      DomainPattern.Book,
      MessageId.SummaryList,
    )),
    auth: AuthMode.Required,
    input: ListBooksInputSchema,
    output: BookListSchema,
    policy: READ_POLICY,
    mask: await emailMask(LIST_PATH),
    handler: async (input) => {
      await requireResourceName(PUBLISHER, input.parent);
      const fields = await filterFields();
      const filter = await parseFilter(input.filter, fields);
      const order = await parseOrderBy(input.orderBy, new Set(fields.keys()));
      const stored = await deps.books.list(input.parent);
      const shown = stored.filter(
        (book) => input.showDeleted === true || book.deleteTime === undefined,
      );
      const matching = await filterAsync(
        shown,
        async (book) => filter === undefined || (await matchesFilter(filter, fields, book)),
      );
      const visible = matching.sort(comparatorFor(order));
      const query = [input.parent, input.filter, input.orderBy, input.showDeleted];
      const page = await paginate(
        visible,
        { pageSize: input.pageSize, pageToken: input.pageToken, query },
        deps.codec,
        deps.limits,
      );
      return { books: page.items, nextPageToken: page.nextPageToken };
    },
  });
}

export async function createBook(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Create,
      MethodKind.Create,
      DomainPattern.Book,
      MessageId.SummaryCreate,
    )),
    auth: AuthMode.Required,
    input: CreateBookInputSchema,
    output: BookSchema,
    policy: WRITE_POLICY,
    handler: async (input) => {
      await assertRequired(CreateBookInputSchema, input);
      const params = await requireResourceName(PUBLISHER, input.parent);
      const name = await bookNameFor(params, input);
      const build = async () => draftBook(deps, name, input);
      return deps.requests.run(BookCapabilityId.Create, input.requestId, async () =>
        executeOrPreview(input.validateOnly, build, () => insertBook(deps, name, input)),
      );
    },
  });
}

export async function batchCreateBooks(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      ConformanceCapabilityId.BooksBatchCreate,
      MethodKind.BatchCreate,
      DomainPattern.BookCollection,
      MessageId.SummaryBatchCreate,
    )),
    auth: AuthMode.Required,
    input: BatchCreateBooksInputSchema,
    output: BookBatchSchema,
    policy: WRITE_POLICY,
    mask: await emailMask(LIST_PATH),
    handler: async ({ parent, requests }) => {
      const params = await requireResourceName(PUBLISHER, parent);
      const books = await atomically(
        requests,
        async (item) => {
          await assertRequired(BatchBookItemSchema, item);
          return insertBook(deps, await bookNameFor(params, item), item);
        },
        (_item, book) => deps.books.remove(book.name),
      );
      return { books };
    },
  });
}

export async function updateBook(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Update,
      MethodKind.Update,
      DomainPattern.Book,
      MessageId.SummaryUpdate,
    )),
    auth: AuthMode.Required,
    input: UpdateBookInputSchema,
    output: BookSchema,
    policy: WRITE_POLICY,
    handler: async (input) => {
      const { name, updateMask, etag, ...patch } = input;
      const mask = await parseFieldMask(updateMask);
      await validateFieldMask(mask ?? [], await maskPathsOf(BookSchema));
      return change(
        deps,
        name,
        async (current) => {
          await checkEtag(etag, current.etag ?? Text.Empty);
          const rules = { behaviors: new Map(await fieldBehaviors(BookSchema)) };
          return BookSchema.parse(await applyUpdateMask(current, patch, mask, rules));
        },
        etag,
      );
    },
  });
}

export async function deleteBook(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Delete,
      MethodKind.Delete,
      DomainPattern.Book,
      MessageId.SummaryDelete,
    )),
    auth: AuthMode.Required,
    input: DeleteBookInputSchema,
    output: BookSchema,
    policy: WRITE_POLICY,
    handler: async ({ name, etag }) =>
      change(
        deps,
        name,
        async (book) => {
          await checkEtag(etag, book.etag ?? Text.Empty);
          return BookSchema.parse(
            await softDelete(book, await deps.now(), SOFT_DELETE_RETENTION_MS),
          );
        },
        etag,
      ),
  });
}

export async function archiveBook(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Archive,
      MethodKind.Custom,
      DomainPattern.Book,
      MessageId.SummaryArchive,
    )),
    customVerb: CustomVerb.Archive,
    auth: AuthMode.Required,
    input: BookNameInputSchema,
    output: BookSchema,
    policy: WRITE_POLICY,
    handler: async ({ name }) =>
      change(deps, name, async (book) => ({
        ...book,
        state: await transition(book.state, BookState.Archived, [BookState.Active]),
      })),
  });
}

export async function countBooks(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Count,
      MethodKind.Custom,
      DomainPattern.BookCollection,
      MessageId.SummaryCount,
      ApiVersion.V1Beta,
    )),
    customVerb: CustomVerb.Count,
    auth: AuthMode.Required,
    input: ParentInputSchema,
    output: BookCountSchema,
    policy: READ_POLICY,
    handler: async ({ parent }) => {
      await requireResourceName(PUBLISHER, parent);
      return { count: (await deps.books.list(parent)).length };
    },
  });
}

export async function suggestBook(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Suggest,
      MethodKind.Custom,
      DomainPattern.BookCollection,
      MessageId.SummarySuggest,
      ApiVersion.V1Alpha,
    )),
    customVerb: CustomVerb.Suggest,
    flag: FeatureFlag.BooksSuggest,
    auth: AuthMode.Required,
    input: ParentInputSchema,
    output: BookBatchSchema,
    policy: READ_POLICY,
    handler: async ({ parent }) => {
      await requireResourceName(PUBLISHER, parent);
      return { books: (await deps.books.list(parent)).slice(0, 1) };
    },
  });
}

export async function undeleteBook(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Undelete,
      MethodKind.Custom,
      DomainPattern.Book,
      MessageId.SummaryUndelete,
    )),
    customVerb: CustomVerb.Undelete,
    auth: AuthMode.Required,
    input: BookNameInputSchema,
    output: BookSchema,
    policy: WRITE_POLICY,
    handler: async ({ name }) =>
      change(deps, name, async (book) => BookSchema.parse(await undelete(book, name))),
  });
}

export async function batchGetBooks(deps: ApiDeps) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.BatchGet,
      MethodKind.BatchGet,
      DomainPattern.Book,
      MessageId.SummaryBatchGet,
    )),
    auth: AuthMode.Required,
    input: BatchGetBooksInputSchema,
    output: BookBatchSchema,
    policy: READ_POLICY,
    mask: await emailMask(LIST_PATH),
    handler: async ({ parent, names }) => {
      await requireResourceName(PUBLISHER, parent);
      return { books: await batchGet(names, (name) => deps.books.find(name)) };
    },
  });
}

async function runReindex(
  deps: ApiDeps,
  operations: OperationStore,
  name: string,
  parent: string,
  books: readonly Book[],
): Promise<void> {
  for (const index of books.keys()) {
    await Bun.sleep(deps.reindexStepMs);
    if (await operations.shouldStop(name)) {
      return;
    }
    await operations.progress(name, { parent, processed: index + 1, total: books.length });
  }
  await operations.complete(name, { count: books.length });
}

export async function reindexBooks(deps: ApiDeps, operations: OperationStore) {
  return defineCapability({
    ...(await describe(
      BookCapabilityId.Reindex,
      MethodKind.Custom,
      DomainPattern.BookCollection,
      MessageId.SummaryReindex,
    )),
    customVerb: CustomVerb.Reindex,
    auth: AuthMode.Required,
    input: ParentInputSchema,
    output: OperationSchema,
    policy: ADMIN_POLICY,
    rateLimit: { limit: REINDEX_RATE_LIMIT, windowMs: REINDEX_RATE_WINDOW_MS },
    handler: async ({ parent }) => {
      await requireResourceName(PUBLISHER, parent);
      const books = await deps.books.list(parent);
      const operation = await operations.start({ parent, processed: 0, total: books.length });
      void runReindex(deps, operations, operation.name, parent, books).catch(
        async (error: unknown) => operations.fail(operation.name, await toApiError(error)),
      );
      return operation;
    },
  });
}
