import { AuthVariable, McpMethod } from "@platform/constants";
import { z } from "zod";
import { FailureSchema } from "../errors/error-info.ts";
import { AuthInfoSchema, PrincipalSchema } from "./principal.ts";

export const AuthResolutionSchema = z.object({
  principal: PrincipalSchema,
  authInfo: AuthInfoSchema.optional(),
  failure: FailureSchema.optional(),
  tokenPresented: z.boolean(),
});
export type AuthResolution = z.infer<typeof AuthResolutionSchema>;

export const AuthVariablesSchema = z.object({
  [AuthVariable.Principal]: PrincipalSchema,
  [AuthVariable.Resolution]: AuthResolutionSchema,
});
export type AuthVariables = z.infer<typeof AuthVariablesSchema>;

export const AuthEnvSchema = z.object({ Variables: AuthVariablesSchema });
export type AuthEnv = z.infer<typeof AuthEnvSchema>;

export const ToolCallRequestSchema = z.object({
  method: z.literal(McpMethod.ToolsCall),
  params: z.object({ name: z.string() }),
});
export type ToolCallRequest = z.infer<typeof ToolCallRequestSchema>;
