## Context

The single-host revision retains its original API, SDK, Caddy, SQLite, local identity fixture, test scenarios and client docs. The later documentation publication code can be taken independently of the later distributed services.

## Goals / Non-Goals

Keep the existing applications, interfaces and verification. Exercise actual installed SDK and signed test identity over Caddy. Preserve failed-candidate publication refusal. This snapshot has no deployment against a public endpoint.

## Decisions

Use the original single-host source baseline and retain the original guarded docs publisher from the subsequent repository revision. Keep local test identities and generic auth support. Exclude proprietary platform plans and captures from the snapshot.

## Risks / Trade-offs

A retained fixture, generated guide or passing unit test cannot replace a fresh end-to-end run on the trimmed snapshot.
