import type { PluginDefinition } from "../types";

export const importX = {
  id: "import-x",
  name: "Import X",
  packageName: "eslint-plugin-import-x",
  importName: "importX",
  namespace: "import-x",
  category: "imports",
  docsUrl: "https://github.com/un-ts/eslint-plugin-import-x#rules",
  configs: [
    { id: "recommended", accessor: ["flatConfigs", "recommended"] },
    { id: "typescript", accessor: ["flatConfigs", "typescript"], packages: ["eslint-import-resolver-typescript"] },
    { id: "react", accessor: ["flatConfigs", "react"] },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
