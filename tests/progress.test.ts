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
    expect(eb.maxHp).toBe(Math.round(ea.maxHp * 1.2));
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
});
