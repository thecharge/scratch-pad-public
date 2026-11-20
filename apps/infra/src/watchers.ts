import { watch } from "node:fs";
import { join } from "node:path";
import { DEVELOPMENT_WATCH_ROOTS, MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import { REPO_ROOT } from "../../../tooling/scripts/tools.ts";

export async function checkWatchers(
  root: string = REPO_ROOT,
  open: typeof watch = watch,
): Promise<number> {
  const watchers: ReturnType<typeof watch>[] = [];
  try {
    for (const path of DEVELOPMENT_WATCH_ROOTS) {
      watchers.push(open(join(root, path), { recursive: true }));
    }
    console.log(message(MessageId.WatchersReady));
    return 0;
  } catch (error) {
    console.error(message(MessageId.WatchersUnavailable, { detail: String(error) }));
    return 1;
  } finally {
    for (const watcher of watchers) {
      watcher.close();
    }
  }
}
