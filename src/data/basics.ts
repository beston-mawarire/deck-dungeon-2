// Everyday finds: plain, honest gear that only ever rolls as Common or Uncommon.
// They fill out the early pools so Rare and better feel like an event.
import type { GearBase, Rarity } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, hex, HIT, MISS, on, other, self, spell } from "./helpers";

const g = (onlyRarity: Rarity, d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const C = "common";
const U = "uncommon";

export const BASICS: GearBase[] = [
  // ---------- Common ----------
  g(C, { id: "g_club", kind: "weapon", slot: "main", name: "Club", tags: ["Strike"], text: "A heavy stick. Honest work.", damage: 4,
    faces: [MISS, HIT, HIT, HIT, HIT, CRIT], hooks: {} }),
  g(C, { id: "g_shortsword", kind: "weapon", slot: "main", name: "Short Sword", tags: ["Strike", "Tempo"], text: "Light; works in the off-hand.", damage: 3, offDamage: 2,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], hooks: {} }),
  g(C, { id: "g_quarterstaff", kind: "weapon", slot: "main", name: "Quarterstaff", tags: ["Guard", "Tempo"], text: "Two-handed. A 5 sweeps you into a guard (Evade).", damage: 4, twoHanded: true,
    faces: [GRAZE, HIT, HIT, HIT, spell("Sweep", "hit", self("evade", 1)), CRIT], hooks: {} }),
  g(C, { id: "g_sling", kind: "weapon", slot: "main", name: "Sling", tags: ["Crit"], text: "Two-handed. A stone to the head on a 6 dazes (Weak).", damage: 3, twoHanded: true,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Headshot", "crit", hex("weak", 1))], hooks: {} }),
  g(C, { id: "g_round_shield", kind: "off", slot: "off", name: "Round Shield", tags: ["Guard"], text: "+1 Armor. +1 more Armor while Guarding.", armor: 1,
    hooks: { onGuard: (_b, f) => { f.flags["guardArmor"] = (f.flags["guardArmor"] ?? 0) + 1; } } }),
  g(C, { id: "g_torch", kind: "off", slot: "off", name: "Torch", tags: ["Burn"], text: "On a 6: apply 1 Burn.", hooks: { face: [on(6, (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 1))] } }),
  g(C, { id: "g_hide", kind: "armour", slot: "armour", name: "Hide Armour", tags: ["Guard"], text: "+1 Armor and +2 Max HP.", armor: 1, maxHp: 2, hooks: {} }),
  g(C, { id: "g_padded_jack", kind: "armour", slot: "armour", name: "Padded Jack", tags: ["Blood"], text: "+4 Max HP.", maxHp: 4, hooks: {} }),
  g(C, { id: "g_copper_ring", kind: "trinket", slot: "trinket", name: "Copper Ring", tags: ["Gold"], text: "+1 Gold per fight won.", hooks: { onFightEnd: (b, f) => { if (b.over === "won" && f.id === "player") f.gold += 1; } } }),
  g(C, { id: "g_bone_charm", kind: "trinket", slot: "trinket", name: "Bone Charm", tags: ["Blood"], text: "+2 Max HP.", maxHp: 2, hooks: {} }),

  // ---------- Uncommon ----------
  g(U, { id: "g_bastard_sword", kind: "weapon", slot: "main", name: "Bastard Sword", tags: ["Strike", "Crit"], text: "Two-handed. A 5 is a heavy cut (+2 damage).", damage: 5, twoHanded: true,
    faces: [GRAZE, HIT, HIT, HIT, spell("Heavy Cut", "hit", (_b, c) => { c.bonus += 2; }), CRIT], hooks: {} }),
  g(U, { id: "g_war_club", kind: "weapon", slot: "main", name: "Studded Club", tags: ["Strike", "Guard"], text: "A 6 rattles them (Weak 2).", damage: 4,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Rattle", "crit", hex("weak", 2))], hooks: {} }),
  g(U, { id: "g_javelin", kind: "weapon", slot: "main", name: "Javelin", tags: ["Crit", "Tempo"], text: "Works in the off-hand. A 6 pins them (Exposed 2).", damage: 3, offDamage: 3,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Pin", "crit", hex("exposed", 2))], hooks: {} }),
  g(U, { id: "g_heater", kind: "off", slot: "off", name: "Oak Heater", tags: ["Guard"], text: "+2 Armor. Guarding gives 3 Barrier.", armor: 2,
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", 3) } }),
  g(U, { id: "g_lantern", kind: "off", slot: "off", name: "Hooded Lantern", tags: ["Hex", "Tempo"], text: "The enemy starts each fight Blind for 1 round. On a 1: heal 1.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, other(b, f), "blind", 1), face: [on(1, (b, c) => { heal(b, c.attacker, 1, "Hooded Lantern"); })] } }),
  g(U, { id: "g_ringmail", kind: "armour", slot: "armour", name: "Ring Mail", tags: ["Guard", "Blood"], text: "+2 Armor and +3 Max HP.", armor: 2, maxHp: 3, hooks: {} }),
  g(U, { id: "g_travel_cloak", kind: "armour", slot: "armour", name: "Traveller's Cloak", tags: ["Tempo", "Blood"], text: "+1 Armor. Start each fight with 2 Regen.", armor: 1,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 2) } }),
  g(U, { id: "g_iron_ring", kind: "trinket", slot: "trinket", name: "Iron Ring", tags: ["Guard"], text: "+1 Armor.", armor: 1, hooks: {} }),
  g(U, { id: "g_lucky_pebble", kind: "trinket", slot: "trinket", name: "Lucky Pebble", tags: ["Luck"], text: "Your first 1 each fight becomes a 2.",
    hooks: { modifyRoll: (_b, f, r) => { if (r === 1 && !f.flags["pebble"]) { f.flags["pebble"] = 1; return 2; } return r; } } }),
  g(U, { id: "g_whetted_ring", kind: "trinket", slot: "trinket", name: "Fighter's Band", tags: ["Strike"], text: "+1 Damage on your main die.", hooks: { stats: s => { s.damage += 1; } } })
];
