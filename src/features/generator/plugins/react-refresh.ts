import type { PluginDefinition } from "../types";

export const reactRefresh = {
  id: "react-refresh",
  name: "React Refresh",
  packageName: "eslint-plugin-react-refresh",
  importName: "reactRefresh",
  namespace: "react-refresh",
  category: "framework",
  docsUrl: "https://github.com/ArnaudBarre/eslint-plugin-react-refresh#readme",
  fileTypes: ["jsx"],
  configs: [
    { id: "recommended", accessor: ["configs", "recommended"] },
    { id: "vite", accessor: ["configs", "vite"] },
    { id: "next", accessor: ["configs", "next"] },
  ],
  defaultConfigs: ["vite"],
} as const satisfies PluginDefinition;
