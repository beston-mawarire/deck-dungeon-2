import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { FUSION_RECIPES } from "../src/data/fusions";
import { FUSED_TRINKETS, JEWEL_TRINKETS, TRINKET_RECIPES } from "../src/data/jeweller";
import { getItem } from "../src/engine/registry";
import { recompute } from "../src/game/hero";
import { rollItem } from "../src/game/loot";
import { type Run, genChoices, grantRelic, jewelCost, jewelFuse, jewelPlace, newRun } from "../src/game/run";
beforeAll(() => loadLibrary());

const atBench = (seed = 1) => { const run = newRun("warrior", seed); run.scene = { t: "jeweller" }; run.hero.f.gold = 999; run.hero.scrap = 999; return run; };
const trinket = (run: Run, base: string) => { const it = rollItem(run.hero, "uncommon", 1, Math.random); it.base = base; it.bonuses = {}; it.epic = undefined; run.hero.backpack.push(it); return it; };

it("every recipe names real things", () => {
  for (const r of [...FUSION_RECIPES, ...TRINKET_RECIPES]) for (const id of [r.a, r.b, r.out]) expect(() => getItem(id)).not.toThrow();
  expect(FUSION_RECIPES.length).toBe(14);
  expect(TRINKET_RECIPES.length).toBe(12);
  expect(JEWEL_TRINKETS.length).toBeGreaterThan(0);
});

it("fused trinkets never drop as loot", () => {
  const run = newRun("warrior", 2);
  const fusedIds = new Set(FUSED_TRINKETS.map(f => f.id));
  for (let i = 0; i < 3000; i++) expect(fusedIds.has(rollItem(run.hero, "epic", 3, Math.random).base)).toBe(false);
});

it("two matching relics fuse at the bench, and the fee is paid", () => {
  const run = atBench();
  run.hero.relics = { hex_doll: 1, black_candle: 1 }; recompute(run.hero);
  jewelPlace(run, { kind: "relic", id: "hex_doll" });
  jewelPlace(run, { kind: "relic", id: "black_candle" });
  const cost = jewelCost(run);
  const res = jewelFuse(run);
  expect(res.ok).toBe(true);
  expect(run.hero.relics["f_witchs_altar"]).toBe(1);
  expect(run.hero.relics["hex_doll"]).toBeUndefined();
  expect(run.hero.f.gold).toBe(999 - cost.gold);
  expect(run.hero.scrap).toBe(999 - cost.scrap);
});

it("a wrong pair keeps both pieces but still costs the fee", () => {
  const run = atBench(3);
  const a = trinket(run, "tj_glass_bead"), b = trinket(run, "tj_iron_ring");
  jewelPlace(run, { kind: "item", uid: a.uid });
  jewelPlace(run, { kind: "item", uid: b.uid });
  const res = jewelFuse(run);
  expect(res.ok).toBe(false);
  expect(run.hero.backpack.some(i => i.uid === a.uid)).toBe(true);
  expect(run.hero.f.gold).toBeLessThan(999);
});

it("a secret trinket pair fuses, and a worn trinket's slot gets the result", () => {
  const run = atBench(4);
  const a = trinket(run, "tj_amber_drop");
  const coin = rollItem(run.hero, "common", 1, Math.random); coin.base = "t_lucky_coin"; coin.bonuses = { };
  run.hero.equip.trinket1 = coin; recompute(run.hero);
  jewelPlace(run, { kind: "item", uid: coin.uid });
  jewelPlace(run, { kind: "item", uid: a.uid });
  expect(jewelFuse(run).ok).toBe(true);
  expect(run.hero.equip.trinket1?.base).toBe("tf_fortunes_amber");
  expect(run.hero.backpack.some(i => i.uid === a.uid)).toBe(false);
});

it("only trinkets and relics go on the bench", () => {
  const run = atBench(5);
  expect(jewelPlace(run, { kind: "item", uid: run.hero.equip.main!.uid })).toMatch(/trinkets/);
});

it("the same relic found twice merges into one stronger relic", () => {
  const run = newRun("warrior", 6);
  grantRelic(run, "iron_ration"); grantRelic(run, "iron_ration");
  expect(run.hero.relics["iron_ration"]).toBe(2);
});

it("the Forge and the Jeweller take turns", () => {
  const run = newRun("warrior", 7);
  const seen: string[] = [];
  for (let i = 0; i < 400 && seen.length < 6; i++) { run.step = 1; const c = genChoices(run); const x = c.find(r => r === "forge" || r === "jeweller"); if (x) seen.push(x); }
  expect(seen.length).toBe(6);
  for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1]);
});
