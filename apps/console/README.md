# @platform/console

A read-only admin console built from existing parts: Refine (headless) for the `authProvider`, `dataProvider` and `liveProvider` structure, shadcn/ui-style components on Tailwind, Recharts for the chart, TanStack Table with TanStack Virtual for the log.

- **Sign-in** is the authorization-code flow with PKCE against the configured provider. The token lives in a closure only: not in local storage, session storage or a cookie, so a reload signs the user out. Only the PKCE verifier and state cross the redirect, in session storage. The `check` method passes only for a token holding the `admin` scope.
- **Data** is read-only: the data provider implements `getList` and `getOne` as GET requests with the bearer token, and `create`, `update` and `deleteOne` are refused. Without the admin scope it returns nothing and sends nothing.
- **Live requests** use a small `liveProvider` over the admin SSE stream. A native `EventSource` cannot send an `Authorization` header and the token must never go in the query string, so the provider reads the stream with `fetch`. Each event is validated against the shared schema; a malformed one is dropped and counted.
- **Views**: live request stream, request log with kind and capability filters and virtualized rows, statistics with totals and a chart by capability.

The DOM tests live in `dom/` and are run on their own with `bun run test:console`, because registering a DOM would replace the globals other test files rely on.
