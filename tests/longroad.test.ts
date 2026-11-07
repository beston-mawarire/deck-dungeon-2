import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { applyHall } from "../src/game/camp";
import { nodeBlock, passiveTree, rankText, spendNode, TREE_LAYERS, treeOf, treePointsFor, wmLevel } from "../src/game/longroad";
import { bankLongRoad, type Meta } from "../src/game/meta";
import { familyOpenCount } from "../src/game/loot";
import { newRun, startCrawl } from "../src/game/run";
import { attrOf, recompute } from "../src/game/hero";

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
    // (The tree also waits for every class to be unlocked: the Mage has to have beaten a layer too.)
    m.layersBeaten = { warrior: TREE_LAYERS };
    expect(spendNode(m, "warrior", row(0)[0].key)).toMatch(/every class/);
    m.layersBeaten = { warrior: TREE_LAYERS, mage: 1 };
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
    const m = meta(); m.layersBeaten = { warrior: 5, mage: 1 };
    const n = passiveTree()[0].nodes[0];
    treeOf(m, "warrior").spent[n.key] = 1;
    const r = newRun("warrior", 3); startCrawl(r); applyHall(m, r);
    expect(r.hero.talents[n.talent]).toBe(1);
  });
  it("each branch opens with small attribute nodes that add to the hero's attributes", () => {
    const m = meta(); m.layersBeaten = { warrior: 5, mage: 1 };
    const b = passiveTree()[0];
    const top = b.nodes.filter(n => n.tier === 0);
    expect(top.every(n => n.talent.startsWith("ta_"))).toBe(true);
    for (const n of top.slice(0, 3)) treeOf(m, "warrior").spent[n.key] = 1;
    const r = newRun("warrior", 3); startCrawl(r); applyHall(m, r); recompute(r.hero);
    expect(attrOf(r.hero, "str")).toBe(2);
    expect(attrOf(r.hero, "vit")).toBe(1);
  });
  it("the gentler passives sit near the top and the strongest deep down; stat bumps that attributes give are gone", () => {
    const all = passiveTree().flatMap(b => b.nodes);
    const at = (id: string) => all.find(n => n.key === id)!.tier;
    for (const id of ["t_reaper", "t_reckless", "t_boundless_static"]) {
      const b = passiveTree().find(br => br.nodes.some(n => n.key === id))!;
      const tiers = b.nodes.filter(n => n.tier > 0).map(n => n.tier).sort((x, y) => x - y);
      expect(at(id)).toBeGreaterThanOrEqual(tiers[Math.floor(tiers.length * 0.6)]);
    }
    expect(all.some(n => n.talent === "tm_sharp_eye" || n.talent === "t_mercenary")).toBe(false);
    // The Talisman's sigils are in the tree too, set bonuses named for the set.
    expect(all.some(n => n.talent === "sc_ember_signet")).toBe(true);
    expect(all.find(n => n.talent === "sb_ember_4")?.title).toBe("Ember Court's Crown");
  });
  it("points in nodes the tree no longer has come back", () => {
    const m = meta();
    treeOf(m, "warrior").spent["t_mercenary"] = 1;
    expect(treeOf(m, "warrior").points).toBe(1);
    expect(treeOf(m, "warrior").spent["t_mercenary"]).toBeUndefined();
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
  it("totems are retired: one left set at the door does nothing", () => {
    const m = meta(); m.totems = { giant: 1 }; m.totemSet = "giant";
    const r = newRun("warrior", 6); startCrawl(r); applyHall(m, r);
    expect(r.hero.f.persist["totem_giant"]).toBeUndefined();
    expect(m.totemSet).toBeUndefined();
  });
});
