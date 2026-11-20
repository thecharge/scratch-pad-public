import { HTTPS_SCHEME } from "@platform/config/environments";
import {
  EXTRA_CA_ENV,
  Glyph,
  HttpHeader,
  PROXY_RECORDER_TLS_FAILURE,
  RAW_CHUNKED,
  RAW_CLOSE_HEADER,
  RAW_CONTENT_LENGTH,
  RAW_FINAL_CHUNK,
  RAW_HEADER_END,
  RAW_HTTP_VERSION,
  RAW_LINE_END,
  Text,
} from "@platform/constants";

async function chunked(rest: string): Promise<string> {
  const parts: string[] = [];
  let left = rest;
  for (let size = Number.parseInt(left, 16); size > 0; size = Number.parseInt(left, 16)) {
    const start = left.indexOf(RAW_LINE_END) + RAW_LINE_END.length;
    parts.push(left.slice(start, start + size));
    left = left.slice(start + size + RAW_LINE_END.length);
  }
  return parts.join(Text.Empty);
}

function complete(raw: string): boolean {
  const end = raw.indexOf(RAW_HEADER_END);
  if (end < 0) {
    return false;
  }
  const head = raw.slice(0, end).toLowerCase();
  const rest = raw.slice(end + RAW_HEADER_END.length);
  const length = RAW_CONTENT_LENGTH.exec(head)?.[1];
  return length === undefined
    ? rest.endsWith(RAW_FINAL_CHUNK)
    : new TextEncoder().encode(rest).length >= Number(length);
}

async function responseOf(raw: string): Promise<Response> {
  const end = raw.indexOf(RAW_HEADER_END);
  const [statusLine = Text.Empty, ...lines] = raw.slice(0, end).split(RAW_LINE_END);
  const headers = new Headers(
    lines.map((line) => {
      const at = line.indexOf(Glyph.Colon);
      return [line.slice(0, at), line.slice(at + 1).trim()] as [string, string];
    }),
  );
  const rest = raw.slice(end + RAW_HEADER_END.length);
  const body =
    headers.get(HttpHeader.TransferEncoding) === RAW_CHUNKED ? await chunked(rest) : rest;
  return new Response(body, {
    status: Number(statusLine.split(Glyph.Space)[1]),
    headers,
  });
}

export async function sendRaw(
  origin: string,
  method: string,
  path: string,
  headers: Readonly<Record<string, string>>,
  body?: string,
): Promise<Response> {
  const url = new URL(origin);
  const lines = [
    [method, url.pathname.replace(/\/$/, Text.Empty) + path, RAW_HTTP_VERSION].join(Glyph.Space),
    [HttpHeader.Host, url.host].join(Glyph.Colon + Glyph.Space),
    RAW_CLOSE_HEADER,
    ...Object.entries(headers).map(([name, value]) =>
      [name, value].join(Glyph.Colon + Glyph.Space),
    ),
    ...(body === undefined
      ? []
      : [
          [HttpHeader.ContentLength, new TextEncoder().encode(body).length].join(
            Glyph.Colon + Glyph.Space,
          ),
        ]),
  ];
  const received: string[] = [];
  const done = Promise.withResolvers<string>();
  const wire = lines.join(RAW_LINE_END) + RAW_HEADER_END + (body ?? Text.Empty);
  const tls = url.href.startsWith(HTTPS_SCHEME)
    ? {
        ca: await Bun.file(Bun.env[EXTRA_CA_ENV] ?? Text.Empty).text(),
        serverName: url.hostname,
        rejectUnauthorized: true,
      }
    : undefined;
  const socket = await Bun.connect({
    hostname: url.hostname,
    port: Number(url.port),
    ...(tls === undefined ? {} : { tls }),
    socket: {
      handshake(socket, authorized, error) {
        if (!authorized || error !== null) {
          done.reject(error ?? new Error(PROXY_RECORDER_TLS_FAILURE));
          socket.end();
          return;
        }
        socket.write(wire);
      },
      data(socket, data) {
        received.push(new TextDecoder().decode(data));
        if (complete(received.join(Text.Empty))) {
          socket.end();
        }
      },
      close() {
        done.resolve(received.join(Text.Empty));
      },
      error(_socket, error) {
        done.reject(error);
      },
    },
  });
  if (tls === undefined) socket.write(wire);
  return responseOf(await done.promise);
}
