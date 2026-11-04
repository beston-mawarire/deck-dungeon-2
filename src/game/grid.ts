// The Crawl (prototype): each floor is a real dungeon floor — rooms of different sizes joined by hallways,
// with walls between them. You walk it tile by tile (point and click). You see 3 tiles around you (walls block sight);
// what you've seen stays on your map. Foes, chests, services and landmarks stand on tiles: step onto one to meet it.
// This file is the floor's shape, sight and paths; run.ts decides what stands where and what happens.

export const MAP_W = 33;
export const MAP_H = 33;
/** How far you can see, in tiles. */
export const SIGHT = 3;
/** Encounters to clear before the boss will face you. */
export const BOSS_KEY = 4;
/** Every few encounters cleared, the floor's foes grow a little stronger. */
export const DANGER_EVERY = 4;
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
  /** A RoomType. */
  room: string;
  done?: boolean;
}

export interface FloorMap {
  floor: number;
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
  /** Encounters cleared on this floor (the boss doesn't count). */
  explored: number;
  /** The thing being entered right now. */
  pending?: number;
  /** The thing picked on the map, waiting for "Go". */
  sel?: number;
}

export const idx = (m: { w: number }, x: number, y: number) => y * m.w + x;
export const inside = (m: { w: number; h: number }, x: number, y: number) => x >= 0 && y >= 0 && x < m.w && y < m.h;
export const isFloor = (m: FloorMap, x: number, y: number) => inside(m, x, y) && m.tiles[idx(m, x, y)] === 1;
export const thingAt = (m: FloorMap, x: number, y: number) => m.things.findIndex(t => t.x === x && t.y === y && !t.done);
export const isSeenTile = (m: FloorMap, x: number, y: number) => inside(m, x, y) && m.seen[idx(m, x, y)] === 1;

const center = (r: Rect) => ({ x: r.x + Math.floor(r.w / 2), y: r.y + Math.floor(r.h / 2) });

/** Carve a floor: rooms of different sizes, joined by hallways (with a loop or two), then pick the start and the boss's room. */
export function carve(rng: () => number, w = MAP_W, h = MAP_H): { tiles: Tile[]; rooms: Rect[]; start: number; boss: number; order: number[] } {
  const tiles: Tile[] = new Array(w * h).fill(0);
  const rooms: Rect[] = [];
  const want = 8 + Math.floor(rng() * 3);
  for (let tries = 0; tries < 400 && rooms.length < want; tries++) {
    // A few big halls, mostly modest rooms, the odd closet.
    const big = rng() < 0.25;
    const rw = big ? 6 + Math.floor(rng() * 4) : 3 + Math.floor(rng() * 4);
    const rh = big ? 5 + Math.floor(rng() * 3) : 3 + Math.floor(rng() * 3);
    const x = 1 + Math.floor(rng() * (w - rw - 2));
    const y = 1 + Math.floor(rng() * (h - rh - 2));
    const r = { x, y, w: rw, h: rh };
    if (rooms.some(o => x < o.x + o.w + 2 && o.x < x + rw + 2 && y < o.y + o.h + 2 && o.y < y + rh + 2)) continue;
    rooms.push(r);
  }
  for (const r of rooms) for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) tiles[y * w + x] = 1;
  const hall = (a: Rect, b: Rect) => {
    const p = center(a), q = center(b);
    const xFirst = rng() < 0.5;
    const dig = (x: number, y: number) => { tiles[y * w + x] = 1; };
    let x = p.x, y = p.y;
    const stepX = () => { while (x !== q.x) { dig(x, y); x += Math.sign(q.x - x); } };
    const stepY = () => { while (y !== q.y) { dig(x, y); y += Math.sign(q.y - y); } };
    if (xFirst) { stepX(); stepY(); } else { stepY(); stepX(); }
    dig(x, y);
  };
  // Join every room to the nearest one already joined (a tree), then add a loop or two.
  const joined = [0];
  const dist = (a: Rect, b: Rect) => { const p = center(a), q = center(b); return Math.abs(p.x - q.x) + Math.abs(p.y - q.y); };
  while (joined.length < rooms.length) {
    let best: [number, number, number] = [-1, -1, Infinity];
    for (let i = 0; i < rooms.length; i++) if (!joined.includes(i)) for (const j of joined) { const d = dist(rooms[i], rooms[j]); if (d < best[2]) best = [i, j, d]; }
    hall(rooms[best[0]], rooms[best[1]]);
    joined.push(best[0]);
  }
  for (let k = 0; k < 1 + Math.floor(rng() * 2); k++) {
    const a = Math.floor(rng() * rooms.length), b = Math.floor(rng() * rooms.length);
    if (a !== b) hall(rooms[a], rooms[b]);
  }
  // Start in the lowest room; the boss holds the room furthest away on foot.
  let start = 0;
  rooms.forEach((r, i) => { if (r.y + r.h > rooms[start].y + rooms[start].h) start = i; });
  const s = center(rooms[start]);
  const far = walkDistances({ w, h, tiles }, s.x, s.y);
  const order = rooms.map((_, i) => i).sort((a, b) => far[idx({ w }, center(rooms[a]).x, center(rooms[a]).y)] - far[idx({ w }, center(rooms[b]).x, center(rooms[b]).y)]);
  return { tiles, rooms, start, boss: order[order.length - 1], order };
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
export function pathTo(m: FloorMap, x: number, y: number): [number, number][] | null {
  if (!isFloor(m, x, y) || !isSeenTile(m, x, y)) return null;
  if (x === m.px && y === m.py) return [];
  const goal = idx(m, x, y);
  const prev = new Array(m.w * m.h).fill(-2);
  const start = idx(m, m.px, m.py);
  prev[start] = -1;
  const q = [start];
  const blocked = new Set(m.things.filter(t => !t.done).map(t => idx(m, t.x, t.y)));
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
  const direct = pathTo(m, x, y);
  if (direct) return direct;
  const blocked = new Set(m.things.filter(t => !t.done).map(t => idx(m, t.x, t.y)));
  const seenFloor = { w: m.w, h: m.h, tiles: m.tiles.map((t, i) => (t === 1 && m.seen[i] && !blocked.has(i) ? 1 : 0)) as Tile[] };
  const d = walkDistances(seenFloor, m.px, m.py);
  let best = -1, bestD = Math.hypot(m.px - x, m.py - y) - 0.5;
  d.forEach((v, i) => {
    if (v < 0) return;
    const e = Math.hypot((i % m.w) - x, Math.floor(i / m.w) - y);
    if (e < bestD - 1e-9 || (best >= 0 && Math.abs(e - bestD) < 1e-9 && v < d[best])) { best = i; bestD = e; }
  });
  return best < 0 ? null : pathTo(m, best % m.w, Math.floor(best / m.w));
}

export const bossThing = (m: FloorMap) => m.things.findIndex(t => t.room === "boss");
export const bossLocked = (m: FloorMap) => m.explored < BOSS_KEY;
export const dangerOf = (m: FloorMap) => Math.floor(m.explored / DANGER_EVERY);
export const dangerWord = (d: number) => DANGER_WORDS[Math.min(d, DANGER_WORDS.length - 1)];
