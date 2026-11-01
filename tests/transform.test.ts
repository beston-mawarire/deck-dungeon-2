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
  if (run.scene.t !== "combat") expect(run.normalStreak).toBe(2); // events don't break it…
  run.scene = { t: "map" };
  chooseRoom(run, "boss");
  expect(run.normalStreak).toBe(2); // …nor does the floor boss…
  run.scene = { t: "map" };
  chooseRoom(run, "elite");
  expect(run.normalStreak).toBe(0); // …but fighting anything else does
});

it("transformation odds: none before 14 in a row, then rare and rising", () => {
  expect(transformationChance(TRANSFORM_STREAK - 1)).toBe(0);
  expect(transformationChance(TRANSFORM_STREAK)).toBeCloseTo(0.1);
  expect(transformationChance(TRANSFORM_STREAK + 4)).toBeCloseTo(0.5);
  expect(transformationChance(TRANSFORM_STREAK + 50)).toBeCloseTo(0.9);
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
    if (run.scene.t !== "combat") continue; // (the 10% of the time it doesn't happen even on a huge streak)
    expect(run.scene.rank).toBe("champion");
    expect(run.scene.battle.enemy.name).toContain(base);
    expect(run.scene.battle.enemy.name.startsWith("Champion")).toBe(true);
    expect(run.popup?.text).toContain(base);
    expect(run.normalStreak).toBe(0);
    return;
  }
  throw new Error("never transformed");
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

it("a long plain-fight streak transforms a monster before long", () => {
  let fights = 0;
  for (let seed = 1; seed <= 30; seed++) {
    const run = newRun("warrior", 100 + seed);
    for (let i = 0; i < 40; i++) {
      run.choices = ["fight"];
      chooseRoom(run, "fight");
      if (run.scene.t !== "combat") break;
      run.hero.f.hp = run.hero.f.maxHp;
      run.scene.battle.enemy.hp = 0;
      combatAction(run, "attack");
      if ((run.scene as { t: string }).t === "combat") { fights += i + 1; break; }
      run.scene = { t: "map" };
    }
  }
  // On average it should happen within a handful of fights after the 14th.
  expect(fights / 30).toBeLessThan(22);
});
