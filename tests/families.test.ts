import { beforeAll, expect, it } from "vitest";
import { GEAR_BASES } from "../src/data/gear";
import { LEGENDARIES, loadLibrary } from "../src/data";
import { makeMonster } from "../src/data/monsters";
import { startBattle } from "../src/engine/combat";
import { makeRng } from "../src/engine/rng";
import { applyStatus, st } from "../src/engine/statuses";
import { classify, familyLine } from "../src/game/families";
import { baseOf, equipItem, newHero, recompute } from "../src/game/hero";
beforeAll(() => loadLibrary());

it("every base has a family and a load", () => {
  for (const b of [...GEAR_BASES, ...LEGENDARIES]) {
    const c = classify(b);
    expect(c.family).toBeTruthy();
    expect(c.load).toBeTruthy();
    if (b.kind === "weapon" && b.weaponType !== "grenade") expect(c.strike).toBeTruthy();
  }
  expect(familyLine(baseOf("w_sword"))).toMatch(/Short Blade · Medium · Blade/);
});

it("shields come light, standard and heavy", () => {
  const loads = new Set(GEAR_BASES.filter(b => b.shield).map(b => classify(b).load));
  expect([...loads].sort()).toEqual(["heavy", "light", "medium"]);
});

it("heavy gear: no Dodge, Evade or Haste", () => {
  const h = newHero("rogue");
  const heavy = GEAR_BASES.find(b => b.kind === "armour" && classify(b).load === "heavy" && !b.onlyRarity)!;
  equipItem(h, { uid: 900, base: heavy.id, rarity: "common", level: 1, bonuses: {}, revealed: true });
  recompute(h);
  expect(h.f.heavyGear).toBe(true);
  const b = startBattle(h.f, makeMonster(makeRng(2), 1, "normal"), 3);
  applyStatus(b, h.f, h.f, "evade", 2);
  applyStatus(b, h.f, h.f, "haste", 2);
  expect(st(h.f, "evade")).toBe(0);
  expect(st(h.f, "haste")).toBe(0);
});
