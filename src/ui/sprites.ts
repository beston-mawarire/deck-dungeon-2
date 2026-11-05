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
  [/vampire/i, "chort"], [/wolf/i, "wogol"], [/boar/i, "swampy"], [/tortoise/i, "muddy"], [/spider/i, "chort"], [/leech/i, "slug"],
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
export const THING_SPRITE: Record<string, string> = { wooden: "chest_wood", iron: "chest_iron", vault: "chest_gold", bosschest: "chest_gold", crimson_vault: "chest_gold", secret: "chest_gold", shop: "dwarf_m", goblin: "goblin" };
