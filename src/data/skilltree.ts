// 1.97: talents for the new rules. Skills come from your path (at level 5) or a Legendary, and Mana carries over
// between fights (only potions refill it), so the tree now has passives that feed your skill and your Mana.
import { other } from "../engine/statuses";
import type { Battle, Fighter, HookDef } from "../engine/types";
import { applyStatus, heal } from "./helpers";

const talent = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "talent", ...d });
const rank = (s: number, ...vals: number[]) => vals[Math.min(s, vals.length) - 1];
/** onSkill also fires for things that aren't a cast (a Counter landing, a Barrier holding, a reaction). */
const NOT_A_CAST = new Set(["counter_hit", "penance_release", "barrier_block", "barrier_hit", "reaction"]);
const cast = (fn: (b: Battle, self: Fighter, s: number) => void) => (b: Battle, self: Fighter, skill: string, s: number) => { if (self.id === "player" && !NOT_A_CAST.has(skill)) fn(b, self, s); };
/** The statuses a skill can deepen on a foe. */
const DEEPEN = ["bleed", "burn", "poison", "chill", "shock", "doom", "smoulder"] as const;

export const SKILL_TREE_TALENTS: HookDef[] = [
  talent({ id: "t_deep_well", name: "Deep Well", tags: ["Arcane"], text: "Each fight, regain 1 / 2 / 3 Mana (it carries over between fights)",
    hooks: { onFightStart: (_b, f, s) => { f.flags["fightMana"] = (f.flags["fightMana"] ?? 0) + s; } } }),
  talent({ id: "t_practised", name: "Practised Hand", tags: ["Strike"], text: "After you use your skill, gain 1 / 2 / 3 Might",
    hooks: { onSkill: cast((b, f, s) => applyStatus(b, f, f, "might", s)) } }),
  talent({ id: "t_steadied", name: "Steadied", tags: ["Guard"], text: "After you use your skill, gain 3 / 5 / 8 Barrier",
    hooks: { onSkill: cast((b, f, s) => applyStatus(b, f, f, "barrier", rank(s, 3, 5, 8))) } }),
  talent({ id: "t_thrifty_cast", name: "Thrifty Casting", tags: ["Tempo"], text: "After you use your skill, a 20% / 35% / 50% chance to get its Mana back",
    hooks: { onSkill: cast((b, f, s) => { if (b.rng() < rank(s, 0.2, 0.35, 0.5)) f.mana = Math.min(f.maxMana ?? 99, (f.mana ?? 0) + 1); }) } }),
  talent({ id: "t_spark_insight", name: "Spark of Insight", tags: ["Storm"], text: "After you use your skill, apply 1 / 2 / 3 Shock to the enemy",
    hooks: { onSkill: cast((b, f, s) => applyStatus(b, f, other(b, f), "shock", s)) } }),
  talent({ id: "t_prayerful", name: "Prayerful", tags: ["Holy"], text: "After you use your skill, heal 2 / 3 / 5",
    hooks: { onSkill: cast((b, f, s) => heal(b, f, rank(s, 2, 3, 5), "Prayerful")) } }),
  talent({ id: "t_deepening", name: "Deepening", tags: ["Poison"], text: "After you use your skill, every ailment on the enemy grows by 1 / 2 / 3",
    hooks: { onSkill: cast((b, f, s) => { const e = other(b, f); for (const k of DEEPEN) if ((e.statuses[k] ?? 0) > 0) applyStatus(b, f, e, k, s); }) } }),
  talent({ id: "t_windfall", name: "Windfall", tags: ["Luck"], text: "After you use your skill, a 15% / 25% / 40% chance of Focus and Haste",
    hooks: { onSkill: cast((b, f, s) => { if (b.rng() < rank(s, 0.15, 0.25, 0.4)) { applyStatus(b, f, f, "focus", 1); applyStatus(b, f, f, "haste", 1); } }) } })
];
