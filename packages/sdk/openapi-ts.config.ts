import { defineConfig } from "@hey-api/openapi-ts";

export default defineConfig({
  logs: { file: false },
  input: "../../openapi/baseline.json",
  output: {
    path: process.env.SDK_OUTPUT ?? "generated",
    header: null,
    clean: true,
  },
  plugins: ["@hey-api/client-fetch", "@hey-api/typescript", "@hey-api/sdk", "zod"],
});
