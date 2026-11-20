import { describe, expect, test } from "bun:test";
import {
  OperationStore,
  operationCancelCapability,
  operationDeleteCapability,
  operationListCapability,
  operationWaitCapability,
} from "@platform/aip";
import {
  AuthMode,
  CanonicalCode,
  CapabilityId,
  ErrorReason,
  MessageId,
  Scope,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { thrownBy } from "@platform/test-framework";
import { fakeDeps, PUBLISHER_NAME, sampleBook } from "@platform/test-scenarios";
import type { Capability, Operation, OperationList } from "@platform/types";
import { all } from "@platform/util";
import { reindexBooks } from "../../../apps/api/src/capabilities/books.ts";

const DOMAIN = "api.example.com";
const deps = await fakeDeps();
const NO_CONTEXT = {} as never;
const MISSING = "operations/op-missing";
const NOT_AN_OPERATION = "books/b1";
const SHORT = "0.05s";

async function twoOperations() {
  const store = new OperationStore(DOMAIN);
  const first = await store.start({ step: "first" });
  await Bun.sleep(2);
  const second = await store.start({ step: "second" });
  return { store, first, second };
}

const run = (capability: Capability, input: object) => capability.handler(input, NO_CONTEXT);

async function failure(capability: Capability, input: object): Promise<unknown> {
  const error = await thrownBy(() => run(capability, input));
  return error instanceof ApiError ? error.messageId : undefined;
}

const identity = (capability: Capability) => ({
  id: capability.id,
  auth: capability.auth,
  scopes: capability.policy?.requiredScopes,
});

const { store: listed, first: listedFirst, second: listedSecond } = await twoOperations();
const { store: pagedStore } = await twoOperations();
const { store: doneStore, first: doneOperation } = await twoOperations();
await doneStore.complete(doneOperation.name, { count: 1 });
const slowStore = new OperationStore(DOMAIN);
const slowOperation = await slowStore.start({ step: "slow" });
const waiting = new OperationStore(DOMAIN);
const unfinished = await waiting.start({ step: "running" });

const DONE_OPERATION = { ...doneOperation, done: true, response: { count: 1 } };
const DONE_PAGE = { operations: [DONE_OPERATION], nextPageToken: "" };

const view = (check: (capability: Capability) => unknown) => seen(check, true);

unit(operationListCapability, {
  positive: [
    positive(
      "is the operations list capability and requires auth by default",
      [listed, deps.codec, deps.limits],
      seen(identity, {
        id: CapabilityId.OperationsList,
        auth: AuthMode.Required,
        scopes: undefined,
      }),
    ),
    positive(
      "its handler lists the newest operation first",
      [listed, deps.codec, deps.limits],
      seen((capability: Capability) => run(capability, {}), {
        operations: [listedSecond, listedFirst],
        nextPageToken: "",
      }),
    ),
    positive(
      "its handler pages with a token when the page is full",
      [pagedStore, deps.codec, deps.limits],
      view(async (capability) => {
        const page = (await run(capability, { pageSize: 1 })) as OperationList;
        return page.nextPageToken.length > 0;
      }),
    ),
    positive(
      "its handler filters on the done field",
      [doneStore, deps.codec, deps.limits],
      seen((capability: Capability) => run(capability, { filter: "done = true" }), DONE_PAGE),
    ),
  ],
  negative: [
    rejected(
      "its handler refuses a negative page size",
      [listed, deps.codec, deps.limits],
      seen(
        (capability: Capability) => failure(capability, { pageSize: -1 }),
        MessageId.InvalidPageSize,
      ),
    ),
    rejected(
      "its handler refuses a filter on an unknown field",
      [listed, deps.codec, deps.limits],
      seen(
        (capability: Capability) => failure(capability, { filter: "shade = red" }),
        MessageId.InvalidFilter,
      ),
    ),
  ],
});

unit(operationDeleteCapability, {
  positive: [
    positive(
      "is the operations delete capability, admin only",
      [listed],
      seen(identity, {
        id: CapabilityId.OperationsDelete,
        auth: AuthMode.Required,
        scopes: [Scope.Admin],
      }),
    ),
    positive(
      "its handler removes the operation",
      [pagedStore],
      view(async (capability) => {
        const [target] = await pagedStore.list();
        await run(capability, { name: target?.name });
        return (await thrownBy(() => pagedStore.get(String(target?.name)))) instanceof ApiError;
      }),
    ),
  ],
  negative: [
    rejected(
      "its handler fails for an operation that does not exist",
      [listed],
      seen(
        (capability: Capability) => failure(capability, { name: MISSING }),
        MessageId.OperationNotFound,
      ),
    ),
    rejected(
      "its handler fails for a name that is not an operation name",
      [listed],
      seen(
        (capability: Capability) => failure(capability, { name: NOT_AN_OPERATION }),
        MessageId.InvalidResourceName,
      ),
    ),
  ],
});

unit(operationCancelCapability, {
  positive: [
    positive(
      "is the operations cancel capability, admin only",
      [waiting],
      seen(identity, {
        id: CapabilityId.OperationsCancel,
        auth: AuthMode.Required,
        scopes: [Scope.Admin],
      }),
    ),
    positive(
      "its handler ends a running operation with the CANCELLED error",
      [waiting],
      view(async (capability) => {
        await run(capability, { name: unfinished.name });
        const after = await waiting.get(unfinished.name);
        return after.done && after.error?.status === CanonicalCode.Cancelled;
      }),
    ),
    positive(
      "its handler leaves a finished operation as it was",
      [doneStore],
      view(async (capability) => {
        await run(capability, { name: doneOperation.name });
        return (await doneStore.get(doneOperation.name)).error === undefined;
      }),
    ),
  ],
  negative: [
    rejected(
      "its handler fails for an operation that does not exist",
      [waiting],
      seen(
        (capability: Capability) => failure(capability, { name: MISSING }),
        MessageId.OperationNotFound,
      ),
    ),
    rejected(
      "its handler fails for a name that is not an operation name",
      [waiting],
      seen(
        (capability: Capability) => failure(capability, { name: NOT_AN_OPERATION }),
        MessageId.InvalidResourceName,
      ),
    ),
  ],
});

unit(operationWaitCapability, {
  positive: [
    positive(
      "is the operations wait capability and requires auth by default",
      [doneStore],
      seen(identity, {
        id: CapabilityId.OperationsWait,
        auth: AuthMode.Required,
        scopes: undefined,
      }),
    ),
    positive(
      "its handler returns a finished operation at once, whatever the timeout",
      [doneStore],
      view(
        async (capability) =>
          ((await run(capability, { name: doneOperation.name })) as Operation).done,
      ),
    ),
    positive(
      "its handler returns the unfinished operation when the timeout passes",
      [slowStore],
      view(async (capability) => {
        const waited = (await run(capability, {
          name: slowOperation.name,
          timeout: SHORT,
        })) as Operation;
        return !waited.done && waited.name === slowOperation.name;
      }),
    ),
  ],
  negative: [
    rejected(
      "its handler fails for an operation that does not exist",
      [doneStore],
      seen(
        (capability: Capability) => failure(capability, { name: MISSING, timeout: SHORT }),
        MessageId.OperationNotFound,
      ),
    ),
    rejected(
      "its handler fails for a name that is not an operation name",
      [doneStore],
      seen(
        (capability: Capability) => failure(capability, { name: NOT_AN_OPERATION }),
        MessageId.InvalidResourceName,
      ),
    ),
  ],
});

class FailingProgress extends OperationStore {
  override async progress(): Promise<Operation> {
    throw new Error("storage down");
  }
}

describe("failures around a long-running operation", () => {
  test("a failure during the run lands in the error of the operation, which is done", async () => {
    const seeded = await fakeDeps([sampleBook("b1")]);
    const store = new FailingProgress(DOMAIN);
    const capability = await reindexBooks(seeded, store);
    const started = (await capability.handler({ parent: PUBLISHER_NAME }, NO_CONTEXT)) as Operation;
    const finished = await store.wait(started.name, 2000);
    expect([finished.done, finished.error?.status]).toEqual([true, CanonicalCode.Internal]);
  });

  test("a failure that prevents the start is an error and creates no operation", async () => {
    const broken = await fakeDeps([], {
      books: {
        ...deps.books,
        list: async () => {
          throw new Error("storage down");
        },
      },
    });
    const store = new OperationStore(DOMAIN);
    const capability = await reindexBooks(broken, store);
    const error = await thrownBy(() => run(capability, { parent: PUBLISHER_NAME }));
    expect([error instanceof Error, (await store.list()).length]).toEqual([true, 0]);
  });
});

describe("the operation store", () => {
  test("running counts only the operations that are not done", async () => {
    const store = new OperationStore(DOMAIN);
    const first = await store.start();
    await store.start();
    await store.complete(first.name, {});
    expect(await store.running()).toBe(1);
  });

  test("running is zero for an empty store", async () => {
    expect(await new OperationStore(DOMAIN).running()).toBe(0);
  });

  test("progress changes the metadata of a running operation", async () => {
    const store = new OperationStore(DOMAIN);
    const started = await store.start({ processed: 0 });
    await store.progress(started.name, { processed: 2 });
    expect((await store.get(started.name)).metadata).toEqual({ processed: 2 });
  });

  test("a finished operation keeps its result when progress or a second result arrives", async () => {
    const store = new OperationStore(DOMAIN);
    const started = await store.start({ processed: 0 });
    await store.complete(started.name, { count: 1 });
    await store.progress(started.name, { processed: 9 });
    await store.complete(started.name, { count: 2 });
    const after = await store.get(started.name);
    expect([after.metadata, after.response]).toEqual([{ processed: 0 }, { count: 1 }]);
  });

  test("a cancelled operation keeps the cancellation when the work completes late", async () => {
    const store = new OperationStore(DOMAIN);
    const started = await store.start();
    await store.cancel(started.name);
    await store.complete(started.name, { count: 1 });
    const after = await store.get(started.name);
    expect([after.done, after.response, after.error?.status]).toEqual([
      true,
      undefined,
      CanonicalCode.Cancelled,
    ]);
  });

  test("the cancelled error names the reason", async () => {
    const store = new OperationStore(DOMAIN);
    const started = await store.start();
    await store.cancel(started.name);
    const reasons = JSON.stringify((await store.get(started.name)).error?.details);
    expect(reasons).toContain(ErrorReason.OperationCancelled);
  });

  test("the work should stop for a finished, cancelled or deleted operation, not for a running one", async () => {
    const store = new OperationStore(DOMAIN);
    const running = await store.start();
    const cancelled = await store.start();
    await store.cancel(cancelled.name);
    const deleted = await store.start();
    await store.delete(deleted.name);
    const stops = [running.name, cancelled.name, deleted.name].map((name) =>
      store.shouldStop(name),
    );
    expect(await all(stops.map((stop) => async () => stop))).toEqual([false, true, true]);
  });

  test("wait returns when the operation completes during the wait", async () => {
    const store = new OperationStore(DOMAIN);
    const started = await store.start();
    setTimeout(() => void store.complete(started.name, { count: 3 }), 40);
    const waited = await store.wait(started.name, 2000);
    expect([waited.done, waited.response]).toEqual([true, { count: 3 }]);
  });

  test("wait returns the unfinished operation when the timeout passes", async () => {
    const store = new OperationStore(DOMAIN);
    const started = await store.start();
    expect((await store.wait(started.name, 60)).done).toBe(false);
  });

  test("watch yields each change once and ends with the finished operation", async () => {
    const store = new OperationStore(DOMAIN);
    const started = await store.start({ processed: 0 });
    setTimeout(() => void store.progress(started.name, { processed: 1 }), 40);
    setTimeout(() => void store.complete(started.name, { count: 1 }), 120);
    const seenStates = await Array.fromAsync(store.watch(started.name));
    expect(seenStates.map((state) => [state.metadata, state.done])).toEqual([
      [{ processed: 0 }, false],
      [{ processed: 1 }, false],
      [{ processed: 1 }, true],
    ]);
  });
});
