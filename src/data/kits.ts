// Greater starter kits: an Uncommon and a Rare version of every origin's starting item.
// They only ever roll at their own rarity, and they join the loot pool at normal odds.
import type { GearBase, Rarity } from "../engine/types";
import { applyStatus, cast, CRIT, depth, GRAZE, heal, hex, HIT, on, self, spell, st } from "./helpers";

const g = (onlyRarity: Rarity, d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const U = "uncommon";
const R = "rare";

export const KIT_UPGRADES: GearBase[] = [
  // ---------- Warrior: Iron Sword, Wooden Shield, Chain Vest ----------
  g(U, { id: "k_knights_sword", kind: "weapon", slot: "main", name: "Knight's Sword", tags: ["Strike", "Crit"], text: "A greater Iron Sword. Crits on 5 and 6.", damage: 5,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], hooks: {} }),
  g(R, { id: "k_champions_blade", kind: "weapon", slot: "main", name: "Champion's Blade", tags: ["Strike", "Crit"], text: "The finest Iron Sword. No Grazes; a 6 is Valor (crit and 2 Might).", damage: 6,
    faces: [HIT, HIT, HIT, HIT, CRIT, spell("Valor", "crit", self("might", 2))], hooks: {} }),
  g(U, { id: "k_reinforced_shield", shield: true, kind: "off", slot: "off", name: "Reinforced Shield", tags: ["Guard"], text: "A greater Wooden Shield. +2 Armor. Guarding gives Barrier equal to the floor + 2, and 1 Might.", armor: 2,
    hooks: { onGuard: (b, f) => { applyStatus(b, f, f, "barrier", depth(f) + 2); applyStatus(b, f, f, "might", 1); } } }),
  g(R, { id: "k_lionheart_shield", shield: true, kind: "off", slot: "off", name: "Lionheart Shield", tags: ["Guard", "Strike"], text: "+3 Armor. Guarding gives Barrier equal to twice the floor + 2. Hits taken while Guarding give you 1 Might.", armor: 3,
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", 2 * depth(f) + 2), whenHit: (b, c) => { if (c.defender.flags["guarding"]) applyStatus(b, c.defender, c.defender, "might", 1); } } }),
  g(U, { id: "k_fine_chain", kind: "armour", slot: "armour", name: "Fine Chain Vest", tags: ["Guard", "Blood"], text: "A greater Chain Vest. +3 Armor and +4 Max HP.", armor: 3, maxHp: 4, hooks: {} }),
  g(R, { id: "k_masterforged_mail", kind: "armour", slot: "armour", name: "Master-Forged Mail", tags: ["Guard", "Blood"], text: "+4 Armor and +6 Max HP. Start each fight with Barrier equal to your Armor.", armor: 4, maxHp: 6,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "barrier", f.armor) } }),

  // ---------- Rogue: Dagger, Throwing Knife, Leather Jerkin ----------
  g(U, { id: "k_keen_dagger", weaponType: "dagger", kind: "weapon", slot: "main", name: "Keen Dagger", tags: ["Bleed", "Crit"], text: "A greater Dagger. A 6 Guts for 3 Bleed. Works in the off-hand.", damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, spell("Gut", "crit", hex("bleed", 3))], hooks: {} }),
  g(R, { id: "k_shadowfang", weaponType: "dagger", kind: "weapon", slot: "main", name: "Shadowfang", tags: ["Bleed", "Crit"], text: "The finest Dagger. No Grazes; crits on 4, 5 and 6, and a 6 Guts for 3 Bleed. Works in the off-hand.", damage: 5, offDamage: 4,
    faces: [HIT, HIT, HIT, CRIT, CRIT, spell("Gut", "crit", hex("bleed", 3))], hooks: {} }),
  g(U, { id: "k_balanced_knives", weaponType: "throwing", kind: "weapon", slot: "main", name: "Balanced Knives", tags: ["Crit", "Tempo"], text: "Greater Throwing Knives. No misses; crits on 5 and 6. Best in the off-hand.", damage: 3, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], hooks: {} }),
  g(R, { id: "k_fan_of_knives", weaponType: "throwing", kind: "weapon", slot: "main", name: "Fan of Knives", tags: ["Crit", "Tempo", "Bleed"], text: "Crits on 4, 5 and 6; your crits apply 1 Bleed. Best in the off-hand.", damage: 3, offDamage: 4,
    faces: [HIT, HIT, HIT, CRIT, CRIT, CRIT], hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 1) } }),
  g(U, { id: "k_supple_leathers", kind: "armour", slot: "armour", name: "Supple Leathers", tags: ["Tempo", "Luck"], text: "A greater Leather Jerkin. +2 Armor. Start each fight with Evade.", armor: 2,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "evade", 1) } }),
  g(R, { id: "k_nightstalker", kind: "armour", slot: "armour", name: "Nightstalker Leathers", tags: ["Tempo", "Crit"], text: "+2 Armor. Start each fight with Evade and Focus. Your crits apply 1 Exposed.", armor: 2,
    hooks: { onFightStart: (b, f) => { applyStatus(b, f, f, "evade", 1); applyStatus(b, f, f, "focus", 1); }, onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "exposed", 1) } }),

  // ---------- Mage: Apprentice Staff, Ember Charm, Cloth Robes ----------
  g(U, { id: "k_adepts_staff", kind: "weapon", slot: "main", name: "Adept's Staff", tags: ["Arcane", "Burn", "Frost", "Storm"], text: "A greater Apprentice Staff. No Fizzle: even a 1 is a spark, and its spells hit harder.", damage: 5,
    faces: [cast("Spark", "graze", hex("burn", 1)), cast("Fire Bolt", "hit", hex("burn", 4)), HIT, cast("Frost Lance", "hit", hex("chill", 3)), HIT, cast("Arc", "crit", (b, c) => { applyStatus(b, c.attacker, c.defender, "static", 2); applyStatus(b, c.attacker, c.defender, "shock", 1); })], hooks: {} }),
  g(R, { id: "k_archmages_staff", kind: "weapon", slot: "main", name: "Archmage's Staff", tags: ["Arcane", "Burn", "Frost", "Storm"], text: "The finest Apprentice Staff. Every face is a spell.", damage: 6,
    faces: [cast("Venom Dart", "graze", hex("poison", 3)), cast("Fire Bolt", "hit", hex("burn", 4)), cast("Frost Lance", "hit", hex("chill", 3)), cast("Arc", "hit", hex("static", 3)), cast("Hex Bolt", "hit", hex("exposed", 2)),
      cast("Starfire", "crit", (b, c) => { applyStatus(b, c.attacker, c.defender, "burn", 5); applyStatus(b, c.attacker, c.defender, "shock", 1); })], hooks: {} }),
  g(U, { id: "k_ember_talisman", barrierElement: "burn", kind: "off", slot: "off", name: "Ember Talisman", tags: ["Burn", "Arcane"], text: "A greater Ember Charm. On a 2 or a 5: apply 2 Burn.",
    hooks: { face: [on(2, (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2)), on(5, (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2))] } }),
  g(R, { id: "k_heart_of_embers", barrierElement: "burn", kind: "off", slot: "off", name: "Heart of Embers", tags: ["Burn", "Arcane"], text: "On a 2 or a 5: apply 3 Burn. Burn you apply gets +1.",
    hooks: { face: [on(2, (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 3)), on(5, (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 3))],
      onStatusApplied: (_b, self_, t, s) => { if (s === "burn" && t !== self_) t.statuses.burn = st(t, "burn") + 1; } } }),
  g(U, { id: "k_woven_robes", kind: "armour", slot: "armour", name: "Woven Robes", tags: ["Arcane", "Guard"], text: "Greater Cloth Robes. +1 Armor. Start each fight with 2 Barrier per floor (+2). Burn and Chill you apply get +1.", armor: 1,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "barrier", 2 + 2 * depth(f)), onStatusApplied: (_b, _s, t, s) => { if (s === "burn" || s === "chill") t.statuses[s] = st(t, s) + 1; } } }),
  g(R, { id: "k_archmages_robes", kind: "armour", slot: "armour", name: "Archmage's Robes", tags: ["Arcane", "Guard"], text: "+1 Armor. Spell Amp +10%. Start each fight with Ward and 3 Barrier per floor (+2). Burn, Chill, Poison and Static you apply get +1.", armor: 1,
    hooks: { stats: s => { s.spellAmp += 10; }, onFightStart: (b, f) => { applyStatus(b, f, f, "ward", 1); applyStatus(b, f, f, "barrier", 2 + 3 * depth(f)); },
      onStatusApplied: (_b, self_, t, s) => { if (t !== self_ && (s === "burn" || s === "chill" || s === "poison" || s === "static")) t.statuses[s] = st(t, s) + 1; } } }),

  // ---------- Cleric: Blessed Mace, Holy Symbol, Padded Robes ----------
  g(U, { id: "k_consecrated_mace", kind: "weapon", slot: "main", name: "Consecrated Mace", tags: ["Holy", "Guard"], text: "A greater Blessed Mace. Holy. 4s and 5s bless you with Ward.", damage: 5,
    faces: [GRAZE, HIT, HIT, spell("Bless", "hit", self("ward", 1)), spell("Bless", "hit", self("ward", 1)), CRIT], hooks: {} }),
  g(R, { id: "k_mace_faithful", kind: "weapon", slot: "main", name: "Mace of the Faithful", tags: ["Holy", "Guard", "Burn"], text: "The finest Blessed Mace. Holy. No Grazes; 4s and 5s bless you (Ward); a 6 is Judgement: 3 Burn and 2 Exposed.", damage: 6,
    faces: [HIT, HIT, HIT, spell("Bless", "hit", self("ward", 1)), spell("Bless", "hit", self("ward", 1)), spell("Judgement", "crit", (b, c) => { applyStatus(b, c.attacker, c.defender, "burn", 3); applyStatus(b, c.attacker, c.defender, "exposed", 2); })], hooks: {} }),
  g(U, { id: "k_silver_symbol", kind: "off", slot: "off", name: "Silver Holy Symbol", tags: ["Holy", "Blood", "Guard"], text: "A greater Holy Symbol. Start each fight with Ward. On a 6: gain 3 Regen. On a 1: heal 2.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1), face: [on(6, (b, c) => applyStatus(b, c.attacker, c.attacker, "regen", 3)), on(1, (b, c) => { heal(b, c.attacker, 2, "Silver Holy Symbol"); })] } }),
  g(R, { id: "k_radiant_symbol", kind: "off", slot: "off", name: "Radiant Holy Symbol", tags: ["Holy", "Blood", "Guard"], text: "Start each fight with Ward. The first time your Ward blocks a status each fight, gain Ward again and 3 Regen. On a 6: gain 4 Regen.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1), face: [on(6, (b, c) => applyStatus(b, c.attacker, c.attacker, "regen", 4))],
      onWard: (b, f) => { if (!f.flags["radiant"]) { f.flags["radiant"] = 1; applyStatus(b, f, f, "ward", 1); applyStatus(b, f, f, "regen", 3); } } } }),
  g(U, { id: "k_quilted_robes", kind: "armour", slot: "armour", name: "Quilted Robes", tags: ["Blood", "Guard"], text: "Greater Padded Robes. +2 Armor. Start each fight with 3 Regen.", armor: 2,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 3) } }),
  g(R, { id: "k_saints_robes", kind: "armour", slot: "armour", name: "Saint's Robes", tags: ["Blood", "Guard", "Holy"], text: "+2 Armor and +6 Max HP. Start each fight with 4 Regen. Healing you receive +25%.", armor: 2, maxHp: 6,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 4), healMult: () => 1.25 } })
];
