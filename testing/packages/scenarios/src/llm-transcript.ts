import { ClaudeValue, Text, TranscriptType } from "@platform/constants";
import { JsonObjectSchema, type Transcript, type TranscriptCall } from "@platform/types";
import { z } from "zod";

const EventSchema = z.looseObject({ type: z.string() });
const BlockSchema = z.looseObject({ type: z.string() });
const MessageSchema = z.looseObject({ message: z.looseObject({ content: z.array(BlockSchema) }) });
const InitSchema = z.looseObject({
  mcp_servers: z.array(z.looseObject({ name: z.string(), status: z.string() })),
  tools: z.array(z.string()),
});
const ResultSchema = z.looseObject({ result: z.string() });
const UseSchema = z.looseObject({ name: z.string(), input: JsonObjectSchema });
const ToolResultSchema = z.looseObject({ content: z.unknown() });

function parseLine(line: string): unknown {
  try {
    return JSON.parse(line);
  } catch {
    return undefined;
  }
}

function blocks(event: unknown, kind: TranscriptType): unknown[] {
  const message = MessageSchema.safeParse(event);
  return message.success ? message.data.message.content.filter((block) => block.type === kind) : [];
}

function callOf(block: unknown): TranscriptCall[] {
  const use = UseSchema.safeParse(block);
  return use.success ? [{ tool: use.data.name, input: use.data.input }] : [];
}

export function parseTranscript(output: string): Transcript {
  const events = output
    .split(Text.Newline)
    .map(parseLine)
    .filter((event) => EventSchema.safeParse(event).success);
  const init = events.map((event) => InitSchema.safeParse(event)).find((parsed) => parsed.success);
  const final = events
    .map((event) => ResultSchema.safeParse(event))
    .findLast((parsed) => parsed.success);
  const connected =
    init?.success === true &&
    init.data.mcp_servers.some((server) => server.status === ClaudeValue.Connected);
  return {
    connected,
    tools: (init?.success === true ? init.data.tools : []).filter((tool) =>
      tool.startsWith(ClaudeValue.ToolPrefix),
    ),
    calls: events
      .flatMap((event) => blocks(event, TranscriptType.ToolUse))
      .flatMap(callOf)
      .filter((call) => call.tool.startsWith(ClaudeValue.ToolPrefix)),
    results: events
      .flatMap((event) => blocks(event, TranscriptType.ToolResult))
      .map((block) => JSON.stringify(ToolResultSchema.parse(block).content)),
    final: final?.success === true ? final.data.result : Text.Empty,
  };
}
