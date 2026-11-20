import type { Client } from "@modelcontextprotocol/client";
import { AuthMode, CheckKind, MessageId, SchemaIo, TransportKind } from "@platform/constants";
import { message } from "@platform/messages";
import type { Capability, CheckResult, JsonObject } from "@platform/types";
import { z } from "zod";

const BAD_ARGUMENTS: JsonObject = { unexpectedArgument: true };

function propertyNames(schema: unknown): string[] {
  const parsed = z
    .object({ properties: z.record(z.string(), z.unknown()).optional() })
    .safeParse(schema);
  return Object.keys(parsed.success ? (parsed.data.properties ?? {}) : {}).sort();
}

async function failsOnBadCall(client: Client, id: string): Promise<boolean> {
  return client.callTool({ name: id, arguments: BAD_ARGUMENTS }).then(
    (result) => result.isError === true,
    () => true,
  );
}

function check(id: MessageId, tool: string, passed: boolean): CheckResult {
  return { kind: CheckKind.Outcome, label: message(id, { id: tool }), passed };
}

export async function mcpConformance(
  capability: Capability,
  signedIn: Client,
  anonymous: Client,
): Promise<CheckResult[]> {
  const listed = (await signedIn.listTools()).tools.find((tool) => tool.name === capability.id);
  const seenAnonymously = (await anonymous.listTools()).tools.some(
    (tool) => tool.name === capability.id,
  );
  const offered = capability.onlyOver !== TransportKind.Http;
  const expected = offered ? z.toJSONSchema(capability.input, { io: SchemaIo.Input }) : undefined;
  const bad = await failsOnBadCall(signedIn, capability.id);
  return [
    check(MessageId.ConformanceListed, capability.id, (listed !== undefined) === offered),
    check(
      MessageId.ConformanceInput,
      capability.id,
      JSON.stringify(propertyNames(listed?.inputSchema)) ===
        JSON.stringify(propertyNames(expected)),
    ),
    check(
      MessageId.ConformanceOutput,
      capability.id,
      (listed?.outputSchema !== undefined) === offered,
    ),
    check(MessageId.ConformanceError, capability.id, bad),
    check(
      MessageId.ConformanceVisibility,
      capability.id,
      seenAnonymously ===
        (offered && capability.auth !== AuthMode.Required && capability.policy === undefined),
    ),
  ];
}
