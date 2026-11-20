export enum AipParam {
  PageSize = "pageSize",
  PageToken = "pageToken",
  NextPageToken = "nextPageToken",
  OrderBy = "orderBy",
  Filter = "filter",
  View = "view",
  ShowDeleted = "showDeleted",
  UpdateMask = "updateMask",
  Etag = "etag",
  AllowMissing = "allowMissing",
  RequestId = "requestId",
  ValidateOnly = "validateOnly",
  Force = "force",
}

export enum ResourceView {
  Basic = "BASIC",
  Full = "FULL",
}

export enum FieldBehavior {
  Required = "REQUIRED",
  Optional = "OPTIONAL",
  OutputOnly = "OUTPUT_ONLY",
  InputOnly = "INPUT_ONLY",
  Immutable = "IMMUTABLE",
}

export enum MethodKind {
  Get = "get",
  List = "list",
  Create = "create",
  Update = "update",
  Delete = "delete",
  Custom = "custom",
  BatchGet = "batchGet",
  BatchCreate = "batchCreate",
  BatchUpdate = "batchUpdate",
  BatchDelete = "batchDelete",
}

export const CUSTOM_VERB_SEPARATOR = ":";

export enum Separator {
  Resource = "/",
  Key = ":",
  FieldPath = ".",
  List = ",",
  Detail = ": ",
  Space = " ",
  Parameter = ";",
  Platform = "-",
  ListSpaced = ", ",
}

export enum BlockName {
  Policy = "policy",
  Mask = "mask",
  RateLimit = "rateLimit",
  Cache = "cache",
}

export enum ZodIssueCode {
  UnrecognizedKeys = "unrecognized_keys",
}

export enum HashAlgorithm {
  Sha256 = "sha256",
}

export enum DigestEncoding {
  Hex = "hex",
}

export enum FilterKeyword {
  And = "AND",
  Or = "OR",
  Not = "NOT",
}

export enum FilterComparator {
  LessEquals = "<=",
  LessThan = "<",
  GreaterEquals = ">=",
  GreaterThan = ">",
  NotEquals = "!=",
  Equals = "=",
  Has = ":",
}

export enum Glyph {
  Minus = "-",
  LeftParen = "(",
  RightParen = ")",
  Comma = ",",
  Dot = ".",
  Colon = ":",
  Star = "*",
  SingleQuote = "'",
  DoubleQuote = '"',
  Backslash = "\\",
  Space = " ",
  Equals = "=",
}

export enum OrderDirection {
  Ascending = "asc",
  Descending = "desc",
}

export const FULL_REPLACEMENT_MASK = "*";

export enum CollectionName {
  Operations = "operations",
}

export const BATCH_MAX_ITEMS = 1000;
export const OPERATION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const DURATION_SUFFIX = "s";
export const WEAK_ETAG_PREFIX = "W/";

export enum CryptoAlgorithm {
  AesGcm = "AES-GCM",
}

export enum KeyFormat {
  Raw = "raw",
}

export enum KeyUsage {
  Encrypt = "encrypt",
  Decrypt = "decrypt",
}

export enum Encoding {
  Base64Url = "base64url",
  Utf8 = "utf8",
}

export const PAGE_TOKEN_IV_BYTES = 12;
export const PAGE_TOKEN_KEY_BYTES = 32;

export enum FilterNodeKind {
  And = "and",
  Or = "or",
  Not = "not",
  Restriction = "restriction",
}

export enum FilterFieldKind {
  String = "string",
  Number = "number",
  Boolean = "boolean",
  Timestamp = "timestamp",
  Duration = "duration",
  Enum = "enum",
  StringList = "stringList",
}

export enum FilterLiteral {
  True = "true",
  False = "false",
}

export enum FilterTokenKind {
  LeftParen = "leftParen",
  RightParen = "rightParen",
  Comparator = "comparator",
  Minus = "minus",
  Keyword = "keyword",
  Quoted = "quoted",
  Text = "text",
  End = "end",
}

export const OPERATION_ID_PREFIX = "op-";
export const ETAG_QUOTE = '"';
export const ETAG_HASH_CHARS = 16;

export const OPERATION_WAIT_MAX_MS = 30_000;
export const OPERATION_POLL_MS = 25;
export const OPERATION_EVENT_NAME = "operation";
export const OPERATION_FIELD_NAME = "name";
export const OPERATION_FIELD_DONE = "done";
export const OPERATION_DURATION_PATTERN = /^\d+(\.\d+)?s$/;
export const OPERATION_DURATION_UNIT = "s";
export const MILLISECONDS_PER_SECOND = 1000;

export enum CapabilityId {
  OperationsGet = "operations.get",
  OperationsList = "operations.list",
  OperationsDelete = "operations.delete",
  OperationsCancel = "operations.cancel",
  OperationsWait = "operations.wait",
  OperationsWatch = "operations.watch",
}

export enum ResourcePattern {
  Operation = "operations/{operation}",
  OperationCollection = "operations",
}

export const RESOURCE_ID_PATTERN = /^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;
export const COLLECTION_ID_PATTERN = /^[a-z][a-zA-Z0-9]*$/;
export const PARAM_SEGMENT_PATTERN = /^\{(\w+)\}$/;
export const MAX_DISPLAY_NAME_CODE_POINTS = 63;

export enum RouteScope {
  Item = "item",
  Collection = "collection",
  Declared = "declared",
}

export enum InputField {
  Name = "name",
  Parent = "parent",
}

export const VERB_PATH_SEGMENT = "_verbs";
export const ID_FIELD_SUFFIX = "Id";
export const ROUTE_PARAM_PREFIX = ":";

export enum PathStyle {
  OpenApi = "openapi",
  Router = "router",
}

export enum RouteOutcome {
  Matched = "matched",
  NotFound = "notFound",
  UnknownVerb = "unknownVerb",
  WrongMethod = "wrongMethod",
}
