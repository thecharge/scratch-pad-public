import { Text } from "@platform/constants";
export async function readUntil(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  marker: string,
): Promise<string> {
  const decoder = new TextDecoder();
  let text: string = Text.Empty;
  while (!text.includes(marker)) {
    const chunk = await reader.read();
    if (chunk.done) {
      return text;
    }
    text += decoder.decode(chunk.value);
  }
  return text;
}
