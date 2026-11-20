import {
  CanonicalCode,
  ErrorReason,
  MessageId,
  OrderDirection,
  Separator,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import type { OrderTerm } from "@platform/types";
import { all } from "@platform/util";

const WHITESPACE = /\s+/;
const DIRECTIONS: readonly string[] = Object.values(OrderDirection);

async function invalid(detail: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.InvalidOrderBy,
    MessageId.InvalidOrderBy,
    { detail },
  );
}

async function parseTerm(rawTerm: string, allowed: ReadonlySet<string>): Promise<OrderTerm> {
  const [path, direction, ...rest] = rawTerm
    .trim()
    .split(WHITESPACE)
    .filter((part) => part.length > 0);
  const valid =
    path !== undefined &&
    rest.length === 0 &&
    allowed.has(path) &&
    (direction === undefined || DIRECTIONS.includes(direction));
  if (!valid) {
    throw await invalid(rawTerm.trim());
  }
  return { path, direction: (direction as OrderDirection | undefined) ?? OrderDirection.Ascending };
}

export async function parseOrderBy(
  text: string | undefined,
  allowed: ReadonlySet<string>,
): Promise<OrderTerm[]> {
  if (text === undefined || text.trim().length === 0) {
    return [];
  }
  return all(text.split(Separator.List).map((rawTerm) => async () => parseTerm(rawTerm, allowed)));
}

function valueAt(record: unknown, path: string): unknown {
  return path.split(Separator.FieldPath).reduce<unknown>((current, segment) => {
    const isObject = current !== null && Object(current) === current;
    return isObject ? (current as Record<string, unknown>)[segment] : undefined;
  }, record);
}

function compareValues(a: unknown, b: unknown): number {
  if (a === b) {
    return 0;
  }
  if (a === undefined || a === null) {
    return -1;
  }
  if (b === undefined || b === null) {
    return 1;
  }
  return (a as number | string) < (b as number | string) ? -1 : 1;
}

export function comparatorFor(terms: readonly OrderTerm[]): (a: unknown, b: unknown) => number {
  function compare(a: unknown, b: unknown): number {
    const decisive = terms
      .map((term) => {
        const result = compareValues(valueAt(a, term.path), valueAt(b, term.path));
        return term.direction === OrderDirection.Descending ? -result : result;
      })
      .find((result) => result !== 0);
    return decisive ?? 0;
  }
  return compare;
}
