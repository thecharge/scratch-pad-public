import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import {
  ADMIN_BEARER_SCOPES,
  AuthScheme,
  EndpointPath,
  Glyph,
  HttpHeader,
  KB_CLIENT_VERSION,
  PROXY_BACKEND_ENV,
  PROXY_RECORDER_MISSING_INTERFACES,
  Text,
} from "@platform/constants";
import { isolatedDatabasePath, tokenFor } from "@platform/test-framework";
import { JsonObjectSchema, type LiveInterfaces, OpenApiDocumentSchema } from "@platform/types";
import { runProxyRecorder } from "./proxy-record.ts";
import { startProxyDocsApi } from "./proxy-session.ts";

export async function fetchLiveInterfaces(): Promise<LiveInterfaces> {
  if (Bun.env[PROXY_BACKEND_ENV] === undefined) {
    const output = await runProxyRecorder({});
    if (output.interfaces === undefined) throw new Error(PROXY_RECORDER_MISSING_INTERFACES);
    return output.interfaces;
  }
  const { issuer, server } = await startProxyDocsApi(true, isolatedDatabasePath());
  try {
    const token = (await tokenFor(issuer, ADMIN_BEARER_SCOPES)) as string;
    const headers = { [HttpHeader.Authorization]: [AuthScheme.Bearer, token].join(Glyph.Space) };
    const transport = new StreamableHTTPClientTransport(
      new URL([server.origin, EndpointPath.Mcp].join(Text.Empty)),
      { requestInit: { headers } },
    );
    const client = new Client({ name: EndpointPath.Mcp, version: KB_CLIENT_VERSION });
    await client.connect(transport);
    const { tools } = await client.listTools();
    await client.close();
    const response = await fetch([server.origin, EndpointPath.OpenApi].join(Text.Empty));
    const document = OpenApiDocumentSchema.parse(await response.json());
    return {
      document,
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description ?? Text.Empty,
        inputSchema: JsonObjectSchema.parse(tool.inputSchema),
      })),
    };
  } finally {
    await server.stop();
  }
}
