import { expect, test } from "bun:test";
import { OperationStore, operationCancelCapability, operationCapability } from "@platform/aip";
import {
  CanonicalCode,
  ErrorReason,
  McpTaskStatus,
  MessageId,
  OPERATION_TTL_MS,
  TransportKind,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { negative, positive, unit } from "@platform/test-factories";
import { ANONYMOUS_PRINCIPAL, type CapabilityContext, type Invoke } from "@platform/types";
import { createMcpTaskRegistry } from "../../../packages/mcp-adapter/src/tasks.ts";

const STORE = new OperationStore("tasks.test");
const CAPS = [await operationCapability(STORE), await operationCancelCapability(STORE)];
const SOURCE = { list: async () => CAPS };
const invoke: Invoke = async (capability, input, context) => ({
  output: await capability.handler(input, context),
  cacheHit: false,
});
const CONTEXT: CapabilityContext = {
  principal: { ...ANONYMOUS_PRINCIPAL, subject: "owner" },
  requestId: "task-test",
  transport: TransportKind.Mcp,
  authEnabled: false,
};
const OTHER = { ...CONTEXT, principal: { ...CONTEXT.principal, subject: "other" } };
const OPERATION = await STORE.start();
const COMPLETE = { ...OPERATION, done: true, response: { count: 1 } };
const COMPLETED_RESULT = expect.objectContaining({ isError: false });

unit(createMcpTaskRegistry, {
  positive: [
    positive(
      "creates a working task",
      [SOURCE, invoke],
      expect.objectContaining({ status: "working" }),
      ["create", OPERATION, CONTEXT],
    ),
    positive(
      "creates a completed task with its result",
      [SOURCE, invoke],
      expect.objectContaining({
        status: "completed",
        result: COMPLETED_RESULT,
      }),
      ["create", COMPLETE, CONTEXT],
    ),
  ],
  negative: [
    negative("unknown task ids are refused", [SOURCE, invoke], { code: "NOT_FOUND" }, [
      "get",
      "missing",
      CONTEXT,
    ]),
    negative("unknown task cancellation is refused", [SOURCE, invoke], { code: "NOT_FOUND" }, [
      "cancel",
      "missing",
      CONTEXT,
    ]),
  ],
});

test("task handles remain owner-bound and cannot overwrite another handle for the same operation", async () => {
  const registry = await createMcpTaskRegistry(SOURCE, invoke);
  const first = await registry.create(OPERATION, CONTEXT);
  const second = await registry.create(OPERATION, OTHER);
  expect(first.taskId).not.toBe(second.taskId);
  expect((await registry.get(first.taskId, CONTEXT)).status).toBe(McpTaskStatus.Working);
  await expect(registry.get(first.taskId, OTHER)).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(registry.cancel(first.taskId, OTHER)).rejects.toMatchObject({ code: "NOT_FOUND" });
  await expect(registry.update(first.taskId, OTHER)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("polling reports progress and terminal output without extending task retention", async () => {
  let now = Date.parse("2001-01-01T00:00:00Z");
  const registry = await createMcpTaskRegistry(SOURCE, invoke, () => now);
  const operation = await STORE.start();
  const task = await registry.create(operation, CONTEXT);
  expect((await registry.get(task.taskId, CONTEXT)).lastUpdatedAt).toBe(task.createdAt);
  now += 100;
  await STORE.progress(operation.name, { processed: 1 });
  expect((await registry.get(task.taskId, CONTEXT)).lastUpdatedAt).not.toBe(task.createdAt);
  await registry.update(task.taskId, CONTEXT);
  await STORE.complete(operation.name, { count: 1 });
  expect((await registry.get(task.taskId, CONTEXT)).result).toMatchObject({ isError: false });
  now += OPERATION_TTL_MS;
  await expect(registry.get(task.taskId, CONTEXT)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("task cancellation uses the operation capability and is reflected on the next poll", async () => {
  const registry = await createMcpTaskRegistry(SOURCE, invoke);
  const task = await registry.create(await STORE.start(), CONTEXT);
  await registry.cancel(task.taskId, CONTEXT);
  expect((await registry.get(task.taskId, CONTEXT)).status).toBe(McpTaskStatus.Cancelled);
});

test("a business operation failure is a completed tool error rather than a JSON-RPC task failure", async () => {
  const registry = await createMcpTaskRegistry(SOURCE, invoke);
  const operation = await STORE.start();
  const task = await registry.create(operation, CONTEXT);
  await STORE.fail(
    operation.name,
    new ApiError(CanonicalCode.Internal, ErrorReason.InternalError, MessageId.InternalError),
  );
  expect(await registry.get(task.taskId, CONTEXT)).toMatchObject({
    status: "completed",
    result: { isError: true },
  });
});

test("a missing operation capability remains a refusal", async () => {
  const registry = await createMcpTaskRegistry({ list: async () => [] }, invoke);
  const task = await registry.create(OPERATION, CONTEXT);
  await expect(registry.get(task.taskId, CONTEXT)).rejects.toMatchObject({ code: "NOT_FOUND" });
});

test("authenticated task creation requires a stable caller subject", async () => {
  const registry = await createMcpTaskRegistry(SOURCE, invoke);
  const context = { ...CONTEXT, authEnabled: true, principal: ANONYMOUS_PRINCIPAL };
  await expect(registry.create(OPERATION, context)).rejects.toMatchObject({ code: "NOT_FOUND" });
});
