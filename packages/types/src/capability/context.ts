import { TransportKind } from "@platform/constants";
import { z } from "zod";
import { OperationSchema } from "../aip/operation.ts";
import { PrincipalSchema } from "../auth/principal.ts";
import { FailureSchema } from "../errors/error-info.ts";

export const CapabilityContextSchema = z.object({
  principal: PrincipalSchema,
  requestId: z.string(),
  transport: z.enum(TransportKind),
  authEnabled: z.boolean(),
  authFailure: FailureSchema.optional(),
  signal: z.instanceof(AbortSignal).optional(),
  onProgress: z.function({ input: [OperationSchema], output: z.promise(z.void()) }).optional(),
});
export type CapabilityContext = z.infer<typeof CapabilityContextSchema>;
