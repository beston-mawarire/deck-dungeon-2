import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { abandonRun, chooseRoom, newRun, settleCombat, STEPS_PER_FLOOR, type Run } from "../src/game/run";
import { type Meta, recordRun } from "../src/game/meta";
import { applyKit, kitOptions, masteryLevel, MASTERY_XP } from "../src/game/progress";

beforeAll(() => loadLibrary());
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const fightIn = (run: Run, room: Parameters<typeof chooseRoom>[1], step = 1) => {
  run.step = step; run.scene = { t: "map" } as Run["scene"]; run.choices = [room];
  chooseRoom(run, room);
  const sc = run.scene as { t: string; rank?: string; battle?: { enemy: { hp: number; maxHp: number }; over?: string } };
  if (sc.t !== "combat" || !sc.battle) throw new Error(`no fight: ${sc.t}`);
  return sc as typeof sc & { battle: NonNullable<typeof sc.battle> };
};

describe("mastery, kits, heat, Abyss twists, achievements", () => {
  it("mastery levels and kit choices: a short list per class (Commons, then Uncommons, then Rares at 10)", () => {
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(MASTERY_XP[2])).toBe(2);
    // Each level takes longer than the last.
    for (let l = 3; l < MASTERY_XP.length; l++) expect(MASTERY_XP[l] - MASTERY_XP[l - 1]).toBeGreaterThan(MASTERY_XP[l - 1] - MASTERY_XP[l - 2]);
    expect(kitOptions("main", 1, new Set(), "warrior").length).toBe(0);
    const commons = kitOptions("main", 2, new Set(), "warrior");
    expect(commons.length).toBeGreaterThanOrEqual(3);
    expect(commons.length).toBeLessThanOrEqual(5);
    expect(commons.every(o => o.rarity === "common")).toBe(true);
    expect(kitOptions("main", 2).length).toBeGreaterThan(commons.length * 2);
    expect(kitOptions("main", 6, new Set(), "rogue").some(o => o.rarity === "uncommon")).toBe(true);
    expect(kitOptions("main", 9, new Set(), "mage").some(o => o.rarity === "rare")).toBe(false);
    expect(kitOptions("main", 10, new Set(), "mage").some(o => o.rarity === "rare")).toBe(true);
    const run = newRun("warrior", 7);
    const pick = commons[0].id, armour = kitOptions("armour", 2, new Set(), "warrior")[0].id;
    applyKit(run, { main: pick, armour }, 2);
    expect(run.hero.equip.main?.base).toBe(pick);
    expect(run.hero.equip.armour?.base).toBe(armour);
    expect(run.hero.equip.off?.base).toBe("o_wooden_shield");
    // Not on this class's list at this level: ignored.
    applyKit(run, { main: "g_bastard_sword" }, 2);
    expect(run.hero.equip.main?.base).toBe(pick);
  });

  it("finishing runs grows mastery and earns achievements once", () => {
    const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] };
    const run = newRun("mage", 11);
    const sc = fightIn(run, "boss", STEPS_PER_FLOOR);
    sc.battle.enemy.hp = 0; sc.battle.over = "won"; settleCombat(run);
    run.floor = 3;
    abandonRun(run);
    const res = recordRun(m, run);
    expect(res.achievements).toContain("first_boss");
    expect(m.mastery?.mage).toBe(2);
    const renown = m.renown;
    const again = newRun("mage", 12);
    again.stats.bosses = 1; abandonRun(again);
    expect(recordRun(m, again).achievements).not.toContain("first_boss");
    expect(m.renown).toBeLessThan(renown + 20);
  });

  it("the newer achievements: streaks, gear sets, class challenges, gold", () => {
    const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] };
    const run = newRun("warrior", 21);
    const p = run.hero.f.persist;
    p["bestCritStreak"] = 6; p["bestMissStreak"] = 3; p["ach_low_hp_win"] = 1; run.hero.f.gold = 2500;
    run.floor = 6; run.scene = { t: "over", won: true };
    const got = recordRun(m, run).achievements;
    for (const id of ["crit3", "crit6", "miss3", "low_hp_win", "gold2k", "warrior_noguard", "common_win", "campaign_win"]) expect(got, id).toContain(id);
    expect(got).not.toContain("gold10k");
    // Guarding even once spoils the Warrior challenge.
    const m2: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] };
    const r2 = newRun("warrior", 22);
    r2.hero.f.persist["act_guard"] = 1; r2.floor = 6; r2.scene = { t: "over", won: true };
    expect(recordRun(m2, r2).achievements).not.toContain("warrior_noguard");
  });

  it("encounter achievements: rooms, events and every choice (across runs)", async () => {
    const { EVENTS } = await import("../src/data/events");
    const { ACHIEVEMENTS } = await import("../src/game/progress");
    const { chooseEvent } = await import("../src/game/run");
    const ev = EVENTS.find(e => e.id === "spring")!;
    expect(ACHIEVEMENTS.some(a => a.id === "ev_spring")).toBe(true);
    expect(ACHIEVEMENTS.some(a => a.id === "room_rest")).toBe(true);
    const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] };
    for (let i = 0; i < ev.options.length; i++) {
      const run = newRun("cleric", 30 + i);
      run.scene = { t: "event", ev, result: null, found: [] } as Run["scene"];
      chooseEvent(run, i);
      run.scene = { t: "rest", done: false } as Run["scene"];
      const { rest } = await import("../src/game/run");
      rest(run);
      abandonRun(run);
      const got = recordRun(m, run).achievements;
      if (i === 0) { expect(got).toContain("ev_spring"); expect(got).toContain("room_rest"); }
      if (i === ev.options.length - 1) expect(got).toContain("evall_spring");
    }
  });

});
