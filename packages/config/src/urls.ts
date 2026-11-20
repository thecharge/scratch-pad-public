import { ToolBinary } from "@platform/constants";
import type { BundledTool, InstallableTool, SurfaceUrls } from "@platform/types";

export const LOOPBACK_ADDRESS = "127.0.0.1";
export const LOOPBACK_NAME = "localhost";
export const LOOPBACK_ORIGIN = "http://localhost";
export const DEFAULT_RESOURCE_PROTOCOL = "http://localhost:";
export const DEFAULT_API_ORIGIN = "https://localhost:8443";
export const TEST_PAGE_URL = "http://localhost/";
export const TEST_API_ORIGIN = "http://api.test";
export const TEST_CONSOLE_ORIGIN = "http://console.test";
export const TEST_FOREIGN_ORIGIN = "http://evil.test";
export const TEST_MCP_ALLOWED_HOST = "allowed.example";
export const TEST_MCP_ALLOWED_ORIGIN = "http://allowed.example";
export const TEST_MCP_FOREIGN_ORIGIN = "http://evil.example";
export const TEST_METADATA_RESOURCE = "https://api.example.com";
export const TEST_METADATA_MCP_RESOURCE = "https://api.example.com/mcp";
export const CIMD_LOOPBACK_PROBE = "https://localhost/";
export const CIMD_PRIVATE_PROBE = "https://10.0.0.1/";
export const CIMD_METADATA_PROBE = "https://169.254.169.254/latest/meta-data";
export const CIMD_HTTP_PROBE = "http://example.com/";
export const DEFAULT_ERROR_DOMAIN = "api.localhost";
export const TEST_ISSUER = "https://issuer.test";
export const TEST_AUDIENCE = "https://api.test";
export const KB_CLIENT_REDIRECT = "https://app.example.com/callback";
export const FOREIGN_AUDIENCE = "https://other.example.test";
export const UNTRUSTED_ORIGIN = "https://untrusted.example.test";
export const LOCAL_HOST_PATTERN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;
export const GITLEAKS_RELEASE_BASE = "https://github.com/gitleaks/gitleaks/releases/download/";
export const OASDIFF_RELEASE_BASE = "https://github.com/oasdiff/oasdiff/releases/download/";
export const PULUMI_RELEASE_BASE = "https://github.com/pulumi/pulumi/releases/download/";
export const TOOL_RELEASE_BASES: Readonly<Record<InstallableTool | BundledTool, string>> = {
  [ToolBinary.Gitleaks]: GITLEAKS_RELEASE_BASE,
  [ToolBinary.Oasdiff]: OASDIFF_RELEASE_BASE,
  [ToolBinary.Pulumi]: PULUMI_RELEASE_BASE,
};

export async function loopbackOrigin(port: number | undefined): Promise<string> {
  return `${LOOPBACK_ORIGIN}:${port}`;
}

export const LOCAL_URLS: SurfaceUrls = {
  console: "http://localhost:5173",
  api: DEFAULT_API_ORIGIN,
  mcp: `${DEFAULT_API_ORIGIN}/mcp`,
  docs: "http://localhost:4321",
};

export async function releaseUrl(
  tool: InstallableTool | BundledTool,
  version: string,
  file: string,
): Promise<string> {
  return `${TOOL_RELEASE_BASES[tool]}v${version}/${file}`;
}

export const TEST_ASSET_ENDPOINT = "http://object-store:9000";
export const TEST_ASSET_PUBLIC_ENDPOINT = "https://assets.proxy:8443";
export const TEST_ASSET_DOWNLOAD_URL = `${TEST_ASSET_PUBLIC_ENDPOINT}/assets/objects/a-one?signature=fixture`;
export const TEST_PROXY_ORIGIN = "https://proxy:8443";
