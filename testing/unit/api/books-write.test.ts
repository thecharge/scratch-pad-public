import { expect } from "bun:test";
import { BookState, CanonicalCode, ErrorReason } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import {
  bookName,
  fakeDeps,
  OTHER_PUBLISHER_NAME,
  PUBLISHER_NAME,
  sampleBook,
} from "@platform/test-scenarios";
import {
  archiveBook,
  batchCreateBooks,
  createBook,
  deleteBook,
  undeleteBook,
  updateBook,
} from "../../../apps/api/src/capabilities/books.ts";
import { deletePublisher } from "../../../apps/api/src/capabilities/publishers.ts";

const run = (input: unknown) => ["handler", input, {}];
const REQUEST_ID = "6f1c1f0e-7c1c-4c1e-9d3a-0a4f0e0c2b11";
const DELETED_AT = "2026-01-02T03:04:05.000Z";
const INVALID_NAME = {
  code: CanonicalCode.InvalidArgument,
  reason: ErrorReason.InvalidResourceName,
};
const NOT_FOUND = { code: CanonicalCode.NotFound, reason: ErrorReason.ResourceNotFound };
const EXISTS = { code: CanonicalCode.AlreadyExists, reason: ErrorReason.ResourceExists };
const MISMATCH = { code: CanonicalCode.Aborted, reason: ErrorReason.EtagMismatch };
const TRANSITION = {
  code: CanonicalCode.FailedPrecondition,
  reason: ErrorReason.InvalidTransition,
};

const ARCHIVED_SUMMARY = { title: "Title b1", state: BookState.Archived };
const stored = (deps: Awaited<ReturnType<typeof fakeDeps>>, name: string) => async () =>
  deps.books.find(name);
const summary = (deps: Awaited<ReturnType<typeof fakeDeps>>, name: string) => async () => {
  const book = await deps.books.find(name);
  return book === undefined ? undefined : { title: book.title, state: book.state };
};

const creator = await fakeDeps();
const previewer = await fakeDeps();
const idempotent = await fakeDeps();
const taken = await fakeDeps([sampleBook("b1")]);
const emptyCreator = await fakeDeps();
const badParent = await fakeDeps();

unit(createBook, {
  positive: [
    positive(
      "a new book is returned active with its name, title and etag",
      [creator],
      expect.objectContaining({
        name: bookName("n1"),
        title: "Dune",
        state: BookState.Active,
        etag: expect.stringMatching(/^"/),
      }),
      run({ parent: PUBLISHER_NAME, bookId: "n1", title: "Dune" }),
    ),
    positive(
      "a validate-only call previews the book without storing it",
      [previewer],
      seen(stored(previewer, bookName("n2")), undefined),
      run({ parent: PUBLISHER_NAME, bookId: "n2", title: "Preview", validateOnly: true }),
    ),
    positive(
      "the same request id creates the book only once",
      [idempotent],
      seen(async () => (await idempotent.books.list(PUBLISHER_NAME)).length, 1),
      run({ parent: PUBLISHER_NAME, bookId: "n3", title: "Once", requestId: REQUEST_ID }),
    ),
  ],
  negative: [
    negative(
      "a book id that is taken is refused",
      [taken],
      EXISTS,
      run({ parent: PUBLISHER_NAME, bookId: "b1", title: "Again" }),
    ),
    negative(
      "a missing title is refused",
      [emptyCreator],
      { code: CanonicalCode.InvalidArgument },
      run({ parent: PUBLISHER_NAME, bookId: "n4" }),
    ),
    negative(
      "a parent that is not a publisher name is invalid",
      [badParent],
      INVALID_NAME,
      run({ parent: "x", bookId: "n5", title: "T" }),
    ),
  ],
});

const batcher = await fakeDeps();
const batchTaken = await fakeDeps([sampleBook("b1")]);
const batchBad = await fakeDeps();

const batch = (...requests: object[]) => run({ parent: PUBLISHER_NAME, requests });
const item = (bookId: string, title?: string) => ({
  bookId,
  ...(title === undefined ? {} : { title }),
});
const created = (...entries: [string, string][]) => ({
  books: entries.map(([id, title]) => expect.objectContaining({ name: bookName(id), title })),
});
const INVALID_ARGUMENT = { code: CanonicalCode.InvalidArgument };
const EMPTY_BATCH = { ...INVALID_ARGUMENT, reason: ErrorReason.ValidationFailed };

unit(batchCreateBooks, {
  positive: [
    positive(
      "every requested book is created and returned in order",
      [batcher],
      created(["c1", "One"], ["c2", "Two"]),
      batch(item("c1", "One"), item("c2", "Two")),
    ),
    positive(
      "a single request creates one book",
      [await fakeDeps()],
      created(["c9", "Solo"]),
      batch(item("c9", "Solo")),
    ),
  ],
  negative: [
    negative(
      "one taken id fails the batch",
      [batchTaken],
      EXISTS,
      batch(item("c3", "Three"), item("b1", "Taken")),
    ),
    negative(
      "an item without a title fails the batch",
      [batchBad],
      INVALID_ARGUMENT,
      batch(item("c4")),
    ),
    negative("an empty batch is refused", [await fakeDeps()], EMPTY_BATCH, batch()),
    negative(
      "a parent that is not a publisher name is invalid",
      [await fakeDeps()],
      INVALID_NAME,
      run({ parent: "x", requests: [] }),
    ),
  ],
});

const rollback = await fakeDeps([sampleBook("b1")]);

unit(updateBook, {
  positive: [
    positive(
      "the masked title is changed and the book is stamped again",
      [await fakeDeps([sampleBook("b1")])],
      expect.objectContaining({ name: bookName("b1"), title: "New", updateTime: DELETED_AT }),
      run({ name: bookName("b1"), title: "New", updateMask: "title" }),
    ),
    positive(
      "a matching etag allows the change",
      [await fakeDeps([sampleBook("b1")])],
      expect.objectContaining({ author: "Ann" }),
      run({ name: bookName("b1"), author: "Ann", updateMask: "author", etag: '"etag-b1"' }),
    ),
    positive(
      "the stored copy is the returned copy",
      [rollback],
      seen(summary(rollback, bookName("b1")), { title: "Stored", state: BookState.Active }),
      run({ name: bookName("b1"), title: "Stored", updateMask: "title" }),
    ),
  ],
  negative: [
    negative(
      "a stale etag is aborted",
      [await fakeDeps([sampleBook("b1")])],
      MISMATCH,
      run({ name: bookName("b1"), title: "X", updateMask: "title", etag: '"old"' }),
    ),
    negative(
      "a book that does not exist is not found",
      [await fakeDeps()],
      NOT_FOUND,
      run({ name: bookName("none"), title: "X", updateMask: "title" }),
    ),
    negative(
      "a mask path that is not a field is refused",
      [await fakeDeps([sampleBook("b1")])],
      { code: CanonicalCode.InvalidArgument },
      run({ name: bookName("b1"), title: "X", updateMask: "nonsense" }),
    ),
  ],
});

const remover = await fakeDeps([sampleBook("b1")]);

unit(deleteBook, {
  positive: [
    positive(
      "a book is soft deleted with a purge time",
      [await fakeDeps([sampleBook("b1")])],
      expect.objectContaining({
        deleteTime: DELETED_AT,
        purgeTime: expect.stringMatching(/^20/),
      }),
      run({ name: bookName("b1") }),
    ),
    positive(
      "the soft deleted book stays stored",
      [remover],
      seen(async () => (await remover.books.find(bookName("b1")))?.deleteTime, DELETED_AT),
      run({ name: bookName("b1") }),
    ),
  ],
  negative: [
    negative(
      "a stale etag is aborted",
      [await fakeDeps([sampleBook("b1")])],
      MISMATCH,
      run({ name: bookName("b1"), etag: '"old"' }),
    ),
    negative(
      "a book that does not exist is not found",
      [await fakeDeps()],
      NOT_FOUND,
      run({ name: bookName("none") }),
    ),
  ],
});

const archiver = await fakeDeps([
  sampleBook("b1"),
  sampleBook("b2", { state: BookState.Archived }),
]);
const archiveChecked = await fakeDeps([sampleBook("b1")]);

unit(archiveBook, {
  positive: [
    positive(
      "an active book becomes archived",
      [archiver],
      expect.objectContaining({ name: bookName("b1"), state: BookState.Archived }),
      run({ name: bookName("b1") }),
    ),
    positive(
      "the archived state is stored",
      [archiveChecked],
      seen(summary(archiveChecked, bookName("b1")), ARCHIVED_SUMMARY),
      run({ name: bookName("b1") }),
    ),
  ],
  negative: [
    negative(
      "an archived book cannot be archived again",
      [archiver],
      TRANSITION,
      run({ name: bookName("b2") }),
    ),
    negative(
      "a book that does not exist is not found",
      [await fakeDeps()],
      NOT_FOUND,
      run({ name: bookName("none") }),
    ),
  ],
});

unit(undeleteBook, {
  positive: [
    positive(
      "a deleted book comes back without delete and purge times",
      [await fakeDeps([sampleBook("b1", { deleteTime: DELETED_AT, purgeTime: DELETED_AT })])],
      expect.not.objectContaining({ deleteTime: expect.anything() }),
      run({ name: bookName("b1") }),
    ),
    positive(
      "the restored book keeps its title",
      [await fakeDeps([sampleBook("b1", { deleteTime: DELETED_AT })])],
      expect.objectContaining({ name: bookName("b1"), title: "Title b1" }),
      run({ name: bookName("b1") }),
    ),
  ],
  negative: [
    negative(
      "a book that is not deleted cannot be restored",
      [await fakeDeps([sampleBook("b1")])],
      EXISTS,
      run({ name: bookName("b1") }),
    ),
    negative(
      "a book that does not exist is not found",
      [await fakeDeps()],
      NOT_FOUND,
      run({ name: bookName("none") }),
    ),
  ],
});

const PRECONDITION = {
  code: CanonicalCode.FailedPrecondition,
  reason: ErrorReason.HasChildren,
};
const forced = await fakeDeps([sampleBook("b1")]);
const purger = await fakeDeps([sampleBook("b1"), sampleBook("b2")]);

unit(deletePublisher, {
  positive: [
    positive(
      "a forced delete soft deletes every live book",
      [purger],
      { name: PUBLISHER_NAME, deletedBooks: 2 },
      run({ name: PUBLISHER_NAME, force: true }),
    ),
    positive(
      "the books of the publisher are marked deleted",
      [forced],
      seen(async () => (await forced.books.find(bookName("b1")))?.deleteTime, DELETED_AT),
      run({ name: PUBLISHER_NAME, force: true }),
    ),
  ],
  negative: [
    negative(
      "live books block a delete without force",
      [await fakeDeps([sampleBook("b1")])],
      PRECONDITION,
      run({ name: PUBLISHER_NAME }),
    ),
    negative(
      "a publisher without live books is not found",
      [await fakeDeps([sampleBook("b9", {}, OTHER_PUBLISHER_NAME)])],
      NOT_FOUND,
      run({ name: PUBLISHER_NAME, force: true }),
    ),
    negative(
      "a name that is not a publisher name is invalid",
      [await fakeDeps()],
      INVALID_NAME,
      run({ name: "x", force: true }),
    ),
  ],
});
