import { expect } from "bun:test";
import { createJwksProvider } from "@platform/auth";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  ErrorReason,
  HttpHeader,
  McpEra,
  MessageId,
  MethodKind,
  PrincipalKind,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { createMcpApp } from "@platform/mcp-adapter";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { createTestIssuer, settlesAs } from "@platform/test-framework";
import {
  ANONYMOUS_PRINCIPAL,
  type Capability,
  type CapabilityDefinition,
  type Invoke,
} from "@platform/types";
import { z } from "zod";
import { buildServer, principalOf } from "../../../packages/mcp-adapter/src/server.ts";
import { annotationsFor, toolHandler } from "../../../packages/mcp-adapter/src/tools.ts";

const ORIGIN = "https://api.test";
const INPUT = z.strictObject({ name: z.string() });
const BOOK = "publishers/{publisher}/books/{book}";
const ISSUER = await createTestIssuer(`${ORIGIN}/api/auth`, ORIGIN);
const PROVIDER = await createJwksProvider({
  issuer: ISSUER.issuer,
  audience: ORIGIN,
  resource: ORIGIN,
  keys: ISSUER.keys,
});
const READER_TOKEN = await ISSUER.issue({ scopes: ["read"] });
const ENVELOPE = {
  "io.modelcontextprotocol/protocolVersion": "2026-07-28",
  "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" },
  "io.modelcontextprotocol/clientCapabilities": {},
};

async function define(overrides: Partial<CapabilityDefinition<z.ZodType, z.ZodType>>) {
  return defineCapability({
    id: "books.x",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: BOOK,
    summary: "summary",
    description: "description",
    auth: AuthMode.None,
    input: INPUT,
    output: z.object({ echoed: z.string() }),
    handler: ({ name }: z.infer<typeof INPUT>) => ({ echoed: name }),
    ...overrides,
  } as CapabilityDefinition<z.ZodType, z.ZodType>);
}

const OPEN = await define({ id: "books.open" });
const PRIVATE = await define({ id: "books.private", auth: AuthMode.Required });
const REMOVE = await define({ id: "books.remove", method: MethodKind.Delete });
const LISTING = await define({ id: "books.list", method: MethodKind.List });
const CREATING = await define({ id: "books.create", method: MethodKind.Create });
const UPDATING = await define({ id: "books.update", method: MethodKind.Update });

const USER_INFO = {
  token: "t",
  clientId: "c",
  scopes: ["read"],
  extra: { sub: "u1" },
};
const USER = { kind: PrincipalKind.User, subject: "u1", scopes: ["read"], roles: [] };

const succeeding: Invoke = async () => ({ output: { echoed: "hi" }, cacheHit: false });
const scalar: Invoke = async () => ({ output: "plain", cacheHit: false });
const failing: Invoke = async () => {
  throw new ApiError(
    CanonicalCode.NotFound,
    ErrorReason.ResourceNotFound,
    MessageId.RouteNotFound,
    {
      path: "/x",
    },
  );
};
const crashing: Invoke = async () => {
  throw new Error("secret detail");
};

const AGENT_INFO = { ...USER_INFO, extra: { principal_kind: "agent" } };
const AGENT = { kind: PrincipalKind.Agent, scopes: ["read"], roles: [] };
const HINTS = {
  title: "summary",
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: false,
  openWorldHint: false,
};
const HI_TEXT = [{ type: "text", text: JSON.stringify({ echoed: "hi" }) }];
const HI_STRUCT = { echoed: "hi" };
const PLAIN_TEXT = [{ type: "text", text: JSON.stringify("plain") }];
const failureText = (matcher: unknown) =>
  expect.objectContaining({ isError: true, content: [{ type: "text", text: matcher }] });
const ANON_OPTIONS = {
  source: { list: async () => [OPEN, PRIVATE, REMOVE] },
  invoke: succeeding,
  auth: { enabled: true, provider: PROVIDER },
  domain: "api.test",
  resource: ORIGIN,
  visible: () => true,
  era: McpEra.Stateless,
  host: "localhost",
  allowedHosts: ["localhost"],
  allowedOrigins: [],
};
const HIDING = {
  ...ANON_OPTIONS,
  visible: (capability: Capability) => capability.id !== "books.remove",
};
const AUTH_OFF = { ...ANON_OPTIONS, auth: { enabled: false } };
const BROKEN_SOURCE = {
  ...ANON_OPTIONS,
  source: {
    list: async () => {
      throw new Error("source down");
    },
  },
};
const toolNames = (server: unknown) =>
  Object.keys(Reflect.get(server as object, "_registeredTools")).sort();

unit(annotationsFor, {
  positive: [
    positive("a get is read-only", [OPEN], { ...HINTS, readOnlyHint: true, idempotentHint: true }),
    positive("a delete is destructive and idempotent", [REMOVE], {
      ...HINTS,
      destructiveHint: true,
      idempotentHint: true,
    }),
  ],
  negative: [
    rejected("a create is neither read-only nor idempotent", [CREATING], HINTS),
    rejected("an update is idempotent but not destructive", [UPDATING], {
      ...HINTS,
      idempotentHint: true,
    }),
    negative("a missing capability throws", [undefined], { name: "TypeError" }),
  ],
});

unit(toolHandler, {
  positive: [
    positive(
      "a result is text and structured content",
      [OPEN, succeeding, USER, true, "r1"],
      { content: HI_TEXT, isError: false, structuredContent: HI_STRUCT },
      [{ name: "x" }],
    ),
    positive(
      "a result that is not an object has no structured content",
      [LISTING, scalar, USER, true, "r2"],
      { content: PLAIN_TEXT, isError: false },
      [{}],
    ),
  ],
  negative: [
    rejected(
      "an API error is an error result with its reason",
      [OPEN, failing, USER, true, "r3"],
      failureText(expect.stringContaining(ErrorReason.ResourceNotFound)),
      [{}],
    ),
    rejected(
      "an unexpected error leaks no detail",
      [OPEN, crashing, USER, true, "r4"],
      failureText(expect.not.stringContaining("secret detail")),
      [{}],
    ),
  ],
});

unit(principalOf, {
  positive: [
    positive("an authenticated context becomes a user", [{ authInfo: USER_INFO }], USER),
    positive("an agent claim becomes an agent", [{ authInfo: AGENT_INFO }], AGENT),
  ],
  negative: [
    rejected("no auth info is anonymous", [{}], ANONYMOUS_PRINCIPAL),
    rejected("an undefined auth info is anonymous", [{ authInfo: undefined }], ANONYMOUS_PRINCIPAL),
  ],
});

unit(buildServer, {
  positive: [
    positive(
      "an anonymous caller is offered the open tools only",
      [ANON_OPTIONS, {}],
      settlesAs(toolNames, ["books.open", "books.remove"]),
    ),
    positive(
      "a signed-in caller is offered the required tools too",
      [ANON_OPTIONS, { authInfo: USER_INFO }],
      settlesAs(toolNames, ["books.open", "books.private", "books.remove"]),
    ),
  ],
  negative: [
    rejected(
      "a visibility rule hides what it denies",
      [HIDING, {}],
      settlesAs(toolNames, ["books.open"]),
    ),
    rejected(
      "auth off hides required tools even for a signed-in caller",
      [AUTH_OFF, { authInfo: USER_INFO }],
      settlesAs(toolNames, ["books.open", "books.remove"]),
    ),
    negative("a source that fails stops the server", [BROKEN_SOURCE, {}], {
      message: "source down",
    }),
  ],
});

const POST_HEADERS = {
  [HttpHeader.ContentType]: "application/json",
  accept: "application/json, text/event-stream",
  host: "localhost",
};
const post = (headers: Record<string, string>, body: unknown) => [
  "request",
  "/mcp",
  { method: "POST", headers: { ...POST_HEADERS, ...headers }, body: JSON.stringify(body) },
];
const LIST_TOOLS = { jsonrpc: "2.0", id: 1, method: "tools/list", params: { _meta: ENVELOPE } };
const STATELESS = { "mcp-protocol-version": "2026-07-28", "mcp-method": "tools/list" };
const bearer = (token: string) => ({ [HttpHeader.Authorization]: `Bearer ${token}` });
const named = (name: string) => expect.objectContaining({ name });
const toolsOf = (tools: unknown) => expect.objectContaining({ tools });
const resultOf = (result: unknown) => expect.objectContaining({ result });
const answering = (body: unknown) => expect.objectContaining({ status: 200, body });
const challenge = expect.stringContaining("resource_metadata");
const CHALLENGED = expect.objectContaining({
  status: 401,
  headers: expect.objectContaining({ [HttpHeader.WwwAuthenticate]: challenge }),
});
const GET_MCP = ["request", "/mcp", { method: "GET", headers: { host: "localhost" } }];

unit(createMcpApp, {
  positive: [
    positive(
      "an anonymous tools/list answers with the open tools",
      [ANON_OPTIONS],
      answering(resultOf(toolsOf([named("books.open"), named("books.remove")]))),
      post(STATELESS, LIST_TOOLS),
    ),
    positive(
      "a valid token adds the required tool",
      [ANON_OPTIONS],
      answering(resultOf(toolsOf(expect.arrayContaining([named("books.private")])))),
      post({ ...STATELESS, ...bearer(READER_TOKEN) }, LIST_TOOLS),
    ),
  ],
  negative: [
    rejected(
      "an invalid bearer token is 401 with a resource metadata challenge",
      [ANON_OPTIONS],
      CHALLENGED,
      post(bearer("garbage"), {}),
    ),
    rejected(
      "a foreign host is refused",
      [ANON_OPTIONS],
      expect.objectContaining({ status: 403 }),
      post({ host: "evil.example" }, {}),
    ),
    rejected("a GET is 405", [ANON_OPTIONS], expect.objectContaining({ status: 405 }), GET_MCP),
    rejected(
      "a header that disagrees with the body is 400",
      [ANON_OPTIONS],
      expect.objectContaining({ status: 400 }),
      post({ ...STATELESS, "mcp-method": "tools/call" }, LIST_TOOLS),
    ),
  ],
});
