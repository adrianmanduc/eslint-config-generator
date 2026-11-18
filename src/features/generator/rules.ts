import { pluginDefinitions } from "./plugins";

import type {
  GeneratorState, PluginCatalog, PluginDefinition, PluginState, RuleEntry, RuleSetting, Severity,
} from "./types";

export type CatalogMap = Partial<Record<string, PluginCatalog>>;

/** What the selected shared configs set for a rule, and which config did it. */
export type BaseRule = {
  entry: RuleEntry,
  pluginId: string,
  configId: string
};

export function getEntrySeverity(entry: RuleEntry): Severity {
  return Array.isArray(entry) ? entry[0] : entry;
}

export function getEntryOptions(entry: RuleEntry): unknown[] {
  return Array.isArray(entry) ? entry.slice(1) : [];
}

export function toRuleEntry(setting: RuleSetting): RuleEntry {
  return setting.options && setting.options.length > 0 ? [setting.severity, ...setting.options] : setting.severity;
}

/** The plugin options the user set to something other than the default. */
export function getChangedOptions(plugin: PluginDefinition, pluginState: PluginState) {
  const fields = plugin.options?.fields ?? [];

  return Object.fromEntries(
    fields.flatMap((field) => {
      const value = pluginState.options[field.key];

      return value === undefined || value === field.default ? [] : [[field.key, value] as const];
    }),
  );
}

/**
 * Resolves the rules set by the selected shared configs, in the order the
 * generated config applies them, so a later plugin can override an earlier one
 * (typescript-eslint turning off core rules, for example).
 */
export function resolveBaseRules(state: Pick<GeneratorState, "plugins">, catalogs: CatalogMap): Map<string, BaseRule> {
  const baseRules = new Map<string, BaseRule>();

  for (const plugin of pluginDefinitions) {
    const pluginState = state.plugins[plugin.id];
    const catalog = catalogs[plugin.id];

    if (!pluginState || !catalog) {
      continue;
    }

    for (const config of plugin.configs) {
      if (!pluginState.configs.includes(config.id)) {
        continue;
      }

      // A factory call with custom options produces rule options the catalog cannot know.
      const target = plugin.options?.target;
      const hasUnknownOptions = target?.kind === "factory" && target.configId === config.id && Object.keys(getChangedOptions(plugin, pluginState)).length > 0;

      for (const [ruleId, entry] of Object.entries(catalog.configs[config.id] ?? {})) {
        baseRules.set(ruleId, { entry: hasUnknownOptions ? getEntrySeverity(entry) : entry, pluginId: plugin.id, configId: config.id });
      }
    }
  }

  return baseRules;
}

/** Parses the options a user typed: a JSON array of the entries after the severity. */
export function parseRuleOptions(text: string): { ok: true, options: unknown[] } | { ok: false } {
  if (text.trim() === "") {
    return { ok: true, options: [] };
  }

  try {
    const value: unknown = JSON.parse(text);

    return Array.isArray(value) ? { ok: true, options: value } : { ok: false };
  } catch {
    return { ok: false };
  }
}
