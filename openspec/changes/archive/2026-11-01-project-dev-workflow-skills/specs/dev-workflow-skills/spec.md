## ADDED Requirements

### Requirement: A project skill describes the whole development loop
The repository SHALL have a project skill `project-develop` that lists, in order, recording the requirement in OpenSpec, implementing, adding the 2x2 cases, running `verify`, regenerating the documentation, updating the skills and archiving, and names the skill or command to use at each step.

#### Scenario: A new requirement
- **WHEN** a reader starts work on a requirement
- **THEN** `project-develop` tells which skill and command to use at each step, starting with OpenSpec

### Requirement: Development commands exist for each area
The repository SHALL have the commands `/dev:verify`, `/dev:test`, `/dev:capability`, `/dev:docs`, `/dev:status` and `/dev:self-update` in `.claude/commands/dev`, each with a `name`, a `description` and a `Skill:` line naming an existing project skill.

#### Scenario: Command names a missing skill
- **WHEN** a command names a skill folder that does not exist
- **THEN** the agent knowledge check fails and names the command and the skill

#### Scenario: Command not listed
- **WHEN** a command file exists that `CLAUDE.md` does not list
- **THEN** the agent knowledge check fails and names the command

### Requirement: The status command prints live numbers
`/dev:status` SHALL run a script that prints the open OpenSpec changes with task progress, the units still listed in `testing/unit-debt.json`, whether coverage is blocking, the number of test files per tier, the number of skills and commands, and how far `HEAD` is from `origin/main`, each read from the repository and its tools at run time.

#### Scenario: Open change
- **WHEN** an OpenSpec change is open with 3 of 5 tasks done
- **THEN** the status prints the change name and 3/5

#### Scenario: No tool output invented
- **WHEN** a source of a number cannot be read
- **THEN** the status prints that the number is unavailable and exits 1

### Requirement: Agents invoke the matching skill before work in an area
`CLAUDE.md` and `AGENTS.md` SHALL tell the reader to invoke the matching project skill before working in an area and to use the commands of `/dev`.

#### Scenario: Guide lacks the rule
- **WHEN** `CLAUDE.md` does not mention the `/dev` commands
- **THEN** the agent knowledge check fails

### Requirement: The self-update skill states when and how to update the skills
`project-self-update` SHALL have a section "When to update" and a section "How to update", covering at least a changed mapped path, an added or removed script, rule, check or command, a statement found wrong while working, an archived change and a standing rule stated by the user.

#### Scenario: Skill without the sections
- **WHEN** `project-self-update` lacks either section
- **THEN** the agent knowledge check fails
