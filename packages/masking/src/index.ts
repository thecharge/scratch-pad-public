import {
  DEFAULT_VISIBLE_CHARS,
  MASK_CHARACTER,
  MASK_REPLACEMENT,
  MaskStrategy,
  SensitivePath,
  Separator,
} from "@platform/constants";
import { filterAsync } from "@platform/store";
import type {
  Capability,
  JsonObject,
  MaskBlock,
  MaskChange,
  Masker,
  MaskResult,
  MaskRule,
  Principal,
} from "@platform/types";
import { all } from "@platform/util";
import { z } from "zod";

function isRecord(value: unknown): value is JsonObject {
  return value instanceof Object && !Array.isArray(value);
}

async function walk(
  node: unknown,
  segments: readonly string[],
  change: MaskChange,
): Promise<boolean> {
  if (Array.isArray(node)) {
    return (await all(node.map((item) => async () => walk(item, segments, change)))).some(Boolean);
  }
  const [head, ...rest] = segments;
  if (!isRecord(node) || head === undefined || !(head in node)) {
    return false;
  }
  if (rest.length === 0) {
    change(node, head);
    return true;
  }
  return walk(node[head], rest, change);
}

async function partial(value: unknown, visibleChars: number, replacement: string): Promise<string> {
  const text = z.string().safeParse(value);
  if (!text.success) {
    return replacement;
  }
  const visible = Math.min(visibleChars, Math.floor(text.data.length / 2));
  const hidden = MASK_CHARACTER.repeat(text.data.length - visible);
  return visible === 0 ? hidden : hidden + text.data.slice(text.data.length - visible);
}

async function changeFor(rule: MaskRule): Promise<MaskChange> {
  const replacement = rule.replacement ?? MASK_REPLACEMENT;
  const visibleChars = rule.visibleChars ?? DEFAULT_VISIBLE_CHARS;
  const changes: Record<MaskStrategy, MaskChange> = {
    [MaskStrategy.Remove]: async (parent, key) => {
      delete parent[key];
    },
    [MaskStrategy.Replace]: async (parent, key) => {
      parent[key] = replacement;
    },
    [MaskStrategy.Partial]: async (parent, key) => {
      parent[key] = await partial(parent[key], visibleChars, replacement);
    },
  };
  return changes[rule.strategy];
}

async function exempt(rule: MaskRule, principal: Principal): Promise<boolean> {
  return rule.unlessScope !== undefined && principal.scopes.includes(rule.unlessScope);
}

export class PathMasker implements Masker {
  constructor() {}

  async apply(output: unknown, principal: Principal, block: MaskBlock): Promise<MaskResult> {
    const copy = structuredClone(output);
    const maskedPaths = (
      await filterAsync(
        await filterAsync(block.rules, async (rule) => !(await exempt(rule, principal))),
        async (rule) => walk(copy, rule.path.split(Separator.FieldPath), await changeFor(rule)),
      )
    ).map((rule) => rule.path);
    return { output: copy, maskedPaths };
  }
}

export async function sensitivePaths(capabilities: readonly Capability[]): Promise<string[]> {
  const declared = capabilities.flatMap((capability) =>
    (capability.mask?.rules ?? []).map((rule) => rule.path),
  );
  return [...new Set([...Object.values(SensitivePath), ...declared])];
}
