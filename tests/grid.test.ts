import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { inSight, isFloor, LAYER_FLOORS, lineOfSight, pathTo, reachable, SIGHT, trapdoorThing, walkDistances, type FloorMap } from "../src/game/grid";
import { confirmRisk, descend, gridDanger, gridStep, LANDMARKS, makeGrid, newRun, startCrawl, STEPS_PER_FLOOR } from "../src/game/run";
import { crawlStep } from "./crawlbot";

loadLibrary();

const crawl = (seed: number) => { const r = newRun("warrior", seed); startCrawl(r); return r; };
const things = (m: FloorMap, room: string) => m.things.filter(t => t.room === room).length;

describe("the Crawl", () => {
  it("carves small floors: rooms and halls, everything reachable, a trapdoor far from the start", () => {
    for (let seed = 1; seed < 60; seed++) {
      const m = crawl(seed).grid!;
      expect(m.w).toBeLessThanOrEqual(21);
      expect(m.rooms.length).toBeGreaterThanOrEqual(4);
      const d = walkDistances(m, m.px, m.py);
      m.tiles.forEach((t, i) => { if (t === 1) expect(d[i]).toBeGreaterThanOrEqual(0); });
      const td = m.things[trapdoorThing(m)];
      expect(td).toBeTruthy();
      expect(d[td.y * m.w + td.x]).toBeGreaterThan(5);
      for (const t of m.things) { expect(isFloor(m, t.x, t.y)).toBe(true); expect(t.x === m.px && t.y === m.py).toBe(false); }
      expect(new Set(m.things.map(t => `${t.x},${t.y}`)).size).toBe(m.things.length);
    }
  });

  it("some halls are two tiles wide", () => {
    let wide = 0;
    for (let seed = 1; seed < 30; seed++) {
      const m = crawl(seed).grid!;
      const inRoom = (x: number, y: number) => m.rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++)
        if (!inRoom(x, y) && !inRoom(x + 1, y + 1) && isFloor(m, x, y) && isFloor(m, x + 1, y) && isFloor(m, x, y + 1) && isFloor(m, x + 1, y + 1)) wide++;
    }
    expect(wide).toBeGreaterThan(10);
  });

  it("spreads a layer's services over its three floors: one Merchant, one Forge or Jeweller, the campfire on the third", () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = crawl(seed);
      const floors = [r.grid!, makeGrid(r, 2), makeGrid(r, 3)];
      const n = (room: string) => floors.reduce((a, m) => a + things(m, room), 0);
      expect(n("shop")).toBe(1);
      expect(n("forge") + n("jeweller")).toBe(1);
      expect(things(floors[2], "rest")).toBe(1);
      for (const m of floors) expect(m.things.filter(t => LANDMARKS.includes(t.room as never)).length).toBeLessThanOrEqual(2);
    }
  });

  it("some foes stand in the way: fight them, or that prize is out of reach", () => {
    let guards = 0, optional = 0;
    for (let seed = 1; seed < 60; seed++) {
      const m = crawl(seed).grid!;
      for (const g of m.things) {
        if (!g.guard) { if (["fight", "elite"].includes(g.room)) optional++; continue; }
        guards++;
        const cut = reachable(m, m.px, m.py, new Set([g.y * m.w + g.x]));
        const all = reachable(m, m.px, m.py, new Set());
        // Blocking the guard's tile cuts something off.
        expect(m.tiles.some((t, i) => t === 1 && all[i] && !cut[i] && i !== g.y * m.w + g.x)).toBe(true);
      }
    }
    expect(guards).toBeGreaterThan(40);
    expect(optional).toBeGreaterThan(40);
  });

  it("you see three tiles around you, walls block sight, and what you've seen stays seen", () => {
    const m = crawl(5).grid!;
    for (const i of inSight(m)) {
      const x = i % m.w, y = Math.floor(i / m.w);
      expect(Math.hypot(x - m.px, y - m.py)).toBeLessThanOrEqual(Math.sqrt(SIGHT * SIGHT + 1));
      expect(m.seen[i]).toBe(1);
      expect(lineOfSight(m, m.px, m.py, x, y)).toBe(true);
    }
    expect(m.seen.some((s, i) => s && Math.hypot((i % m.w) - m.px, Math.floor(i / m.w) - m.py) > SIGHT + 1)).toBe(false);
  });

  it("walks only over tiles you've seen", () => {
    const r = crawl(9);
    const m = r.grid!;
    const unseen = m.tiles.findIndex((t, i) => t === 1 && !m.seen[i]);
    expect(pathTo(m, unseen % m.w, Math.floor(unseen / m.w))).toBeNull();
    expect(gridStep(r, m.px + 2, m.py).ok).toBe(false);
  });

  it("the trapdoor leads down a floor, with no way back; the third drops you straight onto the boss", () => {
    const r = crawl(7);
    r.grid!.explored = 3;
    descend(r);
    expect(r.grid!.depth).toBe(2);
    expect(r.grid!.explored).toBe(3);
    expect(r.scene.t).toBe("map");
    descend(r);
    expect(r.grid!.depth).toBe(3);
    descend(r);
    expect(LAYER_FLOORS).toBe(4);
    expect(r.scene.t).toBe("combat");
    expect(r.scene.t === "combat" && r.scene.rank).toBe("boss");
    expect(r.step).toBe(STEPS_PER_FLOOR);
    expect(r.popup?.title).toMatch(/Floor 4/);
  });

  it("turning back from a risky room puts you back where you stood", () => {
    const r = crawl(3);
    const m = r.grid!;
    const x = m.px, y = m.py;
    const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isFloor(m, x + dx, y + dy) && !m.things.some(t => t.x === x + dx && t.y === y + dy))!;
    m.things.push({ x: x + dir[0], y: y + dir[1], room: "shrine" });
    gridStep(r, x + dir[0], y + dir[1]);
    expect(r.scene.t).toBe("confirm");
    confirmRisk(r, false);
    expect([m.px, m.py]).toEqual([x, y]);
    expect(m.things[m.things.length - 1].done).toBeFalsy();
  });

  it("grows more dangerous as you clear encounters", () => {
    const a = crawl(11), b = newRun("warrior", 11);
    a.grid!.explored = 12;
    expect(gridDanger(a)).toBe(3);
    expect(gridDanger(b)).toBe(0);
  });

  it("bots can play whole Crawl runs: layers are cleared, each floor a fresh map", () => {
    let deepest = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const r = crawl(seed * 977);
      const maps = new Set<object>();
      for (let n = 0; n < 8000 && r.scene.t !== "over"; n++) {
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
