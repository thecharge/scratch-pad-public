export async function iterate<T>(stream: ReadableStream<T>): Promise<AsyncIterable<T>> {
  const reader = stream.getReader();
  return {
    [Symbol.asyncIterator]: () => ({
      next: async () => {
        const read = await reader.read();
        return read.done
          ? { done: true as const, value: undefined }
          : { done: false as const, value: read.value };
      },
      return: async () => {
        await reader.cancel();
        return { done: true as const, value: undefined };
      },
    }),
  };
}
