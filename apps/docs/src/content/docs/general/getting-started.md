---
title: "Getting started"
description: "The addresses every example uses, where they come from and how to authenticate."
generated: true
---

:::caution
The public address of the console, api, mcp, docs is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.
:::

Every example in this documentation uses the addresses below. Replace `<YOUR_ACCESS_TOKEN>` in a command with an access token that has the scopes the page lists.

| Surface | Address | Source |
| --- | --- | --- |
| console | `http://localhost:5173` | local address, the public address is not set |
| api | `https://localhost:8443` | local address, the public address is not set |
| mcp | `https://localhost:8443/mcp` | local address, the public address is not set |
| docs | `http://localhost:4321` | local address, the public address is not set |

To set a public address, edit packages/config/factual-urls.json and build the documentation again.