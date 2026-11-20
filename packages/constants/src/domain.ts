export enum BookState {
  Active = "ACTIVE",
  Archived = "ARCHIVED",
}

export enum BookCapabilityId {
  Get = "books.get",
  List = "books.list",
  Create = "books.create",
  Update = "books.update",
  Delete = "books.delete",
  Archive = "books.archive",
  Undelete = "books.undelete",
  BatchGet = "books.batchGet",
  Reindex = "books.reindex",
  Count = "books.count",
  Suggest = "books.suggest",
}

export enum ConfigCapabilityId {
  Get = "config.get",
  Update = "config.update",
}

export enum DomainPattern {
  Publisher = "publishers/{publisher}",
  Book = "publishers/{publisher}/books/{book}",
  BookCollection = "publishers/{publisher}/books",
  Config = "config",
}

export enum CustomVerb {
  Archive = "archive",
  Undelete = "undelete",
  Reindex = "reindex",
  Count = "count",
  Suggest = "suggest",
  Cancel = "cancel",
  Wait = "wait",
  Watch = "watch",
}

export enum BookField {
  Name = "name",
  Title = "title",
  Author = "author",
  AuthorEmail = "authorEmail",
  State = "state",
  CreateTime = "createTime",
  UpdateTime = "updateTime",
  DeleteTime = "deleteTime",
  PurgeTime = "purgeTime",
  Etag = "etag",
}

export enum BooksOutputField {
  Books = "books",
}

export const BOOK_BASIC_FIELDS: readonly string[] = [
  BookField.Name,
  BookField.Title,
  BookField.State,
];
export const SOFT_DELETE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const CONFIG_ROW_ID = "config";
export const DEFAULT_BANNER_TEXT = "Welcome";
export const BOOK_PARTIAL_VISIBLE_CHARS = 4;
export const PAGE_SECRET_BYTES = 32;
export const REQUEST_ID_TTL_MS = 24 * 60 * 60 * 1000;
