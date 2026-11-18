import type { PluginDefinition } from "../types";

export const jest = {
  id: "jest",
  name: "Jest",
  packageName: "eslint-plugin-jest",
  importName: "jest",
  namespace: "jest",
  category: "testing",
  docsUrl: "https://github.com/jest-community/eslint-plugin-jest#rules",
  files: ["**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}", "**/__tests__/**"],
  configs: [
    { id: "recommended", accessor: ["configs", "flat/recommended"] },
    { id: "style", accessor: ["configs", "flat/style"] },
    { id: "all", accessor: ["configs", "flat/all"] },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
