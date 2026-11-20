import {
  MAX_DISPLAY_NAME_CODE_POINTS,
  RESOURCE_ID_PATTERN,
  UnicodeForm,
} from "@platform/constants";
import { z } from "zod";

const DURATION_PATTERN = /^-?\d+(\.\d{1,9})?s$/;
const INT64_PATTERN = /^-?\d+$/;
const ETAG_PATTERN = /^(W\/)?"[^"]*"$/;

export const timestampSchema = z.iso.datetime({ offset: true });

export const durationSchema = z.string().regex(DURATION_PATTERN);

export const int64Schema = z.string().regex(INT64_PATTERN);

export const resourceIdSchema = z.string().regex(RESOURCE_ID_PATTERN);

export const etagSchema = z.string().regex(ETAG_PATTERN);

export const displayNameSchema = z
  .string()
  .transform((value) => value.normalize(UnicodeForm.Nfc))
  .refine((value) => [...value].length <= MAX_DISPLAY_NAME_CODE_POINTS);

export const requestIdSchema = z.uuid();
