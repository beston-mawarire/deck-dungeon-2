import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { inSight, isFloor, LAYER_FLOORS, lineOfSight, pathTo, reachable, SIGHT, trapdoorThing, walkDistances, type FloorMap } from "../src/game/grid";
import { confirmRisk, CRAWL_START_GOLD, descend, gridDanger, gridStep, LANDMARKS, makeGrid, newRun, startCrawl, STEPS_PER_FLOOR } from "../src/game/run";
import { crawlStep } from "./crawlbot";

loadLibrary();

/** A Crawl run standing on floor 1 (past the entrance). */
const crawl = (seed: number) => { const r = newRun("warrior", seed); startCrawl(r); r.grid = makeGrid(r, 1); return r; };
const things = (m: FloorMap, room: string) => m.things.filter(t => t.room === room).length;

describe("the Crawl", () => {
  it("carves small floors: a few halls, everything reachable, the trapdoor far from the start", () => {
    for (let seed = 1; seed < 60; seed++) {
      const m = crawl(seed).grid!;
      expect(m.w).toBeLessThanOrEqual(19);
      expect(m.rooms.length).toBeGreaterThanOrEqual(3);
      const d = walkDistances(m, m.px, m.py);
      m.tiles.forEach((t, i) => { if (t === 1) expect(d[i]).toBeGreaterThanOrEqual(0); });
      const td = m.things[trapdoorThing(m)];
      expect(td).toBeTruthy();
      expect(d[td.y * m.w + td.x]).toBeGreaterThan(5);
      for (const t of m.things) { expect(isFloor(m, t.x, t.y)).toBe(true); expect(t.x === m.px && t.y === m.py).toBe(false); }
      expect(new Set(m.things.map(t => `${t.x},${t.y}`)).size).toBe(m.things.length);
    }
  });

  it("some hallways are two tiles wide", () => {
    let wide = 0;
    for (let seed = 1; seed < 30; seed++) {
      const m = crawl(seed).grid!;
      const inRoom = (x: number, y: number) => m.rooms.some(r => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
      for (let y = 1; y < m.h - 1; y++) for (let x = 1; x < m.w - 1; x++)
        if (!inRoom(x, y) && !inRoom(x + 1, y + 1) && isFloor(m, x, y) && isFloor(m, x + 1, y) && isFloor(m, x, y + 1) && isFloor(m, x + 1, y + 1)) wide++;
    }
    expect(wide).toBeGreaterThan(10);
  });

  it("puts points of interest in pockets of their own, two at most, behind a one-tile doorway", () => {
    const POI = ["trapdoor", "wooden", "iron", "vault", "shop", "forge", "jeweller", "rest", "masterwork", ...LANDMARKS];
    let pocketed = 0, total = 0, pairs = 0;
    for (let seed = 1; seed < 60; seed++) {
      const r = crawl(seed);
      for (const m of [r.grid!, makeGrid(r, 3), makeGrid(r, 5)]) {
        const inHall = (x: number, y: number) => m.rooms.some(q => x >= q.x && x < q.x + q.w && y >= q.y && y < q.y + q.h);
        const all = reachable(m, m.px, m.py, new Set());
        for (const t of m.things.filter(t => POI.includes(t.room))) {
          total++;
          if (inHall(t.x, t.y)) continue;
          // Find its doorway: the one tile which, blocked, cuts it off.
          // Its doorway: the nearest tile (on foot) which, blocked, cuts it off.
          const dt = walkDistances(m, t.x, t.y);
          const near: number[] = [];
          for (let i = 0; i < m.tiles.length; i++) if (m.tiles[i] === 1 && all[i] && dt[i] > 0 && dt[i] <= 3 && !reachable(m, m.px, m.py, new Set([i]))[t.y * m.w + t.x]) near.push(i);
          expect(near.length).toBeGreaterThan(0);
          pocketed++;
          // Everything else cut off by that doorway is the pocket: at most two things in it.
          const door = near.sort((a, b) => dt[a] - dt[b])[0];
          const cut = reachable(m, m.px, m.py, new Set([door]));
          const inside = m.things.filter(o => !cut[o.y * m.w + o.x] && o.y * m.w + o.x !== door);
          expect(inside.length).toBeLessThanOrEqual(2);
          if (inside.length === 2) pairs++;
        }
      }
    }
    expect(pocketed / total).toBeGreaterThan(0.85);
    expect(pairs).toBeGreaterThan(10);
  });

  it("starts every layer at the entrance: one small room, a Merchant in the middle, the trapdoor in a corner, and Gold for one potion", () => {
    for (let seed = 1; seed < 20; seed++) {
      const r = newRun("rogue", seed); startCrawl(r);
      const m = r.grid!;
      expect(m.depth).toBe(0);
      expect(m.rooms.length).toBe(1);
      expect(m.things.map(t => t.room).sort()).toEqual(["shop", "trapdoor"]);
      const shop = m.things.find(t => t.room === "shop")!, td = m.things.find(t => t.room === "trapdoor")!;
      const room = m.rooms[0];
      expect([shop.x, shop.y]).toEqual([room.x + 2, room.y + 2]);
      expect([room.x, room.x + room.w - 1]).toContain(td.x);
      expect([room.y, room.y + room.h - 1]).toContain(td.y);
      expect(r.hero.f.gold).toBe(CRAWL_START_GOLD);
      // Walk up to the Merchant: one Healing Potion is affordable, two are not.
      gridStep(r, m.px, m.py - 1); gridStep(r, m.px, m.py - 1);
      expect(r.scene.t).toBe("shop");
      const pot = r.scene.t === "shop" ? r.scene.stock.find(e => e.kind === "potion")!.price : 0;
      expect(pot).toBeLessThanOrEqual(CRAWL_START_GOLD);
      expect(pot * 2).toBeGreaterThan(CRAWL_START_GOLD);
    }
  });

  it("spreads a layer's services over its five floors: one more Merchant, one Forge or Jeweller, the campfire on the fifth", () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = crawl(seed);
      const floors = [r.grid!, makeGrid(r, 2), makeGrid(r, 3), makeGrid(r, 4), makeGrid(r, 5)];
      const n = (room: string) => floors.reduce((a, m) => a + things(m, room), 0);
      // The second Merchant is on the third floor (the first is at the entrance).
      expect(n("shop")).toBe(1);
      expect(things(floors[2], "shop")).toBe(1);
      expect(n("forge") + n("jeweller")).toBe(1);
      expect(things(floors[4], "rest")).toBe(1);
      for (const m of floors) expect(m.things.filter(t => LANDMARKS.includes(t.room as never)).length).toBeLessThanOrEqual(2);
    }
  });

  it("many foes stand in the way: fight them, or what's behind is out of reach", () => {
    let guards = 0, optional = 0, trapGuarded = 0, floors = 0;
    for (let seed = 1; seed < 60; seed++) {
      const m = crawl(seed).grid!;
      floors++;
      const td = m.things[trapdoorThing(m)];
      for (const g of m.things) {
        if (!g.guard) { if (["fight", "elite"].includes(g.room)) optional++; continue; }
        guards++;
        const cut = reachable(m, m.px, m.py, new Set([g.y * m.w + g.x]));
        const all = reachable(m, m.px, m.py, new Set());
        expect(m.tiles.some((t, i) => t === 1 && all[i] && !cut[i] && i !== g.y * m.w + g.x)).toBe(true);
        if (!cut[td.y * m.w + td.x]) trapGuarded++;
      }
    }
    expect(guards / floors).toBeGreaterThan(3);
    expect(trapGuarded / floors).toBeGreaterThan(0.8);
    expect(optional).toBeGreaterThan(20);
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

  it("the trapdoor leads down a floor, with no way back; the fifth drops you straight onto the boss", () => {
    const r = crawl(7);
    r.grid!.explored = 3;
    descend(r);
    expect(r.grid!.depth).toBe(2);
    expect(r.grid!.explored).toBe(3);
    expect(r.scene.t).toBe("map");
    for (let d = 3; d <= 5; d++) { descend(r); expect(r.grid!.depth).toBe(d); }
    expect(r.scene.t).toBe("map");
    descend(r);
    expect(LAYER_FLOORS).toBe(6);
    expect(r.scene.t).toBe("combat");
    expect(r.scene.t === "combat" && r.scene.rank).toBe("boss");
    expect(r.step).toBe(STEPS_PER_FLOOR);
    expect(r.popup?.title).toMatch(/Floor 6/);
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
    a.grid!.explored = 18;
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
