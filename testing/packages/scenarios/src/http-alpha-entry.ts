import { afterAll, expect, test } from "bun:test";
import { ADMIN_SCOPES } from "@platform/test-framework";
import { bootHttpApi, recordHttpApi } from "./http-api-client.ts";

afterAll(recordHttpApi);
test("an enabled alpha capability returns its declared response through Caddy", async () => {
  const { call } = await bootHttpApi();
  await call("POST", "/v1/publishers/acme/books?bookId=a", ADMIN_SCOPES, { title: "Alpha book" });
  const suggested = await call("POST", "/v1alpha/publishers/acme/books:suggest", ADMIN_SCOPES, {});
  expect(suggested.body.books.map((book: Record<string, unknown>) => book.title)).toEqual([
    "Alpha book",
  ]);
});
