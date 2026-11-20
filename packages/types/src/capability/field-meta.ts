import type { FieldBehavior } from "@platform/constants";

declare module "zod" {
  interface GlobalMeta {
    fieldBehavior?: FieldBehavior;
  }
}
