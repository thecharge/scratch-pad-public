import { afterAll } from "bun:test";
import { positive, rejected, seen, unit } from "@platform/test-factories";
import { gitRepo, removeAll } from "@platform/test-scenarios";
import { checkInfraFiles, infraProblems } from "../../../tooling/scripts/check-infra-files.ts";

afterAll(removeAll);

const DIGEST = "@sha256:32f1fcccb1523960b254c4f80973bee1a910d60be000a45c20c9129a1efcffee";
const FILE = "apps/infra/containers/api/Containerfile";
const GOOD = `FROM docker.io/oven/bun:1${DIGEST} AS build\nARG PORT\nEXPOSE \${PORT}\nFROM build\nFROM scratch\n`;
const count = (problems: string[]) => problems.length;
const mentions = (text: string) => (problems: string[]) =>
  problems.filter((problem) => problem.includes(text)).length;

unit(infraProblems, {
  positive: [
    positive(
      "a pinned image, a build argument, a stage and scratch are clean",
      [FILE, GOOD],
      seen(count, 0),
    ),
    positive(
      "an unpinned image is not reported when images are not checked",
      [FILE, "FROM alpine:3\n", false],
      seen(count, 0),
    ),
  ],
  negative: [
    rejected(
      "a comment line is reported with its line number",
      [FILE, `FROM x${DIGEST}\n# note\n`],
      seen(mentions(`${FILE}:2`), 1),
    ),
    rejected(
      "an image without a digest is reported",
      [FILE, "FROM alpine:3\n"],
      seen(mentions("alpine:3"), 1),
    ),
    rejected(
      "an address is reported",
      [FILE, `FROM x${DIGEST}\nRUN curl https://example.test/a\n`],
      seen(mentions("https://example.test/a"), 1),
    ),
    rejected(
      "a port in EXPOSE is reported",
      [FILE, `FROM x${DIGEST}\nEXPOSE 3000\n`],
      seen(mentions("EXPOSE 3000"), 1),
    ),
    rejected(
      "a port in ENV is reported",
      [FILE, `FROM x${DIGEST}\nENV PORT=3000\n`],
      seen(mentions("ENV PORT=3000"), 1),
    ),
  ],
});

const CLEAN = await gitRepo({ [FILE]: GOOD }, false, false);
const EMPTY = await gitRepo({ "README.md": "x\n" }, false, false);
const COMMENTED = await gitRepo({ [FILE]: `${GOOD}# note\n` }, false, false);
const UNPINNED = await gitRepo({ [FILE]: "FROM alpine:3\n" }, false, false);
const LITERAL = await gitRepo({ [FILE]: `${GOOD}EXPOSE 3000\n` }, false, false);

unit(checkInfraFiles, {
  positive: [
    positive("a clean Containerfile passes", [CLEAN], 0),
    positive("a repository without Containerfiles passes", [EMPTY], 0),
  ],
  negative: [
    rejected("a comment fails", [COMMENTED], 1),
    rejected("an unpinned image fails", [UNPINNED], 1),
    rejected("a port literal fails", [LITERAL], 1),
  ],
});
