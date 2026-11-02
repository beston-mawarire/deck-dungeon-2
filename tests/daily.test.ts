import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { dailyFor, newDailyRun, runSummary, abandonRun } from "../src/game/run";
import { type Meta, recordRun } from "../src/game/meta";

beforeAll(() => loadLibrary());
const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };

describe("Daily Dungeon and run history", () => {
  it("the same day gives everyone the same seed, class and first paths", () => {
    const a = dailyFor("2026-11-02"), b = dailyFor("2026-11-02"), c = dailyFor("2026-11-03");
    expect(a).toEqual(b);
    expect(a.seed).not.toBe(c.seed);
    const r1 = newDailyRun("2026-11-02"), r2 = newDailyRun("2026-11-02");
    expect(r1.hero.origin).toBe(a.origin);
    expect(r1.choices).toEqual(r2.choices);
    expect(r1.daily).toBe("2026-11-02");
    expect(runSummary(r1).daily).toBe("2026-11-02");
  });

  it("finished runs land in the history (newest first, at most 10), and the daily attempt is marked done", () => {
    const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [], daily: { day: "2026-11-02", floor: 1, won: false } };
    for (let i = 0; i < 12; i++) {
      const r = newDailyRun("2026-11-02");
      r.floor = 1 + (i % 3);
      abandonRun(r);
      recordRun(m, r);
    }
    expect(m.history!.length).toBe(10);
    expect(m.history![0].abandoned).toBe(true);
    expect(m.history![0].build.length).toBeGreaterThan(0);
    expect(m.daily?.done).toBe(true);
    expect(m.daily?.floor).toBe(3);
  });
});
