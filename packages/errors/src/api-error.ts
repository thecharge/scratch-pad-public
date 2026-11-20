import {
  CANONICAL_CODE_HTTP_STATUS,
  type CanonicalCode,
  ErrorDetailType,
  type ErrorReason,
  type MessageId,
  REASON_HTTP_STATUS,
} from "@platform/constants";
import { message } from "@platform/messages";
import type {
  ApiErrorBody,
  ErrorInfo,
  Failure,
  MessageParams,
  StringRecord,
} from "@platform/types";

export class ApiError extends Error {
  readonly code: CanonicalCode;
  readonly reason: ErrorReason;
  readonly messageId: MessageId;
  readonly params: MessageParams;
  readonly metadata: StringRecord;

  constructor(
    code: CanonicalCode,
    reason: ErrorReason,
    messageId: MessageId,
    params: MessageParams = {},
    metadata: StringRecord = {},
  ) {
    super(message(messageId, params));
    this.name = new.target.name;
    this.code = code;
    this.reason = reason;
    this.messageId = messageId;
    this.params = params;
    this.metadata = metadata;
  }

  static async fromFailure(failure: Failure): Promise<ApiError> {
    return new ApiError(
      failure.code,
      failure.reason,
      failure.messageId,
      failure.params,
      failure.metadata,
    );
  }

  async toFailure(): Promise<Failure> {
    return {
      code: this.code,
      reason: this.reason,
      messageId: this.messageId,
      params: this.params,
      metadata: this.metadata,
    };
  }

  get httpStatus(): number {
    return REASON_HTTP_STATUS[this.reason] ?? CANONICAL_CODE_HTTP_STATUS[this.code];
  }

  private async info(domain: string): Promise<ErrorInfo> {
    const hasMetadata = Object.keys(this.metadata).length > 0;
    return {
      "@type": ErrorDetailType.ErrorInfo,
      reason: this.reason,
      domain,
      ...(hasMetadata ? { metadata: structuredClone(this.metadata) } : {}),
    };
  }

  async toBody(domain: string): Promise<ApiErrorBody> {
    return {
      error: {
        code: this.httpStatus,
        message: this.message,
        status: this.code,
        details: [await this.info(domain)],
      },
    };
  }
}
