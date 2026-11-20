import { createHash } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { createSdkClient } from "@platform/sdk";
import { type Asset, AssetDownloadSchema } from "@platform/types";
import { downloadAsset, uploadAsset } from "../../../../packages/sdk/src/assets.ts";

const path = process.argv[2] ?? "";
const checksum = process.argv[3] ?? "";
const client = await createSdkClient({
  origin: Bun.env.TEST_ASSET_API_ORIGIN ?? "",
  token: Bun.env.TEST_ASSET_TOKEN ?? "",
});
async function checkMcp(token: string, asset: Asset, owner: boolean) {
  const mcp = new Client({ name: "asset-acceptance", version: "1" });
  const headers = { Authorization: `Bearer ${token}` };
  await mcp.connect(
    new StreamableHTTPClientTransport(new URL("/mcp", Bun.env.TEST_ASSET_API_ORIGIN), {
      requestInit: { headers },
    }),
  );
  try {
    const listed = await mcp.listResources();
    const visible = listed.resources.some((resource) => resource.uri === asset.uri);
    if (visible !== owner) throw new Error("MCP resource listing violates ownership");
    const tool = await mcp.callTool({ name: "assets.get", arguments: { name: asset.name } });
    if (!owner && (tool.isError !== true || !JSON.stringify(tool).includes("NOT_FOUND")))
      throw new Error("MCP allowed another owner to read asset metadata");
    if (!owner) return;
    const resource = await mcp.readResource({ uri: asset.uri });
    const content = resource.contents[0];
    if (content === undefined || !("text" in content))
      throw new Error("MCP asset resource is not metadata");
    const metadata = AssetDownloadSchema.parse(JSON.parse(content.text));
    if (metadata.sha256 !== asset.sha256 || metadata.sizeBytes !== asset.sizeBytes)
      throw new Error("MCP metadata does not match the uploaded asset");
    if (!JSON.stringify(tool).includes('"type":"resource_link"'))
      throw new Error("MCP asset tool omitted its download resource link");
  } finally {
    await mcp.close();
  }
}
const asset = await uploadAsset(client, Bun.file(path).stream(), {
  mediaType: "application/octet-stream",
  checksum,
});
await checkMcp(Bun.env.TEST_ASSET_TOKEN ?? "", asset, true);
await checkMcp(Bun.env.TEST_ASSET_OTHER_TOKEN ?? "", asset, false);
const stream = await downloadAsset(client, asset.name.slice(7));
const hash = createHash("sha256");
let sizeBytes = 0;
for await (const chunk of stream) {
  hash.update(chunk);
  sizeBytes += chunk.byteLength;
}
if (hash.digest("hex") !== checksum || sizeBytes !== asset.sizeBytes)
  throw new Error("SDK download does not match uploaded bytes");
process.stdout.write(JSON.stringify(asset));
