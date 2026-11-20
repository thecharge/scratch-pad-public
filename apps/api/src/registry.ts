import {
  OperationStore,
  operationCancelCapability,
  operationCapability,
  operationDeleteCapability,
  operationListCapability,
  operationWaitCapability,
} from "@platform/aip";
import { CapabilityRegistry, watchCapability } from "@platform/capability";
import { DEFAULT_ERROR_DOMAIN } from "@platform/config/urls";
import {
  AssetCapabilityId,
  BookCapabilityId,
  CapabilityId,
  ConfigCapabilityId,
  ConformanceCapabilityId,
  SkillCapabilityId,
  StatsCapabilityId,
} from "@platform/constants";
import type { ApiDeps, AssetStore, SkillOptionsProvider } from "@platform/types";
import { createDeps } from "./deps.ts";
import { IDLE_OBSERVABILITY, idleSkillOptions } from "./idle.ts";

const books = async () => import("./capabilities/books.ts");
const publishers = async () => import("./capabilities/publishers.ts");
const config = async () => import("./capabilities/config.ts");
const observability = async () => import("./capabilities/observability.ts");
const skills = async () => import("./capabilities/skills.ts");
const assets = async () => import("./capabilities/assets.ts");

export async function createRegistry(
  given?: ApiDeps,
  operations = new OperationStore(DEFAULT_ERROR_DOMAIN),
  skillOptions: SkillOptionsProvider = idleSkillOptions,
  assetStore?: AssetStore,
): Promise<CapabilityRegistry> {
  const deps = given ?? (await createDeps(IDLE_OBSERVABILITY));
  const registry = new CapabilityRegistry();
  await registry.register(
    AssetCapabilityId.Upload,
    async () => (await (await assets()).assetCapabilities(deps, assetStore)).upload,
  );
  await registry.register(
    AssetCapabilityId.Get,
    async () => (await (await assets()).assetCapabilities(deps, assetStore)).get,
  );
  await registry.register(
    AssetCapabilityId.List,
    async () => (await (await assets()).assetCapabilities(deps, assetStore)).list,
  );
  await registry.register(CapabilityId.OperationsGet, async () => operationCapability(operations));
  await registry.register(CapabilityId.OperationsWatch, async () =>
    watchCapability(await operationCapability(operations), CapabilityId.OperationsWatch),
  );
  await registry.register(CapabilityId.OperationsList, async () =>
    operationListCapability(operations, deps.codec, deps.limits),
  );
  await registry.register(CapabilityId.OperationsDelete, async () =>
    operationDeleteCapability(operations),
  );
  await registry.register(CapabilityId.OperationsCancel, async () =>
    operationCancelCapability(operations),
  );
  await registry.register(CapabilityId.OperationsWait, async () =>
    operationWaitCapability(operations),
  );
  await registry.register(BookCapabilityId.Get, async () => (await books()).getBook(deps));
  await registry.register(BookCapabilityId.List, async () => (await books()).listBooks(deps));
  await registry.register(BookCapabilityId.Create, async () => (await books()).createBook(deps));
  await registry.register(BookCapabilityId.Update, async () => (await books()).updateBook(deps));
  await registry.register(BookCapabilityId.Delete, async () => (await books()).deleteBook(deps));
  await registry.register(BookCapabilityId.Archive, async () => (await books()).archiveBook(deps));
  await registry.register(BookCapabilityId.Undelete, async () =>
    (await books()).undeleteBook(deps),
  );
  await registry.register(BookCapabilityId.BatchGet, async () =>
    (await books()).batchGetBooks(deps),
  );
  await registry.register(BookCapabilityId.Count, async () => (await books()).countBooks(deps));
  await registry.register(BookCapabilityId.Suggest, async () => (await books()).suggestBook(deps));
  await registry.register(BookCapabilityId.Reindex, async () =>
    (await books()).reindexBooks(deps, operations),
  );
  await registry.register(ConformanceCapabilityId.BooksBatchCreate, async () =>
    (await books()).batchCreateBooks(deps),
  );
  await registry.register(ConformanceCapabilityId.PublishersDelete, async () =>
    (await publishers()).deletePublisher(deps),
  );
  await registry.register(ConfigCapabilityId.Get, async () => (await config()).getConfig(deps));
  await registry.register(StatsCapabilityId.Get, async () =>
    (await observability()).getStats(deps),
  );
  await registry.register(StatsCapabilityId.EventsGet, async () =>
    (await observability()).getEvents(deps),
  );
  await registry.register(StatsCapabilityId.EventsWatch, async () =>
    watchCapability(await (await observability()).getEvents(deps), StatsCapabilityId.EventsWatch),
  );
  await registry.register(StatsCapabilityId.LogsList, async () =>
    (await observability()).listLogs(deps),
  );
  await registry.register(ConfigCapabilityId.Update, async () =>
    (await config()).updateConfig(deps),
  );
  const skillsFor = async () => skillOptions(registry);
  await registry.register(SkillCapabilityId.List, async () =>
    (await skills()).listSkills(skillsFor, deps.codec, deps.limits),
  );
  await registry.register(SkillCapabilityId.Get, async () => (await skills()).getSkill(skillsFor));
  return registry;
}
