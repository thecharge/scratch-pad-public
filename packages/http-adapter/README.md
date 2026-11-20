# @platform/http-adapter

Projects every registered capability onto a Hono route under `/v1`. The adapter translates the wire format and the errors and nothing else: it calls the shared pipeline and holds no policy, masking, rate limit or cache logic (a test reads the source and fails if it imports one).

- Routes come from `routeFor` in `@platform/aip`: the AIP method kind decides the HTTP method and path; `:verb` custom methods and `:batchGet` style batch methods are supported.
- Hono treats `:` as a parameter marker, so the `fetch` wrapper matches the public path itself and rewrites `/v1/publishers/p1/books/b1:archive` to an internal `/_verbs/archive` path before routing. An undeclared verb is `NOT_FOUND`, a declared verb with the wrong HTTP method is 405 with an `Allow` header.
- The input is the path (`name` or `parent`), the query and the JSON body merged, with snake_case keys normalized. Query strings are coerced to the type the input schema asks for.
- Errors become AIP-193 bodies. A 401 carries the `WWW-Authenticate` challenge, a 429 carries `Retry-After`.
- Nothing is built until the first request: the route table loads capabilities through the lazy registry on first use.
