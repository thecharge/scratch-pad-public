import { pid } from "node:process";
import { PORT_BASE, PORT_SPAN } from "@platform/constants";

const base = PORT_BASE + (pid % PORT_SPAN) * 3;

export const PORTS = { api: base, console: base + 1, docs: base + 2 };
