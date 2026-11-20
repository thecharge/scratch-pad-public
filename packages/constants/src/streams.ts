export enum JsonToken {
  ObjectOpen = "{",
  ObjectClose = "}",
  ArrayOpen = "[",
  ArrayClose = "]",
  Comma = ",",
  Colon = ":",
  Quote = '"',
  Escape = "\\",
}

export enum SseField {
  Event = "event",
  Data = "data",
  Id = "id",
}

export const SSE_FIELD_SEPARATOR = ": ";
export const SSE_FRAME_END = "\n\n";
export const SSE_COMMENT_PREFIX = ":";
export const SSE_OPEN_FRAME = ": connected\n\n";
export const SSE_KEEPALIVE_FRAME = ": keepalive\n\n";
export const SSE_KEEPALIVE_MS = 15_000;
export const STREAM_IDLE = Symbol("stream-idle");
export const STATE_URI_SCHEME = "state://";
export const WATCH_TOOL_SUFFIX = ".watch";
export const WATCH_DEFAULT_TIMEOUT_MS = 5000;
export const WATCH_MAX_TIMEOUT_MS = 30_000;
export const WATCH_DEFAULT_EVENTS = 20;
export const WATCH_MAX_EVENTS = 100;
export const STATE_MIME_TYPE = "application/json";
export const STREAM_LINE_END = "\n";
export const STREAM_TEXT_ENCODING = "utf-8";

export enum StreamWhat {
  Document = "document",
  Line = "line",
  Event = "event",
}

export const RAW_HEADER_END = "\r\n\r\n";
export const RAW_FINAL_CHUNK = "0\r\n\r\n";
export const RAW_CONTENT_LENGTH = /content-length: (\d+)/;
export const DRAIN_LIMIT_BYTES = 1_048_576;
export const RAW_LINE_END = "\r\n";
export const RAW_HTTP_VERSION = "HTTP/1.1";
export const RAW_CLOSE_HEADER = "connection: close";
export const RAW_CHUNKED = "chunked";
export const RAW_LAST_CHUNK = "\r\n0\r\n\r\n";
