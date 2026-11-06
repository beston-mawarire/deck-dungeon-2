// The Camp as a place you walk around: a cavern courtyard drawn from the tileset, with each of the Camp's options
// as a spot you walk up to (the Hall's door, the Garden's plots, the Brewery's cauldron, the stairs into the dungeon…).
import { atlas, CLASS_SPRITE, drawWater, drawSprite, drawTile, hasSprite } from "./sprites";

export const CAMP_W = 23, CAMP_H = 25;
export interface CampSpot { id: string; name: string; tiles: [number, number][]; locked?: boolean }
/** A firelit hall in the middle, and each of the Camp's options in a little room of its own off it. */
const ROOMS: { id: string; name: string; cx: number; cy: number; side: "n" | "s" | "w" | "e" | "x"; tiles?: [number, number][] }[] = [
  { id: "quests", name: "Quest Board", cx: 7, cy: 2, side: "n" }, { id: "expedition", name: "Enter Dungeon", cx: 11, cy: 2, side: "n" }, { id: "hall", name: "Hall", cx: 15, cy: 2, side: "n" },
  { id: "skills", name: "Paths", cx: 2, cy: 8, side: "w" }, { id: "garden", name: "Garden", cx: 2, cy: 12, side: "w", tiles: [[1, 12], [2, 12], [3, 12]] }, { id: "trophies", name: "Trophy Room", cx: 2, cy: 16, side: "w" },
  { id: "knowledge", name: "Knowledge", cx: 20, cy: 8, side: "e" }, { id: "brewery", name: "Brewery", cx: 20, cy: 12, side: "e", tiles: [[20, 12], [21, 12]] }, { id: "bestiary", name: "Bestiary", cx: 20, cy: 16, side: "e" },
  { id: "tree", name: "Passive Tree", cx: 7, cy: 22, side: "s" }, { id: "abyss", name: "The Abyss", cx: 11, cy: 22, side: "s" }, { id: "weapons", name: "Weapon Mastery", cx: 15, cy: 22, side: "s" },
  // The Tarot room: off the Weapon Mastery room, through a short passage (side "x": no passage of its own to the hall).
  { id: "tarot", name: "Tarot Room", cx: 19, cy: 22, side: "x" },
  // The Drills yard: off the Passive Tree's room, the same way.
  { id: "drills", name: "Drills", cx: 3, cy: 22, side: "x" }
];
/** Where everything stands (x, y). */
export const CAMP_SPOTS: CampSpot[] = [...ROOMS.map(r => ({ id: r.id, name: r.name, tiles: r.tiles ?? [[r.cx, r.cy]] as [number, number][] })), { id: "pond", name: "Still Pool", tiles: [[14, 15], [15, 15]] }];
const HUB = { x0: 6, x1: 16, y0: 7, y1: 17 };
/** The campfire in the middle of the hall (in the way, but not a spot). */
const FIRE: [number, number] = [11, 12];
const START: [number, number] = [11, 14];
/** The floor plan: the hall, the rooms (3×3) and the short passages joining them. */
const FLOOR = (() => {
  const f = new Uint8Array(CAMP_W * CAMP_H);
  const dig = (x0: number, y0: number, x1: number, y1: number) => { for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) f[y * CAMP_W + x] = 1; };
  dig(HUB.x0, HUB.y0, HUB.x1, HUB.y1);
  dig(17, 22, 17, 22);
  dig(5, 22, 5, 22);
  for (const r of ROOMS) {
    dig(r.cx - 1, r.cy - 1, r.cx + 1, r.cy + 1);
    if (r.side === "n") dig(r.cx, r.cy + 2, r.cx, HUB.y0 - 1);
    if (r.side === "s") dig(r.cx, HUB.y1 + 1, r.cx, r.cy - 2);
    if (r.side === "w") dig(r.cx + 2, r.cy, HUB.x0 - 1, r.cy);
    if (r.side === "e") dig(HUB.x1 + 1, r.cy, r.cx - 2, r.cy);
  }
  return f;
})();
/** Torches on the hall's back wall and in each room. */
const TORCHES: [number, number][] = [[8, 6], [14, 6], ...ROOMS.filter(r => r.side !== "n").map(r => [r.cx - 1, r.cy - 2] as [number, number]), ...ROOMS.filter(r => r.side === "n").map(r => [r.cx + 1, r.cy - 2] as [number, number])];

export interface CampHooks { open: (id: string) => void; origin: () => string; locked: (id: string) => boolean; sfx: (k: string) => void }
let hooks: CampHooks | null = null;
let pos: [number, number] = [...START];
let path: [number, number][] = [];
let target: string | null = null;
let glide: { fx: number; fy: number; t0: number } | null = null;
let timer: number | undefined;
let raf = 0;
const STEP_MS = 120;

const isWall = (x: number, y: number) => x < 0 || y < 0 || x >= CAMP_W || y >= CAMP_H || !FLOOR[y * CAMP_W + x];
const spotAt = (x: number, y: number) => CAMP_SPOTS.find(s => s.tiles.some(([a, b]) => a === x && b === y));
const blocked = (x: number, y: number) => isWall(x, y) || !!spotAt(x, y) || (x === FIRE[0] && y === FIRE[1]);
const hash = (x: number, y: number, k = 0) => { let n = (x * 374761393 + y * 668265263 + k * 2246822519) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

/** Shortest walk to (gx, gy) over open floor. */
function route(gx: number, gy: number): [number, number][] | null {
  const key = (x: number, y: number) => y * CAMP_W + x;
  const prev = new Map<number, number>([[key(...pos), -1]]);
  const q: [number, number][] = [pos];
  for (let k = 0; k < q.length; k++) {
    const [x, y] = q[k];
    if (x === gx && y === gy) break;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (blocked(nx, ny) || prev.has(key(nx, ny))) continue;
      prev.set(key(nx, ny), key(x, y));
      q.push([nx, ny]);
    }
  }
  if (!prev.has(key(gx, gy))) return null;
  const out: [number, number][] = [];
  for (let i = key(gx, gy); i !== key(...pos); i = prev.get(i)!) out.unshift([i % CAMP_W, Math.floor(i / CAMP_W)]);
  return out;
}

/** The camera follows you (the Camp is bigger than the screen). */
let camX = START[0], camY = START[1];
function layout(cv: HTMLCanvasElement) {
  const W = cv.clientWidth, H = cv.clientHeight;
  const ts = Math.round(Math.max(40, Math.min(72, Math.min(W, H) / 9)));
  const fit = (view: number, n: number, c: number) => (n * ts <= view ? Math.floor((view - n * ts) / 2) : Math.round(Math.min(0, Math.max(view - n * ts, view / 2 - (c + 0.5) * ts))));
  return { W, H, ts, ox: fit(W, CAMP_W, camX), oy: fit(H, CAMP_H, camY) };
}
/** Where a Camp tile's top-left corner is drawn. */
const at = (x: number, y: number, ts: number, ox: number, oy: number): [number, number] => [ox + x * ts, oy + y * ts];
const toScreen = (x: number, y: number): [number, number] => [x, y];

function drawFire(ctx: CanvasRenderingContext2D, cx: number, cy: number, ts: number, now: number) {
  const fl = 0.85 + 0.15 * Math.sin(now / 80) * Math.sin(now / 31);
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 3.2 * fl);
  g.addColorStop(0, "rgba(255,150,60,.34)"); g.addColorStop(1, "rgba(255,110,30,0)");
  ctx.fillStyle = g; ctx.fillRect(cx - ts * 3.5, cy - ts * 3.5, ts * 7, ts * 7);
  ctx.restore();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; ctx.fillStyle = k % 2 ? "#6a5a4a" : "#544638"; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * ts * 0.36, cy + ts * 0.18 + Math.sin(a) * ts * 0.14, ts * 0.09, ts * 0.07, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = "#5a3418"; ctx.lineWidth = ts * 0.1; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - ts * 0.25, cy + ts * 0.26); ctx.lineTo(cx + ts * 0.25, cy + ts * 0.08); ctx.moveTo(cx + ts * 0.25, cy + ts * 0.26); ctx.lineTo(cx - ts * 0.25, cy + ts * 0.08); ctx.stroke();
  const fh = ts * 0.62 * fl;
  const fg = ctx.createRadialGradient(cx, cy - fh * 0.1, 0, cx, cy - fh * 0.1, fh);
  fg.addColorStop(0, "#fff4c0"); fg.addColorStop(0.35, "#ffc850"); fg.addColorStop(0.7, "#ff7a20"); fg.addColorStop(1, "rgba(255,80,10,0)");
  ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, cy - fh * 0.15, ts * 0.2, fh * 0.65, 0, 0, Math.PI * 2); ctx.fill();
}

/** Draw one spot (each has its own look). */
function drawSpot(ctx: CanvasRenderingContext2D, s: CampSpot, ts: number, ox: number, oy: number, now: number) {
  const [x, y] = s.tiles[0];
  const [sx0, sy0] = at(x, y, ts, ox, oy);
  const cx = sx0 + 0.5 * ts, cy = sy0 + 0.5 * ts, by = sy0 + ts - ts * 0.06, sc = ts / 16;
  const shadow = (w = 0.36) => { ctx.fillStyle = "rgba(10,5,2,.45)"; ctx.beginPath(); ctx.ellipse(cx, cy + ts * 0.34, ts * w, ts * 0.1, 0, 0, Math.PI * 2); ctx.fill(); };
  switch (s.id) {
    case "expedition": {
      // The way down: a black hole in the floor with a warm rim, and steps going down into it.
      const pulse = 0.65 + 0.35 * Math.sin(now / 600), w = ts * 0.8;
      ctx.save(); ctx.shadowColor = `rgba(255,214,70,${0.55 * pulse})`; ctx.shadowBlur = ts * 0.3;
      ctx.fillStyle = "#000"; ctx.fillRect(cx - w / 2, cy - w / 2, w, w);
      ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = Math.max(2, ts / 20); ctx.strokeRect(cx - w / 2, cy - w / 2, w, w); ctx.restore();
      drawTile(ctx, "floor_stairs", cx - w * 0.4, cy - w * 0.4, w * 0.8);
      break;
    }
    case "quests": shadow(0.3); drawSprite(ctx, "wall_banner_yellow", cx, by, sc); ctx.fillStyle = "#4a2e16"; ctx.fillRect(cx - ts * 0.04, cy, ts * 0.08, ts * 0.45); break;
    case "hall": shadow(); drawSprite(ctx, "chest_gold", cx, by, sc); drawSprite(ctx, "wall_banner_red", cx, sy0 - ts * 0.05, sc); break;
    case "trophies": {
      // A skull on a stand, and a glint.
      ctx.fillStyle = "#4a2e16"; ctx.fillRect(cx - ts * 0.22, cy + ts * 0.05, ts * 0.44, ts * 0.38); ctx.fillStyle = "#6a4424"; ctx.fillRect(cx - ts * 0.28, cy + ts * 0.02, ts * 0.56, ts * 0.08);
      drawSprite(ctx, "skull", cx, cy + ts * 0.06, sc);
      const tw = 0.5 + 0.5 * Math.sin(now / 500); ctx.fillStyle = `rgba(255,235,160,${tw})`; ctx.beginPath(); ctx.arc(cx + ts * 0.2, cy - ts * 0.25, ts * 0.04, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "bestiary": {
      // An open book on a lectern.
      shadow(0.3);
      ctx.fillStyle = "#3e2712"; ctx.fillRect(cx - ts * 0.05, cy, ts * 0.1, ts * 0.42);
      ctx.fillStyle = "#5a3a1e"; ctx.beginPath(); ctx.moveTo(cx - ts * 0.34, cy - ts * 0.02); ctx.lineTo(cx + ts * 0.34, cy - ts * 0.02); ctx.lineTo(cx + ts * 0.28, cy + ts * 0.1); ctx.lineTo(cx - ts * 0.28, cy + ts * 0.1); ctx.fill();
      ctx.fillStyle = "#ecdfc2"; ctx.fillRect(cx - ts * 0.3, cy - ts * 0.2, ts * 0.29, ts * 0.2); ctx.fillRect(cx + ts * 0.01, cy - ts * 0.2, ts * 0.29, ts * 0.2);
      ctx.strokeStyle = "rgba(90,60,30,.6)"; ctx.lineWidth = 1;
      for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(cx - ts * 0.26, cy - ts * (0.15 - 0.05 * k)); ctx.lineTo(cx - ts * 0.05, cy - ts * (0.15 - 0.05 * k)); ctx.moveTo(cx + ts * 0.05, cy - ts * (0.15 - 0.05 * k)); ctx.lineTo(cx + ts * 0.26, cy - ts * (0.15 - 0.05 * k)); ctx.stroke(); }
      break;
    }
    case "skills": shadow(); drawSprite(ctx, "lizard_f", cx, by, sc); break;
    case "knowledge": shadow(); drawSprite(ctx, "wizzard_f", cx, by, sc); break;
    case "garden":
      for (const [gx, gy] of s.tiles) {
        const [px, py] = at(gx, gy, ts, ox, oy);
        ctx.fillStyle = "#3d2a17"; ctx.fillRect(px + ts * 0.06, py + ts * 0.1, ts * 0.88, ts * 0.8);
        ctx.strokeStyle = "#2a1c0e"; ctx.lineWidth = 2; ctx.strokeRect(px + ts * 0.06, py + ts * 0.1, ts * 0.88, ts * 0.8);
        for (let k = 0; k < 3; k++) {
          const sx = px + ts * (0.25 + 0.25 * k), sy = py + ts * 0.62, sw = Math.sin(now / 700 + k + gx) * ts * 0.03;
          ctx.strokeStyle = "#4f8a2e"; ctx.lineWidth = Math.max(2, ts / 18);
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + sw, sy - ts * 0.2, sx + sw * 2, sy - ts * 0.32); ctx.stroke();
          ctx.fillStyle = "#7cc04a"; ctx.beginPath(); ctx.ellipse(sx + sw * 2 + ts * 0.06, sy - ts * 0.3, ts * 0.07, ts * 0.04, -0.6, 0, Math.PI * 2); ctx.fill();
        }
      }
      break;
    case "brewery": {
      // A cauldron on the boil, and flasks beside it.
      const px = cx, py = cy;
      ctx.fillStyle = "#1b1612"; ctx.beginPath(); ctx.ellipse(px, py + ts * 0.12, ts * 0.38, ts * 0.3, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#3d5a2a"; ctx.beginPath(); ctx.ellipse(px, py - ts * 0.08, ts * 0.32, ts * 0.1, 0, 0, Math.PI * 2); ctx.fill();
      for (let k = 0; k < 3; k++) { const ph = ((now / 900) + k / 3) % 1; ctx.fillStyle = `rgba(160,230,110,${0.7 * (1 - ph)})`; ctx.beginPath(); ctx.arc(px + (k - 1) * ts * 0.12, py - ts * (0.1 + 0.35 * ph), ts * 0.05, 0, Math.PI * 2); ctx.fill(); }
      const [fx2, fy2] = at(s.tiles[1][0], s.tiles[1][1], ts, ox, oy);
      drawSprite(ctx, "flask_big_green", fx2 + 0.35 * ts, fy2 + ts - ts * 0.1, sc * 0.9);
      drawSprite(ctx, "flask_big_red", fx2 + 0.7 * ts, fy2 + ts - ts * 0.14, sc * 0.8);
      break;
    }
    case "tree": {
      // An old tree, growing up through a crack in the cavern floor.
      ctx.fillStyle = "#4a2e16"; ctx.fillRect(cx - ts * 0.09, cy - ts * 0.2, ts * 0.18, ts * 0.62);
      const sway = Math.sin(now / 1500) * ts * 0.02;
      for (const [dx, dy, r, c] of [[-0.25, -0.35, 0.32, "#2e5a24"], [0.25, -0.38, 0.3, "#346628"], [0, -0.62, 0.36, "#3d7a2e"], [0, -0.3, 0.3, "#2a5020"]] as const) {
        ctx.fillStyle = c; ctx.beginPath(); ctx.arc(cx + dx * ts + sway, cy + dy * ts, r * ts, 0, Math.PI * 2); ctx.fill();
      }
      ctx.fillStyle = "rgba(255,226,140,.8)";
      for (let k = 0; k < 4; k++) { const tw = 0.5 + 0.5 * Math.sin(now / 400 + k * 2); ctx.globalAlpha = tw; ctx.beginPath(); ctx.arc(cx + (hash(k, 3) - 0.5) * ts * 0.7, cy - ts * (0.3 + hash(k, 5) * 0.5), ts * 0.035, 0, Math.PI * 2); ctx.fill(); }
      ctx.globalAlpha = 1;
      break;
    }
    case "weapons": {
      // A rack of weapons.
      ctx.fillStyle = "#4a2e16"; ctx.fillRect(cx - ts * 0.42, cy + ts * 0.05, ts * 0.84, ts * 0.08); ctx.fillRect(cx - ts * 0.42, cy - ts * 0.35, ts * 0.06, ts * 0.75); ctx.fillRect(cx + ts * 0.36, cy - ts * 0.35, ts * 0.06, ts * 0.75);
      const ws = ["weapon_regular_sword", "weapon_axe", "weapon_spear", "weapon_red_magic_staff"];
      ws.forEach((w, k) => drawSprite(ctx, w, cx - ts * 0.27 + k * ts * 0.18, by, sc * 0.75));
      break;
    }
    case "pond": {
      // The Camp's own still pool, two tiles wide, in the corner of the hall.
      drawWater(ctx, sx0 + ts, cy + ts * 0.05, ts * 0.9, ts * 0.38, now);
      break;
    }
    case "drills": {
      // A training dummy: a post, a cross-bar and a sack of straw, with a practice sword stuck in the ground.
      shadow(0.3);
      ctx.fillStyle = "#5a3a1e"; ctx.fillRect(cx - ts * 0.04, cy - ts * 0.3, ts * 0.08, ts * 0.72);
      ctx.fillRect(cx - ts * 0.3, cy - ts * 0.12, ts * 0.6, ts * 0.07);
      ctx.fillStyle = "#c9a560"; ctx.beginPath(); ctx.ellipse(cx, cy + ts * 0.02, ts * 0.17, ts * 0.2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#b08a48"; ctx.beginPath(); ctx.arc(cx, cy - ts * 0.3, ts * 0.12, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#7a2a1a"; ctx.lineWidth = Math.max(1, ts / 24); ctx.beginPath(); ctx.moveTo(cx - ts * 0.08, cy - ts * 0.03); ctx.lineTo(cx + ts * 0.08, cy + ts * 0.08); ctx.moveTo(cx + ts * 0.08, cy - ts * 0.03); ctx.lineTo(cx - ts * 0.08, cy + ts * 0.08); ctx.stroke();
      ctx.fillStyle = "#c8ccd4"; ctx.fillRect(cx + ts * 0.3, cy - ts * 0.05, ts * 0.04, ts * 0.38); ctx.fillStyle = "#6a4424"; ctx.fillRect(cx + ts * 0.25, cy - ts * 0.08, ts * 0.14, ts * 0.04);
      break;
    }
    case "tarot": {
      // A little table with a spread of three cards, the middle one glowing.
      shadow(0.3);
      ctx.fillStyle = "#3a2410"; ctx.fillRect(cx - ts * 0.38, cy + ts * 0.02, ts * 0.76, ts * 0.12); ctx.fillRect(cx - ts * 0.32, cy + ts * 0.14, ts * 0.07, ts * 0.3); ctx.fillRect(cx + ts * 0.25, cy + ts * 0.14, ts * 0.07, ts * 0.3);
      const glow = 0.5 + 0.5 * Math.sin(now / 600);
      for (let k = -1; k <= 1; k++) {
        ctx.save(); if (!k) { ctx.shadowColor = `rgba(190,150,255,${0.8 * glow})`; ctx.shadowBlur = ts * 0.3; }
        ctx.fillStyle = k ? "#2b1d3d" : "#3b2a5a"; ctx.fillRect(cx + k * ts * 0.22 - ts * 0.09, cy - ts * 0.26, ts * 0.18, ts * 0.27);
        ctx.strokeStyle = "#e8c066"; ctx.lineWidth = Math.max(1, ts / 32); ctx.strokeRect(cx + k * ts * 0.22 - ts * 0.09, cy - ts * 0.26, ts * 0.18, ts * 0.27); ctx.restore();
      }
      ctx.fillStyle = `rgba(255,240,190,${0.6 + 0.4 * glow})`; ctx.beginPath(); ctx.arc(cx, cy - ts * 0.13, ts * 0.035, 0, Math.PI * 2); ctx.fill();
      break;
    }
    case "abyss": {
      const pulse = 0.6 + 0.4 * Math.sin(now / 700);
      ctx.save(); ctx.shadowColor = `rgba(200,40,40,${0.6 * pulse})`; ctx.shadowBlur = ts * 0.4;
      drawTile(ctx, "hole", sx0, sy0, ts); ctx.restore();
      break;
    }
  }
  if (s.locked) { ctx.fillStyle = "rgba(8,5,3,.55)"; for (const [lx, ly] of s.tiles) { const [qx, qy] = at(lx, ly, ts, ox, oy); ctx.fillRect(qx, qy, ts, ts); } ctx.font = `${Math.round(ts * 0.4)}px system-ui`; ctx.textAlign = "center"; ctx.fillText("🔒", cx, cy + ts * 0.12); }
}

export function drawCamp() {
  const cv = document.getElementById("campcv") as HTMLCanvasElement | null;
  if (!cv || !hooks) return;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  if (cv.width !== Math.round(cv.clientWidth * dpr) || cv.height !== Math.round(cv.clientHeight * dpr)) { cv.width = Math.round(cv.clientWidth * dpr); cv.height = Math.round(cv.clientHeight * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  // The camera eases after you as you walk.
  {
    const k = glide ? Math.min(1, (performance.now() - glide.t0) / STEP_MS) : 1;
    camX = glide ? glide.fx + (pos[0] - glide.fx) * k : pos[0];
    camY = glide ? glide.fy + (pos[1] - glide.fy) * k : pos[1];
  }
  const { W, H, ts, ox, oy } = layout(cv);
  const now = performance.now();
  ctx.fillStyle = "#0b0806"; ctx.fillRect(0, 0, W, H);
  // Floor and walls (a brick face where the floor runs up to a wall from below; elsewhere the dark top of the wall).
  const x0 = Math.max(0, Math.floor(-ox / ts) - 1), x1 = Math.min(CAMP_W - 1, Math.ceil((W - ox) / ts) + 1);
  const y0 = Math.max(0, Math.floor(-oy / ts) - 1), y1 = Math.min(CAMP_H - 1, Math.ceil((H - oy) / ts) + 1);
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    const sx = ox + x * ts, sy = oy + y * ts;
    if (!isWall(x, y)) { drawTile(ctx, hash(x, y, 7) < 0.6 ? "floor_1" : `floor_${2 + Math.floor(hash(x, y, 8) * 7)}`, sx, sy, ts); continue; }
    if (!isWall(x, y + 1)) drawTile(ctx, "wall_mid", sx, sy, ts);
    else { ctx.fillStyle = "#2b221b"; ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5); ctx.fillStyle = "#9a8670"; const e = Math.max(2, ts / 10);
      if (!isWall(x + 1, y)) ctx.fillRect(sx + ts - e, sy, e, ts); if (!isWall(x - 1, y)) ctx.fillRect(sx, sy, e, ts); if (!isWall(x, y - 1)) ctx.fillRect(sx, sy, ts, e); }
  }
  // A soft gloom toward the edges, firelight in the middle.
  const [fsx, fsy] = at(FIRE[0], FIRE[1], ts, ox, oy);
  // Wall torches: a warm pool of light each.
  for (const [tx, ty] of TORCHES) {
    const [qx, qy] = at(tx, ty, ts, ox, oy);
    const cx = qx + 0.5 * ts, cy = qy + 0.78 * ts, fl = 0.85 + 0.15 * Math.sin(now / 90 + tx + ty);
    if (cx < -3 * ts || cy < -3 * ts || cx > W + 3 * ts || cy > H + 3 * ts) continue;
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 2.4 * fl);
    g.addColorStop(0, "rgba(255,150,60,.3)"); g.addColorStop(1, "rgba(255,110,30,0)"); ctx.fillStyle = g; ctx.fillRect(cx - ts * 2.5, cy - ts * 2.5, ts * 5, ts * 5); ctx.restore();
    ctx.fillStyle = "#2a1a0c"; ctx.fillRect(cx - ts * 0.07, cy - ts * 0.02, ts * 0.14, ts * 0.2);
    ctx.fillStyle = "#ffc850"; ctx.beginPath(); ctx.ellipse(cx, cy - ts * 0.1, ts * 0.08, ts * 0.17 * fl, 0, 0, Math.PI * 2); ctx.fill();
  }
  drawFire(ctx, fsx + ts / 2, fsy + ts / 2, ts, now);
  for (const s of CAMP_SPOTS) { s.locked = hooks.locked(s.id); drawSpot(ctx, s, ts, ox, oy, now); }
  // Where you're headed.
  ctx.fillStyle = "rgba(255,214,120,.75)";
  for (const [x, y] of path) { const [qx, qy] = at(x, y, ts, ox, oy); ctx.beginPath(); ctx.arc(qx + ts / 2, qy + ts / 2, ts * 0.07, 0, Math.PI * 2); ctx.fill(); }
  // You.
  const k = glide ? Math.min(1, (now - glide.t0) / STEP_MS) : 1;
  const hx = glide ? glide.fx + (pos[0] - glide.fx) * k : pos[0], hy = glide ? glide.fy + (pos[1] - glide.fy) * k : pos[1];
  const [hc, hr] = toScreen(hx, hy);
  const pcx = ox + (hc + 0.5) * ts, pcy = oy + (hr + 0.5) * ts;
  ctx.fillStyle = "rgba(10,5,2,.5)"; ctx.beginPath(); ctx.ellipse(pcx, pcy + ts * 0.32, ts * 0.3, ts * 0.09, 0, 0, Math.PI * 2); ctx.fill();
  const sk = CLASS_SPRITE[hooks.origin()];
  if (!sk || !hasSprite(sk) || !drawSprite(ctx, sk, pcx, pcy + ts * 0.42, ts / 16)) { ctx.font = `${Math.round(ts * 0.6)}px system-ui`; ctx.textAlign = "center"; ctx.fillText("🧙", pcx, pcy); }
  // Name ribbons under the spots: gold, with notched tails.
  const fs = Math.max(15, Math.round(ts * 0.34));
  ctx.font = `800 ${fs}px Georgia, "Times New Roman", serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const s of CAMP_SPOTS) {
    const sc2 = s.tiles.map(([a, b]) => toScreen(a, b));
    const cs = sc2.map(t => t[0]), rs = sc2.map(t => t[1]);
    const cx = ox + ((Math.min(...cs) + Math.max(...cs)) / 2 + 0.5) * ts, cy = oy + (Math.max(...rs) + 1.05) * ts;
    // (Enter Dungeon's ribbon is red, with gold letters.)
    const red = s.id === "expedition";
    ribbon(ctx, cx, cy, ctx.measureText(s.name).width + fs * 1.1, fs * 1.45, !!s.locked, red);
    if (red) { ctx.lineWidth = Math.max(2, fs / 7); ctx.strokeStyle = "#3a0604"; ctx.strokeText(s.name, cx, cy + 1); }
    ctx.fillStyle = s.locked ? "#5a4a36" : red ? "#ffd56a" : "#2a1708"; ctx.fillText(s.name, cx, cy + 1);
  }
  if (hint) bubble(ctx, pcx, pcy - ts * 0.95, "Tap a tile to walk there", ts);
}

/** A gold ribbon with notched tails (a dull bronze one for rooms still locked). */
function ribbon(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, locked: boolean, red = false) {
  const x0 = cx - w / 2, x1 = cx + w / 2, t = h * 0.55, y0 = cy - h / 2, y1 = cy + h / 2;
  // Tails, folded behind.
  ctx.fillStyle = locked ? "#4a3c2c" : red ? "#6a1410" : "#8a5a14";
  for (const [a, d] of [[x0, -1], [x1, 1]] as const) {
    ctx.beginPath(); ctx.moveTo(a, y0 + h * 0.18); ctx.lineTo(a + d * t, y0 + h * 0.18); ctx.lineTo(a + d * t * 0.6, cy + h * 0.09); ctx.lineTo(a + d * t, y1 + h * 0.18); ctx.lineTo(a, y1 + h * 0.18); ctx.closePath(); ctx.fill();
  }
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  if (locked) { g.addColorStop(0, "#8a7458"); g.addColorStop(1, "#5e4c38"); }
  else if (red) { g.addColorStop(0, "#e2584a"); g.addColorStop(0.45, "#b8281e"); g.addColorStop(1, "#7a1410"); }
  else { g.addColorStop(0, "#ffe9a6"); g.addColorStop(0.45, "#e2b866"); g.addColorStop(1, "#a8761f"); }
  ctx.fillStyle = g; ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = locked ? "#3a2e22" : red ? "#d8a84a" : "#5a3a0c"; ctx.lineWidth = Math.max(1, h / 14); ctx.strokeRect(x0 + 0.5, y0 + 0.5, w - 1, h - 1);
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x0 + 2, y0 + 2, w - 4, Math.max(1, h * 0.12));
}

/** A cool white speech bubble with its tail pointing down at (x, y). */
function bubble(ctx: CanvasRenderingContext2D, x: number, y: number, text: string, ts: number) {
  const fs = Math.max(15, Math.round(ts * 0.34));
  ctx.save();
  ctx.font = `700 ${fs}px system-ui, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  const w = ctx.measureText(text).width + fs * 1.4, h = fs * 2, bob = Math.sin(performance.now() / 420) * fs * 0.15;
  const bx = Math.max(w / 2 + 4, Math.min(ctx.canvas.width / (window.devicePixelRatio || 1) - w / 2 - 4, x)), by = y - h / 2 + bob, r = h * 0.4;
  ctx.shadowColor = "rgba(140,190,255,.55)"; ctx.shadowBlur = fs * 0.9;
  ctx.fillStyle = "#f2f8ff"; ctx.strokeStyle = "#a9c4e6"; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(bx - w / 2 + r, by - h / 2); ctx.lineTo(bx + w / 2 - r, by - h / 2); ctx.quadraticCurveTo(bx + w / 2, by - h / 2, bx + w / 2, by - h / 2 + r);
  ctx.lineTo(bx + w / 2, by + h / 2 - r); ctx.quadraticCurveTo(bx + w / 2, by + h / 2, bx + w / 2 - r, by + h / 2);
  ctx.lineTo(x + fs * 0.45, by + h / 2); ctx.lineTo(x, by + h / 2 + fs * 0.6); ctx.lineTo(x - fs * 0.15, by + h / 2);
  ctx.lineTo(bx - w / 2 + r, by + h / 2); ctx.quadraticCurveTo(bx - w / 2, by + h / 2, bx - w / 2, by + h / 2 - r);
  ctx.lineTo(bx - w / 2, by - h / 2 + r); ctx.quadraticCurveTo(bx - w / 2, by - h / 2, bx - w / 2 + r, by - h / 2);
  ctx.closePath(); ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();
  ctx.fillStyle = "#1d2c44"; ctx.fillText(text, bx, by + 1);
  ctx.restore();
}

function step() {
  if (!hooks) return;
  const next = path.shift();
  if (!next) {
    timer = undefined;
    if (target) { const t = target; target = null; hooks.open(t); }
    drawCamp();
    return;
  }
  glide = { fx: pos[0], fy: pos[1], t0: performance.now() };
  pos = next;
  hooks.sfx("step");
  if (!raf) raf = requestAnimationFrame(frame);
  timer = window.setTimeout(step, STEP_MS);
}
function frame() {
  drawCamp();
  if (glide && performance.now() - glide.t0 < STEP_MS) raf = requestAnimationFrame(frame);
  else { glide = null; raf = 0; drawCamp(); }
}

/** Walk to a spot and open it (or just walk somewhere). */
function goTo(x: number, y: number) {
  const s = spotAt(x, y);
  let p: [number, number][] | null = null;
  if (s) {
    // The nearest open tile beside it.
    const near = s.tiles.flatMap(([a, b]) => [[a + 1, b], [a - 1, b], [a, b + 1], [a, b - 1]] as [number, number][]).filter(([a, b]) => !blocked(a, b));
    for (const n of near) { const r = route(n[0], n[1]); if (r && (!p || r.length < p.length)) p = r; }
    if (!p) return;
    target = s.id;
  } else {
    if (blocked(x, y)) return;
    p = route(x, y);
    target = null;
    if (!p) return;
  }
  path = p;
  if (!timer) step();
}

let ticking = false;
/** "Tap a tile to walk there": shown on each visit until you first tap. */
let hint = true;
export function mountCampMap(h: CampHooks) {
  hooks = h;
  atlas(() => drawCamp());
  const cv = document.getElementById("campcv") as HTMLCanvasElement | null;
  if (!cv) return;
  drawCamp();
  cv.onclick = ev => {
    hint = false;
    const r = cv.getBoundingClientRect();
    const { ts, ox, oy } = layout(cv);
    const c = Math.floor((ev.clientX - r.left - ox) / ts), rr = Math.floor((ev.clientY - r.top - oy) / ts);
    if (c < 0 || rr < 0 || c >= CAMP_W || rr >= CAMP_H) return;
    goTo(c, rr);
  };
  if (!ticking) {
    ticking = true;
    window.addEventListener("resize", () => drawCamp());
    // The fire flickers and the cauldron bubbles.
    window.setInterval(() => { if (!document.hidden && !glide && document.getElementById("campcv")) drawCamp(); }, 120);
  }
}
/** Back to the middle of the Camp (a fresh visit). */
export function resetCampWalk() { hint = true; pos = [...START]; camX = START[0]; camY = START[1]; path = []; target = null; }
