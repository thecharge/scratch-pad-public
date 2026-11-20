export enum CanonicalCode {
  Ok = "OK",
  Cancelled = "CANCELLED",
  Unknown = "UNKNOWN",
  InvalidArgument = "INVALID_ARGUMENT",
  DeadlineExceeded = "DEADLINE_EXCEEDED",
  NotFound = "NOT_FOUND",
  AlreadyExists = "ALREADY_EXISTS",
  PermissionDenied = "PERMISSION_DENIED",
  Unauthenticated = "UNAUTHENTICATED",
  ResourceExhausted = "RESOURCE_EXHAUSTED",
  FailedPrecondition = "FAILED_PRECONDITION",
  Aborted = "ABORTED",
  OutOfRange = "OUT_OF_RANGE",
  Unimplemented = "UNIMPLEMENTED",
  Internal = "INTERNAL",
  Unavailable = "UNAVAILABLE",
  DataLoss = "DATA_LOSS",
}

export const CANONICAL_CODE_HTTP_STATUS: Readonly<Record<CanonicalCode, number>> = {
  [CanonicalCode.Ok]: 200,
  [CanonicalCode.Cancelled]: 499,
  [CanonicalCode.Unknown]: 500,
  [CanonicalCode.InvalidArgument]: 400,
  [CanonicalCode.DeadlineExceeded]: 504,
  [CanonicalCode.NotFound]: 404,
  [CanonicalCode.AlreadyExists]: 409,
  [CanonicalCode.PermissionDenied]: 403,
  [CanonicalCode.Unauthenticated]: 401,
  [CanonicalCode.ResourceExhausted]: 429,
  [CanonicalCode.FailedPrecondition]: 400,
  [CanonicalCode.Aborted]: 409,
  [CanonicalCode.OutOfRange]: 400,
  [CanonicalCode.Unimplemented]: 501,
  [CanonicalCode.Internal]: 500,
  [CanonicalCode.Unavailable]: 503,
  [CanonicalCode.DataLoss]: 500,
};

export enum ErrorReason {
  AcceptRequired = "ACCEPT_REQUIRED",
  AcceptUnsupported = "ACCEPT_UNSUPPORTED",
  ContentTypeRequired = "CONTENT_TYPE_REQUIRED",
  ContentTypeUnsupported = "CONTENT_TYPE_UNSUPPORTED",
  ProxyRequired = "PROXY_REQUIRED",
  AuthNotEnabled = "AUTH_NOT_ENABLED",
  TokenMissing = "TOKEN_MISSING",
  TokenInvalid = "TOKEN_INVALID",
  TokenExpired = "TOKEN_EXPIRED",
  PolicyDenied = "POLICY_DENIED",
  RateLimited = "RATE_LIMITED",
  ValidationFailed = "VALIDATION_FAILED",
  UnknownField = "UNKNOWN_FIELD",
  ResourceNotFound = "RESOURCE_NOT_FOUND",
  ResourceExists = "RESOURCE_ALREADY_EXISTS",
  EtagMismatch = "ETAG_MISMATCH",
  InvalidTransition = "INVALID_STATE_TRANSITION",
  UnknownVerb = "UNKNOWN_VERB",
  MethodNotAllowed = "METHOD_NOT_ALLOWED",
  InternalError = "INTERNAL_ERROR",
  InvalidFilter = "INVALID_FILTER",
  InvalidOrderBy = "INVALID_ORDER_BY",
  InvalidFieldMask = "INVALID_FIELD_MASK",
  InvalidPageToken = "INVALID_PAGE_TOKEN",
  InvalidPageSize = "INVALID_PAGE_SIZE",
  InvalidResourceName = "INVALID_RESOURCE_NAME",
  InvalidResourceId = "INVALID_RESOURCE_ID",
  BatchTooLarge = "BATCH_TOO_LARGE",
  FieldImmutable = "FIELD_IMMUTABLE",
  OperationNotFound = "OPERATION_NOT_FOUND",
  OperationCancelled = "OPERATION_CANCELLED",
  RequiredFieldMissing = "REQUIRED_FIELD_MISSING",
  OriginNotAllowed = "ORIGIN_NOT_ALLOWED",
  HasChildren = "HAS_CHILDREN",
  CapabilityDisabled = "CAPABILITY_DISABLED",
}

export enum ErrorDetailType {
  ErrorInfo = "type.googleapis.com/google.rpc.ErrorInfo",
}

export const ERROR_REASON_PATTERN = /^[A-Z][A-Z0-9_]+[A-Z0-9]$/;
export const ERROR_REASON_MAX_LENGTH = 63;

export const NOT_ACCEPTABLE_STATUS = 406;
export const UNSUPPORTED_MEDIA_TYPE_STATUS = 415;
export const REASON_HTTP_STATUS: Readonly<Partial<Record<ErrorReason, number>>> = {
  [ErrorReason.AcceptUnsupported]: NOT_ACCEPTABLE_STATUS,
  [ErrorReason.ContentTypeUnsupported]: UNSUPPORTED_MEDIA_TYPE_STATUS,
};

export enum ErrorMetadataKey {
  Header = "header",
  RetryAfterSeconds = "retryAfterSeconds",
  Origin = "origin",
}
