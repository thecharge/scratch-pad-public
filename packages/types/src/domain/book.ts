import { BookState, FieldBehavior, ResourceView } from "@platform/constants";
import { z } from "zod";
import { etagSchema, timestampSchema } from "../aip/primitives.ts";

export const BookSchema = z.object({
  name: z.string().meta({ fieldBehavior: FieldBehavior.OutputOnly, readOnly: true }),
  title: z.string(),
  author: z.string().optional(),
  authorEmail: z.string().optional(),
  state: z.enum(BookState).meta({ fieldBehavior: FieldBehavior.OutputOnly, readOnly: true }),
  createTime: timestampSchema.optional(),
  updateTime: timestampSchema.optional(),
  deleteTime: timestampSchema.optional(),
  purgeTime: timestampSchema.optional(),
  etag: etagSchema.optional(),
});
export type Book = z.infer<typeof BookSchema>;

export const BookListSchema = z.object({
  books: z.array(BookSchema),
  nextPageToken: z.string(),
});
export type BookList = z.infer<typeof BookListSchema>;

export const BookBatchSchema = z.object({ books: z.array(BookSchema) });
export type BookBatch = z.infer<typeof BookBatchSchema>;

export const ConfigSchema = z.object({
  name: z.string().meta({ fieldBehavior: FieldBehavior.OutputOnly, readOnly: true }),
  bannerText: z.string(),
  pageSizeDefault: z.number().int().positive(),
});
export type AppSettings = z.infer<typeof ConfigSchema>;

export const GetBookInputSchema = z.strictObject({
  name: z.string(),
  view: z.enum(ResourceView).optional(),
});

export const ListBooksInputSchema = z.strictObject({
  parent: z.string(),
  pageSize: z.number().int().optional(),
  pageToken: z.string().optional(),
  orderBy: z.string().optional(),
  filter: z.string().optional(),
  showDeleted: z.boolean().optional(),
});

export const CreateBookInputSchema = z.strictObject({
  parent: z.string(),
  name: z.string().optional().meta({ fieldBehavior: FieldBehavior.OutputOnly }),
  bookId: z.string().optional().meta({ fieldBehavior: FieldBehavior.Required }),
  title: z.string().optional().meta({ fieldBehavior: FieldBehavior.Required }),
  author: z.string().optional(),
  authorEmail: z.string().optional(),
  requestId: z.uuid().optional(),
  validateOnly: z.boolean().optional(),
});

export const BatchBookItemSchema = z.strictObject({
  bookId: z.string().optional().meta({ fieldBehavior: FieldBehavior.Required }),
  title: z.string().optional().meta({ fieldBehavior: FieldBehavior.Required }),
  author: z.string().optional(),
  authorEmail: z.string().optional(),
});
export type BatchBookItem = z.infer<typeof BatchBookItemSchema>;

export const BatchCreateBooksInputSchema = z.strictObject({
  parent: z.string(),
  requests: z.array(BatchBookItemSchema),
});

export const DeletePublisherInputSchema = z.strictObject({
  name: z.string(),
  force: z.boolean().optional(),
});

export const PublisherDeletedSchema = z.object({
  name: z.string(),
  deletedBooks: z.number().int(),
});

export const UpdateBookInputSchema = z.strictObject({
  name: z.string(),
  title: z.string().optional(),
  author: z.string().optional(),
  authorEmail: z.string().optional(),
  updateMask: z.string().optional(),
  etag: z.string().optional(),
});

export const DeleteBookInputSchema = z.strictObject({
  name: z.string(),
  etag: z.string().optional(),
});

export const BookNameInputSchema = z.strictObject({ name: z.string() });

export const BatchGetBooksInputSchema = z.strictObject({
  parent: z.string(),
  names: z.array(z.string()),
});

export const BookCountSchema = z.object({ count: z.number().int() });
export type BookCount = z.infer<typeof BookCountSchema>;

export const ParentInputSchema = z.strictObject({ parent: z.string() });

export const UpdateConfigInputSchema = z.strictObject({
  name: z.string(),
  bannerText: z.string().optional(),
  pageSizeDefault: z.number().int().positive().optional(),
});
