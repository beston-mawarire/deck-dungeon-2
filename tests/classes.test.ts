import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { classify } from "../src/game/families";
import { baseOf, recompute } from "../src/game/hero";
import { CLASS_FAMILIES, rollItem } from "../src/game/loot";
import { classOpen, type Meta } from "../src/game/meta";
import { availableActions, fight, newRun, startCrawl } from "../src/game/run";
import { makeRng } from "../src/engine/rng";

beforeAll(() => loadLibrary());

describe("classes", () => {
  it("the Warrior and the Mage are open; the Cleric and the Rogue wait on a layer beaten", () => {
    const m = {} as Meta;
    expect(classOpen(m, "warrior") && classOpen(m, "mage")).toBe(true);
    expect(classOpen(m, "cleric") || classOpen(m, "rogue")).toBe(false);
    m.layersBeaten = { mage: 1 };
    expect(classOpen(m, "cleric")).toBe(true);
    expect(classOpen(m, "rogue")).toBe(false);
    m.layersBeaten.warrior = 2;
    expect(classOpen(m, "rogue")).toBe(true);
  });
  it("in the Crawl each class finds only its own weapons and off-hands", () => {
    for (const o of ["warrior", "mage", "rogue", "cleric"] as const) {
      const r = newRun(o, 9); startCrawl(r);
      const rng = makeRng(3);
      for (let k = 0; k < 120; k++) {
        const it = rollItem(r.hero, (["common", "uncommon", "rare", "epic"] as const)[k % 4], 2, rng);
        const b = baseOf(it.base);
        if (b.kind === "weapon" || b.kind === "off") expect(CLASS_FAMILIES[o]).toContain(classify(b).family);
      }
    }
  });
  it("an item's ability shows up as a button in a fight", () => {
    const r = newRun("warrior", 11); startCrawl(r);
    const off = r.hero.equip.off!;
    off.bonuses = { ...off.bonuses, ab_shieldwall: 1 };
    recompute(r.hero);
    fight(r, "normal");
    expect(availableActions(r)).toContain("shieldwall");
  });
});
