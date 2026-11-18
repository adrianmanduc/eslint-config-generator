import type { PluginDefinition } from "../types";

export const jsxA11y = {
  id: "jsx-a11y",
  name: "JSX A11y",
  packageName: "eslint-plugin-jsx-a11y",
  typesPackage: "@types/eslint-plugin-jsx-a11y",
  importName: "jsxA11y",
  namespace: "jsx-a11y",
  category: "framework",
  docsUrl: "https://github.com/jsx-eslint/eslint-plugin-jsx-a11y#supported-rules",
  fileTypes: ["jsx"],
  configs: [
    { id: "recommended", accessor: ["flatConfigs", "recommended"] },
    { id: "strict", accessor: ["flatConfigs", "strict"] },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
