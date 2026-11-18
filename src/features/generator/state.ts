import { z } from "zod";

import { getPlugin, getRulePluginId, pluginDefinitions } from "./plugins";
import { DEFAULT_PRESET_ID, getPreset } from "./presets";
import {
  CONFIG_FORMATS, ESLINT_MAJORS, GLOBAL_ENVIRONMENTS, PACKAGE_MANAGERS, SEVERITIES,
} from "./types";

import type {
  ConfigFormat,
  EslintMajor,
  GeneratorState,
  GlobalEnvironment,
  PackageManager,
  PluginOptionValue,
  PluginState,
  RuleSetting,
} from "./types";

export type GeneratorAction =
  | { type: "setEslintMajor", eslintMajor: EslintMajor }
  | { type: "setPackageManager", packageManager: PackageManager }
  | { type: "setConfigFormat", configFormat: ConfigFormat }
  | { type: "toggleGlobal", environment: GlobalEnvironment }
  | { type: "setIgnores", ignores: string[] }
  | { type: "addPlugin", pluginId: string }
  | { type: "removePlugin", pluginId: string }
  | { type: "toggleConfig", pluginId: string, configId: string }
  | { type: "setOption", pluginId: string, key: string, value: PluginOptionValue }
  | { type: "setRule", ruleId: string, setting: RuleSetting }
  | { type: "clearRule", ruleId: string }
  | { type: "clearPluginRules", pluginId: string }
  | { type: "applyPreset", presetId: string }
  | { type: "reset" }
  | { type: "replace", state: GeneratorState };

/** The choices that are not stack-specific and survive presets and resets. */
export type StateBase = Pick<GeneratorState, "eslintMajor" | "packageManager"> & { configFormat?: ConfigFormat };

function createPluginState(pluginId: string, overrides: Partial<PluginState> = {}): PluginState {
  return {
    configs: [...(overrides.configs ?? getPlugin(pluginId)?.defaultConfigs ?? [])],
    options: { ...overrides.options },
  };
}

/** Builds a state from a preset, keeping the choices that are not stack-specific. */
export function createStateFromPreset(
  presetId: string,
  base: StateBase = { eslintMajor: 9, packageManager: "npm" },
): GeneratorState {
  const preset = getPreset(presetId) ?? getPreset(DEFAULT_PRESET_ID);

  if (!preset) {
    throw new Error("The default preset is missing");
  }

  return {
    eslintMajor: base.eslintMajor,
    packageManager: base.packageManager,
    configFormat: base.configFormat ?? "mjs",
    globals: [...preset.globals],
    ignores: [...preset.ignores],
    plugins: Object.fromEntries(
      Object.entries(preset.plugins).map(([pluginId, plugin]) => [
        pluginId,
        createPluginState(pluginId, { configs: plugin.configs ? [...plugin.configs] : undefined, options: plugin.options }),
      ]),
    ),
    rules: Object.fromEntries(Object.entries(preset.rules ?? {}).map(([ruleId, setting]) => [ruleId, { ...setting }])),
  };
}

/** A blank config: ESLint core with its recommended rules and nothing else. */
export function createEmptyState(base: StateBase): GeneratorState {
  return {
    eslintMajor: base.eslintMajor,
    packageManager: base.packageManager,
    configFormat: base.configFormat ?? "mjs",
    globals: [],
    ignores: [],
    plugins: { core: createPluginState("core") },
    rules: {},
  };
}

export function createDefaultState(): GeneratorState {
  return createStateFromPreset(DEFAULT_PRESET_ID);
}

function omitKey<Value>(record: Record<string, Value>, key: string) {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key));
}

function updatePlugin(state: GeneratorState, pluginId: string, update: (plugin: PluginState) => PluginState): GeneratorState {
  const plugin = state.plugins[pluginId];

  return plugin ? { ...state, plugins: { ...state.plugins, [pluginId]: update(plugin) } } : state;
}

function withoutPluginRules(rules: GeneratorState["rules"], pluginId: string) {
  return Object.fromEntries(Object.entries(rules).filter(([ruleId]) => getRulePluginId(ruleId) !== pluginId));
}

export function generatorReducer(state: GeneratorState, action: GeneratorAction): GeneratorState {
  switch (action.type) {
    case "setEslintMajor":
      return { ...state, eslintMajor: action.eslintMajor };

    case "setPackageManager":
      return { ...state, packageManager: action.packageManager };

    case "setConfigFormat":
      return { ...state, configFormat: action.configFormat };

    case "toggleGlobal": {
      const enabled = state.globals.includes(action.environment);
      const selected = enabled ? state.globals.filter((item) => item !== action.environment) : [...state.globals, action.environment];

      // Keep a stable order regardless of the click order.
      return { ...state, globals: GLOBAL_ENVIRONMENTS.filter((item) => selected.includes(item)) };
    }

    case "setIgnores":
      return { ...state, ignores: action.ignores };

    case "addPlugin":
      if (state.plugins[action.pluginId] || !getPlugin(action.pluginId)) {
        return state;
      }

      return { ...state, plugins: { ...state.plugins, [action.pluginId]: createPluginState(action.pluginId) } };

    case "removePlugin":
      if (!state.plugins[action.pluginId] || getPlugin(action.pluginId)?.required) {
        return state;
      }

      return {
        ...state,
        plugins: omitKey(state.plugins, action.pluginId),
        rules: withoutPluginRules(state.rules, action.pluginId),
      };

    case "toggleConfig":
      return updatePlugin(state, action.pluginId, (plugin) => {
        const selected = plugin.configs.includes(action.configId)
          ? plugin.configs.filter((configId) => configId !== action.configId)
          : [...plugin.configs, action.configId];
        const order = getPlugin(action.pluginId)?.configs.map((config) => config.id) ?? [];

        return { ...plugin, configs: order.filter((configId) => selected.includes(configId)) };
      });

    case "setOption":
      return updatePlugin(state, action.pluginId, (plugin) => ({
        ...plugin,
        options: { ...plugin.options, [action.key]: action.value },
      }));

    case "setRule":
      return { ...state, rules: { ...state.rules, [action.ruleId]: action.setting } };

    case "clearRule":
      return action.ruleId in state.rules ? { ...state, rules: omitKey(state.rules, action.ruleId) } : state;

    case "clearPluginRules":
      return { ...state, rules: withoutPluginRules(state.rules, action.pluginId) };

    case "applyPreset":
      return createStateFromPreset(action.presetId, state);

    case "reset":
      return createEmptyState(state);

    case "replace":
      return action.state;

    default:
      return state;
  }
}

const storedStateSchema = z.object({
  eslintMajor: z.union(ESLINT_MAJORS.map((major) => z.literal(major))),
  packageManager: z.enum(PACKAGE_MANAGERS),
  // Added after launch: older saved states and links have no format.
  configFormat: z.enum(CONFIG_FORMATS).default("mjs"),
  globals: z.array(z.enum(GLOBAL_ENVIRONMENTS)),
  ignores: z.array(z.string()),
  plugins: z.record(
    z.string(),
    z.object({
      configs: z.array(z.string()),
      options: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    }),
  ),
  rules: z.record(
    z.string(),
    z.object({
      severity: z.enum(SEVERITIES),
      options: z.array(z.unknown()).optional(),
    }),
  ),
});

/**
 * Validates a state read from storage. Plugins and configs that no longer
 * exist are dropped, so a stored state survives registry changes.
 */
export function parseStoredState(value: unknown): GeneratorState | null {
  const result = storedStateSchema.safeParse(value);

  if (!result.success) {
    return null;
  }

  const state = result.data;
  const storedPlugins = Object.fromEntries(
    Object.entries(state.plugins).flatMap(([pluginId, pluginState]) => {
      const plugin = getPlugin(pluginId);

      if (!plugin) {
        return [];
      }

      const configIds = plugin.configs.map((config) => config.id);

      return [[pluginId, { ...pluginState, configs: configIds.filter((configId) => pluginState.configs.includes(configId)) }]];
    }),
  );

  for (const plugin of pluginDefinitions) {
    if (plugin.required && !storedPlugins[plugin.id]) {
      storedPlugins[plugin.id] = createPluginState(plugin.id);
    }
  }

  return {
    ...state,
    plugins: storedPlugins,
    rules: Object.fromEntries(Object.entries(state.rules).filter(([ruleId]) => {
      const pluginId = getRulePluginId(ruleId);

      // Core rules have no prefix; a prefixed rule that falls back to core
      // belongs to a plugin that no longer exists.
      return pluginId in storedPlugins && !(pluginId === "core" && ruleId.includes("/"));
    })),
  };
}
