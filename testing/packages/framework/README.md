# @platform/test-framework

Test support, exempt from the raw-string rule (fixtures need literals) but not from the type rules.

- `createTestIssuer()` makes a throw-away EdDSA issuer with its own key id: `issue({ scopes, … })`, `keys` for a provider, `jwks` for assertions.
- `thrownBy(fn)` returns whatever `fn` throws or rejects with, so tests assert on errors without `try`: `expect(await thrownBy(() => run())).toMatchObject({ code })`.
