import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { BookState, CanonicalCode, ErrorReason } from "@platform/constants";
import {
  ADMIN_SCOPES,
  READER_SCOPES,
  thrownBy,
  tokenFor,
  WRITER_SCOPES,
} from "@platform/test-framework";
import type { Operation } from "@platform/types";
import { all } from "@platform/util";
import { zBooksGetResponse } from "../../../packages/sdk/generated/zod.gen.ts";
import {
  ApiClientError,
  booksArchive,
  booksBatchGet,
  booksCreate,
  booksDelete,
  booksGet,
  booksList,
  booksReindex,
  booksUndelete,
  booksUpdate,
  configGet,
  configUpdate,
  createSdkClient,
  followOperation,
  logsList,
  operationsCancel,
  operationsGet,
  paginate,
  statsGet,
  unwrap,
  waitForOperation,
} from "../../../packages/sdk/src/index.ts";
import {
  proxyBoot as boot,
  finishSdkIntegration,
  sdkBackendRefused,
  waitForSdkIntegration,
} from "./proxy-client.ts";

beforeAll(waitForSdkIntegration);
afterAll(finishSdkIntegration);

test("the edge client cannot reach the API directly", async () => {
  expect(await sdkBackendRefused()).toBe(true);
});

const PUBLISHER = "acme";
const path = (book: string) => ({ publisher: PUBLISHER, book });

async function seed(client: Awaited<ReturnType<typeof createSdkClient>>, ids: string[]) {
  await all(
    ids.map(
      (id) => async () =>
        unwrap(
          booksCreate({
            client,
            path: { publisher: PUBLISHER },
            query: { bookId: id },
            body: { title: id.toUpperCase() },
          }),
        ),
    ),
  );
}

describe("books through the generated SDK", () => {
  test("a book moves through its whole life with typed calls", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    const created = await unwrap(
      booksCreate({
        client,
        path: { publisher: PUBLISHER },
        query: { bookId: "dune" },
        body: { title: "Dune", author: "Frank Herbert" },
      }),
    );
    const updated = await unwrap(
      booksUpdate({
        client,
        path: path("dune"),
        query: { updateMask: "title" },
        body: { title: "Dune Messiah" },
      }),
    );
    const archived = await unwrap(booksArchive({ client, path: path("dune") }));
    const deleted = await unwrap(booksDelete({ client, path: path("dune") }));
    const restored = await unwrap(booksUndelete({ client, path: path("dune") }));
    expect([
      created.state,
      updated.title,
      archived.state,
      deleted.deleteTime !== undefined,
      restored.deleteTime,
    ]).toEqual([BookState.Active, "Dune Messiah", BookState.Archived, true, undefined]);
  });

  test("a response validates against the schema generated from the same document", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    await seed(client, ["dune"]);
    const book = await unwrap(booksGet({ client, path: path("dune") }));
    expect(zBooksGetResponse.safeParse(book).success).toBe(true);
  });

  test("batch get and list agree", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    await seed(client, ["dune", "emma"]);
    const batch = await unwrap(
      booksBatchGet({
        client,
        path: { publisher: PUBLISHER },
        query: { names: ["publishers/acme/books/dune", "publishers/acme/books/emma"] },
      }),
    );
    const listed = await unwrap(
      booksList({ client, path: { publisher: PUBLISHER }, query: { orderBy: "title desc" } }),
    );
    expect([batch.books.length, listed.books.map((book) => book.title)]).toEqual([
      2,
      ["EMMA", "DUNE"],
    ]);
  });

  test("paginate follows page tokens until the collection ends", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    await seed(client, ["a", "b", "c"]);
    const titles = await Array.fromAsync(
      paginate(async (pageToken) => {
        const token = pageToken === undefined ? {} : { pageToken };
        const query = { pageSize: 1, orderBy: "title", ...token };
        const page = await unwrap(booksList({ client, path: { publisher: PUBLISHER }, query }));
        return { items: page.books, nextPageToken: page.nextPageToken };
      }),
    );
    expect(titles.map((book) => book.title)).toEqual(["A", "B", "C"]);
  });

  test("a long-running reindex is awaited to completion", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    await seed(client, ["dune"]);
    const started = await unwrap(booksReindex({ client, path: { publisher: PUBLISHER } }));
    const operation = started.name.split("/").at(-1) ?? "";
    const finished = await waitForOperation(
      () => unwrap(operationsGet({ client, path: { operation } })) as Promise<Operation>,
    );
    expect(finished).toMatchObject({ done: true, response: { count: 1 } });
  });
});

describe("an operation followed as a stream", () => {
  test("the SDK yields each state until the operation is done", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    await seed(client, ["dune", "emma"]);
    const started = await unwrap(booksReindex({ client, path: { publisher: PUBLISHER } }));
    const states = await Array.fromAsync(followOperation(client, started.name));
    expect([states.at(-1)?.done, states.at(-1)?.response, states.length > 1]).toEqual([
      true,
      { count: 2 },
      true,
    ]);
  });

  test("the SDK raises the typed error of an operation that was cancelled", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    await seed(client, ["dune", "emma", "kim"]);
    const started = await unwrap(booksReindex({ client, path: { publisher: PUBLISHER } }));
    const operation = started.name.split("/").at(-1) ?? "";
    await unwrap(operationsCancel({ client, path: { operation } }));
    const failure = await thrownBy(async () =>
      Array.fromAsync(followOperation(client, started.name)),
    );
    expect(failure).toMatchObject({
      name: "ApiClientError",
      status: CanonicalCode.Cancelled,
      reason: ErrorReason.OperationCancelled,
    });
  });

  test("the SDK raises the typed error of an operation that does not exist", async () => {
    const { as } = await boot();
    const client = await as(ADMIN_SCOPES);
    const failure = await thrownBy(async () =>
      Array.fromAsync(followOperation(client, "operations/nothing")),
    );
    expect(failure).toMatchObject({
      status: CanonicalCode.NotFound,
      reason: ErrorReason.OperationNotFound,
    });
  });
});

describe("configuration and administration", () => {
  test("the configuration reads without a token and updates with the admin scope", async () => {
    const { as } = await boot();
    const admin = await as(ADMIN_SCOPES);
    const anonymous = await as([]);
    await unwrap(configUpdate({ client: admin, body: { bannerText: "Back soon" } }));
    expect((await unwrap(configGet({ client: anonymous }))).bannerText).toBe("Back soon");
  });

  test("administrators read statistics and events, readers cannot", async () => {
    const { as } = await boot();
    const admin = await as(ADMIN_SCOPES);
    const reader = await as(READER_SCOPES);
    await unwrap(configGet({ client: admin }));
    const denied = await thrownBy(() => unwrap(statsGet({ client: reader })));
    const events = await unwrap(logsList({ client: admin, query: { pageSize: 5 } }));
    expect([
      (await unwrap(statsGet({ client: admin }))).total > 0,
      events.events.length > 0,
      denied,
    ]).toEqual([true, true, expect.objectContaining({ status: CanonicalCode.PermissionDenied })]);
  });
});

describe("errors map to AIP-193 reasons", () => {
  test.each([
    [
      "a missing book is NOT_FOUND",
      READER_SCOPES,
      CanonicalCode.NotFound,
      ErrorReason.ResourceNotFound,
    ],
    [
      "a reader cannot create",
      READER_SCOPES,
      CanonicalCode.PermissionDenied,
      ErrorReason.PolicyDenied,
    ],
    [
      "no token on a required call",
      [] as string[],
      CanonicalCode.Unauthenticated,
      ErrorReason.TokenMissing,
    ],
  ])("%s", async (name, scopes, status, reason) => {
    const { as } = await boot();
    const client = await as(scopes);
    const call = name.includes("create")
      ? () =>
          unwrap(
            booksCreate({
              client,
              path: { publisher: PUBLISHER },
              query: { bookId: "x" },
              body: { title: "X" },
            }),
          )
      : name.includes("missing")
        ? () => unwrap(booksGet({ client, path: path("nothing") }))
        : () => unwrap(booksList({ client, path: { publisher: PUBLISHER } }));
    expect(await thrownBy(call)).toMatchObject({ status, reason });
  });

  test("creating twice is ALREADY_EXISTS", async () => {
    const { as } = await boot();
    const client = await as(WRITER_SCOPES);
    await seed(client, ["dune"]);
    const again = await thrownBy(() => seed(client, ["dune"]));
    expect(again).toMatchObject({ status: CanonicalCode.AlreadyExists });
  });

  test("archiving twice is a failed precondition", async () => {
    const { as } = await boot();
    const client = await as(WRITER_SCOPES);
    await seed(client, ["dune"]);
    await unwrap(booksArchive({ client, path: path("dune") }));
    expect(
      await thrownBy(() => unwrap(booksArchive({ client, path: path("dune") }))),
    ).toMatchObject({
      status: CanonicalCode.FailedPrecondition,
      reason: ErrorReason.InvalidTransition,
    });
  });

  test("a stale etag is ABORTED", async () => {
    const { as } = await boot();
    const client = await as(WRITER_SCOPES);
    await seed(client, ["dune"]);
    const failure = await thrownBy(() =>
      unwrap(booksUpdate({ client, path: path("dune"), body: { title: "New", etag: '"stale"' } })),
    );
    expect(failure).toMatchObject({
      status: CanonicalCode.Aborted,
      reason: ErrorReason.EtagMismatch,
    });
  });

  test("a bad field mask is INVALID_ARGUMENT", async () => {
    const { as } = await boot();
    const client = await as(WRITER_SCOPES);
    await seed(client, ["dune"]);
    const failure = await thrownBy(() =>
      unwrap(
        booksUpdate({
          client,
          path: path("dune"),
          query: { updateMask: "nonsense" },
          body: { title: "x" },
        }),
      ),
    );
    expect(failure).toMatchObject({ status: CanonicalCode.InvalidArgument });
  });

  test("with authentication off a required call is AUTH_NOT_ENABLED", async () => {
    const { as } = await boot(false);
    const client = await as([]);
    expect(
      await thrownBy(() => unwrap(booksList({ client, path: { publisher: PUBLISHER } }))),
    ).toMatchObject({
      reason: ErrorReason.AuthNotEnabled,
    });
  });

  test("an error is an ApiClientError carrying the HTTP status", async () => {
    const { as } = await boot();
    const failure = await thrownBy(async () =>
      unwrap(booksGet({ client: await as(READER_SCOPES), path: path("none") })),
    );
    expect([failure instanceof ApiClientError, (failure as ApiClientError).httpStatus]).toEqual([
      true,
      404,
    ]);
  });
});

describe("helpers", () => {
  test("waiting for an operation that never finishes reports a deadline", async () => {
    const pending = { name: "operations/op-1", done: false };
    const failure = await thrownBy(() =>
      waitForOperation(async () => pending, { intervalMs: 1, timeoutMs: 5 }),
    );
    expect(failure).toMatchObject({ status: CanonicalCode.DeadlineExceeded });
  });

  test("a token supplied as a function is read on every call", async () => {
    const { issuer, origin } = await boot();
    const reads = { count: 0 };
    const token = await tokenFor(issuer, READER_SCOPES);
    const read = () => {
      reads.count += 1;
      return token;
    };
    const client = await createSdkClient({ origin, token: read });
    await unwrap(booksList({ client, path: { publisher: PUBLISHER } }));
    await unwrap(booksList({ client, path: { publisher: PUBLISHER } }));
    expect(reads.count).toBe(2);
  });
});
