import type { PluginDefinition } from "../types";

export const tanstackQuery = {
  id: "tanstack-query",
  name: "TanStack Query",
  packageName: "@tanstack/eslint-plugin-query",
  importName: "tanstackQuery",
  namespace: "@tanstack/query",
  category: "framework",
  docsUrl: "https://tanstack.com/query/latest/docs/eslint/eslint-plugin-query",
  configs: [
    { id: "recommended", accessor: ["configs", "flat/recommended"] },
    { id: "recommended-strict", accessor: ["configs", "flat/recommended-strict"] },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
