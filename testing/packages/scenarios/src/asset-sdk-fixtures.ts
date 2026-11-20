import { TEST_ASSET_DOWNLOAD_URL, TEST_PROXY_ORIGIN } from "@platform/config/urls";
import { createSdkClient } from "@platform/sdk";

export const SDK_ASSET = {
  name: "assets/a-one",
  uri: "asset://a-one",
  sizeBytes: 3,
  sha256: "0".repeat(64),
  mediaType: "application/octet-stream",
  createTime: "2026-11-07T12:00:00.000Z",
  downloadUrl: TEST_ASSET_DOWNLOAD_URL,
};

export function assetSdkFailure() {
  const detail = {
    "@type": "type.googleapis.com/google.rpc.ErrorInfo",
    reason: "TOKEN_MISSING",
    domain: "test",
  };
  return Response.json(
    {
      error: { code: 401, status: "UNAUTHENTICATED", message: "Token required", details: [detail] },
    },
    { status: 401 },
  );
}

export async function assetSdkFixture(...responses: Response[]) {
  const requests: Request[] = [];
  const bodies: string[] = [];
  const client = await createSdkClient({
    origin: TEST_PROXY_ORIGIN,
    token: "private-api-token",
  });
  client.setConfig({
    fetch: (async (input: RequestInfo | URL) => {
      const request = input as Request;
      requests.push(request);
      bodies.push(await request.text());
      return responses.shift() ?? new Response(null, { status: 500 });
    }) as typeof fetch,
  });
  return { client, requests, bodies };
}
