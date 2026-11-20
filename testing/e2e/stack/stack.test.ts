import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { containerNameOf } from "@platform/config/environments";
import { EndpointPath, EnvironmentName, StackNetwork, StackService } from "@platform/constants";
import {
  adminToken,
  curlFromEdge,
  documentStep,
  observeStream,
  proxyCurl,
  proxyRequest,
  recordContainerUsage,
  runPodman,
} from "@platform/test-scenarios";
import { SkillDocumentSchema, SkillListSchema } from "@platform/types";
import { stackCheck, stackDown, stackUp } from "../../../apps/infra/src/cli.ts";

const STARTUP_MS = 1_800_000;
const ENVIRONMENT = EnvironmentName.Test;
const CONFIG_PATH = "/v1/config";
const EXPECTED_BODY = '{"name":"config","bannerText":"Welcome","pageSizeDefault":50}';
const NO_HOST_NAME = 6;
const TIMED_OUT = 28;
const EVENT_STEPS = ["step-1", "step-2", "step-3"];
const VERSIONS = [
  ["--http1.1", "1.1"],
  ["--http2", "2"],
  ["--http3-only", "3"],
];
const ANY = "all";
let upCode = -1;
let token = "";

beforeAll(async () => {
  upCode = await stackUp(ENVIRONMENT);
  token = upCode === 0 ? await adminToken(ENVIRONMENT) : "";
}, STARTUP_MS);

afterAll(async () => {
  await stackDown(ENVIRONMENT);
}, STARTUP_MS);

async function inspect(container: string, format: string): Promise<string> {
  return (await runPodman(["inspect", container, "--format", format])).stdout.trim();
}

describe("the test stack answers over every HTTP version through the proxy", () => {
  test("the stack came up with the identity server and gave a token", () =>
    documentStep(
      {
        id: "stack-up",
        title: "The test stack starts with the proxy, the API and the identity server",
        checked:
          "The stack program finished with code 0 and the identity server gave an administrator token of three parts.",
        version: ANY,
      },
      async () => {
        expect([upCode, token.split(".").length]).toEqual([0, 3]);
      },
    ));

  test.each(VERSIONS)(
    "%s negotiates HTTP %s, verifies the certificate and gets the page",
    (flag, version) =>
      documentStep(
        {
          id: `page-http-${version}`,
          title: `A request for the public configuration goes through the proxy over HTTP ${version}`,
          checked: `The negotiated version is ${version}, the certificate verifies, the status is 200 and the body is the configuration.`,
          version,
        },
        async () => {
          const answer = await proxyCurl(ENVIRONMENT, flag, CONFIG_PATH);
          expect([answer.httpVersion, answer.status, answer.verify, answer.body]).toEqual([
            version,
            200,
            0,
            EXPECTED_BODY,
          ]);
        },
      ),
    STARTUP_MS,
  );
});

describe("an administrator streams the events through the proxy", () => {
  test("without a token the stream is refused", () =>
    documentStep(
      {
        id: "stream-refused",
        title: "The event stream refuses a request without a token",
        checked: "The proxy passes the request on and the API answers 401.",
        version: "2",
      },
      async () => {
        const status = await proxyRequest(ENVIRONMENT, "--http2", EndpointPath.Events, [
          "Accept: text/event-stream",
        ]);
        expect(status).toBe(401);
      },
    ));

  test.each(VERSIONS)(
    "%s delivers each event as it happens, in order, over HTTP %s",
    (flag, version) =>
      documentStep(
        {
          id: `stream-http-${version}`,
          title: `An administrator streams the events through the proxy over HTTP ${version}`,
          checked: `Each of three events arrives in order before the next request is sent, the negotiated version is ${version} and the proxy logs no error.`,
          version,
        },
        async () => {
          const seen = await observeStream(
            ENVIRONMENT,
            flag,
            version,
            token,
            [EndpointPath.Events, CONFIG_PATH],
            EVENT_STEPS,
          );
          expect(seen).toEqual({
            answers: [200, 200, 200],
            heard: [true, true, true],
            last: `${version} 200`,
            errors: [],
          });
        },
      ),
    STARTUP_MS,
  );
});

describe("the API can only be reached through the proxy", () => {
  test("the edge network cannot resolve the API by name", () =>
    documentStep(
      {
        id: "direct-by-name",
        title: "A client on the edge network cannot find the API by its name",
        checked: "The request to the name of the API fails with curl exit code 6 (no such host).",
        version: ANY,
      },
      async () => {
        expect(await curlFromEdge(ENVIRONMENT, "http://api:3000/v1/config")).toBe(NO_HOST_NAME);
      },
    ));

  test("the edge network cannot connect to the API by its backend address", () =>
    documentStep(
      {
        id: "direct-by-address",
        title: "A client on the edge network cannot reach the API by its backend address",
        checked: "The request to the backend address of the API times out with curl exit code 28.",
        version: ANY,
      },
      async () => {
        const api = await containerNameOf(ENVIRONMENT, StackService.Api);
        const backend = await containerNameOf(ENVIRONMENT, StackNetwork.Backend);
        const address = await inspect(
          api,
          `{{(index .NetworkSettings.Networks "${backend}").IPAddress}}`,
        );
        expect(await curlFromEdge(ENVIRONMENT, `http://${address}:3000/v1/config`)).toBe(TIMED_OUT);
      },
    ));

  test("the backend network is internal and the edge network is not", () =>
    documentStep(
      {
        id: "networks",
        title: "The backend network is internal and the edge network is not",
        checked:
          "Podman reports internal false for the edge network and true for the backend network.",
        version: ANY,
      },
      async () => {
        const edge = await containerNameOf(ENVIRONMENT, StackNetwork.Edge);
        const backend = await containerNameOf(ENVIRONMENT, StackNetwork.Backend);
        const edgeInternal = (
          await runPodman(["network", "inspect", edge, "--format", "{{.Internal}}"])
        ).stdout.trim();
        const backendInternal = (
          await runPodman(["network", "inspect", backend, "--format", "{{.Internal}}"])
        ).stdout.trim();
        expect([edgeInternal, backendInternal]).toEqual(["false", "true"]);
      },
    ));

  test("neither container publishes a port in the test environment", () =>
    documentStep(
      {
        id: "no-published-ports",
        title: "Neither the proxy nor the API publishes a port on the host in the test environment",
        checked: "Podman reports no port binding for either container.",
        version: ANY,
      },
      async () => {
        const proxy = await containerNameOf(ENVIRONMENT, StackService.Proxy);
        const api = await containerNameOf(ENVIRONMENT, StackService.Api);
        expect([
          await inspect(proxy, "{{json .HostConfig.PortBindings}}"),
          await inspect(api, "{{json .HostConfig.PortBindings}}"),
        ]).toEqual(["{}", "{}"]);
      },
    ));
});

describe("the running stack is the program", () => {
  test.each([false, true])(
    "package skills are present in the image with administrator access %s",
    (admin) =>
      documentStep(
        {
          id: `package-skills-${admin}`,
          title: "The packaged API exposes its package skills through the proxy",
          checked:
            "The books skill is present, the administrator skill follows authorization, and package files can be read.",
          version: "2",
        },
        async () => {
          const headers = admin ? [`Authorization: Bearer ${token}`] : [];
          const answer = await proxyCurl(ENVIRONMENT, "--http2", "/v1/skills", headers);
          const names = SkillListSchema.parse(JSON.parse(answer.body)).skills.map(
            (skill) => skill.name,
          );
          const document = await proxyCurl(
            ENVIRONMENT,
            "--http2",
            "/v1/skills/working-with-books",
            headers,
          );
          const content = SkillDocumentSchema.parse(JSON.parse(document.body));
          expect([
            answer.status,
            names.includes("working-with-books"),
            names.includes("operating-the-service"),
            document.status,
          ]).toEqual([200, true, admin, 200]);
          expect(content.files.map((file) => file.path)).toEqual(
            expect.arrayContaining(["SKILL.md", "references/fields.md"]),
          );
        },
      ),
  );

  test("a second comparison with the program finds nothing to change", () =>
    documentStep(
      {
        id: "stack-is-program",
        title: "The running stack matches the stack program",
        checked: "A second comparison of the stack with the program finds nothing to change.",
        version: ANY,
      },
      async () => {
        expect(await stackCheck(ENVIRONMENT)).toBe(0);
      },
    ));
});

describe("the containers of the stack are measured", () => {
  test("the memory and the processor of each container are read", () =>
    documentStep(
      {
        id: "container-usage",
        title: "The memory and the processor of each container of the stack are read",
        checked:
          "Podman reports the proxy, the API and the identity server, each with a memory figure; the figures are saved for the performance page.",
        version: ANY,
      },
      async () => {
        const names = [StackService.Proxy, StackService.Api, StackService.Identity];
        expect(await recordContainerUsage(ENVIRONMENT, names)).toEqual([true, true, true]);
      },
    ));
});
