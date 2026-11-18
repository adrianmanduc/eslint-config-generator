export const ESLINT_MAJORS = [9, 10] as const;

export type EslintMajor = (typeof ESLINT_MAJORS)[number];

export const SEVERITIES = ["off", "warn", "error"] as const;

export type Severity = (typeof SEVERITIES)[number];

/** A rule entry as written in a flat config: a severity, optionally with options. */
export type RuleEntry = Severity | [Severity, ...unknown[]];

export const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun"] as const;

export type PackageManager = (typeof PACKAGE_MANAGERS)[number];

/** eslint.config.mjs, or eslint.config.ts (ESLint loads it with jiti). */
export const CONFIG_FORMATS = ["mjs", "ts"] as const;

export type ConfigFormat = (typeof CONFIG_FORMATS)[number];

export const GLOBAL_ENVIRONMENTS = ["browser", "node"] as const;

export type GlobalEnvironment = (typeof GLOBAL_ENVIRONMENTS)[number];

export const PLUGIN_CATEGORIES = ["core", "language", "quality", "framework", "backend", "testing", "imports", "style"] as const;

export type PluginCategory = (typeof PLUGIN_CATEGORIES)[number];

export type PluginOptionValue = string | number | boolean;

/** One user-editable option of a plugin (a factory argument or a settings value). */
export type PluginOptionDefinition =
  | { key: string, type: "boolean", default: boolean }
  | { key: string, type: "select", choices: readonly (string | number)[], default: string | number }
  | { key: string, type: "text", default: string, placeholder?: string };

/** Property path on the plugin's default import, for example ["configs", "flat", "recommended"]. */
export type Accessor = readonly string[];

export type PluginConfigDefinition = {
  /** Stable id, shown in the UI and stored in the generator state. */
  id: string,
  accessor: Accessor,
  /** The config needs type information (`parserOptions.projectService`). */
  typeChecked?: boolean,
  /** Only adjusts rules of another config; it does not register the plugin itself. */
  addon?: boolean,
  /**
   * The plugin's published types for this config do not match ESLint's, so
   * eslint.config.ts casts it to `Linter.Config` to type-check.
   */
  typesMismatch?: boolean,
  /** Extra packages this config needs at runtime. */
  packages?: readonly string[]
};

export type PluginOptionsDefinition = {
  fields: readonly PluginOptionDefinition[],
  target:
    /** Options that differ from their defaults replace `configId` with a factory call. */
    | { kind: "factory", configId: string, accessor: Accessor }
    /** Non-empty options are written to `settings[key]`. */
    | { kind: "settings", key: string }
};

/**
 * Everything the generator knows about a plugin. Definitions are plain data:
 * `scripts/generate-rule-catalog.mjs` reads them to build the rule catalog, and
 * the app reads them to render the UI and emit the config.
 */
export type PluginDefinition = {
  /** Stable id: the catalog file name and the message key. */
  id: string,
  /** Display name. A package or project name, so it is not translated. */
  name: string,
  packageName: string,
  /** Type declarations for a package that ships none; installed for eslint.config.ts. */
  typesPackage?: string,
  /** Identifier used for the default import in the generated config. */
  importName: string,
  /** Rule prefix, or null for ESLint core rules. */
  namespace: string | null,
  category: PluginCategory,
  docsUrl: string,
  /** File types the plugin lints beyond plain JavaScript; the config has to match them explicitly. */
  fileTypes?: readonly ("jsx" | "typescript")[],
  /** Limits the plugin to these globs (test files, for example). Without it the plugin applies to every linted file. */
  files?: readonly string[],
  /** Cannot be removed (ESLint core). */
  required?: boolean,
  configs: readonly PluginConfigDefinition[],
  /** Config ids selected when the plugin is added. */
  defaultConfigs: readonly string[],
  /** Where the plugin object lives on the default import. Defaults to the import itself. */
  pluginAccessor?: Accessor,
  /** Config emitted when no shared config is selected (for example to register a parser). */
  baseAccessor?: Accessor,
  /** Static `settings` emitted with the plugin. */
  settings?: Readonly<Record<string, unknown>>,
  options?: PluginOptionsDefinition
};

export type RuleMeta = {
  /** Rule name without the plugin namespace. */
  name: string,
  description: string,
  url: string,
  type: "problem" | "suggestion" | "layout" | null,
  fixable: boolean,
  deprecated: boolean,
  /** Needs type information. */
  typed: boolean,
  hasOptions: boolean
};

/** Generated rule metadata of one plugin (see `catalog/`). */
export type PluginCatalog = {
  packageName: string,
  version: string,
  rules: RuleMeta[],
  /** Config id to the full-name rule entries that config sets. */
  configs: Record<string, Record<string, RuleEntry>>
};

export type PluginManifestEntry = {
  version: string,
  /** The plugin's `peerDependencies.eslint` range, or null when it declares none. */
  eslintPeerRange: string | null,
  ruleCount: number
};

export type PluginState = {
  configs: string[],
  options: Record<string, PluginOptionValue>
};

export type RuleSetting = {
  severity: Severity,
  /** Rule options: the entries that follow the severity. */
  options?: unknown[]
};

export type GeneratorState = {
  eslintMajor: EslintMajor,
  packageManager: PackageManager,
  configFormat: ConfigFormat,
  globals: GlobalEnvironment[],
  ignores: string[],
  /** Enabled plugins by id. A missing key means the plugin is not used. */
  plugins: Record<string, PluginState>,
  /** User rule overrides by full rule id (for example "@stylistic/indent"). */
  rules: Record<string, RuleSetting>
};
