# @platform/flags

Feature flags through the OpenFeature API. `createFlags(values, kind)` builds a `FeatureFlags` client: `enabled(key)` evaluates a boolean flag and falls back to the default in `FLAG_DEFAULTS` for a key the provider does not know, and `set(values)` changes flags while the service runs. The provider is chosen by `FlagProviderKind`; the in-memory provider reads its values from the `FEATURE_FLAGS` setting (`key=true,other=false`).

A capability is gated by naming a flag in its `flag` field. When the flag is off, the capability is not served and the caller gets a not-found error with the reason `CAPABILITY_DISABLED`. Every flag is listed on the generated feature flags page of the documentation, with a generated on and off step.
