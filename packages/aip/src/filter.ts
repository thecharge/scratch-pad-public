import {
  CanonicalCode,
  DURATION_SUFFIX,
  ErrorReason,
  FilterComparator,
  FilterFieldKind,
  FilterKeyword,
  FilterLiteral,
  FilterNodeKind,
  FilterTokenKind,
  Glyph,
  MessageId,
  Separator,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { everyAsync, someAsync } from "@platform/store";
import type {
  FilterField,
  FilterFields,
  FilterNode,
  FilterRestriction,
  FilterToken,
  FilterValue,
  ScanStep,
} from "@platform/types";

const COMPARATORS: readonly FilterComparator[] = [
  FilterComparator.LessEquals,
  FilterComparator.GreaterEquals,
  FilterComparator.NotEquals,
  FilterComparator.LessThan,
  FilterComparator.GreaterThan,
  FilterComparator.Equals,
  FilterComparator.Has,
];
const COMPARATOR_START: readonly string[] = COMPARATORS.map((comparator) => comparator.charAt(0));
const WHITESPACE = /\s/;
const RFC3339_DATE_TIME = /^\d{4}-\d{2}-\d{2}T/;
const NUMBER = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
const DURATION = /^-?\d+(\.\d+)?s$/;
const KEYWORDS: readonly string[] = Object.values(FilterKeyword);
const ORDERED_KINDS: readonly FilterFieldKind[] = [
  FilterFieldKind.String,
  FilterFieldKind.Number,
  FilterFieldKind.Timestamp,
  FilterFieldKind.Duration,
];
const ORDERING: readonly FilterComparator[] = [
  FilterComparator.LessThan,
  FilterComparator.LessEquals,
  FilterComparator.GreaterThan,
  FilterComparator.GreaterEquals,
];

async function invalid(detail: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.InvalidFilter,
    MessageId.InvalidFilter,
    { detail },
  );
}

async function single(kind: FilterTokenKind, text: string, index: number): Promise<ScanStep> {
  return { token: { kind, text }, next: index + 1 };
}

async function isQuote(char: string): Promise<boolean> {
  return char === Glyph.SingleQuote || char === Glyph.DoubleQuote;
}

async function readQuoted(input: string, start: number): Promise<ScanStep> {
  const quote = input.charAt(start);
  let text: string = Text.Empty;
  let cursor = start + 1;
  while (cursor < input.length) {
    const char = input.charAt(cursor);
    if (char === quote) {
      return { token: { kind: FilterTokenKind.Quoted, text }, next: cursor + 1 };
    }
    const escaped = char === Glyph.Backslash && cursor + 1 < input.length;
    text += escaped ? input.charAt(cursor + 1) : char;
    cursor += escaped ? 2 : 1;
  }
  throw await invalid(input);
}

async function endsText(char: string, inValue: boolean): Promise<boolean> {
  const boundary = WHITESPACE.test(char) || char === Glyph.LeftParen || char === Glyph.RightParen;
  return boundary || (!inValue && COMPARATOR_START.includes(char));
}

async function readText(input: string, start: number, inValue: boolean): Promise<ScanStep> {
  let cursor = start;
  while (cursor < input.length && !(await endsText(input.charAt(cursor), inValue))) {
    cursor += 1;
  }
  const text = input.slice(start, cursor);
  const isKeyword = !inValue && KEYWORDS.includes(text);
  const kind = isKeyword ? FilterTokenKind.Keyword : FilterTokenKind.Text;
  return { token: { kind, text }, next: cursor };
}

async function readComparator(input: string, index: number): Promise<ScanStep> {
  const comparator = COMPARATORS.find((candidate) => input.startsWith(candidate, index));
  if (comparator === undefined) {
    throw await invalid(input.charAt(index));
  }
  return {
    token: { kind: FilterTokenKind.Comparator, text: comparator },
    next: index + comparator.length,
  };
}

async function scanToken(
  input: string,
  index: number,
  previous: FilterToken | undefined,
): Promise<ScanStep> {
  const char = input.charAt(index);
  const afterComparator = previous?.kind === FilterTokenKind.Comparator;
  if (WHITESPACE.test(char)) {
    return { next: index + 1 };
  }
  if (char === Glyph.LeftParen) {
    return single(FilterTokenKind.LeftParen, char, index);
  }
  if (char === Glyph.RightParen) {
    return single(FilterTokenKind.RightParen, char, index);
  }
  if (await isQuote(char)) {
    return readQuoted(input, index);
  }
  if (!afterComparator && COMPARATOR_START.includes(char)) {
    return readComparator(input, index);
  }
  if (char === Glyph.Minus && !afterComparator) {
    return single(FilterTokenKind.Minus, char, index);
  }
  return readText(input, index, afterComparator);
}

async function tokenize(input: string): Promise<FilterToken[]> {
  const tokens: FilterToken[] = [];
  let index = 0;
  while (index < input.length) {
    const step = await scanToken(input, index, tokens.at(-1));
    index = step.next;
    if (step.token !== undefined) {
      tokens.push(step.token);
    }
  }
  return [...tokens, { kind: FilterTokenKind.End, text: Text.Empty }];
}

async function timestampValue(text: string): Promise<number> {
  const time = Date.parse(text);
  if (Number.isNaN(time) || !RFC3339_DATE_TIME.test(text)) {
    throw await invalid(text);
  }
  return time;
}

async function numberValue(text: string): Promise<number> {
  if (!NUMBER.test(text)) {
    throw await invalid(text);
  }
  return Number(text);
}

async function durationValue(text: string): Promise<number> {
  if (!DURATION.test(text)) {
    throw await invalid(text);
  }
  return Number(text.slice(0, -DURATION_SUFFIX.length));
}

async function booleanValue(text: string): Promise<boolean> {
  if (text !== FilterLiteral.True && text !== FilterLiteral.False) {
    throw await invalid(text);
  }
  return text === FilterLiteral.True;
}

async function enumValue(field: FilterField, text: string): Promise<string> {
  if (!(field.values ?? []).includes(text)) {
    throw await invalid(text);
  }
  return text;
}

async function parseValue(field: FilterField, text: string): Promise<FilterValue> {
  switch (field.kind) {
    case FilterFieldKind.Enum:
      return enumValue(field, text);
    case FilterFieldKind.Number:
      return numberValue(text);
    case FilterFieldKind.Boolean:
      return booleanValue(text);
    case FilterFieldKind.Timestamp:
      return timestampValue(text);
    case FilterFieldKind.Duration:
      return durationValue(text);
    default:
      return text;
  }
}

async function checkComparator(
  field: FilterField,
  comparator: FilterComparator,
  name: string,
): Promise<void> {
  const orderingNotOffered = ORDERING.includes(comparator) && !ORDERED_KINDS.includes(field.kind);
  const listNeedsHas =
    field.kind === FilterFieldKind.StringList && comparator !== FilterComparator.Has;
  if (orderingNotOffered || listNeedsHas) {
    throw await invalid(name);
  }
}

async function isNameToken(token: FilterToken): Promise<boolean> {
  return token.kind === FilterTokenKind.Text || token.kind === FilterTokenKind.Quoted;
}

class Parser {
  private position = 0;

  constructor(
    private readonly tokens: readonly FilterToken[],
    private readonly fields: FilterFields,
  ) {}

  private async peek(): Promise<FilterToken> {
    return this.tokens[this.position] as FilterToken;
  }

  private async next(): Promise<FilterToken> {
    const token = await this.peek();
    this.position += 1;
    return token;
  }

  private async isKeyword(text: FilterKeyword): Promise<boolean> {
    const token = await this.peek();
    return token.kind === FilterTokenKind.Keyword && token.text === text;
  }

  async parse(): Promise<FilterNode> {
    const node = await this.expression();
    if ((await this.peek()).kind !== FilterTokenKind.End) {
      throw await invalid((await this.peek()).text);
    }
    return node;
  }

  private async expression(): Promise<FilterNode> {
    const children = [await this.sequence()];
    while (await this.isKeyword(FilterKeyword.And)) {
      await this.next();
      children.push(await this.sequence());
    }
    return Parser.join(FilterNodeKind.And, children);
  }

  private async sequence(): Promise<FilterNode> {
    const children = [await this.factor()];
    while (await this.startsFactor()) {
      children.push(await this.factor());
    }
    return Parser.join(FilterNodeKind.And, children);
  }

  private async startsFactor(): Promise<boolean> {
    const kind = (await this.peek()).kind;
    const ends = kind === FilterTokenKind.End || kind === FilterTokenKind.RightParen;
    return !ends && !(await this.isKeyword(FilterKeyword.And));
  }

  private async factor(): Promise<FilterNode> {
    const children = [await this.term()];
    while (await this.isKeyword(FilterKeyword.Or)) {
      await this.next();
      children.push(await this.term());
    }
    return Parser.join(FilterNodeKind.Or, children);
  }

  private static async join(
    kind: FilterNodeKind.And | FilterNodeKind.Or,
    children: FilterNode[],
  ): Promise<FilterNode> {
    return children.length === 1 ? (children[0] as FilterNode) : { kind, children };
  }

  private async term(): Promise<FilterNode> {
    const negated =
      (await this.isKeyword(FilterKeyword.Not)) ||
      (await this.peek()).kind === FilterTokenKind.Minus;
    if (!negated) {
      return this.simple();
    }
    await this.next();
    return { kind: FilterNodeKind.Not, child: await this.simple() };
  }

  private async simple(): Promise<FilterNode> {
    if ((await this.peek()).kind !== FilterTokenKind.LeftParen) {
      return this.restriction();
    }
    await this.next();
    const inner = await this.expression();
    if ((await this.next()).kind !== FilterTokenKind.RightParen) {
      throw await invalid(Glyph.RightParen);
    }
    return inner;
  }

  private async restriction(): Promise<FilterRestriction> {
    const nameToken = await this.next();
    const field = this.fields.get(nameToken.text);
    const comparatorToken = await this.next();
    const valueToken = await this.next();
    const wellFormed =
      (await isNameToken(nameToken)) &&
      field !== undefined &&
      comparatorToken.kind === FilterTokenKind.Comparator &&
      (await isNameToken(valueToken));
    if (!wellFormed) {
      throw await invalid(nameToken.text);
    }
    const comparator = comparatorToken.text as FilterComparator;
    await checkComparator(field, comparator, nameToken.text);
    const presence = comparator === FilterComparator.Has && valueToken.text === Glyph.Star;
    return {
      kind: FilterNodeKind.Restriction,
      field: nameToken.text,
      comparator,
      value: presence ? valueToken.text : await parseValue(field, valueToken.text),
      presence,
    };
  }
}

export async function parseFilter(
  text: string | undefined,
  fields: FilterFields,
): Promise<FilterNode | undefined> {
  if (text === undefined || text.trim().length === 0) {
    return undefined;
  }
  return new Parser(await tokenize(text), fields).parse();
}

async function valueAt(record: unknown, path: string): Promise<unknown> {
  return path.split(Separator.FieldPath).reduce<unknown>((current, segment) => {
    const isObject = current !== null && Object(current) === current;
    return isObject ? (current as Record<string, unknown>)[segment] : undefined;
  }, record);
}

async function matchesString(actual: string, pattern: string): Promise<boolean> {
  const leading = pattern.startsWith(Glyph.Star);
  const trailing = pattern.endsWith(Glyph.Star) && pattern.length > 1;
  const core = pattern.slice(leading ? 1 : 0, trailing ? -1 : undefined);
  if (leading && trailing) {
    return actual.includes(core);
  }
  if (leading) {
    return actual.endsWith(core);
  }
  return trailing ? actual.startsWith(core) : actual === pattern;
}

async function ordered(
  actual: number | string,
  comparator: FilterComparator,
  expected: FilterValue,
): Promise<boolean> {
  const target = expected as number | string;
  switch (comparator) {
    case FilterComparator.LessThan:
      return actual < target;
    case FilterComparator.LessEquals:
      return actual <= target;
    case FilterComparator.GreaterThan:
      return actual > target;
    case FilterComparator.GreaterEquals:
      return actual >= target;
    default:
      return false;
  }
}

async function comparable(
  kind: FilterFieldKind,
  actual: unknown,
): Promise<number | string | boolean> {
  if (kind === FilterFieldKind.Timestamp) {
    return Date.parse(String(actual));
  }
  if (kind === FilterFieldKind.Duration) {
    return Number(String(actual).slice(0, -DURATION_SUFFIX.length));
  }
  return actual as number | string | boolean;
}

async function equal(
  kind: FilterFieldKind,
  actual: number | string | boolean,
  expected: FilterValue,
): Promise<boolean> {
  return kind === FilterFieldKind.String
    ? await matchesString(String(actual), String(expected))
    : actual === expected;
}

async function matchesRestriction(
  node: FilterRestriction,
  fields: FilterFields,
  record: unknown,
): Promise<boolean> {
  const actual = await valueAt(record, node.field);
  if (actual === undefined || actual === null) {
    return false;
  }
  const kind = (fields.get(node.field) as FilterField).kind;
  if (node.presence) {
    return Array.isArray(actual) ? actual.length > 0 : true;
  }
  if (kind === FilterFieldKind.StringList) {
    return (
      Array.isArray(actual) &&
      (await someAsync(actual, async (item) => matchesString(String(item), String(node.value))))
    );
  }
  const value = await comparable(kind, actual);
  switch (node.comparator) {
    case FilterComparator.Equals:
    case FilterComparator.Has:
      return equal(kind, value, node.value);
    case FilterComparator.NotEquals:
      return !(await equal(kind, value, node.value));
    default:
      return ordered(value as number | string, node.comparator, node.value);
  }
}

export async function matchesFilter(
  node: FilterNode | undefined,
  fields: FilterFields,
  record: unknown,
): Promise<boolean> {
  if (node === undefined) {
    return true;
  }
  switch (node.kind) {
    case FilterNodeKind.And:
      return await everyAsync(node.children, async (child) => matchesFilter(child, fields, record));
    case FilterNodeKind.Or:
      return await someAsync(node.children, async (child) => matchesFilter(child, fields, record));
    case FilterNodeKind.Not:
      return !(await matchesFilter(node.child, fields, record));
    default:
      return matchesRestriction(node, fields, record);
  }
}
