import { ZERO_RUNTIME } from "@platform/test-scenarios";
import "@platform/test-framework/dom";
import { afterEach, describe, expect, test } from "bun:test";
import { DEFAULT_API_ORIGIN } from "@platform/config/urls";
import {
  CONSOLE_CLIENT_ID,
  EventKind,
  MessageId,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { message } from "@platform/messages";
import { createTestIssuer, waitUntil } from "@platform/test-framework";
import { App } from "../../../apps/console/src/app.tsx";
import { createAuthProvider } from "../../../apps/console/src/auth-provider.ts";
import { createDataProvider } from "../../../apps/console/src/data-provider.ts";
import { createLiveProvider } from "../../../apps/console/src/live-provider.ts";
import { createTokenStore } from "../../../apps/console/src/token.ts";

const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");

class FixedObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const box = [{ inlineSize: 600, blockSize: 400 }];
    const rect = { width: 600, height: 400 };
    this.callback(
      [{ target, contentRect: rect, borderBoxSize: box, contentBoxSize: box } as never],
      this as never,
    );
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = FixedObserver as never;
window.ResizeObserver = FixedObserver as never;
Object.defineProperty(Element.prototype, "getBoundingClientRect", {
  configurable: true,
  value: () => ({ width: 600, height: 400, top: 0, left: 0, right: 600, bottom: 400 }),
});
Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, value: 400 });
Object.defineProperty(HTMLElement.prototype, "clientWidth", { configurable: true, value: 600 });

const realFetch = globalThis.fetch;
afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

const EVENT = {
  kind: EventKind.Request,
  time: "2026-10-31T00:00:00Z",
  requestId: "r1",
  capability: "books.archive",
  transport: TransportKind.Mcp,
  principalKind: PrincipalKind.Agent,
  status: 200,
  latencyMs: 4,
  cacheHit: false,
};
const CONFIG = {
  apiOrigin: DEFAULT_API_ORIGIN,
  clientId: CONSOLE_CLIENT_ID,
  redirectUri: DEFAULT_API_ORIGIN,
};

function routed(): typeof fetch {
  return (async (input: URL | string) => {
    const path = new URL(String(input)).pathname;
    if (path.endsWith("/logs")) {
      return Response.json({ events: [EVENT] });
    }
    if (path.endsWith("/stats")) {
      return Response.json({
        name: "stats",
        total: 0,
        errors: 0,
        cacheHits: 0,
        byCapability: {},
        ...ZERO_RUNTIME,
      });
    }
    return new Response(new ReadableStream());
  }) as unknown as typeof fetch;
}

async function admin() {
  const tokens = createTokenStore();
  tokens.set(await (await createTestIssuer()).issue({ scopes: ["admin"] }));
  return tokens;
}

describe("the app shell", () => {
  test("the sign-in button starts the login redirect", async () => {
    const assigned: string[] = [];
    Object.defineProperty(globalThis.location, "assign", {
      configurable: true,
      value: (url: string) => assigned.push(url),
    });
    render(<App tokens={createTokenStore()} />);
    fireEvent.click(screen.getByText(message(MessageId.UiSignIn)));
    await waitFor(() => expect(assigned).toHaveLength(1));
    expect(assigned[0]).toContain("code_challenge_method=S256");
  });

  test("the navigation shows each view and sign out clears the token", async () => {
    globalThis.fetch = routed();
    const tokens = await admin();
    render(<App tokens={tokens} />);
    fireEvent.click(screen.getByText(message(MessageId.UiNavLogs)));
    fireEvent.click(screen.getByText(message(MessageId.UiNavStats)));
    fireEvent.click(screen.getByText(message(MessageId.UiNavLive)));
    fireEvent.click(screen.getByText(message(MessageId.UiSignOut)));
    await waitFor(() => expect(tokens.get()).toBeUndefined());
  });
});

describe("the request log view", () => {
  test("rows from the API are listed and the kind filter narrows the request", async () => {
    globalThis.fetch = routed();
    render(<App tokens={await admin()} />);
    fireEvent.click(screen.getByText(message(MessageId.UiNavLogs)));
    await waitFor(() => expect(document.querySelectorAll('[data-row="log"]').length).toBe(1));
    expect(document.querySelector('[data-row="log"]')?.textContent).toContain("books.archive");
    const select = screen.getByLabelText(message(MessageId.UiFilterKind));
    fireEvent.change(select, { target: { value: EventKind.Error } });
    expect((select as HTMLSelectElement).value).toBe(EventKind.Error);
  });
});

describe("the providers", () => {
  test("logout clears the token and reports success", async () => {
    const tokens = await admin();
    const provider = createAuthProvider(CONFIG, tokens, async () => undefined);
    expect(await provider.logout({})).toEqual({ success: true });
    expect(tokens.get()).toBeUndefined();
  });

  test("login without a navigator goes through the browser location", async () => {
    const assigned: string[] = [];
    Object.defineProperty(globalThis.location, "assign", {
      configurable: true,
      value: (url: string) => assigned.push(url),
    });
    const provider = createAuthProvider(CONFIG, createTokenStore());
    expect(await provider.login({})).toEqual({ success: true });
    expect(assigned).toHaveLength(1);
  });

  test("the data provider names the api origin", async () => {
    const provider = createDataProvider(CONFIG, createTokenStore(), routed());
    expect(provider.getApiUrl()).toBe(DEFAULT_API_ORIGIN);
  });

  test("a stream that cannot be opened is swallowed and the subscription can be aborted", async () => {
    const calls: string[] = [];
    const failing = async () => {
      calls.push("fetch");
      throw new RangeError("offline");
    };
    const provider = await createLiveProvider(CONFIG, await admin(), failing as never);
    const subscription = provider.subscribe({
      channel: "logs",
      callback: () => undefined,
    } as never);
    await waitUntil(() => calls.length === 1);
    provider.unsubscribe(subscription);
    expect(await provider.dropped()).toBe(0);
  });
});
