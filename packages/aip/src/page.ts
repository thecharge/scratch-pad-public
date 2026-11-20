import {
  CanonicalCode,
  CryptoAlgorithm,
  DigestEncoding,
  Encoding,
  ErrorReason,
  HashAlgorithm,
  KeyFormat,
  KeyUsage,
  MessageId,
  PAGE_TOKEN_IV_BYTES,
  PAGE_TOKEN_KEY_BYTES,
  Text,
} from "@platform/constants";
import { ApiError } from "@platform/errors";
import {
  type Page,
  type PageLimits,
  type PageRequest,
  type PageTokenCodec,
  type PageTokenPayload,
  PageTokenPayloadSchema,
} from "@platform/types";

export async function resolvePageSize(
  requested: number | undefined,
  limits: PageLimits,
): Promise<number> {
  if (requested !== undefined && requested < 0) {
    throw new ApiError(
      CanonicalCode.InvalidArgument,
      ErrorReason.InvalidPageSize,
      MessageId.InvalidPageSize,
    );
  }
  return requested === undefined || requested === 0
    ? limits.defaultPageSize
    : Math.min(requested, limits.maxPageSize);
}

async function queryDigest(query: unknown): Promise<string> {
  return new Bun.CryptoHasher(HashAlgorithm.Sha256)
    .update(JSON.stringify(query))
    .digest(DigestEncoding.Hex);
}

async function invalidToken(): Promise<ApiError> {
  return new ApiError(
    CanonicalCode.InvalidArgument,
    ErrorReason.InvalidPageToken,
    MessageId.InvalidPageToken,
  );
}

async function open(key: CryptoKey, token: string, query: unknown): Promise<number> {
  const bytes = Buffer.from(token, Encoding.Base64Url);
  const iv = bytes.subarray(0, PAGE_TOKEN_IV_BYTES);
  const plain = await crypto.subtle.decrypt(
    { name: CryptoAlgorithm.AesGcm, iv },
    key,
    bytes.subarray(PAGE_TOKEN_IV_BYTES),
  );
  const payload = PageTokenPayloadSchema.parse(JSON.parse(new TextDecoder().decode(plain)));
  if (payload.query !== (await queryDigest(query))) {
    throw await invalidToken();
  }
  return payload.offset;
}

async function seal(key: CryptoKey, offset: number, query: unknown): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(PAGE_TOKEN_IV_BYTES));
  const payload: PageTokenPayload = { offset, query: await queryDigest(query) };
  const cipher = await crypto.subtle.encrypt(
    { name: CryptoAlgorithm.AesGcm, iv },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return Buffer.concat([iv, new Uint8Array(cipher)]).toString(Encoding.Base64Url);
}

export async function createPageTokenCodec(secret: Uint8Array): Promise<PageTokenCodec> {
  if (secret.byteLength !== PAGE_TOKEN_KEY_BYTES) {
    throw await invalidToken();
  }
  const key = await crypto.subtle.importKey(
    KeyFormat.Raw,
    Uint8Array.from(secret),
    CryptoAlgorithm.AesGcm,
    false,
    [KeyUsage.Encrypt, KeyUsage.Decrypt],
  );
  return {
    encode: async (offset, query) => seal(key, offset, query),
    decode: async (token, query) =>
      open(key, token, query).catch(async () => Promise.reject(await invalidToken())),
  };
}

export async function paginate<T>(
  items: readonly T[],
  request: PageRequest,
  codec: PageTokenCodec,
  limits: PageLimits,
): Promise<Page<T>> {
  const size = await resolvePageSize(request.pageSize, limits);
  const hasToken = request.pageToken !== undefined && request.pageToken.length > 0;
  const offset = hasToken ? await codec.decode(request.pageToken as string, request.query) : 0;
  const slice = items.slice(offset, offset + size);
  const end = offset + slice.length;
  return {
    items: slice,
    nextPageToken: end < items.length ? await codec.encode(end, request.query) : Text.Empty,
  };
}
