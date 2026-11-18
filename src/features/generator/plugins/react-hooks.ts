import type { PluginDefinition } from "../types";

export const reactHooks = {
  id: "react-hooks",
  name: "React Hooks",
  packageName: "eslint-plugin-react-hooks",
  importName: "reactHooks",
  namespace: "react-hooks",
  category: "framework",
  docsUrl: "https://react.dev/reference/eslint-plugin-react-hooks",
  fileTypes: ["jsx"],
  configs: [
    { id: "recommended", accessor: ["configs", "flat", "recommended"] },
    { id: "recommended-latest", accessor: ["configs", "flat", "recommended-latest"] },
  ],
  defaultConfigs: ["recommended"],
} as const satisfies PluginDefinition;
