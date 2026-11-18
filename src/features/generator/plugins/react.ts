import type { PluginDefinition } from "../types";

export const react = {
  id: "react",
  name: "React",
  packageName: "eslint-plugin-react",
  importName: "react",
  namespace: "react",
  category: "framework",
  docsUrl: "https://github.com/jsx-eslint/eslint-plugin-react#list-of-supported-rules",
  fileTypes: ["jsx"],
  configs: [
    { id: "recommended", accessor: ["configs", "flat", "recommended"] },
    { id: "jsx-runtime", accessor: ["configs", "flat", "jsx-runtime"] },
    { id: "all", accessor: ["configs", "flat", "all"] },
  ],
  defaultConfigs: ["recommended", "jsx-runtime"],
  settings: { react: { version: "detect" } },
} as const satisfies PluginDefinition;
