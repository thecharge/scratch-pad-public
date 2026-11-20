---
name: greeting-guide
description: Greet a person by name through the platform, by HTTP or as an MCP tool. Use when a task needs a greeting such as hello or a shouted greeting.
metadata:
  auth: none
---

# Greeting guide

A greeting name has the form `greetings/{greeting}`, for example `greetings/hello`.

The tool `greetings.get` returns the greeting text. It is also an HTTP route. The tool `greetings.shout` returns the same text in capital letters and exists only as an MCP tool.
