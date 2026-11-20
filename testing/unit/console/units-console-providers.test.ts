import { expect } from "bun:test";
import "@platform/test-framework/dom";
import { DEFAULT_API_ORIGIN, LOOPBACK_ORIGIN, TEST_PAGE_URL } from "@platform/config/urls";
import {
  CanonicalCode,
  CONSOLE_CLIENT_ID,
  ConsoleStorageKey,
  ErrorReason,
  EventKind,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { waitUntil } from "@platform/test-framework";
import {
  type ApiEvent,
  ApiEventSchema,
  type ConsoleConfig,
  type PkceChallenge,
  type TokenStore,
  type UnitCase,
} from "@platform/types";
import { z } from "zod";
import { completeLogin, createAuthProvider } from "../../../apps/console/src/auth-provider.ts";
import { consoleConfig } from "../../../apps/console/src/config.ts";
import { createDataProvider } from "../../../apps/console/src/data-provider.ts";
import { createLiveProvider } from "../../../apps/console/src/live-provider.ts";
import { createChallenge, rememberChallenge } from "../../../apps/console/src/pkce.ts";
import { createTokenStore } from "../../../apps/console/src/token.ts";

const token = (payload: object) => ["h", btoa(JSON.stringify(payload)), "s"].join(".");
const ADMIN = token({ scope: "read admin", sub: "admin-1" });
const READER = token({ scope: "read", sub: "reader-1" });
const CONFIG: ConsoleConfig = {
  apiOrigin: DEFAULT_API_ORIGIN,
  clientId: CONSOLE_CLIENT_ID,
  redirectUri: LOOPBACK_ORIGIN,
};
const PKCE: PkceChallenge = { verifier: "verifier-1", challenge: "challenge-1", state: "state-1" };
const OTHER_PKCE: PkceChallenge = { verifier: "verifier-2", challenge: "c2", state: "state-2" };
const EVENT: ApiEvent = {
  kind: EventKind.Request,
  time: "2026-01-02T03:04:05.000Z",
  requestId: "r1",
  capability: "books.get",
  transport: TransportKind.Http,
  principalKind: PrincipalKind.User,
  status: 200,
  latencyMs: 3,
  cacheHit: false,
};
const OWN_READ: ApiEvent = { ...EVENT, capability: "stats.get" };
const storeWith = async (value: string): Promise<TokenStore> => {
  const store = await createTokenStore();
  store.set(value);
  return store;
};
const ADMIN_STORE = await storeWith(ADMIN);
const READER_STORE = await storeWith(READER);
const EMPTY_STORE = await createTokenStore();
const answering = (body: unknown) => async () => new Response(JSON.stringify(body));
const failing = async () => {
  throw new RangeError("offline");
};

unit(createTokenStore, {
  positive: [
    positive(
      "a stored token is read back",
      [],
      seen((store: TokenStore) => {
        store.set("t1");
        return store.get();
      }, "t1"),
    ),
    positive(
      "a later token replaces the earlier one",
      [],
      seen((store: TokenStore) => {
        store.set("t1");
        store.set("t2");
        return store.get();
      }, "t2"),
    ),
  ],
  negative: [
    rejected(
      "a new store holds no token",
      [],
      seen((store: TokenStore) => store.get(), undefined),
    ),
    rejected(
      "a cleared store holds no token",
      [],
      seen((store: TokenStore) => {
        store.set("t1");
        store.clear();
        return store.get();
      }, undefined),
    ),
  ],
});

const ELSEWHERE = "https://elsewhere.example.test";
const LOCATION_ORIGIN = new URL(TEST_PAGE_URL).origin;

unit(consoleConfig, {
  positive: [
    positive(
      "the api origin defaults to the page origin behind Caddy",
      [],
      seen((config: ConsoleConfig) => config.apiOrigin, LOCATION_ORIGIN),
    ),
    positive(
      "the api origin follows the VITE_API_ORIGIN variable",
      [],
      seen(async () => {
        process.env.VITE_API_ORIGIN = ELSEWHERE;
        const origin = consoleConfig().apiOrigin;
        delete process.env.VITE_API_ORIGIN;
        return origin;
      }, ELSEWHERE),
    ),
    positive(
      "the client id is the console client",
      [],
      seen((config: ConsoleConfig) => config.clientId, CONSOLE_CLIENT_ID),
    ),
    positive(
      "the redirect uri is the origin of the page",
      [],
      seen((config: ConsoleConfig) => config.redirectUri, LOCATION_ORIGIN),
    ),
  ],
  negative: [
    rejected(
      "an unset variable uses the page origin",
      [],
      seen(async () => {
        delete process.env.VITE_API_ORIGIN;
        return consoleConfig().apiOrigin;
      }, LOCATION_ORIGIN),
    ),
    rejected(
      "only the three configuration fields exist",
      [],
      seen(
        (config: ConsoleConfig) => Object.keys(config).sort(),
        ["apiOrigin", "clientId", "redirectUri"],
      ),
    ),
  ],
});

const BASE64_URL = /^[A-Za-z0-9_-]+$/;
const sha256 = async (text: string) =>
  btoa(
    String.fromCharCode(
      ...new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))),
    ),
  )
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");

unit(createChallenge, {
  positive: [
    positive(
      "the verifier is 43 url-safe characters",
      [],
      seen(
        (pkce: PkceChallenge) => pkce.verifier.length === 43 && BASE64_URL.test(pkce.verifier),
        true,
      ),
    ),
    positive(
      "the challenge is the sha-256 of the verifier",
      [],
      seen(async (pkce: PkceChallenge) => pkce.challenge === (await sha256(pkce.verifier)), true),
    ),
  ],
  negative: [
    rejected(
      "the state differs from the verifier",
      [],
      seen((pkce: PkceChallenge) => pkce.state !== pkce.verifier, true),
    ),
    rejected(
      "two challenges never share a verifier",
      [],
      seen(
        async (pkce: PkceChallenge) => (await createChallenge()).verifier !== pkce.verifier,
        true,
      ),
    ),
  ],
});

const stored = () => ({
  verifier: sessionStorage.getItem(ConsoleStorageKey.Verifier),
  state: sessionStorage.getItem(ConsoleStorageKey.State),
});

unit(rememberChallenge, {
  positive: [
    positive(
      "the verifier and state are kept for the redirect",
      [PKCE],
      seen(stored, { verifier: "verifier-1", state: "state-1" }),
    ),
    positive(
      "a later challenge replaces the earlier one",
      [OTHER_PKCE],
      seen(stored, { verifier: "verifier-2", state: "state-2" }),
    ),
  ],
  negative: [
    rejected(
      "the challenge itself is not kept",
      [PKCE],
      seen(() => sessionStorage.getItem("challenge-1"), null),
    ),
    negative("no challenge at all throws", [undefined], { name: "TypeError" }),
  ],
});

const STORED_ONE = {
  [ConsoleStorageKey.Verifier]: "verifier-1",
  [ConsoleStorageKey.State]: "state-1",
};
const STORED_TWO = {
  [ConsoleStorageKey.Verifier]: "verifier-2",
  [ConsoleStorageKey.State]: "state-2",
};

const STORAGE_FOR: Record<string, Record<string, string>> = {
  "a matching state exchanges the code and stores the token": STORED_ONE,
  "another matching state stores its own token": STORED_TWO,
  "an exchange without an access token throws": STORED_ONE,
  "a redirect without a code does nothing": STORED_ONE,
  "a state that does not match does nothing": STORED_ONE,
};
const prepareStorage = async (item: UnitCase) => {
  sessionStorage.clear();
  Object.entries(STORAGE_FOR[item.name] ?? {}).forEach(([name, value]) => {
    sessionStorage.setItem(name, value);
  });
};

const exchanged = (access: string) => answering({ access_token: access });
const loggedIn = await createTokenStore();
const loggedInAgain = await createTokenStore();
const waiting = await createTokenStore();
const wrongState = await createTokenStore();
const brokenExchange = await createTokenStore();
const missingVerifier = await createTokenStore();

unit(
  completeLogin,
  {
    positive: [
      positive(
        "a matching state exchanges the code and stores the token",
        [CONFIG, loggedIn, "?code=c1&state=state-1", exchanged("tok-1")],
        true,
      ),
      positive(
        "another matching state stores its own token",
        [CONFIG, loggedInAgain, "?code=c2&state=state-2", exchanged("tok-2")],
        true,
      ),
    ],
    negative: [
      negative(
        "an exchange without an access token throws",
        [CONFIG, brokenExchange, "?code=c1&state=state-1", answering({})],
        { name: "ZodError" },
      ),
      rejected(
        "a redirect without a code does nothing",
        [CONFIG, waiting, "?state=state-1", exchanged("x")],
        false,
      ),
      rejected(
        "a state that does not match does nothing",
        [CONFIG, wrongState, "?code=c1&state=other", exchanged("x")],
        false,
      ),
      rejected(
        "a missing verifier does nothing",
        [CONFIG, missingVerifier, "?code=c1&state=state-1", exchanged("x")],
        false,
      ),
    ],
  },
  prepareStorage,
);

const navigated: string[] = [];
const navigate = async (url: string) => {
  navigated.push(url);
};
const AUTHENTICATED = { authenticated: true };
const ANONYMOUS = { authenticated: false };
const SUCCESS = { success: true };
const LOGOUT = { logout: true };
const SUBJECT = expect.objectContaining({ sub: "admin-1" });

unit(createAuthProvider, {
  positive: [
    positive("an admin token is authenticated", [CONFIG, ADMIN_STORE, navigate], AUTHENTICATED, [
      "check",
    ]),
    positive(
      "the identity is read from the token claims",
      [CONFIG, ADMIN_STORE, navigate],
      SUBJECT,
      ["getIdentity"],
    ),
    positive(
      "login sends the browser to the authorize url",
      [CONFIG, EMPTY_STORE, navigate],
      seen(() => navigated.at(-1), expect.stringContaining("code_challenge_method=S256")),
      ["login"],
    ),
    positive("login reports success", [CONFIG, EMPTY_STORE, navigate], SUCCESS, ["login"]),
  ],
  negative: [
    rejected("a reader token is not authenticated", [CONFIG, READER_STORE, navigate], ANONYMOUS, [
      "check",
    ]),
    rejected("no token is not authenticated", [CONFIG, EMPTY_STORE, navigate], ANONYMOUS, [
      "check",
    ]),
    rejected("an error logs the user out", [CONFIG, ADMIN_STORE, navigate], LOGOUT, ["onError"]),
    negative(
      "a failing navigation surfaces its failure",
      [CONFIG, EMPTY_STORE, failing],
      { name: "RangeError" },
      ["login"],
    ),
  ],
});

const requested: string[] = [];
const accepted: (string | null)[] = [];
const recording = async (input: RequestInfo | URL, init?: RequestInit) => {
  requested.push(String(input));
  accepted.push(new Headers(init?.headers).get("accept"));
  return new Response(JSON.stringify({ events: [EVENT], total: 1 }));
};
const OLDER = { ...EVENT, requestId: "older" };
const newestFirst = async () =>
  new Response(JSON.stringify({ events: [EVENT, OLDER], nextPageToken: "" }));
const LIST = { resource: "logs", filters: [{ field: "kind", operator: "eq", value: "request" }] };
const STATS = { resource: "stats", id: "stats" };
const EMPTY_LIST = { data: [], total: 0 };
const FIRST_PAGE = { data: [EVENT], total: 1 };
const ONE_STATS = { data: expect.objectContaining({ id: "stats", events: [EVENT] }) };
const NO_ROW = { data: {} };
const READ_ONLY = { code: CanonicalCode.FailedPrecondition, reason: ErrorReason.MethodNotAllowed };

unit(createDataProvider, {
  positive: [
    positive("an admin lists the events", [CONFIG, ADMIN_STORE, recording], FIRST_PAGE, [
      "getList",
      LIST,
    ]),
    positive(
      "the filter reaches the api as a query",
      [CONFIG, ADMIN_STORE, recording],
      seen(() => requested.at(-1), `${DEFAULT_API_ORIGIN}/v1/logs?kind=request&pageSize=100`),
      ["getList", LIST],
    ),
    positive(
      "the api answers newest first and the console lists them oldest first as before",
      [CONFIG, ADMIN_STORE, newestFirst],
      { data: [OLDER, EVENT], total: 2 },
      ["getList", LIST],
    ),
    positive(
      "every read says it accepts JSON",
      [CONFIG, ADMIN_STORE, recording],
      seen(() => accepted.at(-1), "application/json"),
      ["getOne", STATS],
    ),
    positive("one resource is read with its id", [CONFIG, ADMIN_STORE, recording], ONE_STATS, [
      "getOne",
      STATS,
    ]),
  ],
  negative: [
    rejected("a reader gets an empty list", [CONFIG, READER_STORE, recording], EMPTY_LIST, [
      "getList",
      LIST,
    ]),
    rejected("a reader gets no row", [CONFIG, READER_STORE, recording], NO_ROW, ["getOne", STATS]),
    negative("create is refused", [CONFIG, ADMIN_STORE, recording], READ_ONLY, ["create", {}]),
    negative("update is refused", [CONFIG, ADMIN_STORE, recording], READ_ONLY, ["update", {}]),
    negative("delete is refused", [CONFIG, ADMIN_STORE, recording], READ_ONLY, ["deleteOne", {}]),
  ],
});

const frame = (event: ApiEvent) => `data: ${JSON.stringify(event)}\n\n`;
const streaming = (text: string) => async () => new Response(text);
const collect = async (
  events: unknown[],
  text: string,
  store: TokenStore,
  until: (provider: Awaited<ReturnType<typeof createLiveProvider>>) => Promise<boolean>,
) => {
  const provider = await createLiveProvider(CONFIG, store, streaming(text) as never);
  const subscription = provider.subscribe({
    channel: "logs",
    callback: (event: unknown) => {
      events.push(event);
    },
  } as never);
  await waitUntil(async () => until(provider));
  provider.unsubscribe(subscription);
  return provider;
};
const LIVE = z.object({ channel: z.string(), payload: ApiEventSchema });
const received = (events: unknown[]) => events.map((event) => LIVE.parse(event).payload);

const delivered: unknown[] = [];
const ownReads: unknown[] = [];
const garbled: unknown[] = [];
const fetchCalls: string[] = [];
const countingFetch = async () => {
  fetchCalls.push("fetch");
  return new Response(frame(EVENT));
};
const arrived = (events: unknown[]) => async () => events.length >= 1;
const droppedOnce = async (provider: Awaited<ReturnType<typeof createLiveProvider>>) =>
  (await provider.dropped()) >= 1;

unit(createLiveProvider, {
  positive: [
    positive(
      "an admin receives the events of the stream",
      [CONFIG, ADMIN_STORE, streaming(frame(EVENT))],
      seen(async () => {
        await collect(delivered, frame(EVENT), ADMIN_STORE, arrived(delivered));
        return received(delivered);
      }, [EVENT]),
    ),
    positive(
      "the event carries its channel",
      [CONFIG, ADMIN_STORE, streaming(frame(EVENT))],
      seen(() => LIVE.parse(delivered[0]).channel, "logs"),
    ),
  ],
  negative: [
    rejected(
      "the console's own reads are not delivered",
      [CONFIG, ADMIN_STORE, streaming(frame(OWN_READ))],
      seen(async () => {
        await collect(ownReads, frame(OWN_READ) + frame(EVENT), ADMIN_STORE, arrived(ownReads));
        return received(ownReads);
      }, [EVENT]),
    ),
    rejected(
      "a reader never opens the stream",
      [CONFIG, READER_STORE, countingFetch],
      seen(async () => {
        const provider = await createLiveProvider(CONFIG, READER_STORE, countingFetch as never);
        provider.unsubscribe(
          provider.subscribe({ channel: "logs", callback: () => undefined } as never),
        );
        return fetchCalls.length;
      }, 0),
    ),
    rejected(
      "a frame that is not an event is counted as dropped",
      [CONFIG, ADMIN_STORE, streaming("data: not-json\n\n")],
      seen(async () => {
        const provider = await collect(garbled, "data: not-json\n\n", ADMIN_STORE, droppedOnce);
        return [garbled.length, await provider.dropped()];
      }, [0, 1]),
    ),
  ],
});
