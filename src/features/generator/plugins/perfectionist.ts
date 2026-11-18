import type { PluginDefinition } from "../types";

export const perfectionist = {
  id: "perfectionist",
  name: "Perfectionist",
  packageName: "eslint-plugin-perfectionist",
  importName: "perfectionist",
  namespace: "perfectionist",
  category: "imports",
  docsUrl: "https://perfectionist.dev/rules",
  configs: [
    { id: "recommended-natural", accessor: ["configs", "recommended-natural"] },
    { id: "recommended-alphabetical", accessor: ["configs", "recommended-alphabetical"] },
    { id: "recommended-line-length", accessor: ["configs", "recommended-line-length"] },
  ],
  defaultConfigs: [],
} as const satisfies PluginDefinition;
