// Status robes: light armour for status builds. "Status damage" makes Burn, Bleed, Poison and Static
// on the enemy hurt more; "reactions" multiplies the damage of reactions you cause. Normal drop odds.
import type { GearBase } from "../engine/types";
import { applyStatus, other } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const robe = { kind: "armour" as const, slot: "armour" as const };

export const ROBES: GearBase[] = [
  // Uncommon
  only("uncommon", { ...robe, id: "rb_hexweave", name: "Hexweave Robe", tags: ["Arcane", "Hex"], armor: 1, text: "Light: +1 Armor. Status damage +15%.",
    hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 15; } } }),
  only("uncommon", { ...robe, id: "rb_alchemist", name: "Alchemist's Robe", tags: ["Arcane", "Poison"], armor: 1, text: "Light: +1 Armor. Reactions you cause deal +20%.",
    hooks: { reactionMult: () => 1.2 } }),
  // Rare
  only("rare", { ...robe, id: "rb_ember_rime", name: "Robe of Ember and Rime", tags: ["Arcane", "Burn", "Frost"], armor: 1, text: "Light: +1 Armor. Status damage +20%. Reactions you cause deal +25%.",
    hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 20; }, reactionMult: () => 1.25 } }),
  only("rare", { ...robe, id: "rb_plaguewoven", name: "Plaguewoven Robe", tags: ["Poison", "Bleed"], armor: 1, text: "Light: +1 Armor. Status damage +30%. Poison and Bleed you apply get +1.",
    hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 30; },
      onStatusApplied: (_b, self, t, s) => { if ((s === "poison" || s === "bleed") && t !== self) t.statuses[s] = (t.statuses[s] ?? 0) + 1; } } }),
  // Epic
  only("epic", { ...robe, id: "rb_archmage", name: "Archmage's Vestments", tags: ["Arcane", "Hex"], armor: 2, text: "Light: +2 Armor. Spell Amp +10%. Status damage +30%. Reactions you cause deal +40%.",
    hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 30; s.spellAmp += 10; }, reactionMult: () => 1.4 } }),
  only("epic", { ...robe, id: "rb_cascade", name: "Robe of Cascades", tags: ["Arcane", "Storm", "Frost"], armor: 2, text: "Light: +2 Armor. Status damage +20%. Reactions you cause deal +60%.",
    hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 20; }, reactionMult: () => 1.6 } })
];

export const ROBE_LEGENDARIES: GearBase[] = [
  { ...robe, id: "lx_mantle_unmaking", rarity: "legendary", name: "Mantle of the Unmaking", tags: ["Arcane", "Hex", "Burn", "Poison"], armor: 2,
    legendary: { minFloor: 3, asBase: "a_cloth", reveal: "Light: +2 Armor. Status damage +60%. Reactions you cause deal +60%. Every fight, the enemy starts with 2 Burn and 2 Poison." },
    text: "Woven from the threads of things that stopped existing.",
    hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 60; }, reactionMult: () => 1.6,
      onFightStart: (b, f) => { const e = other(b, f); applyStatus(b, f, e, "burn", 2); applyStatus(b, f, e, "poison", 2); } } }
];

export const ROBE_CRIMSON: GearBase[] = [
  { ...robe, id: "cx_crimson_shroud", rarity: "crimson", name: "Shroud of the Crimson Tide", tags: ["Blood", "Bleed", "Hex"], armor: 3, maxHp: 10,
    text: "Light: +3 Armor, +10 Max HP. Status damage doubled. Reactions you cause deal double. Bleed you apply gets +1.",
    hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 100; }, reactionMult: () => 2,
      onStatusApplied: (_b, self, t, s) => { if (s === "bleed" && t !== self) t.statuses.bleed = (t.statuses.bleed ?? 0) + 1; } } }
];
