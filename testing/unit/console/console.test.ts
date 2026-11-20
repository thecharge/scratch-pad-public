import { all } from "@platform/util";
import "@platform/test-framework/dom";
import { describe, expect, test } from "bun:test";
import { DEFAULT_API_ORIGIN, TEST_API_ORIGIN } from "@platform/config/urls";
import {
  EventKind,
  HttpMethod,
  PrincipalKind,
  StatsCapabilityId,
  TransportKind,
} from "@platform/constants";
import { createTestIssuer, REPO_ROOT, thrownBy } from "@platform/test-framework";
import type { CallRecord, ConsoleConfig, SourceFile } from "@platform/types";
import { completeLogin, createAuthProvider } from "../../../apps/console/src/auth-provider.ts";
import { hasAdminScope } from "../../../apps/console/src/claims.ts";
import { createDataProvider } from "../../../apps/console/src/data-provider.ts";
import { createLiveProvider, parseFrames } from "../../../apps/console/src/live-provider.ts";
import { createChallenge } from "../../../apps/console/src/pkce.ts";
import { createTokenStore } from "../../../apps/console/src/token.ts";

const CONFIG: ConsoleConfig = {
  apiOrigin: TEST_API_ORIGIN,
  clientId: "console",
  redirectUri: DEFAULT_API_ORIGIN,
};
const EVENT = {
  kind: EventKind.Request,
  time: "2026-10-31T00:00:00Z",
  requestId: "r1",
  capability: "books.get",
  transport: TransportKind.Http,
  principalKind: PrincipalKind.User,
  status: 200,
  latencyMs: 4,
  cacheHit: false,
};

async function tokenWith(scopes: string[]): Promise<string> {
  const issuer = await createTestIssuer();
  return issuer.issue({ scopes });
}

function recordingFetch(body: unknown) {
  const calls: CallRecord[] = [];
  const fetcher = (async (input: URL | string, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? HttpMethod.Get,
      authorization: new Headers(init?.headers).get("authorization"),
    });
    return Response.json(body);
  }) as typeof fetch;
  return { calls, fetcher };
}

function streamOf(text: string): typeof fetch {
  return (async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(text));
        },
      }),
    )) as unknown as typeof fetch;
}

describe("token handling", () => {
  test("a token is held in memory only: a new store, as after a reload, has none", async () => {
    const first = createTokenStore();
    first.set("secret-token");
    expect([first.get(), createTokenStore().get()]).toEqual(["secret-token", undefined]);
  });

  test("a token is never written to browser storage or cookies", async () => {
    createTokenStore().set("secret-token");
    expect(
      [JSON.stringify(localStorage), JSON.stringify(sessionStorage), document.cookie].join(""),
    ).not.toContain("secret-token");
  });
});

describe("data provider", () => {
  test("without the admin scope nothing is fetched and no data is returned", async () => {
    const { calls, fetcher } = recordingFetch({ events: [EVENT] });
    const tokens = createTokenStore();
    tokens.set(await tokenWith(["read"]));
    const result = await createDataProvider(CONFIG, tokens, fetcher).getList({ resource: "logs" });
    expect([calls.length, result.data]).toEqual([0, []]);
  });

  test("with the admin scope it sends one GET with the bearer token", async () => {
    const { calls, fetcher } = recordingFetch({ events: [EVENT] });
    const tokens = createTokenStore();
    const token = await tokenWith(["admin"]);
    tokens.set(token);
    const result = await createDataProvider(CONFIG, tokens, fetcher).getList({ resource: "logs" });
    expect([calls.map((call) => call.method), calls[0]?.authorization, result.data.length]).toEqual(
      [[HttpMethod.Get], `Bearer ${token}`, 1],
    );
  });

  test.each(["create", "update", "deleteOne"] as const)(
    "%s is refused: the console is read-only",
    async (method) => {
      const { calls, fetcher } = recordingFetch({});
      const provider = createDataProvider(CONFIG, createTokenStore(), fetcher);
      const failure = await thrownBy(() =>
        provider[method]({ resource: "logs", variables: {}, id: "1" } as never),
      );
      expect([failure instanceof Error, calls.length]).toEqual([true, 0]);
    },
  );
});

describe("live provider", () => {
  test("frames are split on blank lines and keep the unfinished tail", async () => {
    const parsed = await parseFrames('event: request\ndata: {"a":1}\n\ndata: {"b"');
    expect(parsed).toEqual({ events: ['{"a":1}'], rest: 'data: {"b"' });
  });

  test("a valid event reaches the subscriber and a malformed one is dropped and counted", async () => {
    const tokens = createTokenStore();
    tokens.set(await tokenWith(["admin"]));
    const frames = `data: ${JSON.stringify(EVENT)}\n\ndata: {"kind":"nonsense"}\n\ndata: not json\n\n`;
    const provider = createLiveProvider(CONFIG, tokens, streamOf(frames));
    const heard: unknown[] = [];
    provider.subscribe({
      channel: "logs",
      types: ["*"],
      callback: (event) => heard.push(event.payload),
    });
    await Bun.sleep(30);
    expect([heard.length, await provider.dropped()]).toEqual([1, 2]);
  });

  test("events caused by the console's own reads do not reach the subscriber, so a read cannot trigger the next read", async () => {
    const tokens = createTokenStore();
    tokens.set(await tokenWith(["admin"]));
    const own = [StatsCapabilityId.LogsList, StatsCapabilityId.Get].map(
      (capability) => `data: ${JSON.stringify({ ...EVENT, capability })}\n\n`,
    );
    const provider = createLiveProvider(CONFIG, tokens, streamOf(own.join("")));
    const heard: unknown[] = [];
    provider.subscribe({
      channel: "logs",
      types: ["*"],
      callback: (event) => heard.push(event.payload),
    });
    await Bun.sleep(30);
    expect([heard.length, await provider.dropped()]).toEqual([0, 0]);
  });

  test("without the admin scope no stream is opened", async () => {
    const { calls, fetcher } = recordingFetch({});
    const provider = createLiveProvider(CONFIG, createTokenStore(), fetcher);
    provider.subscribe({ channel: "logs", types: ["*"], callback: () => undefined });
    await Bun.sleep(10);
    expect(calls.length).toBe(0);
  });
});

describe("sign-in", () => {
  test("login sends the browser to the authorize URL with a PKCE S256 challenge and keeps only the verifier", async () => {
    const targets: string[] = [];
    const provider = createAuthProvider(CONFIG, createTokenStore(), async (url) => {
      targets.push(url);
    });
    await provider.login({});
    const url = new URL(targets[0] ?? "");
    expect([
      url.searchParams.get("code_challenge_method"),
      url.searchParams.get("response_type"),
      url.searchParams.get("resource"),
      sessionStorage.getItem("console.pkce.verifier")?.length,
    ]).toEqual(["S256", "code", CONFIG.apiOrigin, 43]);
  });

  test("a returned code is exchanged with the stored verifier and the token stays in memory", async () => {
    const token = await tokenWith(["admin"]);
    const bodies: string[] = [];
    const fetcher = (async (_url: URL | string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return Response.json({ access_token: token });
    }) as typeof fetch;
    const tokens = createTokenStore();
    await createAuthProvider(CONFIG, tokens, async () => undefined).login({});
    const state = sessionStorage.getItem("console.pkce.state") ?? "";
    const done = await completeLogin(CONFIG, tokens, `?code=abc&state=${state}`, fetcher);
    expect([
      done,
      tokens.get() === token,
      bodies[0]?.includes("code_verifier="),
      sessionStorage.getItem("console.pkce.verifier"),
    ]).toEqual([true, true, true, null]);
  });

  test("a wrong state is refused and no token is stored", async () => {
    const tokens = createTokenStore();
    await createAuthProvider(CONFIG, tokens, async () => undefined).login({});
    const done = await completeLogin(
      CONFIG,
      tokens,
      "?code=abc&state=forged",
      recordingFetch({}).fetcher,
    );
    expect([done, tokens.get()]).toEqual([false, undefined]);
  });

  test("check passes only for a token with the admin scope", async () => {
    const reader = createTokenStore();
    reader.set(await tokenWith(["read"]));
    const admin = createTokenStore();
    admin.set(await tokenWith(["admin"]));
    const results = await all(
      [reader, admin].map(
        (tokens) => async () => createAuthProvider(CONFIG, tokens, async () => undefined).check({}),
      ),
    );
    expect(results.map((result) => result.authenticated)).toEqual([false, true]);
  });
});

describe("browser safety", () => {
  test("sign-in and token reading work without Node's Buffer", async () => {
    const original = globalThis.Buffer;
    Object.defineProperty(globalThis, "Buffer", { value: undefined, configurable: true });
    const challenge = await createChallenge();
    const token = await tokenWith(["admin"]);
    const admin = hasAdminScope(token);
    Object.defineProperty(globalThis, "Buffer", { value: original, configurable: true });
    expect([challenge.verifier.length, challenge.challenge.length, admin]).toEqual([43, 43, true]);
  });
});

describe("read-only by construction", () => {
  const SOURCE = `${REPO_ROOT}/apps/console/src/`;

  async function sources(): Promise<SourceFile[]> {
    const files = await Array.fromAsync(new Bun.Glob("*.{ts,tsx}").scan({ cwd: SOURCE }));
    return all(
      files.map((file) => async () => ({ file, text: await Bun.file(`${SOURCE}${file}`).text() })),
    );
  }

  test("only the authentication code issues a non-GET request", async () => {
    const writers = (await sources())
      .filter(({ text }) => /HttpMethod\.(Post|Put|Patch|Delete)/.test(text))
      .map(({ file }) => file);
    expect(writers).toEqual(["pkce.ts"]);
  });

  test("the console is built from Refine, shadcn/ui, Recharts and TanStack Table", async () => {
    const manifest = await Bun.file(`${REPO_ROOT}/apps/console/package.json`).json();
    const components = await Array.fromAsync(
      new Bun.Glob("*.tsx").scan({ cwd: `${SOURCE}components/ui` }),
    );
    expect([
      Object.keys(manifest.dependencies).filter((name) =>
        [
          "@refinedev/core",
          "recharts",
          "@tanstack/react-table",
          "@tanstack/react-virtual",
        ].includes(name),
      ).length,
      components.sort(),
    ]).toEqual([
      4,
      ["badge.tsx", "button.tsx", "card.tsx", "chart.tsx", "input.tsx", "select.tsx", "table.tsx"],
    ]);
  });

  test("the vendored shadcn components carry their marker and there is no hand-written design system", async () => {
    const text = await Bun.file(`${SOURCE}components/ui/card.tsx`).text();
    expect([text.includes('data-slot="card"'), await Bun.file(`${SOURCE}ui.tsx`).exists()]).toEqual(
      [true, false],
    );
  });
});
