// The class Legendaries (1.96): six for each class, three for each of its two ways to play.
//   Warrior: the Bulwark (shield, Guard, Armor) and the Berserker (two blades or a big one, War Cry, Might).
//   Rogue:   the Duelist (Dodge and Counter) and the Assassin (Poison, Bleed and first strikes).
//   Mage:    the Elementalist (statuses and reactions) and the Arcanist (Mana, Barrier and raw spells).
//   Cleric:  the Penitent (taking hits and paying them back) and the Zealot (Regen, healing and holy wrath).
// Plus twelve Epic powers that lean the same ways.
import type { GearBase, HookDef, Fighter } from "../engine/types";
import { applyStatus, heal, ping, CRIT, GRAZE, HIT, MISS } from "./helpers";
import { st } from "../engine/statuses";
import { log } from "../engine/registry";
import { isUnholy } from "../engine/combat";

const L = (d: Omit<GearBase, "rarity">): GearBase => ({ ...d, rarity: "legendary" });
const epic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "epic", rarity: "epic", ...d });
const foeOf = (b: { player: Fighter; enemy: Fighter }, f: Fighter) => (f === b.player ? b.enemy : b.player);

export const CLASS_LEGENDARIES: GearBase[] = [
  // ---------- Warrior: the Bulwark ----------
  L({ id: "lw_aegis_unmoved", kind: "off", slot: "off", shield: true, name: "Aegis of the Unmoved", tags: ["Guard", "Strike"], armor: 4, forClass: "warrior",
    legendary: { minFloor: 1, asBase: "o_tower_shield", reveal: "+4 Armor. Guarding gives 2 Reinforced, and your next attack after Guarding deals +50%." },
    text: "It has never once been moved.",
    hooks: { onGuard: (b, f) => { applyStatus(b, f, f, "reinforced", 2); f.flags["aegisNext"] = 1; },
      modifyAttack: (_b, c) => { if (c.attacker.flags["aegisNext"] && !c.offhand) { c.attacker.flags["aegisNext"] = 0; c.mult *= 1.5; } } } }),
  L({ id: "lw_bastion_plate", kind: "armour", slot: "armour", name: "Bastion Plate", tags: ["Guard"], armor: 6, forClass: "warrior",
    legendary: { minFloor: 2, asBase: "a_plate", reveal: "+6 Armor. Every round you Guard: +1 Armor for the rest of the fight (up to +6)." },
    text: "Each dent is a lesson it kept.",
    hooks: { onGuard: (_b, f) => { if ((f.flags["bastion"] ?? 0) < 6) { f.flags["bastion"] = (f.flags["bastion"] ?? 0) + 1; f.armor += 1; } } } }),
  L({ id: "lw_oathkeeper_torc", kind: "trinket", slot: "trinket", name: "Oathkeeper's Torc", tags: ["Guard", "Strike"], forClass: "warrior",
    legendary: { minFloor: 3, asBase: "t_ring_might", reveal: "Your Hits and Crits deal +1 Damage for every 4 Armor you wear (on top of the Warrior's own)." },
    text: "Sworn to the wall, and paid in steel.",
    hooks: { modifyAttack: (_b, c) => { if (c.kind === "hit" || c.kind === "crit") c.bonus += Math.floor(c.attacker.armor / 4); } } }),
  // ---------- Warrior: the Berserker ----------
  L({ id: "lw_twinfang", kind: "weapon", slot: "main", name: "Twinfang Cleaver", tags: ["Strike", "Bleed"], damage: 5, forClass: "warrior",
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    legendary: { minFloor: 1, asBase: "w_axe", reveal: "Two crit faces. Every hit gives 1 Might; with 6 Might or more, your crits Bleed 3." },
    text: "Its twin is buried in something that deserved it.",
    hooks: { onHit: (b, c) => { applyStatus(b, c.attacker, c.attacker, "might", 1); }, onCrit: (b, c) => { if (st(c.attacker, "might") >= 6) applyStatus(b, c.attacker, c.defender, "bleed", 3); } } }),
  L({ id: "lw_horn_of_ruin", kind: "trinket", slot: "trinket", name: "Horn of Ruin", tags: ["Strike", "Tempo"], forClass: "warrior",
    legendary: { minFloor: 2, asBase: "t_brass_amulet", reveal: "Your first War Cry each fight costs no Mana and gives 2 Haste." },
    text: "Every army it called is gone. The horn remembers them all.",
    hooks: { onSkill: (b, f, skill) => { if (skill === "warcry" && !f.flags["ruinHorn"]) { f.flags["ruinHorn"] = 1; f.mana = Math.min(f.maxMana ?? 3, (f.mana ?? 0) + 1); applyStatus(b, f, f, "haste", 2); log(b, "The Horn of Ruin answers: that War Cry was free."); } } } }),
  L({ id: "lw_berserker_hide", kind: "armour", slot: "armour", name: "Berserker's Hide", tags: ["Strike", "Blood"], armor: 1, forClass: "warrior",
    legendary: { minFloor: 3, asBase: "a_padded", reveal: "+1 Armor. You deal 25% more. Below half HP, gain 2 Might at the start of every round." },
    text: "Whatever wore it first is still angry.",
    hooks: { stats: s => { s.dmgDealt = (s.dmgDealt ?? 0) + 25; }, onRoundStart: (b, f) => { if (f.hp < f.maxHp / 2) applyStatus(b, f, f, "might", 2); } } }),

  // ---------- Rogue: the Duelist ----------
  L({ id: "lr_mirrorstep", kind: "weapon", slot: "main", name: "Mirrorstep", tags: ["Tempo", "Crit"], damage: 3, forClass: "rogue",
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 1, asBase: "w_dagger", reveal: "Dodge a hit and your next attack strikes for double." },
    text: "Where you were, it was already.",
    hooks: { onDodge: (_b, c) => { c.defender.flags["mirrorstep"] = 1; }, modifyAttack: (_b, c) => { if (c.attacker.flags["mirrorstep"] && !c.offhand && !c.noDamage) { c.attacker.flags["mirrorstep"] = 0; c.mult *= 2; } } } }),
  L({ id: "lr_whisperweave", kind: "armour", slot: "armour", name: "Whisperweave", tags: ["Tempo"], armor: 1, forClass: "rogue",
    legendary: { minFloor: 2, asBase: "a_cloth", reveal: "+1 Armor, +8% Dodge. Every dodge gives 1 Evade (once a round)." },
    text: "Spun from the hush before a blade lands.",
    hooks: { stats: s => { s.dodge += 8; }, onDodge: (b, c) => { const f = c.defender; if (f.flags["weave"] !== b.round) { f.flags["weave"] = b.round; applyStatus(b, f, f, "evade", 1); } } } }),
  L({ id: "lr_riposte_charm", kind: "trinket", slot: "trinket", name: "Riposte Charm", tags: ["Tempo", "Crit"], forClass: "rogue",
    legendary: { minFloor: 3, asBase: "t_lucky_coin", reveal: "Counter's strike back also Blinds the foe and heals you 3." },
    text: "A coin that always lands on the other side.",
    hooks: { onSkill: (b, f, skill) => { if (skill === "counter_hit") { applyStatus(b, f, foeOf(b, f), "blind", 1); heal(b, f, 3, "Riposte Charm"); } } } }),
  // ---------- Rogue: the Assassin ----------
  L({ id: "lr_vipers_kiss", kind: "weapon", slot: "main", name: "Viper's Kiss", tags: ["Poison", "Crit"], damage: 3, forClass: "rogue",
    faces: [MISS, HIT, HIT, HIT, CRIT, CRIT],
    legendary: { minFloor: 1, asBase: "w_dagger", reveal: "Two crit faces. Every hit Poisons 2; against a Poisoned foe, your crits deal +50%." },
    text: "It only ever needed one.",
    hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 2), modifyAttack: (_b, c) => { if (c.kind === "crit" && st(c.defender, "poison") > 0) c.mult *= 1.5; } } }),
  L({ id: "lr_nightshade_vial", kind: "trinket", slot: "trinket", name: "Nightshade Vial", tags: ["Poison", "Tempo"], forClass: "rogue",
    legendary: { minFloor: 2, asBase: "t_brass_amulet", reveal: "Your first hit each fight Poisons the foe for twice your Damage." },
    text: "Three drops. Two too many.",
    hooks: { onHit: (b, c) => { if (!c.attacker.flags["nightshade"]) { c.attacker.flags["nightshade"] = 1; applyStatus(b, c.attacker, c.defender, "poison", Math.max(2, 2 * c.attacker.damage)); } } } }),
  L({ id: "lr_shadowsilk", kind: "armour", slot: "armour", name: "Shadowsilk Wraps", tags: ["Crit", "Bleed"], armor: 1, forClass: "rogue",
    legendary: { minFloor: 3, asBase: "a_padded", reveal: "+1 Armor. In a fight's first two rounds, one roll in five becomes a 6; every crit Bleeds 2." },
    text: "Wear them once and you'll never be seen arriving.",
    hooks: { modifyRoll: (b, f, roll) => (b.round <= 2 && f === b.player && roll < 6 && b.rng() < 0.2 ? 6 : roll), onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 2) } }),

  // ---------- Mage: the Elementalist ----------
  L({ id: "lm_prism_of_ruin", kind: "off", slot: "off", name: "Prism of Ruin", tags: ["Arcane", "Hex"], forClass: "mage",
    legendary: { minFloor: 1, asBase: "o_ember_charm", reveal: "Reactions deal 40% more, and the first reaction each round gives back 1 Mana." },
    text: "It splits the light into things that hurt.",
    hooks: { reactionMult: () => 1.4, onSkill: (b, f, skill) => { if (skill === "reaction" && f.flags["prismMana"] !== b.round) { f.flags["prismMana"] = b.round; f.mana = Math.min(f.maxMana ?? 3, (f.mana ?? 0) + 1); } } } }),
  L({ id: "lm_stormglass_robe", kind: "armour", slot: "armour", name: "Stormglass Robe", tags: ["Arcane", "Storm"], armor: 1, forClass: "mage",
    legendary: { minFloor: 2, asBase: "a_cloth", reveal: "+1 Armor. Every third status you put on a foe lands twice." },
    text: "It hums when the weather is about to turn.",
    hooks: { onStatusApplied: (b, f, t, status, n) => { if (t === f || f.flags["glassBusy"]) return; f.flags["glassN"] = (f.flags["glassN"] ?? 0) + 1; if (f.flags["glassN"] % 3 === 0) { f.flags["glassBusy"] = 1; applyStatus(b, f, t, status, n); f.flags["glassBusy"] = 0; } } } }),
  L({ id: "lm_kindled_ash", kind: "weapon", slot: "main", name: "Wand of Kindled Ash", tags: ["Burn", "Frost", "Arcane"], damage: 4, forClass: "mage",
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 3, asBase: "w_staff", reveal: "Your Burn and Chill land 1 stronger. A foe both Burning and Chilled takes 3 at the start of every round." },
    text: "Fire and frost, each convinced it is winning.",
    hooks: { onStatusApplied: (b, f, t, status) => { if (t !== f && (status === "burn" || status === "chill") && !f.flags["ashBusy"]) { f.flags["ashBusy"] = 1; applyStatus(b, f, t, status, 1); f.flags["ashBusy"] = 0; } },
      onRoundStart: (b, f) => { const e = foeOf(b, f); if (st(e, "burn") > 0 && st(e, "chill") > 0) ping(b, e, 3, "Kindled Ash"); } } }),
  // ---------- Mage: the Arcanist ----------
  L({ id: "lm_deep_well_codex", kind: "off", slot: "off", name: "Codex of the Deep Well", tags: ["Arcane", "Guard"], forClass: "mage",
    legendary: { minFloor: 1, asBase: "o_tome", reveal: "+1 Max Mana. Every class skill you use gives 4 Barrier." },
    text: "Its last page is always blank, and always full.",
    hooks: { onFightStart: (_b, f) => { f.maxMana = (f.maxMana ?? 3) + 1; }, onSkill: (b, f, skill) => { if (["barrier", "frostnova", "arcanebolt"].includes(skill)) applyStatus(b, f, f, "barrier", 4); } } }),
  L({ id: "lm_aetherbound", kind: "armour", slot: "armour", name: "Aetherbound Robes", tags: ["Arcane", "Guard"], armor: 1, forClass: "mage",
    legendary: { minFloor: 2, asBase: "a_cloth", reveal: "+1 Armor. Barrier you gain is half again stronger; while you have Barrier, your spells deal 25% more." },
    text: "Stitched with the silence between two words of power.",
    hooks: { incomingStatus: (_b, _f, status, n) => (status === "barrier" ? Math.ceil(n * 1.5) : n), modifyAttack: (_b, c) => { if (c.spec.magic && st(c.attacker, "barrier") > 0) c.mult *= 1.25; } } }),
  L({ id: "lm_overflow_sigil", kind: "trinket", slot: "trinket", name: "Sigil of Overflow", tags: ["Arcane"], forClass: "mage",
    legendary: { minFloor: 3, asBase: "t_storm_amulet", reveal: "At full Mana, your attacks deal 30% more and ignore Armor." },
    text: "Pour too much power in and it pours back out.",
    hooks: { modifyAttack: (_b, c) => { const f = c.attacker; if ((f.mana ?? 0) >= (f.maxMana ?? 3) && !c.noDamage) { c.mult *= 1.3; c.ignoreArmor = true; } } } }),

  // ---------- Cleric: the Penitent ----------
  L({ id: "lc_flagellant_chain", kind: "weapon", slot: "main", name: "Flagellant's Chain", tags: ["Blood", "Strike"], damage: 5, forClass: "cleric",
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 1, asBase: "w_mace", reveal: "Lose 2 HP at the start of every round. Your attacks deal +1 Damage for every 10% of your HP that's missing." },
    text: "Every link is a sin someone confessed to it.",
    hooks: { onRoundStart: (b, f) => { if (f.hp > 2) ping(b, f, 2, "Flagellant's Chain"); }, modifyAttack: (_b, c) => { const f = c.attacker; c.bonus += Math.floor((10 * (f.maxHp - f.hp)) / Math.max(1, f.maxHp)); } } }),
  L({ id: "lc_martyrs_shroud", kind: "armour", slot: "armour", name: "Martyr's Shroud", tags: ["Blood", "Thorns"], armor: 2, forClass: "cleric",
    legendary: { minFloor: 2, asBase: "a_vestments", reveal: "+2 Armor. Penance also gives 4 Spikes, and every hit you take while Spiked heals you 1." },
    text: "It was white, once.",
    hooks: { onSkill: (b, f, skill) => { if (skill === "penance") applyStatus(b, f, f, "spikes", 4); }, whenHit: (b, c) => { if (st(c.defender, "spikes") > 0 && !c.noDamage && c.defender.hp > 0) heal(b, c.defender, 1, "Martyr's Shroud"); } } }),
  L({ id: "lc_thorned_reliquary", kind: "off", slot: "off", name: "Thorned Reliquary", tags: ["Thorns", "Holy"], forClass: "cleric",
    legendary: { minFloor: 3, asBase: "o_holy_symbol", reveal: "Whenever you're hit, the attacker takes a quarter of the damage back." },
    text: "A saint's finger bone. It points at whoever is to blame.",
    hooks: { whenHit: (b, c) => { if (!c.noDamage && c.dealt > 0 && c.attacker.hp > 0) ping(b, c.attacker, Math.max(1, Math.round(c.dealt / 4)), "Thorned Reliquary"); } } }),
  // ---------- Cleric: the Zealot ----------
  L({ id: "lc_censer_of_dawn", kind: "off", slot: "off", name: "Censer of Dawn", tags: ["Holy", "Burn"], forClass: "cleric",
    legendary: { minFloor: 1, asBase: "o_prayer_beads", reveal: "Regen you gain is half again stronger. While you have Regen, your hits Burn 1." },
    text: "Its smoke smells of morning, and of something burning.",
    hooks: { incomingStatus: (_b, _f, status, n) => (status === "regen" ? Math.ceil(n * 1.5) : n), onHit: (b, c) => { if (st(c.attacker, "regen") > 0) applyStatus(b, c.attacker, c.defender, "burn", 1); } } }),
  L({ id: "lc_hallowed_hammer", kind: "weapon", slot: "main", name: "Hallowed Hammer", tags: ["Holy", "Strike"], damage: 6, forClass: "cleric",
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 2, asBase: "w_blessed_mace", reveal: "Unholy foes take 40% more from you. Every kill heals 15% of your Max HP." },
    text: "It rings like a bell. The dead hate bells.",
    hooks: { modifyAttack: (_b, c) => { if (isUnholy(c.defender)) c.mult *= 1.4; }, onKill: (b, c) => heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.15), "Hallowed Hammer") } }),
  L({ id: "lc_seraph_seal", kind: "trinket", slot: "trinket", name: "Seraph's Seal", tags: ["Holy", "Guard"], forClass: "cleric",
    legendary: { minFloor: 3, asBase: "t_templar_seal", reveal: "At the start of every round you begin at full HP, gain 3 Barrier; Regen on you also gives 1 Barrier a round." },
    text: "The wax still glows.",
    hooks: { onRoundStart: (b, f) => { if (f.hp >= f.maxHp) applyStatus(b, f, f, "barrier", 3); else if (st(f, "regen") > 0) applyStatus(b, f, f, "barrier", 1); } } })
];

/** Epic powers that lean toward a way to play (any class can find them). */
export const STYLE_EPICS: HookDef[] = [
  epic({ id: "e_rampart", name: "Rampart", affix: "Rampart", tags: ["Guard"], text: "Guarding gives 2 Reinforced", hooks: { onGuard: (b, f) => applyStatus(b, f, f, "reinforced", 2) } }),
  epic({ id: "e_frenzied", name: "Frenzied", affix: "Frenzied", tags: ["Strike"], text: "Every hit gives 1 Might (up to 5 a fight)",
    hooks: { onHit: (b, c) => { const f = c.attacker; if ((f.flags["frenzy"] ?? 0) < 5) { f.flags["frenzy"] = (f.flags["frenzy"] ?? 0) + 1; applyStatus(b, f, f, "might", 1); } } } }),
  epic({ id: "e_shadowed", name: "Shadowed", affix: "Shadowed", tags: ["Tempo"], text: "+6% Dodge; every dodge gives 1 Haste", hooks: { stats: s => { s.dodge += 6; }, onDodge: (b, c) => applyStatus(b, c.defender, c.defender, "haste", 1) } }),
  epic({ id: "e_viperous", name: "Viperous", affix: "Viperous", tags: ["Poison", "Crit"], text: "Every crit Poisons 3", hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 3) } }),
  epic({ id: "e_resonant", name: "Resonant", affix: "Resonant", tags: ["Hex", "Arcane"], text: "Reactions deal 25% more", hooks: { reactionMult: () => 1.25 } }),
  epic({ id: "e_wellspring", name: "Wellspring", affix: "Wellspring", tags: ["Arcane"], text: "+1 Max Mana", hooks: { onFightStart: (_b, f) => { f.maxMana = (f.maxMana ?? 3) + 1; } } }),
  epic({ id: "e_penitent", name: "Penitent", affix: "Penitent", tags: ["Blood", "Thorns"], text: "Every hit you take gives 1 Spikes", hooks: { whenHit: (b, c) => { if (!c.noDamage) applyStatus(b, c.defender, c.defender, "spikes", 1); } } }),
  epic({ id: "e_radiant", name: "Radiant", affix: "Radiant", tags: ["Holy"], text: "Start every fight with 4 Regen", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 4) } }),
  epic({ id: "e_shattering", name: "Shattering", affix: "Shattering", tags: ["Strike"], text: "Your crits Fracture the foe", hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "fracture", 1) } }),
  epic({ id: "e_bloodletting", name: "Bloodletting", affix: "Bloodletting", tags: ["Bleed"], text: "Every hit Bleeds 1", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 1) } }),
  epic({ id: "e_sparking", name: "Sparking", affix: "Sparking", tags: ["Storm", "Arcane"], text: "Your spells Shock 1", hooks: { onHit: (b, c) => { if (c.spec.magic) applyStatus(b, c.attacker, c.defender, "shock", 1); } } }),
  epic({ id: "e_steadfast", name: "Steadfast", affix: "Steadfast", tags: ["Guard"], text: "+3 Armor while below half HP", hooks: { onRoundStart: (_b, f) => { const on = f.hp < f.maxHp / 2; if (on && !f.flags["steadfast"]) { f.flags["steadfast"] = 1; f.armor += 3; } else if (!on && f.flags["steadfast"]) { f.flags["steadfast"] = 0; f.armor -= 3; } } } })
];
