# Architecture

How one capability definition becomes every interface.

A capability is declared once with Zod schemas for input and output, an explicit auth mode, and optional `policy`, `mask`, `cache` and `rateLimit` blocks. Adapters translate the wire format and hold no business or security logic; everything else lives in one shared pipeline.

```mermaid
flowchart TB
    CAP["Capability definition<br/>zod in/out, AIP kind, auth mode,<br/>optional policy, mask, cache, rate limit"]
    CAP --> HTTP["Hono route"]
    CAP --> MCP["MCP tool"]
    CAP --> OAS["OpenAPI 3.1"]
    CAP --> SKILL["Agent skill"]
    CAP --> DOCS["Reference and walkthroughs"]
    HTTP --> PIPE
    MCP --> PIPE
    subgraph PIPE["Shared pipeline"]
        direction LR
        A1["auth"] --> A2["rate limit"] --> A3{{"policy?"}} --> A4["validate"] --> A5["cache"] --> A6["handler"] --> A7{{"mask?"}} --> A8["observe"]
    end
```

Policy and masking are separate steps that share only the principal type. A capability that declares neither skips both. A declared block with no implementation fails closed before the handler runs.

## Lazy and bounded

Capabilities register a loader, so a capability's module is imported on first use. Anything the process remembers (cache entries, rate-limit windows, idempotency records, operations) lives in a bounded, expiring store, so memory cannot grow without limit.

See [authentication](./auth-modes.md) for who is allowed in, and [policy and masking](./policy-and-masking.md) for what they may do and see.
