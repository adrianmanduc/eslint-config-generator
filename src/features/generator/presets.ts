import type { PluginId } from "./plugins";
import type { GlobalEnvironment, PluginOptionValue, RuleSetting } from "./types";

export type PresetPlugin = {
  /** Defaults to the plugin's `defaultConfigs`. */
  configs?: readonly string[],
  options?: Readonly<Record<string, PluginOptionValue>>
};

export type Preset = {
  id: string,
  /** The path of the preset's own page, e.g. /nextjs. */
  slug: string,
  globals: readonly GlobalEnvironment[],
  ignores: readonly string[],
  plugins: Readonly<Partial<Record<PluginId, PresetPlugin>>>,
  rules?: Readonly<Record<string, RuleSetting>>
};

const importSortRules = {
  "simple-import-sort/imports": { severity: "error" },
  "simple-import-sort/exports": { severity: "error" },
} as const satisfies Record<string, RuleSetting>;

/** The formatting most application codebases use: double quotes and semicolons. */
const appStyle = { options: { quotes: "double", semi: true } } as const satisfies PresetPlugin;

const nextPlugins = {
  core: {},
  typescript: {},
  react: {},
  "react-hooks": {},
  "jsx-a11y": {},
  next: {},
  "simple-import-sort": {},
  vitest: {},
  stylistic: appStyle,
} as const satisfies Preset["plugins"];

const nextIgnores = [".next/**", "out/**", "build/**", "next-env.d.ts"] as const;

/** Starting points for popular stacks. Names and descriptions live in messages. */
export const presets = [
  {
    id: "javascript",
    slug: "javascript",
    globals: ["browser", "node"],
    ignores: ["dist/**"],
    plugins: { core: {}, stylistic: {} },
  },
  {
    id: "typescript",
    slug: "typescript",
    globals: ["node"],
    ignores: ["dist/**"],
    plugins: {
      core: {}, typescript: {}, "simple-import-sort": {}, vitest: {}, stylistic: {}
    },
    rules: importSortRules,
  },
  {
    id: "react",
    slug: "react",
    globals: ["browser"],
    ignores: ["dist/**"],
    plugins: {
      core: {},
      typescript: {},
      react: {},
      "react-hooks": {},
      "react-refresh": {},
      "jsx-a11y": {},
      "simple-import-sort": {},
      vitest: {},
      stylistic: appStyle,
    },
    rules: importSortRules,
  },
  {
    id: "next",
    slug: "nextjs",
    globals: ["browser", "node"],
    ignores: nextIgnores,
    plugins: nextPlugins,
    rules: importSortRules,
  },
  {
    id: "next-tailwind",
    slug: "nextjs-tailwind",
    globals: ["browser", "node"],
    ignores: nextIgnores,
    plugins: { ...nextPlugins, tailwindcss: {} },
    rules: importSortRules,
  },
  {
    id: "express",
    slug: "express",
    globals: ["node"],
    ignores: ["dist/**", "coverage/**"],
    plugins: {
      core: {}, typescript: {}, node: {}, "simple-import-sort": {}, stylistic: appStyle
    },
    rules: importSortRules,
  },
  {
    id: "nestjs",
    slug: "nestjs",
    globals: ["node"],
    ignores: ["dist/**", "coverage/**"],
    plugins: {
      core: {},
      typescript: { configs: ["recommendedTypeChecked"] },
      nestjs: {},
      "simple-import-sort": {},
      jest: {},
      stylistic: appStyle,
    },
    rules: {
      ...importSortRules,
      // The relaxations the official NestJS starter ships with.
      "@typescript-eslint/no-explicit-any": { severity: "off" },
      "@typescript-eslint/no-floating-promises": { severity: "warn" },
      "@typescript-eslint/no-unsafe-argument": { severity: "warn" },
    },
  },
] as const satisfies readonly Preset[];

export type PresetId = (typeof presets)[number]["id"];

export const DEFAULT_PRESET_ID: PresetId = "typescript";

export function getPresetBySlug(slug: string): Preset | undefined {
  return presets.find((preset) => preset.slug === slug);
}

export function getPreset(id: string): Preset | undefined {
  return presets.find((preset) => preset.id === id);
}
