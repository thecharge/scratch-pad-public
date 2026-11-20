export const DEFAULT_SHUTDOWN_TIMEOUT_MS = 10_000;
export const FORCED_EXIT_CODE = 1;
export const CLEAN_EXIT_CODE = 0;
export const REINDEX_DEFAULT_STEP_MS = 0;
export const REINDEX_RATE_LIMIT = 5;
export const REINDEX_RATE_WINDOW_MS = 60_000;
export const RATE_LIMIT_PROBE_CALLS = REINDEX_RATE_LIMIT + 1;

export enum SchemaKey {
  Type = "type",
  Properties = "properties",
  Required = "required",
  Items = "items",
  Enum = "enum",
  AnyOf = "anyOf",
  Const = "const",
}

export enum SchemaType {
  String = "string",
  Number = "number",
  Integer = "integer",
  Boolean = "boolean",
  Array = "array",
  Object = "object",
  Null = "null",
}

export enum ExampleIo {
  Input = "input",
  Output = "output",
}

export const SAMPLE_STRING = "string";
export const SAMPLE_NUMBER = 0;
export const EXAMPLE_NAME = "default";
export const EXAMPLES_KEY = "examples";

export enum SchemaUnrepresentable {
  Any = "any",
}
