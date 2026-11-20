import { defineCapability, withBehavior } from "@platform/capability";
import {
  ApiVersion,
  AuthMode,
  FieldBehavior,
  HttpMethod,
  MessageId,
  MethodKind,
} from "@platform/constants";
import { behaves, negative, positive, rejected, unit } from "@platform/test-factories";
import { z } from "zod";

const INPUT = z.strictObject({ name: z.string() });
const BASE = {
  id: "books.get",
  version: ApiVersion.V1,
  method: MethodKind.Get,
  resource: "publishers/{publisher}/books/{book}",
  summary: "Get a book",
  description: "Returns one book.",
  auth: AuthMode.None,
  input: INPUT,
  output: z.object({ name: z.string() }),
  handler: ({ name }: z.infer<typeof INPUT>) => ({ name }),
};
const CUSTOM = { ...BASE, id: "books.archive", method: MethodKind.Custom, customVerb: "archive" };

unit(defineCapability, {
  positive: [
    positive("a standard method keeps every field", [BASE], { ...BASE }),
    positive("a custom method that names its verb is accepted", [CUSTOM], { ...CUSTOM }),
  ],
  negative: [
    negative("an empty id", [{ ...BASE, id: "  " }], { messageId: MessageId.EmptyCapabilityId }),
    negative("a missing auth mode", [{ ...BASE, auth: undefined }], {
      messageId: MessageId.MissingAuthMode,
    }),
    negative("a custom method without a verb", [{ ...BASE, method: MethodKind.Custom }], {
      messageId: MessageId.CustomVerbMismatch,
    }),
    negative("a verb on a standard method", [{ ...BASE, customVerb: "archive" }], {
      messageId: MessageId.CustomVerbMismatch,
    }),
    negative("an http method on a standard method", [{ ...BASE, httpMethod: HttpMethod.Post }], {
      messageId: MessageId.HttpMethodForStandard,
    }),
  ],
});

const probe = (accepts: unknown[], rejects: unknown[], meta?: Record<string, unknown>) =>
  behaves({ accepts, rejects, ...(meta === undefined ? {} : { meta }) });
const REQUIRED_META = { fieldBehavior: FieldBehavior.Required };
const OUTPUT_META = { fieldBehavior: FieldBehavior.OutputOnly, readOnly: true };
const INPUT_META = { fieldBehavior: FieldBehavior.InputOnly, writeOnly: true };
const NO_FLAGS = { readOnly: undefined, writeOnly: undefined };

unit(withBehavior, {
  positive: [
    positive(
      "a required field still accepts its own type and records the behavior",
      [z.string(), FieldBehavior.Required],
      probe(["x"], [], REQUIRED_META),
    ),
    positive(
      "an output-only field is flagged read-only",
      [z.string(), FieldBehavior.OutputOnly],
      probe(["x"], [], OUTPUT_META),
    ),
    positive(
      "an input-only field is flagged write-only",
      [z.string(), FieldBehavior.InputOnly],
      probe(["x"], [], INPUT_META),
    ),
  ],
  negative: [
    rejected(
      "annotating does not widen what the schema accepts",
      [z.string(), FieldBehavior.Required],
      probe([], [42, null, undefined]),
    ),
    rejected(
      "a required field carries no read-only flag",
      [z.number(), FieldBehavior.Required],
      probe([], ["x"], NO_FLAGS),
    ),
  ],
});
