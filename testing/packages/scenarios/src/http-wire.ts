import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CADDY_ROOT_CERTIFICATE } from "@platform/constants";
import { all } from "@platform/util";

async function readHeaders(path: string) {
  const lines = (await Bun.file(path).text()).trim().split("\r\n");
  const headers = new Headers();
  for (const line of lines.slice(1)) {
    const index = line.indexOf(":");
    if (index > 0) headers.append(line.slice(0, index), line.slice(index + 1).trim());
  }
  return headers;
}

export async function httpWire(
  url: string,
  method: string,
  headers: Record<string, string>,
  body?: string,
  streaming = false,
  captureSeconds = 30,
) {
  const directory = await mkdtemp(join(tmpdir(), "http-wire-"));
  const head = join(directory, "headers");
  const chunks: string[] = [];
  const child = Bun.spawn(
    [
      Bun.env.TEST_HTTP_CURL ?? "",
      Bun.env.TEST_HTTP_PROTOCOL ?? "--http1.1",
      "--cacert",
      `/pki${CADDY_ROOT_CERTIFICATE}`,
      "--max-time",
      String(captureSeconds),
      "-sS",
      "-N",
      "-X",
      method,
      "-D",
      head,
      "-w",
      "%{stderr}\n%{http_version} %{http_code} %{ssl_verify_result}",
      ...Object.entries(headers).flatMap(([key, value]) => ["-H", `${key}: ${value}`]),
      ...(body === undefined ? [] : streaming ? ["--upload-file", "-"] : ["--data-binary", "@-"]),
      url,
    ],
    { stdin: "pipe", stdout: "pipe", stderr: "pipe" },
  );
  try {
    const [stderr, code] = await all<string | number>([
      async () => new Response(child.stderr).text(),
      async () => {
        const decoder = new TextDecoder();
        for await (const chunk of child.stdout)
          chunks.push(decoder.decode(chunk, { stream: true }));
        chunks.push(decoder.decode());
        return child.exited;
      },
      async () => {
        const content = body ?? "";
        const middle = Math.floor(content.length / 2);
        child.stdin.write(content.slice(0, middle));
        if (streaming) await Bun.sleep(20);
        child.stdin.write(content.slice(middle));
        child.stdin.end();
        return 0;
      },
    ]);
    if (code !== 0 && !(captureSeconds < 30 && code === 28)) throw new Error(String(stderr));
    const [httpVersion = "", status = "0", verify = "-1"] = (
      String(stderr).trim().split("\n").at(-1) ?? ""
    ).split(" ");
    if (verify !== "0") throw new Error(`certificate verification failed: ${verify}`);
    const responseHeaders = await readHeaders(head);
    return {
      response: new Response(chunks.join(""), { status: Number(status), headers: responseHeaders }),
      chunks,
      httpVersion,
    };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
