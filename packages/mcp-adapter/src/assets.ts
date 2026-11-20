import { type McpServer, ResourceTemplate } from "@modelcontextprotocol/server";
import {
  ASSET_RESOURCE_PREFIX,
  ASSET_URI_SCHEME,
  ASSET_URI_VARIABLE,
  AssetCapabilityId,
  MediaType,
  Text,
} from "@platform/constants";
import {
  AssetDownloadSchema,
  AssetListSchema,
  type Capability,
  type CapabilityContext,
  type Invoke,
} from "@platform/types";

export async function registerAssetResources(
  server: McpServer,
  capabilities: readonly Capability[],
  invoke: Invoke,
  context: CapabilityContext,
): Promise<void> {
  const get = capabilities.find((capability) => capability.id === AssetCapabilityId.Get);
  const list = capabilities.find((capability) => capability.id === AssetCapabilityId.List);
  if (get === undefined || list === undefined) return;
  const resources = async () => {
    const visible = [];
    let pageToken = Text.Empty as string;
    do {
      const page = AssetListSchema.parse((await invoke(list, { pageToken }, context)).output);
      visible.push(
        ...page.assets.map((asset) => ({
          uri: asset.uri,
          name: asset.name,
          mimeType: MediaType.Json,
        })),
      );
      pageToken = page.nextPageToken;
    } while (pageToken !== Text.Empty);
    return { resources: visible };
  };
  server.registerResource(
    AssetCapabilityId.Get,
    new ResourceTemplate(ASSET_URI_SCHEME + ASSET_URI_VARIABLE, { list: resources }),
    { mimeType: MediaType.Json, title: get.summary },
    async (_uri, variables) => {
      const name = ASSET_RESOURCE_PREFIX + variables.asset;
      const asset = AssetDownloadSchema.parse((await invoke(get, { name }, context)).output);
      return {
        contents: [{ uri: asset.uri, mimeType: MediaType.Json, text: JSON.stringify(asset) }],
      };
    },
  );
}
