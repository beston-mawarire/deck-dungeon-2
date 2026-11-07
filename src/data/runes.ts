// Face Runes (the Crawl's boons): each one carves an effect into one face of your die for the rest of the run,
// whatever weapon you hold. Offered after you beat an Elite, a Champion or a boss: pick 1 of 3, or skip.
// One rune per face; the same rune again on its face ranks it up (to III), adding its effect again.
import type { AttackCtx, Battle, HookDef, StatusId } from "../engine/types";
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
  { id: "leech", name: "Leech", icon: "🩸", text: "heal 2 HP", fire: (b, ctx, rank) => { heal(b, ctx.attacker, 2 * rank, "Leech Rune"); } },
];
export const RUNE_MAP = new Map(RUNES.map(r => [r.id, r]));
export const NUMERALS = ["", "I", "II", "III"];
export const runeText = (r: RuneInfo, face: number, rank = 1) =>
  `On a ${face}: ${rank > 1 ? r.text.replace(/\d+/, m => String(Number(m) * rank)).replace(/^gain Focus$/, `gain Focus ×${rank}`) : r.text}.`;

/** One hook item per rune per face (rune_<id>_<face>); its stacks are the rune's rank. */
export const RUNE_HOOKS: HookDef[] = RUNES.flatMap(r => [1, 2, 3, 4, 5, 6].map(face => ({
  id: `rune_${r.id}_${face}`, name: `${r.name} Rune`, kind: "trait" as const, tags: [], text: runeText(r, face),
  hooks: { face: [{ group: face, run: (b: Battle, ctx: AttackCtx, stacks: number) => {
    if (ctx.attacker.id !== "player") return;
    r.fire(b, ctx, Math.max(1, stacks));
    fx(b, { who: "player", kind: "text", text: `${r.name} Rune${stacks > 1 ? ` ${NUMERALS[stacks]}` : ""}`, icon: r.icon });
  } }] },
})));
