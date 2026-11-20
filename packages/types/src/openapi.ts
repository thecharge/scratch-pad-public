import { OPENAPI_STABILITY_KEY } from "@platform/constants";
import { z } from "zod";
import { JsonObjectSchema } from "./json.ts";

export const OpenApiParameterSchema = z.looseObject({ name: z.string(), in: z.string() });
export type OpenApiParameter = z.infer<typeof OpenApiParameterSchema>;

export const OpenApiOperationSchema = z.looseObject({
  operationId: z.string(),
  security: z.array(JsonObjectSchema).optional(),
  parameters: z.array(OpenApiParameterSchema).optional(),
  requestBody: JsonObjectSchema.optional(),
  responses: JsonObjectSchema,
});
export type OpenApiOperation = z.infer<typeof OpenApiOperationSchema>;

export const OpenApiOperationDocSchema = z.looseObject({
  operationId: z.string(),
  summary: z.string().optional(),
  security: z.array(JsonObjectSchema).optional(),
  parameters: z.array(OpenApiParameterSchema).optional(),
  requestBody: JsonObjectSchema.optional(),
  responses: JsonObjectSchema,
  [OPENAPI_STABILITY_KEY]: z.string().optional(),
});
export type OpenApiOperationDoc = z.infer<typeof OpenApiOperationDocSchema>;

export const OpenApiEntrySchema = z.object({
  method: z.string(),
  path: z.string(),
  operation: OpenApiOperationDocSchema,
});
export type OpenApiEntry = z.infer<typeof OpenApiEntrySchema>;

export const OpenApiDocumentSchema = z.looseObject({
  openapi: z.string(),
  info: z.looseObject({
    title: z.string(),
    version: z.string(),
    description: z.string().optional(),
  }),
  paths: z.record(z.string(), z.record(z.string(), OpenApiOperationSchema)),
  components: JsonObjectSchema,
});
export type OpenApiDocument = z.infer<typeof OpenApiDocumentSchema>;

export const LiveToolSchema = z.object({
  name: z.string(),
  description: z.string(),
  inputSchema: JsonObjectSchema,
});
export type LiveTool = z.infer<typeof LiveToolSchema>;

export const LiveInterfacesSchema = z.object({
  document: OpenApiDocumentSchema,
  tools: z.array(LiveToolSchema),
});
export type LiveInterfaces = z.infer<typeof LiveInterfacesSchema>;
