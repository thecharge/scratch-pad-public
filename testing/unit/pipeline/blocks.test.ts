import { describe, expect, test } from "bun:test";
import { defineCapability } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  CanonicalCode,
  ErrorReason,
  MaskStrategy,
  MethodKind,
  PrincipalKind,
  TransportKind,
} from "@platform/constants";
import { PathMasker } from "@platform/masking";
import { createPipeline } from "@platform/pipeline";
import { DeclarativePolicyEngine } from "@platform/policy";
import { thrownBy } from "@platform/test-framework";
import type { AccessBlocks, MaskBlock, PolicyBlock, Principal } from "@platform/types";
import { z } from "zod";

const READER: Principal = { kind: PrincipalKind.User, subject: "u", scopes: ["read"], roles: [] };
const ADMIN: Principal = { ...READER, scopes: ["read", "pii"] };
const POLICY: PolicyBlock = { requiredScopes: ["read"] };
const MASK: MaskBlock = {
  rules: [{ path: "email", strategy: MaskStrategy.Remove, unlessScope: "pii" }],
};
const OUTPUT = z.object({ name: z.string(), email: z.string() });
const RECORD = { name: "Ada", email: "ada@example.com" };

async function capability(blocks: AccessBlocks) {
  return defineCapability({
    id: "people.get",
    version: ApiVersion.V1,
    method: MethodKind.Get,
    resource: "people/{person}",
    summary: "s",
    description: "d",
    auth: AuthMode.Required,
    input: z.object({}),
    output: OUTPUT,
    handler: () => RECORD,
    ...blocks,
  });
}

async function call(blocks: AccessBlocks, principal: Principal) {
  const invoke = await createPipeline({
    policy: new DeclarativePolicyEngine(),
    masker: new PathMasker(),
  });
  return invoke(
    await capability(blocks),
    {},
    {
      principal,
      requestId: "r",
      transport: TransportKind.Http,
      authEnabled: true,
    },
  );
}

describe("policy and masking are independent", () => {
  test.each<[string, AccessBlocks, Principal, unknown]>([
    ["neither block returns the full record", {}, READER, RECORD],
    ["only policy lets an allowed caller see everything", { policy: POLICY }, READER, RECORD],
    [
      "only mask hides the field from a caller without the scope",
      { mask: MASK },
      READER,
      { name: "Ada" },
    ],
    ["only mask shows it to a caller with the scope", { mask: MASK }, ADMIN, RECORD],
    ["both: allowed and masked", { policy: POLICY, mask: MASK }, READER, { name: "Ada" }],
    ["both: allowed and unmasked", { policy: POLICY, mask: MASK }, ADMIN, RECORD],
  ])("%s", async (_name, blocks, principal, expected) => {
    expect((await call(blocks, principal)).output).toEqual(expected);
  });

  test("a denied caller gets no data even when a mask would hide the field", async () => {
    const denied = { ...READER, scopes: [] };
    expect(await thrownBy(async () => call({ policy: POLICY, mask: MASK }, denied))).toMatchObject({
      code: CanonicalCode.PermissionDenied,
      reason: ErrorReason.PolicyDenied,
    });
  });
});
