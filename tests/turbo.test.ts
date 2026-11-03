import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { advance, canAutoBattle, chooseRoom, chooseTalent, combatAction, continueEndless, finishLoot, genChoices, makeTurbo, newRun, reached, runSummary, shownFloor, stepsOf, takeItem, TURBO_DEPTHS, TURBO_FLOORS, type Run } from "../src/game/run";
beforeAll(() => loadLibrary());

const bot = (run: Run, maxSteps = 4000) => {
  for (let guard = 0; guard < maxSteps && run.scene.t !== "over"; guard++) {
    const s = run.scene;
    if (s.t === "map") chooseRoom(run, run.choices[0]);
    else if (s.t === "confirm") advance(run);
    else if (s.t === "combat") { expect(canAutoBattle(run)).toBe(false); combatAction(run, "attack"); }
    else if (s.t === "loot") { for (const it of [...s.items]) if (takeItem(run, it.uid, "pack")) break; finishLoot(run); }
    else if (s.t === "pick") takeItem(run, s.items[0].uid, "pack") && finishLoot(run);
    else if (s.t === "talent") chooseTalent(run, s.options[0]);
    else if (s.t === "resplendent") { s.picked = 0; finishLoot(run); }
    else advance(run);
  }
};

it("Turbo floors have 6 rooms, the floors shown run 1 to 15, and each stands for a deeper one", () => {
  const run = newRun("warrior", 5); makeTurbo(run);
  expect(run.turbo).toBe(true);
  expect(stepsOf(run)).toBe(6);
  expect(TURBO_FLOORS).toBe(15);
  for (let f = 1; f <= 15; f++) { run.floor = TURBO_DEPTHS[f]; expect(shownFloor(run)).toBe(f); }
  run.floor = TURBO_DEPTHS[3];
  expect(runSummary(run).floor).toBe(3);
  expect(runSummary(run).turbo).toBe(1);
  run.floor = 1; run.step = 6;
  expect(genChoices(run)).toEqual(["boss"]);
});

it("Turbo opens early content from floor 1 and deeper content from floor 5", () => {
  const run = newRun("mage", 6); makeTurbo(run);
  run.floor = 1;
  expect(reached(run, 3)).toBe(true);
  expect(reached(run, 5)).toBe(false);
  expect(reached(run, 20)).toBe(false);
  run.floor = 5;
  expect(reached(run, 20)).toBe(true);
  const std = newRun("mage", 6);
  expect(reached(std, 3)).toBe(false);
});

it("bots play Turbo runs through (no Quick Battles), and a won Campaign goes on to Endless ending by floor 15", () => {
  for (let seed = 1; seed <= 6; seed++) {
    const run = newRun((["warrior", "rogue", "mage", "cleric"] as const)[seed % 4], seed); makeTurbo(run);
    bot(run);
    expect(run.scene.t).toBe("over");
    expect(shownFloor(run)).toBeLessThanOrEqual(6);
    if (run.scene.t === "over" && run.scene.won) {
      continueEndless(run); run.scene = { t: "map" }; advance(run);
      bot(run);
      expect(shownFloor(run)).toBeLessThanOrEqual(TURBO_FLOORS);
    }
  }
});
