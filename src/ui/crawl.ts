// The Crawl (prototype): the floor drawn full-screen on a canvas, the camera on the player, point-and-click walking.
import { idx, inSight, isFloor, isSeenTile, pathToward, SIGHT, thingAt, type FloorMap } from "../game/grid";
import { gridSelect, gridStep, type Run } from "../game/run";

const STEP_MS = 130;

export interface CrawlHooks {
  /** Redraw the whole screen (after a room opens, a walk ends, or something comes into view). */
  render: () => void;
  say: (text: string, bad?: boolean) => void;
  /** The icon a thing shows on the map. */
  icon: (room: string) => string;
  /** The player's marker. */
  hero: () => string;
  sfx: (name: string) => void;
}

let hooks: CrawlHooks | null = null;
let runRef: Run | null = null;
let path: [number, number][] = [];
let walking = false;
/** Where the tap asked to go (the walk keeps feeling its way there as new tiles come into view). */
let goal: [number, number] | null = null;
let timer: number | undefined;
let glide: { fx: number; fy: number; tx: number; ty: number; t0: number } | null = null;
let raf = 0;

/** Tile size on screen: close in, about eight tiles across the narrow side. */
const tileSize = (w: number, h: number) => Math.max(40, Math.min(64, Math.min(w, h) / 8));

/** Stop walking (a new screen, a popup, the menu). */
export function stopWalk() {
  walking = false;
  path = [];
  goal = null;
  if (timer) clearTimeout(timer);
  timer = undefined;
}

function cam(m: FloorMap): { x: number; y: number } {
  if (!glide) return { x: m.px, y: m.py };
  const k = Math.min(1, (performance.now() - glide.t0) / STEP_MS);
  const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
  return { x: glide.fx + (glide.tx - glide.fx) * e, y: glide.fy + (glide.ty - glide.fy) * e };
}

/** A steady per-tile random number (so the grit doesn't shimmer). */
const hash = (x: number, y: number, k = 0) => { let n = (x * 374761393 + y * 668265263 + k * 2246822519) | 0; n = (n ^ (n >>> 13)) * 1274126177; return ((n ^ (n >>> 16)) >>> 0) / 4294967296; };

const FLOOR = "#836540", FLOOR_DARK = "#735834", GROUT = "rgba(60,40,20,.35)";
const WALL = "#c4a273", WALL_TOP = "#d6b788", MORTAR = "#6b4c2c", OUTLINE = "#2c1c0e";

function drawFloor(ctx: CanvasRenderingContext2D, x: number, y: number, sx: number, sy: number, ts: number) {
  ctx.fillStyle = hash(x, y) < 0.5 ? FLOOR : FLOOR_DARK;
  ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
  // Flagstone seams and grit.
  ctx.strokeStyle = GROUT; ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, sy + 0.5, ts - 1, ts - 1);
  if (hash(x, y, 1) < 0.5) { ctx.beginPath(); ctx.moveTo(sx + ts * 0.5, sy); ctx.lineTo(sx + ts * 0.5, sy + ts); ctx.stroke(); }
  for (let k = 0; k < 5; k++) {
    const gx = sx + hash(x, y, k + 2) * ts, gy = sy + hash(x, y, k + 9) * ts;
    ctx.fillStyle = k % 2 ? "rgba(40,25,10,.28)" : "rgba(255,235,200,.12)";
    ctx.fillRect(gx, gy, 2, 2);
  }
}

function drawWall(ctx: CanvasRenderingContext2D, m: FloorMap, x: number, y: number, sx: number, sy: number, ts: number) {
  ctx.fillStyle = WALL;
  ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
  // Bricks: three courses, staggered.
  const rows = 3, bh = ts / rows;
  ctx.strokeStyle = MORTAR; ctx.lineWidth = Math.max(1, ts / 26);
  for (let r = 0; r < rows; r++) {
    const yy = sy + r * bh;
    ctx.beginPath(); ctx.moveTo(sx, yy); ctx.lineTo(sx + ts, yy); ctx.stroke();
    const off = (r + y) % 2 ? ts / 2 : 0;
    for (let bx = off; bx < ts; bx += ts / 2) { if (bx <= 0) continue; ctx.beginPath(); ctx.moveTo(sx + bx, yy); ctx.lineTo(sx + bx, yy + bh); ctx.stroke(); }
    // A little wear on the odd brick.
    if (hash(x, y, r) < 0.3) { ctx.fillStyle = "rgba(90,60,30,.18)"; ctx.fillRect(sx + hash(x, y, r + 5) * ts * 0.6, yy + 2, ts * 0.35, bh - 4); }
  }
  // Wall faces that meet the floor get a lit top edge and a dark outline.
  const floorAt = (dx: number, dy: number) => isFloor(m, x + dx, y + dy) && isSeenTile(m, x + dx, y + dy);
  ctx.fillStyle = WALL_TOP;
  if (floorAt(0, 1)) ctx.fillRect(sx, sy + ts - ts * 0.12, ts + 0.5, ts * 0.12);
  ctx.strokeStyle = OUTLINE; ctx.lineWidth = Math.max(2, ts / 16);
  ctx.beginPath();
  if (floorAt(0, -1)) { ctx.moveTo(sx, sy); ctx.lineTo(sx + ts, sy); }
  if (floorAt(0, 1)) { ctx.moveTo(sx, sy + ts); ctx.lineTo(sx + ts, sy + ts); }
  if (floorAt(-1, 0)) { ctx.moveTo(sx, sy); ctx.lineTo(sx, sy + ts); }
  if (floorAt(1, 0)) { ctx.moveTo(sx + ts, sy); ctx.lineTo(sx + ts, sy + ts); }
  ctx.stroke();
}

/** The trapdoor: a black square hole with a thin, softly glowing yellow rim, so it stands out. */
function drawTrapdoor(ctx: CanvasRenderingContext2D, cx: number, cy: number, ts: number) {
  const s = ts * 0.74, x = cx - s / 2, y = cy - s / 2;
  const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 600);
  ctx.save();
  ctx.shadowColor = `rgba(255,214,70,${0.55 * pulse})`;
  ctx.shadowBlur = ts * 0.22;
  ctx.fillStyle = "#000";
  ctx.fillRect(x, y, s, s);
  ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = Math.max(2, ts / 22);
  ctx.strokeRect(x, y, s, s);
  ctx.restore();
  // A little depth inside the hole.
  const g = ctx.createLinearGradient(x, y, x, y + s);
  g.addColorStop(0, "rgba(60,40,10,.35)"); g.addColorStop(0.35, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(x + 2, y + 2, s - 4, s - 4);
}

/** Draw the floor around the player. */
export function drawCrawl() {
  const r = runRef, h = hooks;
  const cv = document.getElementById("crawl") as HTMLCanvasElement | null;
  if (!r || !h || !cv || !r.grid) return;
  const m = r.grid;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const W = cv.clientWidth, H = cv.clientHeight;
  if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ts = tileSize(W, H);
  const c = cam(m);
  const ox = W / 2 - (c.x + 0.5) * ts, oy = H / 2 - (c.y + 0.5) * ts;
  ctx.fillStyle = "#0b0806";
  ctx.fillRect(0, 0, W, H);
  const lit = new Set(inSight(m));
  const hx = Math.ceil(W / ts / 2) + 1, hy = Math.ceil(H / ts / 2) + 1;
  for (let y = Math.floor(c.y) - hy; y <= Math.ceil(c.y) + hy; y++) for (let x = Math.floor(c.x) - hx; x <= Math.ceil(c.x) + hx; x++) {
    if (!isSeenTile(m, x, y)) continue;
    const i = idx(m, x, y);
    const sx = ox + x * ts, sy = oy + y * ts;
    if (m.tiles[i] === 1) drawFloor(ctx, x, y, sx, sy, ts); else drawWall(ctx, m, x, y, sx, sy, ts);
    // Torchlight: what's in sight is lit, brighter close by; what you only remember sits in the gloom.
    const d = Math.hypot(x - m.px, y - m.py);
    ctx.fillStyle = lit.has(i) ? `rgba(12,7,3,${Math.min(0.45, (d / (SIGHT + 1)) * 0.45)})` : "rgba(12,7,3,.68)";
    ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
  }
  // Little torches on the walls: a warm pool of light, and a flickering flame.
  const now = performance.now();
  for (const ti of m.torches ?? []) {
    const tx = ti % m.w, ty = Math.floor(ti / m.w);
    if (!isSeenTile(m, tx, ty)) continue;
    const cx = ox + (tx + 0.5) * ts, cy = oy + (ty + 0.78) * ts;
    if (cx < -3 * ts || cy < -3 * ts || cx > W + 3 * ts || cy > H + 3 * ts) continue;
    const fl = 0.85 + 0.15 * Math.sin(now / 90 + ti) * Math.sin(now / 37 + ti * 3);
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 2.6 * fl);
    g.addColorStop(0, "rgba(255,150,60,.30)"); g.addColorStop(0.5, "rgba(255,110,30,.10)"); g.addColorStop(1, "rgba(255,110,30,0)");
    ctx.fillStyle = g;
    ctx.fillRect(cx - ts * 3, cy - ts * 3, ts * 6, ts * 6);
    ctx.restore();
    // The sconce and its flame.
    ctx.fillStyle = "#2a1a0c";
    ctx.fillRect(cx - ts * 0.07, cy - ts * 0.02, ts * 0.14, ts * 0.2);
    const fh = ts * 0.28 * fl;
    const fg = ctx.createRadialGradient(cx, cy - fh * 0.3, 0, cx, cy - fh * 0.3, fh);
    fg.addColorStop(0, "#fff4c0"); fg.addColorStop(0.35, "#ffc850"); fg.addColorStop(0.7, "#ff7a20"); fg.addColorStop(1, "rgba(255,80,10,0)");
    ctx.fillStyle = fg;
    ctx.beginPath(); ctx.ellipse(cx, cy - fh * 0.35, ts * 0.09, fh * 0.75, 0, 0, Math.PI * 2); ctx.fill();
  }
  // The planned walk.
  ctx.fillStyle = "rgba(255,214,120,.75)";
  for (const [x, y] of path) { ctx.beginPath(); ctx.arc(ox + (x + 0.5) * ts, oy + (y + 0.5) * ts, ts * 0.08, 0, Math.PI * 2); ctx.fill(); }
  // Foes, chests, services, landmarks and the trapdoor you've seen.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const emoji = (px: number) => `${Math.round(px)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;
  m.things.forEach((t, k) => {
    if (t.done || !isSeenTile(m, t.x, t.y)) return;
    const cx = ox + (t.x + 0.5) * ts, cy = oy + (t.y + 0.5) * ts;
    if (cx < -ts || cy < -ts || cx > W + ts || cy > H + ts) return;
    const on = lit.has(idx(m, t.x, t.y));
    ctx.globalAlpha = on ? 1 : 0.6;
    ctx.fillStyle = "rgba(20,10,4,.45)";
    ctx.beginPath(); ctx.ellipse(cx, cy + ts * 0.3, ts * 0.32, ts * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    if (t.room === "trapdoor") drawTrapdoor(ctx, cx, cy, ts);
    // (Emoji take the fill's opacity: draw them with a solid fill.)
    else { ctx.fillStyle = "#fff"; ctx.font = emoji(ts * 0.62); ctx.fillText(h.icon(t.room), cx, cy + ts * 0.02); }
    if (m.sel === k) { ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, ts * 0.47, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = 1;
  });
  // You, in the middle.
  const pxc = W / 2, pyc = H / 2;
  ctx.fillStyle = "rgba(20,10,4,.5)";
  ctx.beginPath(); ctx.ellipse(pxc, pyc + ts * 0.32, ts * 0.32, ts * 0.1, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "rgba(255,210,58,.16)";
  ctx.beginPath(); ctx.arc(pxc, pyc, ts * 0.45, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "rgba(0,0,0,.55)"; ctx.lineWidth = 6.5;
  ctx.beginPath(); ctx.arc(pxc, pyc, ts * 0.45, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = "#ffd23a"; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(pxc, pyc, ts * 0.45, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#fff";
  ctx.globalAlpha = 1;
  ctx.font = emoji(ts * 0.6);
  ctx.fillText(h.hero(), pxc, pyc + ts * 0.02);
}

function frame() {
  drawCrawl();
  if (glide && performance.now() - glide.t0 < STEP_MS) raf = requestAnimationFrame(frame);
  else { glide = null; raf = 0; drawCrawl(); }
}

function nextStep() {
  const r = runRef, h = hooks;
  if (!r || !h || !r.grid || !walking) return;
  const m = r.grid;
  const step = path[0];
  if (!step) { stopWalk(); h.render(); return; }
  // Something stands in the way: stop in front of it, and show it.
  const blocker = thingAt(m, step[0], step[1]);
  if (blocker >= 0 && path.length > 1) { stopWalk(); gridSelect(r, blocker); h.render(); return; }
  path.shift();
  const fx = m.px, fy = m.py;
  const res = gridStep(r, step[0], step[1]);
  if (!res.ok) { stopWalk(); if (res.why) h.say(res.why, true); h.render(); return; }
  if (res.entered) {
    stopWalk();
    const room = r.grid?.things.find(t => t.x === step[0] && t.y === step[1])?.room;
    if (room === "wooden" || room === "iron") h.sfx("chest");
    h.render();
    return;
  }
  glide = { fx, fy, tx: m.px, ty: m.py, t0: performance.now() };
  if (!raf) raf = requestAnimationFrame(frame);
  // Something new came into view: stop and take a look (unless it's where you were going anyway).
  const end = path[path.length - 1] ?? goal;
  const surprise = res.seen.some(t => !end || m.things[t].x !== end[0] || m.things[t].y !== end[1]);
  // Out of known floor but not there yet: feel the way on toward the tap.
  if (!surprise && !path.length && goal && (m.px !== goal[0] || m.py !== goal[1])) {
    const before = Math.hypot(m.px - goal[0], m.py - goal[1]);
    const more = pathToward(m, goal[0], goal[1]);
    if (more && more.length) { const last = more[more.length - 1]; if (Math.hypot(last[0] - goal[0], last[1] - goal[1]) < before) path = more; }
  }
  if (surprise || !path.length) { walking = false; path = []; goal = null; timer = window.setTimeout(() => h.render(), STEP_MS); return; }
  timer = window.setTimeout(nextStep, STEP_MS);
}

/** Walk to a tile (around things if there's a way, otherwise up to whatever's in the way). */
export function walkTo(x: number, y: number) {
  const r = runRef, h = hooks;
  if (!r || !h || !r.grid) return;
  const p = pathToward(r.grid, x, y);
  if (!p || !p.length) return;
  path = p;
  goal = [x, y];
  if (!walking) { walking = true; nextStep(); }
}

/** Walk to (and into) a thing on the map. */
export function walkToThing(t: number) {
  const m = runRef?.grid;
  if (!m || !m.things[t]) return;
  walkTo(m.things[t].x, m.things[t].y);
}

/** Hook the canvas up after each render. */
export function mountCrawl(r: Run, h: CrawlHooks) {
  runRef = r;
  hooks = h;
  const cv = document.getElementById("crawl") as HTMLCanvasElement | null;
  if (!cv || !r.grid) { stopWalk(); return; }
  drawCrawl();
  cv.onclick = ev => {
    const m = r.grid;
    if (!m || r.scene.t !== "map") return;
    // Tapping the floor clears any note on screen.
    if (r.message || document.querySelector(".cz-toasts")) { r.message = ""; h.say(""); h.render(); }
    const rect = cv.getBoundingClientRect();
    const ts = tileSize(rect.width, rect.height);
    const x = Math.round(m.px + (ev.clientX - rect.left - rect.width / 2) / ts);
    const y = Math.round(m.py + (ev.clientY - rect.top - rect.height / 2) / ts);
    const t = thingAt(m, x, y);
    if (t >= 0 && isSeenTile(m, x, y)) {
      // First tap on something shows what it is; a second tap walks there.
      if (m.sel !== t) { stopWalk(); gridSelect(r, t); h.render(); return; }
      walkToThing(t);
      return;
    }
    const had = m.sel !== undefined;
    m.sel = undefined;
    walkTo(x, y);
    if (!walking && had) h.render();
  };
}

let keysOn = false;
/** Arrow keys and WASD take single steps. */
export function crawlKeys() {
  if (keysOn) return;
  keysOn = true;
  window.addEventListener("resize", () => drawCrawl());
  // A slow redraw keeps the trapdoor's glow breathing and the torches flickering (it does nothing when the map isn't showing).
  window.setInterval(() => { const m = runRef?.grid; if (!glide && m && document.getElementById("crawl") && (m.things.some(t => t.room === "trapdoor" && !t.done && isSeenTile(m, t.x, t.y)) || (m.torches ?? []).some(i => m.seen[i]))) drawCrawl(); }, 120);
  window.addEventListener("keydown", ev => {
    const r = runRef, h = hooks;
    if (!r || !h || !r.grid || r.scene.t !== "map" || !document.getElementById("crawl")) return;
    if ((ev.target as HTMLElement)?.tagName === "INPUT") return;
    const d: Record<string, [number, number]> = { ArrowUp: [0, -1], ArrowDown: [0, 1], ArrowLeft: [-1, 0], ArrowRight: [1, 0], w: [0, -1], s: [0, 1], a: [-1, 0], d: [1, 0] };
    const v = d[ev.key];
    if (!v) return;
    ev.preventDefault();
    if (walking || !isFloor(r.grid, r.grid.px + v[0], r.grid.py + v[1])) return;
    r.grid.sel = undefined;
    path = [[r.grid.px + v[0], r.grid.py + v[1]]];
    walking = true;
    nextStep();
  });
}
