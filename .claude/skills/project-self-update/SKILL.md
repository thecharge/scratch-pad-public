---
name: project-self-update
description: Keep the project skills and commands correct. Use after any change to the project, and when the skills-fresh hook fails.
---

# Self-update

The skills and commands describe the project; they must change when the project changes.

Edit the canonical project skills in `.claude/skills`; the links in `.codex/skills` and `.agents/skills` expose those same files. Keep the links relative and preserve a single source.

## When to update

Update the skills and commands in the same commit as the change, in each of these cases:

- A path listed in `skill-paths.json` changed. The `skills-fresh` pre-commit job fails the commit otherwise.
- A script, rule, check, hook, command or skill was added, removed or renamed.
- You found a statement in a skill or command that is wrong while working. Fix it at once; do not leave it for later.
- An OpenSpec change was archived: the open work, the counts and the status in the guides change.
- The user stated a standing rule. Record it in `CLAUDE.md`, `AGENTS.md`, the matching skill and the memory before doing anything else.
- A step of a command no longer matches the script it runs.

Do not update a skill for a change that touches no mapped path and no statement in it.

## How to update

1. Read `.claude/skills/skill-paths.json`. It maps each skill to the paths it describes.
2. List the files you changed (`git diff --name-only origin/main`).
3. For every skill whose paths match a changed file, open `SKILL.md` and make every statement about that area true again: commands, files, rules, open work. Quote nothing from memory; read the changed files.
4. If you added an area no skill covers, add a skill folder with a `SKILL.md` (frontmatter `name` equal to the folder name, and `description`), add it to `skill-paths.json`, to the table in `CLAUDE.md` and to the skills list in `AGENTS.md` if it names them.
5. A check script is an async function; use the helpers of `@platform/store` when a callback awaits. When you add a check script, add its path (and the config file it reads) to the paths of the skill that describes it, for example `tooling/scripts/check-async-functions.ts` and `async-ignore.json` under `project-rules-and-hooks`. A path listed for a skill may be a glob (`packages/skills/**`); `packages/util/**`, `promise-all-ignore.json` and `tooling/scripts/check-package-graph.ts` are listed under `project-rules-and-hooks`. A new check script is listed under the skill of its area, for example `tooling/scripts/check-skill-packages.ts` under `project-mcp-skills`.
6. If a command or skill in `.claude/commands` describes the changed area, update it in the same commit.
7. Run `bun run tooling/scripts/check-skills-fresh.ts` and `check-agent-knowledge.ts`.

## The hook

The pre-commit job `skills-fresh` fails a commit that changes paths listed in `skill-paths.json` without changing the matching skill or a command.

The agent knowledge check runs its parallel work with `all` from `@platform/util`.

`checkAgentKnowledge(root?)` and `checkSkillsFresh(args?, root?)` return exit codes and take a fixture root, so the unit suites cover them.

## Files

The verification planner, input inspector, report writer and their policy contracts map to `project-rules-and-hooks`. The explain command and full verification entry point also require the setup and verification skill and `/dev:verify` command to stay current.

`tooling/scripts/verification-timing.ts` maps to `project-testing`; update that skill when changing timing collection or report behavior.

The bounded audit runner maps to `project-setup-and-verify`; update its retry policy and required executable there when changing the runner.

Infrastructure paths map to `project-stack`; keep its command and canonical skill current when changing development containers or stack lifecycle commands.

The shared tool downloader maps to `project-setup-and-verify`; Pulumi installation is covered by the infrastructure path mapping.

The untracked-file check maps to `project-rules-and-hooks`, and the SDK generator configuration maps to `project-openapi-sdk`.

The OpenSpec integrity check and `openspec/config.yaml` are mapped to `project-rules-and-hooks`. Changes to that mapping also require updating this skill. Validate the changed file list explicitly with `check-skills-fresh.ts` during a review, because its default input is staged files only.

`.claude/skills/skill-paths.json`, `tooling/scripts/check-skills-fresh.ts`, `tooling/scripts/check-agent-knowledge.ts`.

The user-authorized alternative `bun run ship:fast` accepts source changes and keeps all static checks, security checks, unit tests and integration tests blocking. Its verification budget is 55 seconds. Normal pushes and `bun run verify` retain full E2E, coverage and documentation production. The fast lane reports its reduced scope and does not claim a fresh full audit.

Push update parsing and its constants and Zod contracts map to `project-rules-and-hooks`. Keep stdin forwarding, conservative unsupported-update behavior and `.stack/verify/push.json` documentation current when changing those files.

The live asset page generator maps to `project-docs`; update its recording, failure and publication behavior with that skill.

The MCP recording page generator maps to `project-docs`, alongside the live asset generator.

The source evidence checker, contracts, policy and active-change source indexes map to `project-rules-and-hooks`. Changes to reviewed prose require updating its recorded digest and final table after checking the underlying source; do not accept a changed live hash automatically.

The shared AST helper maps to `project-rules-and-hooks`; preserve schema validation for every candidate node when changing traversal performance.

When changing recorded response rendering, update project-docs and retain concrete-URL regression cases. Large chunk transcripts and assembled responses keep their complete text while avoiding unnecessary syntax highlighting. API composition coverage remains in the real proxy integration suite.

The AST helper offers an explicit cache owned by a single parsed-tree inspection. Structure and hygiene traversal forward that cache; no cache persists between commands. Update rule skills and scoped validation cases when changing this traversal.

The structure command parses each file once for errors and warnings, sharing only that fresh tree and its validated children. Combined-output regressions compare both results with independent calls. Hygiene predicates return immediately for node kinds they cannot match; every node is still visited.

Promise.all findings use an explicit depth-first work list, retaining source order and complete child validation while avoiding recursive promise and result-array allocation. The full repository scan retains its five-second test deadline.

Fast unit scheduling starts the two whole-repository scanner suites in their own process, within the same four-worker cap. SDK, common units, other tooling and console groups still run completely. Exact once-only discovery regressions cover full and fast grouping; this isolation retains scan deadlines under concurrent fixture allocation.

Browser proxy entry waits within the existing step timeout until Linux reports no tentative IPv6 address before launching Chromium. The readiness predicate has two positive and two negative stubbed cases. The proxy hostname maps to its inspected edge address while TLS validation and every UI assertion remain unchanged. Request-error evidence retains the actual browser failure reason. No scenario retry or error suppression is added.

Fast unit orchestration completes its initial scanner group before starting the other unit groups. The same unit files and assertions run exactly once; the rest keep the four-worker limit. Focused acceptance uses check:run --stack because the existing interface fixture needs the engine socket.

An earlier measured attempt completed SDK preparation and the full unit tier before the parallel phase. It retained all checks but exceeded the budget. The current partitioned schedule serializes only SDK preparation and scanner tests, then runs the remaining units and checks within the fixed worker limit.

The measured complete-unit serial attempt passed every check but exceeded the budget. The final fast schedule serializes SDK preparation and the unit-scans phase only; --fast-scans and --fast-rest form disjoint, complete partitions. The remaining units overlap integration and static checks. Entry forwarding, exact discovered-file union, empty intersection and scanner completion are regression tested. Both partitions are mandatory and failures in either block delivery. Normal unit commands and the full audit still run every unit in one invocation.

The documentation skill maps the guide display boundary and every guide writer. Update those instructions when raw capture, placeholder labelling or representative stream presentation changes. Raw evidence and assertion fidelity remain required.

Formatting verification checks comments in one read-only batch, then runs the complete non-incremental dprint check. Both results block delivery. Pre-commit retains comment cleanup. The per-file exec formatter was replaced to avoid starting a runtime for every source file; no prior result substitutes for either check.

stream-all-responses is complete with all 59 tasks proved and six delta specs synchronized. Its durable requirement audit and raw evidence are archived under openspec/changes/archive/2026-11-08-stream-all-responses. Keep runtime recordings in .stack rather than recreating the active change.

Typed product catalogs, service dependency selection and their constants/contracts map to project-stack. Update the catalog validation and derived route/documentation behavior there when changing those files.

The document scope, index comparison, shipment executor, local-link checker and shared contracts map to project-rules-and-hooks. Keep its canonical skill and the setup/documentation guides accurate when selection changes. Timing reports do not prove the warm/cold acceptance targets until real hooks have been measured.

When retiring a source module, remove its exact path from the skill map and update the owning skill so the freshness check can verify the change.
