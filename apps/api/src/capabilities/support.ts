import { computeEtag } from "@platform/aip";
import {
  ApiVersion,
  CanonicalCode,
  ErrorReason,
  MaskStrategy,
  MessageId,
  type MethodKind,
  Scope,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { message } from "@platform/messages";
import type { Book, MaskBlock, PolicyBlock } from "@platform/types";

export async function notFound(name: string): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.NotFound,
    ErrorReason.ResourceNotFound,
    MessageId.ResourceNotFound,
    { name },
  );
}

export async function describe(
  id: string,
  method: MethodKind,
  resource: string,
  summaryId: MessageId,
  version: ApiVersion = ApiVersion.V1,
) {
  const summary = message(summaryId);
  return {
    id,
    version,
    method,
    resource,
    summary,
    description: message(MessageId.CapabilityDescription, { summary, resource }),
  };
}

export const WRITE_POLICY: PolicyBlock = { requiredScopes: [Scope.Write] };
export const READ_POLICY: PolicyBlock = { requiredScopes: [Scope.Read] };
export const ADMIN_POLICY: PolicyBlock = { requiredScopes: [Scope.Admin] };

export async function emailMask(path: string): Promise<MaskBlock> {
  return { rules: [{ path, strategy: MaskStrategy.Remove, unlessScope: Scope.Read }] };
}

export async function stamp(book: Book, now: Date): Promise<Book> {
  const { etag: _etag, ...rest } = book;
  const updated = { ...rest, updateTime: now.toISOString() };
  return { ...updated, etag: await computeEtag(updated) };
}
