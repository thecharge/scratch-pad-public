import { expect } from "bun:test";
import { CheckKind, StepFlag, StepSource } from "@platform/constants";
import { readEvents } from "@platform/streams";
import type { StepResult } from "@platform/types";
import { httpWire } from "./http-wire.ts";

const exchanges: StepResult[] = [];
let sequence = 0;
export async function recordHttpApi() {
  console.log(JSON.stringify(exchanges));
}

export async function bootHttpApi() {
  sequence += 1;
  const publisher = `${Bun.env.TEST_HTTP_CASE_PREFIX ?? "case"}-${sequence}`;
  const origin = Bun.env.TEST_HTTP_ORIGIN ?? "";
  const call = async (
    method: string,
    path: string,
    scopes: readonly string[],
    body?: object | string,
    expectedStatus = 200,
    extra: Record<string, string> = {},
    streaming = false,
    captureSeconds = 30,
  ) => {
    const token = scopes.includes("admin")
      ? Bun.env.TEST_HTTP_ADMIN
      : scopes.includes("write")
        ? Bun.env.TEST_HTTP_WRITER
        : scopes.includes("read")
          ? Bun.env.TEST_HTTP_READER
          : undefined;
    const headers = {
      accept: "application/json",
      ...(body === undefined ? {} : { "content-type": "application/json" }),
      ...(token === undefined ? {} : { authorization: `Bearer ${token}` }),
      ...extra,
    };
    const target = path.replaceAll("publishers/acme", `publishers/${publisher}`);
    const requestBody = typeof body === "string" ? body : JSON.stringify(body);
    const { response, chunks, httpVersion } = await httpWire(
      `${origin}${target}`,
      method,
      headers,
      requestBody,
      streaming,
      captureSeconds,
    );
    expect(httpVersion).toBe(Bun.env.TEST_HTTP_VERSION ?? "");
    const text = chunks.join("");
    const eventStream = headers.accept === "text/event-stream";
    const parsed = eventStream
      ? await Array.fromAsync(readEvents(new Blob([text]).stream()))
      : JSON.parse(text);
    expect(response.status).toBe(expectedStatus);
    const recordedHeaders = {
      ...headers,
      ...(token === undefined ? {} : { authorization: "Bearer <YOUR_ACCESS_TOKEN>" }),
    };
    const observed = {
      httpVersion,
      responseHeaders: Object.fromEntries(response.headers),
      chunks,
      requestStreaming: streaming,
      ...(captureSeconds < 30 ? { clientCaptureSeconds: captureSeconds } : {}),
    };
    const form = eventStream ? "event stream" : "JSON response";
    exchanges.push({
      source: StepSource.Http,
      description: `${method} ${target}`,
      flag: StepFlag.Passed,
      place: `${origin}${target}`,
      action:
        captureSeconds < 30
          ? `Send ${method} and capture the ${form} for ${captureSeconds} second.`
          : `Send ${method} and read the complete ${form}.`,
      expectation: `HTTP ${expectedStatus} with a ${form}.`,
      checks: [
        {
          kind: CheckKind.Outcome,
          label: `The connection negotiated HTTP ${httpVersion} with certificate verification enabled.`,
          passed: httpVersion === Bun.env.TEST_HTTP_VERSION,
        },
        {
          kind: CheckKind.Status,
          label: `The response status is ${expectedStatus}.`,
          passed: response.status === expectedStatus,
        },
        {
          kind: CheckKind.Outcome,
          label: `The response chunks form a valid ${form}.`,
          passed: true,
        },
      ],
      evidence: {
        method,
        path: target,
        headers: recordedHeaders,
        authorized: token !== undefined,
        scopes: [...scopes],
        requestBody,
        response: JSON.stringify(parsed, null, 2),
        outcome: `HTTP ${response.status}`,
        note: `Response headers and chunks in arrival order:\n\n\`\`\`json\n${JSON.stringify(observed, null, 2)}\n\`\`\`\n\n`,
      },
    });
    return { status: response.status, body: parsed };
  };
  return { call };
}
