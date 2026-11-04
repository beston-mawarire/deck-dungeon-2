// The Crawl (prototype): the floor drawn on a canvas, the camera on the player, point-and-click walking.
import { idx, inSight, isFloor, isSeenTile, pathToward, thingAt, type FloorMap } from "../game/grid";
import { gridSelect, gridStep, type Run } from "../game/run";

/** Tiles across the view (odd, so the player sits in the middle). */
export const VIEW = 11;
const STEP_MS = 120;

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
/** The walk in progress, the camera's glide, and the last tiles in sight (for the bright/dim fog). */
let path: [number, number][] = [];
let walking = false;
/** Where the tap asked to go (the walk keeps feeling its way there as new tiles come into view). */
let goal: [number, number] | null = null;
let timer: number | undefined;
let glide: { fx: number; fy: number; tx: number; ty: number; t0: number } | null = null;
let raf = 0;

export const isWalking = () => walking;

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

/** Draw the floor around the player. */
export function drawCrawl() {
  const r = runRef, h = hooks;
  const cv = document.getElementById("crawl") as HTMLCanvasElement | null;
  if (!r || !h || !cv || !r.grid) return;
  const m = r.grid;
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const size = cv.clientWidth;
  if (cv.width !== Math.round(size * dpr)) { cv.width = Math.round(size * dpr); cv.height = Math.round(size * dpr); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const ts = size / VIEW;
  const c = cam(m);
  const ox = size / 2 - (c.x + 0.5) * ts, oy = size / 2 - (c.y + 0.5) * ts;
  ctx.fillStyle = "#07060a";
  ctx.fillRect(0, 0, size, size);
  const lit = new Set(inSight(m));
  const half = Math.ceil(VIEW / 2) + 1;
  const x0 = Math.floor(c.x) - half, x1 = Math.ceil(c.x) + half, y0 = Math.floor(c.y) - half, y1 = Math.ceil(c.y) + half;
  for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
    if (!isSeenTile(m, x, y)) continue;
    const i = idx(m, x, y);
    const sx = ox + x * ts, sy = oy + y * ts;
    const on = lit.has(i);
    if (m.tiles[i] === 1) {
      ctx.fillStyle = on ? ((x + y) % 2 ? "#3a3149" : "#362d44") : "#262031";
      ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
      if (on) { ctx.strokeStyle = "rgba(0,0,0,.25)"; ctx.lineWidth = 1; ctx.strokeRect(sx + 0.5, sy + 0.5, ts - 1, ts - 1); }
    } else {
      ctx.fillStyle = on ? "#5a4b66" : "#352d3f";
      ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
      ctx.fillStyle = on ? "#6e5d7c" : "#3e3449";
      ctx.fillRect(sx, sy, ts + 0.5, ts * 0.28);
    }
  }
  // The planned walk.
  ctx.fillStyle = "rgba(232,184,74,.55)";
  for (const [x, y] of path) { ctx.beginPath(); ctx.arc(ox + (x + 0.5) * ts, oy + (y + 0.5) * ts, ts * 0.09, 0, Math.PI * 2); ctx.fill(); }
  // Foes, chests, services and landmarks you've seen.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  m.things.forEach((t, k) => {
    if (t.done || !isSeenTile(m, t.x, t.y)) return;
    const cx = ox + (t.x + 0.5) * ts, cy = oy + (t.y + 0.5) * ts;
    if (cx < -ts || cy < -ts || cx > size + ts || cy > size + ts) return;
    const on = lit.has(idx(m, t.x, t.y));
    if (t.room === "boss") { ctx.fillStyle = "rgba(226,85,106,.28)"; ctx.beginPath(); ctx.arc(cx, cy, ts * 0.48, 0, Math.PI * 2); ctx.fill(); }
    if (m.sel === k) { ctx.strokeStyle = "#e8b84a"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(cx, cy, ts * 0.46, 0, Math.PI * 2); ctx.stroke(); }
    ctx.globalAlpha = on ? 1 : 0.55;
    ctx.font = `${Math.round(ts * 0.62)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.fillText(h.icon(t.room), cx, cy + ts * 0.04);
    ctx.globalAlpha = 1;
  });
  // You, in the middle.
  const pxc = size / 2, pyc = size / 2;
  ctx.fillStyle = "rgba(95,208,138,.22)";
  ctx.beginPath(); ctx.arc(pxc, pyc, ts * 0.47, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = "#5fd08a"; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(pxc, pyc, ts * 0.47, 0, Math.PI * 2); ctx.stroke();
  ctx.font = `${Math.round(ts * 0.6)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
  ctx.fillText(h.hero(), pxc, pyc + ts * 0.04);
  // A soft edge to the view.
  const g = ctx.createRadialGradient(size / 2, size / 2, size * 0.3, size / 2, size / 2, size * 0.72);
  g.addColorStop(0, "rgba(7,6,10,0)");
  g.addColorStop(1, "rgba(7,6,10,.75)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
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
  const step = path.shift();
  if (!step) { stopWalk(); h.render(); return; }
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

/** Walk to a tile you've seen. */
export function walkTo(x: number, y: number) {
  const r = runRef, h = hooks;
  if (!r || !h || !r.grid) return;
  const p = pathToward(r.grid, x, y);
  if (!p) return;
  if (!p.length) return;
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
    const rect = cv.getBoundingClientRect();
    const ts = rect.width / VIEW;
    const x = Math.round(m.px + (ev.clientX - rect.left - rect.width / 2) / ts);
    const y = Math.round(m.py + (ev.clientY - rect.top - rect.height / 2) / ts);
    const t = thingAt(m, x, y);
    if (t >= 0 && isSeenTile(m, x, y)) {
      // First tap on something shows what it is; a second tap walks there.
      if (m.sel !== t) { stopWalk(); gridSelect(r, t); h.render(); return; }
      walkToThing(t);
      return;
    }
    if (m.sel !== undefined) { m.sel = undefined; }
    walkTo(x, y);
    if (!walking) h.render();
  };
}

let keysOn = false;
/** Arrow keys and WASD take single steps. */
export function crawlKeys() {
  if (keysOn) return;
  keysOn = true;
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
