# @platform/capability

`defineCapability()` validates and freezes one capability; `CapabilityRegistry` stores them and lists them in id order (as MCP `tools/list` requires).

- The `auth` mode is mandatory: `none`, `optional` or `required`.
- A custom method needs a `customVerb`; a standard method must not have one.
- `withBehavior(schema, FieldBehavior.OutputOnly)` annotates a field (AIP-203); `fieldBehaviors(schema)` reads them back.
