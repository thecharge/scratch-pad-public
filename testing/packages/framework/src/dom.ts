import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { TEST_PAGE_URL } from "@platform/config/urls";

const NETWORK_GLOBALS = [
  "Headers",
  "Request",
  "Response",
  "fetch",
  "FormData",
  "URL",
  "URLSearchParams",
  "AbortController",
  "AbortSignal",
  "Blob",
  "File",
  "ReadableStream",
  "TextEncoder",
  "TextDecoder",
] as const;

if (globalThis.localStorage === undefined) {
  const originals = NETWORK_GLOBALS.map((name) => [name, Reflect.get(globalThis, name)] as const);
  GlobalRegistrator.register({ url: TEST_PAGE_URL });
  originals.forEach(([name, value]) => {
    Reflect.set(globalThis, name, value);
  });
}
