---
name: "DEV: Capability"
description: Add or change a capability served over HTTP, MCP, OpenAPI and skills
category: Development
tags: [development, capability]
---

Add or change a capability.

Skill: project-capabilities

**Input**: The capability name after `/dev:capability`, for example `books.archive`.

**Steps**

1. Confirm the requirement is in an open OpenSpec change (`project-develop`).
2. Follow `project-capabilities`: define the capability once; the route, the MCP tool, the OpenAPI operation, the skill and the documentation page are derived from it.
3. Add the cases (`/dev:test`), then run `/dev:verify`. After an intended API change run `bun run openapi:update` and commit the new baseline.
4. Run `/dev:self-update` for the skills that describe the changed paths.

For a binary upload, declare `media` on the capability, keep upload HTTP only, and pass its raw stream through the adapter. Check the checksum header, configured media and size limits, cancellation cleanup, owner policy and streamed SDK helpers. The asset suite proves multipart and signed downloads through Caddy; its recording generates the client asset guide.
