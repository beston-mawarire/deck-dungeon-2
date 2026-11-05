import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { applyHall } from "../src/game/camp";
import { recompute } from "../src/game/hero";
import { passiveTree, spendNode, TREE_LAYERS, treeOf, treePointsFor, wmLevel } from "../src/game/longroad";
import { bankLongRoad, type Meta } from "../src/game/meta";
import { newRun, startCrawl } from "../src/game/run";

beforeAll(() => loadLibrary());
const meta = () => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0 }) as unknown as Meta;

describe("the passive tree", () => {
  it("holds every old talent, once", () => {
    const ids = passiveTree().flatMap(b => b.tiers.flat());
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.length).toBeGreaterThan(80);
  });
  it("stays shut until the class has beaten layer 5, and tiers open as you spend", () => {
    const m = meta();
    treeOf(m, "warrior").points = 10;
    const b = passiveTree()[0];
    expect(spendNode(m, "warrior", b.tiers[0][0])).toMatch(/opens/);
    m.layersBeaten = { warrior: TREE_LAYERS };
    expect(spendNode(m, "warrior", b.tiers[1][0])).toMatch(/first/);
    expect(spendNode(m, "warrior", b.tiers[0][0])).toBeNull();
    expect(spendNode(m, "warrior", b.tiers[0][1])).toBeNull();
    expect(spendNode(m, "warrior", b.tiers[1][0])).toBeNull();
  });
  it("points: 2 a layer, or 1 for halfway through the first", () => {
    expect(treePointsFor(2, 0)).toBe(4);
    expect(treePointsFor(0, 3)).toBe(1);
    expect(treePointsFor(0, 2)).toBe(0);
  });
  it("spent nodes come along as talents", () => {
    const m = meta(); m.layersBeaten = { warrior: 5 };
    const id = passiveTree()[0].tiers[0][0];
    treeOf(m, "warrior").spent[id] = 1;
    const r = newRun("warrior", 3); startCrawl(r); applyHall(m, r);
    expect(r.hero.talents[id]).toBe(1);
  });
});

describe("weapon mastery and totems", () => {
  it("fights won teach the weapon family; its level adds damage", () => {
    const m = meta();
    const r = newRun("warrior", 4); startCrawl(r);
    r.hero.f.persist["wmx_shortblade"] = 25;
    bankLongRoad(m, r);
    expect(wmLevel(m.weaponXp!.shortblade!)).toBe(2);
    const r2 = newRun("warrior", 5); startCrawl(r2);
    const before = r2.hero.f.dmgDealt ?? 0;
    applyHall(m, r2); recompute(r2.hero);
    expect((r2.hero.f.dmgDealt ?? 0) - before).toBe(4);
  });
  it("a totem set at the door is used up going in", () => {
    const m = meta(); m.totems = { giant: 1 }; m.totemSet = "giant";
    const r = newRun("warrior", 6); startCrawl(r); applyHall(m, r);
    expect(r.hero.f.persist["totem_giant"]).toBe(1);
    expect(m.totems.giant).toBe(0);
    expect(m.totemSet).toBeUndefined();
  });
});
