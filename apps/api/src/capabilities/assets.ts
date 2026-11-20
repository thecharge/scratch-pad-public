import { paginate, requireResourceName } from "@platform/aip";
import { defineCapability } from "@platform/capability";
import { ASSET_ALLOWED_MEDIA_TYPES } from "@platform/config/assets";
import {
  ASSET_CHECKSUM_HEADER,
  ASSET_MEDIA_BODY_FIELD,
  ASSET_MEDIA_CHECKSUM_FIELD,
  ASSET_MEDIA_TYPE_FIELD,
  AssetCapabilityId,
  AssetPattern,
  AuthMode,
  CanonicalCode,
  ErrorReason,
  MessageId,
  MethodKind,
  Text,
  TransportKind,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import { StreamError } from "@platform/streams";
import {
  type ApiDeps,
  AssetDownloadSchema,
  AssetListInputSchema,
  AssetListSchema,
  AssetNameInputSchema,
  AssetSchema,
  type AssetStore,
  AssetUploadInputSchema,
  type CapabilityContext,
} from "@platform/types";
import { describe, notFound, READ_POLICY, WRITE_POLICY } from "./support.ts";

async function storage(store: AssetStore | undefined): Promise<AssetStore> {
  if (store === undefined)
    throw new ApiError(
      CanonicalCode.Unavailable,
      ErrorReason.InternalError,
      MessageId.AssetStoreUnavailable,
    );
  return store;
}

async function ownerOf(context: CapabilityContext): Promise<string> {
  if (context.principal.subject === undefined)
    throw new ApiError(
      CanonicalCode.Unauthenticated,
      ErrorReason.TokenInvalid,
      MessageId.TokenInvalid,
    );
  return context.principal.subject;
}

export async function assetCapabilities(deps: ApiDeps, store?: AssetStore) {
  const upload = await defineCapability({
    ...(await describe(
      AssetCapabilityId.Upload,
      MethodKind.Create,
      AssetPattern.Collection,
      MessageId.SummaryAssetsUpload,
    )),
    auth: AuthMode.Required,
    policy: WRITE_POLICY,
    onlyOver: TransportKind.Http,
    media: {
      bodyField: ASSET_MEDIA_BODY_FIELD,
      mediaTypeField: ASSET_MEDIA_TYPE_FIELD,
      checksumField: ASSET_MEDIA_CHECKSUM_FIELD,
      checksumHeader: ASSET_CHECKSUM_HEADER,
      mediaTypes: [...ASSET_ALLOWED_MEDIA_TYPES],
    },
    input: AssetUploadInputSchema,
    output: AssetSchema,
    handler: async (input, context) => {
      const backend = await storage(store);
      const owner = await ownerOf(context);
      try {
        return await backend.upload(input.body, input, owner, context.signal);
      } catch (error) {
        if (!(error instanceof StreamError)) throw error;
        throw new ApiError(
          CanonicalCode.InvalidArgument,
          ErrorReason.ValidationFailed,
          error.messageId,
          error.params,
        );
      }
    },
  });
  const get = await defineCapability({
    ...(await describe(
      AssetCapabilityId.Get,
      MethodKind.Get,
      AssetPattern.Item,
      MessageId.SummaryAssetsGet,
    )),
    auth: AuthMode.Required,
    policy: READ_POLICY,
    input: AssetNameInputSchema,
    output: AssetDownloadSchema,
    handler: async ({ name }, context) => {
      await requireResourceName(AssetPattern.Item, name);
      const found = await (await storage(store)).get(name, await ownerOf(context));
      if (found === undefined) throw await notFound(name);
      return found;
    },
  });
  const list = await defineCapability({
    ...(await describe(
      AssetCapabilityId.List,
      MethodKind.List,
      AssetPattern.Collection,
      MessageId.SummaryAssetsList,
    )),
    auth: AuthMode.Required,
    policy: READ_POLICY,
    input: AssetListInputSchema,
    output: AssetListSchema,
    handler: async (input, context) => {
      const owner = await ownerOf(context);
      const records = await (await storage(store)).list(owner);
      const page = await paginate(records, { ...input, query: [owner] }, deps.codec, deps.limits);
      return { assets: page.items, nextPageToken: page.nextPageToken ?? Text.Empty };
    },
  });
  return { upload, get, list };
}
