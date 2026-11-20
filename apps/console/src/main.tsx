import { ConsoleDom } from "@platform/constants";
import { createRoot } from "react-dom/client";
import { App } from "./app.tsx";
import { completeLogin } from "./auth-provider.ts";
import { consoleConfig } from "./config.ts";
import { createTokenStore } from "./token.ts";
import "./styles.css";

export async function mountConsole(
  container: HTMLElement | null = document.getElementById(ConsoleDom.RootId),
  search: string = globalThis.location.search,
): Promise<boolean> {
  const tokens = createTokenStore();
  await completeLogin(consoleConfig(), tokens, search);
  if (container === null) {
    return false;
  }
  createRoot(container).render(<App tokens={tokens} />);
  return true;
}

await mountConsole();
