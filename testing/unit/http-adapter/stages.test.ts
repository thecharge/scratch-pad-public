import { HttpStage } from "@platform/constants";
import { negative, positive, seen, unit } from "@platform/test-factories";
import type { StageRecorder } from "@platform/types";
import { timed } from "../../../packages/http-adapter/src/stages.ts";

const heard: [string, number][] = [];
const RECORDER: StageRecorder = {
  record: async (stage, elapsedMs) => {
    heard.push([stage, elapsedMs]);
  },
  operation: async () => undefined,
};
const answer = async () => 7;
const failing = async (): Promise<number> => {
  throw new Error("stage failed");
};
const heardFor = (stage: HttpStage) => () => heard.some(([name, ms]) => name === stage && ms >= 0);

unit(timed, {
  positive: [
    positive(
      "returns the result of the work without a recorder",
      [undefined, HttpStage.Route, answer],
      7,
    ),
    positive(
      "returns the result of the work with a recorder",
      [RECORDER, HttpStage.Input, answer],
      7,
    ),
    positive(
      "records the elapsed time under the stage",
      [RECORDER, HttpStage.Invoke, answer],
      seen(heardFor(HttpStage.Invoke), true),
    ),
    positive(
      "records the stage of a second run too",
      [RECORDER, HttpStage.Respond, answer],
      seen(heardFor(HttpStage.Respond), true),
    ),
  ],
  negative: [
    negative(
      "raises the error of the work without a recorder",
      [undefined, HttpStage.Route, failing],
      {
        message: "stage failed",
      },
    ),
    negative(
      "raises the error of the work with a recorder",
      [RECORDER, HttpStage.Negotiate, failing],
      {
        message: "stage failed",
      },
    ),
  ],
});
