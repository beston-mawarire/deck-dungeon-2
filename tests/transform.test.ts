import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { chooseRoom, combatAction, newRun, shopMult, shopRerollCost, priceMult, transformationChance, TRANSFORM_STREAK, wealthMult } from "../src/game/run";
beforeAll(() => loadLibrary());

it("normal fights in a row build the streak; anything else resets it", () => {
  const run = newRun("warrior", 3);
  chooseRoom(run, "fight");
  expect(run.normalStreak).toBe(1);
  chooseRoom(run, "fight");
  expect(run.normalStreak).toBe(2);
  for (const room of ["rest", "shop", "forge", "wooden"] as const) { chooseRoom(run, room); expect(run.normalStreak).toBe(2); }
  chooseRoom(run, "event");
  expect(run.normalStreak).toBe(0);
});

it("transformation odds: none before 14 in a row, then rare and rising", () => {
  expect(transformationChance(TRANSFORM_STREAK - 1)).toBe(0);
  expect(transformationChance(TRANSFORM_STREAK)).toBeCloseTo(0.03);
  expect(transformationChance(TRANSFORM_STREAK + 5)).toBeCloseTo(0.13);
});

it("a transformed monster rises as a Champion of the same kind, straight away", () => {
  for (let seed = 1; seed < 40; seed++) {
    const run = newRun("warrior", seed);
    run.normalStreak = 200;
    chooseRoom(run, "fight");
    if (run.scene.t !== "combat" || run.scene.battle.enemy.items["m_thief"]) continue;
    const base = run.scene.battle.enemy.name;
    run.scene.battle.enemy.hp = 0;
    combatAction(run, "attack");
    expect(run.scene.t).toBe("combat");
    if (run.scene.t !== "combat") return;
    expect(run.scene.rank).toBe("champion");
    expect(run.scene.battle.enemy.name).toContain(base);
    expect(run.scene.battle.enemy.name.startsWith("Champion")).toBe(true);
    expect(run.popup?.text).toContain(base);
    expect(run.normalStreak).toBe(0);
    return;
  }
  throw new Error("no plain monster found");
});

it("shop prices rise with the Gold you carry (up to +75%)", () => {
  const run = newRun("warrior", 5);
  run.hero.f.gold = 0;
  expect(wealthMult(run)).toBe(1);
  run.hero.f.gold = 100;
  expect(shopMult(run)).toBeCloseTo(priceMult(run) * 1.2);
  const cheap = shopRerollCost(run); run.hero.f.gold = 0;
  expect(shopRerollCost(run)).toBeLessThan(cheap);
  run.hero.f.gold = 5000;
  expect(wealthMult(run)).toBeCloseTo(1.75);
});
