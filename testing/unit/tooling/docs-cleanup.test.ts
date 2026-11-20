import { expect, test } from "bun:test";
import { negative, positive, unit } from "@platform/test-factories";
import { removeDocsPublicationTree } from "../../../tooling/scripts/docs-publication.ts";
import { cleanupFixture } from "./docs-cleanup-fixtures.ts";

const clean = await cleanupFixture("EFAULT", 0);
const transient = await cleanupFixture("EFAULT", 1);
const persistent = await cleanupFixture("EFAULT", 10);
const permanent = await cleanupFixture("EPERM", 1);
unit(removeDocsPublicationTree, {
  positive: [
    positive("clean removal", ["owned-workspace", clean.remove], undefined),
    positive("transient removal completes", ["owned-workspace", transient.remove], undefined),
  ],
  negative: [
    negative("persistent transient error stays blocking", ["owned-workspace", persistent.remove], {
      name: "Error",
      message: "EFAULT",
    }),
    negative("permission failure stays blocking", ["owned-workspace", permanent.remove], {
      name: "Error",
      message: "EPERM",
    }),
  ],
});
test.each([1, 3])("cleanup retries exactly %s transient failures", async (failures) => {
  const fixture = await cleanupFixture("EFAULT", failures);
  await removeDocsPublicationTree("owned-workspace", fixture.remove);
  expect(await fixture.calls()).toBe(failures + 1);
});
test.each(["EPERM", "ENOTEMPTY"])("cleanup preserves permanent %s error", async (code) => {
  const fixture = await cleanupFixture(code, 10);
  await expect(removeDocsPublicationTree("owned-workspace", fixture.remove)).rejects.toThrow(code);
  expect(await fixture.calls()).toBe(1);
});
test.each(["first", "repeat"])("cleanup exhaustion is bounded %s", async () => {
  const fixture = await cleanupFixture("EFAULT", 10);
  await expect(removeDocsPublicationTree("owned-workspace", fixture.remove)).rejects.toThrow(
    "EFAULT",
  );
  expect(await fixture.calls()).toBe(4);
});
