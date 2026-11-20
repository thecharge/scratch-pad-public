import { ZERO_RUNTIME } from "@platform/test-scenarios";
import "@platform/test-framework/dom";
import { afterEach, describe, expect, test } from "bun:test";
import { EventKind, MessageId, PrincipalKind, TransportKind } from "@platform/constants";
import { message } from "@platform/messages";
import { createTestIssuer } from "@platform/test-framework";
import { App } from "../../../apps/console/src/app.tsx";
import { createTokenStore } from "../../../apps/console/src/token.ts";

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
const { cleanup, fireEvent, render, screen, waitFor } = await import("@testing-library/react");
const realFetch = globalThis.fetch;

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

function sseAfterDelay(): typeof fetch {
  return (async () =>
    new Response(
      new ReadableStream({
        start(controller) {
          setTimeout(() => {
            controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(EVENT)}\n\n`));
          }, 50);
        },
      }),
    )) as unknown as typeof fetch;
}

describe("console", () => {
  test("without the admin scope it shows the sign-in prompt and requests nothing", async () => {
    const requests = { count: 0 };
    globalThis.fetch = (async () => {
      requests.count += 1;
      return Response.json({});
    }) as unknown as typeof fetch;
    const tokens = createTokenStore();
    tokens.set(await (await createTestIssuer()).issue({ scopes: ["read"] }));
    render(<App tokens={tokens} />);
    expect([
      screen.getByText(message(MessageId.UiNoAdmin)).textContent?.length,
      requests.count,
    ]).toEqual([message(MessageId.UiNoAdmin).length, 0]);
  });

  test("a live row appears when the server streams an event", async () => {
    globalThis.fetch = sseAfterDelay();
    const tokens = createTokenStore();
    tokens.set(await (await createTestIssuer()).issue({ scopes: ["admin"] }));
    render(<App tokens={tokens} />);
    const row = await screen.findByText("books.archive", {}, { timeout: 2000 });
    const cells = [...(row.closest("tr")?.querySelectorAll("td") ?? [])].map(
      (cell) => cell.textContent,
    );
    expect(cells).toEqual(["request", "books.archive", "mcp", "agent", "200", "4.0"]);
  });
});

describe("views", () => {
  const SNAPSHOT = {
    name: "stats",
    total: 10,
    errors: 2,
    cacheHits: 1,
    ...ZERO_RUNTIME,
    byCapability: {
      "books.get": {
        count: 7,
        errors: 2,
        cacheHits: 1,
        totalLatencyMs: 70,
        firstSeen: "2026-10-31T00:00:00.000Z",
        lastSeen: "2026-10-31T00:02:00.000Z",
      },
      "books.list": {
        count: 3,
        errors: 0,
        cacheHits: 0,
        totalLatencyMs: 9,
        firstSeen: "2026-10-31T00:00:00.000Z",
        lastSeen: "2026-10-31T00:00:30.000Z",
      },
    },
  };

  function routed(): typeof fetch {
    return (async (input: URL | string) => {
      const path = new URL(String(input)).pathname;
      if (path.endsWith("/stats")) {
        return Response.json(SNAPSHOT);
      }
      if (path.endsWith("/logs")) {
        return Response.json({ events: [EVENT] });
      }
      return new Response(new ReadableStream());
    }) as unknown as typeof fetch;
  }

  async function admin() {
    const tokens = createTokenStore();
    tokens.set(await (await createTestIssuer()).issue({ scopes: ["admin"] }));
    return tokens;
  }

  test("the statistics view shows the totals from the API", async () => {
    globalThis.fetch = routed();
    render(<App tokens={await admin()} />);
    fireEvent.click(screen.getByText(message(MessageId.UiNavStats)));
    await waitFor(() =>
      expect(document.querySelector('[data-stat="total"]')?.textContent).toBe("10"),
    );
  });

  test("the statistics table shows average latency and rate per capability", async () => {
    globalThis.fetch = routed();
    render(<App tokens={await admin()} />);
    fireEvent.click(screen.getByText(message(MessageId.UiNavStats)));
    await waitFor(() => expect(document.querySelectorAll('[data-row="stat"]').length).toBe(2));
    const row = document.querySelector('[data-row="stat"]');
    const cells = [...(row?.querySelectorAll("td") ?? [])].map((cell) => cell.textContent);
    expect(cells).toEqual(["books.get", "7", "2", "1", "10.0", "3.5"]);
  });

  test("filtering by capability narrows the statistics and the totals", async () => {
    globalThis.fetch = routed();
    render(<App tokens={await admin()} />);
    fireEvent.click(screen.getByText(message(MessageId.UiNavStats)));
    await waitFor(() => expect(document.querySelectorAll('[data-row="stat"]').length).toBe(2));
    const filter = screen.getByLabelText(message(MessageId.UiFilterStats));
    fireEvent.change(filter, { target: { value: "books.list" } });
    await waitFor(() =>
      expect(document.querySelector('[data-stat="total"]')?.textContent).toBe("3"),
    );
  });

  test("the request log lists events and filters them by capability", async () => {
    globalThis.fetch = routed();
    render(<App tokens={await admin()} />);
    fireEvent.click(screen.getByText(message(MessageId.UiNavLogs)));
    const filter = screen.getByLabelText(message(MessageId.UiFilterCapability));
    fireEvent.change(filter, { target: { value: "books.archive" } });
    expect((filter as HTMLInputElement).value).toBe("books.archive");
  });
});
