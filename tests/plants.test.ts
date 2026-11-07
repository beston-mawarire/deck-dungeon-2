import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { applyHall, BREWS, campOf, gardenPlots, harvest, PLANTS, TONIC_BREWS } from "../src/game/camp";
import type { Meta } from "../src/game/meta";
import { applyStatus } from "../src/engine/statuses";
import { chooseRoom, drinkDraught, hazardStep, newRun, startCrawl, useTonic } from "../src/game/run";

loadLibrary();
const meta = (): Meta => ({ renown: 0, runs: 0, wins: 0 } as never);
type B = { round: number; player: { hp: number; maxHp: number; flags: Record<string, number>; statuses: Record<string, number> }; enemy: { elite?: boolean; boss?: boolean; champion?: boolean; statuses: Record<string, number> } };
const fight = (tonics: Record<string, number>) => {
  const run = newRun("warrior", 77);
  run.hero.tonics = tonics;
  chooseRoom(run, "fight");
  return { run, b: (run.scene as unknown as { battle: B }).battle };
};

describe("the Garden's new plants", () => {
  it("Steelvine grows into a weapon (never herbs), and the odds lean Uncommon", () => {
    const m = meta();
    const plots = gardenPlots(m);
    const tally: Record<string, number> = {};
    for (const x of [0.01, 0.1, 0.3, 0.9]) {
      plots[0] = { plant: "steelvine", left: 0 };
      expect(harvest(m, 0, () => x)).toMatch(/weapon/);
    }
    for (const r of campOf(m).sprouts!) tally[r] = (tally[r] ?? 0) + 1;
    expect(tally).toEqual({ legendary: 1, epic: 1, rare: 1, uncommon: 1 });
    expect(campOf(m).herbs?.steelvine ?? 0).toBe(0);
    expect(PLANTS.steelvine.weapon).toBe(true);
  });

  it("the Brewery's fight brews go into your tonics, Treadleaf Tea into your draughts", () => {
    const m = meta(), run = newRun("warrior", 3);
    const c = campOf(m);
    c.brews = { snack: 1, stout: 1, salve: 1, bane: 1, tread: 1 };
    applyHall(m, run);
    for (const k of TONIC_BREWS) expect(run.hero.tonics?.[k]).toBe(1);
    expect(run.hero.draughts?.tread).toBe(1);
    expect(BREWS.tread.floors).toBe(2);
  });
});

describe("the Garden's tonics in a fight", () => {
  it("Roasted Sweetroot heals less than a potion; Stoutroot raises max HP for the fight", () => {
    const { run, b } = fight({ snack: 1, stout: 1 });
    b.player.hp = 10;
    useTonic(run, "snack");
    expect(b.player.hp).toBe(10 + Math.round(b.player.maxHp * 0.15));
    const max = b.player.maxHp;
    useTonic(run, "stout");
    expect(b.player.maxHp).toBe(max + Math.round(max * 0.25));
  });

  it("Frostmoss Salve keeps elemental statuses off you for four rounds", () => {
    const { run, b } = fight({ salve: 1 });
    useTonic(run, "salve");
    const r0 = b.round;
    applyStatus(b as never, b.enemy as never, b.player as never, "burn", 3);
    applyStatus(b as never, b.enemy as never, b.player as never, "poison", 3);
    expect(b.player.statuses.burn ?? 0).toBe(0);
    expect(b.player.statuses.poison ?? 0).toBe(0);
    b.round = r0 + 4;
    applyStatus(b as never, b.enemy as never, b.player as never, "burn", 3);
    expect(b.player.statuses.burn).toBe(3);
  });

  it("Banewort weakens and exposes only elites, champions and bosses", () => {
    const a = fight({ bane: 1 });
    expect(useTonic(a.run, "bane")).toMatch(/only bites the strong/);
    expect(a.b.enemy.statuses.weak ?? 0).toBe(0);
    const e = fight({ bane: 1 });
    e.b.enemy.elite = true;
    expect(useTonic(e.run, "bane")).toBeNull();
    expect(e.b.enemy.statuses.weak).toBe(2);
    expect(e.b.enemy.statuses.exposed).toBe(2);
  });
});

describe("Treadleaf Tea", () => {
  it("floor hazards can't hurt you while it lasts", () => {
    const run = newRun("warrior", 5); startCrawl(run);
    const m = run.grid!;
    m.haz ??= {} as never;
    (m.haz as unknown as Record<number, string>)[m.py * m.w + m.px] = "spike";
    const hp = run.hero.f.hp;
    expect(hazardStep(run)).toBeGreaterThan(0);
    run.hero.f.hp = hp;
    run.hero.draughts = { tread: 1 };
    expect(drinkDraught(run, "tread")).toBeNull();
    expect(hazardStep(run)).toBe(0);
    m.burn = 3;
    expect(hazardStep(run)).toBe(0);
    expect(run.hero.f.hp).toBe(hp);
  });
});
