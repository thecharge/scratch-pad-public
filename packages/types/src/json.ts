import { z } from "zod";

export const JsonObjectSchema = z.record(z.string(), z.unknown());
export type JsonObject = z.infer<typeof JsonObjectSchema>;

export const MessageParamsSchema = z.record(z.string(), z.union([z.string(), z.number()]));
export type MessageParams = z.infer<typeof MessageParamsSchema>;

export const StringRecordSchema = z.record(z.string(), z.string());
export type StringRecord = z.infer<typeof StringRecordSchema>;
