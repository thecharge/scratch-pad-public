import type { MessageId } from "@platform/constants";
import type { MessageParams } from "@platform/types";
import { MESSAGES } from "./catalog.ts";

const PLACEHOLDER = /\{(\w+)\}/g;

export function message(id: MessageId, params: MessageParams = {}): string {
  return MESSAGES[id].replace(PLACEHOLDER, (whole, name: string) => {
    const value = params[name];
    return value === undefined ? whole : String(value);
  });
}
