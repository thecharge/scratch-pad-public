import { cacheHintFor } from "@platform/cache";
import { behaviorOf, fieldBehaviors, withBehavior } from "@platform/capability";
import {
  CacheScope,
  CanonicalCode,
  ErrorMetadataKey,
  ErrorReason,
  FieldBehavior,
  MaskStrategy,
  MessageId,
  PrincipalKind,
  SensitivePath,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { sensitivePaths } from "@platform/masking";
import { DeclarativePolicyEngine, visibleTo } from "@platform/policy";
import { retryAfterSeconds } from "@platform/ratelimit";
import { lazy } from "@platform/store";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { z } from "zod";
import { bearerTokenFrom } from "../../../packages/auth/src/resolve.ts";
import { groupCapabilities, groupNameOf } from "../../../packages/skill-protocol/src/generate.ts";

const limited = (metadata: Record<string, string>) =>
  new ApiError(
    CanonicalCode.ResourceExhausted,
    ErrorReason.RateLimited,
    MessageId.RateLimited,
    {},
    metadata,
  );
const withAuth = (value: string) => new Headers({ authorization: value });
const resource = (path: string, id = "x") => ({ id, resource: path });
const rule = (path: string) => ({ path, strategy: MaskStrategy.Remove });
const masked = (path: string) => ({ resource: "r", id: "x", mask: { rules: [rule(path)] } });
const mapOf = (entries: [string, unknown][] = []) => new Map(entries);

const AGENT_ONLY = { policy: { allowedKinds: [PrincipalKind.Agent] } };
const WRITER = { kind: PrincipalKind.User, scopes: ["write"], roles: [] };
const REQUIRES_WRITE = { policy: { requiredScopes: ["write"] } };
const ENGINE = new DeclarativePolicyEngine();
const explode = (text: string) => () => {
  throw new Error(text);
};

unit(cacheHintFor, {
  positive: [
    positive("a block gives its ttl and scope", [{ ttlMs: 500, scope: CacheScope.Public }], {
      ttlMs: 500,
      cacheScope: CacheScope.Public,
    }),
    positive("a private block", [{ ttlMs: 1, scope: CacheScope.Private }], {
      ttlMs: 1,
      cacheScope: CacheScope.Private,
    }),
  ],
  negative: [
    rejected("no block means no caching and private", [undefined], {
      ttlMs: 0,
      cacheScope: CacheScope.Private,
    }),
    rejected("a zero ttl is kept", [{ ttlMs: 0, scope: CacheScope.Public }], {
      ttlMs: 0,
      cacheScope: CacheScope.Public,
    }),
  ],
});

unit(retryAfterSeconds, {
  positive: [
    positive(
      "the metadata value as a number",
      [limited({ [ErrorMetadataKey.RetryAfterSeconds]: "7" })],
      7,
    ),
    positive("a fraction is kept", [limited({ [ErrorMetadataKey.RetryAfterSeconds]: "1.5" })], 1.5),
  ],
  negative: [
    rejected("no metadata means no value", [limited({})], undefined),
    rejected(
      "a text value is not a number",
      [limited({ [ErrorMetadataKey.RetryAfterSeconds]: "soon" })],
      Number.NaN,
    ),
  ],
});

unit(lazy, {
  positive: [
    positive("a plain value", [() => 5], 5, []),
    positive("an async value is awaited", [async () => "late"], "late", []),
  ],
  negative: [
    negative("a throwing factory rejects", [explode("sync")], { message: "sync" }, []),
    negative(
      "a rejecting factory rejects",
      [async () => Promise.reject(new Error("async"))],
      { message: "async" },
      [],
    ),
  ],
});

unit(sensitivePaths, {
  positive: [
    positive("built-in paths without capabilities", [[]], Object.values(SensitivePath)),
    positive(
      "a declared path is added",
      [[masked("author.email")]],
      [...Object.values(SensitivePath), "author.email"],
    ),
  ],
  negative: [
    rejected(
      "a path declared twice appears once",
      [[masked("a.b"), masked("a.b")]],
      [...Object.values(SensitivePath), "a.b"],
    ),
    rejected(
      "a built-in path is not repeated",
      [[masked(SensitivePath.Token)]],
      Object.values(SensitivePath),
    ),
  ],
});

unit(bearerTokenFrom, {
  positive: [
    positive("a bearer token", [withAuth("Bearer abc")], "abc"),
    positive("the scheme is case-insensitive", [withAuth("bearer abc")], "abc"),
  ],
  negative: [
    rejected("no header", [new Headers()], undefined),
    rejected("another scheme", [withAuth("Basic abc")], undefined),
    rejected("no token after the scheme", [withAuth("Bearer ")], undefined),
    rejected("no space in the header", [withAuth("Bearer-abc")], undefined),
  ],
});

unit(groupNameOf, {
  positive: [
    positive(
      "the last collection of the resource",
      [resource("publishers/{publisher}/books/{book}")],
      "books",
    ),
    positive("lower case", [resource("Stats")], "stats"),
  ],
  negative: [
    rejected(
      "only parameters falls back to the id",
      [resource("{a}/{b}", "Books.Get")],
      "books.get",
    ),
    rejected("an empty resource gives an empty name", [resource("", "Only")], ""),
  ],
});

unit(groupCapabilities, {
  positive: [
    positive(
      "capabilities of one collection are grouped",
      [[resource("books/{b}", "a"), resource("books", "b")]],
      [{ name: "books", capabilities: [resource("books/{b}", "a"), resource("books", "b")] }],
    ),
    positive(
      "groups are sorted by name",
      [[resource("stats", "s"), resource("books", "b")]],
      [
        { name: "books", capabilities: [resource("books", "b")] },
        { name: "stats", capabilities: [resource("stats", "s")] },
      ],
    ),
  ],
  negative: [
    rejected("no capabilities, no groups", [[]], []),
    rejected(
      "one capability, one group",
      [[resource("logs", "l")]],
      [{ name: "logs", capabilities: [resource("logs", "l")] }],
    ),
  ],
});

unit(behaviorOf, {
  positive: [
    positive(
      "a declared behavior",
      [await withBehavior(z.string(), FieldBehavior.Required)],
      FieldBehavior.Required,
    ),
    positive(
      "another behavior",
      [await withBehavior(z.string(), FieldBehavior.Immutable)],
      FieldBehavior.Immutable,
    ),
  ],
  negative: [
    rejected("no behavior declared", [z.string()], undefined),
    rejected("other metadata is not a behavior", [z.string().meta({ title: "t" })], undefined),
  ],
});

unit(fieldBehaviors, {
  positive: [
    positive(
      "declared fields by name",
      [z.object({ a: await withBehavior(z.string(), FieldBehavior.Required), b: z.string() })],
      mapOf([["a", FieldBehavior.Required]]),
    ),
    positive(
      "two declared fields",
      [
        z.object({
          a: await withBehavior(z.string(), FieldBehavior.Immutable),
          b: await withBehavior(z.string(), FieldBehavior.OutputOnly),
        }),
      ],
      mapOf([
        ["a", FieldBehavior.Immutable],
        ["b", FieldBehavior.OutputOnly],
      ]),
    ),
  ],
  negative: [
    rejected("no declared field", [z.object({ a: z.string() })], mapOf()),
    rejected("an empty object", [z.object({})], mapOf()),
  ],
});

unit(visibleTo, {
  positive: [
    positive("no policy is visible to everyone", [ENGINE, {}, WRITER], true),
    positive("a policy met by the principal", [ENGINE, REQUIRES_WRITE, WRITER], true),
  ],
  negative: [
    rejected(
      "a missing scope hides the capability",
      [ENGINE, REQUIRES_WRITE, { ...WRITER, scopes: [] }],
      false,
    ),
    rejected("a kind that is not allowed hides it", [ENGINE, AGENT_ONLY, WRITER], false),
  ],
});
