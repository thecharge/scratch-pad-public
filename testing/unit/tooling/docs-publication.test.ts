import { afterAll, expect, test } from "bun:test";
import { mkdir, readdir, realpath, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { negative, positive, rejected, seen, unit } from "@platform/test-factories";
import { makeDir, removeAll } from "@platform/test-scenarios";
import { publishedDocs, withDocsPublication } from "../../../tooling/scripts/docs-publication.ts";
import {
  corruptPublication,
  docsPublicationFixture,
  publicationAttempt,
} from "../../packages/scenarios/src/docs-publication-fixtures.ts";

afterAll(removeAll);
const first = await docsPublicationFixture();
const second = await docsPublicationFixture("ok", "second");
const thrown = await docsPublicationFixture("throw");
const failed = await docsPublicationFixture("code");
const publishedFirst = await docsPublicationFixture();
const publishedSecond = await docsPublicationFixture("ok", "second");
await withDocsPublication(publishedFirst.root, publishedFirst.produce);
await withDocsPublication(publishedSecond.root, publishedSecond.produce);
const missing = await makeDir();
const tampered = await docsPublicationFixture();
await withDocsPublication(tampered.root, tampered.produce);
await Bun.write(join(await publishedDocs(tampered.root), "index.html"), "corrupt site");

unit(withDocsPublication, {
  positive: [
    positive("publishes a complete first candidate", [first.root, first.produce], 0),
    positive("publishes an independent complete candidate", [second.root, second.produce], 0),
  ],
  negative: [
    negative("browser refusal propagates before publication", [thrown.root, thrown.produce], {
      name: "RangeError",
      message: "deliberate browser refusal",
    }),
    rejected("producer exit failure does not publish", [failed.root, failed.produce], 7),
  ],
});
unit(publishedDocs, {
  positive: [
    positive(
      "resolves and verifies the first pinned site",
      [publishedFirst.root],
      seen(async (site: string) => Bun.file(join(site, "index.html")).text(), "first site"),
    ),
    positive(
      "resolves an independent second pinned site",
      [publishedSecond.root],
      seen(async (site: string) => Bun.file(join(site, "index.html")).text(), "second site"),
    ),
  ],
  negative: [
    negative("missing publication refuses", [missing], {}),
    negative("changed published bytes refuse", [tampered.root], {
      message: "Documentation publication candidate is invalid",
    }),
  ],
});

test.each(["throw", "code", "symlink"])(
  "failed %s candidate retains the complete prior publication",
  async (mode) => {
    const fixture = await docsPublicationFixture();
    const next = await docsPublicationFixture(mode, "next");
    await withDocsPublication(fixture.root, fixture.produce);
    const old = await publishedDocs(fixture.root);
    const attempt = await publicationAttempt(async () =>
      withDocsPublication(fixture.root, next.produce),
    );
    expect(attempt.code !== 0).toBe(true);
    expect(await publishedDocs(fixture.root)).toBe(old);
    expect(await Bun.file(join(old, "index.html")).text()).toBe("first site");
  },
);

test.each(["second", "third"])(
  "successful %s candidate preserves previously pinned complete files",
  async (label) => {
    const fixture = await docsPublicationFixture();
    const next = await docsPublicationFixture("ok", label);
    await withDocsPublication(fixture.root, fixture.produce);
    const old = await publishedDocs(fixture.root);
    await withDocsPublication(fixture.root, next.produce);
    const current = await publishedDocs(fixture.root);
    expect(current).not.toBe(old);
    expect(await Bun.file(join(old, "index.html")).text()).toBe("first site");
    expect(await Bun.file(join(current, "index.html")).text()).toBe(`${label} site`);
    expect(await Bun.file(join(current, "../content/guide.md")).text()).toBe(`${label} guide`);
  },
);

test.each([".stack/docs-publications/current", "apps/docs/src/content/docs"])(
  "escaping %s refuses and preserves foreign data",
  async (destination) => {
    const fixture = await docsPublicationFixture();
    await Bun.write(join(fixture.outside, "sentinel"), "foreign");
    await withDocsPublication(fixture.root, fixture.produce);
    const prior = await realpath(join(fixture.root, ".stack/docs-publications/current"));
    const target = join(fixture.root, destination);
    await rm(target, { recursive: true, force: true });
    await symlink(fixture.outside, target);
    const result = await publicationAttempt(async () =>
      withDocsPublication(fixture.root, fixture.produce),
    );
    expect(result.code).not.toBe(0);
    expect(await Bun.file(join(fixture.outside, "sentinel")).text()).toBe("foreign");
    expect(await Bun.file(join(prior, "site/index.html")).text()).toBe("first site");
  },
);

test.each(["first", "second"])(
  "simultaneous %s publisher cannot replace the active writer",
  async (label) => {
    const fixture = await docsPublicationFixture("ok", label);
    const next = await docsPublicationFixture("ok", "other");
    let release: (() => void) | undefined;
    let entered: (() => void) | undefined;
    const blocked = new Promise<void>((resolve) => {
      release = resolve;
    });
    const started = new Promise<void>((resolve) => {
      entered = resolve;
    });
    const first = withDocsPublication(fixture.root, async (workspace) => {
      entered?.();
      await blocked;
      return fixture.produce(workspace);
    });
    await started;
    const other = await publicationAttempt(async () =>
      withDocsPublication(fixture.root, next.produce),
    );
    release?.();
    expect(other.code).not.toBe(0);
    expect(await first).toBe(0);
    expect(await Bun.file(join(await publishedDocs(fixture.root), "index.html")).text()).toBe(
      `${label} site`,
    );
  },
);

test.each(["deleted", "extra", "duplicate", "escaped", "manifest-link"])(
  "a published bundle with %s inventory refuses resolution",
  async (mode) => {
    const fixture = await docsPublicationFixture();
    await withDocsPublication(fixture.root, fixture.produce);
    const site = await publishedDocs(fixture.root);
    const manifestPath = join(site, "../manifest.json");
    const manifest = await Bun.file(manifestPath).json();
    await corruptPublication(mode, site, fixture.outside, manifestPath, manifest);
    const attempt = await publicationAttempt(async () => {
      await publishedDocs(fixture.root);
      return 0;
    });
    expect(attempt.code).not.toBe(0);
  },
);

test.each(["old", "obsolete"])(
  "candidate keeps its authored landing page without %s generated content",
  async (label) => {
    const fixture = await docsPublicationFixture();
    await Bun.write(
      join(fixture.root, "apps/docs/src/content/docs/index.mdx"),
      "authored landing page",
    );
    await Bun.write(join(fixture.root, "apps/docs/src/content/docs/stale.mdx"), label);
    const observed: boolean[] = [];
    const code = await withDocsPublication(fixture.root, async (workspace) => {
      observed.push(
        await Bun.file(join(workspace, "apps/docs/src/content/docs/stale.mdx")).exists(),
      );
      expect(await Bun.file(join(workspace, "apps/docs/src/content/docs/index.mdx")).text()).toBe(
        "authored landing page",
      );
      return fixture.produce(workspace);
    });
    expect(code).toBe(0);
    expect(observed).toEqual([false]);
  },
);

test.each(["node_modules", "apps/docs/node_modules"])(
  "publication links local dependency %s",
  async (dependency) => {
    const fixture = await docsPublicationFixture();
    await Bun.write(join(fixture.root, dependency, "sentinel"), "local dependency");
    expect(
      await withDocsPublication(fixture.root, async (workspace) => {
        expect(await Bun.file(join(workspace, dependency, "sentinel")).text()).toBe(
          "local dependency",
        );
        expect(await realpath(join(workspace, dependency))).toBe(join(fixture.root, dependency));
        return fixture.produce(workspace);
      }),
    ).toBe(0);
  },
);
test.each(["first", "second"])("failed publication selection cleans pending link %s", async () => {
  const fixture = await docsPublicationFixture();
  const directory = join(fixture.root, ".stack/docs-publications");
  const attempt = await publicationAttempt(async () =>
    withDocsPublication(fixture.root, async (workspace) => {
      await mkdir(join(directory, "current"));
      await Bun.write(join(directory, "current/sentinel"), "concurrent destination");
      return fixture.produce(workspace);
    }),
  );
  expect(attempt.code).not.toBe(0);
  expect(await Bun.file(join(directory, "current/sentinel")).text()).toBe("concurrent destination");
  expect(await readdir(directory)).toEqual(["current"]);
});
