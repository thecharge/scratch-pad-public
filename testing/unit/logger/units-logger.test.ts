import { expect } from "bun:test";
import { LogLevel, MASK_REPLACEMENT, SensitivePath } from "@platform/constants";
import { createLogger } from "@platform/logger";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";

function capture() {
  const lines: string[] = [];
  return { lines, sink: { write: (line: string) => lines.push(line) } };
}

function written(lines: string[], emit: () => void): unknown[] {
  emit();
  return lines.map((line) => JSON.parse(line));
}

const PLAIN = capture();
const NESTED = capture();
const QUIET = capture();
const SILENT = capture();

const MASKED_PAYLOAD = { authorEmail: MASK_REPLACEMENT };
const MASKED_LINE = expect.objectContaining({
  password: MASK_REPLACEMENT,
  payload: MASKED_PAYLOAD,
});

unit(createLogger, {
  positive: [
    positive(
      "writes one json object per line with the fields and the message",
      [{ level: LogLevel.Info, redact: [], sink: PLAIN.sink }],
      seen(
        (logger: Awaited<ReturnType<typeof createLogger>>) =>
          written(PLAIN.lines, () => logger.info({ capability: "books.get" }, "done")),
        [expect.objectContaining({ capability: "books.get", msg: "done" })],
      ),
    ),
    positive(
      "a redacted path is censored at the top level and one level down",
      [
        {
          level: LogLevel.Info,
          redact: [SensitivePath.Password, "authorEmail"],
          sink: NESTED.sink,
        },
      ],
      seen(
        (logger: Awaited<ReturnType<typeof createLogger>>) =>
          written(NESTED.lines, () =>
            logger.info({ password: "hunter2", payload: { authorEmail: "a@example.com" } }, "x"),
          ),
        [MASKED_LINE],
      ),
    ),
  ],
  negative: [
    rejected(
      "records below the level are dropped",
      [{ level: LogLevel.Warn, redact: [], sink: QUIET.sink }],
      seen(
        (logger: Awaited<ReturnType<typeof createLogger>>) =>
          written(QUIET.lines, () => logger.info("quiet")),
        [],
      ),
    ),
    rejected(
      "a field that is not redacted stays visible",
      [{ level: LogLevel.Info, redact: ["password"], sink: SILENT.sink }],
      seen(
        (logger: Awaited<ReturnType<typeof createLogger>>) =>
          written(SILENT.lines, () => logger.info({ note: "kept" }, "x")),
        [expect.objectContaining({ note: "kept" })],
      ),
    ),
    negative("a level pino does not know", [{ level: "loud", redact: [] }], {
      message: "default level:loud must be included in custom levels",
    }),
    negative("a redaction path that cannot be parsed", [{ level: LogLevel.Info, redact: ["a["] }], {
      message: "Invalid redaction path (a[)",
    }),
  ],
});
