import type { ApiDeps } from "@platform/types";

export async function synchronizedBookReads(deps: ApiDeps): Promise<ApiDeps> {
  const ready = Promise.withResolvers<void>();
  let reads = 0;
  return {
    ...deps,
    books: {
      ...deps.books,
      find: async (name) => {
        const current = await deps.books.find(name);
        reads += 1;
        if (reads === 2) {
          ready.resolve();
        }
        await ready.promise;
        return current;
      },
    },
  };
}
