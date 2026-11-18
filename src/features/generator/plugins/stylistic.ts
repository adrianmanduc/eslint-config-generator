import type { PluginDefinition } from "../types";

export const stylistic = {
  id: "stylistic",
  name: "ESLint Stylistic",
  packageName: "@stylistic/eslint-plugin",
  importName: "stylistic",
  namespace: "@stylistic",
  category: "style",
  docsUrl: "https://eslint.style/rules",
  configs: [
    { id: "recommended", accessor: ["configs", "recommended"] },
    { id: "all", accessor: ["configs", "all"] },
  ],
  defaultConfigs: ["recommended"],
  options: {
    target: { kind: "factory", configId: "recommended", accessor: ["configs", "customize"] },
    fields: [
      { key: "indent", type: "select", choices: [2, 4, "tab"], default: 2 },
      { key: "quotes", type: "select", choices: ["single", "double", "backtick"], default: "single" },
      { key: "semi", type: "boolean", default: false },
      { key: "jsx", type: "boolean", default: true },
      { key: "arrowParens", type: "boolean", default: false },
      { key: "braceStyle", type: "select", choices: ["1tbs", "stroustrup", "allman"], default: "stroustrup" },
      { key: "blockSpacing", type: "boolean", default: true },
      {
        key: "quoteProps",
        type: "select",
        choices: ["always", "as-needed", "consistent", "consistent-as-needed"],
        default: "consistent-as-needed",
      },
      {
        key: "commaDangle",
        type: "select",
        choices: ["never", "always", "always-multiline", "only-multiline"],
        default: "always-multiline",
      },
    ],
  },
} as const satisfies PluginDefinition;
