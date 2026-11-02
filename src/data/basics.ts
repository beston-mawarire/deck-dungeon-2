// Everyday finds: plain, honest gear that only ever rolls as Common or Uncommon.
// They fill out the early pools so Rare and better feel like an event.
import type { GearBase, Rarity } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, hex, HIT, MISS, on, other, self, spell } from "./helpers";
import type { FaceSpec } from "../engine/types";

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
  g(C, { id: "g_round_shield", shield: true, kind: "off", slot: "off", name: "Round Shield", tags: ["Guard"], text: "+1 Armor. +1 more Armor while Guarding.", armor: 1,
    hooks: { onGuard: (_b, f) => { f.flags["guardArmor"] = (f.flags["guardArmor"] ?? 0) + 1; } } }),
  g(C, { id: "g_torch", kind: "off", slot: "off", name: "Torch", tags: ["Burn"], text: "On a 6: apply 1 Burn.", hooks: { face: [on(6, (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 1))] } }),
  g(C, { id: "g_hide", kind: "armour", slot: "armour", name: "Hide Armour", tags: ["Guard"], text: "+1 Armor and +2 Max HP.", armor: 1, maxHp: 2, hooks: {} }),
  g(C, { id: "g_padded_jack", kind: "armour", slot: "armour", name: "Padded Jack", tags: ["Blood"], text: "+4 Max HP.", maxHp: 4, hooks: {} }),
  g(C, { id: "g_copper_ring", kind: "trinket", slot: "trinket", name: "Copper Ring", tags: ["Gold"], text: "+1 Gold per fight won.", hooks: { onFightEnd: (b, f) => { if (b.over === "won" && f.id === "player") f.gold += 1; } } }),
  g(C, { id: "g_bone_charm", kind: "trinket", slot: "trinket", name: "Bone Charm", tags: ["Blood"], text: "+2 Max HP.", maxHp: 2, hooks: {} }),
  // More Commons, for variety early on (and for Class Mastery starting kits).
  g(C, { id: "g_hatchet", kind: "weapon", slot: "main", name: "Woodsman's Hatchet", tags: ["Strike", "Bleed"], text: "A 6 bites deep (Bleed 1).", damage: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Bite", "crit", hex("bleed", 1))], hooks: {} }),
  g(C, { id: "g_boar_spear", kind: "weapon", slot: "main", name: "Boar Spear", tags: ["Strike", "Crit"], text: "A 6 pins them (Exposed 1).", damage: 4,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Pin", "crit", hex("exposed", 1))], hooks: {} }),
  g(C, { id: "g_butcher_knife", weaponType: "dagger", kind: "weapon", slot: "main", name: "Butcher's Knife", tags: ["Crit", "Tempo"], text: "Crits on 5 and 6. Works in the off-hand.", damage: 2, offDamage: 2,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], hooks: {} }),
  g(C, { id: "g_chain_flail", kind: "weapon", slot: "main", name: "Chain Flail", tags: ["Strike"], text: "Wild swings: misses on 1 and 2, but hits hard.", damage: 6,
    faces: [MISS, MISS, HIT, HIT, HIT, CRIT], hooks: {} }),
  g(C, { id: "g_cracked_wand", kind: "weapon", slot: "main", name: "Cracked Wand", tags: ["Arcane", "Storm"], text: "A 6 lets loose a spark (Shock 1).", damage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Spark", "hit", hex("shock", 1))], hooks: {} }),
  g(C, { id: "g_pilgrim_cane", kind: "weapon", slot: "main", name: "Pilgrim's Cane", tags: ["Blood", "Guard"], text: "On a 1: heal 1.", damage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], hooks: { face: [on(1, (b, c) => { heal(b, c.attacker, 1, "Pilgrim's Cane"); })] } }),
  g(C, { id: "g_pot_lid", shield: true, kind: "off", slot: "off", name: "Pot Lid", tags: ["Guard", "Blood"], text: "+1 Armor. Guarding heals 1.", armor: 1,
    hooks: { onGuard: (b, f) => { heal(b, f, 1, "Pot Lid"); } } }),
  g(C, { id: "g_smoke_stick", kind: "off", slot: "off", name: "Smoke Stick", tags: ["Tempo"], text: "Start each fight with 1 Evade.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "evade", 1) } }),
  g(C, { id: "g_prayer_card", kind: "off", slot: "off", name: "Prayer Card", tags: ["Holy", "Blood"], text: "Start each fight with 1 Regen.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 1) } }),
  g(C, { id: "g_scrap_mail", kind: "armour", slot: "armour", name: "Scrap Mail", tags: ["Guard"], text: "+2 Armor. Rattles a lot.", armor: 2, hooks: {} }),
  g(C, { id: "g_fur_cloak", kind: "armour", slot: "armour", name: "Fur Cloak", tags: ["Blood"], text: "+3 Max HP. Start each fight with 1 Regen.", maxHp: 3,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 1) } }),
  g(C, { id: "g_rough_robe", kind: "armour", slot: "armour", name: "Rough Robe", tags: ["Tempo", "Arcane"], text: "+2 Max HP and +3% Dodge.", maxHp: 2, hooks: { stats: s => { s.dodge += 3; } } }),
  g(C, { id: "g_rabbit_foot", kind: "trinket", slot: "trinket", name: "Rabbit's Foot", tags: ["Luck", "Crit"], text: "+3% Crit chance.", hooks: { stats: s => { s.critChance += 3; } } }),
  g(C, { id: "g_whetstone", kind: "trinket", slot: "trinket", name: "Whetstone", tags: ["Strike"], text: "Your first attack each fight deals +2.",
    hooks: { modifyAttack: (_b, c) => { if (c.attacker.id === "player" && !c.attacker.flags["whet"]) { c.attacker.flags["whet"] = 1; c.bonus += 2; } } } }),

  // ---------- Uncommon ----------
  g(U, { id: "g_bastard_sword", kind: "weapon", slot: "main", name: "Bastard Sword", tags: ["Strike", "Crit"], text: "Two-handed. A 5 is a heavy cut (+2 damage).", damage: 5, twoHanded: true,
    faces: [GRAZE, HIT, HIT, HIT, spell("Heavy Cut", "hit", (_b, c) => { c.bonus += 2; }), CRIT], hooks: {} }),
  g(U, { id: "g_war_club", kind: "weapon", slot: "main", name: "Studded Club", tags: ["Strike", "Guard"], text: "A 6 rattles them (Weak 2).", damage: 4,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Rattle", "crit", hex("weak", 2))], hooks: {} }),
  g(U, { id: "g_javelin", kind: "weapon", slot: "main", name: "Javelin", tags: ["Crit", "Tempo"], text: "Works in the off-hand. A 6 pins them (Exposed 2).", damage: 3, offDamage: 3,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Pin", "crit", hex("exposed", 2))], hooks: {} }),
  g(U, { id: "g_heater", shield: true, kind: "off", slot: "off", name: "Oak Heater", tags: ["Guard"], text: "+2 Armor. Guarding gives 3 Barrier.", armor: 2,
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

// ---------- Plain but strong: Uncommon and Rare gear with no special effects, just good numbers ----------
const PLAIN: FaceSpec[] = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const SOLID: FaceSpec[] = [HIT, HIT, HIT, HIT, HIT, CRIT];
const KEEN: FaceSpec[] = [GRAZE, HIT, HIT, HIT, CRIT, CRIT];
const R = "rare";
const dmg = (n: number) => ({ stats: (s: { damage: number; offDamage: number }) => { s.damage += n; s.offDamage += n; } });

export const STAT_GEAR: GearBase[] = [
  // Weapons
  g(U, { id: "s_arming_sword", kind: "weapon", slot: "main", name: "Arming Sword", tags: ["Strike"], text: "Well balanced. Nothing fancy.", damage: 5, faces: PLAIN, hooks: {} }),
  g(U, { id: "s_war_axe", kind: "weapon", slot: "main", name: "Bearded Axe", tags: ["Strike"], text: "Heavy head, honest swing.", damage: 6, faces: [MISS, HIT, HIT, HIT, HIT, CRIT], hooks: {} }),
  g(U, { id: "s_stiletto", weaponType: "dagger", kind: "weapon", slot: "main", name: "Stiletto", tags: ["Crit"], text: "Crits on 5 and 6. Works in the off-hand.", damage: 3, offDamage: 3, faces: KEEN, hooks: {} }),
  g(R, { id: "s_masterwork_blade", kind: "weapon", slot: "main", name: "Masterwork Blade", tags: ["Strike"], text: "No Grazes. Superb steel.", damage: 6, faces: SOLID, hooks: {} }),
  g(R, { id: "s_greataxe", kind: "weapon", slot: "main", name: "Greataxe", tags: ["Strike"], text: "Two-handed. Enormous.", damage: 9, twoHanded: true, faces: [MISS, HIT, HIT, HIT, HIT, CRIT], hooks: {} }),
  g(R, { id: "s_duelling_blade", kind: "weapon", slot: "main", name: "Duelling Blade", tags: ["Crit"], text: "No Grazes; crits on 5 and 6. Works in the off-hand.", damage: 5, offDamage: 4, faces: [HIT, HIT, HIT, HIT, CRIT, CRIT], hooks: {} }),
  // Off-hands
  g(U, { id: "s_iron_buckler", kind: "off", slot: "off", name: "Iron Buckler", shield: true, tags: ["Guard"], text: "+2 Armor.", armor: 2, hooks: {} }),
  g(U, { id: "s_parrying_knife", weaponType: "dagger", kind: "weapon", slot: "main", name: "Parrying Knife", tags: ["Tempo"], text: "A plain second blade. Best in the off-hand.", damage: 2, offDamage: 3, faces: PLAIN, hooks: {} }),
  g(U, { id: "s_steel_kite", kind: "off", slot: "off", name: "Steel Kite Shield", shield: true, tags: ["Guard"], text: "+3 Armor.", armor: 3, hooks: {} }),
  g(R, { id: "s_great_shield", kind: "off", slot: "off", name: "Great Shield", shield: true, tags: ["Guard"], text: "+5 Armor.", armor: 5, hooks: {} }),
  g(R, { id: "s_offhand_saber", kind: "weapon", slot: "main", name: "Offhand Sabre", tags: ["Strike"], text: "No Grazes. Best in the off-hand.", damage: 3, offDamage: 5, faces: SOLID, hooks: {} }),
  g(R, { id: "s_bulwark_shield", kind: "off", slot: "off", name: "Bulwark Shield", shield: true, tags: ["Guard", "Blood"], text: "+4 Armor and +5 Max HP.", armor: 4, maxHp: 5, hooks: {} }),
  // Armours
  g(U, { id: "s_brigandine_coat", kind: "armour", slot: "armour", name: "Brigandine Coat", tags: ["Guard"], text: "+3 Armor and +3 Max HP.", armor: 3, maxHp: 3, hooks: {} }),
  g(U, { id: "s_laminar", kind: "armour", slot: "armour", name: "Laminar Armour", tags: ["Guard"], text: "+4 Armor.", armor: 4, hooks: {} }),
  g(U, { id: "s_quilted_coat", kind: "armour", slot: "armour", name: "Quilted Coat", tags: ["Blood"], text: "+1 Armor and +8 Max HP.", armor: 1, maxHp: 8, hooks: {} }),
  g(R, { id: "s_full_plate", kind: "armour", slot: "armour", name: "Full Plate", tags: ["Guard"], text: "+6 Armor and +4 Max HP.", armor: 6, maxHp: 4, hooks: {} }),
  g(R, { id: "s_mithril_shirt", kind: "armour", slot: "armour", name: "Mithril Shirt", tags: ["Guard"], text: "+4 Armor and +6 Max HP. Light as cloth.", armor: 4, maxHp: 6, hooks: {} }),
  g(R, { id: "s_champions_mail", kind: "armour", slot: "armour", name: "Champion's Mail", tags: ["Guard", "Blood"], text: "+5 Armor and +10 Max HP.", armor: 5, maxHp: 10, hooks: {} }),
  // Trinkets
  g(U, { id: "s_silver_ring", kind: "trinket", slot: "trinket", name: "Silver Ring", tags: ["Strike"], text: "+1 Damage.", hooks: dmg(1) }),
  g(U, { id: "s_garnet_amulet", kind: "trinket", slot: "trinket", name: "Garnet Amulet", tags: ["Blood"], text: "+7 Max HP.", maxHp: 7, hooks: {} }),
  g(U, { id: "s_steel_bracelet", kind: "trinket", slot: "trinket", name: "Steel Bracelet", tags: ["Guard"], text: "+2 Armor.", armor: 2, hooks: {} }),
  g(R, { id: "s_gold_signet", kind: "trinket", slot: "trinket", name: "Gold Signet", tags: ["Strike"], text: "+2 Damage.", hooks: dmg(2) }),
  g(R, { id: "s_heartstone", kind: "trinket", slot: "trinket", name: "Heartstone", tags: ["Blood"], text: "+12 Max HP.", maxHp: 12, hooks: {} }),
  g(R, { id: "s_warriors_torc", kind: "trinket", slot: "trinket", name: "Veteran's Torc", tags: ["Strike", "Guard"], text: "+1 Damage, +2 Armor and +4 Max HP.", armor: 2, maxHp: 4, hooks: dmg(1) })
];
