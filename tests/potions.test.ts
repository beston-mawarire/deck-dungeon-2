import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { POTION_GEAR, POTION_LEGENDARIES, POTION_RELICS, POTION_SLOTS } from "../src/data/potions";
import { LEGENDARIES } from "../src/data";
import { gainPotions, potionCap, recompute } from "../src/game/hero";
import { type Run, buy, chooseRoom, combatAction, drinkPotion, newRun } from "../src/game/run";
import { rollItem } from "../src/game/loot";
beforeAll(() => loadLibrary());
const S = (r: Run): Run["scene"] => r.scene;

it("you carry at most 3 Healing Potions", () => {
  const run = newRun("warrior", 1);
  const h = run.hero;
  expect(potionCap(h)).toBe(3);
  h.potions = 1;
  expect(gainPotions(h, 5)).toBe(2);
  expect(h.potions).toBe(3);
});

it("you drink at most 3 per fight", () => {
  const run = newRun("warrior", 2);
  const h = run.hero;
  chooseRoom(run, "fight");
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no fight");
  sc.battle.enemy.hp = sc.battle.enemy.maxHp = 99999;
  h.potions = 3;
  for (let i = 0; i < 3; i++) { h.f.hp = 1; expect(drinkPotion(run)).toBeNull(); }
  h.potions = 2; h.f.hp = 1;
  expect(drinkPotion(run)).toMatch(/3 potions/);
  expect(h.potions).toBe(2);
  // A Rare potion relic: two more slots, so two more drinks this fight.
  h.relics = { pc_spare_vial: 1 }; recompute(h);
  for (let i = 0; i < 2; i++) { h.f.hp = 1; expect(drinkPotion(run)).toBeNull(); }
  h.potions = 1; h.f.hp = 1;
  expect(drinkPotion(run)).toMatch(/5 potions/);
});

it("potion slots scale with rarity: Uncommon +1, Rare +2, Epic +3, Legendary +4", () => {
  for (const g of POTION_GEAR) expect(POTION_SLOTS[g.id]).toBe({ uncommon: 1, rare: 2, epic: 3 }[g.onlyRarity as "rare"]);
  for (const g of POTION_LEGENDARIES) expect(POTION_SLOTS[g.id]).toBe(4);
  expect(POTION_SLOTS["pc_potion_belt"]).toBe(1);
  expect(POTION_SLOTS["pc_spare_vial"]).toBe(2);
  expect(POTION_SLOTS["pc_grail"]).toBe(4);
});

it("each piece of potion gear and each potion relic adds its slots", () => {
  const run = newRun("warrior", 3);
  const h = run.hero;
  for (const r of POTION_RELICS) { h.relics = { [r.id]: 1 }; recompute(h); expect(potionCap(h)).toBe(3 + POTION_SLOTS[r.id]); }
  h.relics = {}; recompute(h);
  for (const g of POTION_GEAR) {
    const it = rollItem(h, g.onlyRarity ?? "uncommon", 3, Math.random);
    it.base = g.id;
    const slot = g.slot === "trinket" ? "trinket1" : g.slot;
    const prev = h.equip[slot as "main"];
    h.equip[slot as "main"] = it; recompute(h);
    expect(potionCap(h)).toBe(3 + POTION_SLOTS[g.id]);
    h.equip[slot as "main"] = prev; recompute(h);
  }
});

it("the Merchant won't sell you a potion you can't carry", () => {
  const run = newRun("warrior", 4);
  run.hero.f.gold = 999; run.hero.potions = 3;
  run.scene = { t: "shop", stock: [{ kind: "potion", price: 15 }] };
  expect(buy(run, 0)).toMatch(/carry/);
  expect(run.hero.f.gold).toBe(999);
});

it("potion gear spans Uncommon to Legendary", () => {
  const r = new Set([...POTION_GEAR.map(g => g.onlyRarity), ...POTION_LEGENDARIES.map(g => g.rarity), ...POTION_RELICS.map(x => x.rarity)]);
  for (const l of POTION_LEGENDARIES) expect(LEGENDARIES.some(x => x.id === l.id)).toBe(true);
  for (const k of ["uncommon", "rare", "epic", "legendary"]) expect(r.has(k as never)).toBe(true);
  expect(combatAction).toBeDefined();
});
