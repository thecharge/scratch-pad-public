import { describe, expect, test } from "bun:test";
import { CaseMode, CasePolarity } from "@platform/constants";
import { thrownBy } from "@platform/test-framework";
import {
  type SchemaProbe,
  SchemaProbeSchema,
  type Seen,
  SeenSchema,
  type TestCall,
  type UnitCase,
  type UnitSuite,
  UnitSuiteSchema,
} from "@platform/types";
import type { ZodType } from "zod";

export function positive(
  name: string,
  args: readonly unknown[],
  expected: unknown,
  followUp?: readonly unknown[],
): UnitCase {
  return {
    name,
    polarity: CasePolarity.Positive,
    mode: CaseMode.Returns,
    args: [...args],
    expected,
    ...(followUp === undefined ? {} : { followUp: [...followUp] }),
  };
}

export function negative(
  name: string,
  args: readonly unknown[],
  expected: object,
  followUp?: readonly unknown[],
): UnitCase {
  return {
    name,
    polarity: CasePolarity.Negative,
    mode: CaseMode.Throws,
    args: [...args],
    expected,
    ...(followUp === undefined ? {} : { followUp: [...followUp] }),
  };
}

export function rejected(
  name: string,
  args: readonly unknown[],
  expected: unknown,
  followUp?: readonly unknown[],
): UnitCase {
  return {
    name,
    polarity: CasePolarity.Negative,
    mode: CaseMode.Returns,
    args: [...args],
    expected,
    ...(followUp === undefined ? {} : { followUp: [...followUp] }),
  };
}

function parsed(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function summarized(response: Response) {
  const streaming = response.headers.get("content-type")?.includes("text/event-stream") === true;
  const body = streaming ? await response.body?.cancel() : parsed(await response.text());
  return { status: response.status, headers: Object.fromEntries(response.headers), body };
}

function followed(value: unknown, followUp: readonly unknown[]): unknown {
  if (typeof value === "function") {
    return Reflect.apply(value as TestCall, undefined, followUp);
  }
  const [path, ...rest] = followUp;
  const steps = String(path).split(".");
  const holder = steps
    .slice(0, -1)
    .reduce((node, step) => (node as Record<string, unknown>)[step], value) as Record<
    string,
    TestCall
  >;
  return Reflect.apply(holder[steps.at(-1) as string] as TestCall, holder, rest);
}

async function outcome(subject: TestCall, item: UnitCase): Promise<unknown> {
  const first = () => Reflect.apply(subject, undefined, item.args);
  const call = async () =>
    item.followUp === undefined ? first() : followed(await first(), item.followUp);
  const run = async () => {
    const value = await call();
    if (value instanceof Response) {
      return summarized(value);
    }
    return Symbol.asyncIterator in Object(value)
      ? Array.fromAsync(value as AsyncIterable<unknown>)
      : value;
  };
  return item.mode === CaseMode.Throws ? thrownBy(run) : run();
}

function probeResults(schema: ZodType, probe: SchemaProbe): boolean[] {
  const meta: Record<string, unknown> = schema.meta() ?? {};
  return [
    ...probe.accepts.map((value) => schema.safeParse(value).success),
    ...probe.rejects.map((value) => !schema.safeParse(value).success),
    ...Object.entries(probe.meta ?? {}).map(([key, expected]) => Object.is(meta[key], expected)),
  ];
}

async function expectReturned(received: unknown, expected: unknown): Promise<void> {
  const seen = SeenSchema.safeParse(expected);
  if (seen.success) {
    expect(await seen.data.view(received)).toEqual(seen.data.equals);
    return;
  }
  const probe = SchemaProbeSchema.safeParse(expected);
  if (probe.success) {
    expect(probeResults(received as ZodType, probe.data)).not.toContain(false);
    return;
  }
  expect(received).toEqual(expected);
}

export function unit(
  subject: (...args: never[]) => unknown,
  suite: UnitSuite,
  before?: (item: UnitCase) => Promise<void>,
  timeoutMs?: number,
): void {
  const parsed = UnitSuiteSchema.parse(suite);
  const thrown = parsed.negative.filter((item) => item.mode === CaseMode.Throws);
  const returned = parsed.negative.filter((item) => item.mode === CaseMode.Returns);
  describe(subject.name, () => {
    test.each(parsed.positive)(
      "positive: $name",
      async (item) => {
        await before?.(item);
        await expectReturned(await outcome(subject, item), item.expected);
      },
      timeoutMs,
    );
    test.each(thrown)("negative, throws: $name", async (item) => {
      await before?.(item);
      expect(await outcome(subject, item)).toMatchObject(item.expected as object);
    });
    test.each(returned)(
      "negative, returns: $name",
      async (item) => {
        await before?.(item);
        await expectReturned(await outcome(subject, item), item.expected);
      },
      timeoutMs,
    );
  });
}

export function behaves(probe: SchemaProbe): SchemaProbe {
  return SchemaProbeSchema.parse(probe);
}

export function seen(view: (received: never) => unknown, equals: unknown): Seen {
  return SeenSchema.parse({ view, equals });
}
