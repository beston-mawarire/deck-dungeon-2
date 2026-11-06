// Class-ability gear: for each class ability (War Cry, Counter, Barrier, Penance), 5 weapons, 5 off-hands, 5 armours and
// 5 trinkets, Uncommon to Epic, that only that class finds. Plus rare relics that make an ability free of your turn or
// count as a Guard, small amp relics, Max Mana, and relics that let you carry more Mana Potions.
// Everything drops at the normal odds for its rarity; relics use the usual draw-weight tiers.
import type { Battle, FaceSpec, Fighter, GearBase, HookDef, OriginId } from "../engine/types";
import { fx } from "../engine/registry";
import { applyStatus, CRIT, GRAZE, heal, HIT, log, loseHp, st } from "./helpers";

type Skill = "warcry" | "counter" | "barrier" | "penance";
type Def = Omit<GearBase, "onlyRarity" | "forClass">;
const CLASS_OF: Record<Skill, OriginId> = { warcry: "warrior", counter: "rogue", barrier: "mage", penance: "cleric" };
// 1.100: the old class skills are gone (they live on only in a few Legendaries), so this gear no longer drops.
const mk = (skill: Skill) => (onlyRarity: GearBase["onlyRarity"], d: Def): GearBase => ({ ...d, onlyRarity, forClass: CLASS_OF[skill], weight: 0 });
const WC = mk("warcry"), RC = mk("counter"), MB = mk("barrier"), CP = mk("penance");
const W = { kind: "weapon" as const, slot: "main" as const };
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };
const PLAIN: FaceSpec[] = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const KEEN: FaceSpec[] = [GRAZE, HIT, HIT, HIT, CRIT, CRIT];

const add = (f: Fighter, k: string, n: number) => { f.flags[k] = (f.flags[k] ?? 0) + n; };
/** Set a flag for the fight (so the engine's class abilities read it). */
const flag = (k: string, n: number) => ({ onFightStart: (_b: Battle, f: Fighter, s: number) => add(f, k, n * s) });
/** Give back mana, up to the cap. */
export const refund = (b: Battle, f: Fighter, n = 1) => {
  if (f.maxMana == null) return;
  const before = f.mana ?? 0;
  f.mana = Math.min(f.maxMana, before + n);
  if (f.mana > before) fx(b, { who: f.id, kind: "text", text: `+${f.mana - before} Mana`, icon: "🔷" });
};
/** After this ability (or what came of it: "counter_hit", "barrier_block", "penance_release"). */
const after = (want: string, run: (b: Battle, f: Fighter, s: number) => void) => ({
  onSkill: (b: Battle, f: Fighter, skill: string, s: number) => { if (skill === want) run(b, f, s); }
});
const foe = (b: Battle) => b.enemy;
const chance = (b: Battle, pct: number) => b.rng() * 100 < pct;

export const CLASS_GEAR: GearBase[] = [
  // ======================= WARRIOR: War Cry =======================
  WC("uncommon", { ...W, id: "wc_bellow_axe", name: "Bellowing Axe", tags: ["Strike"], damage: 6, faces: PLAIN,
    text: "Axe. Your War Cry gives 2 more Might.", hooks: flag("warcryMight", 2) }),
  WC("uncommon", { ...W, id: "wc_herald_mace", name: "Herald's Mace", tags: ["Strike"], damage: 5, faces: PLAIN,
    text: "Mace. After a War Cry, your next hit deals +6.", hooks: after("warcry", (_b, f) => add(f, "nextHitBonus", 6)) }),
  WC("rare", { ...W, id: "wc_rallying_blade", name: "Rallying Blade", tags: ["Strike", "Tempo"], damage: 7, faces: PLAIN,
    text: "Sword. After a War Cry, gain 1 Haste.", hooks: after("warcry", (b, f) => applyStatus(b, f, f, "haste", 1)) }),
  WC("rare", { ...W, id: "wc_thunder_maul", name: "Thunder Maul", tags: ["Strike"], damage: 11, twoHanded: true, faces: PLAIN,
    text: "Two-handed. Your War Cry also gives the enemy 2 Fracture.", hooks: after("warcry", (b, f) => applyStatus(b, f, foe(b), "fracture", 2)) }),
  WC("epic", { ...W, id: "wc_warlord_greatsword", name: "Warlord's Greatsword", tags: ["Strike"], damage: 13, twoHanded: true, faces: KEEN,
    text: "Two-handed. Every War Cry gives its full Might, and your next hit after one deals 60% more.",
    hooks: { ...flag("warcryFull", 1), ...after("warcry", (_b, f) => add(f, "nextHitMult", 60)) } }),

  WC("uncommon", { ...O, id: "wc_drum_shield", name: "War Drum Shield", shield: true, tags: ["Guard"], armor: 1,
    text: "Shield. +1 Armor. Your War Cry gives 5 Barrier.", hooks: after("warcry", (b, f) => applyStatus(b, f, f, "barrier", 5)) }),
  WC("uncommon", { ...O, id: "wc_horn_buckler", name: "Horn Buckler", shield: true, tags: ["Guard"], armor: 1,
    text: "Shield. +1 Armor. Your War Cry leaves the enemy Weak 2 more.", hooks: after("warcry", (b, f) => applyStatus(b, f, foe(b), "weak", 2)) }),
  WC("rare", { ...O, id: "wc_bannered_shield", name: "Bannered Shield", shield: true, tags: ["Guard", "Blood"], armor: 2,
    text: "Shield. +2 Armor. Your War Cry heals 6% of your Max HP.", hooks: after("warcry", (b, f) => heal(b, f, Math.ceil(f.maxHp * 0.06), "Bannered Shield")) }),
  WC("rare", { ...O, id: "wc_roaring_targe", name: "Roaring Targe", shield: true, tags: ["Guard", "Tempo"], armor: 2,
    text: "Shield. +2 Armor. A War Cry has a 35% chance to give its mana back.", hooks: after("warcry", (b, f) => { if (chance(b, 35)) refund(b, f); }) }),
  WC("epic", { ...O, id: "wc_lion_aegis", name: "Lion Aegis", shield: true, tags: ["Guard"], armor: 3,
    text: "Shield. +3 Armor. Your War Cry gives Barrier equal to twice your Might.", hooks: after("warcry", (b, f) => applyStatus(b, f, f, "barrier", 2 * st(f, "might"))) }),

  // A War Cry spends your turn and leaves you open: these let it count as Guarding too.
  WC("epic", { ...O, id: "wc_bannered_wall", name: "Bannered Wall", shield: true, tags: ["Guard"], armor: 4,
    text: "Shield. +4 Armor. Your War Cry counts as Guarding as well.", hooks: flag("guard_warcry", 1) }),
  WC("epic", { ...A, id: "wc_vanguard_plate", name: "Vanguard Plate", tags: ["Guard", "Strike"], armor: 5,
    text: "Heavy: +5 Armor. Your War Cry counts as Guarding as well.", hooks: flag("guard_warcry", 1) }),
  WC("uncommon", { ...A, id: "wc_rage_hide", name: "Hide of Rage", tags: ["Blood"], armor: 2,
    text: "Medium: +2 Armor. Your War Cry gives 3 Regen.", hooks: after("warcry", (b, f) => applyStatus(b, f, f, "regen", 3)) }),
  WC("uncommon", { ...A, id: "wc_battle_harness", name: "Battle Harness", tags: ["Strike"], armor: 2,
    text: "Medium: +2 Armor. Your War Cry gives 1 more Might.", hooks: flag("warcryMight", 1) }),
  WC("rare", { ...A, id: "wc_warpaint_mail", name: "Warpaint Mail", tags: ["Tempo"], armor: 3,
    text: "Medium: +3 Armor. +1 Max Mana.", hooks: flag("manaMax", 1) }),
  WC("rare", { ...A, id: "wc_chieftain_hauberk", name: "Chieftain's Hauberk", tags: ["Thorns", "Guard"], armor: 4, maxHp: 4,
    text: "Heavy: +4 Armor, +4 Max HP. Your War Cry gives 4 Spikes.", hooks: after("warcry", (b, f) => applyStatus(b, f, f, "spikes", 4)) }),
  WC("epic", { ...A, id: "wc_titan_plate", name: "Titan's Warplate", tags: ["Strike"], armor: 5, maxHp: 6,
    text: "Heavy: +5 Armor, +6 Max HP. Each War Cry this fight: you deal 6% more damage.",
    hooks: { modifyAttack: (b, c) => { if (c.attacker === b.player) c.mult *= 1 + 0.06 * (c.attacker.flags["used_warcry"] ?? 0); } } }),

  WC("uncommon", { ...T, id: "wc_bone_whistle", name: "Bone Whistle", tags: ["Hex"],
    text: "Your War Cry leaves the enemy Exposed 2 more.", hooks: after("warcry", (b, f) => applyStatus(b, f, foe(b), "exposed", 2)) }),
  WC("uncommon", { ...T, id: "wc_shout_stone", name: "Shout Stone", tags: ["Strike"],
    text: "Your War Cry deals 3 damage, plus 1 per floor.", hooks: after("warcry", (b, f) => { loseHp(b, foe(b), 3 + (f.persist["floor"] ?? 1)); log(b, "🗣️ The Shout Stone's roar hurts."); }) }),
  WC("rare", { ...T, id: "wc_echo_charm", name: "Echo Charm", tags: ["Tempo"],
    text: "A War Cry has a 30% chance to give its mana back.", hooks: after("warcry", (b, f) => { if (chance(b, 30)) refund(b, f); }) }),
  WC("rare", { ...T, id: "wc_blood_oath", name: "Blood Oath", tags: ["Strike", "Crit"],
    text: "After a War Cry, your next hit deals double.", hooks: after("warcry", (_b, f) => add(f, "nextHitMult", 100)) }),
  WC("epic", { ...T, id: "wc_kings_signet", name: "Warking's Signet", tags: ["Strike", "Tempo"],
    text: "+1 Max Mana. Your War Cry gives 2 more Might.", hooks: { onFightStart: (_b, f, s) => { add(f, "manaMax", s); add(f, "warcryMight", 2 * s); } } }),

  // ======================= ROGUE: Counter =======================
  RC("uncommon", { ...W, id: "rc_parrying_dirk", name: "Parrying Dirk", weaponType: "dagger", tags: ["Tempo"], damage: 4, offDamage: 3, faces: PLAIN,
    text: "Dagger. In Counter stance, +10% Dodge. Works in the off-hand.", hooks: flag("counterDodge", 10) }),
  RC("uncommon", { ...W, id: "rc_riposte_rapier", name: "Riposte Rapier", tags: ["Crit"], damage: 5, faces: PLAIN,
    text: "Rapier. Your Counter strikes deal 30% more.", hooks: flag("counterCritPct", 30) }),
  RC("rare", { ...W, id: "rc_viper_fang", name: "Viper Fang", weaponType: "dagger", tags: ["Poison", "Crit"], damage: 5, offDamage: 3, faces: PLAIN,
    text: "Dagger. A Counter that lands also inflicts 5 Bleed. Works in the off-hand.", hooks: after("counter_hit", (b, f) => applyStatus(b, f, foe(b), "bleed", 5)) }),
  RC("rare", { ...W, id: "rc_mirror_edge", name: "Mirror Edge", tags: ["Tempo"], damage: 6, faces: PLAIN,
    text: "Sword. A failed Counter doesn't leave you off-balance.", hooks: flag("counterNoFrail", 1) }),
  RC("epic", { ...W, id: "rc_duelist_saber", name: "Duelist's Saber", tags: ["Crit", "Tempo"], damage: 8, faces: KEEN,
    text: "Saber. Your Counter strikes deal 60% more, and give the mana back when they land.",
    hooks: { ...flag("counterCritPct", 60), ...after("counter_hit", (b, f) => refund(b, f)) } }),

  RC("uncommon", { ...O, id: "rc_smoke_pouch", name: "Smoke Pouch", tags: ["Tempo"],
    text: "Taking a Counter stance gives 1 Evade.", hooks: after("counter", (b, f) => applyStatus(b, f, f, "evade", 1)) }),
  RC("uncommon", { ...O, id: "rc_main_gauche", name: "Main Gauche Guard", shield: true, tags: ["Guard"], armor: 1,
    text: "Shield. +1 Armor. In Counter stance, +8% Dodge.", hooks: flag("counterDodge", 8) }),
  RC("rare", { ...O, id: "rc_cloak_of_feints", name: "Cloak of Feints", tags: ["Tempo", "Crit"],
    text: "After a Counter lands, your next hit deals +8.", hooks: after("counter_hit", (_b, f) => add(f, "nextHitBonus", 8)) }),
  RC("rare", { ...O, id: "rc_baiting_lantern", name: "Baiting Lantern", tags: ["Hex"],
    text: "Taking a Counter stance Blinds the enemy for 1.", hooks: after("counter", (b, f) => applyStatus(b, f, foe(b), "blind", 1)) }),
  RC("epic", { ...O, id: "rc_shadow_buckler", name: "Shadowstep Buckler", shield: true, tags: ["Guard", "Tempo"], armor: 2,
    text: "Shield. +2 Armor. In Counter stance, +15% Dodge, and a failed Counter doesn't leave you off-balance.",
    hooks: { onFightStart: (_b, f, s) => { add(f, "counterDodge", 15 * s); add(f, "counterNoFrail", 1); } } }),

  RC("uncommon", { ...A, id: "rc_dancer_silks", name: "Dancer's Silks", tags: ["Tempo"], armor: 1,
    text: "Light: +1 Armor. In Counter stance, +8% Dodge.", hooks: flag("counterDodge", 8) }),
  RC("uncommon", { ...A, id: "rc_padded_jack", name: "Padded Jack", tags: ["Blood"], armor: 2,
    text: "Medium: +2 Armor. A Counter that lands heals you 4.", hooks: after("counter_hit", (b, f) => heal(b, f, 4, "Padded Jack")) }),
  RC("rare", { ...A, id: "rc_nightrunner_leathers", name: "Nightrunner Leathers", tags: ["Tempo"], armor: 2,
    text: "Light: +2 Armor. +1 Max Mana.", hooks: flag("manaMax", 1) }),
  RC("rare", { ...A, id: "rc_thornweave_vest", name: "Thornweave Vest", tags: ["Thorns"], armor: 2,
    text: "Medium: +2 Armor. Taking a Counter stance gives 4 Spikes.", hooks: after("counter", (b, f) => applyStatus(b, f, f, "spikes", 4)) }),
  RC("epic", { ...A, id: "rc_phantom_mantle", name: "Phantom Mantle", tags: ["Tempo", "Crit"], armor: 3,
    text: "Light: +3 Armor. A Counter that lands gives 2 Might and 1 Haste.", hooks: after("counter_hit", (b, f) => { applyStatus(b, f, f, "might", 2); applyStatus(b, f, f, "haste", 1); }) }),

  RC("uncommon", { ...T, id: "rc_loaded_coin", name: "Two-Faced Coin", tags: ["Luck"],
    text: "Taking a Counter stance has a 25% chance to give its mana back.", hooks: after("counter", (b, f) => { if (chance(b, 25)) refund(b, f); }) }),
  RC("uncommon", { ...T, id: "rc_whetstone_charm", name: "Whetstone Charm", tags: ["Crit"],
    text: "Your Counter strikes deal 20% more.", hooks: flag("counterCritPct", 20) }),
  RC("rare", { ...T, id: "rc_venom_ring", name: "Venom Ring", tags: ["Poison"],
    text: "A Counter that lands inflicts 5 Poison.", hooks: after("counter_hit", (b, f) => applyStatus(b, f, foe(b), "poison", 5)) }),
  RC("rare", { ...T, id: "rc_sharp_eye", name: "Sharp Eye", tags: ["Crit", "Hex"],
    text: "A Counter that lands leaves the enemy Exposed 2.", hooks: after("counter_hit", (b, f) => applyStatus(b, f, foe(b), "exposed", 2)) }),
  RC("epic", { ...T, id: "rc_assassin_sigil", name: "Assassin's Sigil", tags: ["Crit", "Tempo"],
    text: "+1 Max Mana. Your Counter strikes deal 40% more.", hooks: { onFightStart: (_b, f, s) => { add(f, "manaMax", s); add(f, "counterCritPct", 40 * s); } } }),

  // ======================= MAGE: Elemental Barrier =======================
  MB("uncommon", { ...W, id: "mb_ward_wand", name: "Warding Wand", tags: ["Arcane"], damage: 4, faces: PLAIN,
    text: "Wand. Raising a Barrier gives 3 Barrier as well.", hooks: after("barrier", (b, f) => applyStatus(b, f, f, "barrier", 3)) }),
  MB("uncommon", { ...W, id: "mb_spark_rod", name: "Spark Rod", tags: ["Arcane", "Storm"], damage: 5, faces: PLAIN,
    text: "Rod. After a Barrier fully blocks a hit, your next hit deals +5.", hooks: after("barrier_block", (_b, f) => add(f, "nextHitBonus", 5)) }),
  MB("rare", { ...W, id: "mb_runed_scepter", name: "Runed Scepter", tags: ["Arcane"], damage: 6, faces: PLAIN,
    text: "Scepter. Your Barrier rolls +1 (up to 6).", hooks: flag("barrierRoll", 1) }),
  MB("rare", { ...W, id: "mb_echo_staff", name: "Echoing Rod", tags: ["Arcane", "Tempo"], damage: 6, faces: PLAIN,
    text: "Rod. A Barrier that fully blocks a hit gives its mana back.", hooks: after("barrier_block", (b, f) => refund(b, f)) }),
  MB("epic", { ...W, id: "mb_archon_scepter", name: "Archon's Scepter", tags: ["Arcane"], damage: 8, faces: KEEN,
    text: "Scepter. Your Barrier rolls twice and keeps the better. After a Barrier is hit, your next hit deals 50% more.",
    hooks: { ...flag("barrierTwice", 1), onSkill: (_b, f, k) => { if (k === "barrier_block" || k === "barrier_hit") f.flags["nextHitMult"] = 50; } } }),

  MB("uncommon", { ...O, id: "mb_prism_orb", name: "Prism Orb", barrierElement: "burn", tags: ["Arcane", "Burn"],
    text: "Barrier lash: Burn. Raising a Barrier gives 2 Ward.", hooks: after("barrier", (b, f) => applyStatus(b, f, f, "ward", 2)) }),
  MB("uncommon", { ...O, id: "mb_frost_tome", name: "Rimebound Tome", barrierElement: "chill", tags: ["Arcane", "Frost"],
    text: "Barrier lash: Chill. Raising a Barrier gives 4 Barrier.", hooks: after("barrier", (b, f) => applyStatus(b, f, f, "barrier", 4)) }),
  MB("rare", { ...O, id: "mb_storm_lens", name: "Storm Lens", barrierElement: "shock", tags: ["Arcane", "Storm"],
    text: "Barrier lash: Shock. Your Barrier rolls twice and keeps the better.", hooks: flag("barrierTwice", 1) }),
  MB("rare", { ...O, id: "mb_venom_grimoire", name: "Venom Grimoire", barrierElement: "poison", tags: ["Arcane", "Poison"],
    text: "Barrier lash: Poison. When your Barrier is hit, the attacker also takes 4 Poison.", hooks: { onSkill: (b, f, k) => { if (k === "barrier_block" || k === "barrier_hit") applyStatus(b, f, foe(b), "poison", 4); } } }),
  MB("epic", { ...O, id: "mb_aegis_codex", name: "Aegis Codex", barrierElement: "burn", barrierElements: ["burn", "chill"], tags: ["Arcane", "Burn", "Frost"],
    text: "Barrier lash: Burn and Chill. Your Barrier rolls +1, and a full block gives the mana back.",
    hooks: { ...flag("barrierRoll", 1), ...after("barrier_block", (b, f) => refund(b, f)) } }),

  MB("uncommon", { ...A, id: "mb_glyph_robe", name: "Glyph Robe", tags: ["Arcane"], armor: 1, maxHp: 2,
    text: "Robe: +1 Armor, +2 Max HP. Raising a Barrier gives 1 Focus.", hooks: after("barrier", (b, f) => applyStatus(b, f, f, "focus", 1)) }),
  MB("uncommon", { ...A, id: "mb_quilted_mantle", name: "Spellquilt Mantle", tags: ["Arcane", "Blood"], armor: 2,
    text: "Robe: +2 Armor. A full Barrier block heals you 4.", hooks: after("barrier_block", (b, f) => heal(b, f, 4, "Spellquilt Mantle")) }),
  MB("rare", { ...A, id: "mb_starweave_robe", name: "Starweave Robe", tags: ["Arcane", "Tempo"], armor: 2,
    text: "Robe: +2 Armor. +1 Max Mana.", hooks: flag("manaMax", 1) }),
  MB("rare", { ...A, id: "mb_mirror_vestments", name: "Mirrored Vestments", tags: ["Arcane", "Thorns"], armor: 2,
    text: "Robe: +2 Armor. When your Barrier is hit, the attacker takes 5 damage.", hooks: { onSkill: (b, _f, k) => { if (k === "barrier_block" || k === "barrier_hit") loseHp(b, foe(b), 5); } } }),
  MB("epic", { ...A, id: "mb_archmage_regalia", name: "Archmage's Regalia", tags: ["Arcane"], armor: 3, maxHp: 4,
    text: "Robe: +3 Armor, +4 Max HP. Your Barrier rolls twice and keeps the better, and raising one gives 5 Barrier.",
    hooks: { ...flag("barrierTwice", 1), ...after("barrier", (b, f) => applyStatus(b, f, f, "barrier", 5)) } }),

  MB("uncommon", { ...T, id: "mb_mana_bead", name: "Mana Bead", tags: ["Arcane", "Tempo"],
    text: "Raising a Barrier has a 25% chance to give its mana back.", hooks: after("barrier", (b, f) => { if (chance(b, 25)) refund(b, f); }) }),
  MB("uncommon", { ...T, id: "mb_lodestone", name: "Lodestone", tags: ["Arcane"],
    text: "Your Barrier rolls +1 (up to 6).", hooks: flag("barrierRoll", 1) }),
  MB("rare", { ...T, id: "mb_rebound_charm", name: "Rebound Charm", tags: ["Arcane"],
    text: "When your Barrier is hit, the attacker takes 2 more stacks of your element.", hooks: { onSkill: (b, f, k) => { if ((k === "barrier_block" || k === "barrier_hit") && f.barrierElement) applyStatus(b, f, foe(b), f.barrierElement, 2); } } }),
  MB("rare", { ...T, id: "mb_hourglass_pendant", name: "Hourglass Pendant", tags: ["Arcane", "Tempo"],
    text: "A full Barrier block gives 1 Haste.", hooks: after("barrier_block", (b, f) => applyStatus(b, f, f, "haste", 1)) }),
  MB("epic", { ...T, id: "mb_crown_of_wards", name: "Circlet of Wards", tags: ["Arcane"],
    text: "+1 Max Mana. Your Barrier rolls +1 (up to 6).", hooks: { onFightStart: (_b, f, s) => { add(f, "manaMax", s); add(f, "barrierRoll", s); } } }),

  // ======================= CLERIC: Penance =======================
  CP("uncommon", { ...W, id: "cp_penitent_flail", name: "Penitent's Flail", tags: ["Holy"], damage: 5, faces: PLAIN,
    text: "Flail. Penance gives back 25% more.", hooks: flag("penanceAmp", 25) }),
  CP("uncommon", { ...W, id: "cp_vigil_mace", name: "Vigil Mace", tags: ["Holy", "Blood"], damage: 5, faces: PLAIN,
    text: "Mace. When your Penance is released, heal 5.", hooks: after("penance_release", (b, f) => heal(b, f, 5, "Vigil Mace")) }),
  CP("rare", { ...W, id: "cp_judgement_hammer", name: "Hammer of Judgement", tags: ["Holy", "Strike"], damage: 7, faces: PLAIN,
    text: "Hammer. When your Penance is released, the enemy is left Weak 3 and Exposed 2.", hooks: after("penance_release", (b, f) => { applyStatus(b, f, foe(b), "weak", 3); applyStatus(b, f, foe(b), "exposed", 2); }) }),
  CP("rare", { ...W, id: "cp_martyr_blade", name: "Martyr's Blade", tags: ["Holy", "Tempo"], damage: 6, faces: PLAIN,
    text: "Sword. Releasing a Penance gives the mana back.", hooks: after("penance_release", (b, f) => refund(b, f)) }),
  CP("epic", { ...W, id: "cp_reckoning_maul", name: "Reckoning Maul", tags: ["Holy", "Strike"], damage: 12, twoHanded: true, faces: KEEN,
    text: "Two-handed. Penance gives back 50% more.", hooks: flag("penanceAmp", 50) }),

  CP("uncommon", { ...O, id: "cp_hymnal", name: "Battered Hymnal", tags: ["Holy"],
    text: "Kneeling in Penance gives 2 Regen.", hooks: after("penance", (b, f) => applyStatus(b, f, f, "regen", 2)) }),
  CP("uncommon", { ...O, id: "cp_kneeling_shield", name: "Kneeler's Shield", shield: true, tags: ["Guard", "Holy"], armor: 1,
    text: "Shield. +1 Armor. Kneeling in Penance gives 4 Barrier.", hooks: after("penance", (b, f) => applyStatus(b, f, f, "barrier", 4)) }),
  CP("rare", { ...O, id: "cp_reliquary", name: "Bleeding Reliquary", tags: ["Holy", "Blood"],
    text: "Kneeling in Penance stores 4 extra right away.", hooks: after("penance", (_b, f) => add(f, "penanceStore", 4)) }),
  CP("rare", { ...O, id: "cp_censer_of_mercy", name: "Censer of Mercy", tags: ["Holy", "Tempo"],
    text: "Kneeling in Penance has a 30% chance to give its mana back.", hooks: after("penance", (b, f) => { if (chance(b, 30)) refund(b, f); }) }),
  CP("epic", { ...O, id: "cp_saints_bulwark", name: "Saint's Bulwark", shield: true, tags: ["Guard", "Holy"], armor: 3,
    text: "Shield. +3 Armor. In Penance you take much less damage (40% less instead of 25%).", hooks: flag("penanceGuard", 1) }),

  CP("uncommon", { ...A, id: "cp_sackcloth", name: "Sackcloth Robe", tags: ["Holy"], armor: 1, maxHp: 4,
    text: "Robe: +1 Armor, +4 Max HP. Penance gives back 15% more.", hooks: flag("penanceAmp", 15) }),
  CP("uncommon", { ...A, id: "cp_chain_of_vows", name: "Chain of Vows", tags: ["Holy", "Guard"], armor: 3,
    text: "Medium: +3 Armor. Kneeling in Penance gives 2 Ward.", hooks: after("penance", (b, f) => applyStatus(b, f, f, "ward", 2)) }),
  CP("rare", { ...A, id: "cp_pilgrim_vestments", name: "Pilgrim's Vestments", tags: ["Holy", "Tempo"], armor: 2,
    text: "Robe: +2 Armor. +1 Max Mana.", hooks: flag("manaMax", 1) }),
  CP("rare", { ...A, id: "cp_thorned_cilice", name: "Thorned Cilice", tags: ["Holy", "Thorns"], armor: 2,
    text: "Medium: +2 Armor. Kneeling in Penance gives 5 Spikes.", hooks: after("penance", (b, f) => applyStatus(b, f, f, "spikes", 5)) }),
  CP("epic", { ...A, id: "cp_inquisitor_plate", name: "Inquisitor's Plate", tags: ["Holy", "Guard"], armor: 5, maxHp: 6,
    text: "Heavy: +5 Armor, +6 Max HP. Penance gives back 30% more, and its release gives 3 Might.",
    hooks: { ...flag("penanceAmp", 30), ...after("penance_release", (b, f) => applyStatus(b, f, f, "might", 3)) } }),

  CP("uncommon", { ...T, id: "cp_prayer_beads", name: "Worn Prayer Beads", tags: ["Holy", "Tempo"],
    text: "Kneeling in Penance has a 25% chance to give its mana back.", hooks: after("penance", (b, f) => { if (chance(b, 25)) refund(b, f); }) }),
  CP("uncommon", { ...T, id: "cp_ash_mark", name: "Mark of Ash", tags: ["Holy"],
    text: "Penance gives back 20% more.", hooks: flag("penanceAmp", 20) }),
  CP("rare", { ...T, id: "cp_scourge_charm", name: "Scourge Charm", tags: ["Holy", "Bleed"],
    text: "When your Penance is released, the enemy takes 4 Bleed.", hooks: after("penance_release", (b, f) => applyStatus(b, f, foe(b), "bleed", 4)) }),
  CP("rare", { ...T, id: "cp_halo_shard", name: "Halo Shard", tags: ["Holy"],
    text: "When your Penance is released, gain 2 Blessed.", hooks: after("penance_release", (b, f) => applyStatus(b, f, f, "blessed", 2)) }),
  CP("epic", { ...T, id: "cp_seal_of_atonement", name: "Seal of Atonement", tags: ["Holy", "Crit"],
    text: "+1 Max Mana. Your released Penance hits twice as hard.", hooks: { onFightStart: (_b, f, s) => { add(f, "manaMax", s); add(f, "penanceCrit", 1); } } })
];

const rel = (forClass: OriginId | undefined, rarity: "uncommon" | "rare" | "legendary", d: Omit<HookDef, "kind" | "rarity" | "weight" | "forClass">): HookDef =>
  ({ ...d, kind: "relic", rarity, weight: rarity === "uncommon" ? 0.6 : rarity === "rare" ? 0.3 : 0.12, forClass });

/** Relics that let you carry more Mana Potions: id → extra potions per copy. */
export const MANA_POTION_SLOTS: Record<string, number> = { mr_potion_sling: 1, mr_alchemist_bandolier: 2, mr_bottomless_rack: 3 };

export const CLASS_RELICS: HookDef[] = [
  // Tempo: War Cry doesn't need the enemy, so it can skip your turn; the others pay off when the enemy acts.
  rel("warrior", "rare", { id: "mr_unbroken_horn", name: "Unbroken Horn", tags: ["Tempo", "Strike"], text: "War Cry doesn't take your turn: you attack too", hooks: flag("free_warcry", 1) }),
  rel("rogue", "rare", { id: "mr_quickstep_anklet", name: "Quickstep Anklet", tags: ["Tempo"], text: "A Counter that lands is followed by a normal attack", hooks: flag("counterFollow", 1) }),
  rel("mage", "rare", { id: "mr_spellweaver_loop", name: "Spellweaver's Loop", tags: ["Tempo", "Arcane"], text: "When your Barrier fully blocks a hit, you strike back with a normal attack", hooks: flag("barrierRiposte", 1) }),
  rel("cleric", "rare", { id: "mr_pilgrim_stride", name: "Pilgrim's Stride", tags: ["Tempo", "Holy"], text: "If you suffer anything while kneeling in Penance, gain 1 Haste (+1) for your next turn",
    hooks: { onRoundEnd: (b, f, s) => { if (f === b.player && f.flags["penanceRound"] === b.round && (f.flags["penanceStore"] ?? 0) > 0) applyStatus(b, f, f, "haste", s); } } }),
  // Counts as a Guard.
  rel("warrior", "rare", { id: "mr_shieldwall_banner", name: "Shieldwall Banner", tags: ["Guard"], text: "War Cry counts as Guarding as well", hooks: flag("guard_warcry", 1) }),
  rel("rogue", "rare", { id: "mr_feinting_pin", name: "Feinting Pin", tags: ["Guard", "Tempo"], text: "Counter counts as Guarding as well", hooks: flag("guard_counter", 1) }),
  rel("mage", "rare", { id: "mr_ward_prism", name: "Ward Prism", tags: ["Guard", "Arcane"], text: "Barrier counts as Guarding as well", hooks: flag("guard_barrier", 1) }),
  rel("cleric", "rare", { id: "mr_martyr_shroud", name: "Martyr's Shroud", tags: ["Guard", "Holy"], text: "Penance counts as Guarding as well", hooks: flag("guard_penance", 1) }),
  // Small amps.
  rel("warrior", "uncommon", { id: "mr_war_paint", name: "Pot of War Paint", tags: ["Strike"], text: "Your War Cry gives 2 more Might (+2)", hooks: flag("warcryMight", 2) }),
  rel("rogue", "uncommon", { id: "mr_fencing_glove", name: "Fencing Glove", tags: ["Tempo"], text: "In Counter stance, +8% Dodge (+8%)", hooks: flag("counterDodge", 8) }),
  rel("mage", "uncommon", { id: "mr_chalk_circle", name: "Chalk Circle", tags: ["Arcane"], text: "A Barrier that fully blocks a hit gives 3 Barrier (+3)", hooks: after("barrier_block", (b, f, s) => applyStatus(b, f, f, "barrier", 3 * s)) }),
  rel("cleric", "uncommon", { id: "mr_knotted_cord", name: "Knotted Cord", tags: ["Holy"], text: "Penance gives back 20% more (+20%)", hooks: flag("penanceAmp", 20) }),
  // Mana.
  rel(undefined, "rare", { id: "mr_mana_pearl", name: "Mana Pearl", tags: ["Tempo"], text: "+1 Max Mana (+1)", hooks: flag("manaMax", 1) }),
  rel(undefined, "uncommon", { id: "mr_potion_sling", name: "Potion Sling", tags: ["Tempo"], text: "Carry 1 more Mana Potion (+1)", hooks: {} }),
  rel(undefined, "rare", { id: "mr_alchemist_bandolier", name: "Alchemist's Bandolier", tags: ["Tempo"], text: "Carry 2 more Mana Potions (+2)", hooks: {} }),
  rel(undefined, "legendary", { id: "mr_bottomless_rack", name: "Bottomless Flask Rack", tags: ["Tempo"], text: "Carry 3 more Mana Potions (+3)", hooks: {} })
];
