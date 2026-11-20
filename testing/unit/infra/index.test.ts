import { expect, test } from "bun:test";
import * as infra from "@platform/infra";

test.each(["applyPlan", "planFor", "renderCaddyfile", "runStack"])(
  "the package exports %s from its entry point",
  (name) => {
    expect(typeof Reflect.get(infra, name)).toBe("function");
  },
);
