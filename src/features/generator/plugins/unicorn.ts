import type { PluginDefinition } from "../types";

export const unicorn = {
  id: "unicorn",
  name: "Unicorn",
  packageName: "eslint-plugin-unicorn",
  importName: "unicorn",
  namespace: "unicorn",
  category: "quality",
  docsUrl: "https://github.com/sindresorhus/eslint-plugin-unicorn#rules",
  configs: [
    { id: "recommended", accessor: ["configs", "recommended"] },
    { id: "unopinionated", accessor: ["configs", "unopinionated"] },
    { id: "all", accessor: ["configs", "all"] },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
