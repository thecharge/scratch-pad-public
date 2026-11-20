import { createHash } from "node:crypto";
import type { AssetUploadTarget } from "@platform/types";

export function assetTarget(fail = "") {
  const writes: Uint8Array[] = [];
  const calls: string[] = [];
  const target: AssetUploadTarget = {
    async write(chunk) {
      calls.push("write");
      if (fail === "write") throw new Error("write failed");
      writes.push(chunk.slice());
    },
    async complete() {
      calls.push("complete");
      if (fail === "complete") throw new Error("complete failed");
    },
    async abort() {
      calls.push("abort");
      if (fail === "abort") throw new Error("abort failed");
    },
    async remove() {
      calls.push("remove");
      if (fail === "remove") throw new Error("remove failed");
    },
  };
  return { target, calls, writes };
}

export function assetChecksum(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

export function pendingAssetBody(controller: AbortController, failCancel = false) {
  return new ReadableStream<Uint8Array>({
    async pull() {
      controller.abort(new Error("cancelled"));
    },
    async cancel() {
      if (failCancel) throw new Error("source cleanup failed");
    },
  });
}

export async function assetBackpressure(
  upload: (body: ReadableStream<Uint8Array>, target: AssetUploadTarget) => Promise<unknown>,
) {
  const calls: string[] = [];
  const release = Promise.withResolvers<void>();
  let produced = 0;
  const body = new ReadableStream<Uint8Array>(
    {
      async pull(controller) {
        produced += 1;
        calls.push(`pull ${produced}`);
        if (produced > 1) controller.close();
        else controller.enqueue(new Uint8Array([1]));
      },
    },
    { highWaterMark: 0 },
  );
  const fixture = assetTarget();
  fixture.target.write = async () => {
    calls.push("write");
    release.resolve();
    await Bun.sleep(5);
    calls.push("written");
  };
  const result = upload(body, fixture.target);
  await release.promise;
  const duringWrite = [...calls];
  await result;
  return { duringWrite, calls };
}
