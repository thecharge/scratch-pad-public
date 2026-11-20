import { describe, expect, test } from "bun:test";
import { LogLevel, SensitivePath } from "@platform/constants";
import { createLogger } from "@platform/logger";

function capture() {
  const lines: string[] = [];
  return { lines, sink: { write: (line: string) => lines.push(line) } };
}

describe("logger", () => {
  test("writes one JSON object per line", async () => {
    const { lines, sink } = capture();
    (await createLogger({ level: LogLevel.Info, redact: [], sink })).info(
      { capability: "books.get" },
      "done",
    );
    expect(JSON.parse(lines[0] ?? "")).toMatchObject({ capability: "books.get", msg: "done" });
  });

  test("a redacted path never reaches the output, at the top level or one level down", async () => {
    const { lines, sink } = capture();
    const logger = await createLogger({
      level: LogLevel.Info,
      redact: [SensitivePath.Password, "authorEmail"],
      sink,
    });
    logger.info({ password: "hunter2", payload: { authorEmail: "a@example.com" } }, "x");
    expect(lines.join("")).not.toMatch(/hunter2|a@example\.com/);
  });

  test("records below the level are dropped", async () => {
    const { lines, sink } = capture();
    (await createLogger({ level: LogLevel.Warn, redact: [], sink })).info("quiet");
    expect(lines).toEqual([]);
  });
});
