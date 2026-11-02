import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { abandonRun, chooseRoom, newRun, settleCombat, STEPS_PER_FLOOR, type Run } from "../src/game/run";
import { type Meta, recordRun } from "../src/game/meta";
import { applyKit, currentAbyssMod, kitOptions, masteryLevel, MASTERY_XP } from "../src/game/progress";

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
  it("mastery levels and kit choices (Commons, then Uncommons)", () => {
    expect(masteryLevel(0)).toBe(1);
    expect(masteryLevel(MASTERY_XP[2])).toBe(2);
    expect(kitOptions("main", 1).length).toBe(0);
    const commons = kitOptions("main", 2);
    expect(commons.length).toBeGreaterThanOrEqual(12);
    expect(commons.every(o => o.rarity === "common")).toBe(true);
    expect(kitOptions("main", 6).some(o => o.rarity === "uncommon")).toBe(true);
    expect(kitOptions("off", 2).some(o => o.id === "g_butcher_knife")).toBe(true);
    const run = newRun("warrior", 7);
    applyKit(run, { main: "g_hatchet", armour: "g_fur_cloak" }, 2);
    expect(run.hero.equip.main?.base).toBe("g_hatchet");
    expect(run.hero.equip.armour?.base).toBe("g_fur_cloak");
    expect(run.hero.equip.off?.base).toBe("o_wooden_shield");
    // Not allowed at this level: ignored.
    applyKit(run, { main: "g_bastard_sword" }, 2);
    expect(run.hero.equip.main?.base).toBe("g_hatchet");
  });

  it("Heat makes enemies tougher; an Abyss Crimson Tide turns Champions Crimson", () => {
    const a = newRun("rogue", 9), b = newRun("rogue", 9);
    b.heat = 1;
    const ea = fightIn(a, "fight").battle.enemy, eb = fightIn(b, "fight").battle.enemy;
    expect(eb.maxHp).toBe(Math.round(ea.maxHp * 1.3));
    const ab = newRun("rogue", 10, "abyss");
    ab.abyssMod = "crimson_tide";
    expect(fightIn(ab, "elite").rank).toBe("crimson");
    expect(typeof currentAbyssMod().name).toBe("string");
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
    expect(m.mastery?.mage).toBe(3);
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

  it("Heat 2 halves Gold; Heat 3 halves healing; Heat 4 removes the after-fight heal", async () => {
    const { collectLoot } = await import("../src/game/run");
    const a = newRun("warrior", 51), b = newRun("warrior", 51);
    b.heat = 2;
    for (const r of [a, b]) { r.scene = { t: "loot", title: "", items: [], gold: 100, scrolls: 0, potions: 0 } as Run["scene"]; r.hero.f.gold = 0; collectLoot(r); }
    expect(a.hero.f.gold).toBe(100);
    expect(b.hero.f.gold).toBe(50);
    const c = newRun("warrior", 52);
    c.heat = 4;
    const sc = fightIn(c, "fight");
    c.hero.f.hp = 10;
    sc.battle.enemy.hp = 0; sc.battle.over = "won"; settleCombat(c);
    expect(c.hero.f.hp).toBe(10);
    // Heat 3: every heal is halved.
    const { restore } = await import("../src/game/run");
    const { recompute } = await import("../src/game/hero");
    const d = newRun("cleric", 53);
    d.hero.heat = 3; recompute(d.hero);
    d.hero.f.hp = 1; restore(d.hero, 20);
    expect(d.hero.f.hp).toBe(11);
  });
});
