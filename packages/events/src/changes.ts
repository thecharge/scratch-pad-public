import { MAX_SUBSCRIBERS } from "@platform/constants";
import type { ChangeListener, ChangeSource } from "@platform/types";

export class ChangeFeed implements ChangeSource {
  private listeners: ChangeListener[];

  constructor() {
    this.listeners = [];
  }

  async publish(uri: string): Promise<void> {
    for (const listener of this.listeners) {
      listener(uri);
    }
  }

  async subscribe(listener: ChangeListener): Promise<() => Promise<void>> {
    if (this.listeners.length >= MAX_SUBSCRIBERS) {
      return async () => undefined;
    }
    this.listeners = [...this.listeners, listener];
    return async () => {
      this.listeners = this.listeners.filter((candidate) => candidate !== listener);
    };
  }
}
