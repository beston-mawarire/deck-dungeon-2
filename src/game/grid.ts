// The Crawl (prototype): each floor is a real dungeon floor — rooms of different sizes joined by hallways,
// with walls between them. You walk it tile by tile (point and click). You see 3 tiles around you (walls block sight);
// what you've seen stays on your map. Foes, chests, services and landmarks stand on tiles: step onto one to meet it.
// This file is the floor's shape, sight and paths; run.ts decides what stands where and what happens.

export const MAP_W = 19;
export const MAP_H = 19;
/** A layer is six floors: five to explore (find the trapdoor down) and the boss's floor at the bottom. */
export const LAYER_FLOORS = 6;
/** How far you can see, in tiles. */
export const SIGHT = 3;
/** Every few encounters cleared, the floor's foes grow a little stronger. */
export const DANGER_EVERY = 6;
/** Crawl fights are one foe, but a harder one. */
export const GRID_HP = 1.15;
export const GRID_DMG = 1.05;
/** Per step of danger. */
export const DANGER_HP = 0.07;
export const DANGER_DMG = 0.05;
export const DANGER_WORDS = ["Quiet", "Stirring", "Restless", "Hunting", "Furious"];

/** Tiles: 0 wall, 1 floor. */
export type Tile = 0 | 1;

export interface Rect { x: number; y: number; w: number; h: number }

export interface MapThing {
  x: number;
  y: number;
  /** A RoomType, or "trapdoor". */
  room: string;
  done?: boolean;
  /** A Merchant's stock (it stays put, and so does what it sells). */
  stock?: import("./run").ShopEntry[];
  rerolls?: number;
  /** A foe that stands in the way of something (the trapdoor, a chest, a landmark): you must fight it to get past. */
  guard?: boolean;
}

export interface FloorMap {
  /** The layer (run.floor) and which of its floors this is (1–5; the 6th is the boss). */
  floor: number;
  depth: number;
  w: number;
  h: number;
  /** Row-major tiles. */
  tiles: Tile[];
  /** 1 where you've seen the tile. */
  seen: number[];
  rooms: Rect[];
  things: MapThing[];
  /** Where you stand. */
  px: number;
  py: number;
  /** Where you stood before the last step (a risky room you turn back from puts you back here). */
  bx?: number;
  by?: number;
  /** Encounters cleared on this layer so far (it carries down the trapdoors). */
  explored: number;
  /** The thing being entered right now, and the last one entered. */
  pending?: number;
  last?: number;
  /** Little torches on the walls (tile indexes). */
  torches?: number[];
  /** The thing picked on the map, waiting for "Go". */
  sel?: number;
}

export const idx = (m: { w: number }, x: number, y: number) => y * m.w + x;
export const inside = (m: { w: number; h: number }, x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h;
export const isFloor = (m: FloorMap, x: number, y: number) => inside(m, x, y) && m.tiles[idx(m, x, y)] === 1;
export const thingAt = (m: FloorMap, x: number, y: number) => m.things.findIndex(t => t.x === x && t.y === y && !t.done);
export const isSeenTile = (m: FloorMap, x: number, y: number) => inside(m, x, y) && m.seen[idx(m, x, y)] === 1;

const center = (r: Rect) => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });

/** Carve a floor: rooms of different sizes, joined by hallways (some two tiles wide, with a loop now and then), and pick the start. */
export function carve(rng: () => number, w = MAP_W, h = MAP_H): { tiles: Tile[]; rooms: Rect[]; start: number; order: number[] } {
  for (let attempt = 0; ; attempt++) {
    const out = carveOnce(rng, w, h);
    if (out.rooms.length >= 3 || attempt > 20) return out;
  }
}

function carveOnce(rng: () => number, w: number, h: number) {
  const tiles: Tile[] = new Array(w * h).fill(0);
  const rooms: Rect[] = [];
  // A few small halls to walk between; the treasures sit in pockets dug off them (see digPocket).
  const want = 3 + Math.floor(rng() * 2);
  for (let tries = 0; tries < 300 && rooms.length < want; tries++) {
    const big = rng() < 0.25;
    const rw = big ? 5 : 3 + Math.floor(rng() * 2);
    const rh = big ? 4 + Math.floor(rng() * 2) : 3 + Math.floor(rng() * 2);
    const x = 2 + Math.floor(rng() * (w - rw - 4));
    const y = 2 + Math.floor(rng() * (h - rh - 4));
    const r = { x, y, w: rw, h: rh };
    if (rooms.some(o => x < o.x + o.w + 3 && o.x < x + rw + 3 && y < o.y + o.h + 3 && o.y < y + rh + 3)) continue;
    rooms.push(r);
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[y * w + x] = 1;
  const hall = (a: Rect, b: Rect) => {
    const p = center(a), q = center(b);
    const wide = rng() < 0.35;
    const dig = (x: number, y: number, horiz: boolean) => {
      tiles[y * w + x] = 1;
      // A wide hall is two tiles across.
      if (wide) { const ox = horiz ? x : Math.min(w - 2, x + 1), oy = horiz ? Math.min(h - 2, y + 1) : y; tiles[oy * w + ox] = 1; }
    };
    let x = p.x, y = p.y;
    const stepX = () => { while (x !== q.x) { dig(x, y, true); x += Math.sign(q.x - x); } };
    const stepY = () => { while (y !== q.y) { dig(x, y, false); y += Math.sign(q.y - y); } };
    if (rng() < 0.5) { stepX(); stepY(); } else { stepY(); stepX(); }
    dig(x, y, true);
  };
  const joined = [0];
  const dist = (a: Rect, b: Rect) => { const p = center(a), q = center(b); return Math.abs(p.x - q.x) + Math.abs(p.y - q.y); };
  while (joined.length < rooms.length) {
    let best: [number, number, number] = [-1, -1, Infinity];
    for (let i = 0; i < rooms.length; i++) if (!joined.includes(i)) for (const j of joined) { const d = dist(rooms[i], rooms[j]); if (d < best[2]) best = [i, j, d]; }
    hall(rooms[best[0]], rooms[best[1]]);
    joined.push(best[0]);
  }
  if (rooms.length > 3 && rng() < 0.5) {
    const a = Math.floor(rng() * rooms.length), b = Math.floor(rng() * rooms.length);
    if (a !== b) hall(rooms[a], rooms[b]);
  }
  let start = 0;
  rooms.forEach((r, i) => { if (r.y + r.h > rooms[start].y + rooms[start].h) start = i; });
  const s = center(rooms[start]);
  const far = walkDistances({ w, h, tiles }, s.x, s.y);
  const order = rooms.map((_, i) => i).sort((a, b) => far[idx({ w }, center(rooms[a]).x, center(rooms[a]).y)] - far[idx({ w }, center(rooms[b]).x, center(rooms[b]).y)]);
  return { tiles, rooms, start, order };
}

/** Dig a little dead-end nook off a room (two tiles deep): something waits at the end, and whatever stands at its mouth must be faced. */
export function digNook(m: { w: number; h: number; tiles: Tile[] }, r: Rect, rng: () => number): { mouth: number; end: number } | null {
  const sides: [number, number, number, number][] = [];
  for (let x = r.x + 1; x < r.x + r.w - 1; x++) { sides.push([x, r.y - 1, 0, -1]); sides.push([x, r.y + r.h, 0, 1]); }
  for (let y = r.y + 1; y < r.y + r.h - 1; y++) { sides.push([r.x - 1, y, -1, 0]); sides.push([r.x + r.w, y, 1, 0]); }
  for (let k = sides.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [sides[k], sides[j]] = [sides[j], sides[k]]; }
  const wall = (x: number, y: number) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && m.tiles[y * m.w + x] === 0;
  for (const [x, y, dx, dy] of sides) {
    const ex = x + dx, ey = y + dy;
    // The nook and everything around it (bar the room) must be solid rock, so it stays a dead end.
    const ring: [number, number][] = [[x, y], [ex, ey], [ex + dx, ey + dy], [x - dy, y - dx], [x + dy, y + dx], [ex - dy, ey - dx], [ex + dy, ey + dx]];
    if (!ring.every(([a, b]) => wall(a, b))) continue;
    m.tiles[y * m.w + x] = 1;
    m.tiles[ey * m.w + ex] = 1;
    return { mouth: y * m.w + x, end: ey * m.w + ex };
  }
  return null;
}

/** Dig a small room off the floor behind a one-tile doorway (the choke point): a pocket for a treasure or two.
 *  `prefer` orders where it may hang off (best first); `avoid` are tiles it must not hang off (other pockets). */
export function digPocket(m: { w: number; h: number; tiles: Tile[] }, rng: () => number, pw: number, ph: number, avoid: Set<number>, prefer?: (i: number) => number): { door: number; cells: number[]; front: number } | null {
  const wall = (x: number, y: number) => x > 0 && y > 0 && x < m.w - 1 && y < m.h - 1 && m.tiles[y * m.w + x] === 0;
  const cands: [number, number, number][] = [];
  for (let i = 0; i < m.tiles.length; i++) {
    if (m.tiles[i] !== 1 || avoid.has(i)) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) cands.push([i, dx, dy]);
  }
  for (let k = cands.length - 1; k > 0; k--) { const j = Math.floor(rng() * (k + 1)); [cands[k], cands[j]] = [cands[j], cands[k]]; }
  if (prefer) cands.sort((a, b) => prefer(b[0]) - prefer(a[0]));
  for (const [i, dx, dy] of cands) {
    const fx = i % m.w, fy = Math.floor(i / m.w);
    const dxd = fx + dx, dyd = fy + dy;
    // The doorway: rock, with rock either side of it.
    if (!wall(dxd, dyd) || !wall(dxd - dy, dyd - dx) || !wall(dxd + dy, dyd + dx)) continue;
    const across = dx !== 0 ? ph : pw, deep = dx !== 0 ? pw : ph;
    const off = Math.floor(rng() * across);
    // The pocket's cells, beyond the doorway.
    const cells: number[] = [];
    for (let a = 0; a < across; a++) for (let d = 1; d <= deep; d++) {
      const cx = dxd + dx * d + (dx === 0 ? a - off : 0), cy = dyd + dy * d + (dy === 0 ? a - off : 0);
      cells.push(cy * m.w + cx);
    }
    // It and a ring of rock round it must be solid (so it only opens through the doorway).
    const xs = cells.map(c => c % m.w), ys = cells.map(c => Math.floor(c / m.w));
    const x0 = Math.min(...xs) - 1, x1 = Math.max(...xs) + 1, y0 = Math.min(...ys) - 1, y1 = Math.max(...ys) + 1;
    let ok = true;
    for (let y = y0; y <= y1 && ok; y++) for (let x = x0; x <= x1; x++) { if (x === dxd && y === dyd) continue; if (!wall(x, y)) { ok = false; break; } }
    if (!ok) continue;
    m.tiles[dyd * m.w + dxd] = 1;
    for (const c of cells) m.tiles[c] = 1;
    return { door: dyd * m.w + dxd, cells, front: (dyd + dy) * m.w + dxd };
  }
  return null;
}

/** Tiles you can reach from (x, y) if the tiles in `blocked` were solid. */
export function reachable(m: { w: number; h: number; tiles: Tile[] }, x: number, y: number, blocked: Set<number>): Uint8Array {
  const seen = new Uint8Array(m.w * m.h);
  const q = [y * m.w + x];
  seen[q[0]] = 1;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], cx = i % m.w, cy = Math.floor(i / m.w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const j = ny * m.w + nx;
      if (seen[j] || m.tiles[j] !== 1 || blocked.has(j)) continue;
      seen[j] = 1;
      q.push(j);
    }
  }
  return seen;
}

/** Steps from (x, y) to every tile (-1 where you can't get). */
export function walkDistances(m: { w: number; h: number; tiles: Tile[] }, x: number, y: number): number[] {
  const d = new Array(m.w * m.h).fill(-1);
  const q = [y * m.w + x];
  d[q[0]] = 0;
  for (let k = 0; k < q.length; k++) {
    const i = q[k], cx = i % m.w, cy = Math.floor(i / m.w);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = cx + dx, ny = cy + dy;
      if (nx < 0 || ny < 0 || nx >= m.w || ny >= m.h) continue;
      const j = ny * m.w + nx;
      if (m.tiles[j] !== 1 || d[j] >= 0) continue;
      d[j] = d[i] + 1;
      q.push(j);
    }
  }
  return d;
}

export { center as roomCenter };

/** Can you see from (ax, ay) to (bx, by)? Walls block sight (the wall itself can be seen). */
export function lineOfSight(m: FloorMap, ax: number, ay: number, bx: number, by: number): boolean {
  let x = ax, y = ay;
  const dx = Math.abs(bx - ax), dy = -Math.abs(by - ay), sx = ax < bx ? 1 : -1, sy = ay < by ? 1 : -1;
  let err = dx + dy;
  while (!(x === bx && y === by)) {
    if (!(x === ax && y === ay) && !isFloor(m, x, y)) return false;
    const e2 = 2 * err;
    if (e2 >= dy) { err += dy; x += sx; }
    if (e2 <= dx) { err += dx; y += sy; }
  }
  return true;
}

/** Tiles in sight right now. */
export function inSight(m: FloorMap, x = m.px, y = m.py): number[] {
  const out: number[] = [];
  for (let dy = -SIGHT; dy <= SIGHT; dy++) for (let dx = -SIGHT; dx <= SIGHT; dx++) {
    if (dx * dx + dy * dy > SIGHT * SIGHT + 1) continue;
    const tx = x + dx, ty = y + dy;
    if (inside(m, tx, ty) && lineOfSight(m, x, y, tx, ty)) out.push(idx(m, tx, ty));
  }
  return out;
}

/** Look around: mark what's in sight as seen. Returns the things that just came into view. */
export function look(m: FloorMap): number[] {
  const fresh: number[] = [];
  for (const i of inSight(m)) {
    if (m.seen[i]) continue;
    m.seen[i] = 1;
    const t = m.things.findIndex(th => !th.done && idx(m, th.x, th.y) === i);
    if (t >= 0) fresh.push(t);
  }
  return fresh;
}

/** The shortest walk over tiles you've seen to (x, y), going around anything still standing (except at the end). Null if there's no way. */
export function pathTo(m: FloorMap, x: number, y: number, through = false): [number, number][] | null {
  if (!isFloor(m, x, y) || !isSeenTile(m, x, y)) return null;
  if (x === m.px && y === m.py) return [];
  const goal = idx(m, x, y);
  const prev = new Array(m.w * m.h).fill(-2);
  const start = idx(m, m.px, m.py);
  prev[start] = -1;
  const q = [start];
  const blocked = through ? new Set<number>() : new Set(m.things.filter(t => !t.done).map(t => idx(m, t.x, t.y)));
  for (let k = 0; k < q.length; k++) {
    const i = q[k];
    if (i === goal) break;
    const cx = i % m.w, cy = Math.floor(i / m.w);
    for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      const nx = cx + dx, ny = cy + dy;
      if (!isFloor(m, nx, ny) || !isSeenTile(m, nx, ny)) continue;
      const j = idx(m, nx, ny);
      if (prev[j] !== -2 || (blocked.has(j) && j !== goal)) continue;
      prev[j] = i;
      q.push(j);
    }
  }
  if (prev[goal] === -2) return null;
  const path: [number, number][] = [];
  for (let i = goal; i !== start; i = prev[i]) path.unshift([i % m.w, Math.floor(i / m.w)]);
  return path;
}

/** Head toward (x, y) when you can't see a way there yet: walk to the known tile nearest to it. */
export function pathToward(m: FloorMap, x: number, y: number): [number, number][] | null {
  // Around anything in the way if you can; otherwise straight at it (the walk stops in front of whatever blocks it).
  const direct = pathTo(m, x, y) ?? pathTo(m, x, y, true);
  if (direct) return direct;
  const blocked = new Set(m.things.filter(t => !t.done).map(t => idx(m, t.x, t.y)));
  const seenFloor = { w: m.w, h: m.h, tiles: m.tiles.map((t, i) => (t === 1 && m.seen[i] && !blocked.has(i) ? 1 : 0)) as Tile[] };
  const d = walkDistances(seenFloor, m.px, m.py);
  // The known tile that gets you closest to the spot, without a long detour; tiles at the edge of what you've seen
  // (where more will come into view) win ties.
  const edge = (i: number) => [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => { const x = (i % m.w) + dx, y = Math.floor(i / m.w) + dy; return inside(m, x, y) && !m.seen[idx(m, x, y)]; });
  const here = Math.hypot(m.px - x, m.py - y);
  let best = -1, bestScore = Infinity;
  d.forEach((v, i) => {
    if (v <= 0) return;
    const e = Math.hypot((i % m.w) - x, Math.floor(i / m.w) - y);
    if (e >= here - 0.5) return;
    const score = e + 0.12 * v - (edge(i) ? 0.4 : 0);
    if (score < bestScore) { best = i; bestScore = score; }
  });
  return best < 0 ? null : pathTo(m, best % m.w, Math.floor(best / m.w));
}

export const trapdoorThing = (m: FloorMap) => m.things.findIndex(t => t.room === "trapdoor");
export const dangerOf = (m: FloorMap) => Math.floor(m.explored / DANGER_EVERY);
export const dangerWord = (d: number) => DANGER_WORDS[Math.min(d, DANGER_WORDS.length - 1)];
