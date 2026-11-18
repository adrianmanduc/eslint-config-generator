import { describe, expect, it } from "vitest";

import { createDefaultState, createStateFromPreset, generatorReducer, parseStoredState } from "./state";

describe("generatorReducer", () => {
  it("replaces the whole state", () => {
    const shared = createStateFromPreset("react");

    expect(generatorReducer(createDefaultState(), { type: "replace", state: shared })).toBe(shared);
  });

  it("adds a plugin with its default configs and removes it with its rules", () => {
    let state = createStateFromPreset("javascript");

    state = generatorReducer(state, { type: "addPlugin", pluginId: "react" });
    state = generatorReducer(state, { type: "setRule", ruleId: "react/jsx-key", setting: { severity: "warn" } });
    state = generatorReducer(state, { type: "setRule", ruleId: "react-hooks/rules-of-hooks", setting: { severity: "error" } });
    state = generatorReducer(state, { type: "setRule", ruleId: "no-console", setting: { severity: "warn" } });

    expect(state.plugins.react).toEqual({ configs: ["recommended", "jsx-runtime"], options: {} });

    state = generatorReducer(state, { type: "removePlugin", pluginId: "react" });

    expect(state.plugins.react).toBeUndefined();
    // "react-hooks/..." belongs to another plugin even though it shares the prefix.
    expect(Object.keys(state.rules)).toEqual(["react-hooks/rules-of-hooks", "no-console"]);
  });

  it("never removes ESLint core", () => {
    const state = createDefaultState();

    expect(generatorReducer(state, { type: "removePlugin", pluginId: "core" })).toBe(state);
  });

  it("keeps selected configs in definition order", () => {
    let state = generatorReducer(createStateFromPreset("javascript"), { type: "addPlugin", pluginId: "typescript" });

    state = generatorReducer(state, { type: "toggleConfig", pluginId: "typescript", configId: "stylistic" });
    state = generatorReducer(state, { type: "toggleConfig", pluginId: "typescript", configId: "strict" });

    expect(state.plugins.typescript?.configs).toEqual(["recommended", "strict", "stylistic"]);
  });

  it("keeps the ESLint version and package manager when a preset is applied", () => {
    let state = generatorReducer(createDefaultState(), { type: "setEslintMajor", eslintMajor: 10 });

    state = generatorReducer(state, { type: "setPackageManager", packageManager: "pnpm" });
    state = generatorReducer(state, { type: "applyPreset", presetId: "nestjs" });

    expect(state).toMatchObject({ eslintMajor: 10, packageManager: "pnpm", globals: ["node"] });
    expect(state.plugins.typescript?.configs).toEqual(["recommendedTypeChecked"]);
  });

  it("resets to ESLint core only, keeping the ESLint version and package manager", () => {
    let state = generatorReducer(createStateFromPreset("next-tailwind"), { type: "setEslintMajor", eslintMajor: 10 });

    state = generatorReducer(state, { type: "setPackageManager", packageManager: "bun" });
    state = generatorReducer(state, { type: "reset" });

    expect(state).toEqual({
      eslintMajor: 10,
      packageManager: "bun",
      configFormat: "mjs",
      globals: [],
      ignores: [],
      plugins: { core: { configs: ["recommended"], options: {} } },
      rules: {},
    });
  });

  it("clears the rules of one plugin only", () => {
    let state = createStateFromPreset("nestjs");

    state = generatorReducer(state, { type: "clearPluginRules", pluginId: "typescript" });

    expect(Object.keys(state.rules)).toEqual(["simple-import-sort/imports", "simple-import-sort/exports"]);
  });
});

describe("parseStoredState", () => {
  it("defaults the config format of states saved before it existed", () => {
    const { configFormat, ...saved } = createStateFromPreset("react", { eslintMajor: 9, packageManager: "npm", configFormat: "ts" });

    expect(configFormat).toBe("ts");
    expect(parseStoredState(saved)?.configFormat).toBe("mjs");
  });

  it("keeps the config format through presets and resets", () => {
    let state = generatorReducer(createDefaultState(), { type: "setConfigFormat", configFormat: "ts" });

    state = generatorReducer(state, { type: "applyPreset", presetId: "nestjs" });
    expect(state.configFormat).toBe("ts");
    expect(generatorReducer(state, { type: "reset" }).configFormat).toBe("ts");
  });

  it("round-trips a valid state", () => {
    const state = createStateFromPreset("next-tailwind");

    expect(parseStoredState(JSON.parse(JSON.stringify(state)))).toEqual(state);
  });

  it("rejects malformed data", () => {
    expect(parseStoredState(null)).toBeNull();
    expect(parseStoredState({ ...createDefaultState(), eslintMajor: 8 })).toBeNull();
    expect(parseStoredState({ ...createDefaultState(), rules: { "no-console": { severity: "fatal" } } })).toBeNull();
  });

  it("drops plugins, configs and rules that no longer exist and restores core", () => {
    const stored = {
      ...createDefaultState(),
      plugins: {
        typescript: { configs: ["recommended", "removed-config"], options: {} },
        "removed-plugin": { configs: [], options: {} },
      },
      rules: {
        "@typescript-eslint/no-explicit-any": { severity: "off" },
        "react/jsx-key": { severity: "error" },
      },
    };

    const state = parseStoredState(stored);

    expect(state?.plugins).toEqual({
      typescript: { configs: ["recommended"], options: {} },
      core: { configs: ["recommended"], options: {} },
    });
    expect(Object.keys(state?.rules ?? {})).toEqual(["@typescript-eslint/no-explicit-any"]);
  });
});
