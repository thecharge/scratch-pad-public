import { z } from "zod";

export const CollectionSchema = z.object({
  field: z.string(),
  element: z.custom<z.ZodType>(),
});
export type Collection = z.infer<typeof CollectionSchema>;
