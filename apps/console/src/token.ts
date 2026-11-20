import type { TokenStore } from "@platform/types";

export function createTokenStore(): TokenStore {
  let current: string | undefined;
  return {
    get: () => current,
    set: (token) => {
      current = token;
    },
    clear: () => {
      current = undefined;
    },
  };
}
