import type { HookDef } from "../engine/types";
/** Tarot cards that work through the fight's own rules (hidden, like Heat's: the card itself says what it does).
 *  Their strength is read from the hero (tb_ = boon × 100, tn_ = bane × 100), set when the hero's stats are worked out. */
const tb = (f: { persist: Record<string, number> }, id: string) => (f.persist[`tb_${id}`] ?? 100) / 100;
const tn = (f: { persist: Record<string, number> }, id: string) => (f.persist[`tn_${id}`] ?? 100) / 100;
export const TAROT_HOOK_ITEMS: HookDef[] = [
  // The Abyss's Omens that change your own numbers (stacks = times accepted).
  { id: "omen_ironwill", name: "Iron Will", kind: "trait", tags: [], text: "+3 Armor; healing −15%", hooks: { stats: (s, n) => { s.armor += 3 * n; }, healMult: n => Math.pow(0.85, n) } },
  { id: "omen_whetstone", name: "Whetstone", kind: "trait", tags: [], text: "+2 Damage", hooks: { stats: (s, n) => { s.damage += 2 * n; } } },
  { id: "tarot_temperance", name: "Temperance", kind: "trait", tags: [], text: "Reactions deal more; status damage less",
    hooks: { reactionMult: (_b, f) => 1 + 0.5 * tb(f, "temperance"), stats: (s, _n, f) => { if (f) s.dotAmp = (s.dotAmp ?? 0) - 25 * tn(f, "temperance"); } } },
  { id: "tarot_justice", name: "Justice", kind: "trait", tags: [], text: "Misses graze; crits are plain hits",
    hooks: { stats: (s, _n, f) => { if (f && tb(f, "justice") > 1) s.dmgDealt = (s.dmgDealt ?? 0) + 10; } } }
];
