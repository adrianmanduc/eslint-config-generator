import { core } from "./core";
import { importX } from "./import-x";
import { jest } from "./jest";
import { jsxA11y } from "./jsx-a11y";
import { nestjs } from "./nestjs";
import { next } from "./next";
import { node } from "./node";
import { perfectionist } from "./perfectionist";
import { react } from "./react";
import { reactHooks } from "./react-hooks";
import { reactRefresh } from "./react-refresh";
import { simpleImportSort } from "./simple-import-sort";
import { stylistic } from "./stylistic";
import { tailwindcss } from "./tailwindcss";
import { tanstackQuery } from "./tanstack-query";
import { typescript } from "./typescript";
import { unicorn } from "./unicorn";
import { vitest } from "./vitest";

import type { PluginDefinition } from "../types";

/**
 * The plugin registry, in the order plugins are emitted in the generated
 * config. To add a plugin, see docs/generator.md.
 */
export const plugins = [
  core,
  typescript,
  unicorn,
  react,
  reactHooks,
  reactRefresh,
  jsxA11y,
  next,
  tanstackQuery,
  node,
  nestjs,
  importX,
  simpleImportSort,
  perfectionist,
  tailwindcss,
  vitest,
  jest,
  stylistic,
] as const;

/** The registry typed as plain definitions, for code that reads optional fields. */
export const pluginDefinitions: readonly PluginDefinition[] = plugins;

export type PluginId = (typeof plugins)[number]["id"];

export const pluginIds: readonly PluginId[] = plugins.map((plugin) => plugin.id);

const pluginsById = new Map(pluginDefinitions.map((plugin) => [plugin.id, plugin]));

export function getPlugin(id: string): PluginDefinition | undefined {
  return pluginsById.get(id);
}

/** The plugin a full rule id belongs to: the longest matching namespace, or core. */
export function getRulePluginId(ruleId: string): PluginId {
  let match: (typeof plugins)[number] = core;

  for (const plugin of plugins) {
    if (plugin.namespace && ruleId.startsWith(`${plugin.namespace}/`) && plugin.namespace.length > (match.namespace?.length ?? 0)) {
      match = plugin;
    }
  }

  return match.id;
}

export function toRuleId(plugin: Pick<PluginDefinition, "namespace">, ruleName: string) {
  return plugin.namespace ? `${plugin.namespace}/${ruleName}` : ruleName;
}
