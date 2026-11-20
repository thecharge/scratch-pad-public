import type { CanonicalCode, ErrorReason } from "@platform/constants";

export class ApiClientError extends Error {
  readonly status: CanonicalCode;
  readonly reason: ErrorReason | undefined;
  readonly httpStatus: number | undefined;

  constructor(status: CanonicalCode, text: string, reason?: ErrorReason, httpStatus?: number) {
    super(text);
    this.name = new.target.name;
    this.status = status;
    this.reason = reason;
    this.httpStatus = httpStatus;
  }
}
