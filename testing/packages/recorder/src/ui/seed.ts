import { all } from "@platform/util";
import type { startStack } from "./stack.ts";

const BOOKS = [
  ["dune", "Dune", "Frank Herbert"],
  ["emma", "Emma", "Jane Austen"],
  ["hobbit", "The Hobbit", "J. R. R. Tolkien"],
] as const;

export async function seedBooks(stack: Awaited<ReturnType<typeof startStack>>): Promise<void> {
  await all(
    BOOKS.map(
      ([id, title, author]) =>
        async () =>
          stack.call("POST", `/v1/publishers/acme/books?bookId=${id}`, { title, author }),
    ),
  );
  await stack.call("POST", "/v1/publishers/acme/books/emma:archive");
}
