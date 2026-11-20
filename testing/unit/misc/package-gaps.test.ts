import { afterAll, describe, expect, test } from "bun:test";
import { join } from "node:path";
import { comparatorFor, matchesFilter, parseFilter } from "@platform/aip";
import { createJwksProvider, scopesFromClaims } from "@platform/auth";
import {
  AuthProviderKind,
  BookState,
  CONFIG_ROW_ID,
  EventKind,
  FilterComparator,
  FilterFieldKind,
  FilterNodeKind,
  MAX_SUBSCRIBERS,
  OrderDirection,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { EventBus } from "@platform/events";
import { inspectSkill, loadPackageSkills, skillPackageProblems } from "@platform/skill-protocol";
import { thrownBy } from "@platform/test-framework";
import { makeDir, memoryDatabase, removeAll, writeFiles } from "@platform/test-scenarios";
import { type ApiEvent, FilterNodeSchema } from "@platform/types";
import { createDeps } from "../../../apps/api/src/deps.ts";
import { IDLE_OBSERVABILITY, idleSkillOptions } from "../../../apps/api/src/idle.ts";
import {
  DrizzleBookRepository,
  DrizzleSettingsRepository,
} from "../../../packages/db/src/index.ts";

afterAll(removeAll);

const EVENT: ApiEvent = {
  kind: EventKind.Request,
  time: "2026-01-02T03:04:05.000Z",
  requestId: "r1",
  capability: "books.get",
  transport: TransportKind.Http,
  principalKind: PrincipalKind.User,
  status: 200,
  latencyMs: 1,
  cacheHit: false,
};
const BOOK = {
  name: "publishers/p/books/b1",
  title: "T",
  state: BookState.Active,
  createTime: "2026-01-02T03:04:05.000Z",
  updateTime: "2026-01-02T03:04:05.000Z",
  etag: '"e"',
};

describe("the idle observer and skill options", () => {
  test("the idle observer reports no traffic and no events", async () => {
    expect(await IDLE_OBSERVABILITY.stats()).toMatchObject({ total: 0, errors: 0 });
    expect(await IDLE_OBSERVABILITY.recent({})).toEqual([]);
  });

  test("idle skill options show and allow nothing", async () => {
    const options = await idleSkillOptions({ list: async () => [] });
    expect(await options.visible({} as never, {} as never)).toBe(false);
    expect(await options.allowed({} as never, {} as never)).toBe(false);
  });
});

describe("the default dependencies over a real database", () => {
  test("books are inserted, found, listed, saved and removed", async () => {
    const deps = await createDeps(IDLE_OBSERVABILITY, ":memory:");
    await deps.books.insert(BOOK);
    expect(await deps.books.find(BOOK.name)).toMatchObject({ title: "T" });
    expect(await deps.books.list("publishers/p")).toHaveLength(1);
    await deps.books.save({ ...BOOK, title: "U" });
    expect((await deps.books.find(BOOK.name))?.title).toBe("U");
    await deps.books.remove(BOOK.name);
    expect(await deps.books.find(BOOK.name)).toBeUndefined();
  });

  test("settings default and then follow a write", async () => {
    const deps = await createDeps(IDLE_OBSERVABILITY, ":memory:");
    expect((await deps.settings.read()).name).toBe(CONFIG_ROW_ID);
    await deps.settings.write({ name: CONFIG_ROW_ID, bannerText: "Hello", pageSizeDefault: 9 });
    expect(await deps.settings.read()).toMatchObject({ bannerText: "Hello", pageSizeDefault: 9 });
  });

  test("the clock gives the current time and the codec round trips", async () => {
    const deps = await createDeps(IDLE_OBSERVABILITY, ":memory:");
    expect(Math.abs((await deps.now()).getTime() - Date.now())).toBeLessThan(5000);
    const token = await deps.codec.encode(3, ["q"]);
    expect(await deps.codec.decode(token, ["q"])).toBe(3);
  });
});

describe("the repositories", () => {
  test("both repositories work on a database handle of their own", async () => {
    const db = await memoryDatabase();
    const books = new DrizzleBookRepository(db);
    const settings = new DrizzleSettingsRepository(db);
    await books.insert(BOOK);
    expect((await books.list("publishers/p")).map((item) => item.name)).toEqual([BOOK.name]);
    expect(await settings.read()).toMatchObject({ pageSizeDefault: 50 });
  });
});

describe("the event bus", () => {
  test("a subscriber past the ceiling is ignored", async () => {
    const bus = new EventBus();
    const heard: number[] = [];
    Array.from({ length: MAX_SUBSCRIBERS }, (_, index) =>
      bus.subscribe(() => {
        heard.push(index);
      }),
    );
    const extra = bus.subscribe(() => {
      heard.push(-1);
    });
    await bus.publish(EVENT);
    await extra();
    expect(heard).toHaveLength(MAX_SUBSCRIBERS);
    expect(heard).not.toContain(-1);
  });
});

describe("the event bus subscriptions", () => {
  test("an unsubscribed listener hears nothing more", async () => {
    const bus = new EventBus();
    const heard: string[] = [];
    const stop = bus.subscribe((event) => {
      heard.push(event.requestId);
    });
    await bus.publish(EVENT);
    await stop();
    await bus.publish({ ...EVENT, requestId: "r2" });
    expect(heard).toEqual(["r1"]);
  });
});

describe("the package skills of a folder that is not there", () => {
  test("no folder gives no skills and no problems", async () => {
    const absent = join(await makeDir(), "absent");
    expect(await loadPackageSkills([absent])).toEqual([]);
    expect(await skillPackageProblems(absent)).toEqual([]);
  });
});

describe("the jwks provider and the scope claims", () => {
  test("a key set url builds a remote provider without fetching", async () => {
    const provider = await createJwksProvider({
      issuer: "https://issuer.example.test",
      audience: "https://api.example.test",
      resource: "https://api.example.test",
      jwksUrl: "https://issuer.example.test/jwks",
    });
    expect(provider.kind).toBe(AuthProviderKind.Jwks);
  });

  test.each([
    ["a scope text", { scope: "read write" }, ["read", "write"]],
    ["a scope list claim as text is ignored", { scp: "read" }, []],
    ["a scope list claim as a list", { scp: ["read", "admin"] }, ["read", "admin"]],
    ["blank scope text", { scope: "   " }, []],
  ])("%s", async (_name, claims, expected) => {
    expect(await scopesFromClaims(claims)).toEqual(expected);
  });
});

describe("ordering and filters", () => {
  test("a missing value sorts before a present one and after nothing", async () => {
    const compare = comparatorFor([{ path: "rank", direction: OrderDirection.Ascending }]);
    expect(compare({}, { rank: 1 })).toBe(-1);
    expect(compare({ rank: 1 }, {})).toBe(1);
    expect(compare({ rank: null }, { rank: 2 })).toBe(-1);
  });

  const FIELDS = new Map([
    ["title", { kind: FilterFieldKind.String }],
    ["rating", { kind: FilterFieldKind.Number }],
  ]);
  const RESTRICTION = {
    kind: FilterNodeKind.Restriction,
    field: "rating",
    comparator: "~",
    value: 3,
    presence: false,
  };

  test("a text field takes the text as it is", async () => {
    expect(await parseFilter('title = "x"', FIELDS)).toMatchObject({ value: "x" });
  });

  test("a comparator that is not an ordering matches nothing", async () => {
    expect(await matchesFilter(RESTRICTION as never, FIELDS, { rating: 3 })).toBe(false);
  });

  test("a restriction node falls through to the restriction match", async () => {
    const node = { ...RESTRICTION, comparator: FilterComparator.GreaterThan, value: 2 };
    expect(await matchesFilter(node as never, FIELDS, { rating: 3 })).toBe(true);
  });
});

describe("the filter node schema", () => {
  const LEAF = {
    kind: FilterNodeKind.Restriction,
    field: "title",
    comparator: FilterComparator.Equals,
    value: "x",
    presence: false,
  };

  test.each([
    ["and", { kind: FilterNodeKind.And, children: [LEAF] }],
    ["or", { kind: FilterNodeKind.Or, children: [LEAF, LEAF] }],
    ["not", { kind: FilterNodeKind.Not, child: LEAF }],
  ])("a %s node with children parses", (_name, node) => {
    expect(FilterNodeSchema.parse(node as never)).toEqual(node as never);
  });

  test("a node of an unknown kind is refused", () => {
    expect(FilterNodeSchema.safeParse({ kind: "xor", children: [] }).success).toBe(false);
  });
});

describe("a skill package whose catalog read crashes", () => {
  test("a crash that is not a catalog error is rethrown", async () => {
    const root = await makeDir();
    await writeFiles(root, { "books/SKILL.md": "---\nname: books\ndescription: d\n---\nbody\n" });
    const crash = async () => {
      throw new RangeError("catalog crashed");
    };
    expect(await thrownBy(() => inspectSkill(root, "books", crash as never))).toMatchObject({
      name: "RangeError",
    });
  });
});
