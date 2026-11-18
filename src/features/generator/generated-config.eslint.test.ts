// @vitest-environment node
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

import { ESLint } from "eslint";
import ts from "typescript";
import { afterAll, describe, expect, it } from "vitest";

import { manifest } from "./catalog";
import { generateConfig, getConfigFileName } from "./generate-config";
import { importEslintrc } from "./import-eslintrc";
import { pluginDefinitions } from "./plugins";
import { presets } from "./presets";
import { rangeSupportsMajor } from "./semver";
import { createStateFromPreset, generatorReducer } from "./state";

import type { PluginId } from "./plugins";
import type { EslintMajor, GeneratorState } from "./types";

/**
 * The ESLint this repository runs. A plugin that does not support it (Unicorn
 * needs ESLint 10) cannot be loaded here, so it is left out of these tests.
 */
const installedMajor = Number(ESLint.version.split(".")[0]) as EslintMajor;
const loadablePlugins = pluginDefinitions.filter((plugin) =>
  rangeSupportsMajor(manifest[plugin.id as PluginId].eslintPeerRange, installedMajor));

/**
 * Loads generated configs in the real ESLint to prove they are valid. The
 * configs are written under node_modules so their imports resolve to the
 * plugin packages installed for the rule catalog.
 */
const outputDirectory = path.join(process.cwd(), "node_modules", ".generated-config-test");

async function loadInEslint(name: string, state: GeneratorState, fileName = "index.js") {
  const directory = path.join(outputDirectory, name);
  const configFile = path.join(directory, getConfigFileName(state.configFormat));

  mkdirSync(directory, { recursive: true });
  writeFileSync(configFile, generateConfig(state).code);

  const eslint = new ESLint({ cwd: directory, overrideConfigFile: configFile });

  return eslint.calculateConfigForFile(path.join(directory, "src", fileName)) as Promise<{ rules?: Record<string, unknown> } | undefined>;
}

describe("generated config in ESLint", () => {
  afterAll(() => {
    rmSync(outputDirectory, { force: true, recursive: true });
  });

  it.each(presets.map((preset) => preset.id))("loads the %s preset", async (presetId) => {
    const state = createStateFromPreset(presetId);
    const usesTypeScript = "typescript" in state.plugins;
    const config = await loadInEslint(presetId, state, usesTypeScript ? "index.ts" : "index.js");

    // An undefined config means ESLint would skip the file.
    expect(config).toBeDefined();

    for (const ruleId of Object.keys(state.rules)) {
      expect(config?.rules).toHaveProperty([ruleId]);
    }
  });

  it("applies a scoped plugin to its own files only", async () => {
    const state = createStateFromPreset("typescript");
    const hasVitestRule = (config: { rules?: Record<string, unknown> } | undefined) =>
      Object.keys(config?.rules ?? {}).some((ruleId) => ruleId.startsWith("vitest/"));

    expect(hasVitestRule(await loadInEslint("scoped", state, "sum.test.ts"))).toBe(true);
    expect(hasVitestRule(await loadInEslint("scoped", state, "sum.ts"))).toBe(false);
  });

  it("loads every plugin with all of its shared configs and with none", async () => {
    let allConfigs = createStateFromPreset("javascript");
    let noConfigs = createStateFromPreset("javascript");

    for (const plugin of loadablePlugins) {
      allConfigs = generatorReducer(allConfigs, { type: "addPlugin", pluginId: plugin.id });
      noConfigs = generatorReducer(noConfigs, { type: "addPlugin", pluginId: plugin.id });

      for (const config of plugin.configs) {
        if (!allConfigs.plugins[plugin.id]?.configs.includes(config.id)) {
          allConfigs = generatorReducer(allConfigs, { type: "toggleConfig", pluginId: plugin.id, configId: config.id });
        }

        if (noConfigs.plugins[plugin.id]?.configs.includes(config.id)) {
          noConfigs = generatorReducer(noConfigs, { type: "toggleConfig", pluginId: plugin.id, configId: config.id });
        }
      }
    }

    // One rule per plugin, so a plugin without a shared config has to be registered by the generator.
    noConfigs = {
      ...noConfigs,
      rules: {
        "no-console": { severity: "warn" },
        "@typescript-eslint/no-explicit-any": { severity: "error" },
        "react/jsx-key": { severity: "error" },
        "react-hooks/rules-of-hooks": { severity: "error" },
        "jsx-a11y/alt-text": { severity: "error" },
        "@next/next/no-img-element": { severity: "warn" },
        "n/no-deprecated-api": { severity: "error" },
        "@darraghor/nestjs-typed/controllers-should-supply-api-tags": { severity: "error" },
        "import-x/no-duplicates": { severity: "error" },
        "simple-import-sort/imports": { severity: "error" },
        "perfectionist/sort-imports": { severity: "error" },
        "tailwindcss/classnames-order": { severity: "warn" },
        "react-refresh/only-export-components": { severity: "warn" },
        "@tanstack/query/exhaustive-deps": { severity: "error" },
        "@stylistic/quotes": { severity: "error", options: ["double", { avoidEscape: true }] },
      },
    };

    await expect(loadInEslint("all-configs", allConfigs)).resolves.toBeDefined();

    const config = await loadInEslint("no-configs", noConfigs, "index.tsx");

    expect(Object.keys(config?.rules ?? {}).sort()).toEqual(Object.keys(noConfigs.rules).sort());
    expect(config?.rules?.["@stylistic/quotes"]).toEqual([2, "double", expect.objectContaining({ avoidEscape: true })]);
  });
  it("loads the TypeScript config file format", async () => {
    const state = { ...createStateFromPreset("next"), configFormat: "ts" as const };
    const config = await loadInEslint("typescript-format", state, "page.tsx");

    expect(config?.rules).toHaveProperty(["@next/next/no-img-element"]);
  });

  it("type-checks eslint.config.ts under a strict tsconfig", () => {
    // Frameworks such as Next.js type-check every .ts file, the config included.
    const files = presets.map((preset) => {
      const directory = path.join(outputDirectory, `typed-${preset.id}`);
      const configFile = path.join(directory, getConfigFileName("ts"));

      mkdirSync(directory, { recursive: true });
      writeFileSync(configFile, generateConfig({ ...createStateFromPreset(preset.id), configFormat: "ts" }).code);

      return configFile;
    });
    const program = ts.createProgram(files, {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      noEmit: true,
      skipLibCheck: true,
      strict: true,
      target: ts.ScriptTarget.ES2022,
      types: ["node"],
    });
    const errors = ts.getPreEmitDiagnostics(program).map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, " "));

    expect(errors).toEqual([]);
  });

  it("loads a config imported from an .eslintrc", async () => {
    const result = importEslintrc(JSON.stringify({
      env: { browser: true },
      extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:react/recommended", "next/core-web-vitals"],
      plugins: ["simple-import-sort"],
      rules: { "import/no-cycle": "error", "simple-import-sort/imports": "error", "react/prop-types": "off" },
    }), { eslintMajor: installedMajor, packageManager: "npm" });

    if (!result.ok) {
      throw new Error(result.error);
    }

    const config = await loadInEslint("imported", result.state, "page.tsx");

    expect(config?.rules).toHaveProperty(["import-x/no-cycle"]);
    expect(config?.rules).toHaveProperty(["@next/next/no-img-element"]);
  });
});
