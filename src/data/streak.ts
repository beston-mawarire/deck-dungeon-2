// Hit streak gear: the streak counts every Hit or Crit that gets through, across the whole run.
// A Miss, a Graze, or an attack that's evaded, dodged or fully blocked resets it to 0.
import { streakOf } from "../engine/combat";
import type { GearBase, HookDef } from "../engine/types";
import { applyStatus, heal } from "./helpers";

const rank = (s: number, ...vals: number[]) => vals[Math.min(s, vals.length) - 1];

export const STREAK_RELICS: HookDef[] = [
  { kind: "relic", id: "r_unbroken_chain", name: "Unbroken Chain", rarity: "rare", tags: ["Strike", "Tempo"],
    text: "Your Hits and Crits deal +1 for every 2 in your hit streak, up to +5 (+3)",
    hooks: { modifyAttack: (_b, c, s) => { c.bonus += Math.min(5 + 3 * (s - 1), Math.floor(streakOf(c.attacker) / 2)); } } }
];

export const STREAK_TALENTS: HookDef[] = [
  { kind: "talent", id: "t_relentless", name: "Relentless", tags: ["Strike", "Tempo"],
    text: "Every 3rd hit in your streak gives you 1 / 2 / 3 Might",
    hooks: { onHit: (b, c, s) => { const n = streakOf(c.attacker); if (n > 0 && n % 3 === 0) applyStatus(b, c.attacker, c.attacker, "might", rank(s, 1, 2, 3)); } } }
];

export const STREAK_GEAR: GearBase[] = [
  { id: "t_tally_beads", kind: "trinket", slot: "trinket", name: "Tally Beads", tags: ["Bleed", "Tempo", "Crit"],
    text: "While your hit streak is 4 or more: your hits apply 2 Bleed, heal you 1, and you have +8% Crit chance.",
    hooks: {
      onHit: (b, c) => { if (streakOf(c.attacker) >= 4) { applyStatus(b, c.attacker, c.defender, "bleed", 2); heal(b, c.attacker, 1, "Tally Beads"); } },
      modifyAttack: (b, c) => {
        // The crit chance only counts on a streak; roll it here so it follows the streak live.
        if (c.kind === "hit" && streakOf(c.attacker) >= 4 && b.rng() < 0.08) { c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; }
      }
    } }
];
