import { serialize } from "bun:jsc";
import { mkdir } from "node:fs/promises";
import { TEST_PROXY_ORIGIN } from "@platform/config/urls";
import {
  AuthScheme,
  Glyph,
  HttpHeader,
  MediaType,
  StdioMode,
  Text,
  UI_PROXY,
  UI_STEP_TIMEOUT_MS,
} from "@platform/constants";
import { waitUntil } from "@platform/test-framework";
import { UiScenarioSchema } from "@platform/types";
import { networkReady } from "../../../scenarios/src/network-ready.ts";
import { runUiScenario, UiHandles } from "./runner.ts";
import { seedBooks } from "./seed.ts";

const [input = Text.Empty, output = Text.Empty, shots = Text.Empty] = Bun.argv.slice(2);
const scenario = UiScenarioSchema.parse(await Bun.file(input).json());
const database = UI_PROXY.CertificateDatabase;
await waitUntil(
  async () => networkReady(await Bun.file(UI_PROXY.NetworkAddressesFile).text()),
  UI_STEP_TIMEOUT_MS,
);
await mkdir(UI_PROXY.CertificateDirectory, { recursive: true });

async function certificate(command: string[]) {
  const child = Bun.spawn(command, { stdout: StdioMode.Pipe, stderr: StdioMode.Pipe });
  const stderr = await new Response(child.stderr).text();
  if ((await child.exited) !== 0) throw new Error(stderr);
}

await certificate([...UI_PROXY.CertificateInitialize, database]);
await certificate([
  ...UI_PROXY.CertificateImport,
  database,
  UI_PROXY.CertificateNameFlag,
  UI_PROXY.CertificateName,
  UI_PROXY.CertificateTrustFlag,
  UI_PROXY.CertificateTrust,
  UI_PROXY.CertificateInputFlag,
  UI_PROXY.CertificateRoot,
]);

async function connect() {
  const call = async (method: string, path: string, body?: object) => {
    const headers = {
      [HttpHeader.Accept]: MediaType.Json,
      [HttpHeader.Authorization]: [
        AuthScheme.Bearer,
        Bun.env[UI_PROXY.AdminEnvironment] ?? Text.Empty,
      ].join(Glyph.Space),
      ...(body === undefined ? {} : { [HttpHeader.ContentType]: MediaType.Json }),
    };
    return fetch(`${TEST_PROXY_ORIGIN}${path}`, {
      method,
      headers,
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  };
  return {
    api: TEST_PROXY_ORIGIN,
    consoleOrigin: TEST_PROXY_ORIGIN,
    call,
    stop: async () => undefined,
  };
}

const run = await runUiScenario(scenario, Text.Empty, shots, seedBooks, new UiHandles(), connect);
await Bun.write(output, serialize(run));
console.log(
  JSON.stringify({ proxy: TEST_PROXY_ORIGIN, scenario: scenario.id, steps: run.results.length }),
);
