import { describe, expect, test } from "bun:test";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  MethodKind,
  PolicyOutcome,
  PolicyReason,
  PrincipalKind,
} from "@platform/constants";
import { allowedBy, DeclarativePolicyEngine, visibleTo } from "@platform/policy";
import { positive, rejected, unit } from "@platform/test-factories";
import { ANONYMOUS_PRINCIPAL, type PolicyBlock, type Principal } from "@platform/types";
import { z } from "zod";

const USER: Principal = {
  kind: PrincipalKind.User,
  subject: "u",
  scopes: ["read"],
  roles: ["editor"],
};
const AGENT: Principal = { ...USER, kind: PrincipalKind.Agent };
const engine = new DeclarativePolicyEngine();

describe("evaluate", () => {
  test.each<[string, PolicyBlock, Principal, PolicyOutcome, PolicyReason]>([
    [
      "an empty block allows anyone",
      {},
      ANONYMOUS_PRINCIPAL,
      PolicyOutcome.Allow,
      PolicyReason.Allowed,
    ],
    [
      "a listed kind is allowed",
      { allowedKinds: [PrincipalKind.User] },
      USER,
      PolicyOutcome.Allow,
      PolicyReason.Allowed,
    ],
    [
      "an unlisted kind is denied",
      { allowedKinds: [PrincipalKind.User] },
      AGENT,
      PolicyOutcome.Deny,
      PolicyReason.KindNotAllowed,
    ],
    [
      "anonymous never holds a scope",
      { requiredScopes: ["read"] },
      ANONYMOUS_PRINCIPAL,
      PolicyOutcome.Deny,
      PolicyReason.MissingScope,
    ],
    [
      "every scope must be held",
      { requiredScopes: ["read", "write"] },
      USER,
      PolicyOutcome.Deny,
      PolicyReason.MissingScope,
    ],
    [
      "all scopes held",
      { requiredScopes: ["read"] },
      USER,
      PolicyOutcome.Allow,
      PolicyReason.Allowed,
    ],
    [
      "one matching role is enough",
      { anyRole: ["admin", "editor"] },
      USER,
      PolicyOutcome.Allow,
      PolicyReason.Allowed,
    ],
    [
      "no matching role is denied",
      { anyRole: ["admin"] },
      USER,
      PolicyOutcome.Deny,
      PolicyReason.MissingRole,
    ],
    [
      "the kind is checked before scopes",
      { allowedKinds: [PrincipalKind.User], requiredScopes: ["write"] },
      AGENT,
      PolicyOutcome.Deny,
      PolicyReason.KindNotAllowed,
    ],
  ])("%s", async (_name, block, principal, outcome, reason) => {
    expect(await engine.evaluate(block, principal)).toEqual({ outcome, reason });
  });
});

describe("visibleTo", () => {
  const capability = async (policy?: PolicyBlock) =>
    defineCapability({
      id: "books.get",
      version: ApiVersion.V1,
      method: MethodKind.Get,
      resource: "books/{book}",
      summary: "s",
      description: "d",
      auth: AuthMode.Optional,
      input: z.object({}),
      output: z.object({}),
      handler: () => ({}),
      ...(policy === undefined ? {} : { policy }),
    });

  test.each<[string, PolicyBlock | undefined, Principal, boolean]>([
    ["no policy is visible to anonymous", undefined, ANONYMOUS_PRINCIPAL, true],
    ["a satisfied policy is visible", { requiredScopes: ["read"] }, USER, true],
    ["an unsatisfied policy is hidden", { requiredScopes: ["write"] }, USER, false],
  ])("%s", async (_name, policy, principal, expected) => {
    expect(await visibleTo(engine, await capability(policy), principal)).toBe(expected);
  });
});

unit(allowedBy, {
  positive: [
    positive(
      "allows a principal that holds the scope",
      [engine, { requiredScopes: ["read"] }, USER],
      true,
    ),
    positive("allows anyone when the block is empty", [engine, {}, ANONYMOUS_PRINCIPAL], true),
  ],
  negative: [
    rejected(
      "denies a principal without the scope",
      [engine, { requiredScopes: ["write"] }, USER],
      false,
    ),
    rejected(
      "denies a kind that is not listed",
      [engine, { allowedKinds: [PrincipalKind.User] }, AGENT],
      false,
    ),
  ],
});
