import { deserialize } from "bun:jsc";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  CHECKS_IMAGE_REPOSITORY,
  containerNameOf,
  PROXY_HOST,
} from "@platform/config/environments";
import {
  CADDY_DATA_FOLDER,
  CHECKS_CONTAINERFILE,
  CHECKS_ENV_FLAG,
  ENV_ASSIGNMENT,
  EnvironmentName,
  Glyph,
  Runner,
  STACK_DATA_DIR,
  STACK_DIR,
  STATIC_VOLUME_FLAG,
  StackNetwork,
  StackService,
  StdioMode,
  Text,
  UI_PROXY,
  UI_SCENARIO_TIMEOUT_MS,
} from "@platform/constants";
import { UiRunSchema, type UiScenario } from "@platform/types";
import { all } from "@platform/util";
import { runPodman } from "../../../scenarios/src/proxy-fixtures.ts";
import { scopedApiFixture } from "../../../scenarios/src/scoped-api-fixtures.ts";
import { withDeadline } from "../deadline.ts";
import { REPO_ROOT } from "../repo.ts";

export async function runUiProxy(scenario: UiScenario, dist: string, shots: string) {
  const temporary = await mkdtemp(join(tmpdir(), UI_PROXY.TemporaryPrefix));
  const name = UI_PROXY.ContainerPrefix + basename(temporary);
  const input = join(temporary, UI_PROXY.InputFile);
  const output = join(temporary, UI_PROXY.OutputFile);
  const environment = EnvironmentName.Test;
  const data = join(
    REPO_ROOT,
    STACK_DIR,
    STACK_DATA_DIR,
    await containerNameOf(environment, CADDY_DATA_FOLDER),
  );
  const source = await Bun.file(join(REPO_ROOT, CHECKS_CONTAINERFILE)).text();
  const digest = new Bun.CryptoHasher(UI_PROXY.Sha256).update(source).digest(UI_PROXY.Hex);
  const edge = await containerNameOf(environment, StackNetwork.Edge);
  const address = await runPodman([
    UI_PROXY.InspectCommand,
    await containerNameOf(environment, StackService.Proxy),
    UI_PROXY.FormatFlag,
    UI_PROXY.NetworkAddressTemplate.replace(UI_PROXY.NetworkPlaceholder, JSON.stringify(edge)),
  ]);
  if (address.exitCode !== 0 || address.stdout.trim() === Text.Empty)
    throw new Error(UI_PROXY.AddressFailure);
  const fixture = await scopedApiFixture(environment, 0, true, dist, scenario.scopes);
  try {
    await Bun.write(input, JSON.stringify(scenario));
    const child = Bun.spawn(
      [
        Runner.Podman,
        ...UI_PROXY.LaunchFlags,
        name,
        ...UI_PROXY.IdentityFlags,
        edge,
        UI_PROXY.HostFlag,
        [PROXY_HOST, address.stdout.trim()].join(Glyph.Colon),
        STATIC_VOLUME_FLAG,
        [REPO_ROOT, REPO_ROOT].join(Glyph.Colon) + UI_PROXY.ReadOnlyMount,
        STATIC_VOLUME_FLAG,
        [temporary, temporary].join(Glyph.Colon) + UI_PROXY.ReadWriteMount,
        STATIC_VOLUME_FLAG,
        data + UI_PROXY.AuthorityMount,
        CHECKS_ENV_FLAG,
        UI_PROXY.AuthorityEnvironment + UI_PROXY.CertificateRoot,
        UI_PROXY.WorkingDirectoryFlag,
        REPO_ROOT,
        CHECKS_ENV_FLAG,
        [UI_PROXY.AdminEnvironment, fixture.owner].join(ENV_ASSIGNMENT),
        [CHECKS_IMAGE_REPOSITORY, digest].join(Glyph.Colon),
        Runner.Bun,
        Runner.Run,
        UI_PROXY.Entry,
        input,
        output,
        shots,
      ],
      { stdout: StdioMode.Pipe, stderr: StdioMode.Pipe },
    );
    const [stdout, stderr, code] = await all<string | number>([
      async () => new Response(child.stdout).text(),
      async () => new Response(child.stderr).text(),
      async () =>
        withDeadline(child.exited, scenario.id, UI_SCENARIO_TIMEOUT_MS, async () => {
          await runPodman([...UI_PROXY.RemoveFlags, name]);
        }),
    ]);
    if (code !== 0) throw new Error([stdout, stderr].join(Text.Newline));
    return UiRunSchema.parse(deserialize(await Bun.file(output).arrayBuffer()));
  } finally {
    await fixture.stop();
    await rm(temporary, { recursive: true, force: true });
  }
}
