import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { createSdkClient } from "../../../packages/sdk/src/client.ts";

const ORIGIN = "https://api.example";
const OTHER_ORIGIN = "https://other.example";

async function configured(client: Awaited<ReturnType<typeof createSdkClient>>) {
  const config = client.getConfig();
  return { baseUrl: config.baseUrl, token: await (config.auth as () => Promise<unknown>)() };
}

unit(createSdkClient, {
  positive: [
    positive(
      "a fixed token is sent for every call",
      [{ origin: ORIGIN, token: "fixed-token" }],
      seen(configured, { baseUrl: ORIGIN, token: "fixed-token" }),
    ),
    positive(
      "a token function is asked each time",
      [{ origin: OTHER_ORIGIN, token: () => "fresh-token" }],
      seen(configured, { baseUrl: OTHER_ORIGIN, token: "fresh-token" }),
    ),
  ],
  negative: [
    rejected(
      "no token gives no credential",
      [{ origin: ORIGIN }],
      seen(configured, { baseUrl: ORIGIN, token: undefined }),
    ),
    rejected(
      "a token function that has nothing gives no credential",
      [{ origin: ORIGIN, token: () => undefined }],
      seen(configured, { baseUrl: ORIGIN, token: undefined }),
    ),
    negative("no options at all", [undefined], { name: "TypeError" }),
    negative("options that are null", [null], { name: "TypeError" }),
  ],
});
