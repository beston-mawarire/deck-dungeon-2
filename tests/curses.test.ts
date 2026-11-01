import { it, expect, beforeAll } from "vitest";
import { loadLibrary } from "../src/data";
import { MOVE_LIBRARY } from "../src/data/bosses";
import { chooseRoom, combatAction, newRun } from "../src/game/run";
beforeAll(() => loadLibrary());

it("Accursed elite: 3 real hits -> curse after the fight", () => {
  const run = newRun("warrior", 7);
  chooseRoom(run, "fight");
  if (run.scene.t !== "combat") throw new Error("no fight");
  const b = run.scene.battle;
  b.enemy.items = { ...b.enemy.items, x_accursed: 1 };
  b.enemy.hp = b.enemy.maxHp = 9999; b.enemy.damage = 3;
  let rounds = 0;
  while ((b.enemy.flags["accursed"] ?? 0) < 3 && rounds++ < 60) { b.player.hp = b.player.maxHp; combatAction(run, "attack"); }
  b.enemy.hp = 0; combatAction(run, "attack");
  expect(Object.keys(run.hero.curses).length).toBe(1);
});

it("Malediction move -> curse; second use hexes", () => {
  const run = newRun("warrior", 8);
  chooseRoom(run, "fight");
  if (run.scene.t !== "combat") throw new Error("no fight");
  const b = run.scene.battle;
  const m = MOVE_LIBRARY.malediction(1);
  m.act(b, b.enemy, b.player); m.act(b, b.enemy, b.player);
  b.enemy.hp = 0; combatAction(run, "attack");
  expect(Object.keys(run.hero.curses).length).toBe(1);
});
