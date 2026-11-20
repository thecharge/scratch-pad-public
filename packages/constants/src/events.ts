export enum EventKind {
  Request = "request",
  Decision = "decision",
  Error = "error",
  Cache = "cache",
  Mask = "mask",
}

export enum LogLevel {
  Trace = "trace",
  Debug = "debug",
  Info = "info",
  Warn = "warn",
  Error = "error",
  Fatal = "fatal",
}

export enum AppEnvironment {
  Development = "development",
  Test = "test",
  Production = "production",
}

export enum DiscriminatorKey {
  Kind = "kind",
}
