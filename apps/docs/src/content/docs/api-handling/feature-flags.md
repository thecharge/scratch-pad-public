---
title: "Feature flags"
description: "Each feature flag, its default and what it switches."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

Feature flags are read through OpenFeature. A flag set in the FEATURE_FLAGS setting turns a capability on or off without a code change. Each flag below has a page of generated steps that show both states.

## books-suggest

Default: off. The capability books.suggest is served only while the flag is on. While the flag is off, the API answers 404 with the reason CAPABILITY_DISABLED.

Steps for both states: [Feature flags](/api-handling/feature-flag-books-suggest/).
