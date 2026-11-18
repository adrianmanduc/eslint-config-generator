import { describe, expect, it } from "vitest";

import { importEslintrc, normalizePluginName, stripJsonComments } from "./import-eslintrc";

import type { PluginCatalog } from "./types";

const base = { eslintMajor: 9, packageManager: "pnpm" } as const;

const nextApp = `{
  // A typical Next.js app before flat config
  "root": true,
  "env": { "browser": true, "node": true, "es2022": true },
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "next/core-web-vitals",
    "prettier",
  ],
  "plugins": ["@typescript-eslint", "simple-import-sort", "eslint-plugin-unused-imports"],
  "ignorePatterns": ["dist/**", ".next/**"],
  "rules": {
    "no-console": ["warn", { "allow": ["error"] }],
    "import/no-cycle": 2,
    "simple-import-sort/imports": "error",
    "unused-imports/no-unused-imports": "error",
    "react/prop-types": 0,
  },
  "overrides": [{ "files": ["*.test.ts"], "rules": {} }],
}`;

describe("importEslintrc", () => {
  it("maps a typical Next.js .eslintrc", () => {
    const result = importEslintrc(nextApp, base);

    if (!result.ok) {
      throw new Error(result.error);
    }

    const { report, state } = result;

    expect(state.eslintMajor).toBe(9);
    expect(state.globals).toEqual(["browser", "node"]);
    expect(state.ignores).toEqual(["dist/**", ".next/**"]);
    expect(state.plugins.core.configs).toEqual(["recommended"]);
    expect(state.plugins.typescript.configs).toEqual(["recommendedTypeChecked"]);
    expect(state.plugins.react.configs).toEqual(["recommended"]);
    expect(state.plugins["react-hooks"].configs).toEqual(["recommended"]);
    expect(state.plugins.next.configs).toEqual(["core-web-vitals"]);
    expect(state.plugins["simple-import-sort"].configs).toEqual([]);
    // import/* rules move to import-x.
    expect(state.plugins["import-x"].configs).toEqual([]);
    expect(state.rules).toEqual({
      "no-console": { severity: "warn", options: [{ allow: ["error"] }] },
      "import-x/no-cycle": { severity: "error" },
      "simple-import-sort/imports": { severity: "error" },
      "react/prop-types": { severity: "off" },
    });
    expect(report.skippedExtends).toEqual(["prettier"]);
    expect(report.skippedPlugins).toEqual(["eslint-plugin-unused-imports"]);
    expect(report.skippedRules).toEqual(["unused-imports/no-unused-imports"]);
    expect(report.overrideCount).toBe(1);
    expect(report.ruleCount).toBe(4);
  });

  it("reads eslintConfig from a package.json", () => {
    const result = importEslintrc(JSON.stringify({ name: "app", eslintConfig: { extends: "eslint:recommended" } }), base);

    expect(result.ok && result.state.plugins.core.configs).toEqual(["recommended"]);
  });

  it("drops rules the installed plugin does not have", () => {
    const catalog = { rules: [{ name: "no-console" }] } as unknown as PluginCatalog;
    const result = importEslintrc(JSON.stringify({ rules: { "no-console": "warn", "no-removed-rule": "error" } }), base, { core: catalog });

    expect(result.ok && Object.keys(result.state.rules)).toEqual(["no-console"]);
    expect(result.ok && result.report.skippedRules).toEqual(["no-removed-rule"]);
  });

  it("rejects text that is not a JSON ESLint config", () => {
    expect(importEslintrc("extends: eslint:recommended", base)).toEqual({ ok: false, error: "parse" });
    expect(importEslintrc(JSON.stringify({ name: "app" }), base)).toEqual({ ok: false, error: "notConfig" });
  });
});

describe("helpers", () => {
  it("normalizes legacy plugin package names", () => {
    expect(normalizePluginName("eslint-plugin-react")).toBe("react");
    expect(normalizePluginName("@typescript-eslint/eslint-plugin")).toBe("@typescript-eslint");
    expect(normalizePluginName("@tanstack/eslint-plugin-query")).toBe("@tanstack/query");
  });

  it("keeps comment markers inside strings", () => {
    expect(JSON.parse(stripJsonComments("{ \"a\": \"http://x\" /* c */ }"))).toEqual({ a: "http://x" });
  });
});
