import { ConfigIssueCode } from "@platform/constants";
import { z } from "zod";

export const ConfigIssueSchema = z.object({
  variable: z.string(),
  code: z.enum(ConfigIssueCode),
});
export type ConfigIssue = z.infer<typeof ConfigIssueSchema>;
