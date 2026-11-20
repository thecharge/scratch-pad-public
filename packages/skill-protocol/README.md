# @platform/skill-protocol

Publishes the capability registry as MCP skills (SEP-2640) through the SDK's `SkillsExtension` and a custom `SkillSource`. The skill files are generated from the registry: one skill per resource collection, with a `SKILL.md` that lists the capabilities and one reference file per capability holding its input and output JSON Schema. No scripts, hooks or `allowed-tools` are ever generated. `skillEntry()` computes the digests and sizes, so a changed capability changes its digest.

- `list`, `get` and `read` all receive the request context. `getPrincipal(ctx)` reads `ctx.http?.authInfo` (the field the installed SDK declares) and falls back to anonymous, so an unauthenticated `skills/list` shows only skills the caller may use. Capabilities that need a token (or that the visibility rule hides) are left out of the files too.
- Skills are generated when asked for, never at startup.
- `skillFilesFor(group)` is also used by the build script that writes the files to `dist/skills` for the docs site.
