import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { canExtract, chooseRoom, climbOut, extractionHaul, floorsReached, gridStep, makeGrid, newRun, startCrawl } from "../src/game/run";
import { bankCamp, campOf, unpackPouch } from "../src/game/camp";
import type { Meta } from "../src/game/meta";
loadLibrary();
const meta = (): Meta => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] } as unknown as Meta);

describe("Climbing out and the Obsidian Chest", () => {
  it("you can't climb out at the Entrance, but can below it", () => {
    const r = newRun("warrior", 11); startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 0, 0);
    expect(canExtract(r)).toBe(false);
    r.grid = makeGrid(r, 2, 0);
    expect(canExtract(r)).toBe(true);
    expect(floorsReached(r)).toBe(2);
  });
  it("every floor below the Entrance has the Way Up in a nook of its own, apart from the trapdoor", () => {
    for (let seed = 1; seed <= 8; seed++) {
      const r = newRun("warrior", seed * 31); startCrawl(r);
      r.mode = "campaign";
      const m = makeGrid(r, 1 + (seed % 3), 0);
      const up = m.things.filter(t => t.room === "ascent"), down = m.things.filter(t => t.room === "trapdoor");
      expect(up).toHaveLength(1);
      expect(down).toHaveLength(1);
      expect(up[0].x === down[0].x && up[0].y === down[0].y).toBe(false);
    }
  });
  it("the trapdoor just drops you (the choice to climb out is at the Way Up)", () => {
    const r = newRun("rogue", 21); startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 1, 0);
    const m = r.grid, td = m.things.find(t => t.room === "trapdoor")!;
    m.px = td.x; m.py = td.y + 1; m.bx = m.px; m.by = m.py;
    gridStep(r, td.x, td.y);
    expect(r.scene.t).not.toBe("extract");
  });
  it("the haul grows the deeper you go", () => {
    const r = newRun("warrior", 12); startCrawl(r);
    expect(extractionHaul(r, 2)).toEqual({ mats: 2, crowns: 0, floors: 2 });
    expect(extractionHaul(r, 8)).toEqual({ mats: 8, crowns: 2, floors: 8 });
  });
  it("climbing out takes one thing: gear goes to the Obsidian Chest, materials stay behind", () => {
    const r = newRun("rogue", 13); startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 3, 0);
    r.scene = { t: "extract" };
    const main = r.hero.equip.main!;
    expect(climbOut(r, { item: main.uid })).toBeNull();
    expect(r.scene.t).toBe("over");
    expect(r.extracted?.seal?.item?.uid).toBe(main.uid);
    const m = meta();
    bankCamp(m, r);
    expect(Object.values(campOf(m).mats).reduce((a, n) => a + (n ?? 0), 0)).toBe(0);
    expect(campOf(m).pouch).toBeUndefined();
  });
  it("the pouch takes the run's materials to a chest in the Garden, to unpack", () => {
    const r = newRun("rogue", 14); startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 3, 0);
    r.scene = { t: "extract" };
    climbOut(r, { pouch: true });
    const m = meta();
    bankCamp(m, r);
    const c = campOf(m);
    expect(Object.values(c.pouch!.mats).reduce((a, n) => a + (n ?? 0), 0)).toBe(3);
    expect(unpackPouch(m)).toBe(true);
    expect(Object.values(c.mats).reduce((a, n) => a + (n ?? 0), 0)).toBe(3);
    expect(c.pouch).toBeUndefined();
  });
  it("dying brings home nothing", () => {
    const r = newRun("mage", 15); startCrawl(r);
    r.campLoot = { crowns: 2, mats: { hide: 4 }, seeds: {} };
    r.scene = { t: "over", won: false };
    const m = meta();
    expect(bankCamp(m, r)).toBe(false);
    expect(campOf(m).crowns).toBe(0);
  });
  it("the sealed thing waits in the next run's Entrance: gear, Gold or potions", () => {
    const r = newRun("mage", 16);
    r.obsidian = { item: { uid: 777001, base: "w_sword", rarity: "rare", level: 1, bonuses: {}, revealed: true } };
    startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 0, 0);
    expect(r.grid.things.some(t => t.room === "obsidian")).toBe(true);
    chooseRoom(r, "obsidian");
    if (r.scene.t === "loot") expect(r.scene.items[0].uid).toBe(777001); else throw new Error("no loot");
    const g = newRun("warrior", 17); g.obsidian = { gold: 50 }; startCrawl(g);
    const before = g.hero.f.gold;
    chooseRoom(g, "obsidian");
    expect(g.hero.f.gold).toBe(before + 50);
  });
});
