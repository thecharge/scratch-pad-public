import type { rm } from "node:fs/promises";
export async function cleanupFixture(code: string, failures: number) {
  let calls = 0;
  const remove: typeof rm = async () => {
    ++calls;
    if (calls <= failures) throw Object.assign(new Error(code), { code });
  };
  return { remove, calls: async () => calls };
}
