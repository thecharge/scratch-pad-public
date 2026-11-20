import { pathInput, publicPath, routeFor, splitInput } from "@platform/aip";
import {
  ApiVersion,
  CanonicalCode,
  ErrorReason,
  HttpMethod,
  InputField,
  MethodKind,
  PathStyle,
  RouteScope,
} from "@platform/constants";
import { negative, positive, rejected, unit } from "@platform/test-factories";
import { z } from "zod";

const ITEM = "publishers/{publisher}/books/{book}";
const capability = (method: MethodKind, resource: string, extra: object = {}) => ({
  method,
  resource,
  ...extra,
});
const route = (overrides: object = {}) => ({
  method: HttpMethod.Get,
  segments: ["publishers", "{publisher}", "books", "{book}"],
  scope: RouteScope.Item,
  target: InputField.Name,
  ...overrides,
});
const withInput = (method: MethodKind, shape: z.ZodRawShape) => ({
  ...capability(method, ITEM),
  input: z.object(shape),
});
const BAD_NAME = { code: CanonicalCode.InvalidArgument, reason: ErrorReason.InvalidResourceName };

unit(routeFor, {
  positive: [
    positive("get is a GET on the item", [capability(MethodKind.Get, ITEM)], {
      method: HttpMethod.Get,
      segments: ["publishers", "{publisher}", "books", "{book}"],
      scope: RouteScope.Item,
      target: InputField.Name,
    }),
    positive(
      "list is a GET on the collection under its parent",
      [capability(MethodKind.List, ITEM)],
      {
        method: HttpMethod.Get,
        segments: ["publishers", "{publisher}", "books"],
        scope: RouteScope.Collection,
        target: InputField.Parent,
      },
    ),
    positive("a batch method adds its verb", [capability(MethodKind.BatchGet, ITEM)], {
      method: HttpMethod.Get,
      segments: ["publishers", "{publisher}", "books"],
      scope: RouteScope.Collection,
      verb: MethodKind.BatchGet,
      target: InputField.Parent,
    }),
  ],
  negative: [
    rejected(
      "a top level collection has no target",
      [capability(MethodKind.List, "publishers/{publisher}")],
      {
        method: HttpMethod.Get,
        segments: ["publishers"],
        scope: RouteScope.Collection,
      },
    ),
    rejected(
      "a custom method on an item keeps its verb and POST",
      [capability(MethodKind.Custom, ITEM, { customVerb: "archive" })],
      {
        method: HttpMethod.Post,
        segments: ["publishers", "{publisher}", "books", "{book}"],
        scope: RouteScope.Item,
        verb: "archive",
        target: InputField.Name,
      },
    ),
    rejected(
      "a custom method may declare its HTTP method",
      [capability(MethodKind.Custom, "stats", { customVerb: "read", httpMethod: HttpMethod.Get })],
      {
        method: HttpMethod.Get,
        segments: ["stats"],
        scope: RouteScope.Collection,
        verb: "read",
      },
    ),
  ],
});

unit(publicPath, {
  positive: [
    positive(
      "an item path in OpenAPI style",
      [route(), ApiVersion.V1],
      "/v1/publishers/{publisher}/books/{book}",
    ),
    positive(
      "an item path in router style",
      [route(), ApiVersion.V1, PathStyle.Router],
      "/v1/publishers/:publisher/books/:book",
    ),
    positive(
      "a verb is joined by a colon in OpenAPI style",
      [route({ verb: "archive" }), ApiVersion.V1],
      "/v1/publishers/{publisher}/books/{book}:archive",
    ),
  ],
  negative: [
    rejected(
      "a verb is a path segment in router style",
      [route({ verb: "archive" }), ApiVersion.V1, PathStyle.Router],
      "/v1/publishers/:publisher/books/:book/_verbs/archive",
    ),
    rejected(
      "a route without parameters is unchanged",
      [route({ segments: ["stats"], scope: RouteScope.Collection }), ApiVersion.V1],
      "/v1/stats",
    ),
  ],
});

unit(pathInput, {
  positive: [
    positive("an item route builds its name", [route(), { publisher: "p1", book: "b1" }], {
      name: "publishers/p1/books/b1",
    }),
    positive(
      "a collection route builds its parent",
      [
        route({
          segments: ["publishers", "{publisher}", "books"],
          scope: RouteScope.Collection,
          target: InputField.Parent,
        }),
        { publisher: "p1" },
      ],
      { parent: "publishers/p1" },
    ),
  ],
  negative: [
    rejected("a route without a target adds nothing", [route({ target: undefined }), {}], {}),
    negative("a missing parameter", [route(), { publisher: "p1" }], BAD_NAME),
  ],
});

unit(splitInput, {
  positive: [
    positive(
      "a get sends every other field in the query",
      [withInput(MethodKind.Get, { name: z.string(), view: z.string() }), route()],
      {
        path: ["name"],
        query: ["view"],
        body: [],
      },
    ),
    positive(
      "a patch sends the update mask in the query and the rest in the body",
      [
        withInput(MethodKind.Update, {
          name: z.string(),
          title: z.string(),
          updateMask: z.string(),
        }),
        route({ method: HttpMethod.Patch }),
      ],
      {
        path: ["name"],
        query: ["updateMask"],
        body: ["title"],
      },
    ),
  ],
  negative: [
    rejected(
      "a create id goes in the query",
      [
        withInput(MethodKind.Create, { parent: z.string(), bookId: z.string(), book: z.string() }),
        route({ method: HttpMethod.Post }),
      ],
      {
        path: ["parent"],
        query: ["bookId"],
        body: ["book"],
      },
    ),
    rejected(
      "a capability without an object input has no fields",
      [{ ...capability(MethodKind.Get, ITEM), input: z.string() }, route()],
      { path: [], query: [], body: [] },
    ),
  ],
});
