import "@platform/test-framework/dom";
import { afterEach, describe, expect, test } from "bun:test";
import { ConsoleDom, MessageId } from "@platform/constants";
import { message } from "@platform/messages";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "../../../apps/console/src/components/ui/select.tsx";

const { cleanup, render, screen, waitFor } = await import("@testing-library/react");

afterEach(cleanup);

describe("the select parts", () => {
  test("a closed select shows its trigger with the chosen value", () => {
    render(
      <Select value="b">
        <SelectTrigger size="sm">
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
          <SelectItem value="b">Beta</SelectItem>
        </SelectContent>
      </Select>,
    );
    const trigger = document.querySelector('[data-slot="select-trigger"]');
    expect(trigger?.getAttribute("data-size")).toBe("sm");
    expect(trigger?.textContent).toContain("Beta");
  });

  test("an open select lists groups, labels, items and a separator", async () => {
    render(
      <Select open value="a">
        <SelectTrigger>
          <SelectValue placeholder="Pick" />
        </SelectTrigger>
        <SelectContent position="popper" align="start" className="wide">
          <SelectScrollUpButton />
          <SelectGroup>
            <SelectLabel>Letters</SelectLabel>
            <SelectItem value="a">Alpha</SelectItem>
            <SelectSeparator />
            <SelectItem value="b">Beta</SelectItem>
          </SelectGroup>
          <SelectScrollDownButton />
        </SelectContent>
      </Select>,
    );
    await waitFor(() =>
      expect(document.querySelector('[data-slot="select-label"]')).not.toBeNull(),
    );
    const slots = ["select-group", "select-item", "select-separator", "select-content"].map(
      (slot) => document.querySelectorAll(`[data-slot="${slot}"]`).length > 0,
    );
    expect(slots).toEqual([true, true, true, true]);
  });

  test("an open select with the default position renders its items", async () => {
    render(
      <Select open value="a">
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="a">Alpha</SelectItem>
        </SelectContent>
      </Select>,
    );
    await waitFor(() => expect(document.querySelector('[data-slot="select-item"]')).not.toBeNull());
    expect(screen.getAllByText("Alpha").length).toBeGreaterThan(0);
  });
});

describe("the console entry", () => {
  test("it mounts the app into the root element when the module loads", async () => {
    const container = document.createElement("div");
    container.id = ConsoleDom.RootId;
    document.body.append(container);
    await import("../../../apps/console/src/main.tsx");
    await waitFor(() => expect(container.textContent).toContain(message(MessageId.UiNoAdmin)));
  });

  test("without a root element nothing is mounted", async () => {
    const { mountConsole } = await import("../../../apps/console/src/main.tsx");
    expect(await mountConsole(null, "")).toBe(false);
  });

  test("with a root element the app is mounted", async () => {
    const { mountConsole } = await import("../../../apps/console/src/main.tsx");
    const container = document.createElement("div");
    expect(await mountConsole(container, "")).toBe(true);
    await waitFor(() => expect(container.textContent).toContain(message(MessageId.UiNoAdmin)));
  });
});
