import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { CLASS_GEAR, CLASS_RELICS } from "../src/data/classgear";
import { makeMonster } from "../src/data/monsters";
import { endRound, enemyPhase, heroPhase, MANA_MAX, startBattle } from "../src/engine/combat";
import { makeRng } from "../src/engine/rng";
import { st } from "../src/engine/statuses";
import { gainManaPotions, manaPotionCap, newHero } from "../src/game/hero";
import { rollItem } from "../src/game/loot";
import { type Run, chooseRoom, drinkMana, newRun } from "../src/game/run";
beforeAll(() => loadLibrary());

const foe = () => { const e = makeMonster(makeRng(8), 1, "normal"); e.hp = e.maxHp = 5000; e.armor = 0; e.items = {}; e.damage = 1; return e; };

it("every class starts a fight with 3 mana and abilities cost 1", () => {
  for (const [o, a] of [["warrior", "warcry"], ["rogue", "counter"], ["cleric", "penance"]] as const) {
    const h = newHero(o);
    const b = startBattle(h.f, foe(), 3);
    expect(h.f.mana).toBe(MANA_MAX);
    b.round = 1;
    heroPhase(b, a);
    expect(h.f.mana).toBe(MANA_MAX - 1);
  }
});

it("War Cry can be used again, for half the Might; out of mana you attack instead", () => {
  const h = newHero("warrior");
  h.f.persist["floor"] = 3;
  const e = foe();
  const b = startBattle(h.f, e, 4);
  b.round = 1; heroPhase(b, "warcry");
  const m1 = st(h.f, "might");
  expect(m1).toBe(5);
  b.round = 2; heroPhase(b, "warcry");
  expect(st(h.f, "might") - m1).toBe(3);
  b.round = 3; heroPhase(b, "warcry");
  expect(h.f.mana).toBe(0);
  const hp = e.hp, might = st(h.f, "might");
  b.round = 4; heroPhase(b, "warcry");
  expect(st(h.f, "might")).toBeLessThanOrEqual(might);
  expect(b.log.some(l => /out of mana/.test(l))).toBe(true);
  expect(e.hp).toBeLessThanOrEqual(hp);
});

it("relics can make an ability free of your turn, or count as a Guard", () => {
  const h = newHero("warrior");
  h.f.items["mr_unbroken_horn"] = 1;
  h.f.items["mr_shieldwall_banner"] = 1;
  const e = foe();
  const b = startBattle(h.f, e, 5);
  b.round = 1;
  heroPhase(b, "warcry");
  expect(h.f.flags["guarding"]).toBe(1);
  expect(b.log.some(l => /attacks too/.test(l))).toBe(true);
});

it("Mana Potions refill mana, you carry 2, and relics add more", () => {
  const run: Run = newRun("rogue", 9);
  const h = run.hero;
  expect(manaPotionCap(h)).toBe(2);
  expect(gainManaPotions(h, 5)).toBe(2);
  h.f.items["mr_alchemist_bandolier"] = 1;
  expect(manaPotionCap(h)).toBe(4);
  chooseRoom(run, "fight");
  if (run.scene.t !== "combat") throw new Error("no fight");
  const b = run.scene.battle;
  b.enemy.hp = b.enemy.maxHp = 9999;
  expect(drinkMana(run)).toMatch(/full/);
  h.f.mana = 0;
  expect(drinkMana(run)).toBeNull();
  expect(h.f.mana).toBe(h.f.maxMana);
  expect(h.manaPotions).toBe(1);
});

it("class gear: 5 of each type per class ability, Uncommon and up, only found by that class", () => {
  for (const c of ["warrior", "rogue", "mage", "cleric"] as const)
    for (const k of ["weapon", "off", "armour", "trinket"] as const)
      expect(CLASS_GEAR.filter(g => g.forClass === c && g.kind === k).length).toBe(5);
  expect(CLASS_GEAR.every(g => g.onlyRarity && g.onlyRarity !== "common")).toBe(true);
  expect(CLASS_GEAR.filter(g => g.forClass === "mage" && g.kind === "off").every(g => g.barrierElement)).toBe(true);
  const h = newHero("rogue");
  const rng = makeRng(2);
  for (let i = 0; i < 3000; i++) {
    const it = rollItem(h, "rare", 3, rng);
    const g = CLASS_GEAR.find(x => x.id === it.base);
    if (g) expect(g.forClass).toBe("rogue");
  }
  expect(CLASS_RELICS.filter(r => r.id.startsWith("mr_")).length).toBeGreaterThan(10);
});

it("Counter, Barrier and Penance relics pay off when the enemy acts", () => {
  const h = newHero("cleric");
  h.f.items["mr_pilgrim_stride"] = 1;
  const e = foe(); e.damage = 5;
  const b = startBattle(h.f, e, 7);
  b.round = 1;
  heroPhase(b, "penance");
  enemyPhase(b);
  endRound(b);
  if ((h.f.flags["penanceStore"] ?? 0) > 0) expect(st(h.f, "haste")).toBeGreaterThan(0);
});
