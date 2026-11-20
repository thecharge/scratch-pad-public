import { Text, UI_PROXY, WHITESPACE } from "@platform/constants";

export async function networkReady(addresses: string): Promise<boolean> {
  const flags = addresses
    .trim()
    .split(Text.Newline)
    .map((line) =>
      Number.parseInt(
        line.trim().split(WHITESPACE)[UI_PROXY.NetworkFlagsField] ?? Text.Empty,
        UI_PROXY.NetworkFlagsRadix,
      ),
    );
  return !flags.some((flag) => (flag & UI_PROXY.NetworkTentativeFlag) !== 0);
}
