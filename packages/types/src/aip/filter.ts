import {
  FilterComparator,
  FilterFieldKind,
  FilterNodeKind,
  FilterTokenKind,
} from "@platform/constants";
import { z } from "zod";

export const FilterFieldSchema = z.object({
  kind: z.enum(FilterFieldKind),
  values: z.array(z.string()).optional(),
});
export type FilterField = z.infer<typeof FilterFieldSchema>;

export const FilterFieldsSchema = z.map(z.string(), FilterFieldSchema);
export type FilterFields = z.infer<typeof FilterFieldsSchema>;

export const FilterValueSchema = z.union([z.string(), z.number(), z.boolean()]);
export type FilterValue = z.infer<typeof FilterValueSchema>;

export const FilterTokenSchema = z.object({
  kind: z.enum(FilterTokenKind),
  text: z.string(),
});
export type FilterToken = z.infer<typeof FilterTokenSchema>;

export const ScanStepSchema = z.object({
  token: FilterTokenSchema.optional(),
  next: z.number().int().nonnegative(),
});
export type ScanStep = z.infer<typeof ScanStepSchema>;

export const FilterRestrictionSchema = z.object({
  kind: z.literal(FilterNodeKind.Restriction),
  field: z.string(),
  comparator: z.enum(FilterComparator),
  value: FilterValueSchema,
  presence: z.boolean(),
});
export type FilterRestriction = z.infer<typeof FilterRestrictionSchema>;

export const FilterAndSchema = z.object({
  kind: z.literal(FilterNodeKind.And),
  get children() {
    return z.array(FilterNodeSchema);
  },
});

export const FilterOrSchema = z.object({
  kind: z.literal(FilterNodeKind.Or),
  get children() {
    return z.array(FilterNodeSchema);
  },
});

export const FilterNotSchema = z.object({
  kind: z.literal(FilterNodeKind.Not),
  get child() {
    return FilterNodeSchema;
  },
});

export const FilterNodeSchema = z.union([
  FilterAndSchema,
  FilterOrSchema,
  FilterNotSchema,
  FilterRestrictionSchema,
]);
export type FilterNode = z.infer<typeof FilterNodeSchema>;
