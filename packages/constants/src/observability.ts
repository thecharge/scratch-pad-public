import { MessageId } from "./messages.ts";
export enum SpanName {
  CapabilityInvoke = "capability.invoke",
}

export enum SpanAttribute {
  Capability = "platform.capability",
  Transport = "platform.transport",
  PrincipalKind = "platform.principal_kind",
  Status = "platform.status",
  CacheHit = "platform.cache_hit",
  PolicyOutcome = "platform.policy_outcome",
  Stage = "platform.stage",
  Form = "platform.form",
  HttpVersion = "platform.http_version",
}

export enum MetricName {
  Calls = "platform.capability.calls",
  Latency = "platform.capability.latency_ms",
  StageLatency = "platform.http.stage_latency_ms",
  OperationLatency = "platform.http.operation_latency_ms",
}

export enum HttpStage {
  Route = "route",
  Negotiate = "negotiate",
  Input = "input",
  Invoke = "invoke",
  Respond = "respond",
  Rewrite = "rewrite",
}

export enum LogField {
  TraceId = "traceId",
  SpanId = "spanId",
  Capability = "capability",
  Transport = "transport",
  Status = "status",
  LatencyMs = "latencyMs",
  Port = "port",
}

export enum StatsCapabilityId {
  Get = "stats.get",
  LogsList = "logs.list",
  EventsGet = "events.get",
  EventsWatch = "events.watch",
}

export const API_EVENT_NAME = "api-event";

export enum StatsPattern {
  Stats = "stats",
  Events = "events",
  Logs = "logs/{log}",
}

export enum Signal {
  Interrupt = "SIGINT",
  Terminate = "SIGTERM",
}

export const TELEMETRY_SCOPE = "capability-platform";
export const RECENT_EVENTS_MAX = 500;
export const MAX_SUBSCRIBERS = 64;
export const DEFAULT_LOG_LIMIT = 100;
export const MAX_LOG_LIMIT = 500;
export const READY_LINE_PREFIX = "listening";
export const LOG_REDACT_WILDCARD = "*.";

export const PREVIOUS_REFERENCE_PREFIX = "@previous.";
export const KB_FILE_SUFFIX = ".mdx";
export const SCRUBBED_VALUE = "[redacted]";
export const SCRUB_PATTERNS: readonly RegExp[] = [
  /eyJ[\w-]+\.[\w-]+\.[\w-]+/g,
  /Bearer\s+[\w.~+/-]+=*/g,
  /\b[A-Za-z0-9_-]{40,}\b/g,
];
export const EXCHANGE_BODY_INDENT = 2;
export const DOCS_DOMAIN = "docs.example.test";
export const DOCS_PROXY_SECRET = "docs-proxy-secret-used-by-the-end-to-end-suite";
export const DOCS_REINDEX_STEP_MS = 400;

export enum OutcomeLabel {
  Ok = "ok",
  Error = "error",
  Success = "success",
  AnError = "an error",
}

export enum TokenFlaw {
  Expired = "expired",
  Foreign = "foreign",
}
export const EXPIRED_TOKEN_SECONDS = -60;
export const TRUNCATED_ITEMS = 2;
export const TAMPER_DATABASE_SUFFIX = ".sqlite";
export const TAMPER_DATABASE_PREFIX = "tamper-";

export enum StepFlag {
  Passed = "passed",
  Failed = "failed",
}

export enum StepSource {
  Console = "console",
  Http = "http",
  Mcp = "mcp",
  Sdk = "sdk",
}

export enum CheckKind {
  Visible = "visible",
  Hidden = "hidden",
  ForbiddenRequest = "forbidden-request",
  TokenStorage = "token-storage",
  PageError = "page-error",
  Outcome = "outcome",
  Reason = "reason",
  Status = "status",
  Challenge = "challenge",
  Stream = "stream",
}

export enum StepFace {
  Events = "events",
  Resource = "resource",
  Listen = "listen",
}

export const LISTEN_UPDATES_WANTED = 2;
export const LISTEN_TIMEOUT_MS = 10_000;

export const KB_CLIENT_VERSION = "1.0.0";
export const QUERY_SEPARATOR = "?";
export const KB_STATUS_SEPARATOR = ", HTTP ";
export const KB_TEMP_PREFIX = "kb-";
export const KB_CLOCK_EPOCH = "2001-01-01T00:00:00.000Z";
export const KB_CLOCK_STEP_MS = 1;
export const KB_STABLE_YEAR = "2001-";
export const KB_OBSERVED_TIME = "2001-01-01T00:00:00.000Z";
export const KB_HTTP_DATE = "Mon, 01 Jan 2001 00:00:00 GMT";
export const HTTP_DATE_PATTERN =
  /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} GMT\b/g;
export const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g;
export const TIMESTAMP_PATTERN = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z/g;
export const STABLE_UUID_PREFIX = "00000000-0000-4000-8000-";
export const STABLE_UUID_DIGITS = 12;
export const ZERO_DIGIT = "0";
export const FS_EXISTS_CODE = "EEXIST";
export const UTF8 = "utf8";
export const UI_SCENARIO_TIMEOUT_MS = 45_000;
export const UI_SCENARIO_ATTEMPTS = 3;
export const TIMEOUT_ERROR_NAME = "TimeoutError";
export const UI_RECORDING_TIMEOUT_MS = 600_000;
export const BUILD_TIMEOUT_MS = 180_000;
export const DOCS_BROWSE_LABEL = "Browsing the built documentation";
export const UI_RECORDING_LABEL = "The browser recording";
export const UI_RECORDING_RESULTS_FILE = ".ui-recording-results.json";
export const API_RECORDING_LABEL = "Recording the API scenarios";
export const CONSOLE_BUILD_LABEL = "Building the console";
export const KB_BETTER_AUTH_SECRET = "kb-better-auth-secret-of-at-least-32-characters";
export const KB_ADMIN_EMAIL = "admin@example.com";
export const KB_ADMIN_PASSWORD = "correct-horse-battery-staple";
export const KB_ADMIN_NAME = "Documentation admin";
export const KB_CLIENT_NAME = "documentation-machine";
export const KB_COOKIE_SEPARATOR = "; ";
export const SET_COOKIE_VALUE_END = ";";
export const FORM_MEDIA_TYPE = "application/x-www-form-urlencoded";
export const BASIC_SCHEME = "Basic";
export const CLIENT_CREDENTIALS_GRANT = "client_credentials";
export const CLIENT_SECRET_BASIC = "client_secret_basic";
export const BASE64_ENCODING = "base64";
export const SIGNED_TOKEN_SUBJECT = "user-1";
export const MS_PER_SECOND = 1000;
export const NANOSECONDS_PER_MILLISECOND = 1_000_000;

export enum BetterAuthEndpoint {
  SignUp = "/sign-up/email",
  Token = "/oauth2/token",
}
export enum CustomCapabilityId {
  Greeting = "greetings.get",
  Shout = "greetings.shout",
}
export const SHOUT_VERB = "shout";
export const GREETING_RESOURCE = "greetings/{greeting}";
export const GREETING_SKILLS_DIR = "../skills";
export const GREETING_SUMMARY = "Get a greeting";
export const GREETING_DESCRIPTION = "Returns the text of the greeting with the given name.";
export const SHOUT_SUMMARY = "Shout a greeting";
export const SHOUT_DESCRIPTION =
  "Returns the text of the greeting with the given name in capital letters. It exists only as an MCP tool.";
export const SDK_STEP_LABEL = "An SDK consumer step";
export const UI_LOCK_NAME = "platform-ui-recording.lock";
export const UI_LOCK_OWNER_FILE = "owner";
export const UI_LOCK_POLL_MS = 500;
export const UI_LOCK_WAIT_MS = 900_000;
export const NO_PROCESS_SIGNAL = 0;

export const REFERENCE_OUTPUT_DIR = "apps/docs/src/content/docs/api-calls";
export enum ReferencePageName {
  Http = "http",
  Mcp = "mcp",
  Skills = "skills",
}
export const ASTRO_BUILD_ARGS = ["--bun", "astro", "build"] as const;

export enum ReferenceTitle {
  Http = "HTTP reference",
  Mcp = "MCP tool reference",
  Skills = "Skills reference",
}

export enum ReferenceDescription {
  Http = "Every operation of the generated OpenAPI document.",
  Mcp = "Every tool the MCP endpoint offers, with its input schema.",
  Skills = "The agent skills published over MCP.",
}

export const SDK_DEFAULT_WAIT_INTERVAL_MS = 50;
export const SDK_STREAM_PARSE = "stream";
export const SDK_DEFAULT_WAIT_TIMEOUT_MS = 10_000;

export enum ClaudeFlag {
  Print = "-p",
  McpConfig = "--mcp-config",
  Strict = "--strict-mcp-config",
  AllowedTools = "--allowedTools",
  OutputFormat = "--output-format",
  Verbose = "--verbose",
  MaxTurns = "--max-turns",
}

export enum ClaudeValue {
  Binary = "claude",
  StreamJson = "stream-json",
  ToolPrefix = "mcp__platform",
  Connected = "connected",
}

export enum TranscriptType {
  ToolUse = "tool_use",
  ToolResult = "tool_result",
}

export const LLM_MAX_TURNS = "12";
export const LLM_TIMEOUT_MS = 170_000;
export const MCP_SERVER_KEY = "platform";

export const HARNESS_DOMAIN = "harness.test";
export const HARNESS_CONFIG_FILE = "mcp.json";
export const HARNESS_TEMP_PREFIX = "mcp-harness-";
export const MCP_HTTP_TYPE = "http";

export const LLM_EVIDENCE_PATH = ".stack/e2e/mcp-harness.json";
export const MCP_HARNESS_E2E_EVIDENCE_PATH = ".stack/e2e/mcp-harness-e2e.json";
export const LLM_TOOL_SEPARATOR = "__";
export const LLM_LIFECYCLE_ID = "lifecycle";
export const LLM_BOOKS_URL = "/v1/publishers/acme/books";
export const LLM_INDENT = 2;

export enum UiActionKind {
  Goto = "goto",
  Click = "click",
  Fill = "fill",
  Api = "api",
  Reload = "reload",
  Look = "look",
}

export const CHROME_CANDIDATES: readonly string[] = [
  "/usr/bin/google-chrome",
  "/usr/bin/google-chrome-stable",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];
export const CHROME_ARGS: readonly string[] = [
  "--no-sandbox",
  "--disable-gpu",
  "--disable-dev-shm-usage",
];
export const UI_VIEWPORT_WIDTH = 1280;
export const UI_VIEWPORT_HEIGHT = 800;
export const UI_STEP_TIMEOUT_MS = 15_000;
export const UI_SETTLE_MS = 400;
export const INTERNAL_DOCS_DIR = "docs";
export const DOCS_E2E_DIR = "docs/e2e/screenshots";
export const DOCS_E2E_SHOT_PATH = "screenshots";
export const DOCS_E2E_REPORT = "docs/e2e/report.md";
export const DOCS_DIST = "apps/docs/dist";
export const CONSOLE_DIST_PREFIX = "console-dist-";
export const DIAGRAM_SELECTOR = "pre.mermaid";
export const DIAGRAM_SVG_SELECTOR = "pre.mermaid svg";
export const IMAGE_SELECTOR = "img";
export const HEADING_SELECTOR = "h1";
export const DOCS_FOCUS_SELECTORS: readonly string[] = [
  "pre.mermaid",
  ".sl-markdown-content img",
  ".sl-markdown-content table",
];
export const SEARCH_TERM = "masking";
export const SEARCH_RESULTS_FOR = "[1-9]\\d* results? for ";
export const IGNORED_FAILURE = "ERR_ABORTED";
export const STORAGE_SCRIPT =
  "[JSON.stringify(localStorage), JSON.stringify(sessionStorage), document.cookie].join('')";
export const JWT_PATTERN = /eyJ[\w-]+\.[\w-]+\.[\w-]+/;
export const ADMIN_BEARER_SCOPES: readonly string[] = ["read", "write", "admin"];

export const UI_DOMAIN = "ui.test";
export const VITE_BUILD_ARGS = ["--bun", "vite", "build", "--outDir"] as const;
export const VITE_EMPTY_FLAG = "--emptyOutDir";
export const INDEX_FILE = "index.html";
export const INDEX_PATH = "/index.html";
export const SHOT_FOLDER = "shots";

export const WAIT_VISIBLE = "visible" as const;
export const NETWORK_IDLE = "networkidle" as const;
export const EVENT_PAGE_ERROR = "pageerror" as const;
export const EVENT_REQUEST = "request" as const;
export const EVENT_REQUEST_FAILED = "requestfailed" as const;
export const SHOT_EXTENSION = ".png";
export const API_CALL_SEPARATOR = " ";
export const DETAIL_SEPARATOR = "; ";

export const DOCS_PAGE_GLOB = "**/index.html";
export const DOCS_SKIPPED_PAGES: readonly string[] = ["404", "pagefind"];
export const DOCS_SEARCH_KEY = "Control+K";
export const DOCS_SEARCH_DIALOG = "dialog[open]";
export const DOCS_SEARCH_INPUT = "dialog[open] input";
export const DOCS_ROOT_PAGE = "/";
export const IMAGES_BROKEN_SCRIPT =
  "Array.from(document.images).filter((image) => image.complete === false || image.naturalWidth === 0).length";
export const LOAD_STATE_SETTLE_MS = 300;
export const WAIT_HIDDEN = "hidden" as const;
export const UI_CLOSE_TIMEOUT_MS = 3000;
export const DOCS_SEARCH_BUTTON = "site-search button[data-open-modal]";
export const E2E_TEST_TIMEOUT_MS = 180_000;
export const PORT_BASE = 20_000;
export const PORT_SPAN = 4000;

export enum DocCategory {
  Ui = "ui",
  ApiCalls = "api-calls",
  ApiHandling = "api-handling",
  Troubleshooting = "troubleshooting",
  General = "general",
  OpenApi = "openapi",
  SdkUsage = "sdk-usage",
}

export const DOC_CATEGORY_MESSAGES: Readonly<Record<DocCategory, MessageId>> = {
  [DocCategory.Ui]: MessageId.CategoryUi,
  [DocCategory.ApiCalls]: MessageId.CategoryApiCalls,
  [DocCategory.ApiHandling]: MessageId.CategoryApiHandling,
  [DocCategory.Troubleshooting]: MessageId.CategoryTroubleshooting,
  [DocCategory.General]: MessageId.CategoryGeneral,
  [DocCategory.OpenApi]: MessageId.CategoryOpenApi,
  [DocCategory.SdkUsage]: MessageId.CategorySdkUsage,
};

export enum UiFocus {
  Root = "#root",
  Nav = "#root nav",
  Card = "[data-slot='card']",
  Table = "table",
  Heading = "#root h1",
  Input = "input",
}

export enum GeneratedPage {
  SdkReference = "reference",
  FeatureFlags = "feature-flags",
  Versions = "versions",
  GettingStarted = "getting-started",
}

export const SHOT_FOLDER_URL = "./shots";
export const IMAGES_EAGER_SCRIPT =
  "Promise.all(Array.from(document.images).map((image) => { image.loading = 'eager'; return image.decode().catch(() => undefined); }))";
export const IMAGES_BLANK_SCRIPT =
  "(async () => { const blank = await Promise.all(Array.from(document.images).map(async (image) => { if (image.naturalWidth === 0 || image.naturalHeight === 0) { return 1; } const canvas = document.createElement('canvas'); canvas.width = Math.min(image.naturalWidth, 256); canvas.height = Math.min(image.naturalHeight, 256); const context = canvas.getContext('2d'); context.drawImage(image, 0, 0, canvas.width, canvas.height); const data = context.getImageData(0, 0, canvas.width, canvas.height).data; const first = [data[0], data[1], data[2], data[3]].join(); let varied = false; for (let i = 4; i < data.length && !varied; i += 4) { varied = [data[i], data[i + 1], data[i + 2], data[i + 3]].join() !== first; } return varied ? 0 : 1; })); return blank.reduce((sum, value) => sum + value, 0); })()";

export const DOCS_TOKEN_PLACEHOLDER = "<YOUR_ACCESS_TOKEN>";
export const CURL_JOIN = " \\\n  ";
export const SHELL_QUOTE = /'/g;
export const SHELL_QUOTE_ESCAPE = "'\\''";
export const JSONRPC_VERSION = "2.0";
export const JSONRPC_ID = 1;
export const DOCS_NOTICE_MARK = ":::caution";
export const DOCS_NOTICE_PATTERN = /^:::caution\n[\s\S]*?\n:::\n\n/m;
export const FRONT_MATTER_END = /^---\n[\s\S]*?\n---\n\n/;
export const TROUBLESHOOTING_PAGES: readonly string[] = [
  "errors-access",
  "errors-input",
  "errors-state",
  "errors-server",
];

export enum ExpositionMetric {
  ResidentMemory = "platform_process_resident_memory_bytes",
  HeapTotal = "platform_process_heap_total_bytes",
  HeapUsed = "platform_process_heap_used_bytes",
  External = "platform_process_external_memory_bytes",
  CpuUser = "platform_process_cpu_user_seconds_total",
  CpuSystem = "platform_process_cpu_system_seconds_total",
  EventLoopDelayMax = "platform_process_event_loop_delay_max_seconds",
  Uptime = "platform_process_uptime_seconds",
  InFlight = "platform_http_requests_in_flight",
  StageCount = "platform_http_stage_count_total",
  StageSum = "platform_http_stage_seconds_total",
  StageMax = "platform_http_stage_max_seconds",
  CapabilityCalls = "platform_capability_calls_total",
  CapabilityErrors = "platform_capability_errors_total",
  CapabilitySum = "platform_capability_latency_seconds_total",
  OperationCount = "platform_http_operation_count_total",
  OperationSum = "platform_http_operation_seconds_total",
  OperationMax = "platform_http_operation_max_seconds",
  OperationBytes = "platform_http_operation_bytes_total",
  OperationErrors = "platform_http_operation_errors_total",
  FirstByteSum = "platform_http_operation_first_byte_seconds_total",
  FirstByteMax = "platform_http_operation_first_byte_max_seconds",
  OpenStreams = "platform_http_open_streams",
  RunningOperations = "platform_operations_running",
  HeapCollections = "platform_process_heap_collections_inferred_total",
  HeapFreed = "platform_process_heap_freed_bytes_total",
  ResidentMemoryStart = "platform_process_resident_memory_start_bytes",
}

export const HEAP_SAMPLE_INTERVAL_MS = 50;
export const DIAGNOSIS_SLOWEST_COUNT = 5;
export const DIAGNOSIS_FILE = "diagnosis.md";
export const DIAGNOSIS_DIGITS = 2;

export enum ExpositionType {
  Gauge = "gauge",
  Counter = "counter",
}

export const EXPOSITION_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8";
export const MICROSECONDS_PER_SECOND = 1_000_000;
export const EXPOSITION_NEWLINE = "\n";
export const EXPOSITION_CAPABILITY_LABEL = "capability";
export const EXPOSITION_QUOTE = '"';
export const EXPOSITION_ESCAPED_QUOTE = '\\"';
export const EXPOSITION_BACKSLASH = "\\";
export const EXPOSITION_ESCAPED_BACKSLASH = "\\\\";
export const EXPOSITION_SPACE = " ";
export const EXPOSITION_TYPE_PREFIX = "# TYPE";
export const EXPOSITION_LABEL_OPEN = "{";
export const EXPOSITION_LABEL_CLOSE = "}";
export const EXPOSITION_EQUALS = "=";
export const EXPOSITION_STAGE_LABEL = "stage";
export const OPERATION_KEY_SEPARATOR = "|";
export const EXPOSITION_FORM_LABEL = "form";
export const EXPOSITION_VERSION_LABEL = "http_version";
export const OPERATION_ERROR_STATUS_FLOOR = 400;
export const EXPOSITION_LIST = ",";
export const OPERATION_BUCKETS_MS: readonly number[] = [
  1, 2, 5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000,
];
export const RUNTIME_REGISTRY = "platform.runtime.registry";
export const METRICS_REPORT_DIR_ENV = "METRICS_REPORT_DIR";
export const METRICS_ROOT_DIR = ".stack/metrics";
export const METRICS_REPORT_FILE = "metrics-report.json";
export const METRICS_PRELOAD_FILE = "testing/packages/framework/src/metrics-preload.ts";
export const PRELOAD_FLAG = "--preload";
export const METRIC_BUDGET_OPERATION_P95_MS = 250;
export const METRIC_BUDGET_EVENT_LOOP_DELAY_MS = 1000;
export const METRIC_BUDGET_HEAP_USED_BYTES = 1_500_000_000;
export const PERCENTILE_95 = 0.95;

export enum MetricsSubject {
  Report = "the report of the API",
  Operation = "any measured operation",
  Memory = "the process memory",
  OperationP95 = "the 95th percentile in ms of",
  EventLoop = "the event loop delay in ms",
  Heap = "the heap in use in bytes",
}
export const COVERAGE_METRICS_LABEL = "coverage";
export const METRIC_BUDGET_LONG_RUNNING_P95_MS = 5000;
export const LONG_RUNNING_OPERATIONS: readonly string[] = ["operations.wait"];

export const JUNIT_FLAG = "--reporter=junit";
export const JUNIT_OUTFILE_FLAG = "--reporter-outfile=";
export const JUNIT_FILE = "junit.xml";
export const SLOWEST_TESTS_COUNT = 10;
export const SLOWEST_TESTS_FILE = "slowest-tests.json";
export const VERIFY_REPORT_DIR = ".stack/verify";
export const VERIFY_STEPS_FILE = "steps.json";
export const JUNIT_TESTCASE_PATTERN =
  /<testcase name="([^"]*)" classname="[^"]*" time="([0-9.]+)" file="([^"]*)"/g;

export const PERFORMANCE_PAGE = "e2e/performance.md";
export const PERFORMANCE_FRONT = [
  "---",
  "title: Performance report",
  "description: How fast and how heavy the API was in the last end-to-end run, and how fast it is through the proxy.",
  "generated: true",
  "---",
];
export const PERFORMANCE_INTRO =
  "This page is generated by the end-to-end run. The run reads the metrics of the API it exercised. A failing run publishes no report.";
export const PERFORMANCE_OPERATIONS_HEAD = "## Operations in the run";
export const PERFORMANCE_PROCESS_HEAD = "## The process";
export const PERFORMANCE_SLOW_TESTS_HEAD = "## The slowest tests";
export const PERFORMANCE_SLOW_STEPS_HEAD = "## The slowest verification steps";
export const PERFORMANCE_BENCH_HEAD = "## The benchmark through the proxy and directly";
export const PERFORMANCE_USAGE_HEAD = "## Memory and processor of each container";
export const PERFORMANCE_OPERATIONS_COLUMNS: readonly string[] = [
  "operation",
  "form",
  "HTTP version",
  "requests",
  "requests per second",
  "first byte p95 ms",
  "total p95 ms",
  "errors",
  "bytes",
];
export const PERFORMANCE_PROCESS_COLUMNS: readonly string[] = [
  "resident memory bytes",
  "growth above the start bytes",
  "heap in use bytes",
  "event loop delay max ms",
  "collections inferred",
  "forced full collection ms",
];
export const PERFORMANCE_SLOW_COLUMNS: readonly string[] = ["seconds", "name", "file"];
export const PERFORMANCE_STEP_COLUMNS: readonly string[] = ["seconds", "step"];
export const PERFORMANCE_USAGE_COLUMNS: readonly string[] = [
  "container",
  "processor",
  "memory",
  "network",
  "processes",
];
export const PERFORMANCE_BENCH_FILE = "7.4-benchmark.json";

export const TABLE_CELL_JOIN = " | ";
export const TABLE_ROW_OPEN = "| ";
export const TABLE_ROW_CLOSE = " |";
export const TABLE_RULE = "---";
export const TABLE_RANGE = " to ";
export const BENCH_TABLE_COLUMNS: readonly string[] = [
  "operation",
  "leg",
  "parallel",
  "requests per second",
  "p50 ms",
  "p95 ms",
  "p99 ms",
  "first byte p95 ms",
  "p95 range ms",
  "failures",
];

export const PROTOCOL_REPORT_ENV = "PLATFORM_PROTOCOL_REPORT";
export const PROTOCOL_REPORT_DIR = ".stack/e2e";
export const PROTOCOL_REPORT_FILE = "protocols.jsonl";
export const PROTOCOLS_PAGE = "e2e/protocols.md";
export const PROTOCOLS_FRONT = [
  "---",
  "title: Protocols through the proxy",
  "description: Every step of the end-to-end run that sends requests to the API through the proxy over HTTP/1.1, HTTP/2 and HTTP/3, and tries to reach the API directly.",
  "generated: true",
  "---",
];
export const PROTOCOLS_INTRO =
  "This page is generated by the end-to-end run. Each step below ran against the test stack. A failing step publishes no page.";
export const PROTOCOLS_COLUMNS: readonly string[] = [
  "step",
  "result",
  "HTTP version",
  "description",
  "what it checked",
];
export const PROTOCOL_PASSED = "passed";
export const PROTOCOL_FAILED = "failed";
export const CONTAINERS_FILE = "containers.json";
export const PERFORMANCE_E2E_USAGE_HEAD =
  "## Memory and processor of the containers in the end-to-end run";

export const SDK_PROTOCOL_RECORD_PATH = ".stack/e2e/sdk-protocols.json";
export const SDK_PROTOCOL_DOC_PATH = "sdk-usage/streamed-responses.mdx";
export const HTTP_API_RECORD_PATH = ".stack/e2e/http-api.json";
export const HTTP_API_DOC_PATH = "api-calls/http-api-lifecycle.mdx";

export const MCP_HARNESS_MODE = "scripted";
export const MARKDOWN_INLINE_CODE_MARK = "`";

export const SIGNED_DOWNLOAD_QUERY = "X-Amz-Signature=";
export const SIGNED_DOWNLOAD_PLACE = "$DOWNLOAD_URL";
export const DOCS_PAGE_TOKEN = "PAGE_TOKEN";
export const DOCS_PAGE_TOKEN_KEY = "pageToken";
export const SIGNED_DOWNLOAD_URL_PATTERN = /https?:\/\/[^"\\\s]+[?&]X-Amz-[^"\\\s]+/g;
export const URL_QUERY_SEPARATOR = "?";

export const DOCS_HIGHLIGHT_MAX_CHARACTERS = 4096;
export const MARKDOWN_JSON_FENCE = "```json";
export const MARKDOWN_TEXT_FENCE = "```text";

export const GUIDE_RAW_DIRECTORY = ".stack/e2e/raw-guides";
export const GUIDE_MEASUREMENT = "<measured value>";
export const GUIDE_PROGRESS_SAMPLE = "<progress sample>";
export const GUIDE_PROGRESS_KEY = "progress";
export const GUIDE_PARAMS_KEY = "params";
export const GUIDE_STATS_NAME = "stats";
export const GUIDE_CHUNKS_KEY = "chunks";
export const GUIDE_JSON_BLOCK = /(```json\n)([\s\S]*?)(\n```)/g;
export const GUIDE_JSON_START = /^[\s]*[[{]/;
export const GUIDE_METRIC_LINE =
  /^(platform_[^\n]*?)[ \t]+[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/gm;

export const GUIDE_NUMBER_TYPE = "number";
export const GUIDE_STRING_TYPE = "string";
export const GUIDE_NAME_KEY = "name";
export const GUIDE_FIRST_GROUP = "$1";
