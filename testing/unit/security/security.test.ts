import { describe, expect, test } from "bun:test";
import { CanonicalCode, ErrorReason, HttpHeader } from "@platform/constants";
import { originValidation, securityHeaders } from "@platform/security";
import { Hono } from "hono";

async function app() {
  const server = new Hono();
  server.use(await securityHeaders());
  server.use(
    await originValidation({ allowedOrigins: ["https://app.example.com"], domain: "api.test" }),
  );
  server.get("/x", (context) => context.json({ ok: true }));
  return server;
}

describe("security headers", () => {
  test.each([
    ["x-content-type-options", "nosniff"],
    ["x-frame-options", "DENY"],
    ["referrer-policy", "no-referrer"],
    ["strict-transport-security", "max-age="],
    ["content-security-policy", "default-src 'none'"],
  ])("every response carries %s", async (header, fragment) => {
    expect((await (await app()).request("/x")).headers.get(header)).toContain(fragment);
  });
});

describe("origin validation", () => {
  test.each([
    ["no Origin header (not a browser)", {}],
    ["an allowed origin", { [HttpHeader.Origin]: "https://app.example.com" }],
  ])("lets through %s", async (_name, headers) => {
    expect((await (await app()).request("/x", { headers })).status).toBe(200);
  });

  test("another origin is PERMISSION_DENIED with an AIP-193 body", async () => {
    const response = await (await app()).request("/x", {
      headers: { [HttpHeader.Origin]: "https://evil.example.com" },
    });
    expect(response.status).toBe(403);
    const { error } = await response.json();
    expect(error.status).toBe(CanonicalCode.PermissionDenied);
    expect(error.details).toMatchObject([
      { reason: ErrorReason.OriginNotAllowed, metadata: { origin: "https://evil.example.com" } },
    ]);
  });
});
