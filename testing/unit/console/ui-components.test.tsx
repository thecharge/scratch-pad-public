import "@platform/test-framework/dom";
import { afterEach, describe, expect, test } from "bun:test";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../../../apps/console/src/components/ui/card.tsx";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegendContent,
  ChartTooltipContent,
} from "../../../apps/console/src/components/ui/chart.tsx";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "../../../apps/console/src/components/ui/table.tsx";

const { cleanup, render } = await import("@testing-library/react");

class FixedObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const box = [{ inlineSize: 400, blockSize: 300 }];
    const entry = {
      target,
      contentRect: { width: 400, height: 300 },
      borderBoxSize: box,
      contentBoxSize: box,
    };
    this.callback([entry as never], this as never);
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = FixedObserver as never;

afterEach(cleanup);

const SLOTS = [
  "card",
  "card-header",
  "card-title",
  "card-description",
  "card-action",
  "card-content",
  "card-footer",
];

describe("the card parts", () => {
  test("every part renders with its slot and keeps the class it is given", () => {
    render(
      <Card className="extra">
        <CardHeader>
          <CardTitle>Title</CardTitle>
          <CardDescription>Description</CardDescription>
          <CardAction>Action</CardAction>
        </CardHeader>
        <CardContent>Content</CardContent>
        <CardFooter>Footer</CardFooter>
      </Card>,
    );
    const found = SLOTS.map((slot) => document.querySelector(`[data-slot="${slot}"]`)?.textContent);
    expect(found).toEqual([
      "TitleDescriptionActionContentFooter",
      "TitleDescriptionAction",
      "Title",
      "Description",
      "Action",
      "Content",
      "Footer",
    ]);
    expect(document.querySelector('[data-slot="card"]')?.className).toContain("extra");
  });
});

describe("the table parts", () => {
  test("every part renders in its place", () => {
    render(
      <Table className="wide">
        <TableCaption>Caption</TableCaption>
        <TableHeader>
          <TableRow>
            <TableHead>Head</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Cell</TableCell>
          </TableRow>
        </TableBody>
        <TableFooter>
          <TableRow>
            <TableCell>Foot</TableCell>
          </TableRow>
        </TableFooter>
      </Table>,
    );
    const text = (selector: string) => document.querySelector(selector)?.textContent;
    expect([
      text("caption"),
      text("thead th"),
      text("tbody td"),
      text("tfoot td"),
      document.querySelector("table")?.className,
    ]).toEqual(["Caption", "Head", "Cell", "Foot", expect.stringContaining("w-full")]);
  });
});

const CONFIG = {
  count: { label: "Calls", color: "#123456" },
  errors: { label: "Errors", theme: { light: "#aa0000", dark: "#ff5555" } },
  plain: { label: "Plain" },
};
const Icon = () => <svg data-icon="yes" />;
const WITH_ICON = { icon: Icon, label: "Icon label" };

function Probe({ children }: React.PropsWithChildren) {
  return <div data-probe="yes">{children}</div>;
}

function chartWith(content: React.ReactNode, config: ChartConfig = CONFIG) {
  return render(
    <ChartContainer config={config} id="probe">
      <Probe>{content}</Probe>
    </ChartContainer>,
  );
}

const PAYLOAD = [
  { name: "count", dataKey: "count", value: 1234, color: "#111111", payload: { fill: "#222222" } },
  { name: "errors", dataKey: "errors", value: "7", color: "#333333", payload: {} },
];

describe("the chart container", () => {
  test("it writes the colors of the config for both themes", () => {
    chartWith(null);
    const style = document.querySelector("style")?.textContent ?? "";
    expect(style).toContain("--color-count: #123456;");
    expect(style).toContain("--color-errors: #aa0000;");
    expect(style).toContain("--color-errors: #ff5555;");
  });

  test("a config without colors writes no style", () => {
    chartWith(null, { plain: { label: "Plain" } });
    expect(document.querySelector("style")).toBeNull();
  });

  test("a tooltip outside a chart container is refused", () => {
    expect(() => render(<ChartTooltipContent active payload={PAYLOAD as never} />)).toThrow(
      "useChart must be used within a <ChartContainer />",
    );
  });
});

describe("the chart tooltip content", () => {
  test("an inactive tooltip renders nothing", () => {
    chartWith(<ChartTooltipContent active={false} payload={PAYLOAD as never} />);
    expect(document.querySelector('[data-probe] [class*="shadow-xl"]')).toBeNull();
  });

  test("an empty payload renders nothing", () => {
    chartWith(<ChartTooltipContent active payload={[]} />);
    expect(document.querySelector('[class*="shadow-xl"]')).toBeNull();
  });

  test("each item shows its label from the config and its formatted value", () => {
    chartWith(<ChartTooltipContent active payload={PAYLOAD as never} label="count" />);
    const text = document.querySelector('[class*="shadow-xl"]')?.textContent ?? "";
    expect(text).toContain("Calls");
    expect(text).toContain("1,234");
    expect(text).toContain("Errors");
    expect(text).toContain("7");
  });

  test("the label comes from the label formatter when one is given", () => {
    chartWith(
      <ChartTooltipContent
        active
        payload={PAYLOAD as never}
        label="count"
        labelFormatter={(value: unknown) => `Formatted ${String(value)}`}
      />,
    );
    expect(document.body.textContent).toContain("Formatted Calls");
  });

  test("hiding the label and the indicator leaves only the rows", () => {
    chartWith(<ChartTooltipContent active payload={PAYLOAD as never} hideLabel hideIndicator />);
    expect(document.querySelector('[style*="--color-bg"]')).toBeNull();
  });

  test("the line and dashed indicators nest the label for a single item", () => {
    chartWith(
      <>
        <ChartTooltipContent
          active
          payload={[PAYLOAD[0]] as never}
          indicator="line"
          label="count"
        />
        <ChartTooltipContent
          active
          payload={[PAYLOAD[0]] as never}
          indicator="dashed"
          label="count"
        />
      </>,
    );
    expect(document.querySelectorAll('[class*="shadow-xl"]').length).toBe(2);
  });

  test("a custom formatter replaces the row", () => {
    chartWith(
      <ChartTooltipContent
        active
        payload={PAYLOAD as never}
        formatter={(value: unknown, name: unknown) => <b data-custom="yes">{`${name}=${value}`}</b>}
      />,
    );
    expect(document.querySelectorAll('[data-custom="yes"]').length).toBe(2);
  });

  test("an icon from the config replaces the color mark", () => {
    chartWith(<ChartTooltipContent active payload={[PAYLOAD[0]] as never} />, { count: WITH_ICON });
    expect(document.querySelector('[data-icon="yes"]')).not.toBeNull();
  });

  test("the name key and the label key pick other fields of the payload", () => {
    chartWith(
      <ChartTooltipContent
        active
        payload={
          [
            { name: "x", dataKey: "x", value: 2, payload: { kind: "errors", tag: "count" } },
          ] as never
        }
        nameKey="kind"
        labelKey="tag"
      />,
    );
    expect(document.body.textContent).toContain("Errors");
  });

  test("items of type none are skipped", () => {
    chartWith(
      <ChartTooltipContent
        active
        payload={[{ ...PAYLOAD[0], type: "none" }, PAYLOAD[1]] as never}
        hideLabel
      />,
    );
    expect(document.body.textContent).not.toContain("Calls");
  });

  test("a payload entry that is not an object has no config", () => {
    chartWith(<ChartTooltipContent active payload={["text"] as never} hideLabel hideIndicator />);
    expect(document.querySelector('[class*="shadow-xl"]')).not.toBeNull();
  });

  test("an item without a configured label shows no label row", () => {
    chartWith(
      <ChartTooltipContent active payload={[{ name: "zzz", dataKey: "zzz", value: 1 }] as never} />,
    );
    expect(document.body.textContent).toContain("zzz");
  });

  test("the name key can point at the name itself", () => {
    chartWith(
      <ChartTooltipContent active payload={[PAYLOAD[1]] as never} nameKey="name" hideLabel />,
    );
    expect(document.body.textContent).toContain("Errors");
  });
});

describe("the chart legend content", () => {
  test("an empty payload renders nothing", () => {
    chartWith(<ChartLegendContent payload={[]} />);
    expect(document.querySelector('[class*="justify-center gap-4"]')).toBeNull();
  });

  test("each entry shows its label and color", () => {
    chartWith(<ChartLegendContent payload={PAYLOAD as never} />);
    const text = document.querySelector('[class*="gap-4"]')?.textContent ?? "";
    expect(text).toBe("CallsErrors");
  });

  test("the icon of the config is used unless it is hidden", () => {
    chartWith(
      <>
        <ChartLegendContent payload={[PAYLOAD[0]] as never} verticalAlign="top" />
        <ChartLegendContent payload={[PAYLOAD[0]] as never} hideIcon nameKey="count" />
      </>,
      { count: WITH_ICON },
    );
    expect(document.querySelectorAll('[data-icon="yes"]').length).toBe(1);
  });

  test("entries of type none are skipped", () => {
    chartWith(<ChartLegendContent payload={[{ ...PAYLOAD[0], type: "none" }] as never} />);
    expect(document.body.textContent).not.toContain("Calls");
  });
});
