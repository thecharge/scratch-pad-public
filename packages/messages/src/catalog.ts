import { MessageId } from "@platform/constants";

export const MESSAGES: Readonly<Record<MessageId, string>> = {
  [MessageId.DocumentRegistryInvalid]:
    "Document shipment requires the complete unchanged command registry",
  [MessageId.DocumentSnapshotChanged]: "Document shipment snapshot changed during verification",
  [MessageId.DocumentLinkInvalid]: "Invalid repository document link: {file} -> {target}",
  [MessageId.DocumentLinksOk]: "Repository document links are valid",
  [MessageId.SourceMissing]: "Missing or not reviewed source evidence: {file}",
  [MessageId.SourceChanged]: "Source status, bytes or quoted passage changed: {id}",
  [MessageId.SourceFetchFailed]: "Source fetch failed: {id}",
  [MessageId.SourceTableInvalid]: "Source table or document review differs: {file}",
  [MessageId.SourcesOk]: "All recorded sources and document reviews match fresh evidence",
  [MessageId.SourceTableRow]: "| {row} |",
  [MessageId.McpTasksRequired]: "This request requires the MCP Tasks extension capability.",
  [MessageId.AssetStoreUnavailable]: "Asset storage is not configured.",
  [MessageId.SummaryAssetsUpload]: "Upload an asset",
  [MessageId.SummaryAssetsGet]: "Get an asset download link",
  [MessageId.SummaryAssetsList]: "List your assets",
  [MessageId.AssetMediaType]: "The asset media type {mediaType} is not allowed.",
  [MessageId.AssetSizeLimit]: "The asset exceeds the {maxBytes} byte limit.",
  [MessageId.AssetChecksumMismatch]: "The asset SHA-256 checksum does not match its bytes.",
  [MessageId.AssetCleanupFailed]: "The failed asset upload could not be completely removed.",
  [MessageId.AuthNotEnabled]: "Authentication is not enabled on this server.",
  [MessageId.TokenMissing]: "A bearer token is required.",
  [MessageId.TokenInvalid]: "The bearer token is not valid.",
  [MessageId.TokenExpired]: "The bearer token has expired.",
  [MessageId.PolicyDenied]: "You are not allowed to call {capability}.",
  [MessageId.RateLimited]: "Too many requests. Retry in {seconds} seconds.",
  [MessageId.ValidationFailed]: "The request is not valid: {detail}.",
  [MessageId.UnknownField]: "The field {field} is not part of this request.",
  [MessageId.ResourceNotFound]: "The resource {name} was not found.",
  [MessageId.InternalError]: "An internal error occurred.",
  [MessageId.DuplicateCapability]: "A capability with id {id} is already registered.",
  [MessageId.MissingAuthMode]: "Capability {id} must declare an auth mode.",
  [MessageId.ConfigInvalid]: "The configuration is not valid: {variables}.",
  [MessageId.EmptyCapabilityId]: "A capability id must not be empty.",
  [MessageId.CustomVerbMismatch]:
    "Capability {id}: a custom verb is required for custom methods and forbidden for standard ones.",
  [MessageId.UnknownCapability]: "No capability with id {id} is registered.",
  [MessageId.MisconfiguredBlock]:
    "Capability {id} declares {block} but no implementation is configured.",
  [MessageId.InvalidFilter]: "The filter is not valid: {detail}.",
  [MessageId.InvalidOrderBy]: "The orderBy value is not valid: {detail}.",
  [MessageId.InvalidFieldMask]: "The field mask is not valid: {detail}.",
  [MessageId.InvalidPageToken]: "The page token is not valid for this request.",
  [MessageId.InvalidPageSize]: "The page size must not be negative.",
  [MessageId.InvalidResourceName]: "The resource name {name} does not match {pattern}.",
  [MessageId.InvalidResourceId]: "The id {id} is not valid.",
  [MessageId.BatchTooLarge]: "A batch may contain at most {max} items.",
  [MessageId.FieldImmutable]: "The field {field} cannot be changed after creation.",
  [MessageId.OperationNotFound]: "The operation {name} was not found.",
  [MessageId.RequiredFieldMissing]: "The field {field} is required.",
  [MessageId.EtagMismatch]: "The resource was modified; its etag no longer matches.",
  [MessageId.InvalidTransition]: "The resource cannot move from {from} to {to}.",
  [MessageId.AlreadyExists]: "The resource {name} already exists.",
  [MessageId.EmptyBatch]: "A batch must contain at least one item.",
  [MessageId.OperationsGetSummary]: "Get a long-running operation",
  [MessageId.OperationsGetDescription]: "Returns the current state of a long-running operation.",
  [MessageId.OperationsListSummary]: "List long-running operations",
  [MessageId.OperationsListDescription]:
    "Returns one page of long-running operations, newest first.",
  [MessageId.OperationsDeleteSummary]: "Delete a long-running operation",
  [MessageId.OperationsDeleteDescription]:
    "Removes the record of an operation. It does not cancel the operation.",
  [MessageId.OperationsCancelSummary]: "Cancel a long-running operation",
  [MessageId.OperationsCancelDescription]:
    "Asks the server to stop an operation. A cancelled operation is kept and carries the CANCELLED error.",
  [MessageId.OperationsWaitSummary]: "Wait for a long-running operation",
  [MessageId.OperationsWaitDescription]:
    "Returns the operation when it is done or when the timeout passes, whichever comes first.",
  [MessageId.OperationCancelled]: "The operation {name} was cancelled.",
  [MessageId.CheckStreamDone]: "The stream ended with the operation done",
  [MessageId.CheckStreamAck]: "The first message acknowledged the subscription",
  [MessageId.CheckStreamUpdate]: "An update of the operation followed",
  [MessageId.WatchSummary]: "Watch: {summary}",
  [MessageId.WatchDescription]:
    "Returns the states this resource goes through, for at most maxEvents events or timeoutMs milliseconds, whichever comes first. {summary}",
  [MessageId.WatchNeedsEvents]: "The capability {id} has no event source to watch.",
  [MessageId.OriginNotAllowed]: "Requests from the origin {origin} are not allowed.",
  [MessageId.ToolMissing]:
    'Required tool "{tool}" was not found. Run "bun install" and "bun run tools:install".',
  [MessageId.StepBanner]: "=== {step} ===",
  [MessageId.StepTimed]: "{seconds}s {step}",
  [MessageId.SummaryBanner]: "=== summary ===",
  [MessageId.ChecksFailed]: "FAILED: {steps}",
  [MessageId.ChecksPassed]: "All {count} checks passed.",
  [MessageId.VerificationPlanReport]:
    "Report-only verification plan: all {count} checks will execute; saved to {file}.",
  [MessageId.ToolPresent]: "{tool} already installed at {path}",
  [MessageId.ToolInstalled]: "Installed {tool} {version} to {path}",
  [MessageId.NoArchive]:
    "No pinned {tool} archive for {platform}. Install {tool} yourself and put it on PATH, then re-run.",
  [MessageId.DownloadFailed]: "Download failed: {status} {url}",
  [MessageId.ChecksumMismatch]: "Checksum mismatch for {file}: got {digest}",
  [MessageId.ExtractFailed]: "Extraction failed: {detail}",
  [MessageId.ScanUsage]: "Usage: secret-scan.ts <staged|repo|stdin>",
  [MessageId.MermaidFailure]: "FAIL {file} block #{index}: {detail}",
  [MessageId.MermaidSummary]: "{parsed}/{total} mermaid diagrams parsed",
  [MessageId.WorkflowPresent]: "{file}: GitHub workflows are disabled; verification runs locally",
  [MessageId.WorkflowsOk]: "workflows ok",
  [MessageId.WorkflowsProblems]: "{count} workflow problem(s)",
  [MessageId.StructureViolation]: "{file}:{line} [{rule}] {detail}",
  [MessageId.DataShapeNotSchema]:
    "{name} holds only data. Declare it as a Zod schema and export z.infer of it.",
  [MessageId.ApiCallNeedle]: "Call {id} to ",
  [MessageId.OperationTool]:
    "MCP tool: `{name}`. {description}\n\nInput schema of the tool:\n\n```json\n{schema}\n```\n\n",
  [MessageId.OperationNoTool]: "No MCP tool serves this operation.\n\n",
  [MessageId.OperationExamples]:
    "### Checked examples\n\nEach example below was run against the real server by a scenario. The flag is the result of that run.\n\n",
  [MessageId.OperationNoExamples]:
    "No scenario calls this operation. It is listed as not covered.\n\n",
  [MessageId.OperationExample]:
    "#### {description}\n\nFlag: **{flag}**\n\nOver HTTP: `{request}`\n\n{body}Response ({outcome}):\n\n```json\n{response}\n```\n\n{mcp}",
  [MessageId.OperationOverMcp]:
    "Over MCP: `{request}`\n\nResult ({outcome}):\n\n```json\n{response}\n```\n\n",
  [MessageId.OperationCoverage]:
    "### Coverage\n\n| Coverage by the scenarios | Items |\n| --- | --- |\n| Outcomes seen | {seen} |\n| Statuses not covered | {statuses} |\n| Error reasons not covered | {reasons} |\n\n",
  [MessageId.FactualUrlMissing]:
    "The documentation shows the public address of every surface. Set {surfaces} in packages/config/factual-urls.json to a full address.",
  [MessageId.UrlLiteral]:
    "{file}:{line} holds the address literal {literal}. Addresses and hosts live in packages/config.",
  [MessageId.UrlLiteralsOk]: "no address literal is outside packages/config",
  [MessageId.InfraComment]: "{file}:{line}: infrastructure files hold no comments",
  [MessageId.InfraLiteral]:
    '{file}:{line}: "{literal}" belongs in packages/config and arrives as a build argument',
  [MessageId.InfraUnpinned]:
    '{file}:{line}: image "{image}" must be pinned by digest (@sha256:...)',
  [MessageId.PodmanMissing]:
    "Podman is not installed or is not on the PATH. Install it with: {command}",
  [MessageId.InfraFilesOk]: "infrastructure files: no comment, no literal, every image pinned",
  [MessageId.OperationNotExercised]:
    "Operation {id} is in the OpenAPI document but no generated page shows a call to it",
  [MessageId.ReasonNotShown]:
    "Error reason {reason} is documented by the OpenAPI document but no generated page shows it",
  [MessageId.ErrorCasesOk]:
    "{operations} operations and {reasons} error reasons are all shown in generated pages",
  [MessageId.OperationWithoutTool]:
    "Operation {id} is served over HTTP but the MCP server has no tool of that name",
  [MessageId.ToolWithoutOperation]:
    "MCP tool {id} is served but the OpenAPI document has no operation of that name",
  [MessageId.OnlyInterfaceLeak]:
    "Capability {id} is declared for one interface only but the other one serves it",
  [MessageId.InterfacesOk]:
    "{count} capabilities are served by both the OpenAPI operation and the MCP tool, {only} by one interface only",
  [MessageId.SchemasOk]: "every data shape in packages/types is a Zod schema",
  [MessageId.StructureSummary]: "{count} structure violation(s)",
  [MessageId.StructureOk]: "structure ok",
  [MessageId.RuleJobMissing]: 'Rule {rule} is backed by job "{job}", which is missing from {where}',
  [MessageId.SpecPurposeInvalid]:
    "Purpose must be present, non-empty and contain no TBD placeholder",
  [MessageId.SpecTargetMissing]: 'Requirement "{name}" does not exist in the main spec',
  [MessageId.SpecTargetExists]: 'Requirement "{name}" already exists in the main spec',
  [MessageId.SpecsOk]: "OpenSpec purposes and active delta targets are valid",
  [MessageId.RulesOk]: "all {count} development rules are enforced by blocking jobs",
  [MessageId.ReadmeMissing]: "Package {package} has no README.md",
  [MessageId.ReadmesOk]: "all {count} packages have a README",
  [MessageId.NestingTooDeep]: "Nesting is {depth} levels deep; the maximum is {max}.",
  [MessageId.ObjectNestingTooDeep]: "Object nesting is {depth} levels deep; the maximum is {max}.",
  [MessageId.TestControlFlow]:
    "Tests must be flat: no {construct} in a test file. Use test.each for several inputs.",
  [MessageId.CommentNotAllowed]:
    "Comments are not allowed. Make the code say it, or configure an ignore in the tool configuration.",
  [MessageId.SyncApiUsed]: "{name} is synchronous. Use the asynchronous API.",
  [MessageId.EagerCollection]:
    "A {name} created at module, class or constructor level lives for the whole process. Use the bounded store from @platform/store, or build it inside the function that needs it.",
  [MessageId.EagerInvocation]:
    "{name}() runs when the module loads. Wrap it in a function and call it when needed.",
  [MessageId.HeavyImport]: "{name} is heavy. Load it with a dynamic import() where it is used.",
  [MessageId.StructureWarnings]: "{count} lazy-loading warning(s)",
  [MessageId.InvalidJsonBody]: "the request body is not valid JSON",
  [MessageId.UnknownVerb]: "No method named {verb} exists at {path}.",
  [MessageId.MethodNotAllowed]: "{method} is not allowed at {path}.",
  [MessageId.AcceptRequired]: "The {header} header is required. Send {header}: {offered}.",
  [MessageId.AcceptUnsupported]:
    "The {header} header {received} offers nothing this operation answers. It answers {offered}.",
  [MessageId.ContentTypeRequired]:
    "The {header} header is required when a request has a body. Send {header}: {offered}.",
  [MessageId.ContentTypeUnsupported]:
    "The {header} header {received} is not supported. Send one of {offered}.",
  [MessageId.OpenApiHeadersDescription]:
    "Every request sends Accept naming application/json (and text/event-stream on an operation that can be followed) and, when it has a body, Content-Type naming application/json (and application/x-ndjson on an operation that takes a collection). A request that lacks them is refused before the operation runs: ACCEPT_REQUIRED and CONTENT_TYPE_REQUIRED answer 400, ACCEPT_UNSUPPORTED answers 406 and CONTENT_TYPE_UNSUPPORTED answers 415. OpenAPI ignores Accept and Content-Type as header parameters, so the media types of the request body and of each response say what is accepted.",
  [MessageId.ProxyRequired]:
    "The request did not come through the proxy. The {header} header is missing or wrong.",
  [MessageId.RouteNotFound]: "Nothing is served at {path}.",
  [MessageId.HttpHandlerMissing]: "Capability {id} cannot be served over HTTP.",
  [MessageId.HttpMethodForStandard]:
    "Capability {id}: an HTTP method may be chosen only for custom methods.",
  [MessageId.OpenApiBaselineMissing]:
    "No OpenAPI baseline at {path}. Run the update command to create it.",
  [MessageId.OpenApiUpdated]: "OpenAPI baseline written to {path}",
  [MessageId.OpenApiCompatible]: "OpenAPI document is compatible with the baseline",
  [MessageId.OpenApiUsage]: "Usage: openapi-check.ts <check|update>",
  [MessageId.SkillFrontmatter]: "---\nname: {name}\ndescription: {description}\n---\n",
  [MessageId.SkillDescription]:
    "Operations on {name} ({count} capabilities, called as tools or over HTTP).",
  [MessageId.SkillHeading]:
    "# {name}\n\nUse the tools below. Each links to its full reference.\n\n",
  [MessageId.SkillCapabilityLine]: "- **{id}**: {summary} ([reference](references/{id}.md))\n",
  [MessageId.SkillReference]:
    "# {id}\n\n{description}\n\nAuthentication: {auth}\n\n## Input\n\n```json\n{input}\n```\n\n## Output\n\n```json\n{output}\n```\n",
  [MessageId.SkillsWritten]: "{count} skill file(s) written to {path}",
  [MessageId.SkillLimitExceeded]:
    "Skill {name} exceeds the limit of {resources} resources or {bytes} bytes.",
  [MessageId.SummaryGet]: "Get a book",
  [MessageId.SummaryList]: "List the books of a publisher",
  [MessageId.SummaryCreate]: "Create a book",
  [MessageId.SummaryUpdate]: "Update a book",
  [MessageId.SummaryDelete]: "Delete a book (soft delete)",
  [MessageId.SummaryArchive]: "Archive a book",
  [MessageId.SummaryCount]: "Count the books of a publisher",
  [MessageId.SummarySuggest]: "Suggest a book from a publisher",
  [MessageId.CapabilityDisabled]: "The capability {id} is switched off.",
  [MessageId.SummaryUndelete]: "Restore a deleted book",
  [MessageId.SummaryBatchGet]: "Get several books at once",
  [MessageId.SummaryReindex]: "Reindex the books of a publisher",
  [MessageId.SummaryPublisherDelete]: "Delete a publisher and, with force, its books",
  [MessageId.SummaryBatchCreate]: "Create several books atomically",
  [MessageId.PublisherHasChildren]:
    "{name} still has {count} book(s). Retry with force=true to delete them too.",
  [MessageId.SummaryConfigGet]: "Get the public configuration",
  [MessageId.SummaryConfigUpdate]: "Update the configuration",
  [MessageId.CapabilityDescription]: "{summary}. Part of the {resource} resource.",
  [MessageId.MigrationsDrift]:
    "The database schema has changes that no migration covers. Run drizzle-kit generate in packages/db and commit the SQL.",
  [MessageId.MigrationsInSync]: "database migrations match the schema",
  [MessageId.LogRequest]: "request completed",
  [MessageId.LogListening]: "listening on port {port}",
  [MessageId.LogStopping]: "shutting down",
  [MessageId.LogStopped]: "stopped",
  [MessageId.SummaryStatsGet]: "Get request statistics",
  [MessageId.SummaryLogsList]: "List recent request events, newest first",
  [MessageId.SummaryEventsGet]: "Get the recent request events, or follow them as they happen",
  [MessageId.KbPage]:
    "---\ntitle: {title}\ndescription: {intent}\ngenerated: true\n---\n\n## Goal\n\n{intro}\n\n{summary}\n\n## Before you start\n\n{prerequisites}\n## Steps\n\n{sections}## If something goes wrong\n\n{troubleshooting}\n",
  [MessageId.OpenApiTitle]: "OpenAPI {version}",
  [MessageId.OpenApiDescription]:
    "Every operation of the API version {version}, from the OpenAPI document.",
  [MessageId.OpenApiIntro]:
    "This page lists every operation of the version {version}. Its stability is {stability}. It is generated from the OpenAPI document.",
  [MessageId.OpenApiNone]: "This version has no operation yet.",
  [MessageId.OpenApiOperationDoc]:
    "## {method} {path}\n\nOperation id: `{id}`. Stability: {stability}. Authentication: {auth}.\n\n{summary}.\n\nParameters: {parameters}.\n\n{cases}",
  [MessageId.OpenApiCases]: "Error cases shown in the troubleshooting pages: {reasons}.\n\n",
  [MessageId.VersionsTitle]: "API versions",
  [MessageId.VersionsDescription]:
    "The versions of the API, how stable each one is, and what each one holds.",
  [MessageId.VersionsEdge]: '  V{v}["{version}, {stability}"] --> O{v}x{o}["{id}"]\n',
  [MessageId.VersionsDiagram]: "```mermaid\nflowchart LR\n{edges}```",
  [MessageId.VersionsIntro]:
    "The API names its version in the path, as AIP-185 asks. A stable version changes only in ways that do not break clients. A beta version may still change. An alpha version may change or go away without notice.",
  [MessageId.VersionsRow]:
    "## {version}\n\nStability: {stability}. Path prefix: `/{version}/`. Reference: [OpenAPI {version}](/openapi/{version}/).\n\nCapabilities: {ids}.\n\n",
  [MessageId.SdkRefTitle]: "SDK reference",
  [MessageId.SdkRefDescription]: "Every function of the SDK, one for each API operation.",
  [MessageId.SdkRefIntro]:
    "The SDK has one function for each operation of the OpenAPI document. The names below are read from the built SDK package. A name that the package does not export fails the build of this page.",
  [MessageId.SdkRefOperation]:
    "## {name}\n\nCalls {method} {path}. Operation id: `{id}`. Version: {version}.\n\n",
  [MessageId.SdkRefMissing]: "The SDK does not export {name} for the operation {id}.",
  [MessageId.FlagsTitle]: "Feature flags",
  [MessageId.FlagsDescription]: "Each feature flag, its default and what it switches.",
  [MessageId.FlagsIntro]:
    "Feature flags are read through OpenFeature. A flag set in the FEATURE_FLAGS setting turns a capability on or off without a code change. Each flag below has a page of generated steps that show both states.",
  [MessageId.FlagsRow]:
    "## {key}\n\nDefault: {state}. The capability {capability} is served only while the flag is on. While the flag is off, the API answers 404 with the reason CAPABILITY_DISABLED.\n\nSteps for both states: [{title}](/api-handling/{scenario}/).\n\n",
  [MessageId.WordNone]: "none",
  [MessageId.ParameterItem]: "{name} ({place})",
  [MessageId.WordBearer]: "bearer token",
  [MessageId.WordOn]: "on",
  [MessageId.WordOff]: "off",
  [MessageId.PageSummary]: "Category: {category}. This page has {count} step(s). {passed} passed.",
  [MessageId.CategoryUi]: "UI",
  [MessageId.CategoryApiCalls]: "API calls",
  [MessageId.CategoryApiHandling]: "API handling",
  [MessageId.CategoryTroubleshooting]: "Troubleshooting",
  [MessageId.CategoryGeneral]: "General",
  [MessageId.CategoryOpenApi]: "OpenAPI",
  [MessageId.CategorySdkUsage]: "SDK usage",
  [MessageId.KbScenarioFailed]:
    "Scenario {id} failed over {transport} at step {step}: {reason}. Expected {expected}, got {actual}.",
  [MessageId.StepHeading]: "### {source}: {description}\n\n",
  [MessageId.StepFlagLine]: "Flag: **{flag}**\n\n",
  [MessageId.StepFlagPassed]: "PASSED",
  [MessageId.StepFlagFailed]: "FAILED",
  [MessageId.StepChecks]: "Checks:\n\n{items}\n",
  [MessageId.StepCheckItem]: "- {flag}: {label}\n",
  [MessageId.StepScreenshot]: "![{description}]({url})\n\n",
  [MessageId.StepExpected]: "Expected outcome: {expected}\n\nActual outcome: {actual}\n\n",
  [MessageId.StepRequestHttp]: "Request:\n\n```http\n{request}\n```\n\n",
  [MessageId.StepRequestMcp]: "Tool call:\n\n```text\n{request}\n```\n\n",
  [MessageId.StepTruncated]:
    "This body is truncated for the page. The call really sent {count} items and the page shows the first {shown}.\n\n",
  [MessageId.StepUrl]: "URL: `{url}`\n\n",
  [MessageId.StepCurl]: "Command:\n\n```bash\n{command}\n```\n\n",
  [MessageId.CurlStart]: "curl --request {method} '{url}'",
  [MessageId.CurlHeader]: "--header '{name}: {value}'",
  [MessageId.CurlData]: "--data '{body}'",
  [MessageId.CurlRawData]: "--data-raw '{body}'",
  [MessageId.CurlBinaryData]: "--data-binary '@{file}'",
  [MessageId.McpEndpoint]: "Endpoint: `{url}`\n\n",
  [MessageId.McpAuthHeader]: "Header: `authorization: Bearer {token}`\n\n",
  [MessageId.McpRpc]: "JSON-RPC request:\n\n```json\n{request}\n```\n\n",
  [MessageId.RequirementAddress]: "- The {surface} address is `{url}`.\n",
  [MessageId.RequirementToken]:
    "- A bearer access token with the scopes {scopes}. The commands show `{placeholder}` where your token goes.\n",
  [MessageId.RequirementNone]: "- No setup is needed.\n",
  [MessageId.TroubleshootingLinks]:
    "If a step fails, read the [access errors](/troubleshooting/errors-access/), the [input errors](/troubleshooting/errors-input/), the [state errors](/troubleshooting/errors-state/) and the [server errors](/troubleshooting/errors-server/).",
  [MessageId.UrlNotice]:
    ":::caution\nThe public address of the {surfaces} is not set yet. This page shows the local addresses. Set the address in packages/config/factual-urls.json.\n:::\n\n",
  [MessageId.StartTitle]: "Getting started",
  [MessageId.StartDescription]:
    "The addresses every example uses, where they come from and how to authenticate.",
  [MessageId.StartBody]:
    "Every example in this documentation uses the addresses below. Replace `{placeholder}` in a command with an access token that has the scopes the page lists.\n\n| Surface | Address | Source |\n| --- | --- | --- |\n{rows}\nTo set a public address, edit packages/config/factual-urls.json and build the documentation again.",
  [MessageId.StartRow]: "| {surface} | `{url}` | {source} |\n",
  [MessageId.StartSet]: "configured public address",
  [MessageId.StartLocal]: "local address, the public address is not set",
  [MessageId.VagueStep]: '{page}: the step "{step}" has no concrete {missing}',
  [MessageId.ConcreteOk]: "every generated step names a full address",
  [MessageId.StepBody]: "Body:\n\n```json\n{body}\n```\n\n",
  [MessageId.StepResponseHttp]: "Response ({outcome}):\n\n```json\n{response}\n```\n\n",
  [MessageId.StepResponseStream]:
    "Response ({outcome}), an event stream:\n\n```text\n{response}\n```\n\n",
  [MessageId.StepResponseBinary]:
    "Response ({outcome}), binary stream bytes:\n\n```text\n{response}\n```\n\n",
  [MessageId.StepResponseMcp]: "Result ({outcome}):\n\n```json\n{response}\n```\n\n",
  [MessageId.StepWhere]: "Where: {place}\n\n",
  [MessageId.StepAction]: "Action: {action}\n\n",
  [MessageId.StepExpectation]: "Expected result: {expectation}\n\n",
  [MessageId.ApiAction]: "Call {id} to {summary}. Token scopes: {scopes}.",
  [MessageId.ApiNoToken]: "no token",
  [MessageId.ApiExpectSuccess]: "The call succeeds.",
  [MessageId.ApiExpectError]: "The call fails.",
  [MessageId.ApiExpectReason]: "The call fails with the reason {reason}.",
  [MessageId.ApiExpectSuccessReason]:
    "The call succeeds and the result carries the reason {reason}.",
  [MessageId.CheckReason]: "The error reason is {reason}",
  [MessageId.CheckResultText]: "The result says: {reason}",
  [MessageId.SourceConsole]: "CONSOLE",
  [MessageId.SourceHttp]: "HTTP",
  [MessageId.SourceMcp]: "MCP",
  [MessageId.SourceSdk]: "SDK",
  [MessageId.StepRequestSdk]: "Call:\n\n```ts\n{request}\n```\n\n",
  [MessageId.StepResponseSdk]: "Result ({outcome}):\n\n```json\n{response}\n```\n\n",
  [MessageId.SdkCallText]: "await unwrap({call}({ {args} }))",
  [MessageId.SdkArgItem]: "{name}: {value}",
  [MessageId.SdkActionText]:
    "Call {call} from the installed package to {summary}. Token scopes: {scopes}.",
  [MessageId.SdkInstallDescription]: "Install the built package into an empty project",
  [MessageId.SdkInstallPlace]: "An empty project folder with its own package.json",
  [MessageId.SdkInstallAction]:
    "Install the tarball that bun pm pack made, then import the package",
  [MessageId.SdkInstallExpectation]:
    "The package loads from the dist folder inside node_modules, not from the workspace source.",
  [MessageId.SdkInstallCheck]: "The package resolves to {path}",
  [MessageId.SdkInstallFailed]: "Installing the packed SDK failed: {detail}",
  [MessageId.SdkConsumerFailed]: "The SDK consumer script failed: {detail}",
  [MessageId.SdkDocsBuilt]: "{count} SDK documentation page(s) recorded",
  [MessageId.CheckVisible]: 'Text expected visible: "{text}"',
  [MessageId.CheckHidden]: 'Text expected hidden: "{text}"',
  [MessageId.CheckForbiddenRequest]: "Request forbidden and not made: {fragment}",
  [MessageId.CheckTokenStorage]: "Token is not in browser storage",
  [MessageId.CheckNoPageError]: "The page raised no error",
  [MessageId.CheckOutcome]: "Outcome is {expected}",
  [MessageId.CheckStatus]: "The HTTP status is {status}",
  [MessageId.ConformanceListed]: "tools/list names the tool {id}",
  [MessageId.ConformanceInput]: "The tool {id} publishes the input schema of its definition",
  [MessageId.ConformanceOutput]: "The tool {id} publishes an output schema",
  [MessageId.ConformanceError]: "A call to {id} with a bad argument gives an error result",
  [MessageId.ConformanceVisibility]:
    "A caller without a token sees {id} only when policy allows it",
  [MessageId.CheckChallenge]:
    "The WWW-Authenticate header names the protected-resource metadata `{url}`",
  [MessageId.StepChallenge]: "Challenge header:\n\n```text\n{challenge}\n```\n\n",
  [MessageId.PlainOk]: "every documentation page follows the plain-language rules",
  [MessageId.PlainViolation]: "{page}: rule {rule} broken. {detail}",
  [MessageId.DocsNoGeneratedSource]:
    "{page} describes behavior but has no generated source. Generate it from scenario results or move it to docs/.",
  [MessageId.DocsScopeOk]: "no development page is on the documentation site",
  [MessageId.DocsScopeViolation]:
    "{page} is a development page. Development documents live in docs/, not on the site.",
  [MessageId.KbRecorded]: "{count} knowledge base page(s) recorded",
  [MessageId.KbSecretFound]: "A secret was found in the generated knowledge base pages.",
  [MessageId.ReferencePage]:
    "---\ntitle: {title}\ndescription: {description}\ngenerated: true\n---\n\n{body}",
  [MessageId.ReferenceOperation]:
    "### `{method} {path}`\n\n{summary}\n\nAuthentication: `{auth}`\n\n```json\n{schema}\n```\n\n",
  [MessageId.ReferenceTool]:
    "### {id}\n\n{description}\n\nAuthentication: {auth}\n\n```json\n{schema}\n```\n\n",
  [MessageId.ReferenceSkill]: "### {name}\n\n{count} capabilities: {ids}\n\n",
  [MessageId.DocsBuilt]: "documentation built",
  [MessageId.DocsStepFailed]: "Documentation step failed: {step}",
  [MessageId.DocsDistFailed]: "The documentation site could not be built before the browser check",
  [MessageId.UiConsoleTitle]: "Capability console",
  [MessageId.UiNavLive]: "Live requests",
  [MessageId.UiNavLogs]: "Request log",
  [MessageId.UiNavStats]: "Statistics",
  [MessageId.UiSignIn]: "Sign in",
  [MessageId.UiSignOut]: "Sign out",
  [MessageId.UiNoAdmin]:
    "This console needs the admin scope. Sign in with an administrator account.",
  [MessageId.UiColTime]: "Time",
  [MessageId.UiColCapability]: "Capability",
  [MessageId.UiColTransport]: "Transport",
  [MessageId.UiColStatus]: "Status",
  [MessageId.UiColLatency]: "Latency (ms)",
  [MessageId.UiColKind]: "Kind",
  [MessageId.UiFilterKind]: "Kind",
  [MessageId.UiFilterCapability]: "Capability",
  [MessageId.UiLiveWaiting]: "Waiting for requests…",
  [MessageId.UiDroppedEvents]: "{count} malformed event(s) dropped",
  [MessageId.UiStatTotal]: "Requests",
  [MessageId.UiStatErrors]: "Errors",
  [MessageId.UiStatCacheHits]: "Cache hits",
  [MessageId.UiStatChartTitle]: "Requests by capability",
  [MessageId.UiReadOnly]: "The console is read-only.",
  [MessageId.UiAllKinds]: "All kinds",
  [MessageId.SdkInSync]: "The generated SDK matches the OpenAPI document",
  [MessageId.SdkDrift]:
    "The generated SDK is out of date or was edited by hand. Run bun run sdk:generate and commit the result.",
  [MessageId.SdkGenerated]: "SDK generated into {path}",
  [MessageId.SdkBuilt]: "SDK built into {path}",
  [MessageId.SdkGenerationFailed]: "SDK generation failed: {detail}",
  [MessageId.UntrackedFile]: "Untracked file remains after verification: {file}",
  [MessageId.UntrackedReadFailed]: "Cannot inspect untracked files: {detail}",
  [MessageId.UntrackedOk]: "No untracked files remain.",
  [MessageId.AuditRetry]:
    "Audit transport failed on attempt {attempt}; retrying ({limit} attempts maximum).",
  [MessageId.LlmScenarioPassed]: "PASS {id}: {calls}",
  [MessageId.LlmScenarioFailed]: "FAIL {id}: {detail}",
  [MessageId.LlmEvidenceWritten]: "Evidence written to {path}",
  [MessageId.LlmDetailConnected]: "the MCP server did not connect",
  [MessageId.LlmDetailMissingCall]: "the model never called {tool}",
  [MessageId.LlmDetailForbiddenCall]: "the model called {tool}, which must not be available",
  [MessageId.LlmDetailAnswer]: "the final answer does not mention {text}",
  [MessageId.LlmDetailState]: "server state does not match what the model reported",
  [MessageId.UiColPrincipal]: "Principal",
  [MessageId.UiColOutcome]: "Outcome",
  [MessageId.UiColRequests]: "Requests",
  [MessageId.UiColErrors]: "Errors",
  [MessageId.UiColCacheHits]: "Cache hits",
  [MessageId.UiColAvgLatency]: "Avg latency (ms)",
  [MessageId.UiColRate]: "Rate (per min)",
  [MessageId.UiFilterStats]: "Filter capability",
  [MessageId.UiStatsTable]: "Per capability",
  [MessageId.RepoNotPrivate]: "{path} must set private to true",
  [MessageId.RepoLicenseField]: "{path} must not declare a license",
  [MessageId.RepoLicenseFile]: "{file} must not exist; only the SDK package is licensed",
  [MessageId.RepoSdkPrivate]: "{path} must not be private; the SDK is the publishable package",
  [MessageId.RepoSdkField]: "{path} must set {field}",
  [MessageId.RepoSdkLicenseField]: "{path} must declare the license {license}",
  [MessageId.RepoSdkLicenseFile]: "{file} must contain the Apache License 2.0",
  [MessageId.RepoSdkWorkspaceDependency]: "{path} depends on {name} through the workspace protocol",
  [MessageId.SdkLeak]: "The packed SDK file {file} imports {specifier}",
  [MessageId.SdkLeakOk]: "The packed SDK imports no workspace package or source file",
  [MessageId.SdkPackFailed]: "Packing the SDK failed: {detail}",
  [MessageId.RepoFileMissing]: "{file} is missing",
  [MessageId.RepoOk]: "repository checks ok",
  [MessageId.BrowserMissing]:
    "No Chrome or Chromium was found. Install one to run the browser end-to-end tests.",
  [MessageId.UiScenarioFailed]: "UI scenario {id} failed at step {step}: {detail}",
  [MessageId.UiDetailPageError]: "the page raised an error: {error}",
  [MessageId.DocsE2eReport]:
    "---\ntitle: End-to-end report\ndescription: What the browser tests found when they opened every page of this site.\ngenerated: true\n---\n\nThis page is generated by the end-to-end run. Every page of the site was opened in a real browser. It had to load without errors and show a heading. It had to load every image and show that no image is blank. It had to draw every Mermaid diagram as an SVG. The search was used to find a page. {count} pages passed.\n\n{rows}",
  [MessageId.DocsE2eRow]:
    "## {title}\n\n`{path}`: {diagrams} diagram(s) drawn, {images} image(s) loaded.\n\n![{title}]({shot})\n\n",
  [MessageId.DocsE2eFailed]: "Docs page {path} failed: {detail}",
  [MessageId.DocsE2eNoHeading]: "it has no heading",
  [MessageId.DocsE2eBlank]: "{count} image(s) are blank",
  [MessageId.DocsE2eImage]: "{count} image(s) did not load",
  [MessageId.DocsE2eDiagram]: "{drawn} of {expected} diagram(s) were drawn",
  [MessageId.DocsE2eError]: "the page raised {count} error(s): {first}",
  [MessageId.DocsE2eSearch]: "searching for {term} found nothing",
  [MessageId.TiersOk]:
    "every test is in a tier folder and no unit test opens a port, database or process",
  [MessageId.TierViolation]:
    "{file} is in the unit folder but opens a port, database or process ({pattern}). Move it to testing/integration or testing/e2e.",
  [MessageId.CoverageOk]: "{files} product files have 100% of lines and functions covered",
  [MessageId.MetricsOk]:
    "metrics: {operations} operation(s) in {files} report(s), every value inside its budget",
  [MessageId.MetricsMissing]: "metrics: {what} is missing, so the run measured nothing about it",
  [MessageId.MetricsOverBudget]: "metrics: {what} {detail} is {value} and the budget is {budget}",
  [MessageId.DiagnosisTitle]: "Diagnosis of the run: {operations} operations in {files} reports",
  [MessageId.DiagnosisSlowest]:
    "Slowest {rank}: {operation} first byte p95 {firstByte} ms, total p95 {total} ms, {rate} requests per second",
  [MessageId.DiagnosisMemory]:
    "Largest memory growth: {growth} bytes of resident memory above the start, heap in use {heap} bytes",
  [MessageId.DiagnosisGc]:
    "Garbage collection pressure: {collections} collections inferred from heap drops freed {freed} bytes, a forced full collection took {forced} ms",
  [MessageId.SlowTest]: "slow test {rank}: {seconds} s {name} ({file})",
  [MessageId.SlowStep]: "slow step {rank}: {seconds} s {step}",
  [MessageId.BenchNoRows]: "benchmark: there are no rows to combine",
  [MessageId.BenchFailed]:
    "benchmark: {operation} on {leg} with {parallel} in parallel had {failures} failed requests, by status {statuses}",
  [MessageId.BenchOverBudget]:
    "benchmark: {operation} on {leg} with {parallel} in parallel has a first byte p95 of {value} ms and the budget is {budget} ms",
  [MessageId.DiagnosisNone]: "Diagnosis of the run: no operation was measured",
  [MessageId.CoverageGap]:
    "{file}: {lines} uncovered line(s) [{lineList}], {functions} uncovered function(s)",
  [MessageId.CoverageTestsFailed]: "A test group failed, coverage is not trustworthy: {group}",
  [MessageId.CoverageReportOnly]:
    "coverage is report-only here; the step exits 0 whatever it lists",
  [MessageId.CoverageDebt]: "{debt} units still owe 2 positive and 2 negative cases",
  [MessageId.CoverageBranchesUnmeasured]:
    "bun test reports lines and functions only; branch coverage is not measured",
  [MessageId.TierMisplaced]: "{file} is not in testing/unit, testing/integration or testing/e2e.",
  [MessageId.TestingAreaOk]:
    "every test and testing helper is in testing/ and the packages are stacked",
  [MessageId.TestingOutsideArea]:
    "{file} is a test or testing helper outside testing/ ({detail}). Move it into the testing area.",
  [MessageId.TestingStackViolation]:
    "{file} depends on {detail}, which is not below it in the testing stack.",
  [MessageId.AsyncFunctionsOk]:
    "every function is asynchronous or listed in the ignore configuration",
  [MessageId.AsyncFunctionViolation]:
    "{file}:{line} function {name} is not asynchronous and is not in the ignore configuration",
  [MessageId.AsyncIgnoreStale]:
    "the ignore entry for {path} is larger than its synchronous functions; lower the maximum or remove the entry",
  [MessageId.PromiseAllOk]: "no Promise.all outside the ignore configuration",
  [MessageId.PromiseAllViolation]:
    "{file}:{line} Promise.all is not allowed; use all from @platform/util",
  [MessageId.PromiseAllIgnoreStale]:
    "the Promise.all ignore entry for {path} is larger than its uses; lower the maximum or remove the entry",
  [MessageId.PackageGraphOk]:
    "no dependency cycle between packages and the console bundle does not load the config loader or read the environment",
  [MessageId.PackageCycle]: "dependency cycle: {cycle}",
  [MessageId.BundleLeak]: "the console bundle contains {leak}",
  [MessageId.BundleFailed]: "the console bundle did not build from {entry}",
  [MessageId.AgentKnowledgeOk]:
    "the agent guides and the project skills are complete and consistent",
  [MessageId.AgentKnowledgeMissing]: "{file} is missing",
  [MessageId.AgentKnowledgeNoLink]: "{file} does not point to {target}",
  [MessageId.SkillMalformed]:
    "skill {skill} needs a SKILL.md whose name equals its folder and that has a description",
  [MessageId.SkillNotListed]: "skill {skill} is not listed in CLAUDE.md",
  [MessageId.SkillMapMismatch]:
    "skill {skill} and {map} do not agree: each project skill needs an entry and each entry a skill",
  [MessageId.SkillPathMissing]: "skill {skill} lists the path {path}, which does not exist",
  [MessageId.CommandMalformed]:
    "command {command} needs front matter with a name and a description and a Skill: line",
  [MessageId.CommandSkillMissing]:
    "command {command} names the skill {skill}, which does not exist",
  [MessageId.CommandNotListed]: "command /dev:{command} is not listed in CLAUDE.md",
  [MessageId.SelfUpdateSectionMissing]: "the skill {skill} has no section {section}",
  [MessageId.DevStatusChange]: "open change {name}: {done} of {total} tasks done",
  [MessageId.DevStatusNoChange]: "no open OpenSpec change",
  [MessageId.DevStatusUnitDebt]: "units still owing 2 positive and 2 negative cases: {count}",
  [MessageId.DevStatusCoverage]: "coverage mode: {mode}",
  [MessageId.DevStatusTests]:
    "test files: {unit} unit, {integration} integration, {e2e} end-to-end",
  [MessageId.DevStatusInventory]: "{skills} project skills, {commands} development commands",
  [MessageId.DevStatusGit]: "{behind} commits behind and {ahead} ahead of origin/main",
  [MessageId.DevStatusUnavailable]: "{source} is unavailable",
  [MessageId.SkillsFreshOk]: "no skill or command is stale",
  [MessageId.SkillStale]:
    "skill {skill} describes {files}, which changed without the skill or a command changing",
  [MessageId.UnitCasesOk]:
    "{count} units checked for {min} positive and {min} negative cases; {debt} still listed in testing/unit-debt.json",
  [MessageId.UnitCasesViolation]: "{unit} ({file}): {detail}",
  [MessageId.TierEmpty]: "No {tier} tests were found.",
  [MessageId.UiScenarioProcessFailed]:
    "The browser scenarios did not finish. Nothing was published.",
  [MessageId.DeadlineExceeded]: "{what} did not finish within {seconds} seconds and was stopped.",
  [MessageId.UiLockTimeout]:
    "Another browser recording held the lock for {seconds} seconds; this run gave up waiting.",
  [MessageId.E2eDocsWritten]: "Every end-to-end test passed; the documentation was written.",
  [MessageId.E2eDocsFailed]: "Every end-to-end test passed but the documentation build failed.",
  [MessageId.E2eDocsSkipped]: "An end-to-end test failed; no documentation was written.",
  [MessageId.SummarySkillsList]: "List the agent skills the caller may read",
  [MessageId.SummarySkillsGet]:
    "Get one agent skill with its files by its resource name, for example skills/working-with-books",
  [MessageId.SkillPackageProblem]: "{path}: {problem}",
  [MessageId.SkillPackageLimit]: "{path}: the skill exceeds {resources} files or {bytes} bytes",
  [MessageId.SkillPackageEncoding]: "{path}: the file is not valid UTF-8 text",
  [MessageId.SkillPackagePolicy]: "{path}: the metadata does not describe a valid access policy",
  [MessageId.SkillPackageEmpty]: "{path}: the skill directory holds no files",
  [MessageId.SkillPackagesOk]: "{count} package skill(s) comply with the skills format",
  [MessageId.StackStep]: "stack {environment}: {step}",
  [MessageId.StackStepFailed]: "stack {environment}: {step} failed with exit code {code}",
  [MessageId.WatchersReady]:
    "Development recursive watches can be allocated; console and docs use polling.",
  [MessageId.WatchersUnavailable]:
    "Cannot allocate development watches: {detail}. Close unused file watchers and check fs.inotify.max_user_watches and fs.inotify.max_user_instances before retrying. No system setting was changed.",
  [MessageId.StackReady]: "stack {environment}: the API answers behind the proxy",
  [MessageId.RunnerArguments]:
    "The container runner needs an absolute repository path without a colon and a command to execute.",
  [MessageId.StackNotReady]: "stack {environment}: the API did not answer after {attempts} tries",
  [MessageId.StackUsage]:
    "usage: cli.ts up|down|check|status|logs|reset development|test|production, or cli.ts tools|prune",
  [MessageId.StackPruned]:
    "stack prune: removed {containers} containers, {networks} networks and {images} images; freed {bytes} bytes",
  [MessageId.CaddyfileTemplate]:
    "{\n\tadmin off\n\tauto_https disable_redirects\n\tservers {\n\t\tprotocols h1 h2 h3\n\t}\n}\n\n{host}:{port} {\n{tls}\treverse_proxy {upstream} {\n\t\tflush_interval -1\n\t\theader_up {marker} {secret}\n\t\ttransport http {\n\t\t\tversions 1.1\n\t\t}\n\t}\n}\n",
  [MessageId.CaddyDevelopmentTemplate]:
    "\n{host}:{port} {\n{tls}\t@api path /v1/* /mcp /mcp/*\n\thandle @api {\n\t\treverse_proxy {api} {\n\t\t\tflush_interval -1\n\t\t\theader_up {marker} {secret}\n\t\t}\n\t}\n\thandle {\n\t\treverse_proxy {upstream}\n\t}\n}\n",
  [MessageId.StaticMissingIndex]: "Static site {site} has no built index document.",
  [MessageId.StaticCurlTransfer]:
    'silent\nshow-error\nfail-with-body\naws-sigv4 = "aws:amz:us-east-1:s3"\nuser = {credentials}\ncacert = {certificate}\nurl = {url}\nrequest = "PUT"\n{data}{header}',
  [MessageId.CaddyWebsiteTemplate]:
    "\n{host}:{port} {\n{tls}\t@api path /v1/* /mcp /mcp/* /api/auth /api/auth/* /.well-known/*\n\thandle @api {\n\t\treverse_proxy {api} {\n\t\t\tflush_interval -1\n\t\t\theader_up {marker} {secret}\n\t\t}\n\t}\n\thandle {\n\t\treverse_proxy {upstream} {\n\t\t\tflush_interval -1\n{fallback}\t\t}\n\t}\n}\n",
  [MessageId.CaddyWebsiteFallback]:
    "\t\t\t@missing status 404\n\t\t\thandle_response @missing {\n\t\t\t\trewrite * /index.html\n\t\t\t\treverse_proxy {upstream}\n\t\t\t}\n",
  [MessageId.CaddyObjectStoreTemplate]:
    "\n{host}:{port} {\n{tls}\treverse_proxy {upstream} {\n\t\tflush_interval -1\n\t}\n}\n",
  [MessageId.DexConfigTemplate]:
    'issuer: {issuer}\nstorage:\n  type: memory\nweb:\n  http: 0.0.0.0:{port}\noauth2:\n  passwordConnector: local\n  skipApprovalScreen: true\nenablePasswordDB: true\nstaticClients:\n  - id: {clientId}\n    name: {clientId}\n    secret: {clientSecret}\n    redirectURIs: ["{redirect}"]\nstaticPasswords:\n  - email: {email}\n    hash: "{hash}"\n    username: admin\n    userID: "{userId}"\n    groups: {groups}\n',
  [MessageId.SdkStreamEnded]: "The stream ended before the operation {name} was done.",
  [MessageId.GuideDisplayValues]:
    "These are recorded examples. Changing measurements and progress counters use labelled placeholders. Stream read boundaries are combined; progress shows representative first and last samples. Repeated working-task polls are shown once per task. Complete recordings and checks remain in internal evidence.",
  [MessageId.OpaqueRecordingValues]:
    "Page tokens and signed download URLs are placeholders. Read current values from preceding responses.",
  [MessageId.SignedDownloadRequest]: `DOWNLOAD_URL=$(curl --request GET '{metadata}' --header 'accept: application/json' --header 'authorization: Bearer <YOUR_ACCESS_TOKEN>' | jq -r '.downloadUrl')
curl --header 'accept: application/octet-stream' "$DOWNLOAD_URL"`,
  [MessageId.SignedDownloadMetadataRequired]:
    "A signed download step requires its preceding asset metadata request.",
  [MessageId.StreamIncomplete]: "The stream ended before the {what} was complete",
  [MessageId.StreamAborted]: "The stream was cut off: {detail}",
  [MessageId.StreamJsonInvalid]: "The body is not valid JSON: {detail}",
  [MessageId.StreamLineInvalid]: "Line {line} is not valid: {detail}",
  [MessageId.StreamFrameInvalid]: "Event frame {frame} is not valid: {detail}",
};
