import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { FUSION_RECIPES } from "../src/data/fusions";
import { FUSED_TRINKETS, JEWEL_TRINKETS, TRINKET_RECIPES } from "../src/data/jeweller";
import { getItem } from "../src/engine/registry";
import type { GearItem, Rarity } from "../src/engine/types";
import { recompute } from "../src/game/hero";
import { rollItem } from "../src/game/loot";
import { type Run, genChoices, grantRelic, jewelCost, jewelFuse, jewelMode, jewelPlace, newRun } from "../src/game/run";
beforeAll(() => loadLibrary());

const atBench = (seed = 1) => {
  const run = newRun("warrior", seed);
  run.scene = { t: "jeweller", mode: "fuse", tries: 0 };
  run.hero.f.gold = 9999; run.hero.scrap = 999; run.hero.starmetal = 50;
  return run;
};
let uid = 5000;
const piece = (run: Run, base: string, rarity: Rarity = "rare", extra: Partial<GearItem> = {}) => {
  const it: GearItem = { uid: uid++, base, rarity, level: 1, bonuses: {}, revealed: true, ...extra };
  run.hero.backpack.push(it);
  return it;
};
const bench = (run: Run, a: GearItem, b: GearItem) => { jewelPlace(run, { kind: "item", uid: a.uid }); jewelPlace(run, { kind: "item", uid: b.uid }); };

it("every recipe names real things, and fused trinkets never drop", () => {
  for (const r of [...FUSION_RECIPES, ...TRINKET_RECIPES]) for (const id of [r.a, r.b, r.out]) expect(() => getItem(id)).not.toThrow();
  expect(JEWEL_TRINKETS.length).toBeGreaterThan(10);
  const run = newRun("warrior", 2);
  const fusedIds = new Set(FUSED_TRINKETS.map(f => f.id));
  for (let i = 0; i < 3000; i++) expect(fusedIds.has(rollItem(run.hero, "epic", 3, Math.random).base)).toBe(false);
});

it("two matching relics fuse for Gold and Scrap", () => {
  const run = atBench();
  run.hero.relics = { hex_doll: 1, black_candle: 1 }; recompute(run.hero);
  jewelPlace(run, { kind: "relic", id: "hex_doll" });
  jewelPlace(run, { kind: "relic", id: "black_candle" });
  const cost = jewelCost(run)!;
  expect(cost.starmetal).toBe(0);
  expect(jewelFuse(run).ok).toBe(true);
  expect(run.hero.relics["f_witchs_altar"]).toBe(1);
  expect(run.hero.f.gold).toBe(9999 - cost.gold);
});

it("trinket fusion costs Starmetal (more for Epic), and a wrong pair still costs the fee", () => {
  const run = atBench(3);
  const a = piece(run, "tj_glass_bead"), b = piece(run, "tj_iron_ring");
  bench(run, a, b);
  const rareCost = jewelCost(run)!;
  expect(rareCost.starmetal).toBe(1);
  expect(jewelFuse(run).ok).toBe(false);
  expect(run.hero.starmetal).toBe(49);
  expect(run.hero.backpack.some(i => i.uid === a.uid)).toBe(true);
  const c = piece(run, "tj_moonstone", "epic"), d = piece(run, "tj_sunstone", "epic");
  bench(run, c, d);
  const epicCost = jewelCost(run)!;
  expect(epicCost.starmetal).toBe(2);
  expect(epicCost.gold).toBeGreaterThan(rareCost.gold);
  expect(jewelFuse(run).ok).toBe(true);
  expect(run.hero.backpack.some(i => i.base === "tf_eclipse")).toBe(true);
});

it("two tries per visit", () => {
  const run = atBench(4);
  for (let i = 0; i < 3; i++) { const a = piece(run, "tj_glass_bead"), b = piece(run, "tj_bone_charm"); bench(run, a, b); const r = jewelFuse(run); if (i === 2) expect(r.msg).toMatch(/enough/); }
  expect(run.hero.starmetal).toBe(48);
});

it("refuses Uncommon pieces, upgraded pieces and unalterable trinkets, for free", () => {
  const run = atBench(5);
  bench(run, piece(run, "tj_glass_bead", "uncommon"), piece(run, "tj_cats_eye"));
  expect(jewelFuse(run).msg).toMatch(/Rare, Epic and Legendary/);
  run.scene = { t: "jeweller", mode: "fuse", tries: 0 };
  bench(run, piece(run, "tj_glass_bead", "rare", { upgrades: 1 }), piece(run, "tj_cats_eye"));
  expect(jewelFuse(run).msg).toMatch(/Upgraded/);
  run.scene = { t: "jeweller", mode: "fuse", tries: 0 };
  bench(run, piece(run, "tj_heartseeker", "epic"), piece(run, "tj_moonstone", "epic"));
  expect(jewelFuse(run).msg).toMatch(/resists/);
  expect(run.hero.starmetal).toBe(50);
});

it("a secret trinket pair fuses, and a worn trinket's slot gets the result", () => {
  const run = atBench(6);
  const a = piece(run, "tj_amber_drop", "epic");
  const coin: GearItem = { uid: uid++, base: "t_lucky_coin", rarity: "epic", level: 1, bonuses: {}, revealed: true };
  run.hero.equip.trinket1 = coin; recompute(run.hero);
  bench(run, coin, a);
  expect(jewelFuse(run).ok).toBe(true);
  expect(run.hero.equip.trinket1?.base).toBe("tf_fortunes_amber");
});

it("infusion: a same-rarity trinket's effects move into the gear, and the trinket is gone", () => {
  const run = atBench(7);
  jewelMode(run, "infuse");
  const sword: GearItem = { uid: uid++, base: "w_sword", rarity: "rare", level: 1, bonuses: {}, revealed: true };
  run.hero.equip.main = sword; recompute(run.hero);
  const before = run.hero.f.maxHp;
  const locket = piece(run, "tj_silver_locket", "rare");
  jewelPlace(run, { kind: "item", uid: locket.uid });
  jewelPlace(run, { kind: "item", uid: sword.uid });
  const cost = jewelCost(run)!;
  expect(cost.starmetal).toBe(2);
  expect(jewelFuse(run).ok).toBe(true);
  expect(sword.infused).toBe("tj_silver_locket");
  expect(run.hero.backpack.some(i => i.uid === locket.uid)).toBe(false);
  expect(run.hero.f.maxHp).toBe(before + 5);
});

it("infusion needs matching rarities", () => {
  const run = atBench(8);
  jewelMode(run, "infuse");
  const sword: GearItem = { uid: uid++, base: "w_sword", rarity: "epic", level: 1, bonuses: {}, revealed: true };
  run.hero.equip.main = sword; recompute(run.hero);
  const t = piece(run, "tj_cats_eye", "rare");
  jewelPlace(run, { kind: "item", uid: sword.uid });
  jewelPlace(run, { kind: "item", uid: t.uid });
  expect(jewelFuse(run).msg).toMatch(/rarities must match/);
  expect(sword.infused).toBeUndefined();
});

it("the same relic found twice merges into one, silently", () => {
  const run = newRun("warrior", 9);
  run.relicNews = [];
  grantRelic(run, "iron_ration"); grantRelic(run, "iron_ration");
  expect(run.hero.relics["iron_ration"]).toBe(2);
  expect(run.relicNews.length).toBe(1);
});

it("the Forge and the Jeweller take turns", () => {
  const run = newRun("warrior", 10);
  const seen: string[] = [];
  for (let i = 0; i < 400 && seen.length < 6; i++) { run.step = 1; const c = genChoices(run); const x = c.find(r => r === "forge" || r === "jeweller"); if (x) seen.push(x); }
  expect(seen.length).toBe(6);
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
});
