import { describe, it, expect } from "vitest";
import { getItem } from "../src/engine/registry";
import { affixPool } from "../src/game/affixpool";

// A resumed run's gear names rolled effect lines (fx_…) before any loot is rolled: they must be known by then.
describe("rolled effect lines on saved gear", () => {
  it("are registered once the affix pool is built", () => {
    affixPool();
    expect(() => getItem("fx_bt_berserker_hide")).not.toThrow();
  });
});
