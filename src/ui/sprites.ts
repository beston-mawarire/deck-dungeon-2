// Sprites: 0x72's 16×16 DungeonTileset II (CC0), packed into one atlas by the build of src/assets.
import atlasUrl from "../assets/sprites.png";
import meta from "../assets/sprites.json";

export interface SpriteInfo { x: number; y: number; w: number; h: number; n: number }
const S = meta.s as Record<string, SpriteInfo>;
const PAD = meta.pad as number;
export const ATLAS_W = meta.w as number, ATLAS_H = meta.h as number;
export const hasSprite = (k: string) => !!S[k];

let img: HTMLImageElement | null = null;
let ready = false;
const waiting: (() => void)[] = [];
export function atlas(onReady?: () => void): HTMLImageElement | null {
  if (!img) {
    img = new Image();
    img.onload = () => { ready = true; waiting.splice(0).forEach(f => f()); };
    img.src = atlasUrl;
  }
  if (!ready && onReady) waiting.push(onReady);
  return ready ? img : null;
}

/** Draw a sprite with its feet at (cx, by), `scale` screen pixels per art pixel; animated sprites pick their frame from the clock. */
export function drawSprite(ctx: CanvasRenderingContext2D, k: string, cx: number, by: number, scale: number, t = performance.now()): boolean {
  const s = S[k], im = atlas();
  if (!s || !im) return false;
  const f = s.n > 1 ? Math.floor(t / 140) % s.n : 0;
  const w = s.w * scale, h = s.h * scale;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, s.x + f * (s.w + PAD), s.y, s.w, s.h, Math.round(cx - w / 2), Math.round(by - h), Math.round(w), Math.round(h));
  return true;
}
/** Fill a tile-sized square with a 16×16 tile. */
export function drawTile(ctx: CanvasRenderingContext2D, k: string, x: number, y: number, size: number): boolean {
  const s = S[k], im = atlas();
  if (!s || !im) return false;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(im, s.x, s.y, s.w, Math.min(s.h, 16), x, y, size + 0.5, size + 0.5);
  return true;
}

/** A sprite as an HTML element (pixel-crisp, animated through its frames). */
export function spriteHtml(k: string, scale: number, cls = ""): string {
  const s = S[k];
  if (!s) return "";
  const step = (s.w + PAD) * scale;
  return `<i class="spr ${cls}" style="width:${s.w * scale}px;height:${s.h * scale}px;background-image:url(${atlasUrl});background-size:${ATLAS_W * scale}px ${ATLAS_H * scale}px;background-position:${-s.x * scale}px ${-s.y * scale}px;${s.n > 1 ? `--x0:${-s.x * scale}px;--x1:${-s.x * scale - step * s.n}px;animation:spr-anim ${0.14 * s.n}s steps(${s.n}) infinite;` : ""}"></i>`;
}

/** Which sprite a foe wears, by its name (then its kind). */
const BY_NAME: [RegExp, string][] = [
  [/goblin|pickpocket/i, "goblin"], [/imp/i, "imp"], [/skeleton|bone|garrick/i, "skelet"], [/ghoul/i, "zombie"], [/wight|wraith|shade/i, "ice_zombie"],
  [/vampire/i, "chort"], [/wolf|flayed/i, "wogol"], [/boar/i, "swampy"], [/tortoise/i, "muddy"], [/spider/i, "chort"], [/leech/i, "slug"],
  [/troll|grimtooth|kragg/i, "ogre"], [/shieldbearer/i, "masked_orc"], [/acolyte/i, "orc_shaman"], [/hexer|blight|necro/i, "necromancer"],
  [/zealot/i, "orc_warrior"], [/gloomcaller|painweaver/i, "doc"], [/mother ember/i, "big_demon"], [/nightshade/i, "elf_f"],
  [/golem/i, "muddy"], [/wisp/i, "angel"], [/sentry|sentinel|maiden/i, "knight_f"], [/mimic/i, "chest_mimic"], [/death|the end|horror/i, "big_demon"]
];
const BY_FAMILY: Record<string, string> = { Undead: "skelet", Beast: "wogol", Cultist: "orc_shaman", Construct: "muddy" };
export function foeSprite(name: string, family?: string, boss = false): string | null {
  for (const [re, k] of BY_NAME) if (re.test(name)) return k;
  if (boss) return family === "Undead" ? "big_zombie" : "big_demon";
  return (family && BY_FAMILY[family]) || null;
}
export const CLASS_SPRITE: Record<string, string> = { warrior: "knight_m", mage: "wizzard_m", rogue: "elf_m", cleric: "angel", hero: "knight_f" };
/** Things on the map that have a sprite. */
export const THING_SPRITE: Record<string, string> = {
  // (The plain tileset chest reads as iron-bound; its paler recolour as wood.)
  obsidian: "chest_arcane", wooden: "chest_iron", iron: "chest_wood", vault: "chest_gold", bosschest: "chest_crimson", crimson_vault: "chest_crimson", secret: "chest_arcane", shop: "dwarf_m", goblin: "goblin",
  // The landmarks: people where someone's there, things where something is.
  alchemist: "wizzard_f", blacksmith: "dwarf_f", gambling_den: "lizard_m", card_sharp: "lizard_f", fortune_teller: "pumpkin_dude", jeweller: "elf_f",
  starving_pilgrim: "tiny_zombie", fallen_adventurer: "skull", event: "doors_leaf_open", shrine: "column",
  sanguine: "fount_red", altar: "fount_red", oath: "fount_red", sacred_spring: "fount_blue", mirror_pool: "fount_blue", cleansing: "fount_blue",
  forge: "weapon_big_hammer", masterwork: "weapon_golden_sword", offering: "flask_big_yellow", bounty: "wall_banner_yellow", sanctum: "wall_banner_green", crossroads: "floor_ladder", crimson_elite: "masked_orc"
};
/** A sprite's size in pixels (for fitting tall ones into a tile). */
export const spriteSize = (k: string) => (S[k] ? { w: S[k].w, h: S[k].h } : null);

/** A still, black pool with a ring of stones and slow ripples (the dungeon's fishing spots, and the Camp's). */
export function drawWater(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number, now: number) {
  ctx.save();
  ctx.fillStyle = "#3a3532";
  ctx.beginPath(); ctx.ellipse(cx, cy, rx * 1.12, ry * 1.18, 0, 0, Math.PI * 2); ctx.fill();
  const g = ctx.createRadialGradient(cx, cy - ry * 0.3, 0, cx, cy, rx);
  g.addColorStop(0, "#1d3a4a"); g.addColorStop(0.7, "#0c1a24"); g.addColorStop(1, "#050a0f");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
  // Stones round the edge.
  ctx.fillStyle = "#57504a";
  for (let k = 0; k < 9; k++) { const a = (k / 9) * Math.PI * 2 + 0.3; ctx.beginPath(); ctx.ellipse(cx + Math.cos(a) * rx * 1.08, cy + Math.sin(a) * ry * 1.12, rx * 0.12, ry * 0.12, a, 0, Math.PI * 2); ctx.fill(); }
  // Slow rings spreading out.
  ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.clip();
  for (let k = 0; k < 2; k++) {
    const ph = ((now / 2600) + k / 2) % 1;
    ctx.strokeStyle = `rgba(150,200,230,${0.35 * (1 - ph)})`; ctx.lineWidth = Math.max(1, rx / 18);
    ctx.beginPath(); ctx.ellipse(cx + rx * 0.15, cy, rx * 0.15 + rx * 0.7 * ph, ry * 0.15 + ry * 0.7 * ph, 0, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = "rgba(200,230,255,.18)"; ctx.beginPath(); ctx.ellipse(cx - rx * 0.35, cy - ry * 0.35, rx * 0.25, ry * 0.12, -0.3, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

/** The Forge: an iron anvil on a stump, a hammer resting on it, embers glowing in a brazier beside it. */
export function drawAnvil(ctx: CanvasRenderingContext2D, cx: number, cy: number, ts: number, now: number, cold = false) {
  // (Drawn a little larger than a tile's sprites, so the Forge is hard to miss.)
  const u = ts / 11;
  ctx.save();
  // Glow from the brazier.
  if (!cold) {
    const pulse = 0.75 + 0.25 * Math.sin(now / 260) * Math.sin(now / 410);
    const g = ctx.createRadialGradient(cx + 4 * u, cy, 0, cx + 4 * u, cy, ts * 0.9);
    g.addColorStop(0, `rgba(255,140,40,${0.42 * pulse})`); g.addColorStop(1, "rgba(255,120,30,0)");
    ctx.globalCompositeOperation = "lighter"; ctx.fillStyle = g; ctx.fillRect(cx - ts, cy - ts, ts * 2, ts * 2); ctx.globalCompositeOperation = "source-over";
  }
  // Brazier (right).
  ctx.fillStyle = "#2a2420"; ctx.fillRect(cx + 3 * u, cy + 1 * u, 5 * u, 4 * u);
  ctx.fillStyle = "#4a3f38"; ctx.fillRect(cx + 2.5 * u, cy + 0.5 * u, 6 * u, 1.2 * u);
  ctx.fillStyle = cold ? "#3a2a22" : "#ff7a1e"; ctx.fillRect(cx + 3.5 * u, cy - 0.3 * u, 4 * u, 1 * u);
  if (!cold) { ctx.fillStyle = "#ffd25a"; ctx.fillRect(cx + 4.5 * u, cy - 0.6 * u, 1.5 * u, 0.8 * u); }
  // Stump.
  ctx.fillStyle = "#5a3a20"; ctx.fillRect(cx - 5 * u, cy + 1.5 * u, 6 * u, 4.5 * u);
  ctx.fillStyle = "#7a5230"; ctx.fillRect(cx - 5 * u, cy + 1.5 * u, 6 * u, 1 * u);
  // Anvil: base, waist, face and horn.
  ctx.fillStyle = "#2c2f36";
  ctx.fillRect(cx - 4.5 * u, cy + 0.2 * u, 5 * u, 1.4 * u);
  ctx.fillRect(cx - 3.5 * u, cy - 1.6 * u, 3 * u, 2 * u);
  ctx.fillRect(cx - 6 * u, cy - 3.2 * u, 7.5 * u, 1.8 * u);
  ctx.beginPath(); ctx.moveTo(cx - 6 * u, cy - 3.2 * u); ctx.lineTo(cx - 8.5 * u, cy - 2.4 * u); ctx.lineTo(cx - 6 * u, cy - 1.4 * u); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#6a7180"; ctx.fillRect(cx - 6 * u, cy - 3.2 * u, 7.5 * u, 0.6 * u);
  // A hot bar on the anvil's face.
  if (!cold) { ctx.fillStyle = "#ff9a3a"; ctx.fillRect(cx - 4.5 * u, cy - 3.9 * u, 4 * u, 0.7 * u); ctx.fillStyle = "#ffe08a"; ctx.fillRect(cx - 3.5 * u, cy - 3.9 * u, 1.6 * u, 0.4 * u); }
  // Hammer leaning on the stump.
  ctx.fillStyle = "#8a5a2a"; ctx.save(); ctx.translate(cx + 1.6 * u, cy + 5 * u); ctx.rotate(-0.5); ctx.fillRect(-0.5 * u, -7 * u, 1 * u, 7 * u); ctx.fillStyle = "#5a5f6a"; ctx.fillRect(-1.8 * u, -8.4 * u, 3.6 * u, 1.8 * u); ctx.restore();
  // Sparks.
  if (!cold) for (let k = 0; k < 3; k++) {
    const ph = ((now / 900) + k / 3) % 1;
    ctx.fillStyle = `rgba(255,${200 - 80 * ph},80,${1 - ph})`;
    ctx.fillRect(cx - 2.5 * u + Math.sin(k * 2.1 + ph * 3) * 3 * u, cy - 4 * u - ph * 7 * u, 0.7 * u, 0.7 * u);
  }
  ctx.restore();
}
