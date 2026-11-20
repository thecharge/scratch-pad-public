import { FieldBehavior } from "@platform/constants";
import { z } from "zod";

export const UpdateRulesSchema = z.object({
  behaviors: z.map(z.string(), z.enum(FieldBehavior)),
});
export type UpdateRules = z.infer<typeof UpdateRulesSchema>;
