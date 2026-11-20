import { PrincipalKind } from "@platform/constants";
import { z } from "zod";
import { JsonObjectSchema } from "../json.ts";

export const PrincipalSchema = z.object({
  kind: z.enum(PrincipalKind),
  subject: z.string().optional(),
  scopes: z.array(z.string()),
  roles: z.array(z.string()),
});
export type Principal = z.infer<typeof PrincipalSchema>;

export const ANONYMOUS_PRINCIPAL: Principal = {
  kind: PrincipalKind.Anonymous,
  scopes: [],
  roles: [],
};

export const AuthInfoSchema = z.object({
  token: z.string(),
  clientId: z.string(),
  scopes: z.array(z.string()),
  expiresAt: z.number(),
  resource: z.instanceof(URL).optional(),
  extra: JsonObjectSchema.optional(),
});
export type AuthInfo = z.infer<typeof AuthInfoSchema>;
