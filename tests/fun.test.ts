import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { LEGENDARY_LORE } from "../src/data/lore";
import { LEGENDARIES } from "../src/data";
import { chooseRelic, chooseRoom, genChoices, newRun, settleCombat, STEPS_PER_FLOOR, type Run } from "../src/game/run";
import { type Meta, recordRun } from "../src/game/meta";

beforeAll(() => loadLibrary());
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const fightIn = (run: Run, room: Parameters<typeof chooseRoom>[1], step = 1) => {
  run.step = step; run.scene = { t: "map" } as Run["scene"]; run.choices = [room];
  chooseRoom(run, room);
  const sc = run.scene as { t: string; battle?: { enemy: { hp: number; name: string; title?: string }; over?: string } };
  if (sc.t !== "combat" || !sc.battle) throw new Error(`no fight: ${sc.t}`);
  return sc as typeof sc & { battle: NonNullable<typeof sc.battle> };
};

describe("relic choice, Nemesis, lore", () => {
  it("bosses always offer a choice of two relics; picking one grants it", () => {
    const run = newRun("warrior", 41);
    const sc = fightIn(run, "boss", STEPS_PER_FLOOR);
    sc.battle.enemy.hp = 0; sc.battle.over = "won"; settleCombat(run);
    expect(run.relicChoice?.length).toBe(2);
    const [a] = run.relicChoice!;
    chooseRelic(run, a);
    expect(run.relicChoice).toBeUndefined();
    expect(run.hero.relics[a]).toBeGreaterThan(0);
  });

  it("dying makes a Nemesis, which waits in the next run and grows if it wins again", () => {
    const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] };
    const run = newRun("rogue", 42);
    run.floor = 2;
    const sc = fightIn(run, "elite");
    sc.battle.over = "lost"; run.hero.f.hp = 0; settleCombat(run);
    recordRun(m, run);
    expect(m.nemesis?.name).toBe(sc.battle.enemy.name);
    expect(m.nemesis?.level).toBe(1);
    const next = newRun("rogue", 43);
    next.nemesis = m.nemesis; next.floor = 2; next.step = 2;
    let seen = false;
    for (let i = 0; i < 200 && !seen; i++) seen = genChoices(next).includes("nemesis");
    expect(seen).toBe(true);
    const ns = fightIn(next, "nemesis", 2);
    expect(ns.battle.enemy.name).toBe(m.nemesis!.name);
    expect(ns.battle.enemy.title).toMatch(/Nemesis/);
    ns.battle.over = "lost"; next.hero.f.hp = 0; settleCombat(next);
    recordRun(m, next);
    expect(m.nemesis?.level).toBe(2);
    // Beaten: gone.
    const third = newRun("rogue", 44);
    third.nemesis = m.nemesis; third.floor = 2;
    const t = fightIn(third, "nemesis", 2);
    t.battle.enemy.hp = 0; t.battle.over = "won"; settleCombat(third);
    expect(third.nemesisBeaten).toBe(true);
    recordRun(m, third);
    expect(m.nemesis).toBeUndefined();
  });

  it("every Legendary has a line of lore", () => {
    for (const l of LEGENDARIES) expect(LEGENDARY_LORE[l.id], l.id).toBeTruthy();
  });
});

describe("relic and talent pools", () => {
  it("every weighted id is real, names are unique, and small ones far outnumber strong ones in the draw", async () => {
    const { RELICS } = await import("../src/data/relics");
    const { TALENTS } = await import("../src/data/talents");
    const { RELIC_WEIGHT, TALENT_WEIGHT, drawWeight, MINOR_RELICS, MINOR_TALENTS } = await import("../src/data/minors");
    const rids = new Set(RELICS.map(r => r.id)), tids = new Set(TALENTS.map(t => t.id));
    for (const id of Object.keys(RELIC_WEIGHT)) expect(rids.has(id), id).toBe(true);
    for (const id of Object.keys(TALENT_WEIGHT)) expect(tids.has(id), id).toBe(true);
    expect(new Set(MINOR_RELICS.map(r => r.name)).size).toBe(MINOR_RELICS.length);
    expect(MINOR_RELICS.length).toBeGreaterThanOrEqual(35);
    expect(MINOR_TALENTS.length).toBeGreaterThanOrEqual(15);
    const share = (list: { id: string }[], pool: Parameters<typeof drawWeight>[0][]) => pool.filter(d => list.some(x => x.id === d.id)).reduce((s, d) => s + drawWeight(d), 0) / pool.reduce((s, d) => s + drawWeight(d), 0);
    expect(share(MINOR_RELICS, RELICS)).toBeGreaterThan(0.4);
    expect(share(MINOR_TALENTS, TALENTS)).toBeGreaterThan(0.4);
  });
});
