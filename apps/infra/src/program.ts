import * as pulumi from "@pulumi/pulumi";
import { runStack } from "./stack.ts";

export const containerNames = await runStack(new pulumi.Config(), Bun.env);
