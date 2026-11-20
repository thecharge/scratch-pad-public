import { DEFAULT_STORE_MAX_ENTRIES, MessageId } from "@platform/constants";
import { BoundedStore } from "@platform/store";
import type { Capability, CapabilityEntry, CapabilityLoader } from "@platform/types";
import { all } from "@platform/util";
import { CapabilityDefinitionError } from "./capability.ts";

export class CapabilityRegistry {
  private readonly entries: CapabilityEntry[];
  private readonly loaded: BoundedStore<Capability>;

  constructor() {
    this.entries = [];
    this.loaded = new BoundedStore<Capability>({ maxEntries: DEFAULT_STORE_MAX_ENTRIES });
  }

  async register(id: string, load: CapabilityLoader): Promise<void> {
    if (this.entries.some((entry) => entry.id === id)) {
      throw new CapabilityDefinitionError(MessageId.DuplicateCapability, { id });
    }
    this.entries.push({ id, load });
  }

  async has(id: string): Promise<boolean> {
    return this.entries.some((entry) => entry.id === id);
  }

  async ids(): Promise<string[]> {
    return this.entries.map((entry) => entry.id).sort((a, b) => a.localeCompare(b));
  }

  async get(id: string): Promise<Capability> {
    const entry = this.entries.find((candidate) => candidate.id === id);
    if (entry === undefined) {
      throw new CapabilityDefinitionError(MessageId.UnknownCapability, { id });
    }
    return (await this.loaded.get(id)) ?? (await this.load(entry));
  }

  async list(): Promise<readonly Capability[]> {
    return all((await this.ids()).map((id) => async () => this.get(id)));
  }

  private async load(entry: CapabilityEntry): Promise<Capability> {
    const capability = await entry.load();
    await this.loaded.set(entry.id, capability);
    return capability;
  }
}
