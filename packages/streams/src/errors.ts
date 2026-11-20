import type { MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import type { MessageParams } from "@platform/types";

export class StreamError extends Error {
  readonly messageId: MessageId;
  readonly params: MessageParams;

  constructor(messageId: MessageId, params: MessageParams = {}) {
    super(message(messageId, params));
    this.name = new.target.name;
    this.messageId = messageId;
    this.params = params;
  }
}
