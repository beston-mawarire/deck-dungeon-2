// The Crawl (prototype): the floor drawn full-screen on a canvas, the camera on the player, point-and-click walking.
import { idx, inSight, isFloor, isSeenTile, LAYER_FLOORS, layerOf, pathToward, SIGHT, thingAt, type FloorMap } from "../game/grid";
import { gridSelect, gridStep, type Run } from "../game/run";
import { atlas, CLASS_SPRITE, drawSprite, drawTile, drawWater, foeSprite, hasSprite, spriteSize, THING_SPRITE } from "./sprites";

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
  /** You took damage on the floor (the HP bar needs to catch up). */
  hurt?: () => void;
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
/** The cached stone layer, and what it was drawn for. */
let layer: HTMLCanvasElement | null = null;
let layerKey = "";
/** Damage numbers rising off you (spikes, lava, sludge). */
let floats: { text: string; color: string; t0: number }[] = [];
/** Each layer's look: the same stone, washed a different colour (none for the first). */
const LAYER_TINT: (string | null)[] = [null, "rgba(70,110,50,.42)", "rgba(190,50,25,.55)", "rgba(60,95,135,.45)", "rgba(100,60,140,.45)"];

/** Tile size on screen: close in, about eight tiles across the narrow side. */
const tileSize = (w: number, h: number) => Math.max(40, Math.min(92, Math.min(w, h) / (Math.min(w, h) > 700 ? 10 : 8)));

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
  // The tileset's flagstones, mostly plain, now and then cracked or mossy.
  const v = hash(x, y, 7);
  if (drawTile(ctx, v < 0.62 ? "floor_1" : `floor_${2 + Math.floor(hash(x, y, 8) * 7)}`, sx, sy, ts)) return;
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
  // The tileset's walls: a brick face where the floor runs up to it from below; elsewhere the dark top of the wall.
  if (atlas()) {
    const floorAt = (dx: number, dy: number) => isFloor(m, x + dx, y + dy);
    if (floorAt(0, 1)) { drawTile(ctx, hash(x, y, 3) < 0.08 ? "wall_hole_1" : "wall_mid", sx, sy, ts); }
    else {
      // The top of the wall: dark stone with a pale rim where it meets the floor, so the edge reads clearly.
      ctx.fillStyle = "#2b221b";
      ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
      ctx.fillStyle = "rgba(255,240,210,.05)";
      if (hash(x, y, 4) < 0.5) ctx.fillRect(sx + ts * 0.1, sy + ts * 0.15, ts * 0.5, ts * 0.06);
      // A rim of stone where it meets the floor on a side or above.
      ctx.fillStyle = "#9a8670";
      const e = Math.max(2, ts / 10);
      if (floorAt(-1, 0)) ctx.fillRect(sx, sy, e, ts + 0.5);
      if (floorAt(1, 0)) ctx.fillRect(sx + ts - e, sy, e, ts + 0.5);
      if (floorAt(0, -1)) ctx.fillRect(sx, sy, ts + 0.5, e);
      if (floorAt(0, 2) || floorAt(0, 1)) { /* covered above */ }
    }
    return;
  }
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
function drawTrapdoor(ctx: CanvasRenderingContext2D, cx: number, cy: number, ts: number, boss = false) {
  const sz = ts * 0.86, x = cx - sz / 2, y = cy - sz / 2;
  const pulse = 0.65 + 0.35 * Math.sin(performance.now() / 600);
  // Stairs going down, with the same warm (or, for the guardian's, red) glow rising out of them.
  ctx.save();
  ctx.shadowColor = boss ? `rgba(255,50,40,${0.75 * pulse})` : `rgba(255,214,70,${0.6 * pulse})`;
  ctx.shadowBlur = ts * 0.3;
  ctx.fillStyle = "#070504"; ctx.fillRect(x, y, sz, sz);
  ctx.restore();
  if (!drawTile(ctx, "floor_stairs", x, y, sz)) { ctx.fillStyle = "#000"; ctx.fillRect(x, y, sz, sz); }
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const g = ctx.createRadialGradient(cx, cy + sz * 0.2, 0, cx, cy, sz * 0.7);
  g.addColorStop(0, boss ? `rgba(255,60,40,${0.35 * pulse})` : `rgba(255,200,80,${0.3 * pulse})`); g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g; ctx.fillRect(x, y, sz, sz);
  ctx.restore();
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
  const lit = new Set(inSight(m));
  // The stone (floors, walls and the fog over them) only changes when you move or see more, so it's drawn once into
  // a screen-sized layer and reused for the frames in between (the torches and the trapdoor flicker on top of it).
  const seenCount = m.seen.reduce((a, b) => a + b, 0);
  const key = glide ? "" : `${m.floor}:${m.depth}:${m.px},${m.py}:${seenCount}:${W}x${H}:${dpr}`;
  if (key && key === layerKey && layer) ctx.drawImage(layer, 0, 0, W, H);
  else {
    const target = key ? (layer ??= document.createElement("canvas")) : null;
    let lc = ctx;
    if (target) {
      target.width = Math.round(W * dpr); target.height = Math.round(H * dpr);
      lc = target.getContext("2d")!;
      lc.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    lc.fillStyle = "#0b0806";
    lc.fillRect(0, 0, W, H);
    const hx = Math.ceil(W / ts / 2) + 1, hy = Math.ceil(H / ts / 2) + 1;
    const each = (fn: (x: number, y: number, i: number, sx: number, sy: number) => void) => {
      for (let y = Math.floor(c.y) - hy; y <= Math.ceil(c.y) + hy; y++) for (let x = Math.floor(c.x) - hx; x <= Math.ceil(c.x) + hx; x++) {
        if (!isSeenTile(m, x, y)) continue;
        fn(x, y, idx(m, x, y), ox + x * ts, oy + y * ts);
      }
    };
    each((x, y, i, sx, sy) => { if (m.tiles[i] === 1) drawFloor(lc, x, y, sx, sy, ts); else drawWall(lc, m, x, y, sx, sy, ts); if (m.haz?.[i] === "spike") drawTile(lc, "floor_spikes", sx, sy, ts); });
    // Each layer has its own colour of stone.
    const tint = r.mode === "abyss" ? LAYER_TINT[4] : LAYER_TINT[layerOf(m.floor)];
    if (tint) { lc.save(); lc.globalCompositeOperation = "color"; lc.fillStyle = tint; lc.fillRect(0, 0, W, H); lc.restore(); }
    // Torchlight: what's in sight is lit, brighter close by; what you only remember sits in the gloom.
    each((x, y, i, sx, sy) => { lc.fillStyle = gloom(m, lit, x, y); lc.fillRect(sx, sy, ts + 0.5, ts + 0.5); });
    if (target) { layerKey = key; ctx.drawImage(target, 0, 0, W, H); }
    else layerKey = "";
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
  // Pools of lava and sludge, bubbling.
  if (m.haz) for (const k of Object.keys(m.haz)) {
    const i = +k, kind = m.haz[i], x = i % m.w, y = Math.floor(i / m.w);
    if (kind === "spike" || !isSeenTile(m, x, y)) continue;
    const sx = ox + x * ts, sy = oy + y * ts;
    if (sx < -ts || sy < -ts || sx > W || sy > H) continue;
    drawPool(ctx, kind, x, y, sx, sy, ts, now);
    ctx.fillStyle = gloom(m, lit, x, y); ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
  }
  // The planned walk.
  ctx.fillStyle = "rgba(255,214,120,.75)";
  for (const [x, y] of path) { ctx.beginPath(); ctx.arc(ox + (x + 0.5) * ts, oy + (y + 0.5) * ts, ts * 0.08, 0, Math.PI * 2); ctx.fill(); }
  // Foes, chests, services, landmarks and the trapdoor you've seen.
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const emoji = (px: number) => `${Math.round(px)}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", system-ui, sans-serif`;
  m.things.forEach((t, k) => {
    if ((t.done && !t.opened) || !isSeenTile(m, t.x, t.y)) return;
    const cx = ox + (t.x + 0.5) * ts, cy = oy + (t.y + 0.5) * ts;
    if (cx < -ts || cy < -ts || cx > W + ts || cy > H + ts) return;
    // A cracked wall looks like wall, with a few cracks if you look closely; a locked door is a door.
    if (t.room === "crack" || t.room === "locked") {
      const sx = ox + t.x * ts, sy = oy + t.y * ts;
      if (t.room === "crack") { drawWall(ctx, m, t.x, t.y, sx, sy, ts); drawCracks(ctx, sx, sy, ts); }
      else { ctx.fillStyle = "#1b120b"; ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5); if (!drawSprite(ctx, "doors_leaf_closed", cx, sy + ts, ts / 32)) { ctx.font = emoji(ts * 0.62); ctx.fillText("🔒", cx, cy); } }
      ctx.fillStyle = gloom(m, lit, t.x, t.y); ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
      if (m.sel === k) { ctx.strokeStyle = "#ffd27a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(cx, cy, ts * 0.47, 0, Math.PI * 2); ctx.stroke(); }
      return;
    }
    const on = lit.has(idx(m, t.x, t.y));
    ctx.globalAlpha = on ? 1 : 0.6;
    ctx.fillStyle = "rgba(20,10,4,.45)";
    ctx.beginPath(); ctx.ellipse(cx, cy + ts * 0.3, ts * 0.32, ts * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    if (t.room === "trapdoor") drawTrapdoor(ctx, cx, cy, ts, m.depth === LAYER_FLOORS - 1);
    else {
      // A sprite where we have one (the foe itself, a chest, the Merchant); an emoji otherwise.
      const sk = t.foe ? foeSprite(t.foe, undefined, false) : t.opened && THING_SPRITE[t.room] ? `${THING_SPRITE[t.room]}_open` : THING_SPRITE[t.room];
      const big = sk && ["ogre", "big_demon", "big_zombie"].includes(sk);
      // Tall props (a column, a fountain) are shrunk to stand about a tile and a half high.
      const sz = sk ? spriteSize(sk) : null;
      const scale = sz && sz.h > 24 && !big ? Math.min(ts / 16, (ts * 1.45) / sz.h) : ts / 16;
      if (t.room === "rest") drawCampfire(ctx, cx, cy, ts, now);
      else if (t.room === "pond") drawWater(ctx, cx, cy + ts * 0.08, ts * 0.42, ts * 0.3, now);
      else if (t.room === "event" && hasSprite("doors_leaf_open")) {
        // A strange door, set in the wall behind it, with a faint glow spilling out.
        const pulse = 0.55 + 0.45 * Math.sin(now / 700);
        ctx.save(); ctx.globalCompositeOperation = "lighter";
        const g = ctx.createRadialGradient(cx, cy - ts * 0.35, 0, cx, cy - ts * 0.35, ts * 0.95);
        g.addColorStop(0, `rgba(190,140,255,${0.6 * pulse})`); g.addColorStop(0.6, `rgba(130,90,220,${0.22 * pulse})`); g.addColorStop(1, "rgba(120,80,200,0)");
        ctx.fillStyle = g; ctx.fillRect(cx - ts, cy - ts * 1.3, ts * 2, ts * 2);
        ctx.restore();
        drawSprite(ctx, "doors_leaf_open", cx, cy + ts * 0.15, ts / 32);
      }
      else if (!sk || !hasSprite(sk) || !drawSprite(ctx, sk, cx, cy + ts * 0.42, big ? scale * 0.7 : scale)) {
        ctx.fillStyle = "#fff"; ctx.font = emoji(ts * 0.62); ctx.fillText(h.icon(t.room), cx, cy + ts * 0.02);
      }
      // Elites and Champions wear a ring of menace.
      if (t.room === "elite" || t.room === "champion") { ctx.strokeStyle = t.room === "champion" ? "rgba(255,120,60,.9)" : "rgba(200,140,255,.85)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(cx, cy + ts * 0.36, ts * 0.34, ts * 0.11, 0, 0, Math.PI * 2); ctx.stroke(); }
    }
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
  const hk = CLASS_SPRITE[r.hero.origin];
  if (!hk || !drawSprite(ctx, hk, pxc, pyc + ts * 0.4, ts / 16)) { ctx.font = emoji(ts * 0.6); ctx.fillText(h.hero(), pxc, pyc + ts * 0.02); }
  // Still burning (lava) or choking (sludge): a flicker around you, and how many steps it has left.
  if (m.burn) {
    const lava = m.burnKind === "lava";
    const fl = 0.6 + 0.4 * Math.sin(now / 110);
    ctx.strokeStyle = lava ? `rgba(255,120,30,${fl})` : `rgba(130,200,60,${fl})`; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pxc, pyc, ts * 0.56, 0, Math.PI * 2); ctx.stroke();
    ctx.font = `700 ${Math.round(ts * 0.26)}px system-ui, sans-serif`;
    ctx.fillStyle = lava ? "#ffb070" : "#bfe88a";
    ctx.strokeStyle = "rgba(0,0,0,.8)"; ctx.lineWidth = 3;
    const label = `${lava ? "🔥" : "☣️"}${m.burn}`;
    ctx.strokeText(label, pxc + ts * 0.5, pyc - ts * 0.48); ctx.fillText(label, pxc + ts * 0.5, pyc - ts * 0.48);
  }
  drawMinimap(m);
  floats = floats.filter(f => now - f.t0 < 900);
  for (const f of floats) {
    const k = (now - f.t0) / 900;
    ctx.globalAlpha = 1 - k;
    ctx.font = `800 ${Math.round(ts * 0.36)}px system-ui, sans-serif`;
    ctx.strokeStyle = "rgba(0,0,0,.85)"; ctx.lineWidth = 4; ctx.fillStyle = f.color;
    ctx.strokeText(f.text, pxc, pyc - ts * (0.6 + 0.5 * k)); ctx.fillText(f.text, pxc, pyc - ts * (0.6 + 0.5 * k));
    ctx.globalAlpha = 1;
  }
  if (floats.length && !raf) raf = requestAnimationFrame(frame);
}

/** The minimap: everything you've seen on this floor, small, with you and the way down on it. */
function drawMinimap(m: FloorMap) {
  const cv = document.getElementById("minimap") as HTMLCanvasElement | null;
  if (!cv) return;
  const c = 5, W = m.w * c, H = m.h * c;
  if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; }
  const ctx = cv.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, W, H);
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const i = idx(m, x, y);
    if (!m.seen[i]) continue;
    const hz = m.haz?.[i];
    ctx.fillStyle = m.tiles[i] !== 1 ? "#3b2a1c" : hz === "lava" ? "#d0501c" : hz === "sludge" ? "#5f8f2a" : hz === "spike" ? "#9a8a7a" : "#a88a62";
    ctx.fillRect(x * c, y * c, c, c);
  }
  for (const t of m.things) {
    if (t.done || !m.seen[idx(m, t.x, t.y)]) continue;
    const col = t.room === "trapdoor" ? (m.depth === LAYER_FLOORS - 1 ? "#ff3a2e" : "#ffd23a") : t.room === "shop" ? "#e8c070" : t.room === "locked" ? "#c08040" : null;
    if (!col) continue;
    ctx.fillStyle = col;
    ctx.fillRect(t.x * c, t.y * c, c, c);
  }
  ctx.fillStyle = "#fff";
  ctx.fillRect(m.px * c - 1, m.py * c - 1, c + 2, c + 2);
  ctx.fillStyle = "#ffd23a";
  ctx.fillRect(m.px * c, m.py * c, c, c);
}

/** How dark a tile sits: lit by your torch (brighter close by), or only remembered. */
function gloom(m: FloorMap, lit: Set<number>, x: number, y: number) {
  const d = Math.hypot(x - m.px, y - m.py);
  return lit.has(idx(m, x, y)) ? `rgba(12,7,3,${Math.min(0.45, (d / (SIGHT + 1)) * 0.45)})` : "rgba(12,7,3,.68)";
}

/** A pool of lava or sludge: a glowing liquid with slow bubbles. */
function drawPool(ctx: CanvasRenderingContext2D, kind: "lava" | "sludge", x: number, y: number, sx: number, sy: number, ts: number, now: number) {
  const lava = kind === "lava";
  const g = ctx.createRadialGradient(sx + ts / 2, sy + ts / 2, ts * 0.1, sx + ts / 2, sy + ts / 2, ts * 0.75);
  if (lava) { g.addColorStop(0, "#ffb347"); g.addColorStop(0.5, "#e8521c"); g.addColorStop(1, "#7a1d08"); }
  else { g.addColorStop(0, "#9ccf4a"); g.addColorStop(0.55, "#5a8a26"); g.addColorStop(1, "#2c4512"); }
  ctx.fillStyle = g;
  ctx.fillRect(sx, sy, ts + 0.5, ts + 0.5);
  for (let k = 0; k < 3; k++) {
    const ph = ((now / (lava ? 900 : 1400)) + hash(x, y, k + 20)) % 1;
    const bx = sx + ts * (0.2 + 0.6 * hash(x, y, k + 30)), by = sy + ts * (0.2 + 0.6 * hash(x, y, k + 40));
    ctx.fillStyle = lava ? `rgba(255,230,140,${0.7 * (1 - ph)})` : `rgba(200,240,120,${0.6 * (1 - ph)})`;
    ctx.beginPath(); ctx.arc(bx, by, ts * (0.04 + 0.08 * ph), 0, Math.PI * 2); ctx.fill();
  }
  if (lava) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    ctx.fillStyle = `rgba(255,100,30,${0.12 + 0.06 * Math.sin(now / 300 + x)})`;
    ctx.fillRect(sx - ts * 0.2, sy - ts * 0.2, ts * 1.4, ts * 1.4);
    ctx.restore();
  }
}

/** A campfire: a ring of stones, crossed logs and a flickering flame. */
function drawCampfire(ctx: CanvasRenderingContext2D, cx: number, cy: number, ts: number, now: number) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  const fl = 0.85 + 0.15 * Math.sin(now / 80) * Math.sin(now / 31);
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, ts * 1.4 * fl);
  g.addColorStop(0, "rgba(255,150,60,.35)"); g.addColorStop(1, "rgba(255,110,30,0)");
  ctx.fillStyle = g; ctx.fillRect(cx - ts * 1.5, cy - ts * 1.5, ts * 3, ts * 3);
  ctx.restore();
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; ctx.fillStyle = k % 2 ? "#6a5a4a" : "#544638"; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * ts * 0.3, cy + ts * 0.18 + Math.sin(a) * ts * 0.12, ts * 0.08, ts * 0.06, 0, 0, Math.PI * 2); ctx.fill(); }
  ctx.strokeStyle = "#5a3418"; ctx.lineWidth = ts * 0.09; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(cx - ts * 0.22, cy + ts * 0.24); ctx.lineTo(cx + ts * 0.22, cy + ts * 0.08); ctx.moveTo(cx + ts * 0.22, cy + ts * 0.24); ctx.lineTo(cx - ts * 0.22, cy + ts * 0.08); ctx.stroke();
  const fh = ts * 0.5 * fl;
  const fg = ctx.createRadialGradient(cx, cy - fh * 0.1, 0, cx, cy - fh * 0.1, fh);
  fg.addColorStop(0, "#fff4c0"); fg.addColorStop(0.35, "#ffc850"); fg.addColorStop(0.7, "#ff7a20"); fg.addColorStop(1, "rgba(255,80,10,0)");
  ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(cx, cy - fh * 0.15, ts * 0.17, fh * 0.65, 0, 0, Math.PI * 2); ctx.fill();
}

/** Hairline cracks on a wall that gives a little when you push it. */
function drawCracks(ctx: CanvasRenderingContext2D, sx: number, sy: number, ts: number) {
  ctx.strokeStyle = "rgba(10,6,3,.85)"; ctx.lineWidth = Math.max(1.5, ts / 28);
  ctx.beginPath();
  ctx.moveTo(sx + ts * 0.3, sy + ts * 0.15); ctx.lineTo(sx + ts * 0.45, sy + ts * 0.4); ctx.lineTo(sx + ts * 0.38, sy + ts * 0.6); ctx.lineTo(sx + ts * 0.55, sy + ts * 0.85);
  ctx.moveTo(sx + ts * 0.45, sy + ts * 0.4); ctx.lineTo(sx + ts * 0.7, sy + ts * 0.48);
  ctx.moveTo(sx + ts * 0.38, sy + ts * 0.6); ctx.lineTo(sx + ts * 0.2, sy + ts * 0.7);
  ctx.stroke();
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
  h.sfx("step");
  if (res.hurt) {
    const kind = m.haz?.[idx(m, m.px, m.py)];
    floats.push({ text: `−${res.hurt}`, color: kind === "spike" ? "#ff6a5a" : m.burnKind === "sludge" ? "#bfe88a" : "#ffa060", t0: performance.now() });
    h.sfx("hit");
    h.hurt?.();
  }
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
  atlas(() => { layerKey = ""; drawCrawl(); });
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
    // Measure from where the camera is drawn right now (mid-step it's between two tiles), not from where you'll land.
    const c = cam(m);
    const x = Math.round(c.x + (ev.clientX - rect.left - rect.width / 2) / ts);
    const y = Math.round(c.y + (ev.clientY - rect.top - rect.height / 2) / ts);
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
  window.setInterval(() => { if (!document.hidden && !glide && runRef?.grid && document.getElementById("crawl")) drawCrawl(); }, 140);
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
