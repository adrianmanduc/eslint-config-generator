import { readFileSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

import generatorMessages from "../../../messages/en/generator.json";

import { loadCatalog, manifest } from "./catalog";
import {
  getRulePluginId, pluginDefinitions, pluginIds, toRuleId,
} from "./plugins";
import { presets } from "./presets";
import { ESLINT_MAJORS, PLUGIN_CATEGORIES } from "./types";

import type { Preset } from "./presets";

/** Guards the steps of adding a plugin or preset (see docs/generator.md). */
describe("plugin registry", () => {
  it("has unique ids, import names and namespaces", () => {
    for (const key of ["id", "importName", "namespace", "packageName"] as const) {
      const values = pluginDefinitions.map((plugin) => plugin[key]);

      expect(new Set(values).size, key).toBe(values.length);
    }
  });

  it.each(pluginIds)("%s has a catalog that matches its definition", async (pluginId) => {
    const plugin = pluginDefinitions.find((item) => item.id === pluginId);

    expect(manifest[pluginId]).toBeDefined();

    for (const eslintMajor of ESLINT_MAJORS) {
      const catalog = await loadCatalog(pluginId, eslintMajor);

      expect(catalog.packageName).toBe(plugin?.packageName);
      expect(catalog.rules.length).toBeGreaterThan(0);
      expect(Object.keys(catalog.configs)).toEqual(plugin?.configs.map((config) => config.id));
    }
  });

  it.each(pluginIds)("%s has default configs and options that exist", (pluginId) => {
    const plugin = pluginDefinitions.find((item) => item.id === pluginId);
    const configIds = plugin?.configs.map((config) => config.id) ?? [];

    expect(configIds).toEqual(expect.arrayContaining([...(plugin?.defaultConfigs ?? [])]));

    if (plugin?.options?.target.kind === "factory") {
      expect(configIds).toContain(plugin.options.target.configId);
    }
  });

  it.each(pluginIds.filter((pluginId) => pluginId !== "core"))("%s catalog was generated from the installed package", (pluginId) => {
    const plugin = pluginDefinitions.find((item) => item.id === pluginId);
    const packageFile = path.join(process.cwd(), "node_modules", plugin?.packageName ?? "", "package.json");
    const installed = JSON.parse(readFileSync(packageFile, "utf8")) as { version: string };

    // A mismatch means a plugin was upgraded without running `pnpm catalog`.
    expect(manifest[pluginId].version).toBe(installed.version);
  });

  it("has copy for every plugin, category and preset", () => {
    expect(Object.keys(generatorMessages.plugins.descriptions).sort()).toEqual([...pluginIds].sort());
    expect(Object.keys(generatorMessages.plugins.categories).sort()).toEqual([...PLUGIN_CATEGORIES].sort());
    expect(Object.keys(generatorMessages.presets.items).sort()).toEqual(presets.map((preset) => preset.id).sort());
    expect(Object.keys(generatorMessages.presets.pages).sort()).toEqual(presets.map((preset) => preset.id).sort());
  });
});

describe("presets", () => {
  const presetList: readonly Preset[] = presets;

  it.each(presetList.map((preset) => [preset.id, preset] as const))("%s only references what exists", async (_id, preset) => {
    expect(Object.keys(preset.plugins)).toContain("core");

    for (const [pluginId, presetPlugin] of Object.entries(preset.plugins)) {
      const plugin = pluginDefinitions.find((item) => item.id === pluginId);

      expect(plugin, pluginId).toBeDefined();
      expect(plugin?.configs.map((config) => config.id)).toEqual(expect.arrayContaining([...(presetPlugin.configs ?? [])]));
      expect(plugin?.options?.fields.map((field) => field.key) ?? []).toEqual(
        expect.arrayContaining(Object.keys(presetPlugin.options ?? {})),
      );
    }

    for (const ruleId of Object.keys(preset.rules ?? {})) {
      const pluginId = getRulePluginId(ruleId);
      const plugin = pluginDefinitions.find((item) => item.id === pluginId);
      const catalog = await loadCatalog(pluginId, 9);

      expect(Object.keys(preset.plugins), ruleId).toContain(pluginId);
      expect(catalog.rules.map((rule) => plugin && toRuleId(plugin, rule.name))).toContain(ruleId);
    }
  });
});
