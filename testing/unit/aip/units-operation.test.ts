import { expect, test } from "bun:test";
import { OperationStore, operationCapability } from "@platform/aip";
import { AuthMode, CapabilityId, MessageId } from "@platform/constants";
import { ApiError } from "@platform/errors";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { thrownBy } from "@platform/test-framework";
import type { Capability } from "@platform/types";

const store = new OperationStore("api.example.com");
const started = await store.start({ step: "queued" });

const run = (capability: Capability, name: string) => capability.handler({ name }, {} as never);

async function failure(capability: Capability, name: string): Promise<unknown> {
  const error = await thrownBy(() => run(capability, name));
  return error instanceof ApiError ? error.messageId : undefined;
}

const identity = (capability: Capability) => ({
  id: capability.id,
  auth: capability.auth,
});

unit(operationCapability, {
  positive: [
    positive(
      "requires auth by default and is the operations get capability",
      [store],
      seen(identity, { id: CapabilityId.OperationsGet, auth: AuthMode.Required }),
    ),
    positive(
      "an explicit auth mode is kept",
      [store, AuthMode.None],
      seen(identity, { id: CapabilityId.OperationsGet, auth: AuthMode.None }),
    ),
    positive(
      "its handler returns the stored operation",
      [store],
      seen((capability: Capability) => run(capability, started.name), started),
    ),
  ],
  negative: [
    rejected(
      "its handler fails for an operation that does not exist",
      [store],
      seen(
        (capability: Capability) => failure(capability, "operations/op-missing"),
        MessageId.OperationNotFound,
      ),
    ),
    rejected(
      "its handler fails for a name that is not an operation name",
      [store],
      seen(
        (capability: Capability) => failure(capability, "books/b1"),
        MessageId.InvalidResourceName,
      ),
    ),
  ],
});

test.each([false, true])("operation events yield the complete final payload %s", async (failed) => {
  const operations = new OperationStore("api.example.com");
  const operation = await operations.start();
  await operations.complete(operation.name, { failed });
  const capability = await operationCapability(operations);
  const events = await capability.events?.source({ name: operation.name }, {} as never);
  expect((await events?.[Symbol.asyncIterator]().next())?.value).toMatchObject({
    name: operation.name,
    done: true,
    response: { failed },
  });
});
