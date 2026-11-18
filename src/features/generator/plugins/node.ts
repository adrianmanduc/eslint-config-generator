import type { PluginDefinition } from "../types";

export const node = {
  id: "node",
  name: "Node.js",
  packageName: "eslint-plugin-n",
  importName: "nodePlugin",
  namespace: "n",
  category: "backend",
  docsUrl: "https://github.com/eslint-community/eslint-plugin-n#-rules",
  configs: [
    { id: "recommended", accessor: ["configs", "flat/recommended"] },
    { id: "recommended-module", accessor: ["configs", "flat/recommended-module"] },
    { id: "recommended-script", accessor: ["configs", "flat/recommended-script"] },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
