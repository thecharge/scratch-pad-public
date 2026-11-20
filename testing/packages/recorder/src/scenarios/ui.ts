import { DocCategory, MessageId, UiActionKind, UiFocus } from "@platform/constants";
import { message } from "@platform/messages";
import type { UiGuide, UiScenario, UiStep } from "@platform/types";

const READ = ["read"];
const ADMIN = ["read", "write", "admin"];
const say = (id: MessageId) => message(id);

function step(
  description: string,
  kind: UiActionKind,
  guide: UiGuide,
  options: Partial<UiStep> = {},
): UiStep {
  return {
    description,
    kind,
    ...guide,
    expectVisible: [],
    expectHidden: [],
    forbidRequests: [],
    expectNoTokenInStorage: false,
    ...options,
  };
}

const OPEN = step(
  "Open the console",
  UiActionKind.Goto,
  {
    place: "The console address in the browser",
    action: "Open the console page",
    expected: "The page says that an administrator is needed",
  },
  { expectVisible: [say(MessageId.UiNoAdmin)] },
);
const SIGN_IN = step(
  "Sign in with the authorization code flow",
  UiActionKind.Click,
  {
    place: "The console start page",
    action: "Click the Sign in button",
    expected: "The console title and the Live requests menu appear",
  },
  {
    target: say(MessageId.UiSignIn),
    focus: UiFocus.Nav,
    expectVisible: [say(MessageId.UiConsoleTitle), say(MessageId.UiNavLive)],
  },
);
const TRAFFIC = [
  step(
    "The API handles a request",
    UiActionKind.Api,
    {
      place: "The API, outside the console",
      action: "Send GET /v1/publishers/acme/books/dune to the API",
      expected: "The API answers with HTTP 200",
    },
    { target: "GET /v1/publishers/acme/books/dune" },
  ),
  step(
    "The API handles a failing request",
    UiActionKind.Api,
    {
      place: "The API, outside the console",
      action: "Send GET /v1/publishers/acme/books/none to the API",
      expected: "The API answers with HTTP 404",
    },
    { target: "GET /v1/publishers/acme/books/none" },
  ),
];

export function uiScenarios(): UiScenario[] {
  return [
    {
      id: "console-sign-in",
      title: "Signing in to the console",
      intent:
        "The console asks for an administrator, sends the browser through the authorization code flow with PKCE, and keeps the token in memory only.",
      category: DocCategory.Ui,
      scopes: ADMIN,
      steps: [
        OPEN,
        SIGN_IN,
        step(
          "The token is nowhere in browser storage",
          UiActionKind.Look,
          {
            place: "The signed-in console",
            action: "Look at the browser storage",
            expected: "No token is in local storage, session storage or cookies",
          },
          { expectNoTokenInStorage: true, focus: UiFocus.Nav },
        ),
        step(
          "Reloading signs the user out again",
          UiActionKind.Reload,
          {
            place: "The signed-in console",
            action: "Reload the page",
            expected: "The page asks for an administrator again and the Request log menu is gone",
          },
          {
            expectVisible: [say(MessageId.UiNoAdmin)],
            expectHidden: [say(MessageId.UiNavLogs)],
            expectNoTokenInStorage: true,
          },
        ),
      ],
    },
    {
      id: "console-live-requests",
      title: "Watching requests arrive",
      intent:
        "Requests handled by the API appear in the live view without a refresh, with their transport, caller, outcome and latency.",
      category: DocCategory.Ui,
      scopes: ADMIN,
      steps: [
        OPEN,
        SIGN_IN,
        step(
          "Nothing has happened yet",
          UiActionKind.Look,
          {
            place: "The Live requests view",
            action: "Look at the table",
            expected: "The view says that it is waiting for requests",
          },
          { expectVisible: [say(MessageId.UiLiveWaiting)], focus: UiFocus.Card },
        ),
        { ...TRAFFIC[0], expectVisible: ["books.get"], focus: UiFocus.Table } as UiStep,
        TRAFFIC[1] as UiStep,
        step(
          "Both requests are listed",
          UiActionKind.Look,
          {
            place: "The Live requests view",
            action: "Look at the table",
            expected: "The table lists books.get with the statuses 200 and 404",
          },
          { expectVisible: ["books.get", "200", "404"], focus: UiFocus.Table },
        ),
      ],
    },
    {
      id: "console-request-log",
      title: "Filtering the request log",
      intent: "The log lists recent events and narrows to one capability when filtered.",
      category: DocCategory.Ui,
      scopes: ADMIN,
      steps: [
        OPEN,
        SIGN_IN,
        ...TRAFFIC,
        step(
          "Open the request log",
          UiActionKind.Click,
          {
            place: "The console menu",
            action: "Click the Request log menu",
            expected: "The log lists books.get",
          },
          { target: say(MessageId.UiNavLogs), expectVisible: ["books.get"], focus: UiFocus.Card },
        ),
        step(
          "Filter by a capability that was never called",
          UiActionKind.Fill,
          {
            place: "The capability filter above the log",
            action: "Type books.archive in the filter",
            expected: "The log no longer shows books.get",
          },
          {
            target: say(MessageId.UiFilterCapability),
            value: "books.archive",
            expectHidden: ["books.get"],
            focus: UiFocus.Card,
          },
        ),
        step(
          "Filter by the capability that was called",
          UiActionKind.Fill,
          {
            place: "The capability filter above the log",
            action: "Type books.get in the filter",
            expected: "The log shows books.get again",
          },
          {
            target: say(MessageId.UiFilterCapability),
            value: "books.get",
            expectVisible: ["books.get"],
            focus: UiFocus.Card,
          },
        ),
      ],
    },
    {
      id: "console-statistics",
      title: "Reading the statistics",
      intent:
        "Per-capability request counts, errors, cache hits, latency and rate, with a chart, narrowed by a capability filter.",
      category: DocCategory.Ui,
      scopes: ADMIN,
      steps: [
        OPEN,
        SIGN_IN,
        ...TRAFFIC,
        step(
          "Open the statistics",
          UiActionKind.Click,
          {
            place: "The console menu",
            action: "Click the Statistics menu",
            expected: "The chart title, the latency column, the rate column and books.get appear",
          },
          {
            target: say(MessageId.UiNavStats),
            expectVisible: [
              say(MessageId.UiStatChartTitle),
              say(MessageId.UiColAvgLatency),
              say(MessageId.UiColRate),
              "books.get",
            ],
            focus: UiFocus.Table,
          },
        ),
        step(
          "Filter the statistics to a capability",
          UiActionKind.Fill,
          {
            place: "The capability filter above the statistics",
            action: "Type books.get in the filter",
            expected: "The table shows books.get",
          },
          {
            target: say(MessageId.UiFilterStats),
            value: "books.get",
            expectVisible: ["books.get"],
            focus: UiFocus.Table,
          },
        ),
      ],
    },
    {
      id: "console-without-admin",
      title: "A reader cannot use the console",
      intent:
        "A user without the admin scope signs in but is shown no data, and the console never asks the API for any.",
      category: DocCategory.Ui,
      scopes: READ,
      steps: [
        OPEN,
        step(
          "Sign in as a reader",
          UiActionKind.Click,
          {
            place: "The console start page",
            action: "Click the Sign in button as a user without the admin scope",
            expected: "The page still asks for an administrator and no data request is made",
          },
          {
            target: say(MessageId.UiSignIn),
            expectVisible: [say(MessageId.UiNoAdmin)],
            expectHidden: [say(MessageId.UiNavLogs)],
            forbidRequests: ["/v1/stats", "/v1/logs", "/v1/events"],
            focus: UiFocus.Card,
          },
        ),
      ],
    },
  ];
}
