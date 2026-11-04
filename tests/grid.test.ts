import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { BOSS_KEY, bossIndex, entranceIndex, isOpen, isSeen, neighbours } from "../src/game/grid";
import { confirmRisk, gridDanger, gridEnter, newRun, type Run, startCrawl } from "../src/game/run";
import { botStep } from "./bot";

loadLibrary();

const crawl = (seed: number) => { const r = newRun("warrior", seed); startCrawl(r); return r; };

/** A bot for the map: clear rooms near the entrance first (skipping risky rooms), then head for the boss once its door opens. */
const RISKY = ["vault", "altar", "shrine", "crimson_vault"];
function crawlStep(run: Run) {
  const g = run.grid!;
  if (run.scene.t === "map") {
    const open = g.cells.map((_, i) => i).filter(i => isOpen(g, i));
    const boss = bossIndex(g.w);
    const safe = open.filter(i => i !== boss && !RISKY.includes(g.cells[i].room)).sort((a, b) => b - a);
    const order = g.explored >= BOSS_KEY + 2 && open.includes(boss) ? [boss, ...safe] : [...safe, ...(open.includes(boss) ? [boss] : []), ...open];
    for (const i of order) { if (gridEnter(run, i) === null && run.scene.t !== "map") return; }
    return;
  }
  if (run.scene.t === "confirm") return confirmRisk(run, true);
  botStep(run);
}

describe("the Crawl", () => {
  it("deals a 5×5 floor: the entrance cleared at the bottom, the boss at the top, one of each service", () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = crawl(seed);
      const g = r.grid!;
      expect(g.cells.length).toBe(25);
      expect(g.cells[entranceIndex()].room).toBe("entrance");
      expect(g.cells[entranceIndex()].done).toBe(true);
      expect(g.cells[bossIndex()].room).toBe("boss");
      const n = (room: string) => g.cells.filter(c => c.room === room).length;
      expect(n("shop")).toBe(1);
      expect(n("rest")).toBe(1);
      expect(n("forge") + n("jeweller")).toBe(1);
      expect(n("masterwork")).toBe(0);
      expect(g.cells.every(c => c.room)).toBe(true);
      // The rooms by the entrance are never the hard ones.
      for (const i of neighbours(g, entranceIndex())) expect(["elite", "champion", "vault", "unique", "nemesis"]).not.toContain(g.cells[i].room);
      // Only the entrance's neighbours (and the boss) can be seen at the start.
      expect(g.cells.map((_, i) => i).filter(i => isSeen(g, i)).length).toBe(5);
    }
  });

  it("keeps the boss sealed until enough rooms are cleared", () => {
    const r = crawl(7);
    const g = r.grid!;
    g.cells[bossIndex() + g.w].done = true;
    expect(gridEnter(r, bossIndex())).toMatch(/sealed/);
    expect(r.scene.t).toBe("map");
  });

  it("turning back from a risky room leaves it unexplored", () => {
    const r = crawl(3);
    const g = r.grid!;
    const i = neighbours(g, entranceIndex())[0];
    g.cells[i].room = "shrine";
    gridEnter(r, i);
    expect(r.scene.t).toBe("confirm");
    confirmRisk(r, false);
    expect(r.scene.t).toBe("map");
    expect(g.cells[i].done).toBeFalsy();
    expect(g.explored).toBe(0);
  });

  it("grows more dangerous as you explore, and its foes are tougher", () => {
    const a = crawl(11), b = newRun("warrior", 11);
    a.grid!.explored = 9;
    expect(gridDanger(a)).toBe(3);
    expect(gridDanger(b)).toBe(0);
  });

  it("bots can play whole Crawl runs: floors are cleared and each gets a fresh grid", () => {
    let deepest = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const r = crawl(seed * 977);
      const grids = new Set<object>();
      for (let n = 0; n < 4000 && r.scene.t !== "over"; n++) {
        if (r.grid) grids.add(r.grid);
        expect(r.grid!.floor).toBe(r.floor);
        crawlStep(r);
      }
      deepest = Math.max(deepest, r.floor);
      expect(grids.size).toBeGreaterThanOrEqual(r.floor);
    }
    expect(deepest).toBeGreaterThanOrEqual(2);
  }, 60000);
});
