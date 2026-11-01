import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { MOVE_LIBRARY } from "../src/data/bosses";
import { getItem } from "../src/engine/registry";
import { chooseRoom, combatAction, drinkMana, drinkPotion, newRun, payTribute, rest, tributeCost } from "../src/game/run";
import { recompute } from "../src/game/hero";
beforeAll(() => loadLibrary());

it("Parching Touch: a normal foe's 3rd hit curses you Parched at once, and it lasts the run", () => {
  const run = newRun("warrior", 11);
  chooseRoom(run, "fight");
  if (run.scene.t !== "combat") throw new Error("no fight");
  const b = run.scene.battle;
  b.enemy.items = { m_parching: 1 }; b.enemy.hp = b.enemy.maxHp = 9999; b.enemy.damage = 2;
  let guard = 0;
  while ((b.enemy.flags["parching"] ?? 0) < 3 && guard++ < 60) { b.player.hp = b.player.maxHp; combatAction(run, "attack"); }
  expect(b.player.items["c_parched"]).toBe(1);
  run.hero.potions = 2; run.hero.manaPotions = 1;
  expect(drinkPotion(run)).toMatch(/Parched/);
  expect(drinkMana(run)).toMatch(/Parched/);
  expect(run.hero.potions).toBe(2);
  b.enemy.hp = 0; combatAction(run, "attack");
  expect(run.hero.curses["c_parched"]).toBe(1);
});

it("Withering Breath parches once per fight, then burns", () => {
  const run = newRun("warrior", 12);
  chooseRoom(run, "fight");
  if (run.scene.t !== "combat") throw new Error("no fight");
  const b = run.scene.battle;
  const m = MOVE_LIBRARY.parch(1);
  m.act(b, b.enemy, b.player);
  expect(b.player.items["c_parched"]).toBe(1);
  m.act(b, b.enemy, b.player);
  expect(b.player.statuses.burn ?? 0).toBeGreaterThan(0);
});

it("Parching is an Elite/Champion affix", () => {
  expect(getItem("x_parching").name).toBe("Parching");
});

it("campfires only heal now", () => {
  const run = newRun("warrior", 13);
  run.hero.curses["c_rust"] = 1; recompute(run.hero);
  chooseRoom(run, "rest");
  rest(run);
  expect(run.hero.curses["c_rust"]).toBe(1);
});

it("Holy Tribute lifts one chosen curse per payment, each dearer than the last", () => {
  const run = newRun("warrior", 14);
  run.hero.curses = { c_rust: 1, c_withered: 1, c_haunted: 1 }; recompute(run.hero);
  run.hero.f.gold = 1000;
  run.scene = { t: "tribute", paid: 0 };
  const first = tributeCost(run);
  expect(payTribute(run, "c_withered")).toBeNull();
  expect(run.hero.curses["c_withered"]).toBeUndefined();
  const second = tributeCost(run);
  expect(second).toBeGreaterThan(first);
  run.hero.f.gold = 0;
  expect(payTribute(run, "c_rust")).toMatch(/Gold/);
  expect(run.hero.curses["c_rust"]).toBe(1);
});
