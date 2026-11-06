import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { idx, isFloor, pathTo, POOL_STEPS, SPIKE_DMG, type FloorMap } from "../src/game/grid";
import { chooseEvent, eventOptionAvailable, gridStep, LAYER_FOES, makeGrid, newRun, startCrawl } from "../src/game/run";
import { recompute } from "../src/game/hero";
import { MONSTERS } from "../src/data/monsters";
import { EVENTS } from "../src/data/events";

loadLibrary();

/** A Crawl run on a floor of some layer. */
const crawl = (seed: number, layer = 1, depth = 2) => { const r = newRun("warrior", seed); startCrawl(r); r.floor = layer; r.grid = makeGrid(r, depth); return r; };
/** A step from where you stand onto a floor tile next to you, with nothing on it. */
const besides = (m: FloorMap) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [m.px + dx, m.py + dy]).find(([x, y]) => isFloor(m, x, y) && !m.things.some(t => !t.done && t.x === x && t.y === y))!;

describe("floors with teeth", () => {
  it("a spike trap costs 2 HP each time you step on it, and never kills you", () => {
    const r = crawl(5);
    const m = r.grid!;
    const [x, y] = besides(m);
    m.haz = { [idx(m, x, y)]: "spike" };
    const hp = r.hero.f.hp;
    const res = gridStep(r, x, y);
    expect(res.ok && res.hurt).toBe(SPIKE_DMG);
    expect(r.hero.f.hp).toBe(hp - SPIKE_DMG);
    r.hero.f.hp = 1;
    gridStep(r, m.bx!, m.by!); gridStep(r, x, y);
    expect(r.hero.f.hp).toBe(1);
  });

  it("lava burns for 1 HP a step for the next 4 steps", () => {
    const r = crawl(6);
    const m = r.grid!;
    const [x, y] = besides(m);
    const [bx, by] = [m.px, m.py];
    m.haz = { [idx(m, x, y)]: "lava" };
    const hp = r.hero.f.hp;
    gridStep(r, x, y);
    expect(r.hero.f.hp).toBe(hp);
    expect(m.burn).toBe(POOL_STEPS);
    // Back and forth off the pool: each step burns until it runs out.
    gridStep(r, bx, by);
    expect(r.hero.f.hp).toBe(hp - 1);
    m.haz = {};
    for (let k = 0; k < 6; k++) gridStep(r, k % 2 ? bx : x, k % 2 ? by : y);
    expect(r.hero.f.hp).toBe(hp - POOL_STEPS);
    expect(m.burn ?? 0).toBe(0);
  });

  it("walks go around hazards when there's a way, and over them when there isn't", () => {
    const mk = (rows: string[]): FloorMap => {
      const h = rows.length, w = rows[0].length;
      const tiles = rows.join("").split("").map(ch => (ch === "#" ? 0 : 1)) as (0 | 1)[];
      return { floor: 1, depth: 1, w, h, tiles, seen: tiles.map(() => 1), rooms: [], things: [], px: 0, py: 1, explored: 0 };
    };
    const open = mk([".....", ".....", "....."]);
    open.haz = { [idx(open, 2, 1)]: "spike" };
    const p = pathTo(open, 4, 1)!;
    expect(p.some(([x, y]) => x === 2 && y === 1)).toBe(false);
    const hall = mk(["#####", ".....", "#####"]);
    hall.haz = { [idx(hall, 2, 1)]: "spike" };
    expect(pathTo(hall, 4, 1)!.length).toBe(4);
  });

  it("a locked door needs a Skeleton Key, and the key is used up", () => {
    let found = false;
    for (let seed = 1; seed < 80 && !found; seed++) {
      const r = crawl(seed * 13);
      const m = r.grid!;
      const d = m.things.findIndex(t => t.room === "locked");
      if (d < 0) continue;
      found = true;
      // Stand next to the door.
      const door = m.things[d];
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [door.x + dx, door.y + dy]).find(([x, y]) => isFloor(m, x, y) && !m.things.some(t => t.x === x && t.y === y))!;
      m.px = nb[0]; m.py = nb[1];
      const no = gridStep(r, door.x, door.y);
      expect(no.ok).toBe(false);
      expect(m.px).toBe(nb[0]);
      r.hero.f.persist["skelKeys"] = 1;
      const yes = gridStep(r, door.x, door.y);
      expect(yes.ok).toBe(true);
      expect(m.things[d].done).toBe(true);
      expect(r.hero.f.persist["skelKeys"]).toBe(0);
      expect(m.things.some(t => t.room === "secret")).toBe(true);
    }
    expect(found).toBe(true);
  });

  it("each layer has its own foes, and every monster belongs to at least one layer", () => {
    for (let L = 1; L <= 5; L++) {
      const r = crawl(L * 101, L);
      for (const t of r.grid!.things) if (t.room === "fight") expect(LAYER_FOES[L - 1]).toContain(t.foe);
    }
    const all = new Set(LAYER_FOES.flat());
    for (const mo of MONSTERS) expect(all.has(mo.name)).toBe(true);
  });

  it("a Blood Oath costs Max HP and gives an item", () => {
    const r = crawl(9);
    r.hero.f.hp = r.hero.f.maxHp;
    const max = r.hero.f.maxHp;
    r.scene = { t: "event", ev: EVENTS.find(e => e.id === "blood_oath")!, result: null, found: [] };
    chooseEvent(r, 0);
    const cut = max - Math.round(max * 0.4);
    expect(r.hero.f.maxHp).toBe(cut);
    const sc = r.scene as { t: string; items?: { rarity: string }[] };
    expect(sc.t).toBe("loot");
    expect(sc.items?.[0].rarity).toBe("epic");
    // The oath binds: Max HP can't rise above the cut, and you can't swear twice.
    expect(r.hero.f.persist["maxHpCap"]).toBe(cut);
    r.hero.f.persist["hallHp"] = (r.hero.f.persist["hallHp"] ?? 0) + 20; r.hero.level += 3; recompute(r.hero);
    expect(r.hero.f.maxHp).toBeLessThanOrEqual(cut);
    r.scene = { t: "event", ev: EVENTS.find(e => e.id === "blood_oath")!, result: null, found: [] };
    expect(eventOptionAvailable(r, 0)).toBe(false);
  });
});

describe("how many hazards", () => {
  it("never more than four on a floor, and some floors have none", () => {
    let none = 0;
    for (let seed = 1; seed <= 150; seed++) {
      const r = crawl(seed * 7, 1 + (seed % 5), 2 + (seed % 4));
      const n = Object.keys(r.grid!.haz ?? {}).length;
      expect(n).toBeLessThanOrEqual(4);
      if (!n) none++;
    }
    expect(none).toBeGreaterThan(20);
  });
});
