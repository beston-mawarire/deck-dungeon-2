import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { BOSS_KEY, bossThing, inSight, isFloor, lineOfSight, pathTo, SIGHT, walkDistances, type FloorMap } from "../src/game/grid";
import { confirmRisk, gridDanger, gridStep, LANDMARKS, newRun, startCrawl } from "../src/game/run";
import { crawlStep } from "./crawlbot";

loadLibrary();

const crawl = (seed: number) => { const r = newRun("warrior", seed); startCrawl(r); return r; };
const things = (m: FloorMap, room: string) => m.things.filter(t => t.room === room).length;

describe("the Crawl", () => {
  it("carves a real floor: rooms and halls, every room reachable, the boss far from the start", () => {
    for (let seed = 1; seed < 40; seed++) {
      const m = crawl(seed).grid!;
      expect(m.rooms.length).toBeGreaterThanOrEqual(6);
      expect(isFloor(m, m.px, m.py)).toBe(true);
      const d = walkDistances(m, m.px, m.py);
      // Every floor tile can be walked to.
      m.tiles.forEach((t, i) => { if (t === 1) expect(d[i]).toBeGreaterThanOrEqual(0); });
      const b = m.things[bossThing(m)];
      expect(d[b.y * m.w + b.x]).toBeGreaterThan(10);
      // Nothing stands where you start, and nothing stands in a wall.
      for (const t of m.things) { expect(isFloor(m, t.x, t.y)).toBe(true); expect(t.x === m.px && t.y === m.py).toBe(false); }
      expect(new Set(m.things.map(t => `${t.x},${t.y}`)).size).toBe(m.things.length);
    }
  });

  it("holds one of each service, and none, one or two landmarks", () => {
    const marks = [0, 0, 0];
    for (let seed = 1; seed < 120; seed++) {
      const m = crawl(seed).grid!;
      expect(things(m, "shop")).toBe(1);
      expect(things(m, "rest")).toBe(1);
      expect(things(m, "forge") + things(m, "jeweller")).toBe(1);
      expect(things(m, "masterwork")).toBe(0);
      const n = m.things.filter(t => LANDMARKS.includes(t.room as never)).length;
      expect(n).toBeLessThanOrEqual(2);
      marks[n]++;
    }
    expect(marks[0]).toBeGreaterThan(15);
    expect(marks[1]).toBeGreaterThan(25);
    expect(marks[2]).toBeGreaterThan(10);
  });

  it("you see three tiles around you, walls block sight, and what you've seen stays seen", () => {
    const m = crawl(5).grid!;
    for (const i of inSight(m)) {
      const x = i % m.w, y = Math.floor(i / m.w);
      expect(Math.hypot(x - m.px, y - m.py)).toBeLessThanOrEqual(Math.sqrt(SIGHT * SIGHT + 1));
      expect(m.seen[i]).toBe(1);
      expect(lineOfSight(m, m.px, m.py, x, y)).toBe(true);
    }
    const before = m.seen.reduce((a, b) => a + b, 0);
    expect(before).toBeGreaterThan(5);
    // Nothing far away has been seen yet.
    expect(m.seen.some((s, i) => s && Math.hypot((i % m.w) - m.px, Math.floor(i / m.w) - m.py) > SIGHT + 1)).toBe(false);
  });

  it("walks only over tiles you've seen, and around things still standing", () => {
    const r = crawl(9);
    const m = r.grid!;
    // A tile you haven't seen can't be walked to.
    const unseen = m.tiles.findIndex((t, i) => t === 1 && !m.seen[i]);
    expect(pathTo(m, unseen % m.w, Math.floor(unseen / m.w))).toBeNull();
    // Steps must be next to you, and not into walls.
    expect(gridStep(r, m.px + 2, m.py).ok).toBe(false);
  });

  it("keeps the boss back until enough encounters are cleared", () => {
    const r = crawl(7);
    const m = r.grid!;
    const b = m.things[bossThing(m)];
    m.px = b.x; m.py = b.y + 1;
    if (!isFloor(m, m.px, m.py)) { m.px = b.x + 1; m.py = b.y; }
    const res = gridStep(r, b.x, b.y);
    expect(res.ok).toBe(false);
    expect(r.scene.t).toBe("map");
    m.explored = BOSS_KEY;
    expect(gridStep(r, b.x, b.y).ok).toBe(true);
    expect(r.scene.t).toBe("combat");
  });

  it("turning back from a risky room puts you back where you stood, and leaves it there", () => {
    const r = crawl(3);
    const m = r.grid!;
    const x = m.px, y = m.py;
    const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isFloor(m, x + dx, y + dy))!;
    m.things.push({ x: x + dirs[0], y: y + dirs[1], room: "shrine" });
    gridStep(r, x + dirs[0], y + dirs[1]);
    expect(r.scene.t).toBe("confirm");
    confirmRisk(r, false);
    expect(r.scene.t).toBe("map");
    expect([m.px, m.py]).toEqual([x, y]);
    expect(m.things[m.things.length - 1].done).toBeFalsy();
    expect(m.explored).toBe(0);
  });

  it("grows more dangerous as you clear encounters", () => {
    const a = crawl(11), b = newRun("warrior", 11);
    a.grid!.explored = 12;
    expect(gridDanger(a)).toBe(3);
    expect(gridDanger(b)).toBe(0);
  });

  it("bots can play whole Crawl runs: floors are cleared and each gets a fresh map", () => {
    let deepest = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const r = crawl(seed * 977);
      const maps = new Set<object>();
      for (let n = 0; n < 6000 && r.scene.t !== "over"; n++) {
        if (r.grid) maps.add(r.grid);
        expect(r.grid!.floor).toBe(r.floor);
        crawlStep(r);
      }
      deepest = Math.max(deepest, r.floor);
      expect(maps.size).toBeGreaterThanOrEqual(r.floor);
    }
    expect(deepest).toBeGreaterThanOrEqual(2);
  }, 60000);
});
