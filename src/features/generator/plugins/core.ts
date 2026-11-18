import type { PluginDefinition } from "../types";

export const core = {
  id: "core",
  name: "ESLint core",
  packageName: "@eslint/js",
  importName: "js",
  namespace: null,
  category: "core",
  docsUrl: "https://eslint.org/docs/latest/rules/",
  required: true,
  configs: [{ id: "recommended", accessor: ["configs", "recommended"] }],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
