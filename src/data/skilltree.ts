// 1.97: talents for the new rules. Skills come from your path (at level 5) or a Legendary, and Mana carries over
// between fights (only potions refill it), so the tree now has passives that feed your skill and your Mana.
import { other } from "../engine/statuses";
import type { Battle, Fighter, HookDef } from "../engine/types";
import { applyStatus, heal, st } from "./helpers";

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
,
  // 1.99: the old class passives, now nodes any class can take (they clashed with the paths).
  talent({ id: "t_battle_hardened", name: "Battle-Hardened", tags: ["Guard"], text: "Guarding gives +2 / +3 / +4 Armor, and your Hits and Crits deal +1 Damage for every 5 Armor you wear",
    hooks: { modifyAttack: (_b, c) => { c.bonus += Math.floor(c.attacker.armor / 5); }, onGuard: (_b, f, s) => { f.flags["guardArmor"] = (f.flags["guardArmor"] ?? 0) + rank(s, 2, 3, 4); } } }),
  talent({ id: "t_opportunist", name: "Opportunist", tags: ["Crit"], text: "Your first 1 / 2 / 3 attacks each fight roll twice and keep the better",
    hooks: { onFightStart: (b, f, s) => applyStatus(b, f, f, "focus", s) } }),
  talent({ id: "t_arcane_spark", name: "Arcane Spark", tags: ["Arcane"], text: "Statuses your weapon's spell faces apply get +1 / +2 / +3 stacks",
    hooks: { onStatusApplied: (_b, self, t, status, _n, s) => { if (self.flags["casting"] && t !== self && !["stun", "shock"].includes(status)) t.statuses[status] = st(t, status) + s; } } }),
  talent({ id: "t_devotion", name: "Devotion", tags: ["Holy"], text: "At the end of each round, heal 1 for each positive status you have (up to 2 / 4 / 6)",
    hooks: { onRoundEnd: (b, f, s) => { const n = (["regen", "barrier", "might", "haste", "focus", "evade", "spikes", "ward", "charged", "kindled", "grounded", "smoulder_soul"] as const).filter(k => st(f, k) > 0).length; if (n) heal(b, f, Math.min(n, rank(s, 2, 4, 6)), "Devotion"); } } })
];
