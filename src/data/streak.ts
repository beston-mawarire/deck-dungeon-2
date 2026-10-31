// Hit streak gear: the streak counts every Hit or Crit that gets through, across the whole run.
// A Miss, a Graze, or an attack that's evaded, dodged or fully blocked resets it to 0.
import { streakOf } from "../engine/combat";
import type { GearBase, HookDef } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, MISS } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];

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

/** More streak gear: two of each item type, across the rarities. Every one of them unlocks the streak. */
export const STREAK_GEAR_2: GearBase[] = [
  // Weapons
  only("uncommon", { id: "sk_rapier", kind: "weapon", slot: "main", name: "Duelist's Rapier", tags: ["Strike", "Tempo"], damage: 4, faces: PLAIN,
    text: "Unlocks the hit streak. While your streak is 3 or more, its Hits deal +2.",
    hooks: { modifyAttack: (_b, c) => { if (!c.offhand && streakOf(c.attacker) >= 3) c.bonus += 2; } } }),
  only("epic", { id: "sk_chainblade", kind: "weapon", slot: "main", name: "Chainblade", tags: ["Strike", "Crit", "Tempo"], damage: 7, faces: [MISS, HIT, HIT, HIT, HIT, CRIT],
    text: "Unlocks the hit streak. Every 5th hit in your streak is a Crit.",
    hooks: { modifyAttack: (_b, c) => { if (!c.offhand && c.kind === "hit" && (streakOf(c.attacker) + 1) % 5 === 0) { c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; } } } }),
  // Off-hands
  only("rare", { id: "sk_metronome", kind: "off", slot: "off", shield: true, name: "Metronome Buckler", tags: ["Guard", "Tempo"], armor: 2,
    text: "Shield. +2 Armor. Unlocks the hit streak. While your streak is 4 or more, each hit you land gives 2 Barrier.",
    hooks: { onHit: (b, c) => { if (streakOf(c.attacker) >= 4) applyStatus(b, c.attacker, c.attacker, "barrier", 2); } } }),
  { id: "lx_hourglass", rarity: "legendary", kind: "off", slot: "off", name: "Hourglass of Momentum", tags: ["Tempo", "Strike"],
    legendary: { minFloor: 3, asBase: "o_war_banner", reveal: "Unlocks the hit streak. A broken streak only drops to half. At 6 or more, your hits deal +4." },
    text: "The sand falls up, as long as you keep swinging.",
    hooks: { modifyAttack: (_b, c) => { if (streakOf(c.attacker) >= 6) c.bonus += 4; } } },
  // Armour
  only("uncommon", { id: "sk_fencer_jacket", kind: "armour", slot: "armour", name: "Fencer's Jacket", tags: ["Tempo", "Blood"], armor: 1, dodge: { uncommon: 4 },
    text: "Light: +1 Armor and a little Dodge. Unlocks the hit streak. While your streak is 3 or more, each hit you land heals 1.",
    hooks: { onHit: (b, c) => { if (streakOf(c.attacker) >= 3) heal(b, c.attacker, 1, "Fencer's Jacket"); } } }),
  only("epic", { id: "sk_rhythm_plate", kind: "armour", slot: "armour", name: "Rhythm Plate", tags: ["Guard", "Strike", "Tempo"], armor: 5,
    text: "Heavy: +5 Armor. Unlocks the hit streak. Every 4th hit in your streak gives you 3 Barrier and 1 Might.",
    hooks: { onHit: (b, c) => { const n = streakOf(c.attacker); if (n > 0 && n % 4 === 0) { applyStatus(b, c.attacker, c.attacker, "barrier", 3); applyStatus(b, c.attacker, c.attacker, "might", 1); } } } }),
  // Trinkets
  only("rare", { id: "sk_rosary", kind: "trinket", slot: "trinket", name: "Rosary of Rhythm", tags: ["Hex", "Tempo"],
    text: "Unlocks the hit streak. Every 3rd hit in your streak applies 2 Exposed.",
    hooks: { onHit: (b, c) => { const n = streakOf(c.attacker); if (n > 0 && n % 3 === 0) applyStatus(b, c.attacker, c.defender, "exposed", 2); } } }),
  { id: "cx_unending_tally", rarity: "crimson", kind: "trinket", slot: "trinket", name: "The Unending Tally", tags: ["Strike", "Tempo"],
    text: "Unlocks the hit streak. Your hits deal +1 for every hit in your streak (up to +10). A broken streak only drops to half.",
    hooks: { modifyAttack: (_b, c) => { c.bonus += Math.min(10, streakOf(c.attacker)); } } }
];
