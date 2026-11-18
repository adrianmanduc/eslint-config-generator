import { queryOptions, useQueries } from "@tanstack/react-query";

import { loadCatalog } from "../catalog";

import type { PluginId } from "../plugins";
import type { CatalogMap } from "../rules";
import type { EslintMajor } from "../types";

export const generatorQueries = {
  all: () => ["generator"] as const,
  catalog: (pluginId: PluginId, eslintMajor: EslintMajor) =>
    queryOptions({
      // Only ESLint core has a catalog per ESLint major.
      queryKey: [...generatorQueries.all(), "catalog", pluginId, pluginId === "core" ? eslintMajor : null] as const,
      queryFn: () => loadCatalog(pluginId, eslintMajor),
      staleTime: Infinity,
    }),
};

/** The rule catalogs of the given plugins that have loaded so far, by plugin id. */
export function useCatalogs(pluginIds: readonly PluginId[], eslintMajor: EslintMajor): CatalogMap {
  return useQueries({
    queries: pluginIds.map((pluginId) => generatorQueries.catalog(pluginId, eslintMajor)),
    combine: (results) =>
      Object.fromEntries(results.flatMap((result, index) => (result.data ? [[pluginIds[index], result.data]] : []))),
  });
}
