// The Camp as a place you walk around: a cavern courtyard drawn from the tileset, with each of the Camp's options
// as a spot you walk up to (the Hall's door, the Garden's plots, the Brewery's cauldron, the way down…).
import { atlas, CLASS_SPRITE, drawSprite, drawTile, hasSprite } from "./sprites";

export const CAMP_W = 9, CAMP_H = 15;
export interface CampSpot { id: string; name: string; tiles: [number, number][]; locked?: boolean }
/** Where everything stands (x, y). */
export const CAMP_SPOTS: CampSpot[] = [
  { id: "quests", name: "Quest Board", tiles: [[1, 1]] },
  { id: "expedition", name: "The Way Down", tiles: [[4, 1]] },
  { id: "hall", name: "Hall", tiles: [[7, 1]] },
  { id: "skills", name: "Skills", tiles: [[1, 4]] },
  { id: "knowledge", name: "Knowledge", tiles: [[7, 4]] },
  { id: "garden", name: "Garden", tiles: [[1, 8], [2, 8]] },
  { id: "brewery", name: "Brewery", tiles: [[6, 8], [7, 8]] },
  { id: "tree", name: "Passive Tree", tiles: [[1, 11]] },
  { id: "weapons", name: "Weapon Mastery", tiles: [[7, 11]] },
  { id: "abyss", name: "The Abyss", tiles: [[4, 13]] }
];
/** The campfire in the middle (in the way, but not a spot). */
const FIRE: [number, number] = [4, 6];
const START: [number, number] = [4, 9];

export interface CampHooks { open: (id: string) => void; origin: () => string; locked: (id: string) => boolean; sfx: (k: string) => void }
let hooks: CampHooks | null = null;
let pos: [number, number] = [...START];
let path: [number, number][] = [];
let target: string | null = null;
let glide: { fx: number; fy: number; t0: number } | null = null;
let timer: number | undefined;
let raf = 0;
const STEP_MS = 120;

const isWall = (x: number, y: number) => x <= 0 || y <= 0 || x >= CAMP_W - 1 || y >= CAMP_H - 1;
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

/** On a wide screen the Camp is laid on its side (the far wall runs down the left), so it fills the screen. */
let wide = false;
const COLS = () => (wide ? CAMP_H : CAMP_W), ROWS = () => (wide ? CAMP_W : CAMP_H);
/** A Camp tile (x, y) to its column and row on screen, and back. */
const toScreen = (x: number, y: number): [number, number] => (wide ? [y, x] : [x, y]);
const fromScreen = (c: number, r: number): [number, number] => (wide ? [r, c] : [c, r]);
function layout(cv: HTMLCanvasElement) {
  const W = cv.clientWidth, H = cv.clientHeight;
  wide = W > H * 1.05;
  const ts = Math.floor(Math.min(W / COLS(), H / ROWS()));
  return { W, H, ts, ox: Math.floor((W - ts * COLS()) / 2), oy: Math.floor((H - ts * ROWS()) / 2) };
}
/** Where a Camp tile's top-left corner is drawn. */
const at = (x: number, y: number, ts: number, ox: number, oy: number): [number, number] => { const [c, r] = toScreen(x, y); return [ox + c * ts, oy + r * ts]; };

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
    case "hall": drawSprite(ctx, "doors_leaf_closed", cx, by + ts * 0.06, ts / 32); break;
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
  const { W, H, ts, ox, oy } = layout(cv);
  const now = performance.now();
  ctx.fillStyle = "#0b0806"; ctx.fillRect(0, 0, W, H);
  // Floor and walls, cell by cell on screen (the brick face is the wall along the top of the screen).
  const wallAt = (c: number, r: number) => c < 0 || r < 0 || c >= COLS() || r >= ROWS() || isWall(...fromScreen(c, r));
  for (let r = 0; r < ROWS(); r++) for (let c = 0; c < COLS(); c++) {
    const sx = ox + c * ts, sy = oy + r * ts;
    if (!wallAt(c, r)) { drawTile(ctx, hash(c, r, 7) < 0.6 ? "floor_1" : `floor_${2 + Math.floor(hash(c, r, 8) * 7)}`, sx, sy, ts); continue; }
    if (!wallAt(c, r + 1)) drawTile(ctx, "wall_mid", sx, sy, ts);
    else { ctx.fillStyle = "#2b221b"; ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5); ctx.fillStyle = "#9a8670"; const e = Math.max(2, ts / 10);
      if (!wallAt(c + 1, r)) ctx.fillRect(sx + ts - e, sy, e, ts); if (!wallAt(c - 1, r)) ctx.fillRect(sx, sy, e, ts); if (!wallAt(c, r - 1)) ctx.fillRect(sx, sy, ts, e); }
  }
  // A soft gloom toward the edges, firelight in the middle.
  const [fsx, fsy] = at(FIRE[0], FIRE[1], ts, ox, oy);
  const vg = ctx.createRadialGradient(fsx + ts / 2, fsy + ts / 2, ts * 2, fsx + ts / 2, fsy + ts / 2, ts * 9);
  vg.addColorStop(0, "rgba(10,6,3,0)"); vg.addColorStop(1, "rgba(10,6,3,.62)");
  ctx.fillStyle = vg; ctx.fillRect(ox, oy, ts * COLS(), ts * ROWS());
  // Wall torches, on the brick face along the top.
  for (const tx of wide ? [3, 7, 11] : [2, 6]) {
    const cx = ox + (tx + 0.5) * ts, cy = oy + 0.78 * ts, fl = 0.85 + 0.15 * Math.sin(now / 90 + tx);
    ctx.save(); ctx.globalCompositeOperation = "lighter"; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 2.2 * fl);
    g.addColorStop(0, "rgba(255,150,60,.3)"); g.addColorStop(1, "rgba(255,110,30,0)"); ctx.fillStyle = g; ctx.fillRect(cx - ts * 2.5, cy - ts * 2.5, ts * 5, ts * 5); ctx.restore();
    ctx.fillStyle = "#ffc850"; ctx.beginPath(); ctx.ellipse(cx, cy - ts * 0.08, ts * 0.08, ts * 0.17 * fl, 0, 0, Math.PI * 2); ctx.fill();
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
  // Name plates under the spots.
  ctx.font = `700 ${Math.max(10, Math.round(ts * 0.2))}px system-ui, sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const s of CAMP_SPOTS) {
    const sc2 = s.tiles.map(([a, b]) => toScreen(a, b));
    const cs = sc2.map(t => t[0]), rs = sc2.map(t => t[1]);
    const cx = ox + ((Math.min(...cs) + Math.max(...cs)) / 2 + 0.5) * ts, cy = oy + (Math.max(...rs) + 1.02) * ts;
    const tw = ctx.measureText(s.name).width + 10;
    ctx.fillStyle = "rgba(18,11,6,.82)"; ctx.fillRect(cx - tw / 2, cy - ts * 0.13, tw, ts * 0.26);
    ctx.strokeStyle = "#6b4c2c"; ctx.lineWidth = 1; ctx.strokeRect(cx - tw / 2 + 0.5, cy - ts * 0.13 + 0.5, tw - 1, ts * 0.26 - 1);
    ctx.fillStyle = s.locked ? "#8a7458" : "#f0dcb4"; ctx.fillText(s.name, cx, cy + 1);
  }
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
export function mountCampMap(h: CampHooks) {
  hooks = h;
  atlas(() => drawCamp());
  const cv = document.getElementById("campcv") as HTMLCanvasElement | null;
  if (!cv) return;
  drawCamp();
  cv.onclick = ev => {
    const r = cv.getBoundingClientRect();
    const { ts, ox, oy } = layout(cv);
    const c = Math.floor((ev.clientX - r.left - ox) / ts), rr = Math.floor((ev.clientY - r.top - oy) / ts);
    if (c < 0 || rr < 0 || c >= COLS() || rr >= ROWS()) return;
    goTo(...fromScreen(c, rr));
  };
  if (!ticking) {
    ticking = true;
    window.addEventListener("resize", () => drawCamp());
    // The fire flickers and the cauldron bubbles.
    window.setInterval(() => { if (!document.hidden && !glide && document.getElementById("campcv")) drawCamp(); }, 120);
  }
}
/** Back to the middle of the Camp (a fresh visit). */
export function resetCampWalk() { pos = [...START]; path = []; target = null; }
