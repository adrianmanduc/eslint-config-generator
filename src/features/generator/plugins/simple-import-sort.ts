import type { PluginDefinition } from "../types";

export const simpleImportSort = {
  id: "simple-import-sort",
  name: "Simple Import Sort",
  packageName: "eslint-plugin-simple-import-sort",
  importName: "simpleImportSort",
  namespace: "simple-import-sort",
  category: "imports",
  docsUrl: "https://github.com/lydell/eslint-plugin-simple-import-sort#usage",
  configs: [],
  defaultConfigs: [],
} as const satisfies PluginDefinition;
