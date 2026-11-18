import { describe, expect, it } from "vitest";

import { generateConfig, getConfigFileName, getInstallCommand } from "./generate-config";
import { createStateFromPreset, generatorReducer } from "./state";

import type { CatalogMap } from "./rules";
import type { GeneratorState } from "./types";

const emptyState: GeneratorState = {
  eslintMajor: 9,
  packageManager: "npm",
  configFormat: "mjs",
  globals: [],
  ignores: [],
  plugins: { core: { configs: [], options: {} } },
  rules: {},
};

describe("generateConfig", () => {
  it("generates the TypeScript preset", () => {
    expect(generateConfig(createStateFromPreset("typescript")).code).toMatchInlineSnapshot(`
      "import js from "@eslint/js";
      import stylistic from "@stylistic/eslint-plugin";
      import vitest from "@vitest/eslint-plugin";
      import simpleImportSort from "eslint-plugin-simple-import-sort";
      import { defineConfig, globalIgnores } from "eslint/config";
      import globals from "globals";
      import tseslint from "typescript-eslint";

      export default defineConfig([
        globalIgnores(["dist/**"]),
        { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"] },
        {
          languageOptions: {
            globals: {
              ...globals.node,
            },
          },
        },

        // ESLint core
        js.configs.recommended,

        // typescript-eslint
        tseslint.configs.recommended,

        // Simple Import Sort
        {
          plugins: {
            "simple-import-sort": simpleImportSort,
          },
          rules: {
            "simple-import-sort/exports": "error",
            "simple-import-sort/imports": "error",
          },
        },

        // Vitest
        {
          files: ["**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}", "**/__tests__/**"],
          extends: [vitest.configs.recommended],
        },

        // ESLint Stylistic
        stylistic.configs.recommended,
      ]);
      "
    `);
  });

  it("adds jiti for a TypeScript config file", () => {
    const state = createStateFromPreset("typescript");
    const asTypeScript = generateConfig({ ...state, configFormat: "ts" });

    expect(getConfigFileName("ts")).toBe("eslint.config.ts");
    expect(asTypeScript.packages).toContain("jiti");
    expect(generateConfig(state).packages).not.toContain("jiti");
    expect(generateConfig({ ...createStateFromPreset("react"), configFormat: "ts" }).packages).toContain("@types/eslint-plugin-jsx-a11y");

    const tailwind = generateConfig({ ...createStateFromPreset("next-tailwind"), configFormat: "ts" }).code;

    expect(tailwind).toContain("tailwindcss.configs.recommended as Linter.Config,");
    expect(tailwind).toContain("import type { Linter } from \"eslint\";");
    expect(generateConfig(createStateFromPreset("next-tailwind")).code).not.toContain("Linter");
    // The file itself is the same: defineConfig gives it its types.
    expect(asTypeScript.code).toBe(generateConfig(state).code);
  });

  it("emits an empty config when nothing is selected", () => {
    const { code, packages } = generateConfig(emptyState);

    expect(code).toBe("import { defineConfig } from \"eslint/config\";\n\nexport default defineConfig([]);\n");
    expect(packages).toEqual(["eslint@^9"]);
  });

  it("pins ESLint and @eslint/js to the selected major", () => {
    const state = { ...createStateFromPreset("javascript"), eslintMajor: 10 as const };

    expect(generateConfig(state).packages).toEqual(["eslint@^10", "globals", "@eslint/js@^10", "@stylistic/eslint-plugin"]);
  });

  it("leaves out plugins that contribute nothing", () => {
    const state = generatorReducer(emptyState, { type: "addPlugin", pluginId: "simple-import-sort" });
    const { code, packages } = generateConfig(state);

    expect(code).not.toContain("simple-import-sort");
    expect(packages).toEqual(["eslint@^9"]);
  });

  it("calls the options factory only for options that differ from the defaults", () => {
    let state = generatorReducer(emptyState, { type: "addPlugin", pluginId: "stylistic" });

    state = generatorReducer(state, { type: "setOption", pluginId: "stylistic", key: "indent", value: 2 });
    expect(generateConfig(state).code).toContain("  stylistic.configs.recommended,");

    state = generatorReducer(state, { type: "setOption", pluginId: "stylistic", key: "indent", value: "tab" });
    expect(generateConfig(state).code).toContain("  stylistic.configs.customize({\n    indent: \"tab\",\n  }),");
  });

  it("writes settings options and extra config packages", () => {
    let state = generatorReducer(emptyState, { type: "addPlugin", pluginId: "tailwindcss" });

    state = generatorReducer(state, { type: "setOption", pluginId: "tailwindcss", key: "cssConfigPath", value: "./src/app.css" });
    state = generatorReducer(state, { type: "addPlugin", pluginId: "import-x" });
    state = generatorReducer(state, { type: "toggleConfig", pluginId: "import-x", configId: "typescript" });

    const { code, packages } = generateConfig(state);

    expect(code).toContain("    settings: {\n      tailwindcss: { cssConfigPath: \"./src/app.css\" },\n    },");
    expect(code).toContain("  importX.flatConfigs.recommended,\n  importX.flatConfigs.typescript,");
    expect(packages).toContain("eslint-import-resolver-typescript");
  });

  it("registers the parser through the base config when no typescript-eslint config is selected", () => {
    let state = generatorReducer(emptyState, { type: "addPlugin", pluginId: "typescript" });

    state = generatorReducer(state, { type: "toggleConfig", pluginId: "typescript", configId: "recommended" });

    expect(generateConfig(state).code).toContain("  // typescript-eslint\n  tseslint.configs.base,\n");
  });

  it("scopes a plugin with files to one block, including its rule overrides", () => {
    let state = generatorReducer(emptyState, { type: "addPlugin", pluginId: "jest" });

    state = generatorReducer(state, { type: "setRule", ruleId: "jest/no-focused-tests", setting: { severity: "warn" } });

    expect(generateConfig(state).code).toContain(`  // Jest
  {
    files: ["**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs,mts,cts}", "**/__tests__/**"],
    extends: [jest.configs["flat/recommended"]],
    rules: {
      "jest/no-focused-tests": "warn",
    },
  },`);
  });

  it("formats rule options and wraps long entries", () => {
    const state: GeneratorState = {
      ...emptyState,
      rules: {
        "no-console": { severity: "warn", options: [{ allow: ["warn", "error"] }] },
        "no-restricted-syntax": {
          severity: "error",
          options: [
            { selector: "TSEnumDeclaration", message: "Use a union of string literals instead." },
            { selector: "ForInStatement", message: "Use Object.keys or Object.entries instead." },
          ],
        },
      },
    };

    expect(generateConfig(state).code).toContain(`
    rules: {
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "no-restricted-syntax": [
        "error",
        { selector: "TSEnumDeclaration", message: "Use a union of string literals instead." },
        { selector: "ForInStatement", message: "Use Object.keys or Object.entries instead." },
      ],
    },`);
  });

  it("sets up type information for a type-checked config", () => {
    const { code } = generateConfig(createStateFromPreset("nestjs"));

    expect(code).toContain("        projectService: true,\n        tsconfigRootDir: import.meta.dirname,");
    expect(code).toContain("    files: [\"**/*.{js,mjs,cjs,jsx}\"],\n    extends: [tseslint.configs.disableTypeChecked],");
  });

  it("sets up type information for an individually enabled typed rule", () => {
    const state: GeneratorState = {
      ...createStateFromPreset("typescript"),
      rules: { "@typescript-eslint/no-floating-promises": { severity: "error" } },
    };
    const catalogs: CatalogMap = {
      typescript: {
        packageName: "typescript-eslint",
        version: "0.0.0",
        configs: {},
        rules: [
          {
            name: "no-floating-promises",
            description: "",
            url: "",
            type: "problem",
            fixable: false,
            deprecated: false,
            typed: true,
            hasOptions: true,
          },
        ],
      },
    };

    expect(generateConfig(state).code).not.toContain("projectService");
    expect(generateConfig(state, catalogs).code).toContain("projectService: true");
    expect(
      generateConfig({ ...state, rules: { "@typescript-eslint/no-floating-promises": { severity: "off" } } }, catalogs).code,
    ).not.toContain("projectService");
  });
});

describe("getInstallCommand", () => {
  it("uses each package manager's dev dependency flag", () => {
    const packages = ["eslint@^9", "globals"];

    expect(getInstallCommand("npm", packages)).toBe("npm install --save-dev eslint@^9 globals");
    expect(getInstallCommand("pnpm", packages)).toBe("pnpm add --save-dev eslint@^9 globals");
    expect(getInstallCommand("yarn", packages)).toBe("yarn add --dev eslint@^9 globals");
    expect(getInstallCommand("bun", packages)).toBe("bun add --dev eslint@^9 globals");
  });
});
