import starlight from "@astrojs/starlight";
import { DOC_CATEGORY_MESSAGES, DOCS_ASTRO_CACHE, DocCategory } from "@platform/constants";
import { message } from "@platform/messages";
import { defineConfig } from "astro/config";
import mermaid from "astro-mermaid";
import starlightLinksValidator from "starlight-links-validator";

const source = (directory: string) => ({ directory });
const entry = (directory: string) => ({ autogenerate: source(directory) });
const group = (label: string, directory: string) => ({ label, items: [entry(directory)] });
const start = { label: "Start", items: [{ slug: "index" }] };

const expressiveCode = { themes: ["github-light", "github-dark"] };
const categories = Object.values(DocCategory).map((category) =>
  group(message(DOC_CATEGORY_MESSAGES[category]), category),
);
const sidebar = [start, ...categories];
const options = {
  title: "Capability Platform",
  description: "One capability definition served as HTTP, MCP, OpenAPI, skills and docs.",
  plugins: [starlightLinksValidator()],
  expressiveCode,
  sidebar,
};

export default defineConfig({
  cacheDir: DOCS_ASTRO_CACHE,
  integrations: [mermaid({ theme: "default", autoTheme: true }), starlight(options)],
});
