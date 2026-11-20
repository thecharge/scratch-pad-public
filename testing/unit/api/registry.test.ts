import { expect } from "bun:test";
import { OperationStore } from "@platform/aip";
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
import { negative, positive, unit } from "@platform/test-factories";
import { fakeDeps } from "@platform/test-scenarios";
import { createRegistry } from "../../../apps/api/src/registry.ts";

const ALL_IDS = [
  ...Object.values(AssetCapabilityId),
  ...Object.values(CapabilityId),
  ...Object.values(BookCapabilityId),
  ConformanceCapabilityId.BooksBatchCreate,
  ConformanceCapabilityId.PublishersDelete,
  ConfigCapabilityId.Get,
  ConfigCapabilityId.Update,
  ...Object.values(StatsCapabilityId),
  ...Object.values(SkillCapabilityId),
].sort((a, b) => a.localeCompare(b));
const operations = () => new OperationStore(DEFAULT_ERROR_DOMAIN);

unit(createRegistry, {
  positive: [
    positive("every capability id is registered with default dependencies", [], ALL_IDS, ["ids"]),
    positive(
      "a registered capability loads lazily with given dependencies",
      [await fakeDeps(), operations()],
      expect.objectContaining({ id: BookCapabilityId.Get }),
      ["get", BookCapabilityId.Get],
    ),
    positive(
      "the operations capability loads from the given store",
      [await fakeDeps(), operations()],
      expect.objectContaining({ id: CapabilityId.OperationsGet }),
      ["get", CapabilityId.OperationsGet],
    ),
    positive(
      "loading the whole list builds every capability",
      [await fakeDeps(), operations()],
      ALL_IDS.map((id) => expect.objectContaining({ id })),
      ["list"],
    ),
  ],
  negative: [
    negative(
      "an id that was never registered is unknown",
      [],
      { name: "CapabilityDefinitionError" },
      ["get", "books.nope"],
    ),
    negative(
      "a duplicate registration is refused",
      [await fakeDeps(), operations()],
      { name: "CapabilityDefinitionError" },
      ["register", BookCapabilityId.Get, async () => undefined],
    ),
  ],
});
