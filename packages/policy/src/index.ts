import { PolicyOutcome, PolicyReason } from "@platform/constants";
import type {
  Capability,
  PolicyBlock,
  PolicyDecision,
  PolicyEngine,
  Principal,
} from "@platform/types";

const ALLOW: PolicyDecision = { outcome: PolicyOutcome.Allow, reason: PolicyReason.Allowed };

async function deny(reason: PolicyReason): Promise<PolicyDecision> {
  return { outcome: PolicyOutcome.Deny, reason };
}

async function kindAllowed(block: PolicyBlock, principal: Principal): Promise<boolean> {
  return block.allowedKinds === undefined || block.allowedKinds.includes(principal.kind);
}

async function scopesHeld(block: PolicyBlock, principal: Principal): Promise<boolean> {
  return (block.requiredScopes ?? []).every((scope) => principal.scopes.includes(scope));
}

async function roleHeld(block: PolicyBlock, principal: Principal): Promise<boolean> {
  return (
    block.anyRole === undefined || block.anyRole.some((role) => principal.roles.includes(role))
  );
}

export class DeclarativePolicyEngine implements PolicyEngine {
  constructor() {}

  async evaluate(block: PolicyBlock, principal: Principal): Promise<PolicyDecision> {
    if (!(await kindAllowed(block, principal))) {
      return deny(PolicyReason.KindNotAllowed);
    }
    if (!(await scopesHeld(block, principal))) {
      return deny(PolicyReason.MissingScope);
    }
    return (await roleHeld(block, principal)) ? ALLOW : await deny(PolicyReason.MissingRole);
  }
}

export async function allowedBy(
  engine: DeclarativePolicyEngine,
  block: PolicyBlock,
  principal: Principal,
): Promise<boolean> {
  return (await engine.evaluate(block, principal)).outcome === PolicyOutcome.Allow;
}

export async function visibleTo(
  engine: DeclarativePolicyEngine,
  capability: Capability,
  principal: Principal,
): Promise<boolean> {
  return capability.policy === undefined || (await allowedBy(engine, capability.policy, principal));
}
