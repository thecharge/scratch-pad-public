import { BearerMethod } from "@platform/constants";
import { z } from "zod";

export const ProtectedResourceMetadataSchema = z.object({
  resource: z.string(),
  authorization_servers: z.array(z.string()).min(1),
  scopes_supported: z.array(z.string()).optional(),
  bearer_methods_supported: z.array(z.enum(BearerMethod)).optional(),
  resource_name: z.string().optional(),
});
export type ProtectedResourceMetadata = z.infer<typeof ProtectedResourceMetadataSchema>;
