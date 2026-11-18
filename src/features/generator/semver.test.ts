import { describe, expect, it } from "vitest";

import { rangeSupportsMajor } from "./semver";

describe("rangeSupportsMajor", () => {
  it.each([
    ["^9.0.0 || ^10.0.0", true, true],
    ["^8.57.0 || ^9.0.0", true, false],
    ["^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7", true, false],
    ["^8.0.0-0 || ^9.0.0 || ^10.0.0", true, true],
    [">=8.57.1", true, true],
    [">=10.4", false, true],
    [">= 9.18.0", true, true],
    [">=8 <10", true, false],
    ["9.x", true, false],
    ["*", true, true],
    ["workspace:*", true, true],
  ])("%s", (range, supportsNine, supportsTen) => {
    expect(rangeSupportsMajor(range, 9)).toBe(supportsNine);
    expect(rangeSupportsMajor(range, 10)).toBe(supportsTen);
  });

  it("treats a missing range as supported", () => {
    expect(rangeSupportsMajor(null, 10)).toBe(true);
  });
});
