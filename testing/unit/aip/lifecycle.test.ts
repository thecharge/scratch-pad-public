import { describe, expect, test } from "bun:test";
import {
  assertBatchSize,
  atomically,
  batchGet,
  checkEtag,
  computeEtag,
  executeOrPreview,
  isDeleted,
  OperationStore,
  operationCapability,
  RequestIdStore,
  softDelete,
  transition,
  undelete,
} from "@platform/aip";
import {
  AuthMode,
  CanonicalCode,
  ErrorReason,
  MessageId,
  TransportKind,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { createPipeline } from "@platform/pipeline";
import { thrownBy } from "@platform/test-framework";
import { ANONYMOUS_PRINCIPAL } from "@platform/types";
import { all } from "@platform/util";

const CONTEXT = {
  principal: ANONYMOUS_PRINCIPAL,
  requestId: "r",
  transport: TransportKind.Http,
  authEnabled: false,
};
const NOW = new Date("2024-01-01T00:00:00.000Z");
const WEEK_MS = 7 * 24 * 3600 * 1000;

describe("etag (AIP-154)", () => {
  test("etags are quoted and follow the content", async () => {
    const etag = await computeEtag({ title: "a" });
    expect(
      [etag, await computeEtag({ title: "a" }), await computeEtag({ title: "b" })].map(
        (value) => value === etag,
      ),
    ).toEqual([true, true, false]);
    expect(etag).toMatch(/^"[0-9a-f]{16}"$/);
  });

  test.each([
    ["no precondition", undefined, undefined],
    ["a matching etag", "same", undefined],
    ["a weak etag with the same value", "W/same", undefined],
  ])("%s passes", async (_name, provided, expected) => {
    expect(
      await checkEtag(provided === undefined ? undefined : provided.replace("same", '"v"'), '"v"'),
    ).toBe(expected);
  });

  test("a stale etag is ABORTED (409)", async () => {
    expect(await thrownBy(async () => checkEtag('"stale"', '"v"'))).toMatchObject({
      code: CanonicalCode.Aborted,
      httpStatus: 409,
    });
  });
});

describe("requestId idempotency (AIP-155)", () => {
  test("a repeated requestId replays the first response", async () => {
    const store = new RequestIdStore({ ttlMs: 1000 });
    let runs = 0;
    const create = () => store.run("books.create", "id-1", async () => ++runs);
    expect([await create(), await create(), runs]).toEqual([1, 1, 1]);
  });

  test("concurrent duplicates share one execution", async () => {
    const store = new RequestIdStore({ ttlMs: 1000 });
    let runs = 0;
    const slow = async () => {
      runs += 1;
      await Bun.sleep(5);
      return runs;
    };
    expect(
      await all([
        async () => store.run("s", "same", slow),
        async () => store.run("s", "same", slow),
      ]),
    ).toEqual([1, 1]);
  });

  test("scopes are independent and a missing id never replays", async () => {
    const store = new RequestIdStore({ ttlMs: 1000 });
    let runs = 0;
    await store.run("a", "x", async () => ++runs);
    await store.run("b", "x", async () => ++runs);
    await store.run("a", undefined, async () => ++runs);
    await store.run("a", undefined, async () => ++runs);
    expect(runs).toBe(4);
  });

  test("a failure is not remembered and an entry expires", async () => {
    let now = 0;
    const store = new RequestIdStore({ ttlMs: 100, now: () => now });
    let runs = 0;
    await thrownBy(() => store.run("s", "f", async () => Promise.reject(new Error("boom"))));
    await store.run("s", "f", async () => ++runs);
    now = 500;
    await store.run("s", "f", async () => ++runs);
    expect(runs).toBe(2);
  });
});

describe("validateOnly (AIP-163)", () => {
  test.each([
    [true, "preview", false],
    [false, "live", true],
    [undefined, "live", true],
  ])("validateOnly=%p returns %s and executes: %p", async (validateOnly, expected, executes) => {
    let executed = false;
    const result = await executeOrPreview(
      validateOnly,
      () => "preview",
      async () => {
        executed = true;
        return "live";
      },
    );
    expect([result, executed]).toEqual([expected, executes]);
  });
});

describe("soft delete (AIP-164)", async () => {
  const deleted = await softDelete({ name: "b", title: "T" }, NOW, WEEK_MS);

  test("sets deleteTime and purgeTime and keeps the resource", async () => {
    expect(deleted).toMatchObject({
      deleteTime: "2024-01-01T00:00:00.000Z",
      purgeTime: "2024-01-08T00:00:00.000Z",
      title: "T",
    });
    expect(await isDeleted(deleted)).toBe(true);
  });

  test("undelete restores the resource", async () => {
    expect(await undelete(deleted, "b")).toEqual({ name: "b", title: "T" });
  });

  test("undeleting a live resource is ALREADY_EXISTS (409)", async () => {
    expect(await thrownBy(async () => undelete({ name: "b" }, "b"))).toMatchObject({
      code: CanonicalCode.AlreadyExists,
      httpStatus: 409,
    });
  });
});

describe("states (AIP-216)", () => {
  test("an allowed transition returns the new state", async () => {
    expect(await transition("DRAFT", "PUBLISHED", ["DRAFT"])).toBe("PUBLISHED");
  });

  test("a disallowed transition is FAILED_PRECONDITION (400)", async () => {
    expect(
      await thrownBy(async () => transition("PUBLISHED", "PUBLISHED", ["DRAFT"])),
    ).toMatchObject({
      code: CanonicalCode.FailedPrecondition,
      reason: ErrorReason.InvalidTransition,
      httpStatus: 400,
    });
  });
});

describe("batches (AIP-231, 233-235)", () => {
  test.each([
    [0, false],
    [1, true],
    [1000, true],
    [1001, false],
  ])("size %d is accepted: %p", async (count, accepted) => {
    expect((await thrownBy(async () => assertBatchSize(count))) === undefined).toBe(accepted);
  });

  test("batchGet keeps request order", async () => {
    const data = new Map([
      ["a", 1],
      ["b", 2],
      ["c", 3],
    ]);
    expect(await batchGet(["c", "a"], async (name) => data.get(name))).toEqual([3, 1]);
  });

  test("batchGet fails entirely when one name is missing", async () => {
    expect(
      await thrownBy(() =>
        batchGet(["a", "missing"], async (name) => (name === "a" ? 1 : undefined)),
      ),
    ).toMatchObject({
      code: CanonicalCode.NotFound,
    });
  });

  test("atomically undoes applied items in reverse order when one fails", async () => {
    const log: string[] = [];
    const failure = new ApiError(
      CanonicalCode.InvalidArgument,
      ErrorReason.ValidationFailed,
      MessageId.ValidationFailed,
    );
    const apply = async (item: string) => {
      log.push(`apply ${item}`);
      return item === "bad" ? Promise.reject(failure) : item;
    };
    const undo = async (item: string) => void log.push(`undo ${item}`);
    expect(await thrownBy(() => atomically(["a", "b", "bad", "c"], apply, undo))).toMatchObject({
      code: CanonicalCode.InvalidArgument,
    });
    expect(log).toEqual(["apply a", "apply b", "apply bad", "undo b", "undo a"]);
  });

  test("atomically returns every result when all succeed", async () => {
    expect(
      await atomically(
        ["a", "b"],
        async (item) => item.toUpperCase(),
        async () => undefined,
      ),
    ).toEqual(["A", "B"]);
  });
});

describe("long-running operations (AIP-151)", () => {
  const failure = new ApiError(
    CanonicalCode.FailedPrecondition,
    ErrorReason.InvalidTransition,
    MessageId.InvalidTransition,
    { from: "a", to: "b" },
  );

  test("start, complete and fail", async () => {
    const store = new OperationStore("api.example.com");
    const started = await store.start({ step: 1 });
    const done = await store.complete(started.name, { ok: true });
    const failed = await store.fail((await store.start()).name, failure);
    expect([started.name, started.done, done.response]).toEqual([
      expect.stringMatching(/^operations\/op-[0-9a-f-]{36}$/),
      false,
      { ok: true },
    ]);
    expect(failed).toMatchObject({
      done: true,
      error: { status: CanonicalCode.FailedPrecondition },
    });
  });

  test("an operation expires after 30 days; unknown names are NOT_FOUND", async () => {
    let now = 0;
    const store = new OperationStore("d", () => now);
    const { name } = await store.start();
    now = 31 * 24 * 3600 * 1000;
    expect(await thrownBy(() => store.get(name))).toMatchObject({ code: CanonicalCode.NotFound });
    expect(await thrownBy(() => store.get("operations/op-none"))).toMatchObject({
      code: CanonicalCode.NotFound,
    });
  });

  test("the operations.get capability returns the operation through the pipeline", async () => {
    const store = new OperationStore("d");
    const { name } = await store.start();
    const invoke = await createPipeline();
    const capability = await operationCapability(store, AuthMode.None);
    const found = await invoke(capability, { name }, CONTEXT);
    expect(found.output).toMatchObject({ name });
    expect(
      await thrownBy(() => invoke(capability, { name: "operations/op-missing" }, CONTEXT)),
    ).toMatchObject({ code: CanonicalCode.NotFound });
  });
});
