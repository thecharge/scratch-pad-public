import { DocCategory, ErrorReason } from "@platform/constants";
import type { JsonObject, SdkScenario, SdkStep } from "@platform/types";

const PUBLISHER = "acme";
const READ = ["read"];
const WRITE = ["read", "write"];
const ADMIN = ["read", "write", "admin"];
const COLLECTION = { publisher: PUBLISHER };
const DUNE_NAME = "publishers/acme/books/dune";
const EMMA_NAME = "publishers/acme/books/emma";
const STALE_ETAG = '"stale"';
const bookPath = (book: string) => ({ publisher: PUBLISHER, book });

function step(
  call: string,
  description: string,
  place: string,
  summary: string,
  params: JsonObject,
  scopes: string[],
  options: Partial<SdkStep> = {},
): SdkStep {
  return { call, description, place, summary, params, scopes, ...options };
}

const failsWith = (reason: ErrorReason): Partial<SdkStep> => ({ expectError: true, reason });

function create(book: string, title: string, scopes: string[]): SdkStep {
  return step(
    "booksCreate",
    `Create the book ${title}`,
    "Your own code, after importing booksCreate from the package",
    "create a book",
    { path: COLLECTION, query: { bookId: book }, body: { title } },
    scopes,
  );
}

function lifecycleSteps(): SdkStep[] {
  return [
    create("dune", "Dune", WRITE),
    step(
      "booksGet",
      "Read the book back",
      "Your own code, after importing booksGet from the package",
      "get a book",
      { path: bookPath("dune") },
      READ,
    ),
    step(
      "booksUpdate",
      "Change the title with a field mask",
      "Your own code, after importing booksUpdate from the package",
      "change a book",
      { path: bookPath("dune"), query: { updateMask: "title" }, body: { title: "Dune Messiah" } },
      WRITE,
    ),
    step(
      "booksArchive",
      "Archive the book",
      "Your own code, after importing booksArchive from the package",
      "archive a book",
      { path: bookPath("dune") },
      WRITE,
    ),
    step(
      "booksDelete",
      "Delete the book",
      "Your own code, after importing booksDelete from the package",
      "delete a book",
      { path: bookPath("dune") },
      WRITE,
    ),
    step(
      "booksUndelete",
      "Restore the deleted book",
      "Your own code, after importing booksUndelete from the package",
      "restore a book",
      { path: bookPath("dune") },
      WRITE,
    ),
  ];
}

function listingSteps(): SdkStep[] {
  return [
    create("dune", "Dune", WRITE),
    create("emma", "Emma", WRITE),
    step(
      "booksList",
      "List the books, newest title last",
      "Your own code, after importing booksList from the package",
      "list books",
      { path: COLLECTION, query: { orderBy: "title desc" } },
      READ,
    ),
    step(
      "booksBatchGet",
      "Read two books in one call",
      "Your own code, after importing booksBatchGet from the package",
      "read several books",
      { path: COLLECTION, query: { names: [DUNE_NAME, EMMA_NAME] } },
      READ,
    ),
  ];
}

function errorSteps(): SdkStep[] {
  return [
    step(
      "booksGet",
      "Read a book that does not exist",
      "Your own code, inside a try block around booksGet",
      "get a book",
      { path: bookPath("nothing") },
      READ,
      failsWith(ErrorReason.ResourceNotFound),
    ),
    step(
      "booksCreate",
      "Create a book with a read-only token",
      "Your own code, inside a try block around booksCreate",
      "create a book",
      { path: COLLECTION, query: { bookId: "x" }, body: { title: "X" } },
      READ,
      failsWith(ErrorReason.PolicyDenied),
    ),
    create("dune", "Dune", WRITE),
    step(
      "booksArchive",
      "Archive the book",
      "Your own code, after importing booksArchive from the package",
      "archive a book",
      { path: bookPath("dune") },
      WRITE,
    ),
    step(
      "booksArchive",
      "Archive the same book a second time",
      "Your own code, inside a try block around booksArchive",
      "archive a book",
      { path: bookPath("dune") },
      WRITE,
      failsWith(ErrorReason.InvalidTransition),
    ),
    step(
      "booksUpdate",
      "Change the book with an outdated etag",
      "Your own code, inside a try block around booksUpdate",
      "change a book",
      { path: bookPath("dune"), body: { title: "New", etag: STALE_ETAG } },
      WRITE,
      failsWith(ErrorReason.EtagMismatch),
    ),
    step(
      "statsGet",
      "Read statistics without the admin scope",
      "Your own code, inside a try block around statsGet",
      "read statistics",
      {},
      READ,
      failsWith(ErrorReason.PolicyDenied),
    ),
    step(
      "statsGet",
      "Read statistics with the admin scope",
      "Your own code, after importing statsGet from the package",
      "read statistics",
      {},
      ADMIN,
    ),
  ];
}

function scenario(id: string, title: string, intent: string, steps: SdkStep[]): SdkScenario {
  return { id, title, intent, category: DocCategory.SdkUsage, steps };
}

export function sdkScenarios(): SdkScenario[] {
  return [
    scenario(
      "sdk-book-lifecycle",
      "Moving a book through its life with the SDK",
      "The installed package creates, reads, changes, archives, deletes and restores a book with typed calls.",
      lifecycleSteps(),
    ),
    scenario(
      "sdk-listing",
      "Listing and reading several books with the SDK",
      "The installed package lists books in an order you choose and reads several books in one call.",
      listingSteps(),
    ),
    scenario(
      "sdk-errors",
      "Handling errors from the SDK",
      "A failed call throws an error that carries the status and the reason, so your code can react to each case.",
      errorSteps(),
    ),
  ];
}
