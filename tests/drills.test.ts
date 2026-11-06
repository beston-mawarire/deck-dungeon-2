import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { recompute, potionCap } from "../src/game/hero";
import { availableActions, chooseRoom, chooseSkill, descend, gainXp, gridStep, makeGrid, newRun, runLayers, startCrawl, startDrill, type Run } from "../src/game/run";
import { type Meta, recordRun } from "../src/game/meta";
import { CLOCK_STEPS, DRILLS, drillsOpen, drillMedal, GLASS_HP, PILGRIM_CURSES } from "../src/game/drills";
import { isFloor } from "../src/game/grid";

beforeAll(() => loadLibrary());
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const drill = (id: string, o: "warrior" | "rogue" | "mage" | "cleric" = "warrior", seed = 9) => { const r = newRun(o, seed); startCrawl(r); r.hero.path = o === "warrior" ? "berserker" : undefined; startDrill(r, id); return r; };
const fresh = (): Meta => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] });

describe("Drills", () => {
  it("there are ten, three open at first, and each clear opens one more; medals by classes", () => {
    expect(DRILLS.length).toBe(10);
    expect(drillsOpen({})).toBe(3);
    expect(drillsOpen({ glass: ["warrior"], bare: [] })).toBe(4);
    expect([drillMedal(0), drillMedal(1), drillMedal(2), drillMedal(4)]).toEqual(["", "🥉", "🥈", "🥇"]);
  });
  it("Drills run three layers; the Boss Rush all five", () => {
    expect(runLayers(drill("glass"))).toBe(3);
    expect(runLayers(drill("bossrush"))).toBe(5);
  });
  it("Glass Cannon: 40% Max HP and more damage", () => {
    const a = newRun("warrior", 9); startCrawl(a); recompute(a.hero);
    const g = drill("glass");
    expect(g.hero.f.maxHp).toBe(Math.max(1, Math.round(a.hero.f.maxHp * GLASS_HP)));
    expect(g.hero.f.dmgDealt ?? 0).toBeGreaterThan(a.hero.f.dmgDealt ?? 0);
  });
  it("Bare Hands starts with nothing equipped; Dry Throat carries no Healing Potions", () => {
    const b = drill("bare");
    expect([b.hero.equip.main, b.hero.equip.off, b.hero.equip.armour]).toEqual([undefined, undefined, undefined]);
    expect(b.hero.f.damage).toBeGreaterThanOrEqual(4);
    const d = drill("dry");
    expect(potionCap(d.hero)).toBe(0);
  });
  it("Cursed Pilgrim: three curses that come back however they're lifted", () => {
    const r = drill("pilgrim");
    expect(r.hero.boundCurses?.length).toBe(PILGRIM_CURSES);
    r.hero.curses = {}; recompute(r.hero);
    expect(Object.keys(r.hero.curses).length).toBe(PILGRIM_CURSES);
  });
  it("Elite Gauntlet: no plain fights on the map", () => {
    const r = drill("gauntlet");
    for (let d = 1; d <= 4; d++) expect(makeGrid(r, d).things.some(t => t.room === "fight")).toBe(false);
  });
  it("Against the Clock counts steps on a floor; Lights Out sees 1 tile with no torches", () => {
    const c = drill("clock");
    const m = makeGrid(c, 1); c.grid = m;
    expect(m.clock).toBe(CLOCK_STEPS);
    const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isFloor(m, m.px + dx, m.py + dy) && !m.things.some(t => t.x === m.px + dx && t.y === m.py + dy))!;
    gridStep(c, m.px + dir[0], m.py + dir[1]);
    expect(m.clock).toBe(CLOCK_STEPS - 1);
    const d = drill("dark");
    const dm = makeGrid(d, 1);
    expect(dm.sight).toBe(1); expect(dm.torches?.length ?? 0).toBe(0);
  });
  it("Silent Hands: no skill, two attribute points a level", () => {
    const r = drill("silent");
    const before = r.hero.attrPoints ?? 0;
    gainXp(r, 3);
    expect((r.hero.attrPoints ?? 0) - before).toBe(2);
    r.hero.level = 5;
    expect(chooseSkill(r, "rampage")).toMatch(/No skills/);
    r.step = 1; r.scene = { t: "map" } as Run["scene"]; r.choices = ["fight"]; chooseRoom(r, "fight");
    expect(availableActions(r).some(a => a === "rampage" || a === "bloodlust")).toBe(false);
  });
  it("Borrowed Steel: another class's kit, and its loot", () => {
    const r = drill("borrowed");
    expect(r.hero.lootAs).toBeDefined(); expect(r.hero.lootAs).not.toBe("warrior");
    expect(r.hero.equip.main?.base).not.toBe("w_sword");
  });
  it("Boss Rush: raised to level 3, and the entrance's trapdoor drops onto the guardian", () => {
    const r = drill("bossrush");
    expect(r.hero.level).toBe(3);
    descend(r);
    expect(r.scene.t).toBe("combat");
    expect((r.scene as { rank?: string }).rank).toBe("boss");
  });
  it("a cleared Drill gives its medal and first-clear Crown Shards, and nothing else in the Camp's progress", () => {
    const r = drill("glass");
    r.hero.f.persist["layersWon"] = 3; r.floor = 4;
    r.scene = { t: "over", won: true };
    const m = fresh();
    recordRun(m, r);
    expect(m.drills?.glass).toEqual(["warrior"]);
    expect(m.camp?.crowns).toBe(3);
    expect(m.layersBeaten?.warrior ?? 0).toBe(0);
    expect(m.wins).toBe(0);
    expect(m.ledger).toBeUndefined();
    expect(m.achievements).toContain("drill_glass");
    expect(m.achievements ?? []).not.toContain("campaign_win");
  });
});
