import { z } from "zod";

export const FlagValuesSchema = z.record(z.string(), z.boolean());
export type FlagValues = z.infer<typeof FlagValuesSchema>;
