import { describe, expect, it } from "vitest";
import "../src/data";
import { canExtract, chooseRoom, climbOut, extractionHaul, floorsReached, makeGrid, newRun, startCrawl } from "../src/game/run";

describe("Extraction and the Obsidian Chest", () => {
  it("you can't climb out at the Entrance, but can below it", () => {
    const r = newRun("warrior", 11); startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 0, 0);
    expect(canExtract(r)).toBe(false);
    r.grid = makeGrid(r, 2, 0);
    expect(canExtract(r)).toBe(true);
    expect(floorsReached(r)).toBe(2);
  });
  it("the haul grows the deeper you go", () => {
    const r = newRun("warrior", 12); startCrawl(r);
    expect(extractionHaul(r, 2)).toEqual({ mats: 2, crowns: 0, floors: 2 });
    expect(extractionHaul(r, 8)).toEqual({ mats: 8, crowns: 2, floors: 8 });
  });
  it("climbing out ends the run as a success, banks the haul and seals one item", () => {
    const r = newRun("rogue", 13); startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 3, 0);
    r.scene = { t: "extract" };
    const main = r.hero.equip.main!;
    expect(climbOut(r, main.uid)).toBeNull();
    expect(r.scene.t).toBe("over");
    expect(r.retired).toBe(true);
    expect(r.extracted?.item?.uid).toBe(main.uid);
    const mats = Object.values(r.campLoot?.mats ?? {}).reduce((a, n) => a + (n ?? 0), 0);
    expect(mats).toBe(3);
  });
  it("the sealed item waits in the next run's Entrance, in the Obsidian Chest", () => {
    const r = newRun("mage", 14);
    const sealed = { uid: 777001, base: "w_sword", rarity: "rare" as const, level: 1, bonuses: {}, revealed: true };
    r.obsidian = sealed;
    startCrawl(r);
    r.mode = "campaign";
    r.grid = makeGrid(r, 0, 0);
    expect(r.grid.things.some(t => t.room === "obsidian")).toBe(true);
    chooseRoom(r, "obsidian");
    expect(r.scene.t).toBe("loot");
    if (r.scene.t === "loot") expect(r.scene.items[0].uid).toBe(777001);
    expect(r.obsidianTaken).toBe(true);
  });
});
