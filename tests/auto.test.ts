import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { type Run, autoBattle, canAutoBattle, chooseRoom, newRun } from "../src/game/run";
beforeAll(() => loadLibrary());
const S = (r: Run): Run["scene"] => r.scene;

it("auto-battle is offered when plain attacks surely win, and it wins", () => {
  const run = newRun("warrior", 21);
  chooseRoom(run, "fight");
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no fight");
  sc.battle.enemy.hp = 3; sc.battle.enemy.damage = 1; sc.battle.enemy.items = {}; sc.battle.enemy.faces = sc.battle.enemy.faces.map(() => ({ kind: "graze" as const }));
  run.hero.f.hp = run.hero.f.maxHp;
  expect(canAutoBattle(run)).toBe(true);
  const note = autoBattle(run);
  expect(note).toMatch(/won/);
  expect(S(run).t).not.toBe("combat");
});

it("auto-battle is not offered against a foe that could beat plain attacks", () => {
  const run = newRun("warrior", 22);
  chooseRoom(run, "fight");
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no fight");
  sc.battle.enemy.hp = sc.battle.enemy.maxHp = 500; sc.battle.enemy.damage = 30;
  expect(canAutoBattle(run)).toBe(false);
  expect(autoBattle(run)).toBeNull();
  expect(S(run).t).toBe("combat");
});

it("the check doesn't touch the real fight", () => {
  const run = newRun("warrior", 23);
  chooseRoom(run, "fight");
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no fight");
  const before = JSON.stringify({ p: sc.battle.player.hp, e: sc.battle.enemy.hp, r: sc.battle.round, st: sc.battle.player.statuses, g: run.hero.f.gold, q: run.hero.f.persist });
  canAutoBattle(run);
  expect(JSON.stringify({ p: sc.battle.player.hp, e: sc.battle.enemy.hp, r: sc.battle.round, st: sc.battle.player.statuses, g: run.hero.f.gold, q: run.hero.f.persist })).toBe(before);
});

it("never offered against bosses", () => {
  const run = newRun("warrior", 24);
  chooseRoom(run, "boss");
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no fight");
  sc.battle.enemy.hp = 1;
  expect(canAutoBattle(run)).toBe(false);
});
