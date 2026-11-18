import { getPlugin, getRulePluginId, toRuleId } from "./plugins";
import { createEmptyState, generatorReducer } from "./state";

import { GLOBAL_ENVIRONMENTS, SEVERITIES } from "./types";

import type { PluginId } from "./plugins";
import type { StateBase } from "./state";
import type {
  GeneratorState, GlobalEnvironment, PluginCatalog, RuleSetting, Severity,
} from "./types";

/**
 * Turns a legacy `.eslintrc` (JSON, or a package.json with `eslintConfig`)
 * into a generator state. Only what maps onto the generator is kept; the rest
 * is reported so the visitor knows what to carry over by hand.
 */

export type ImportReport = {
  /** Plugins the import turned on. */
  plugins: PluginId[],
  ruleCount: number,
  skippedExtends: string[],
  skippedPlugins: string[],
  skippedRules: string[],
  overrideCount: number
};

export type ImportResult =
  | { ok: true, state: GeneratorState, report: ImportReport }
  | { ok: false, error: "parse" | "notConfig" };

/** Legacy plugin names (as in `plugins` and `plugin:<name>/…`) for each generator plugin. */
const LEGACY_PLUGIN_NAMES: Record<string, PluginId> = {
  "@typescript-eslint": "typescript",
  react: "react",
  "react-hooks": "react-hooks",
  "react-refresh": "react-refresh",
  "jsx-a11y": "jsx-a11y",
  "@next/next": "next",
  import: "import-x",
  "import-x": "import-x",
  n: "node",
  node: "node",
  "simple-import-sort": "simple-import-sort",
  perfectionist: "perfectionist",
  tailwindcss: "tailwindcss",
  "@tanstack/query": "tanstack-query",
  unicorn: "unicorn",
  vitest: "vitest",
  "@vitest": "vitest",
  jest: "jest",
  "@stylistic": "stylistic",
  "@stylistic/js": "stylistic",
  "@stylistic/ts": "stylistic",
  "@stylistic/jsx": "stylistic",
  "@darraghor/nestjs-typed": "nestjs",
};

/** Rule prefixes that changed between the legacy plugins and the ones the generator uses. */
const RULE_PREFIX_RENAMES: [string, string][] = [
  ["import/", "import-x/"],
  ["node/", "n/"],
  ["@stylistic/js/", "@stylistic/"],
  ["@stylistic/ts/", "@stylistic/"],
  ["@stylistic/jsx/", "@stylistic/"],
  ["@vitest/", "vitest/"],
];

/** Shareable configs that are not `plugin:` references. */
const NAMED_EXTENDS: Record<string, [PluginId, string]> = {
  "eslint:recommended": ["core", "recommended"],
  next: ["next", "recommended"],
  "next/core-web-vitals": ["next", "core-web-vitals"],
  "next/typescript": ["typescript", "recommended"],
};

/** Old config names that were renamed. */
const CONFIG_ALIASES: Record<string, string> = {
  "recommended-requiring-type-checking": "recommendedTypeChecked",
  errors: "recommended",
  warnings: "recommended",
};

// Configs that only switch on a parser or other plugins' rules, so there is nothing to carry over.
const IGNORED_EXTENDS = new Set(["plugin:@typescript-eslint/eslint-recommended", "plugin:@typescript-eslint/base"]);

/** eslint-plugin-foo → foo, @scope/eslint-plugin → @scope, @scope/eslint-plugin-foo → @scope/foo. */
export function normalizePluginName(name: string) {
  return name
    .replace(/^eslint-plugin-/, "")
    .replace(/^(@[^/]+)\/eslint-plugin$/, "$1")
    .replace(/^(@[^/]+)\/eslint-plugin-/, "$1/");
}

function normalizeRuleId(ruleId: string) {
  const rename = RULE_PREFIX_RENAMES.find(([from]) => ruleId.startsWith(from));

  return rename ? rename[1] + ruleId.slice(rename[0].length) : ruleId;
}

const simplify = (value: string) => value.replace(/^flat\//, "").toLowerCase().replaceAll(/[^a-z\d]/g, "");

function findConfigId(pluginId: PluginId, name: string) {
  const plugin = getPlugin(pluginId);
  const wanted = simplify(CONFIG_ALIASES[name] ?? name);

  return plugin?.configs.find((config) => simplify(config.id) === wanted)?.id;
}

/** Splits `plugin:@scope/name/config` and `plugin:name/config` into plugin name and config. */
function parsePluginExtend(value: string) {
  const reference = value.slice("plugin:".length);
  const slash = reference.lastIndexOf("/");

  return slash > 0 ? { pluginName: reference.slice(0, slash), configName: reference.slice(slash + 1) } : null;
}

function toSeverity(value: unknown): Severity | null {
  if (value === 0 || value === "off") {
    return "off";
  }

  if (value === 1 || value === "warn") {
    return "warn";
  }

  if (value === 2 || value === "error") {
    return "error";
  }

  return null;
}

function toRuleSetting(value: unknown): RuleSetting | null {
  const [level, ...options] = Array.isArray(value) ? value : [value];
  const severity = toSeverity(level);

  if (!severity || !SEVERITIES.includes(severity)) {
    return null;
  }

  return options.length > 0 ? { severity, options } : { severity };
}

/** Removes // and /* *\/ comments outside strings, as .eslintrc.json allows them. */
export function stripJsonComments(text: string) {
  let output = "";
  let index = 0;
  let inString = false;

  while (index < text.length) {
    const character = text[index];

    if (inString) {
      output += character;

      if (character === "\\") {
        output += text[index + 1] ?? "";
        index += 2;
        continue;
      }

      if (character === "\"") {
        inString = false;
      }

      index += 1;
    } else if (character === "\"") {
      inString = true;
      output += character;
      index += 1;
    } else if (text.startsWith("//", index)) {
      const end = text.indexOf("\n", index);

      index = end === -1 ? text.length : end;
    } else if (text.startsWith("/*", index)) {
      const end = text.indexOf("*/", index + 2);

      index = end === -1 ? text.length : end + 2;
    } else {
      output += character;
      index += 1;
    }
  }

  // Trailing commas are common in hand-written configs.
  return output.replaceAll(/,(\s*[}\]])/g, "$1");
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined ? [] : [value]);
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * @param catalogs The rule catalogs of the plugins involved. When given, rules
 *   the installed plugin versions do not have are skipped, so the output never
 *   names a rule ESLint cannot find.
 */
export function importEslintrc(
  text: string,
  base: StateBase,
  catalogs: Partial<Record<PluginId, PluginCatalog>> = {},
): ImportResult {
  let parsed: unknown;

  try {
    parsed = JSON.parse(stripJsonComments(text));
  } catch {
    return { ok: false, error: "parse" };
  }

  const config = isRecord(parsed) && isRecord(parsed.eslintConfig) ? parsed.eslintConfig : parsed;

  if (!isRecord(config) || !["extends", "plugins", "rules", "env", "overrides"].some((key) => key in config)) {
    return { ok: false, error: "notConfig" };
  }

  const report: ImportReport = {
    plugins: [], ruleCount: 0, skippedExtends: [], skippedPlugins: [], skippedRules: [], overrideCount: asArray(config.overrides).length,
  };

  let state: GeneratorState = { ...createEmptyState(base), plugins: { core: { configs: [], options: {} } } };

  const enablePlugin = (pluginId: PluginId) => {
    if (!(pluginId in state.plugins)) {
      state = generatorReducer(state, { type: "addPlugin", pluginId });
      // Start bare: only the configs the old file extended are switched on.
      state = { ...state, plugins: { ...state.plugins, [pluginId]: { configs: [], options: {} } } };
    }
  };

  const enableConfig = (pluginId: PluginId, configId: string) => {
    enablePlugin(pluginId);

    if (!state.plugins[pluginId].configs.includes(configId)) {
      state = generatorReducer(state, { type: "toggleConfig", pluginId, configId });
    }
  };

  for (const value of asArray(config.extends)) {
    if (typeof value !== "string" || IGNORED_EXTENDS.has(value)) {
      continue;
    }

    const named = NAMED_EXTENDS[value];
    const reference = value.startsWith("plugin:") ? parsePluginExtend(value) : null;
    const pluginId = named?.[0] ?? (reference && LEGACY_PLUGIN_NAMES[normalizePluginName(reference.pluginName)]);
    const configId = pluginId && (named ? findConfigId(pluginId, named[1]) : reference && findConfigId(pluginId, reference.configName));

    if (pluginId && configId) {
      enableConfig(pluginId, configId);
    } else {
      report.skippedExtends.push(value);
    }
  }

  for (const value of asArray(config.plugins)) {
    if (typeof value !== "string") {
      continue;
    }

    const pluginId = LEGACY_PLUGIN_NAMES[normalizePluginName(value)];

    if (pluginId) {
      enablePlugin(pluginId);
    } else {
      report.skippedPlugins.push(value);
    }
  }

  const env = isRecord(config.env) ? config.env : {};
  const globals = GLOBAL_ENVIRONMENTS.filter((environment: GlobalEnvironment) => env[environment] === true);
  const ignores = asArray(config.ignorePatterns).filter((pattern): pattern is string => typeof pattern === "string");

  state = { ...state, globals, ignores };

  for (const [rawRuleId, value] of Object.entries(isRecord(config.rules) ? config.rules : {})) {
    const ruleId = normalizeRuleId(rawRuleId);
    const pluginId = getRulePluginId(ruleId);
    const plugin = getPlugin(pluginId);
    const setting = toRuleSetting(value);
    // A prefixed rule that falls back to core belongs to a plugin the generator does not have.
    const unknownPlugin = pluginId === "core" && ruleId.includes("/");
    const catalog = catalogs[pluginId];
    const unknownRule = catalog !== undefined && plugin !== undefined
      && !catalog.rules.some((rule) => toRuleId(plugin, rule.name) === ruleId);

    if (!setting || unknownPlugin || unknownRule) {
      report.skippedRules.push(rawRuleId);
      continue;
    }

    enablePlugin(pluginId);
    state = generatorReducer(state, { type: "setRule", ruleId, setting });
    report.ruleCount += 1;
  }

  report.plugins = Object.keys(state.plugins).filter((pluginId): pluginId is PluginId => pluginId !== "core" && getPlugin(pluginId) !== undefined);

  return { ok: true, state, report };
}
