import type { PluginDefinition } from "../types";

export const vitest = {
  id: "vitest",
  name: "Vitest",
  packageName: "@vitest/eslint-plugin",
  importName: "vitest",
  namespace: "vitest",
  category: "testing",
  docsUrl: "https://github.com/vitest-dev/eslint-plugin-vitest#rules",
  files: ["**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}", "**/__tests__/**"],
  configs: [
    { id: "recommended", accessor: ["configs", "recommended"] },
    { id: "all", accessor: ["configs", "all"] },
    // Declares describe, it, expect and friends for projects that use `globals: true`.
    { id: "env", accessor: ["configs", "env"], addon: true },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
