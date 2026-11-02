import { beforeAll, describe, expect, it } from "vitest";
import { GEAR_BASES, loadLibrary } from "../src/data";
import { GEN_MATERIALS, GEN_MODULES, VEINED } from "../src/data/genparts";
import { makeMonster } from "../src/data/monsters";
import { playRound, startBattle } from "../src/engine/combat";
import { makeRng } from "../src/engine/rng";
import type { GearItem, Rarity } from "../src/engine/types";
import { equipItem, itemLines, itemName, newHero, recompute, slotsFor } from "../src/game/hero";
import { generate, genBudget, genPower, GEN_MODULE_MAP } from "../src/game/gen";
import { rollGenerated } from "../src/game/loot";

beforeAll(() => loadLibrary());
const RARS: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "crimson"];

describe("item generator", () => {
  it("has a big, valid parts library", () => {
    expect(GEN_MATERIALS.length).toBeGreaterThanOrEqual(45);
    expect(GEN_MODULES.length).toBeGreaterThanOrEqual(150);
    for (const m of [...GEN_MATERIALS, VEINED]) expect(GEN_MODULE_MAP.has(m.innate), `${m.id} → ${m.innate}`).toBe(true);
  });

  it("stress test: 30,000 items roll cleanly, read cleanly and stay in their power band", () => {
    const rng = makeRng(12345);
    const bases = GEAR_BASES.filter(b => !b.legendary && (b.weight ?? 1) > 0);
    let broken = 0, total = 0, bigEpic = 0, over = 0;
    const effects: Record<string, number[]> = {};
    for (let i = 0; i < 30000; i++) {
      const rarity = RARS[i % RARS.length];
      const base = bases[Math.floor(rng() * bases.length)];
      const depth = 1 + Math.floor(rng() * 25);
      const r = generate(base, rarity, depth, depth, rng);
      total++;
      if (r.broken) { broken++; continue; }
      const n = r.mods.length + (r.sig?.length ?? 0) + 1;
      (effects[rarity] ??= []).push(n);
      if ((rarity === "epic" || rarity === "legendary" || rarity === "crimson") && n > 4) bigEpic++;
      // Graded (✦) rolls are allowed above the band; without grades, items stay near their budget.
      if (!r.mods.some(m => m[2] > 0) && genPower(r) > genBudget(rarity, base.slot) * 1.25 + 5) over++;
      if (i % 50 === 0) {
        const item: GearItem = { uid: i, base: base.id, rarity, level: depth, bonuses: {}, revealed: true, gen: r };
        const text = [itemName(item), ...itemLines(item)].join(" | ");
        expect(text, text).not.toMatch(/\{|undefined|NaN/);
      }
    }
    expect(over).toBe(0);
    expect(broken / total).toBeGreaterThan(0.0005);
    expect(broken / total).toBeLessThan(0.01);
    expect(bigEpic).toBeGreaterThan(100);
    const avg = (r: string) => effects[r].reduce((a, b) => a + b, 0) / effects[r].length;
    expect(avg("legendary")).toBeGreaterThan(avg("epic"));
    expect(avg("epic")).toBeGreaterThan(avg("rare"));
  });

  it("generated gear works in real fights", () => {
    const rng = makeRng(77);
    for (let k = 0; k < 120; k++) {
      const h = newHero((["warrior", "rogue", "mage", "cleric"] as const)[k % 4]);
      for (let j = 0; j < 4; j++) {
        const it = rollGenerated(h, RARS[(k + j) % RARS.length], 1 + (k % 20), rng);
        if (!it) continue;
        const slot = slotsFor(it, h)[0];
        if (slot) equipItem(h, it, slot);
      }
      recompute(h);
      expect(Number.isFinite(h.f.maxHp)).toBe(true);
      const e = makeMonster(rng, 1 + (k % 10), k % 3 === 0 ? "elite" : "normal");
      const b = startBattle(h.f, e, k);
      for (let r = 0; r < 12 && !b.over; r++) playRound(b, r % 4 === 3 ? "guard" : "attack");
      expect(b.round > 0 || !!b.over).toBe(true);
    }
  });

  it("the Talisman: sigils drop, wear into limited slots, and sets switch on their bonuses", async () => {
    const { newRun, rollSigilDrop, wearSigil } = await import("../src/game/run");
    const { sigilSlots } = await import("../src/game/hero");
    const run = newRun("warrior", 5);
    expect(sigilSlots(run.hero)).toBe(2);
    run.hero.sigilBag = [{ uid: 901, id: "sc_ember_signet", level: 4 }, { uid: 902, id: "sc_cinder_crown", level: 4 }, { uid: 903, id: "gm_armor", level: 4, tier: 3 }];
    expect(wearSigil(run, 901)).toBeNull();
    expect(run.hero.f.items["sb_ember_2"]).toBeUndefined();
    expect(wearSigil(run, 902)).toBeNull();
    expect(run.hero.f.items["sb_ember_2"]).toBe(1);
    expect(wearSigil(run, 903)).toMatch(/full/);
    run.hero.f.persist["floor"] = 6;
    expect(sigilSlots(run.hero)).toBe(4);
    let got = 0;
    for (let i = 0; i < 200; i++) if (rollSigilDrop(run, 1, 0.5)) got++;
    expect(got).toBeGreaterThan(5);
    expect(run.hero.sigilBag!.length).toBeLessThanOrEqual(12);
  });
});
