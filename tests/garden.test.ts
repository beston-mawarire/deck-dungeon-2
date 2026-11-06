import { describe, expect, it } from "vitest";
import { applyHall, bottle, BREW_HIGH, campOf, gardenPlots, harvest, sow, startBrew, stir, type Brew } from "../src/game/camp";
import type { Meta } from "../src/game/meta";
import { loadLibrary } from "../src/data";
import { newRun, startCrawl } from "../src/game/run";

loadLibrary();
const meta = (): Meta => ({ renown: 0, runs: 0, wins: 0 } as never);

describe("the Garden and the Brewery", () => {
  it("seeds grow over runs into herbs", () => {
    const m = meta();
    campOf(m).seeds = { heartleaf: 1, moonbell: 1 };
    expect(gardenPlots(m).length).toBe(2);
    expect(sow(m, 0, "heartleaf")).toBeNull();
    expect(sow(m, 0, "moonbell")).toMatch(/already/);
    expect(sow(m, 1, "moonbell")).toBeNull();
    expect(harvest(m, 0)).toMatch(/Still growing/);
    const r = newRun("cleric", 2); startCrawl(r); applyHall(m, r);
    expect(harvest(m, 0)).toMatch(/Heartleaf/);
    expect(harvest(m, 1)).toMatch(/Still growing/);
    expect(campOf(m).herbs!.heartleaf).toBeGreaterThanOrEqual(2);
  });

  it("brewing: too cold gives nothing, the band one potion, the sweet spot two, too hot spoils; brews go into the next run", () => {
    const m = meta();
    campOf(m).herbs = { heartleaf: 8 };
    const seq = (rolls: number[]) => { let k = 0; return () => (rolls[k++] - 1) / 6 + 0.01; };
    const go = (rolls: number[]) => { const b = startBrew(m, "heartleaf") as Brew; const rng = seq(rolls); for (let i = 0; i < rolls.length; i++) stir(m, b, rng); if (!b.done) bottle(m, b); return b; };
    expect(go([4, 4]).made).toBe(0);
    expect(go([6, 4]).made).toBe(1);
    expect(go([6, 6]).made).toBe(2);
    expect(go([6, 6, 6]).done).toBe("spoiled");
    expect(BREW_HIGH).toBe(14);
    const r = newRun("cleric", 3); startCrawl(r);
    applyHall(m, r);
    expect(r.hero.potions).toBe(3);
    expect(campOf(m).brews!.heal ?? 0).toBe(0);
  });
});

describe("the Knowledge Table", () => {
  it("scrolls buy insights that every run then carries", async () => {
    const { learn, INSIGHTS } = await import("../src/game/camp");
    const { makeGrid } = await import("../src/game/run");
    const m = meta();
    campOf(m).scrolls = 2;
    expect(learn(m, "treasure")).toMatch(/Scroll/);
    expect(learn(m, "keeneye")).toBeNull();
    expect(learn(m, "keeneye")).toMatch(/already/);
    expect(INSIGHTS.length).toBe(8);
    const r = newRun("rogue", 4); startCrawl(r); applyHall(m, r);
    const g = makeGrid(r, 1);
    const td = g.things.find(t => t.room === "trapdoor")!;
    expect(g.seen[td.y * g.w + td.x]).toBe(1);
  });
});
describe("the Garden's new plants and the Brewery's draughts", () => {
  it("nine plants; their draughts last floors and wear off as you go down", async () => {
    const { PLANTS, BREWS, isDraught } = await import("../src/game/camp");
    const { drinkDraught, newRun, startCrawl, descend, makeGrid } = await import("../src/game/run");
    expect(Object.keys(PLANTS).length).toBe(9);
    for (const p of Object.values(PLANTS)) expect(BREWS[p.brew]).toBeDefined();
    expect(isDraught("iron")).toBe(true); expect(isDraught("heal")).toBe(false);
    const r = newRun("warrior", 41); startCrawl(r);
    const arm = r.hero.f.armor;
    r.hero.draughts = { iron: 1 };
    expect(drinkDraught(r, "iron")).toBeNull();
    expect(r.hero.f.armor).toBe(arm + 2);
    expect(r.hero.draughts.iron).toBeUndefined();
    r.grid = makeGrid(r, 1); descend(r);
    expect(r.hero.f.armor).toBe(arm + 2);
    descend(r);
    expect(r.hero.f.armor).toBe(arm);
  });
});
