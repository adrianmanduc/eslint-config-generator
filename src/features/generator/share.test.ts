import { describe, expect, it } from "vitest";

import { presets } from "./presets";
import { decodeSharedState, encodeSharedState } from "./share";
import { createStateFromPreset, generatorReducer } from "./state";

async function encodePayload(payload: unknown) {
  const source = new ReadableStream<BufferSource>({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(JSON.stringify(payload)));
      controller.close();
    },
  });
  const stream = source.pipeThrough(new CompressionStream("deflate-raw"));
  const bytes = new Uint8Array(await new Response(stream).arrayBuffer());

  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_")
    .replace(/=+$/, "");
}

describe("shared configs", () => {
  it.each(presets.map((preset) => preset.id))("round-trips the %s preset", async (presetId) => {
    let state = createStateFromPreset(presetId, { eslintMajor: 10, packageManager: "pnpm" });

    state = generatorReducer(state, { type: "setRule", ruleId: "no-console", setting: { severity: "warn", options: [{ allow: ["error"] }] } });

    const encoded = await encodeSharedState(state);

    expect(encoded).toMatch(/^[\w-]+$/);
    // Short enough to paste anywhere.
    expect(encoded.length).toBeLessThan(2000);
    await expect(decodeSharedState(encoded)).resolves.toEqual(state);
  });

  it("rejects links that are not a shared config", async () => {
    await expect(decodeSharedState("")).resolves.toBeNull();
    await expect(decodeSharedState("not a link!")).resolves.toBeNull();
    await expect(decodeSharedState("AAAA")).resolves.toBeNull();
    await expect(decodeSharedState("a".repeat(40_000))).resolves.toBeNull();
    await expect(decodeSharedState(await encodePayload({ v: 99, s: createStateFromPreset("react") }))).resolves.toBeNull();
    await expect(decodeSharedState(await encodePayload({ v: 1, s: { plugins: "nope" } }))).resolves.toBeNull();
  });

  it("rejects a payload that inflates past the size limit", async () => {
    await expect(decodeSharedState(await encodePayload({ v: 1, s: "x".repeat(2_000_000) }))).resolves.toBeNull();
  });

  it("drops plugins and rules that no longer exist", async () => {
    const state = createStateFromPreset("javascript");
    const encoded = await encodePayload({
      v: 1,
      s: {
        ...state,
        plugins: { ...state.plugins, retired: { configs: ["recommended"], options: {} } },
        rules: { ...state.rules, "retired/some-rule": { severity: "error" } },
      },
    });

    await expect(decodeSharedState(encoded)).resolves.toEqual(state);
  });
});
