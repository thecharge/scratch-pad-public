import { LOOPBACK_ORIGIN } from "@platform/config/urls";
import { RAW_HEADER_END, RAW_LAST_CHUNK } from "@platform/constants";

export async function rawHttp(
  port: number,
  request: string,
  origin = LOOPBACK_ORIGIN,
): Promise<string> {
  const received: string[] = [];
  const done = Promise.withResolvers<string>();
  const target = new URL(origin);
  const tls =
    target.protocol === "https:"
      ? {
          ca: await Bun.file(Bun.env.NODE_EXTRA_CA_CERTS ?? "").text(),
          serverName: target.hostname,
          rejectUnauthorized: true,
        }
      : undefined;
  const socket = await Bun.connect({
    hostname: target.hostname,
    port,
    ...(tls === undefined ? {} : { tls }),
    socket: {
      handshake(socket, authorized, error) {
        if (!authorized || error !== null) {
          done.reject(error ?? new Error("raw HTTP TLS verification failed"));
          socket.end();
          return;
        }
        socket.write(request);
      },
      data(socket, data) {
        received.push(new TextDecoder().decode(data));
        if (received.join("").endsWith(RAW_LAST_CHUNK)) {
          socket.end();
        }
      },
      close() {
        done.resolve(received.join(""));
      },
      error(_socket, error) {
        done.reject(error);
      },
    },
  });
  if (tls === undefined) socket.write(request);
  return done.promise;
}

export async function headOf(raw: string): Promise<string> {
  return raw.slice(0, raw.indexOf(RAW_HEADER_END));
}

export async function chunksOfBody(raw: string): Promise<string[]> {
  const chunks: string[] = [];
  let rest = raw.slice(raw.indexOf(RAW_HEADER_END) + RAW_HEADER_END.length);
  for (let size = Number.parseInt(rest, 16); size > 0; size = Number.parseInt(rest, 16)) {
    const start = rest.indexOf("\r\n") + 2;
    chunks.push(rest.slice(start, start + size));
    rest = rest.slice(start + size + 2);
  }
  return chunks;
}
