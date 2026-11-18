import type { PluginDefinition } from "../types";

export const next = {
  id: "next",
  name: "Next.js",
  packageName: "@next/eslint-plugin-next",
  importName: "next",
  namespace: "@next/next",
  category: "framework",
  docsUrl: "https://nextjs.org/docs/app/api-reference/config/eslint#rules",
  fileTypes: ["jsx"],
  configs: [
    { id: "recommended", accessor: ["configs", "recommended"] },
    { id: "core-web-vitals", accessor: ["configs", "core-web-vitals"] },
  ],
  defaultConfigs: ["core-web-vitals"],
} as const satisfies PluginDefinition;
