import { describe, expect, it } from "vitest";

import { loadCatalog } from "./catalog";
import { parseRuleOptions, resolveBaseRules, toRuleEntry } from "./rules";
import { createStateFromPreset } from "./state";

describe("resolveBaseRules", () => {
  it("lets a later plugin's config override an earlier one", async () => {
    const state = createStateFromPreset("typescript");
    const catalogs = {
      core: await loadCatalog("core", 9),
      typescript: await loadCatalog("typescript", 9),
    };

    const baseRules = resolveBaseRules(state, catalogs);

    expect(baseRules.get("no-debugger")).toEqual({ entry: "error", pluginId: "core", configId: "recommended" });
    // typescript-eslint replaces the core rule with its own.
    expect(baseRules.get("no-unused-vars")).toEqual({ entry: "off", pluginId: "typescript", configId: "recommended" });
    expect(baseRules.get("@typescript-eslint/no-unused-vars")?.entry).toBe("error");
  });

  it("ignores configs that are not selected and catalogs that are not loaded", async () => {
    const state = createStateFromPreset("typescript");
    const core = await loadCatalog("core", 9);

    expect(resolveBaseRules(state, { core }).get("no-unused-vars")?.pluginId).toBe("core");
    expect(resolveBaseRules({ plugins: { core: { configs: [], options: {} } } }, { core }).size).toBe(0);
  });
});

describe("resolveBaseRules with a customized factory config", () => {
  it("keeps the severity but drops options the factory would change", async () => {
    const stylistic = await loadCatalog("stylistic", 9);
    const plain = { plugins: { stylistic: { configs: ["recommended"], options: {} } } };
    const customized = { plugins: { stylistic: { configs: ["recommended"], options: { quotes: "double" } } } };

    expect(resolveBaseRules(plain, { stylistic }).get("@stylistic/quotes")?.entry).toEqual(expect.arrayContaining(["error", "single"]));
    expect(resolveBaseRules(customized, { stylistic }).get("@stylistic/quotes")?.entry).toBe("error");
  });
});

describe("rule options", () => {
  it("parses a JSON array and rejects anything else", () => {
    expect(parseRuleOptions("[\"double\", { \"avoidEscape\": true }]")).toEqual({ ok: true, options: ["double", { avoidEscape: true }] });
    expect(parseRuleOptions("  ")).toEqual({ ok: true, options: [] });
    expect(parseRuleOptions("\"double\"")).toEqual({ ok: false });
    expect(parseRuleOptions("[double]")).toEqual({ ok: false });
  });

  it("writes a bare severity when there are no options", () => {
    expect(toRuleEntry({ severity: "warn" })).toBe("warn");
    expect(toRuleEntry({ severity: "warn", options: [] })).toBe("warn");
    expect(toRuleEntry({ severity: "error", options: [2] })).toEqual(["error", 2]);
  });
});
