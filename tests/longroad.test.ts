import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { applyHall } from "../src/game/camp";
import { nodeBlock, passiveTree, rankText, spendNode, TREE_LAYERS, treeOf, treePointsFor, wmLevel } from "../src/game/longroad";
import { bankLongRoad, type Meta } from "../src/game/meta";
import { familyOpenCount } from "../src/game/loot";
import { newRun, startCrawl } from "../src/game/run";

beforeAll(() => loadLibrary());
const meta = () => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0 }) as unknown as Meta;

describe("the passive tree", () => {
  it("holds every old talent, once, with ranked talents as I/II/III chains", () => {
    const nodes = passiveTree().flatMap(b => b.nodes);
    expect(new Set(nodes.map(n => n.key)).size).toBe(nodes.length);
    expect(new Set(nodes.map(n => n.talent)).size).toBeGreaterThan(80);
    const two = nodes.find(n => n.level === 2)!;
    const one = nodes.find(n => n.key === two.prereq)!;
    expect(one.tier).toBeLessThanOrEqual(two.tier);
    expect(passiveTree()[0].nodes.filter(n => n.tier === 0).length).toBe(5);
  });
  it("stays shut until the class has beaten layer 5; rows open as you spend; II needs I", () => {
    const m = meta();
    treeOf(m, "warrior").points = 10;
    const b = passiveTree()[0];
    const row = (t: number) => b.nodes.filter(n => n.tier === t);
    expect(spendNode(m, "warrior", row(0)[0].key)).toMatch(/opens/);
    m.layersBeaten = { warrior: TREE_LAYERS };
    expect(spendNode(m, "warrior", row(1)[0].key)).toMatch(/first/);
    expect(spendNode(m, "warrior", row(0)[0].key)).toBeNull();
    expect(spendNode(m, "warrior", row(0)[1].key)).toBeNull();
    expect(spendNode(m, "warrior", row(1)[0].key)).toBeNull();
    const two = b.nodes.find(n => n.level === 2 && !treeOf(m, "warrior").spent[n.key] && !treeOf(m, "warrior").spent[n.prereq!])!;
    expect(nodeBlock(m, "warrior", two.key)).toMatch(/first|Spend/);
  });
  it("one point for each layer beaten", () => {
    expect(treePointsFor(2)).toBe(2);
    expect(treePointsFor(0)).toBe(0);
  });
  it("spent nodes come along as talents, one rank each", () => {
    const m = meta(); m.layersBeaten = { warrior: 5 };
    const n = passiveTree()[0].nodes[0];
    treeOf(m, "warrior").spent[n.key] = 1;
    const r = newRun("warrior", 3); startCrawl(r); applyHall(m, r);
    expect(r.hero.talents[n.talent]).toBe(1);
  });
  it("a rank's text shows only its own numbers", () => {
    expect(rankText("+1 / +2 / +3 Damage", 2)).toBe("+2 Damage");
  });
});

describe("weapon mastery and totems", () => {
  it("fights won teach the weapon family; mastery opens more of its weapons to your loot", () => {
    const m = meta();
    const r = newRun("warrior", 4); startCrawl(r);
    r.hero.f.persist["wmx_shortblade"] = 25;
    bankLongRoad(m, r);
    expect(wmLevel(m.weaponXp!.shortblade!)).toBe(2);
    const a = familyOpenCount("shortblade", 0), b = familyOpenCount("shortblade", 10);
    expect(a.open).toBeLessThan(b.open);
    expect(b.open).toBe(b.total);
    const r2 = newRun("warrior", 5); startCrawl(r2);
    applyHall(m, r2);
    expect(r2.hero.f.persist["wm_shortblade"]).toBe(2);
  });
  it("a totem set at the door is used up going in", () => {
    const m = meta(); m.totems = { giant: 1 }; m.totemSet = "giant";
    const r = newRun("warrior", 6); startCrawl(r); applyHall(m, r);
    expect(r.hero.f.persist["totem_giant"]).toBe(1);
    expect(m.totems.giant).toBe(0);
    expect(m.totemSet).toBeUndefined();
  });
});
