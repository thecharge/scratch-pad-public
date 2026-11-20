import { afterAll, expect, test } from "bun:test";
import { createHash } from "node:crypto";
import { CheckKind, StepFlag, StepSource } from "@platform/constants";
import {
  ApiClientError,
  booksBatchCreate,
  booksCreate,
  booksGet,
  booksList,
  booksReindex,
  CanonicalCode,
  createSdkClient,
  downloadAsset,
  ErrorReason,
  followOperation,
  operationsCancel,
  paginate,
  unwrap,
  uploadAsset,
} from "@platform/sdk";
import type { StepResult } from "@platform/types";
import { httpWire } from "./http-wire.ts";

const exchanges: StepResult[] = [];
let sequence = 0;
afterAll(async () => console.log(JSON.stringify(exchanges)));

async function transport(input: RequestInfo | URL, init?: RequestInit) {
  const request = new Request(input, init);
  const body = request.body === null ? undefined : await request.text();
  const headers = Object.fromEntries(request.headers);
  if (body === undefined && ["POST", "PUT", "PATCH"].includes(request.method))
    headers["content-length"] = "0";
  expect(headers.accept).toBeDefined();
  if (body !== undefined) expect(headers["content-type"]).toBeDefined();
  const { response, chunks, httpVersion } = await httpWire(
    request.url,
    request.method,
    headers,
    body,
    body !== undefined,
  );
  expect(httpVersion).toBe(Bun.env.TEST_HTTP_VERSION ?? "");
  const target = new URL(request.url);
  const path = target.pathname + target.search;
  const observed = { httpVersion, responseHeaders: Object.fromEntries(response.headers), chunks };
  const recordedHeaders = {
    ...headers,
    ...(headers.authorization === undefined ? {} : { authorization: "Bearer <YOUR_ACCESS_TOKEN>" }),
  };
  exchanges.push({
    source: StepSource.Sdk,
    description: `SDK ${request.method} ${path}`,
    flag: StepFlag.Passed,
    place: request.url,
    action: "Send the installed SDK request and check its typed result or error.",
    expectation: `HTTP ${response.status} over HTTP ${httpVersion}.`,
    checks: [
      {
        kind: CheckKind.Outcome,
        label: `The installed SDK negotiated HTTP ${httpVersion} with certificate verification enabled.`,
        passed: true,
      },
    ],
    evidence: {
      method: request.method,
      path,
      headers: recordedHeaders,
      authorized: headers.authorization !== undefined,
      requestBody: body,
      request: `Installed SDK ${request.method} ${path}`,
      response: chunks.join(""),
      outcome: `HTTP ${response.status}`,
      note: `Observed headers and response chunks:\n\n\`\`\`json\n${JSON.stringify(observed, null, 2)}\n\`\`\`\n\n`,
    },
  });
  return response;
}

async function session() {
  sequence += 1;
  const client = await createSdkClient({
    origin: Bun.env.TEST_HTTP_ORIGIN ?? "",
    token: Bun.env.TEST_HTTP_ADMIN ?? "",
  });
  client.setConfig({ fetch: transport as typeof fetch });
  return {
    client,
    publisher: `sdk-${Bun.env.TEST_HTTP_VERSION ?? ""}-${sequence}`.replaceAll(".", "-"),
  };
}

test("the installed SDK validates a single response and sends its required headers", async () => {
  const { client, publisher } = await session();
  await unwrap(
    booksCreate({
      client,
      path: { publisher },
      query: { bookId: "a" },
      body: { title: "SDK book" },
    }),
  );
  const book = await unwrap(booksGet({ client, path: { publisher, book: "a" } }));
  expect([typeof book.name, book.title, book.state]).toEqual(["string", "SDK book", "ACTIVE"]);
});

test("the installed SDK iterates complete pages until the final empty token", async () => {
  const { client, publisher } = await session();
  const requests = [
    { bookId: "a", title: "A" },
    { bookId: "b", title: "B" },
  ];
  await unwrap(
    booksBatchCreate({
      client,
      path: { publisher },
      body: { requests },
    }),
  );
  const books = await Array.fromAsync(
    paginate(async (pageToken) => {
      const query = {
        pageSize: 1,
        orderBy: "title",
        ...(pageToken === undefined ? {} : { pageToken }),
      };
      const page = await unwrap(
        booksList({
          client,
          path: { publisher },
          query,
        }),
      );
      return { items: page.books, nextPageToken: page.nextPageToken };
    }),
  );
  expect(books.map((book) => book.title)).toEqual(["A", "B"]);
});

test("the installed SDK yields operation events through the completed state", async () => {
  const { client, publisher } = await session();
  await unwrap(
    booksCreate({ client, path: { publisher }, query: { bookId: "a" }, body: { title: "A" } }),
  );
  const started = await unwrap(booksReindex({ client, path: { publisher } }));
  const states = await Array.fromAsync(followOperation(client, started.name));
  expect(states.length).toBeGreaterThan(1);
  expect(states.at(-1)).toMatchObject({ done: true, response: { count: 1 } });
});

test("the installed SDK retains a cancellation as a typed operation error", async () => {
  const { client, publisher } = await session();
  await unwrap(
    booksCreate({ client, path: { publisher }, query: { bookId: "a" }, body: { title: "A" } }),
  );
  const started = await unwrap(booksReindex({ client, path: { publisher } }));
  await unwrap(
    operationsCancel({ client, path: { operation: started.name.split("/").at(-1) ?? "" } }),
  );
  const failure = await Array.fromAsync(followOperation(client, started.name)).catch(
    (error: unknown) => error,
  );
  expect(failure).toBeInstanceOf(ApiClientError);
  expect(failure).toMatchObject({
    status: CanonicalCode.Cancelled,
    reason: ErrorReason.OperationCancelled,
  });
});

test("the installed SDK exposes a missing resource as its typed HTTP error", async () => {
  const { client, publisher } = await session();
  const failure = await unwrap(booksGet({ client, path: { publisher, book: "missing" } })).catch(
    (error: unknown) => error,
  );
  expect(failure).toBeInstanceOf(ApiClientError);
  expect(failure).toMatchObject({
    httpStatus: 404,
    status: CanonicalCode.NotFound,
    reason: ErrorReason.ResourceNotFound,
  });
});

test("the installed SDK sends incremental NDJSON input without JSON serialization", async () => {
  const { client, publisher } = await session();
  const body = new Blob(['{"bookId":"a","title":"A"}\n{"bookId":"b","title":"B"}\n']).stream();
  const response = await client.post({
    url: `/v1/publishers/${publisher}/books:batchCreate`,
    body,
    bodySerializer: null,
    headers: { "content-type": "application/x-ndjson" },
    security: [{ scheme: "bearer", type: "http" }],
  });
  expect(response.response?.status).toBe(200);
  const books = await unwrap(booksList({ client, path: { publisher } }));
  expect(books.books.map((book) => book.title)).toEqual(["A", "B"]);
});

test("the SDK entry resolves from the installed package", () => {
  expect(import.meta.resolve("@platform/sdk")).toContain("/node_modules/@platform/sdk/dist/");
});

test("the installed SDK uploads and downloads a binary stream with its checksum intact", async () => {
  const { client } = await session();
  const content = "SDK streamed asset\n";
  const checksum = createHash("sha256").update(content).digest("hex");
  const asset = await uploadAsset(client, new Blob([content]).stream(), {
    mediaType: "application/octet-stream",
    checksum,
  });
  const downloaded = await downloadAsset(client, asset.name.slice("assets/".length));
  expect(await new Response(downloaded).text()).toBe(content);
  expect(asset.sha256).toBe(checksum);
});
