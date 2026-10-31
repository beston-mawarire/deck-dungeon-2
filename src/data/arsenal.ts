// Dodge gear (Uncommon and up), elemental weapons (Rare and up), Doom weapons (Epic and up), and Keepsakes.
import type { GearBase, HookDef } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, hex, HIT, MISS, ping, spell } from "./helpers";

// ---------- Dodge gear: a % chance to dodge a hit. Set by rarity: single digits at Uncommon, more above. ----------
export const DODGE_GEAR: GearBase[] = [
  { id: "a_duelist_coat", kind: "armour", slot: "armour", name: "Duelist's Coat", minItemRarity: "uncommon", tags: ["Tempo", "Guard"], armor: 1,
    dodge: { uncommon: 6, rare: 10, epic: 15 }, text: "+1 Armor. A cut made for moving.", hooks: {} },
  { id: "a_shadowsilk", kind: "armour", slot: "armour", name: "Shadowsilk Wraps", minItemRarity: "uncommon", tags: ["Tempo", "Strike"],
    dodge: { uncommon: 8, rare: 13, epic: 18 }, text: "No Armor. When you Dodge, gain 1 Might.",
    hooks: { onDodge: (b, c) => applyStatus(b, c.defender, c.defender, "might", 1) } },
  { id: "t_feather_charm", kind: "trinket", slot: "trinket", name: "Feather Charm", minItemRarity: "uncommon", tags: ["Tempo", "Luck"],
    dodge: { uncommon: 4, rare: 8, epic: 12 }, text: "Light as a thought.", hooks: {} },
  { id: "t_cats_eye", kind: "trinket", slot: "trinket", name: "Cat's Eye Ring", minItemRarity: "uncommon", tags: ["Tempo", "Luck"],
    dodge: { uncommon: 5, rare: 9, epic: 13 }, text: "When you Dodge, gain Focus.",
    hooks: { onDodge: (b, c) => applyStatus(b, c.defender, c.defender, "focus", 1) } },
  { id: "w_dancer_sabre", kind: "weapon", slot: "main", name: "Dancer's Sabre", minItemRarity: "uncommon", tags: ["Tempo", "Crit"], damage: 4, offDamage: 3,
    dodge: { uncommon: 3, rare: 6, epic: 9 }, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: "Crits on 5 and 6. When you Dodge, your next attack deals +3. Works in the off-hand.",
    hooks: { onDodge: (_b, c) => { c.defender.flags["sabre"] = 1; }, modifyAttack: (_b, c) => { if (c.attacker.flags["sabre"]) { c.attacker.flags["sabre"] = 0; c.bonus += 3; } } } },
  { id: "w_parrying_sai", kind: "weapon", slot: "main", name: "Parrying Sai", minItemRarity: "uncommon", tags: ["Tempo", "Guard"], damage: 2, offDamage: 2,
    dodge: { uncommon: 5, rare: 8, epic: 12 }, faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    text: "Best in the off-hand. When you Dodge, the attacker takes 3.",
    hooks: { onDodge: (b, c) => ping(b, c.attacker, 3, "Parrying Sai") } }
];

// ---------- Elemental weapons: Rare and up ----------
export const ELEMENTAL_WEAPONS: GearBase[] = [
  { id: "w_flameblade", kind: "weapon", slot: "main", name: "Flameblade", minItemRarity: "rare", tags: ["Burn", "Strike"], damage: 5,
    faces: [GRAZE, HIT, spell("Flare", "hit", hex("burn", 2)), HIT, spell("Flare", "hit", hex("burn", 3)), spell("Inferno", "crit", hex("burn", 5))],
    text: "A blade that never cools. Flares on 3 and 5, an Inferno on 6.", hooks: {} },
  { id: "w_frostbrand", kind: "weapon", slot: "main", name: "Frostbrand", minItemRarity: "rare", tags: ["Frost", "Strike"], damage: 5,
    faces: [GRAZE, HIT, spell("Rime", "hit", hex("chill", 2)), HIT, spell("Rime", "hit", hex("chill", 2)), spell("Glacier", "crit", hex("chill", 4))],
    text: "Rime on 3 and 5; a 6 is a Glacier (4 Chill — enough to set off Frostbitten).", hooks: {} },
  { id: "w_thunder_hammer", kind: "weapon", slot: "main", name: "Thunder Hammer", minItemRarity: "rare", tags: ["Storm", "Strike"], damage: 7, twoHanded: true,
    faces: [MISS, HIT, spell("Crackle", "hit", hex("static", 3)), HIT, spell("Crackle", "hit", hex("static", 3)), spell("Thunderclap", "crit", hex("shock", 1))],
    text: "Two-handed. Builds Static on 3 and 5; a 6 is a Thunderclap that sets it all off.", hooks: {} },
  { id: "w_tidebreaker", kind: "weapon", slot: "main", name: "Tidebreaker", minItemRarity: "rare", tags: ["Frost", "Storm"], damage: 6, twoHanded: true,
    faces: [GRAZE, spell("Surge", "hit", hex("soaked", 2)), HIT, spell("Surge", "hit", hex("soaked", 2)), HIT, spell("Undertow", "crit", (b, c) => { applyStatus(b, c.attacker, c.defender, "soaked", 2); applyStatus(b, c.attacker, c.defender, "chill", 2); })],
    text: "Two-handed. Soaks the enemy; a 6 is an Undertow (Soaked and Chilled: Freeze).", hooks: {} },
  { id: "w_venomfang", kind: "weapon", slot: "main", name: "Venomfang", minItemRarity: "rare", tags: ["Poison", "Crit"], damage: 4, offDamage: 3,
    faces: [GRAZE, spell("Bite", "hit", hex("poison", 2)), HIT, spell("Bite", "hit", hex("poison", 2)), HIT, spell("Venom Strike", "crit", hex("poison", 5))],
    text: "Bites on 2 and 4; a Venom Strike on 6. Works in the off-hand.", hooks: {} }
];

// ---------- Doom weapons: Epic and up ----------
export const DOOM_WEAPONS: GearBase[] = [
  { id: "w_harbinger", kind: "weapon", slot: "main", name: "Harbinger's Blade", minItemRarity: "epic", tags: ["Hex", "Kill"], damage: 6,
    faces: [GRAZE, HIT, HIT, HIT, spell("Omen", "hit", hex("doom", 3)), spell("Last Rites", "crit", hex("doom", 5))],
    text: "An Omen on 5 (3 Doom); Last Rites on 6 (5 Doom).", hooks: {} },
  { id: "w_gravebell", kind: "weapon", slot: "main", name: "Gravebell Flail", minItemRarity: "epic", tags: ["Hex", "Kill", "Strike"], damage: 6,
    faces: [MISS, HIT, HIT, HIT, HIT, CRIT], text: "Every hit tolls: 1 Doom.", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "doom", 1) } },
  { id: "w_reaper_glaive", kind: "weapon", slot: "main", name: "Reaper's Glaive", minItemRarity: "epic", tags: ["Hex", "Kill"], damage: 8, twoHanded: true,
    faces: [MISS, HIT, HIT, spell("Mark", "hit", hex("doom", 2)), HIT, spell("Harvest", "crit", hex("doom", 6))],
    text: "Two-handed. Marks on 4 (2 Doom); a 6 is the Harvest (6 Doom).", hooks: {} }
];

// ---------- More armour: heavy, medium and light, each with a twist ----------
export const ARMOUR_ADDS: GearBase[] = [
  // Heavy: lots of Armor, a cost to match.
  { id: "a_juggernaut", kind: "armour", slot: "armour", name: "Juggernaut Plate", tags: ["Guard", "Strike"], armor: 6,
    text: "Heavy: +6 Armor, −1 Damage. Guarding also gives 2 Might.", hooks: { stats: s => { s.damage -= 1; s.offDamage -= 1; }, onGuard: (b, f) => applyStatus(b, f, f, "might", 2) } },
  { id: "a_dragonbone", kind: "armour", slot: "armour", name: "Dragonbone Plate", tags: ["Guard", "Burn"], armor: 5, maxHp: 4,
    text: "Heavy: +5 Armor and +4 Max HP. You can't be Burned. Start each fight Weak for 1 round.",
    hooks: { incomingStatus: (_b, _f, s, n) => (s === "burn" ? 0 : n), onFightStart: (b, f) => applyStatus(b, null, f, "weak", 1) } },
  { id: "a_bastion_harness", kind: "armour", slot: "armour", name: "Bastion Harness", tags: ["Guard", "Thorns"], armor: 5,
    text: "Heavy: +5 Armor. While Guarding, a quarter of every hit you take is thrown back at the attacker.",
    hooks: { whenHit: (b, c) => { if (c.defender.flags["guarding"] && (c.raw ?? 0) > 0) ping(b, c.attacker, Math.ceil((c.raw ?? 0) / 4), "Bastion Harness"); } } },
  // Medium: solid Armor and a useful edge.
  { id: "a_wardens_hauberk", kind: "armour", slot: "armour", name: "Warden's Hauberk", tags: ["Guard", "Hex"], armor: 3,
    text: "Medium: +3 Armor. Start each fight with Ward.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1) } },
  { id: "a_studded_leather", kind: "armour", slot: "armour", name: "Studded Leather", tags: ["Thorns", "Bleed"], armor: 2,
    text: "Medium: +2 Armor. Attackers that hit you take 1 Bleed.", hooks: { whenHit: (b, c) => { if (c.dealt > 0) applyStatus(b, c.defender, c.attacker, "bleed", 1); } } },
  { id: "a_brigand_vest", kind: "armour", slot: "armour", name: "Brigand's Vest", tags: ["Crit", "Blood"], armor: 2,
    text: "Medium: +2 Armor. Your crits heal 2.", hooks: { onCrit: (b, c) => { heal(b, c.attacker, 2, "Brigand's Vest"); } } },
  // Light: little or no Armor, a strong trick.
  { id: "a_silk_robe", kind: "armour", slot: "armour", name: "Silk Robe", tags: ["Arcane"],
    text: "Light: no Armor. Spell Amp +15%: your spells deal 15% more.", hooks: { stats: s => { s.spellAmp += 15; } } },
  { id: "a_ranger_cloak", kind: "armour", slot: "armour", name: "Ranger's Cloak", tags: ["Crit", "Tempo"], armor: 1,
    text: "Light: +1 Armor. Your first attack each fight crits on a 5 or 6.",
    hooks: { modifyAttack: (_b, c) => { if (!c.attacker.flags["rangerShot"]) { c.attacker.flags["rangerShot"] = 1; if (c.face === 5 && c.kind === "hit") { c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; } } } } },
  { id: "a_pilgrim_habit", kind: "armour", slot: "armour", name: "Pilgrim's Habit", tags: ["Blood", "Holy"], armor: 1,
    text: "Light: +1 Armor. While you're below half HP, heal 2 at the end of every round.",
    hooks: { onRoundEnd: (b, f) => { if (f.hp > 0 && f.hp < f.maxHp / 2) heal(b, f, 2, "Pilgrim's Habit"); } } }
];

// ---------- Keepsakes: one at a time, from bosses after floor 5 ----------
const keepsake = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "keepsake", ...d });
export const KEEPSAKES: HookDef[] = [
  keepsake({ id: "ks_elements", name: "Keepsake of the Elements", tags: ["Arcane", "Burn", "Frost", "Storm"], text: "Burn, Chill, Shock, Static and Soaked you apply are 50% stronger, and reactions you cause deal 50% more",
    hooks: { reactionMult: () => 1.5 } }),
  keepsake({ id: "ks_deadeye", name: "Keepsake of the Deadeye", tags: ["Crit"], text: "Your crits deal 50% more", hooks: {} }), // combat.ts
  keepsake({ id: "ks_mercy", name: "Keepsake of Mercy", tags: ["Blood"], text: "All healing you receive, from every source, is 50% stronger", hooks: { healMult: () => 1.5 } }),
  keepsake({ id: "ks_collector", name: "Keepsake of the Collector", tags: ["Luck"], text: "Grants a third trinket slot", hooks: {} }), // hero.ts
  keepsake({ id: "ks_thornheart", name: "Keepsake of the Thornheart", tags: ["Thorns", "Guard"], text: "When you're hit, the attacker takes damage equal to your Armor",
    hooks: { whenHit: (b, c) => { if (c.defender.armor > 0) ping(b, c.attacker, c.defender.armor, "Thornheart"); } } })
];

