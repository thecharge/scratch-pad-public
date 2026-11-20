# tooling/scripts

The scripts behind the hooks and `bun run verify`.

`download-tool.ts` verifies downloaded archive bytes against pinned checksums. `install-tools.ts` installs verification binaries; Pulumi installation belongs to `apps/infra/src/tools.ts`, reached by root `tools:install` through the infrastructure CLI.

| Script                | What it does                                                       |
| --------------------- | ------------------------------------------------------------------ |
| `verify.ts`           | Runs every check in `VERIFY_COMMANDS` and reports all failures     |
| `check-structure.ts`  | Two-level nesting, object nesting and flat-test rules (oxc-parser) |
| `check-rules.ts`      | Every development rule has a blocking hook job and a verify step   |
| `check-readmes.ts`    | Every package has a README                                         |
| `check-repo.ts`       | Manifests are private, no license, required documents exist        |
| `check-mermaid.ts`    | Parses every Mermaid block in Markdown                             |
| `lint-workflows.ts`   | No GitHub workflow file exists                                     |
| `secret-scan.ts`      | One wrapper around the secret scanner (staged, repo, stdin)        |
| `install-gitleaks.ts` | Downloads the pinned gitleaks release and verifies its checksum    |

Scripts obey the same rules as packages: no inline strings, no local types, two levels of nesting.
