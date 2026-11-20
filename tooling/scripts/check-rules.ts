import { join } from "node:path";
import {
  DevRule,
  FULL_VERIFY_HOOK_COMMAND,
  FULL_VERIFY_HOOK_NAME,
  HookJob,
  HookStage,
  JOB_VERIFY_STEPS,
  MESSAGE_JOBS,
  MessageId,
  RepoPath,
  RULE_JOBS,
  VERIFY_COMMANDS,
  VERIFY_COMMANDS_NAME,
} from "@platform/constants";
import { message } from "@platform/messages";
import { LefthookSchema } from "@platform/types";
import { finish, REPO_ROOT } from "./tools.ts";

const JOB_NAME_PATTERN = /^\s*- name:\s*(\S+)/gm;

export async function jobsIn(lefthook: string): Promise<Set<string>> {
  return new Set([...lefthook.matchAll(JOB_NAME_PATTERN)].map((match) => match[1] as string));
}

export async function missingJobs(lefthook: string): Promise<string[]> {
  const jobs = await jobsIn(lefthook);
  const verify = new Set<string>(Object.keys(VERIFY_COMMANDS));
  const parsed = LefthookSchema.safeParse(Bun.YAML.parse(lefthook));
  const fullGate =
    parsed.success &&
    parsed.data[HookStage.PrePush]?.jobs.some(
      (job) => job.name === FULL_VERIFY_HOOK_NAME && job.run === FULL_VERIFY_HOOK_COMMAND,
    );
  return Object.entries(RULE_JOBS).flatMap(([rule, ruleJobs]) =>
    ruleJobs.flatMap((job) => [
      ...(jobs.has(job) || (fullGate && job !== HookJob.Comments && !MESSAGE_JOBS.includes(job))
        ? []
        : [message(MessageId.RuleJobMissing, { rule, job, where: RepoPath.Lefthook })]),
      ...(verify.has(JOB_VERIFY_STEPS[job])
        ? []
        : [message(MessageId.RuleJobMissing, { rule, job, where: VERIFY_COMMANDS_NAME })]),
    ]),
  );
}

export async function checkRules(root: string = REPO_ROOT): Promise<number> {
  const lefthook = await Bun.file(join(root, RepoPath.Lefthook)).text();
  return finish(
    await missingJobs(lefthook),
    message(MessageId.RulesOk, { count: Object.keys(DevRule).length }),
  );
}

if (import.meta.main) process.exit(await checkRules());
