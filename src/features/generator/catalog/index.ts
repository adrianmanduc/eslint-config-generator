import manifestJson from "./manifest.json";

import type { PluginId } from "../plugins";
import type { EslintMajor, PluginCatalog, PluginManifestEntry } from "../types";

/**
 * Lazy loaders for the generated rule catalogs (`pnpm catalog`). Each catalog
 * is its own chunk, fetched when its plugin is first used.
 */
type CatalogModule = { default: unknown };

const loaders: Record<PluginId, (eslintMajor: EslintMajor) => Promise<CatalogModule>> = {
  core: (eslintMajor) => (eslintMajor === 9 ? import("./core.eslint9.json") : import("./core.eslint10.json")),
  typescript: () => import("./typescript.json"),
  unicorn: () => import("./unicorn.json"),
  react: () => import("./react.json"),
  "react-hooks": () => import("./react-hooks.json"),
  "react-refresh": () => import("./react-refresh.json"),
  "jsx-a11y": () => import("./jsx-a11y.json"),
  next: () => import("./next.json"),
  "tanstack-query": () => import("./tanstack-query.json"),
  node: () => import("./node.json"),
  nestjs: () => import("./nestjs.json"),
  "import-x": () => import("./import-x.json"),
  "simple-import-sort": () => import("./simple-import-sort.json"),
  perfectionist: () => import("./perfectionist.json"),
  tailwindcss: () => import("./tailwindcss.json"),
  vitest: () => import("./vitest.json"),
  jest: () => import("./jest.json"),
  stylistic: () => import("./stylistic.json"),
};

export async function loadCatalog(pluginId: PluginId, eslintMajor: EslintMajor): Promise<PluginCatalog> {
  const catalogModule = await loaders[pluginId](eslintMajor);

  // The JSON is produced by scripts/generate-rule-catalog.mjs in this shape.
  return catalogModule.default as PluginCatalog;
}

export const manifest: Record<PluginId, PluginManifestEntry> = manifestJson;
