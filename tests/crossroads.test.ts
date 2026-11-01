import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { CROSSROADS_GUISES, crossroadsEvent } from "../src/data/events";
import { type Run, chooseEvent, chooseRoom, combatAction, genChoices, newRun } from "../src/game/run";
beforeAll(() => loadLibrary());
const S = (r: Run): Run["scene"] => r.scene;

const atCrossroads = (floor: number, step: number) => {
  const run = newRun("warrior", 7);
  run.floor = floor; run.step = step;
  run.scene = { t: "event", ev: crossroadsEvent(CROSSROADS_GUISES[0]), result: null, found: [] };
  return run;
};

it("the past: back to the first room of the previous floor, keeping everything", () => {
  const run = atCrossroads(4, 5);
  run.hero.f.gold = 123;
  chooseEvent(run, 0);
  expect(run.floor).toBe(3);
  expect(run.step).toBe(0);
  expect(S(run).t).toBe("map");
  expect(run.hero.f.gold).toBe(123);
});

it("the future: a fight with DEATH", () => {
  const run = atCrossroads(2, 3);
  chooseEvent(run, 1);
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no fight");
  expect(sc.battle.enemy.name).toBe("DEATH");
  expect(sc.rank).toBe("boss");
});

it("leaving does nothing", () => {
  const run = atCrossroads(3, 2);
  chooseEvent(run, 2);
  expect(run.floor).toBe(3);
  expect(S(run).t).toBe("event");
});

it("every guise has three choices and its own look", () => {
  const titles = new Set(CROSSROADS_GUISES.map(g => g.title));
  expect(titles.size).toBe(CROSSROADS_GUISES.length);
  for (const g of CROSSROADS_GUISES) expect(crossroadsEvent(g).options.length).toBe(3);
});

it("the Crossroads path: only from floor 2, and only once a run", () => {
  const run = newRun("warrior", 8);
  for (let i = 0; i < 300; i++) expect(genChoices(run)).not.toContain("crossroads");
  run.floor = 3;
  let seen = false;
  for (let i = 0; i < 3000 && !seen; i++) seen = genChoices(run).includes("crossroads");
  expect(seen).toBe(true);
  run.choices = ["crossroads"];
  chooseRoom(run, "crossroads");
  expect(S(run).t).toBe("event");
  for (let i = 0; i < 2000; i++) expect(genChoices(run)).not.toContain("crossroads");
});

it("at most two Dragon Hearts a run", () => {
  const run = newRun("warrior", 9);
  run.hero.dragonHeart = { level: 2 };
  const ev = { id: "x", title: "x", icon: "x", text: "", options: [{ label: "wake", run: (c: { wakeDragon: (s?: boolean) => void }) => { c.wakeDragon(); return ""; } }] };
  run.scene = { t: "event", ev: ev as never, result: null, found: [] };
  chooseEvent(run, 0);
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no dragon");
  sc.battle.enemy.hp = 0;
  combatAction(run, "attack");
  expect(run.hero.dragonHeart?.level).toBe(2);
  const loot = S(run);
  if (loot.t === "loot") expect(loot.dragonHeart).toBeUndefined();
});
