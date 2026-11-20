import { createHash } from "node:crypto";
import {
  HEX_ENCODING,
  VERIFICATION_BROAD_PATTERNS,
  VERIFICATION_GUIDE_PATTERNS,
  VERIFICATION_HASH,
  VERIFICATION_PLAN_VERSION,
  VERIFICATION_POLICY,
  VERIFICATION_RUNTIME_CANDIDATES,
  VERIFICATION_SOURCE_PATTERNS,
  VerificationArea,
  VerificationReason,
} from "@platform/constants";
import { filterAsync } from "@platform/store";
import type { VerificationChange, VerificationPlan, VerificationTree } from "@platform/types";
import { VerificationPolicySchema, VerificationTreeSchema } from "@platform/types";
import { all } from "@platform/util";

export async function verificationArea(path: string): Promise<VerificationArea> {
  if (VERIFICATION_GUIDE_PATTERNS.some((pattern) => new Bun.Glob(pattern).match(path))) {
    return VerificationArea.Guide;
  }
  if (VERIFICATION_BROAD_PATTERNS.some((pattern) => new Bun.Glob(pattern).match(path))) {
    return VerificationArea.Broad;
  }
  return VERIFICATION_SOURCE_PATTERNS.some((pattern) => new Bun.Glob(pattern).match(path))
    ? VerificationArea.Source
    : VerificationArea.Unknown;
}

async function hash(value: unknown): Promise<string> {
  return createHash(VERIFICATION_HASH).update(JSON.stringify(value)).digest(HEX_ENCODING);
}

async function reasonsFor(tree: VerificationTree, changes: readonly VerificationChange[]) {
  return [
    VerificationReason.ReportOnly,
    VerificationReason.MissingEvidence,
    ...(tree.range === undefined ? [VerificationReason.MissingRange] : []),
    ...(tree.problems.length > 0 ? [VerificationReason.InspectionFailed] : []),
    ...(tree.dirty.length > 0 ? [VerificationReason.DirtyTree] : []),
    ...(changes.some(({ area }) => area === VerificationArea.Broad)
      ? [VerificationReason.BroadChange]
      : []),
    ...(changes.some(({ area }) => area === VerificationArea.Source)
      ? [VerificationReason.SourceChange]
      : []),
    ...(changes.some(({ area }) => area === VerificationArea.Unknown)
      ? [VerificationReason.UnknownPath]
      : []),
  ];
}

export async function verificationPlan(
  input: VerificationTree,
  commands: Readonly<Record<string, readonly string[]>>,
  identity: readonly string[],
  policy: unknown = VERIFICATION_POLICY,
): Promise<VerificationPlan> {
  const cadence = VerificationPolicySchema.safeParse(policy);
  const tree = VerificationTreeSchema.parse(input);
  const files = [...tree.files].sort((a, b) => a.path.localeCompare(b.path));
  const changes = await all(
    tree.changed.map((path) => async () => ({
      path,
      area: await verificationArea(path),
    })),
  );
  const reasons = await reasonsFor(tree, changes);
  if (!cadence.success) reasons.push(VerificationReason.InvalidPolicy);
  const content = await hash(files);
  const runtime = await hash(
    await filterAsync(
      files,
      async ({ path }) => (await verificationArea(path)) !== VerificationArea.Guide,
    ),
  );
  const candidates = reasons.length === 2;
  const entries = await all(
    Object.entries(commands).map(([step, command]) => async () => ({
      step,
      command: [...command],
      fingerprint: await hash([
        VERIFICATION_PLAN_VERSION,
        VERIFICATION_RUNTIME_CANDIDATES.includes(step) ? runtime : content,
        command,
        identity,
      ]),
      execute: true as const,
      candidate: candidates && VERIFICATION_RUNTIME_CANDIDATES.includes(step),
      reason:
        candidates && VERIFICATION_RUNTIME_CANDIDATES.includes(step)
          ? VerificationReason.Candidate
          : VerificationReason.LiveCheck,
    })),
  );
  return {
    version: VERIFICATION_PLAN_VERSION,
    reportOnly: true,
    fullRequired: true,
    policy: cadence.success ? cadence.data : undefined,
    range: tree.range,
    changes,
    dirty: tree.dirty,
    problems: tree.problems,
    reasons,
    entries,
  };
}
