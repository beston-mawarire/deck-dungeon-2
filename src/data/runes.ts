// Face Runes (the Crawl's boons): each one carves an effect into one face of your die for the rest of the run,
// whatever weapon you hold. Offered after you beat an Elite, a Champion or a boss: pick 1 of 3, or skip.
// One rune per face; the same rune again on its face ranks it up (to III), adding its effect again.
import type { AttackCtx, Battle, FaceKind, FaceSpec, HookDef, StatusId } from "../engine/types";
import { applyStatus, heal } from "../engine/statuses";
import { fx } from "../engine/registry";

export const RUNE_MAX_RANK = 3;
export interface RuneInfo { id: string; name: string; icon: string; /** What it does on its face, at rank 1. */ text: string; fire: (b: Battle, ctx: AttackCtx, rank: number) => void }
const onFoe = (status: StatusId, n: number) => (b: Battle, ctx: AttackCtx, rank: number) => applyStatus(b, ctx.attacker, ctx.defender, status, n * rank);
const onSelf = (status: StatusId, n: number) => (b: Battle, ctx: AttackCtx, rank: number) => applyStatus(b, ctx.attacker, ctx.attacker, status, n * rank);

export const RUNES: RuneInfo[] = [
  { id: "ember", name: "Ember", icon: "🔥", text: "apply 2 Burn", fire: onFoe("burn", 2) },
  { id: "frost", name: "Frost", icon: "❄️", text: "apply 2 Chill", fire: onFoe("chill", 2) },
  { id: "venom", name: "Venom", icon: "🧪", text: "apply 2 Poison", fire: onFoe("poison", 2) },
  { id: "storm", name: "Storm", icon: "⚡", text: "apply 1 Shock", fire: onFoe("shock", 1) },
  { id: "ward", name: "Ward", icon: "🔮", text: "gain 3 Barrier", fire: onSelf("barrier", 3) },
  { id: "focus", name: "Focus", icon: "🎯", text: "gain Focus", fire: onSelf("focus", 1) },
  { id: "fury", name: "Fury", icon: "💢", text: "gain 1 Might", fire: onSelf("might", 1) },
  { id: "leech", name: "Leech", icon: "💚", text: "heal 2 HP", fire: (b, ctx, rank) => { heal(b, ctx.attacker, 2 * rank, "Leech Rune"); } },
  // (Not all elements: coin, blood, steel and tricks too.)
  { id: "gild", name: "Gild", icon: "🪙", text: "gain 2 Gold", fire: (_b, ctx, rank) => { ctx.attacker.gold += 2 * rank; } },
  { id: "rend", name: "Rend", icon: "🩸", text: "apply 2 Bleed", fire: onFoe("bleed", 2) },
  { id: "daze", name: "Daze", icon: "💫", text: "a 10% chance to Stun", fire: (b, ctx, rank) => { if (b.rng() < 0.1 * rank) applyStatus(b, ctx.attacker, ctx.defender, "stun", 1); } },
  { id: "edge", name: "Edge", icon: "🗡️", text: "+2 damage", fire: (_b, ctx, rank) => { ctx.bonus += 2 * rank; } },
  { id: "thorn", name: "Thorn", icon: "🌵", text: "gain 2 Spikes", fire: onSelf("spikes", 2) },
  { id: "expose", name: "Expose", icon: "🎯", text: "apply 1 Exposed", fire: onFoe("exposed", 1) },
  { id: "spark", name: "Spark", icon: "🔷", text: "gain 1 Mana", fire: (_b, ctx, rank) => { const f = ctx.attacker; f.mana = Math.min(f.maxMana ?? 2, (f.mana ?? 0) + rank); } },
];
export const RUNE_MAP = new Map(RUNES.map(r => [r.id, r]));
export const NUMERALS = ["", "I", "II", "III"];
export const runeText = (r: RuneInfo, face: number, rank = 1) =>
  `On a ${face}: ${rank > 1 ? r.text.replace(/\d+/, m => String(Number(m) * rank)).replace(/^gain Focus$/, `gain Focus ×${rank}`) : r.text}.`;

/** One hook item per rune per face (rune_<id>_<face>); its stacks are the rune's rank. */
export const RUNE_HOOKS: HookDef[] = RUNES.flatMap(r => [1, 2, 3, 4, 5, 6].map(face => ({
  id: `rune_${r.id}_${face}`, name: `${r.name} Rune`, kind: "trait" as const, tags: [], text: runeText(r, face),
  hooks: { face: [{ group: face, run: (b: Battle, ctx: AttackCtx, stacks: number) => {
    // (Your main die only.)
    if (ctx.attacker.id !== "player" || ctx.offhand) return;
    r.fire(b, ctx, Math.max(1, stacks));
    fx(b, { who: "player", kind: "text", text: `${r.name} Rune${stacks > 1 ? ` ${NUMERALS[stacks]}` : ""}`, icon: r.icon });
  } }] },
})));

// ---------- Shufflers (the other pick at a descent) ----------
// A Shuffler rewrites what some faces of your die are, for the rest of the run, like a Daedalus Hammer for your die.
// One at a time (a new one replaces it). Six-sided dice only: a Legendary's bigger die keeps its own faces.
export interface ShufflerInfo { id: string; name: string; icon: string;
  /** What it does, with {n} (or {a,b}) for the faces it rewrites, by their number on the template below. */
  tpl: string;
  /** The template faces (each run deals its own numbers: see dealShuffler). */
  faces: Partial<Record<number, FaceKind>>; critDmg?: number }
export const SHUFFLERS: ShufflerInfo[] = [
  { id: "low_roller", name: "Low Roller", icon: "🔄", tpl: "Your {1} Crit, and your {6} Hit.", faces: { 1: "crit", 6: "hit" } },
  { id: "twin_crowns", name: "Twin Crowns", icon: "👑", tpl: "Your {2,6} both Crit, but Crits deal 50% less.", faces: { 2: "crit", 6: "crit" }, critDmg: -50 },
  { id: "sure_hand", name: "Sure Hand", icon: "🤝", tpl: "Your {1} Hit, but your {4} only Graze.", faces: { 1: "hit", 4: "graze" } },
  { id: "all_in", name: "All In", icon: "🎰", tpl: "Your {5,6} Crit, but your {1,2} Miss.", faces: { 1: "miss", 2: "miss", 5: "crit", 6: "crit" } },
  { id: "even_keel", name: "Even Keel", icon: "⚖️", tpl: "Every face Hits: no misses, no grazes, no crits.", faces: { 1: "hit", 2: "hit", 3: "hit", 4: "hit", 5: "hit", 6: "hit" } },
  { id: "glass_edge", name: "Glass Edge", icon: "🔪", tpl: "Your {3} Crit, but your {2} Miss.", faces: { 2: "miss", 3: "crit" } },
  { id: "steady_two", name: "Steady Two", icon: "✌️", tpl: "Your {1,2,6} Hit.", faces: { 1: "hit", 2: "hit", 6: "hit" } },
  { id: "lucky_odds", name: "Lucky Odds", icon: "🍀", tpl: "Your {1,3} Hit and your {5} Crit, but your {4} Graze.", faces: { 1: "hit", 3: "hit", 4: "graze", 5: "crit" } },
];
export const SHUFFLER_MAP = new Map(SHUFFLERS.map(x => [x.id, x]));
/** A Shuffler's faces for one run: which number each of its template faces landed on. */
export type ShuffleDeal = Record<number, number>;
/** The die a deal is checked against (it must change one of its faces): a usual weapon's (a 1 Misses, a 2 Grazes, a 6 Crits). */
const REF: FaceKind[] = ["miss", "graze", "hit", "hit", "hit", "crit"];
/** Deal a Shuffler's faces for a new run: its rule lands on any faces at all (what was a 1 last run could be a 4 now).
 *  The one rule: it has to change something on a usual weapon's die, so it's never a dud. */
export function dealShuffler(id: string, rng: () => number): ShuffleDeal {
  const sh = SHUFFLER_MAP.get(id), same: ShuffleDeal = {};
  if (!sh) return same;
  const keys = Object.keys(sh.faces).map(Number);
  for (const k of keys) same[k] = k;
  for (let tries = 0; tries < 40; tries++) {
    const pool = [1, 2, 3, 4, 5, 6];
    for (let i = pool.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const deal: ShuffleDeal = {};
    keys.forEach((k, i) => (deal[k] = pool[i]));
    if (keys.some(k => sh.faces[k] !== REF[deal[k] - 1])) return deal;
  }
  return same;
}
/** A Shuffler's faces this run (its template's, if it hasn't been dealt). */
export function shufflerFaces(id: string, deal?: ShuffleDeal): Partial<Record<number, FaceKind>> {
  const sh = SHUFFLER_MAP.get(id);
  if (!sh) return {};
  const out: Partial<Record<number, FaceKind>> = {};
  for (const [k, kind] of Object.entries(sh.faces)) out[deal?.[Number(k)] ?? Number(k)] = kind;
  return out;
}
const numList = (ns: number[]) => { const t = ns.sort((a, b) => a - b).map(n => `${n}s`); return t.length < 2 ? t.join("") : `${t.slice(0, -1).join(", ")} and ${t[t.length - 1]}`; };
/** What a Shuffler does this run, with the numbers it was dealt. */
export function shufflerText(id: string, deal?: ShuffleDeal): string {
  const sh = SHUFFLER_MAP.get(id);
  if (!sh) return "";
  return sh.tpl.replace(/\{([\d,]+)\}/g, (_m, g: string) => numList(g.split(",").map(k => deal?.[Number(k)] ?? Number(k))));
}
/** Rewrite a six-sided die by the Shuffler, with the faces it was dealt this run (spells keep their spell, with the new kind). */
export function shuffleFaces(id: string | undefined, faces: FaceSpec[], deal?: ShuffleDeal): FaceSpec[] {
  if (!id || !SHUFFLER_MAP.has(id) || faces.length !== 6) return faces;
  const map = shufflerFaces(id, deal);
  return faces.map((sp, i) => { const k = map[i + 1]; return k && k !== sp.kind ? { ...sp, kind: k, name: sp.run ? sp.name : undefined } : sp; });
}
/** The Shufflers' own stat hooks (Twin Crowns' weaker Crits). */
export const SHUFFLER_HOOKS: HookDef[] = SHUFFLERS.map(x => ({
  id: `shuf_${x.id}`, name: x.name, kind: "trait" as const, tags: [], text: shufflerText(x.id),
  hooks: x.critDmg ? { stats: s => { s.critDmg = (s.critDmg ?? 0) + x.critDmg!; } } : {},
}));
