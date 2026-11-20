# @platform/test-factories

Case factories for the 2x2 rule. Second layer of the testing stack: it depends on `@platform/test-framework` only.

- `positive(name, args, expected)` is a case where the unit returns `expected`.
- `negative(name, args, expected)` is a case where the unit throws or rejects with an error matching `expected`.
- `rejected(name, args, expected)` is a case where the unit returns a failure value.
- `unit(subject, { positive: [...], negative: [...] })` registers two `test.each` tables; each table needs at least two cases, enforced by `UnitSuiteSchema` at run time and by `tooling/scripts/check-unit-cases.ts` before commit.
