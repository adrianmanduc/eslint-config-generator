import agm from "@agm-stack/eslint-config-next";
import next from "@agm-stack/eslint-config-next/next";
import tailwind from "@agm-stack/eslint-config-next/tailwind";
import pluginQuery from "@tanstack/eslint-plugin-query";
import { defineConfig, globalIgnores } from "eslint/config";

const config = defineConfig([
  globalIgnores(["messages/**/*.d.json.ts"]),
  agm.configs.recommended,
  // next-intl loads the request config through its default export.
  next({ defaultExportFiles: ["src/i18n/request.ts"] }),
  tailwind({ cssConfigPath: "./src/styles/index.css" }),
  agm.configs.i18n,
  pluginQuery.configs["flat/recommended"],
]);

export default config;
