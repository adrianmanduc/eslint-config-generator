import type { PluginDefinition } from "../types";

export const typescript = {
  id: "typescript",
  name: "typescript-eslint",
  packageName: "typescript-eslint",
  importName: "tseslint",
  namespace: "@typescript-eslint",
  category: "language",
  docsUrl: "https://typescript-eslint.io/rules/",
  fileTypes: ["typescript"],
  pluginAccessor: ["plugin"],
  // Registers the parser and the plugin without enabling any rule.
  baseAccessor: ["configs", "base"],
  configs: [
    { id: "recommended", accessor: ["configs", "recommended"] },
    { id: "strict", accessor: ["configs", "strict"] },
    { id: "stylistic", accessor: ["configs", "stylistic"] },
    { id: "recommendedTypeChecked", accessor: ["configs", "recommendedTypeChecked"], typeChecked: true },
    { id: "strictTypeChecked", accessor: ["configs", "strictTypeChecked"], typeChecked: true },
    { id: "stylisticTypeChecked", accessor: ["configs", "stylisticTypeChecked"], typeChecked: true },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
