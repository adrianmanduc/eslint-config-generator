import type { PluginDefinition } from "../types";

export const tailwindcss = {
  id: "tailwindcss",
  name: "Tailwind CSS",
  packageName: "eslint-plugin-tailwindcss",
  importName: "tailwindcss",
  namespace: "tailwindcss",
  category: "style",
  docsUrl: "https://github.com/francoismassart/eslint-plugin-tailwindcss#supported-rules",
  configs: [{ id: "recommended", accessor: ["configs", "recommended"], typesMismatch: true }],
  defaultConfigs: ["recommended"],
  options: {
    target: { kind: "settings", key: "tailwindcss" },
    fields: [{ key: "cssConfigPath", type: "text", default: "", placeholder: "./src/app/globals.css" }],
  },
} as const satisfies PluginDefinition;
