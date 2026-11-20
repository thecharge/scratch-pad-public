import { DEFAULT_API_ORIGIN } from "@platform/config/urls";
import { CONSOLE_CLIENT_ID } from "@platform/constants";
import type { ConsoleConfig } from "@platform/types";

export function consoleConfig(): ConsoleConfig {
  return {
    apiOrigin:
      import.meta.env?.VITE_API_ORIGIN ?? globalThis.location?.origin ?? DEFAULT_API_ORIGIN,
    clientId: import.meta.env?.VITE_CLIENT_ID ?? CONSOLE_CLIENT_ID,
    redirectUri: globalThis.location?.origin ?? DEFAULT_API_ORIGIN,
  };
}
