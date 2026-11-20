import { UNTRUSTED_ORIGIN } from "@platform/config/urls";
import {
  AuthProviderKind,
  BookCapabilityId,
  CapabilityId,
  ConfigCapabilityId,
  ConformanceCapabilityId,
  CustomCapabilityId,
  DocCategory,
  ErrorReason,
  FeatureFlag,
  HTTP_BAD_REQUEST,
  HttpHeader,
  HttpMethod,
  MediaType,
  NOT_ACCEPTABLE_STATUS,
  SkillCapabilityId,
  StatsCapabilityId,
  StepFace,
  TokenFlaw,
  UNSUPPORTED_MEDIA_TYPE_STATUS,
} from "@platform/constants";
import type { JsonObject, Scenario, ScenarioStep } from "@platform/types";

const PARENT = "publishers/acme";
const BOOK = `${PARENT}/books/dune`;
const OTHER = `${PARENT}/books/emma`;
const READ = ["read"];
const WRITE = ["read", "write"];
const ADMIN = ["read", "write", "admin"];

function step(
  description: string,
  capability: string,
  input: JsonObject,
  scopes: string[],
  options: Partial<ScenarioStep> = {},
): ScenarioStep {
  return { description, capability, input, scopes, ...options };
}

const FAILS = { expectError: true };
const HTTP_ONLY = { httpOnly: true };
const MCP_ONLY = { mcpOnly: true };
const GREETING_SKILL = "skills/greeting-guide";
const NO_BODY = {};
const BULK_ITEM = { bookId: "bulk", title: "Bulk" };
const OVER_THE_LIMIT = { field: "requests", count: 1001, item: BULK_ITEM };
const UNTRUSTED_HEADERS = { origin: UNTRUSTED_ORIGIN };
const failsWith = (reason: ErrorReason): Partial<ScenarioStep> => ({ ...FAILS, reason });

function scenario(
  id: string,
  title: string,
  intent: string,
  category: DocCategory,
  authEnabled: boolean,
  steps: ScenarioStep[],
): Scenario {
  return { id, title, intent, category, authEnabled, steps };
}

const NEW_BOOK = {
  parent: PARENT,
  bookId: "dune",
  title: "Dune",
  author: "Frank Herbert",
  authorEmail: "frank@example.com",
};

const INVALID_TOKEN = "invalid_token";
const UNAUTHORIZED = 401;
const FORBIDDEN = 403;
const OK = 200;
const CHALLENGED = { status: UNAUTHORIZED, mcpStatus: UNAUTHORIZED, challenge: true };

function authSteps(): ScenarioStep[] {
  return [
    step("Call without a token", BookCapabilityId.List, { parent: PARENT }, [], {
      ...failsWith(ErrorReason.TokenMissing),
      ...CHALLENGED,
    }),
    step(
      "Call with a token that has the read scope",
      BookCapabilityId.List,
      { parent: PARENT },
      READ,
      {
        status: OK,
        mcpStatus: OK,
      },
    ),
    step(
      "Create a book with a token that has too little scope",
      BookCapabilityId.Create,
      NEW_BOOK,
      READ,
      {
        ...failsWith(ErrorReason.PolicyDenied),
        status: FORBIDDEN,
        mcpStatus: OK,
        mcpText: "Tool books.create not found",
      },
    ),
    step("Call with a token that has expired", BookCapabilityId.List, { parent: PARENT }, READ, {
      ...failsWith(ErrorReason.TokenExpired),
      ...CHALLENGED,
      tokenFlaw: TokenFlaw.Expired,
      mcpText: INVALID_TOKEN,
    }),
    step(
      "Call with a token issued for another audience",
      BookCapabilityId.List,
      { parent: PARENT },
      READ,
      {
        ...failsWith(ErrorReason.TokenInvalid),
        ...CHALLENGED,
        tokenFlaw: TokenFlaw.Foreign,
        mcpText: INVALID_TOKEN,
      },
    ),
  ];
}

function authScenario(provider: AuthProviderKind, id: string, title: string, intent: string) {
  return { ...scenario(id, title, intent, DocCategory.ApiHandling, true, authSteps()), provider };
}

const GREETING_NAME = "greetings/hello";
const SHOUT_REQUEST = { method: HttpMethod.Post, path: "/v1/greetings/hello:shout", body: NO_BODY };

function customScenario(): Scenario {
  return {
    ...scenario(
      "custom-capability",
      "Adding your own capability, tool and skill",
      "A capability you define is served as an HTTP route, an MCP tool and an OpenAPI operation from one definition. A tool-only item is an MCP tool with no HTTP route. A skill in a skill package is read through the skill tools. Each one is a normal MCP tool or skill. So it passes the same MCP conformance checks as the built-in ones. The tool is listed. It has an input schema and an output schema. A bad call gives an error result. Policy decides who sees it.",
      DocCategory.ApiHandling,
      true,
      [
        step("Call the new capability", CustomCapabilityId.Greeting, { name: GREETING_NAME }, []),
        step(
          "Call the tool-only item",
          CustomCapabilityId.Shout,
          { name: GREETING_NAME },
          [],
          MCP_ONLY,
        ),
        step(
          "Look for the tool-only item over HTTP",
          CustomCapabilityId.Shout,
          { name: GREETING_NAME },
          [],
          { ...failsWith(ErrorReason.UnknownVerb), ...HTTP_ONLY, raw: SHOUT_REQUEST },
        ),
        step(
          "Read the skill from the skill package",
          SkillCapabilityId.Get,
          { name: GREETING_SKILL },
          [],
        ),
      ],
    ),
    custom: true,
  };
}

const BOOK_URL = `/v1/${BOOK}`;
const BOOKS_URL = `/v1/${PARENT}/books`;
const HTML = "text/html";
const NO_ACCEPT = { method: HttpMethod.Get, path: BOOK_URL, omit: [HttpHeader.Accept] };
const HTML_ONLY = {
  method: HttpMethod.Get,
  path: BOOK_URL,
  headers: { [HttpHeader.Accept]: HTML },
};
const NO_CONTENT_TYPE = {
  method: HttpMethod.Post,
  path: BOOKS_URL,
  body: NEW_BOOK,
  omit: [HttpHeader.ContentType],
};
const PLAIN_TEXT = {
  method: HttpMethod.Post,
  path: BOOKS_URL,
  body: NEW_BOOK,
  headers: { [HttpHeader.ContentType]: MediaType.PlainText },
};
const NO_MARKER = { method: HttpMethod.Get, path: BOOK_URL, omit: [HttpHeader.ProxyMarker] };
const refusedWith = (reason: ErrorReason, status: number): Partial<ScenarioStep> => ({
  ...failsWith(reason),
  ...HTTP_ONLY,
  status,
});

function requiredHeadersScenario(): Scenario {
  return {
    ...scenario(
      "required-headers",
      "The headers every request carries",
      "A request names what it accepts with Accept, names its body with Content-Type, and arrives through the proxy. A request that lacks one is refused before the operation runs, and the answer names the header.",
      DocCategory.ApiHandling,
      true,
      [
        step(
          "Create a book with every required header",
          BookCapabilityId.Create,
          NEW_BOOK,
          WRITE,
          HTTP_ONLY,
        ),
        step(
          "Read the book with every required header",
          BookCapabilityId.Get,
          { name: BOOK },
          READ,
          HTTP_ONLY,
        ),
        step("Read the book without Accept", BookCapabilityId.Get, { name: BOOK }, READ, {
          ...refusedWith(ErrorReason.AcceptRequired, HTTP_BAD_REQUEST),
          raw: NO_ACCEPT,
        }),
        step("Read the book accepting only HTML", BookCapabilityId.Get, { name: BOOK }, READ, {
          ...refusedWith(ErrorReason.AcceptUnsupported, NOT_ACCEPTABLE_STATUS),
          raw: HTML_ONLY,
        }),
        step("Send a body without Content-Type", BookCapabilityId.Create, NEW_BOOK, WRITE, {
          ...refusedWith(ErrorReason.ContentTypeRequired, HTTP_BAD_REQUEST),
          raw: NO_CONTENT_TYPE,
        }),
        step("Send a body as plain text", BookCapabilityId.Create, NEW_BOOK, WRITE, {
          ...refusedWith(ErrorReason.ContentTypeUnsupported, UNSUPPORTED_MEDIA_TYPE_STATUS),
          raw: PLAIN_TEXT,
        }),
        step(
          "Refuse a request without the proxy marker",
          BookCapabilityId.Get,
          { name: BOOK },
          READ,
          {
            ...refusedWith(ErrorReason.ProxyRequired, FORBIDDEN),
            raw: NO_MARKER,
          },
        ),
      ],
    ),
    behindProxy: true,
  };
}

export function scenarios(): Scenario[] {
  return [
    scenario(
      "public-configuration",
      "Reading the public configuration",
      "The configuration is public: it needs no token, and it works even when authentication is switched off.",
      DocCategory.ApiCalls,
      false,
      [
        step(
          "Read the configuration without a token",
          ConfigCapabilityId.Get,
          { name: "config" },
          [],
        ),
        step(
          "Updating it needs a token, so with authentication off it fails closed",
          ConfigCapabilityId.Update,
          { name: "config", bannerText: "Hello" },
          ADMIN,
          { ...failsWith(ErrorReason.AuthNotEnabled), mcpText: "Tool config.update not found" },
        ),
      ],
    ),
    scenario(
      "updating-configuration",
      "An administrator updates the configuration",
      "Only a caller holding the admin scope may change the configuration, and everyone then sees the change.",
      DocCategory.ApiCalls,
      true,
      [
        step(
          "A reader cannot update it",
          ConfigCapabilityId.Update,
          { name: "config", bannerText: "No" },
          READ,
          FAILS,
        ),
        step(
          "An administrator updates the banner",
          ConfigCapabilityId.Update,
          { name: "config", bannerText: "Back soon" },
          ADMIN,
        ),
        step("Anyone can read the new banner", ConfigCapabilityId.Get, { name: "config" }, []),
      ],
    ),
    scenario(
      "book-lifecycle",
      "The life of a book",
      "Create a book, read it, change one field, archive it, delete it softly and bring it back.",
      DocCategory.ApiCalls,
      true,
      [
        step("Create the book", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step("Read it back", BookCapabilityId.Get, { name: BOOK }, READ),
        step(
          "Change only the title",
          BookCapabilityId.Update,
          { name: BOOK, title: "Dune Messiah", updateMask: "title" },
          WRITE,
        ),
        step("Archive it", BookCapabilityId.Archive, { name: BOOK }, WRITE),
        step(
          "Archiving twice is a failed precondition",
          BookCapabilityId.Archive,
          { name: BOOK },
          WRITE,
          FAILS,
        ),
        step("Delete it (soft delete)", BookCapabilityId.Delete, { name: BOOK }, WRITE),
        step("Restore it", BookCapabilityId.Undelete, { name: BOOK }, WRITE),
      ],
    ),
    scenario(
      "listing-and-batches",
      "Listing, filtering and fetching in bulk",
      "List a publisher's books with a filter and an order, then fetch several by name in one call.",
      DocCategory.ApiCalls,
      true,
      [
        step("Create the first book", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step(
          "Create the second book",
          BookCapabilityId.Create,
          { ...NEW_BOOK, bookId: "emma", title: "Emma", author: "Jane Austen" },
          WRITE,
        ),
        step(
          "List ordered by title, newest filter applied",
          BookCapabilityId.List,
          { parent: PARENT, orderBy: "title desc", filter: "author:Jane*" },
          READ,
        ),
        step(
          "Fetch both by name",
          BookCapabilityId.BatchGet,
          { parent: PARENT, names: [BOOK, OTHER] },
          READ,
        ),
      ],
    ),
    scenario(
      "masking",
      "Who sees the author's email",
      "The email is masked unless the caller holds the read scope: the same record looks different to an anonymous caller and to a reader.",
      DocCategory.ApiHandling,
      true,
      [
        step("Create the book as a writer", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step(
          "An anonymous caller does not see the email",
          BookCapabilityId.Get,
          { name: BOOK },
          [],
        ),
        step("A reader does", BookCapabilityId.Get, { name: BOOK }, READ),
      ],
    ),
    scenario(
      "permissions",
      "Permission is checked before anything else",
      "A caller without the right scope is refused before the handler runs.",
      DocCategory.ApiHandling,
      true,
      [
        step("A reader cannot create a book", BookCapabilityId.Create, NEW_BOOK, READ, FAILS),
        step(
          "Without a token a required call is refused",
          BookCapabilityId.List,
          { parent: PARENT },
          [],
          FAILS,
        ),
      ],
    ),
    scenario(
      "long-running-reindex",
      "A long-running operation",
      "A reindex returns an operation straight away; the caller reads the operation, waits for it, lists operations and deletes the finished one.",
      DocCategory.ApiCalls,
      true,
      [
        step("Create a book to index", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step("Start the reindex", BookCapabilityId.Reindex, { parent: PARENT }, ADMIN),
        step(
          "Read the operation it returned",
          CapabilityId.OperationsGet,
          { name: "@previous.name" },
          ADMIN,
        ),
        step(
          "Wait until the operation is done",
          CapabilityId.OperationsWait,
          { name: "@previous.name", timeout: "10s" },
          ADMIN,
        ),
        step(
          "List the finished operations",
          CapabilityId.OperationsList,
          { filter: "done = true" },
          ADMIN,
        ),
        step(
          "Delete the finished operation",
          CapabilityId.OperationsDelete,
          { name: "@previous.name" },
          ADMIN,
        ),
        step(
          "Read the deleted operation",
          CapabilityId.OperationsGet,
          { name: "@previous.name" },
          ADMIN,
          failsWith(ErrorReason.OperationNotFound),
        ),
      ],
    ),
    scenario(
      "cancel-a-long-running-operation",
      "Cancelling a long-running operation",
      "An administrator cancels a reindex that is still running; the operation is kept and ends with the CANCELLED error.",
      DocCategory.ApiCalls,
      true,
      [
        step("Create a book to index", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step("Start the reindex", BookCapabilityId.Reindex, { parent: PARENT }, ADMIN),
        step(
          "Cancel it while it runs",
          CapabilityId.OperationsCancel,
          { name: "@previous.name" },
          ADMIN,
        ),
        step(
          "Read the operation: it is done and carries the CANCELLED error",
          CapabilityId.OperationsGet,
          { name: "@previous.name" },
          ADMIN,
          { reason: ErrorReason.OperationCancelled, mcpText: ErrorReason.OperationCancelled },
        ),
        step(
          "A reader may not cancel",
          CapabilityId.OperationsCancel,
          { name: "@previous.name" },
          READ,
          FAILS,
        ),
      ],
    ),
    scenario(
      "follow-a-long-running-operation",
      "Following a long-running operation as it works",
      "A caller follows a reindex while it runs. Over HTTP the caller reads a stream of events. Over MCP the caller subscribes to the operation, reads its state as a resource and watches it for a short time.",
      DocCategory.ApiCalls,
      true,
      [
        step("Create a book to index", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step("Start the reindex", BookCapabilityId.Reindex, { parent: PARENT }, ADMIN),
        step(
          "Follow the operation as an event stream",
          CapabilityId.OperationsGet,
          { name: "@previous.name" },
          ADMIN,
          {
            ...HTTP_ONLY,
            face: StepFace.Events,
          },
        ),
        step(
          "Subscribe to the operation and wait for its updates",
          CapabilityId.OperationsGet,
          { name: "@previous.name" },
          ADMIN,
          {
            ...MCP_ONLY,
            face: StepFace.Listen,
          },
        ),
        step(
          "Read the state of the operation as a resource",
          CapabilityId.OperationsGet,
          { name: "@previous.name" },
          ADMIN,
          {
            ...MCP_ONLY,
            face: StepFace.Resource,
          },
        ),
        step(
          "Watch the operation for a bounded time",
          CapabilityId.OperationsWatch,
          { name: "@previous.name", timeoutMs: 3000 },
          ADMIN,
          MCP_ONLY,
        ),
      ],
    ),
    scenario(
      "observability",
      "Looking at the service from the inside",
      "Administrators read request statistics and the most recent request events.",
      DocCategory.ApiCalls,
      true,
      [
        step("Make a call to generate traffic", ConfigCapabilityId.Get, { name: "config" }, []),
        step("Read the statistics", StatsCapabilityId.Get, { name: "stats" }, ADMIN),
        step("Read recent events", StatsCapabilityId.LogsList, { pageSize: 5 }, ADMIN),
        step(
          "Read the request events as one document",
          StatsCapabilityId.EventsGet,
          { name: "events" },
          ADMIN,
        ),
        step(
          "Watch the request events for a short time",
          StatsCapabilityId.EventsWatch,
          { name: "events", timeoutMs: 500 },
          ADMIN,
          MCP_ONLY,
        ),
        step(
          "A reader may not read the request events",
          StatsCapabilityId.EventsGet,
          { name: "events" },
          READ,
          FAILS,
        ),
        step("A reader may not", StatsCapabilityId.Get, { name: "stats" }, READ, FAILS),
      ],
    ),
    scenario(
      "agent-skills",
      "Giving an agent the skills of the platform",
      "Skills are written in a package or generated from the capabilities. The skills tools list them and return their files, so an agent that does not read skill resources can use them. A caller sees only the skills its token allows.",
      DocCategory.ApiCalls,
      true,
      [
        step("List the skills without a token", SkillCapabilityId.List, {}, []),
        step(
          "Read the skill about books, which is written in a package",
          SkillCapabilityId.Get,
          { name: "skills/working-with-books" },
          [],
        ),
        step(
          "A reader cannot read the skill for administrators",
          SkillCapabilityId.Get,
          { name: "skills/operating-the-service" },
          READ,
          failsWith(ErrorReason.ResourceNotFound),
        ),
        step(
          "An administrator reads it",
          SkillCapabilityId.Get,
          { name: "skills/operating-the-service" },
          ADMIN,
        ),
        step(
          "A skill that does not exist is not found",
          SkillCapabilityId.Get,
          { name: "skills/nothing" },
          READ,
          failsWith(ErrorReason.ResourceNotFound),
        ),
      ],
    ),
    scenario(
      "api-versions",
      "Versions of the API",
      "A capability belongs to one version. Stable calls use v1, beta calls use v1beta and alpha calls use v1alpha.",
      DocCategory.ApiHandling,
      true,
      [
        step("Create a book in the stable version v1", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step("Read it with a stable call under /v1", BookCapabilityId.Get, { name: BOOK }, READ),
        step(
          "Count the books with a beta call under /v1beta",
          BookCapabilityId.Count,
          { parent: PARENT },
          READ,
        ),
        step(
          "Suggest a book with an alpha call under /v1alpha once its flag is on",
          BookCapabilityId.Suggest,
          { parent: PARENT },
          READ,
          { flags: { [FeatureFlag.BooksSuggest]: true } },
        ),
      ],
    ),
    scenario(
      "feature-flag-books-suggest",
      "The flag books-suggest",
      "The flag books-suggest is off by default. While it is off the suggest call is not served. When it is on, the call works.",
      DocCategory.ApiHandling,
      true,
      [
        step("Create a book to suggest", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step(
          "With the flag off, the call is not served",
          BookCapabilityId.Suggest,
          { parent: PARENT },
          READ,
          {
            ...failsWith(ErrorReason.CapabilityDisabled),
            flags: { [FeatureFlag.BooksSuggest]: false },
          },
        ),
        step(
          "With the flag on, the call is served",
          BookCapabilityId.Suggest,
          { parent: PARENT },
          READ,
          { flags: { [FeatureFlag.BooksSuggest]: true } },
        ),
        step(
          "Switching the flag off again stops the call at once",
          BookCapabilityId.Suggest,
          { parent: PARENT },
          READ,
          {
            ...failsWith(ErrorReason.CapabilityDisabled),
            flags: { [FeatureFlag.BooksSuggest]: false },
          },
        ),
      ],
    ),
    scenario(
      "errors-not-found",
      "Errors when something is missing or named wrongly",
      "A name that points to nothing, or a name written wrongly, gives a clear error.",
      DocCategory.Troubleshooting,
      true,
      [
        step(
          "Read a book that does not exist",
          BookCapabilityId.Get,
          { name: BOOK },
          READ,
          failsWith(ErrorReason.ResourceNotFound),
        ),
        step(
          "Read a book with a name that does not match the pattern",
          BookCapabilityId.Get,
          { name: "publishers/acme/books/Bad Id" },
          READ,
          { ...failsWith(ErrorReason.ResourceNotFound), mcpText: ErrorReason.InvalidResourceName },
        ),
        step(
          "Read an operation that does not exist",
          CapabilityId.OperationsGet,
          { name: "operations/missing" },
          ADMIN,
          failsWith(ErrorReason.OperationNotFound),
        ),
        step(
          "Delete a publisher that has no books",
          ConformanceCapabilityId.PublishersDelete,
          { name: PARENT },
          WRITE,
          failsWith(ErrorReason.ResourceNotFound),
        ),
      ],
    ),
    scenario(
      "errors-input",
      "Errors when the input is wrong",
      "The API checks every input field and says which rule the input broke.",
      DocCategory.Troubleshooting,
      true,
      [
        step(
          "Create a book with an invalid id",
          BookCapabilityId.Create,
          { ...NEW_BOOK, bookId: "Not Valid!" },
          WRITE,
          failsWith(ErrorReason.InvalidResourceId),
        ),
        step(
          "Create a book without a title",
          BookCapabilityId.Create,
          { parent: PARENT, bookId: "dune" },
          WRITE,
          failsWith(ErrorReason.RequiredFieldMissing),
        ),
        step(
          "Send a value of the wrong type",
          BookCapabilityId.List,
          { parent: PARENT, pageSize: "many" },
          READ,
          { ...failsWith(ErrorReason.ValidationFailed), mcpText: "Input validation error" },
        ),
        step(
          "List with a filter that cannot be read",
          BookCapabilityId.List,
          { parent: PARENT, filter: "nothing:x" },
          READ,
          failsWith(ErrorReason.InvalidFilter),
        ),
        step(
          "List ordered by a field that does not exist",
          BookCapabilityId.List,
          { parent: PARENT, orderBy: "nothing" },
          READ,
          failsWith(ErrorReason.InvalidOrderBy),
        ),
        step(
          "List with a page token that is not valid",
          BookCapabilityId.List,
          { parent: PARENT, pageToken: "garbage" },
          READ,
          failsWith(ErrorReason.InvalidPageToken),
        ),
        step("Send a field the call does not know", BookCapabilityId.Create, NEW_BOOK, WRITE, {
          ...failsWith(ErrorReason.UnknownField),
          ...HTTP_ONLY,
          extraBody: { bogusField: 1 },
        }),
        step(
          "Create more books in one batch than the limit allows",
          ConformanceCapabilityId.BooksBatchCreate,
          { parent: PARENT },
          WRITE,
          {
            ...failsWith(ErrorReason.BatchTooLarge),
            ...HTTP_ONLY,
            bulk: OVER_THE_LIMIT,
          },
        ),
        step(
          "List with a page size below zero",
          BookCapabilityId.List,
          { parent: PARENT, pageSize: -1 },
          READ,
          failsWith(ErrorReason.InvalidPageSize),
        ),
      ],
    ),
    scenario(
      "errors-state",
      "Errors when the state does not allow the call",
      "A call can fail because of what already exists, or because the resource is in the wrong state.",
      DocCategory.Troubleshooting,
      true,
      [
        step("Create a book", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step(
          "Create the same book again",
          BookCapabilityId.Create,
          NEW_BOOK,
          WRITE,
          failsWith(ErrorReason.ResourceExists),
        ),
        step(
          "Update with an etag that is out of date",
          BookCapabilityId.Update,
          { name: BOOK, title: "New", updateMask: "title", etag: "stale" },
          WRITE,
          failsWith(ErrorReason.EtagMismatch),
        ),
        step(
          "Update with a field mask that names no field",
          BookCapabilityId.Update,
          { name: BOOK, title: "New", updateMask: "bogus" },
          WRITE,
          failsWith(ErrorReason.InvalidFieldMask),
        ),
        step("Archive the book", BookCapabilityId.Archive, { name: BOOK }, WRITE),
        step(
          "Archive it a second time",
          BookCapabilityId.Archive,
          { name: BOOK },
          WRITE,
          failsWith(ErrorReason.InvalidTransition),
        ),
        step(
          "Delete a publisher that still has books",
          ConformanceCapabilityId.PublishersDelete,
          { name: PARENT },
          WRITE,
          failsWith(ErrorReason.HasChildren),
        ),
      ],
    ),
    scenario(
      "errors-access",
      "Errors when the caller may not do this",
      "The API checks the token and the scope before it runs any code.",
      DocCategory.Troubleshooting,
      true,
      [
        step("Call without a token", BookCapabilityId.List, { parent: PARENT }, [], {
          ...failsWith(ErrorReason.TokenMissing),
        }),
        step(
          "Call with a token that has expired",
          BookCapabilityId.List,
          { parent: PARENT },
          READ,
          {
            ...failsWith(ErrorReason.TokenExpired),
            ...HTTP_ONLY,
            tokenFlaw: TokenFlaw.Expired,
          },
        ),
        step(
          "Call with a token issued for another audience",
          BookCapabilityId.List,
          { parent: PARENT },
          READ,
          { ...failsWith(ErrorReason.TokenInvalid), ...HTTP_ONLY, tokenFlaw: TokenFlaw.Foreign },
        ),
        step(
          "Call from a browser origin the server does not trust",
          BookCapabilityId.Get,
          { name: BOOK },
          READ,
          {
            ...failsWith(ErrorReason.OriginNotAllowed),
            ...HTTP_ONLY,
            raw: { method: HttpMethod.Get, path: `/v1/${BOOK}`, headers: UNTRUSTED_HEADERS },
          },
        ),
        step(
          "Open the live event stream without the admin scope",
          StatsCapabilityId.EventsGet,
          { name: "events" },
          READ,
          {
            ...failsWith(ErrorReason.PolicyDenied),
            ...HTTP_ONLY,
            raw: { method: HttpMethod.Get, path: "/v1/events" },
          },
        ),
        step(
          "Call with a token that lacks the write scope",
          BookCapabilityId.Create,
          NEW_BOOK,
          READ,
          { ...failsWith(ErrorReason.PolicyDenied), mcpText: "Tool books.create not found" },
        ),
        step(
          "Start reindex number 1 of the allowed five",
          BookCapabilityId.Reindex,
          { parent: PARENT },
          ADMIN,
        ),
        step(
          "Start reindex number 2 of the allowed five",
          BookCapabilityId.Reindex,
          { parent: PARENT },
          ADMIN,
        ),
        step(
          "Start reindex number 3 of the allowed five",
          BookCapabilityId.Reindex,
          { parent: PARENT },
          ADMIN,
        ),
        step(
          "Start reindex number 4 of the allowed five",
          BookCapabilityId.Reindex,
          { parent: PARENT },
          ADMIN,
        ),
        step(
          "Start reindex number 5 of the allowed five",
          BookCapabilityId.Reindex,
          { parent: PARENT },
          ADMIN,
        ),
        step(
          "The sixth start inside the window is refused",
          BookCapabilityId.Reindex,
          { parent: PARENT },
          ADMIN,
          failsWith(ErrorReason.RateLimited),
        ),
      ],
    ),
    scenario(
      "errors-server",
      "Errors about the address and the server",
      "A wrong address or method, and a fault inside the server, each give a clear error.",
      DocCategory.Troubleshooting,
      true,
      [
        step("Create a book", BookCapabilityId.Create, NEW_BOOK, WRITE),
        step("Call a custom verb that does not exist", BookCapabilityId.Create, NEW_BOOK, WRITE, {
          ...failsWith(ErrorReason.UnknownVerb),
          ...HTTP_ONLY,
          raw: { method: HttpMethod.Post, path: `/v1/${PARENT}/books:nonsense`, body: NO_BODY },
        }),
        step(
          "Use a method the address does not accept",
          BookCapabilityId.List,
          { parent: PARENT },
          READ,
          {
            ...failsWith(ErrorReason.MethodNotAllowed),
            ...HTTP_ONLY,
            raw: { method: HttpMethod.Patch, path: `/v1/${PARENT}/books` },
          },
        ),
        step(
          "Read a book whose stored record is damaged",
          BookCapabilityId.Get,
          { name: BOOK },
          READ,
          {
            ...failsWith(ErrorReason.InternalError),
            ...HTTP_ONLY,
            tamper: "update books set state = 'DAMAGED'",
          },
        ),
      ],
    ),
    requiredHeadersScenario(),
    customScenario(),
    authScenario(
      AuthProviderKind.Jwks,
      "authentication-jwks",
      "Signing in with a token from a JWKS provider",
      "A caller proves who it is with a bearer token. Every case is shown over HTTP and over MCP. The cases are no token, a token with enough scope, a token with too little scope, an expired token and a token for another audience.",
    ),
    authScenario(
      AuthProviderKind.BetterAuth,
      "authentication-better-auth",
      "Signing in with a token from Better Auth",
      "The same five cases with the tokens issued by the Better Auth server that ships with the platform.",
    ),
  ];
}
