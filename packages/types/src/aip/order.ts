import { OrderDirection } from "@platform/constants";
import { z } from "zod";

export const OrderTermSchema = z.object({
  path: z.string(),
  direction: z.enum(OrderDirection),
});
export type OrderTerm = z.infer<typeof OrderTermSchema>;
