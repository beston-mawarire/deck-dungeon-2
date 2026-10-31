// More shields at every rarity (normal drop odds for their rarity).
import type { GearBase } from "../engine/types";
import { applyStatus, heal, ping } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const sh = { kind: "off" as const, slot: "off" as const, shield: true };
const guarding = (f: { flags: Record<string, number> }) => !!f.flags["guarding"];

export const SHIELDS: GearBase[] = [
  // Common
  only("common", { ...sh, id: "sh_hide", name: "Hide Shield", tags: ["Guard", "Blood"], armor: 1, text: "+1 Armor. Guarding gives 1 Regen.",
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "regen", 1) } }),
  only("common", { ...sh, id: "sh_iron_rim", name: "Iron-Rimmed Shield", tags: ["Guard"], armor: 2, text: "+2 Armor.", hooks: {} }),
  // Uncommon
  only("uncommon", { ...sh, id: "sh_spiked_targe", name: "Spiked Targe", tags: ["Guard", "Thorns", "Bleed"], armor: 2, text: "+2 Armor. While Guarding, attackers that hit you take 2 and get 1 Bleed.",
    hooks: { whenHit: (b, c) => { if (guarding(c.defender) && c.attacker.hp > 0) { ping(b, c.attacker, 2, "Spiked Targe"); applyStatus(b, c.defender, c.attacker, "bleed", 1); } } } }),
  only("uncommon", { ...sh, id: "sh_ward", name: "Ward Shield", tags: ["Guard", "Holy"], armor: 2, text: "+2 Armor. Guarding gives Ward.",
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "ward", 1) } }),
  // Rare
  only("rare", { ...sh, id: "sh_thornwall", name: "Thornwall", tags: ["Guard", "Thorns"], armor: 4, text: "+4 Armor. Guarding gives 3 Spikes.",
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "spikes", 3) } }),
  only("rare", { ...sh, id: "sh_sentinel", name: "Sentinel Shield", tags: ["Guard", "Strike"], armor: 3, text: "+3 Armor. After you Guard, your next Hit deals +3.",
    hooks: { onGuard: (_b, f) => { f.flags["sentinel"] = 1; }, modifyAttack: (_b, c) => { if (!c.offhand && c.attacker.flags["sentinel"]) { c.attacker.flags["sentinel"] = 0; c.bonus += 3; } } } }),
  // Epic
  only("epic", { ...sh, id: "sh_stormguard", name: "Stormguard Shield", tags: ["Guard", "Storm"], armor: 4, text: "+4 Armor. Guarding gives 2 Charged (your next hit +2 per stack, and it adds Static).",
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "charged", 2) } }),
  only("epic", { ...sh, id: "sh_oathkeeper", name: "Oathkeeper", tags: ["Guard", "Blood"], armor: 5, maxHp: 8, text: "+5 Armor and +8 Max HP. Guarding heals 3.",
    hooks: { onGuard: (b, f) => { heal(b, f, 3, "Oathkeeper"); } } })
];

export const SHIELD_LEGENDARIES: GearBase[] = [
  { ...sh, id: "lx_last_wall", rarity: "legendary", name: "The Last Wall", tags: ["Guard", "Strike", "Thorns"], armor: 5,
    legendary: { minFloor: 3, asBase: "o_tower_shield", reveal: "+5 Armor. While Guarding, every hit you take gives you 2 Might and hits its attacker for 4." },
    text: "Everything behind it is still standing.",
    hooks: { whenHit: (b, c) => { if (guarding(c.defender) && !c.noDamage) { applyStatus(b, c.defender, c.defender, "might", 2); if (c.attacker.hp > 0) ping(b, c.attacker, 4, "The Last Wall"); } } } }
];

export const SHIELD_CRIMSON: GearBase[] = [
  { ...sh, id: "cx_bloodwall", rarity: "crimson", name: "Bloodwall", tags: ["Guard", "Blood", "Bleed"], armor: 8, maxHp: 10,
    text: "+8 Armor and +10 Max HP. Guarding gives Barrier equal to a quarter of your missing HP. While Guarding, attackers that hit you get 3 Bleed.",
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", Math.ceil((f.maxHp - f.hp) / 4)),
      whenHit: (b, c) => { if (guarding(c.defender) && c.attacker.hp > 0) applyStatus(b, c.defender, c.attacker, "bleed", 3); } } }
];
