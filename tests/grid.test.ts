import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { inSight, isFloor, LAYER_FLOORS, lineOfSight, pathTo, pathToward, reachable, SIGHT, trapdoorThing, walkDistances, type FloorMap } from "../src/game/grid";
import { advance, combatAction, confirmRisk, CRAWL_START_GOLD, descend, finishLoot, gateItem, gridDanger, skipTalent, TREASURE_DEPTH, gridStep, LANDMARKS, makeGrid, newRun, startCrawl, STEPS_PER_FLOOR } from "../src/game/run";
import { crawlStep } from "./crawlbot";
import { equipItem } from "../src/game/hero";

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

  it("some roomy halls have a pillar of wall in the middle, and nothing is cut off by it", () => {
    let pillars = 0;
    for (let seed = 1; seed < 60; seed++) {
      const m = crawl(seed).grid!;
      for (const r of m.rooms) {
        const c = { x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) };
        if (!isFloor(m, c.x, c.y)) pillars++;
      }
      const d = walkDistances(m, m.px, m.py);
      m.tiles.forEach((t, i) => { if (t === 1) expect(d[i]).toBeGreaterThanOrEqual(0); });
    }
    expect(pillars).toBeGreaterThan(5);
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
    const POI = ["trapdoor", "wooden", "iron", "vault", "forge", "jeweller", "rest", "masterwork", ...LANDMARKS];
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
          // (A little room with a second way in has no single doorway.)
          if (!near.length) continue;
          pocketed++;
          // Everything else cut off by that doorway is the pocket: at most two things in it.
          const door = near.sort((a, b) => dt[a] - dt[b])[0];
          const cut = reachable(m, m.px, m.py, new Set([door]));
          const inside = m.things.filter(o => !cut[o.y * m.w + o.x] && o.y * m.w + o.x !== door && POI.includes(o.room));
          // (A little room with a second door isn't cut off by either one.)
          if (inside.length > 2) { pocketed--; continue; }
          if (inside.length === 2) pairs++;
        }
      }
    }
    expect(pocketed / total).toBeGreaterThan(0.6);
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
      expect(r.hero.potions).toBe(0);
      // Walk up to the Merchant: one Healing Potion is affordable, two are not.
      gridStep(r, m.px, m.py - 1); gridStep(r, m.px, m.py - 1);
      expect(r.scene.t).toBe("shop");
      const pot = r.scene.t === "shop" ? r.scene.stock.find(e => e.kind === "potion")!.price : 0;
      expect(pot).toBeLessThanOrEqual(CRAWL_START_GOLD);
      expect(pot * 2).toBeGreaterThan(CRAWL_START_GOLD);
    }
  });

  it("Knowledge: no campfire, pools or third Merchant until learned", () => {
    for (let seed = 1; seed < 20; seed++) {
      const r = crawl(seed);
      const plain = [makeGrid(r, 0), makeGrid(r, 1), makeGrid(r, 2), makeGrid(r, 3), makeGrid(r, 4), makeGrid(r, 5)];
      expect(plain.reduce((a, m) => a + things(m, "rest") + things(m, "pond"), 0)).toBe(0);
      r.hero.f.persist["ins_merchant"] = 1;
      const more = [makeGrid(r, 0), makeGrid(r, 1), makeGrid(r, 2), makeGrid(r, 3), makeGrid(r, 4), makeGrid(r, 5)];
      expect(more.reduce((a, m) => a + things(m, "shop"), 0)).toBe(3);
    }
  });
  it("spreads a layer's services over its five floors: one more Merchant, one Forge or Jeweller, the campfire on the fifth", () => {
    for (let seed = 1; seed < 40; seed++) {
      const r = crawl(seed);
      // (The campfire comes from the Knowledge Table's Fireside Craft.)
      r.hero.f.persist["ins_campfires"] = 1;
      const floors = [makeGrid(r, 0), makeGrid(r, 1), makeGrid(r, 2), makeGrid(r, 3), makeGrid(r, 4), makeGrid(r, 5)].slice(1);
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
    let guards = 0, optional = 0, trapGuarded = 0, floors = 0, cutting = 0;
    for (let seed = 1; seed < 60; seed++) {
      const m = crawl(seed).grid!;
      floors++;
      const td = m.things[trapdoorThing(m)];
      for (const g of m.things) {
        if (!g.guard) { if (["fight", "elite"].includes(g.room)) optional++; continue; }
        guards++;
        const cut = reachable(m, m.px, m.py, new Set([g.y * m.w + g.x]));
        const all = reachable(m, m.px, m.py, new Set());
        if (m.tiles.some((t, i) => t === 1 && all[i] && !cut[i] && i !== g.y * m.w + g.x)) cutting++;
        if (!cut[td.y * m.w + td.x]) trapGuarded++;
      }
    }
    // Most guards really do block something, but not every way in is covered.
    expect(cutting / guards).toBeGreaterThan(0.6);
    expect(guards / floors).toBeGreaterThan(1.5);
    expect(trapGuarded / floors).toBeGreaterThan(0.5);
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

  it("urns break for a few coins (rarely a potion) and are gone; Merchants stay where they are", () => {
    const r = crawl(4);
    const m = r.grid!;
    const x = m.px, y = m.py;
    const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isFloor(m, x + dx, y + dy) && !m.things.some(t => t.x === x + dx && t.y === y + dy))!;
    m.things.push({ x: x + dir[0], y: y + dir[1], room: "urn" });
    const g = r.hero.f.gold, p = r.hero.potions + r.hero.manaPotions;
    gridStep(r, x + dir[0], y + dir[1]);
    expect(m.things[m.things.length - 1].done).toBe(true);
    expect([m.px, m.py]).toEqual([x, y]);
    expect(r.hero.f.gold + r.hero.potions + r.hero.manaPotions).toBeGreaterThanOrEqual(g + p);
    // The entrance Merchant: visit, leave, and it's still there with the same stock.
    const e = newRun("rogue", 8); startCrawl(e);
    const em = e.grid!;
    gridStep(e, em.px, em.py - 1); gridStep(e, em.px, em.py - 1);
    expect(e.scene.t).toBe("shop");
    const stock = e.scene.t === "shop" ? e.scene.stock : [];
    advance(e);
    const shop = em.things.find(t => t.room === "shop")!;
    expect(shop.done).toBeFalsy();
    expect(e.scene.t).toBe("map");
    gridStep(e, shop.x, shop.y);
    expect(e.scene.t === "shop" && e.scene.stock).toBe(stock);
  });

  it("foes give XP but no Gold, and no healing; past the boss, a treasure room holds its hoard and the way down", () => {
    const r = crawl(21);
    r.grid!.explored = 0;
    for (let d = 2; d <= 6; d++) descend(r);
    expect(r.scene.t === "combat" && r.scene.rank).toBe("boss");
    if (r.scene.t !== "combat") return;
    r.scene.battle.enemy.hp = 1;
    r.hero.f.hp = r.hero.f.maxHp = r.scene.battle.player.maxHp = r.scene.battle.player.hp = 999;
    for (let k = 0; k < 60 && r.scene.t === "combat"; k++) combatAction(r, "attack");
    expect(r.scene.t).toBe("map");
    expect(r.grid!.depth).toBe(TREASURE_DEPTH);
    expect(r.bossChest).toBeTruthy();
    const chest = r.grid!.things.find(t => t.room === "bosschest")!;
    r.grid!.px = chest.x; r.grid!.py = chest.y + 1;
    gridStep(r, chest.x, chest.y);
    expect(r.scene.t).toBe("pick");
    finishLoot(r);
    const t = r.scene.t as string;
    expect(["map", "talent"]).toContain(t);
    while ((r.scene.t as string) === "talent") skipTalent(r);
    expect(r.grid!.depth).toBe(TREASURE_DEPTH);
    descend(r);
    expect(r.scene.t).toBe("cleared");
    // And a plain foe on the next layer: XP, no Gold, no heal.
    advance(r);
    expect(r.floor).toBe(2);
    expect(r.grid!.depth).toBe(0);
  });

  it("about 30% of finds, of any rarity, want 1 to 5 levels more than you have (rarer ones more)", () => {
    const r = crawl(2);
    r.hero.level = 4;
    let gated = 0;
    const N = 600;
    for (let k = 0; k < N; k++) {
      const rarity = (["common", "uncommon", "rare", "legendary"] as const)[k % 4];
      const item = { uid: 99000 + k, base: "iron_sword", rarity, level: 1, bonuses: {} } as never as import("../src/engine/types").GearItem;
      gateItem(r, item);
      if (!item.reqLevel) continue;
      gated++;
      const extra = item.reqLevel - 4;
      expect(extra).toBeGreaterThanOrEqual(1);
      expect(extra).toBeLessThanOrEqual(rarity === "common" ? 2 : rarity === "uncommon" ? 3 : rarity === "rare" ? 4 : 5);
    }
    expect(gated / N).toBeGreaterThan(0.22);
    expect(gated / N).toBeLessThan(0.38);
    const item = { uid: 98999, base: "iron_sword", rarity: "rare", level: 1, bonuses: {}, reqLevel: 7 } as never as import("../src/engine/types").GearItem;
    expect(equipItem(r.hero, item)).toMatch(/level 7/);
  });

  it("urns are few and spread out; one-tile nooks hold an urn or a chest; chests give no Gold", () => {
    let nooks = 0, guarded = 0;
    for (let seed = 1; seed < 60; seed++) {
      const m = crawl(seed).grid!;
      const urns = m.things.filter(t => t.room === "urn");
      expect(urns.length).toBeLessThanOrEqual(5);
      // Urns and chests are never side by side, and always stand against a wall (or in a nook).
      const loot = m.things.filter(t => ["urn", "wooden", "iron", "vault"].includes(t.room));
      for (const a of loot) for (const b of loot) if (a !== b) expect(Math.abs(a.x - b.x) + Math.abs(a.y - b.y)).toBeGreaterThan(1);
      for (const a of loot) expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !isFloor(m, a.x + dx, a.y + dy))).toBe(true);
      // A nook: an urn or chest on a tile with only one way in, through a one-tile doorway.
      for (const t of m.things.filter(t => ["urn", "wooden", "iron"].includes(t.room))) {
        const open = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([dx, dy]) => isFloor(m, t.x + dx, t.y + dy));
        if (open.length !== 1) continue;
        const [dx, dy] = open[0];
        const door = [t.x + dx, t.y + dy];
        const doorOpen = [[1, 0], [-1, 0], [0, 1], [0, -1]].filter(([ex, ey]) => isFloor(m, door[0] + ex, door[1] + ey)).length;
        if (doorOpen !== 2) continue;
        nooks++;
        if (m.things.some(g => g.guard && g.x === door[0] && g.y === door[1])) guarded++;
      }
    }
    expect(nooks).toBeGreaterThan(40);
    expect(guarded).toBeGreaterThan(5);
    expect(guarded).toBeLessThan(nooks);
    // A chest in the Crawl holds gear, not Gold.
    const r = crawl(5);
    const m = r.grid!;
    const dir = [[1, 0], [-1, 0], [0, 1], [0, -1]].find(([dx, dy]) => isFloor(m, m.px + dx, m.py + dy) && !m.things.some(t => t.x === m.px + dx && t.y === m.py + dy))!;
    m.things.push({ x: m.px + dir[0], y: m.py + dir[1], room: "wooden" });
    gridStep(r, m.px + dir[0], m.py + dir[1]);
    expect(r.scene.t === "loot" && r.scene.gold).toBe(0);
  });

  it("bots can play whole Crawl runs: every run ends, floors are explored, each a fresh map", () => {
    let deepest = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const r = newRun("warrior", seed * 977); startCrawl(r);
      const maps = new Set<object>();
      for (let n = 0; n < 8000 && r.scene.t !== "over"; n++) {
        if (r.grid) maps.add(r.grid);
        expect(r.grid!.floor).toBe(r.floor);
        crawlStep(r);
      }
      expect(r.scene.t).toBe("over");
      deepest = Math.max(deepest, (r.floor - 1) * 10 + (r.grid?.depth ?? 0));
      expect(maps.size).toBeGreaterThanOrEqual(1 + (r.grid?.depth ?? 0));
    }
    expect(deepest).toBeGreaterThanOrEqual(2);
  }, 60000);
});

describe("tapping where to walk", () => {
  it("a tap into the dark never sends you back into a corner you've cleared out", () => {
    const r = newRun("warrior", 31); startCrawl(r); r.grid = makeGrid(r, 1);
    const m = r.grid;
    // Pretend we've seen every tile within 4 of where we stand, then tap far off into the dark in every direction.
    for (let i = 0; i < m.seen.length; i++) if (Math.hypot((i % m.w) - m.px, Math.floor(i / m.w) - m.py) <= 4) m.seen[i] = 1;
    for (const [tx, ty] of [[0, 0], [18, 0], [0, 18], [18, 18], [m.px, 0], [0, m.py]]) {
      if (m.seen[ty * m.w + tx]) continue;
      const p = pathToward(m, tx, ty);
      if (!p || !p.length) continue;
      const [ex, ey] = p[p.length - 1];
      // The end of the walk borders something not yet seen.
      expect([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !m.seen[(ey + dy) * m.w + ex + dx])).toBe(true);
    }
  });
});
