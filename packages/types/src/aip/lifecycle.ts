import { z } from "zod";
import { timestampSchema } from "./primitives.ts";

export const SoftDeleteFieldsSchema = z.object({
  deleteTime: timestampSchema,
  purgeTime: timestampSchema,
});
export type SoftDeleteFields = z.infer<typeof SoftDeleteFieldsSchema>;
