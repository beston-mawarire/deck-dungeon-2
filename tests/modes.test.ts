import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { abyssUnlocked, type Meta } from "../src/game/meta";
import { newDailyRun, newRun, startCrawl } from "../src/game/run";
import { layerFloors, LAYER_FLOORS } from "../src/game/grid";
import { crawlStep } from "./crawlbot";

beforeAll(() => loadLibrary());
const meta = () => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] }) as unknown as Meta;

describe("the Abyss and the Daily, walked", () => {
  it("the Abyss opens once any class beats the last layer", () => {
    const m = meta();
    expect(abyssUnlocked(m)).toBe(false);
    m.layersBeaten = { rogue: 5 };
    expect(abyssUnlocked(m)).toBe(true);
  });
  it("an Abyss run is a walkable dungeon that plays through", () => {
    for (const seed of [3, 9]) {
      const r = newRun("warrior", seed, "abyss"); r.abyssMod = undefined; startCrawl(r);
      expect(r.gridMode).toBe(true);
      for (let k = 0; k < 3000 && r.scene.t !== "over"; k++) crawlStep(r);
      expect(r.floor).toBeGreaterThanOrEqual(1);
    }
  }, 60000);
  it("the Abyss is one layer as long as the dungeon's", () => {
    expect(layerFloors({ mode: "abyss" })).toBe(LAYER_FLOORS);
    expect(layerFloors({ mode: "campaign" })).toBe(LAYER_FLOORS);
  });
  it("a Daily run is a walkable dungeon too, the same for everyone that day", () => {
    const a = newDailyRun("2026-11-06"); startCrawl(a);
    const b = newDailyRun("2026-11-06"); startCrawl(b);
    expect(a.gridMode).toBe(true);
    expect(JSON.stringify(a.grid!.things)).toBe(JSON.stringify(b.grid!.things));
    for (let k = 0; k < 2000 && a.scene.t !== "over"; k++) crawlStep(a);
  }, 60000);
});

describe("layers as stages", () => {
  it("starting from a deeper layer sets you out stronger, on that layer", async () => {
    const { beginAtLayer, layerStartLevel } = await import("../src/game/run");
    const r = newRun("rogue", 5); startCrawl(r);
    beginAtLayer(r, 3);
    expect(r.floor).toBe(3);
    expect(r.hero.level).toBe(layerStartLevel(3));
    expect(r.hero.backpack.length).toBe(3);
    expect(r.grid!.depth).toBe(0);
  });
  it("heading home from a conquered layer ends the run well", async () => {
    const { retireRun } = await import("../src/game/run");
    const r = newRun("warrior", 6); startCrawl(r);
    r.scene = { t: "cleared", floor: 1, boss: "x" } as never;
    retireRun(r);
    expect((r.scene as { t: string }).t).toBe("over");
    expect(r.retired).toBe(true);
  });
  it("deeper layers and deeper floors make tougher foes", async () => {
    const { fight, makeGrid } = await import("../src/game/run");
    const hp = (layer: number, depth: number) => { let t = 0; for (let i = 0; i < 30; i++) { const r = newRun("warrior", 900 + i); startCrawl(r); r.floor = layer; r.grid = makeGrid(r, depth); fight(r, "elite"); if (r.scene.t === "combat") t += r.scene.battle.enemy.maxHp; } return t; };
    expect(hp(5, 2)).toBeGreaterThan(hp(2, 2) * 1.3);
    expect(hp(2, 4)).toBeGreaterThan(hp(2, 1));
  });
});

describe("the deeper layers", () => {
  it("Crimson foes have rooms of their own below the first layer, never on it", async () => {
    const { makeGrid } = await import("../src/game/run");
    const count = (layer: number) => { let n = 0; for (let s = 1; s <= 30; s++) { const r = newRun("warrior", s * 31); startCrawl(r); r.floor = layer; for (const d of [1, 2, 3]) n += makeGrid(r, d).things.filter(t => t.room === "crimson_elite").length; } return n; };
    expect(count(1)).toBe(0);
    expect(count(4)).toBeGreaterThan(10);
  });
});
