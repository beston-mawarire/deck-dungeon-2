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
export interface ShufflerInfo { id: string; name: string; icon: string; text: string; faces: Partial<Record<number, FaceKind>>; critDmg?: number }
export const SHUFFLERS: ShufflerInfo[] = [
  { id: "low_roller", name: "Low Roller", icon: "🔄", text: "Your 1s Crit, and your 6s just Hit.", faces: { 1: "crit", 6: "hit" } },
  { id: "twin_crowns", name: "Twin Crowns", icon: "👑", text: "Your 2s and 6s both Crit, but Crits deal 50% less.", faces: { 2: "crit", 6: "crit" }, critDmg: -50 },
  { id: "sure_hand", name: "Sure Hand", icon: "🤝", text: "Your 1s Hit (no more misses), but your 4s only Graze.", faces: { 1: "hit", 4: "graze" } },
  { id: "all_in", name: "All In", icon: "🎰", text: "Your 5s and 6s Crit, but your 1s and 2s Miss.", faces: { 1: "miss", 2: "miss", 5: "crit", 6: "crit" } },
  { id: "even_keel", name: "Even Keel", icon: "⚖️", text: "Every face Hits: no misses, no grazes, no crits.", faces: { 1: "hit", 2: "hit", 3: "hit", 4: "hit", 5: "hit", 6: "hit" } },
  { id: "glass_edge", name: "Glass Edge", icon: "🔪", text: "Your 3s Crit too, but your 2s Miss.", faces: { 2: "miss", 3: "crit" } },
  { id: "steady_two", name: "Steady Two", icon: "✌️", text: "Your 1s and 2s Hit, but your 6s only Hit too.", faces: { 1: "hit", 2: "hit", 6: "hit" } },
  { id: "lucky_odds", name: "Lucky Odds", icon: "🍀", text: "Your odd faces Hit and your 5s Crit; your 4s Graze.", faces: { 1: "hit", 3: "hit", 4: "graze", 5: "crit" } },
];
export const SHUFFLER_MAP = new Map(SHUFFLERS.map(x => [x.id, x]));
/** Rewrite a six-sided die by the Shuffler (spells keep their spell, with the new kind). */
export function shuffleFaces(id: string | undefined, faces: FaceSpec[]): FaceSpec[] {
  const sh = id ? SHUFFLER_MAP.get(id) : undefined;
  if (!sh || faces.length !== 6) return faces;
  return faces.map((sp, i) => { const k = sh.faces[i + 1]; return k && k !== sp.kind ? { ...sp, kind: k, name: sp.run ? sp.name : undefined } : sp; });
}
/** The Shufflers' own stat hooks (Twin Crowns' weaker Crits). */
export const SHUFFLER_HOOKS: HookDef[] = SHUFFLERS.map(x => ({
  id: `shuf_${x.id}`, name: x.name, kind: "trait" as const, tags: [], text: x.text,
  hooks: x.critDmg ? { stats: s => { s.critDmg = (s.critDmg ?? 0) + x.critDmg!; } } : {},
}));
