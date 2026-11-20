export const VERIFICATION_PUSH_ENV = "PLATFORM_VERIFY_PUSH";
export const VERIFICATION_PUSH_FILE = "push.json";
export const VERIFICATION_PUSH_FIELDS = /\s+/;
export const VERIFICATION_PUSH_LINES = /\r?\n/;
export const VERIFICATION_BRANCH_REF = /^refs\/heads\/[^\s]+$/;
export const VERIFICATION_REF_TOKEN = /^\S+$/;
export const VERIFICATION_ZERO_OID = /^0+$/;

export enum VerificationPushReason {
  Missing = "missing-push-updates",
  Invalid = "invalid-push-updates",
  Multiple = "multiple-push-updates",
  Creation = "new-remote-ref",
  Deletion = "deleted-remote-ref",
  NonBranch = "non-branch-update",
}
