import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  CapabilityId,
  CollectionName,
  CustomVerb,
  DEFAULT_STORE_MAX_ENTRIES,
  ErrorReason,
  FilterFieldKind,
  MessageId,
  MethodKind,
  MILLISECONDS_PER_SECOND,
  OPERATION_DURATION_UNIT,
  OPERATION_EVENT_NAME,
  OPERATION_FIELD_DONE,
  OPERATION_FIELD_NAME,
  OPERATION_ID_PREFIX,
  OPERATION_POLL_MS,
  OPERATION_TTL_MS,
  OPERATION_WAIT_MAX_MS,
  ResourcePattern,
  Scope,
  Separator,
  STATE_URI_SCHEME,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { message } from "@platform/messages";
import { BoundedStore, filterAsync } from "@platform/store";
import {
  EmptySchema,
  type FilterFields,
  ListOperationsInputSchema,
  type Operation,
  OperationListSchema,
  OperationNameInputSchema,
  type OperationProgress,
  OperationSchema,
  type PageLimits,
  type PageTokenCodec,
  type StoredOperation,
  WaitOperationInputSchema,
} from "@platform/types";
import { all } from "@platform/util";
import { matchesFilter, parseFilter } from "./filter.ts";
import { paginate } from "./page.ts";
import { requireResourceName } from "./resource-name.ts";

export class OperationStore {
  private readonly operations: BoundedStore<StoredOperation>;

  constructor(
    private readonly domain: string,
    private readonly now: () => number = Date.now,
    private readonly onChange: (uri: string) => void = async () => undefined,
  ) {
    this.operations = new BoundedStore({
      maxEntries: DEFAULT_STORE_MAX_ENTRIES,
      ttlMs: OPERATION_TTL_MS,
      now: this.now,
    });
  }

  async start(metadata?: unknown): Promise<Operation> {
    const id = [OPERATION_ID_PREFIX, crypto.randomUUID()].join(Text.Empty);
    const name = [CollectionName.Operations, id].join(Separator.Resource);
    const operation: Operation = {
      name,
      done: false,
      ...(metadata === undefined ? {} : { metadata }),
    };
    await this.operations.set(name, { operation, createdAt: this.now() });
    this.onChange(STATE_URI_SCHEME + name);
    return operation;
  }

  async complete(name: string, response: unknown): Promise<Operation> {
    return this.settle(name, { done: true, response });
  }

  async fail(name: string, error: ApiError): Promise<Operation> {
    return this.settle(name, { done: true, error: (await error.toBody(this.domain)).error });
  }

  async progress(name: string, metadata: unknown): Promise<Operation> {
    return this.settle(name, { metadata });
  }

  async list(): Promise<Operation[]> {
    const stored = await all(
      (await this.operations.keys()).map((key) => async () => this.operations.get(key)),
    );
    return stored
      .filter((item): item is StoredOperation => item !== undefined)
      .sort((left, right) => right.createdAt - left.createdAt)
      .map((item) => item.operation);
  }

  async running(): Promise<number> {
    return (await this.list()).filter((operation) => !operation.done).length;
  }

  async delete(name: string): Promise<void> {
    await this.get(name);
    await this.operations.delete(name);
  }

  async cancel(name: string): Promise<void> {
    const current = await this.get(name);
    if (!current.done) {
      await this.fail(
        name,
        new ApiError(
          CanonicalCode.Cancelled,
          ErrorReason.OperationCancelled,
          MessageId.OperationCancelled,
          { name },
        ),
      );
    }
  }

  async shouldStop(name: string): Promise<boolean> {
    const current = await this.operations.get(name);
    return current === undefined || current.operation.done;
  }

  async wait(name: string, timeoutMs: number, onProgress?: OperationProgress): Promise<Operation> {
    const deadline = this.now() + Math.min(timeoutMs, OPERATION_WAIT_MAX_MS);
    let operation = await this.get(name);
    await onProgress?.(operation);
    while (!operation.done && this.now() < deadline) {
      await Bun.sleep(OPERATION_POLL_MS);
      operation = await this.get(name);
      await onProgress?.(operation);
    }
    return operation;
  }

  async *watch(name: string): AsyncGenerator<Operation> {
    let last: string | undefined;
    while (true) {
      const operation = await this.get(name);
      const text = JSON.stringify(operation);
      if (text !== last) {
        last = text;
        yield operation;
      }
      if (operation.done) {
        return;
      }
      await Bun.sleep(OPERATION_POLL_MS);
    }
  }

  private async settle(name: string, patch: Partial<Operation>): Promise<Operation> {
    const current = await this.get(name);
    return current.done ? current : this.update(name, patch);
  }

  async get(name: string): Promise<Operation> {
    const stored = await this.operations.get(name);
    if (stored === undefined) {
      throw new ApiError(
        CanonicalCode.NotFound,
        ErrorReason.OperationNotFound,
        MessageId.OperationNotFound,
        { name },
      );
    }
    return stored.operation;
  }

  private async update(name: string, patch: Partial<Operation>): Promise<Operation> {
    const current = await this.get(name);
    const operation: Operation = { ...current, ...patch };
    await this.operations.update(name, (stored) => ({
      operation,
      createdAt: stored?.createdAt ?? this.now(),
    }));
    this.onChange(STATE_URI_SCHEME + name);
    return operation;
  }
}

export async function operationCapability(
  store: OperationStore,
  auth: AuthMode = AuthMode.Required,
) {
  return defineCapability({
    id: CapabilityId.OperationsGet,
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: ResourcePattern.Operation,
    summary: message(MessageId.OperationsGetSummary),
    description: message(MessageId.OperationsGetDescription),
    auth,
    input: OperationNameInputSchema,
    output: OperationSchema,
    events: { name: OPERATION_EVENT_NAME, source: async ({ name }) => store.watch(name) },
    handler: async ({ name }) => {
      await requireResourceName(ResourcePattern.Operation, name);
      return store.get(name);
    },
  });
}

async function operationFilterFields(): Promise<FilterFields> {
  return new Map([
    [OPERATION_FIELD_NAME, { kind: FilterFieldKind.String }],
    [OPERATION_FIELD_DONE, { kind: FilterFieldKind.Boolean }],
  ]);
}

export async function operationListCapability(
  store: OperationStore,
  codec: PageTokenCodec,
  limits: PageLimits,
  auth: AuthMode = AuthMode.Required,
) {
  return defineCapability({
    id: CapabilityId.OperationsList,
    version: ApiVersion.V1,
    method: MethodKind.List,
    resource: ResourcePattern.OperationCollection,
    summary: message(MessageId.OperationsListSummary),
    description: message(MessageId.OperationsListDescription),
    auth,
    input: ListOperationsInputSchema,
    output: OperationListSchema,
    handler: async (input) => {
      const fields = await operationFilterFields();
      const filter = await parseFilter(input.filter, fields);
      const matching = await filterAsync(
        await store.list(),
        async (operation) =>
          filter === undefined || (await matchesFilter(filter, fields, operation)),
      );
      const page = await paginate(
        matching,
        { pageSize: input.pageSize, pageToken: input.pageToken, query: [input.filter] },
        codec,
        limits,
      );
      return { operations: page.items, nextPageToken: page.nextPageToken };
    },
  });
}

export async function operationDeleteCapability(
  store: OperationStore,
  auth: AuthMode = AuthMode.Required,
) {
  return defineCapability({
    id: CapabilityId.OperationsDelete,
    version: ApiVersion.V1,
    method: MethodKind.Delete,
    resource: ResourcePattern.Operation,
    summary: message(MessageId.OperationsDeleteSummary),
    description: message(MessageId.OperationsDeleteDescription),
    auth,
    policy: { requiredScopes: [Scope.Admin] },
    input: OperationNameInputSchema,
    output: EmptySchema,
    handler: async ({ name }) => {
      await requireResourceName(ResourcePattern.Operation, name);
      await store.delete(name);
      return {};
    },
  });
}

export async function operationCancelCapability(
  store: OperationStore,
  auth: AuthMode = AuthMode.Required,
) {
  return defineCapability({
    id: CapabilityId.OperationsCancel,
    version: ApiVersion.V1,
    method: MethodKind.Custom,
    customVerb: CustomVerb.Cancel,
    resource: ResourcePattern.Operation,
    summary: message(MessageId.OperationsCancelSummary),
    description: message(MessageId.OperationsCancelDescription),
    auth,
    policy: { requiredScopes: [Scope.Admin] },
    input: OperationNameInputSchema,
    output: EmptySchema,
    handler: async ({ name }) => {
      await requireResourceName(ResourcePattern.Operation, name);
      await store.cancel(name);
      return {};
    },
  });
}

async function timeoutMs(timeout: string | undefined): Promise<number> {
  return timeout === undefined
    ? OPERATION_WAIT_MAX_MS
    : Number.parseFloat(timeout.slice(0, -OPERATION_DURATION_UNIT.length)) *
        MILLISECONDS_PER_SECOND;
}

export async function operationWaitCapability(
  store: OperationStore,
  auth: AuthMode = AuthMode.Required,
) {
  return defineCapability({
    id: CapabilityId.OperationsWait,
    version: ApiVersion.V1,
    method: MethodKind.Custom,
    customVerb: CustomVerb.Wait,
    resource: ResourcePattern.Operation,
    summary: message(MessageId.OperationsWaitSummary),
    description: message(MessageId.OperationsWaitDescription),
    auth,
    input: WaitOperationInputSchema,
    output: OperationSchema,
    handler: async ({ name, timeout }, context) => {
      await requireResourceName(ResourcePattern.Operation, name);
      return store.wait(name, await timeoutMs(timeout), context.onProgress);
    },
  });
}
