import { expect, test } from "bun:test";
import { CanonicalCode, ErrorReason, MethodKind } from "@platform/constants";
import type { ApiError } from "@platform/errors";
import { sampleBook, synchronizedBookReads } from "@platform/test-scenarios";
import { BookSchema } from "@platform/types";
import { all } from "@platform/util";
import { deleteBook, updateBook } from "../../../apps/api/src/capabilities/books.ts";
import { createDeps } from "../../../apps/api/src/deps.ts";
import { IDLE_OBSERVABILITY } from "../../../apps/api/src/idle.ts";

test.each([MethodKind.Update, MethodKind.Delete])(
  "SQLite permits only one concurrent %s with the same ETag",
  async (method) => {
    const deps = await synchronizedBookReads(await createDeps(IDLE_OBSERVABILITY));
    const original = sampleBook("concurrent");
    await deps.books.insert(original);
    const capability = await (method === MethodKind.Update ? updateBook(deps) : deleteBook(deps));
    const outcomes = await all(
      ["first", "second"].map(
        (title) => async () =>
          Promise.resolve(
            capability.handler(
              { name: original.name, title, updateMask: "title", etag: original.etag },
              {} as never,
            ),
          ).then(
            (book) => ({ book: BookSchema.parse(book), code: undefined, reason: undefined }),
            (error: ApiError) => ({ book: undefined, code: error.code, reason: error.reason }),
          ),
      ),
    );
    const winners = outcomes.filter((outcome) => outcome.book !== undefined);
    const losers = outcomes.filter((outcome) => outcome.book === undefined);
    expect([winners.length, losers.length, losers[0]?.code, losers[0]?.reason]).toEqual([
      1,
      1,
      CanonicalCode.Aborted,
      ErrorReason.EtagMismatch,
    ]);
    expect(await deps.books.find(original.name)).toEqual(winners[0]?.book);
  },
);

test.each(["stale", "missing"])(
  "SQLite refuses an atomic save against a %s version without writing",
  async (kind) => {
    const deps = await createDeps(IDLE_OBSERVABILITY);
    const original = sampleBook("conditional");
    await deps.books.insert(original);
    await deps.books.remove(kind === "missing" ? original.name : "absent");
    const changed = await deps.books.save({ ...original, title: "Overwrite" }, '"stale"');
    expect(changed).toBe(false);
    expect((await deps.books.find(original.name))?.title).toBe(
      kind === "missing" ? undefined : original.title,
    );
  },
);
