// Small, steady relics and talents that fill the pool (a little HP, a point of Damage, a few % here and there),
// and the draw weights that keep the strong, combo-making relics and talents genuinely rare.
import type { HookDef } from "../engine/types";
import { applyStatus, heal, ping } from "./helpers";

const relic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "relic", weight: 1.8, ...d });
const talent = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "talent", weight: 2, ...d });
const rank = (s: number, ...vals: number[]) => vals[Math.min(s, vals.length) - 1];

// ---------- Small relics: each extra copy adds the same again ----------
export const MINOR_RELICS: HookDef[] = [
  // Max HP
  relic({ id: "rm_knotted_cord", name: "Knotted Cord", rarity: "common", tags: ["Blood"], text: "+1 Max HP (+1)", hooks: { stats: (s, n) => { s.maxHp += n; } } }),
  relic({ id: "rm_boiled_egg", name: "Boiled Egg", rarity: "common", tags: ["Blood"], text: "+1 Max HP (+1)", hooks: { stats: (s, n) => { s.maxHp += n; } } }),
  relic({ id: "rm_warm_stone", name: "Warm Stone", rarity: "common", tags: ["Blood"], text: "+2 Max HP (+2)", hooks: { stats: (s, n) => { s.maxHp += 2 * n; } } }),
  relic({ id: "rm_honey_jar", name: "Honey Jar", rarity: "common", tags: ["Blood"], text: "+2 Max HP (+2)", hooks: { stats: (s, n) => { s.maxHp += 2 * n; } } }),
  relic({ id: "rm_wool_scarf", name: "Wool Scarf", rarity: "common", tags: ["Blood"], text: "+3 Max HP (+3)", hooks: { stats: (s, n) => { s.maxHp += 3 * n; } } }),
  // Damage
  relic({ id: "rm_sharpening_rag", name: "Sharpening Rag", rarity: "common", tags: ["Strike"], text: "+1 Damage (+1)", hooks: { stats: (s, n) => { s.damage += n; } } }),
  relic({ id: "rm_weighted_pommel", name: "Weighted Pommel", rarity: "common", tags: ["Strike"], text: "+1 Damage (+1)", hooks: { stats: (s, n) => { s.damage += n; } } }),
  relic({ id: "rm_grip_tape", name: "Grip Tape", rarity: "common", tags: ["Tempo"], text: "+1 off-hand Damage (+1)", hooks: { stats: (s, n) => { s.offDamage += n; } } }),
  // Armor
  relic({ id: "rm_leather_patch", name: "Leather Patch", rarity: "common", tags: ["Guard"], text: "+1 Armor (+1)", hooks: { stats: (s, n) => { s.armor += n; } } }),
  relic({ id: "rm_riveted_strap", name: "Riveted Strap", rarity: "common", tags: ["Guard"], text: "+1 Armor (+1)", hooks: { stats: (s, n) => { s.armor += n; } } }),
  // Crits
  relic({ id: "rm_chipped_fang", name: "Chipped Fang", rarity: "common", tags: ["Crit"], text: "Crits deal +2% damage (+2%)", hooks: { stats: (s, n) => { s.critDmg = (s.critDmg ?? 0) + 2 * n; } } }),
  relic({ id: "rm_barbed_hook", name: "Barbed Hook", rarity: "common", tags: ["Crit"], text: "Crits deal +3% damage (+3%)", hooks: { stats: (s, n) => { s.critDmg = (s.critDmg ?? 0) + 3 * n; } } }),
  relic({ id: "rm_cracked_lens", name: "Cracked Lens", rarity: "common", tags: ["Crit"], text: "Crits deal +5% damage (+5%)", hooks: { stats: (s, n) => { s.critDmg = (s.critDmg ?? 0) + 5 * n; } } }),
  relic({ id: "rm_glass_bead", name: "Glass Bead", rarity: "common", tags: ["Crit"], text: "+1% Crit chance (+1%)", hooks: { stats: (s, n) => { s.critChance += n; } } }),
  relic({ id: "rm_hawk_feather", name: "Hawk Feather", rarity: "common", tags: ["Crit"], text: "+2% Crit chance (+2%)", hooks: { stats: (s, n) => { s.critChance += 2 * n; } } }),
  // Dodge and Bash
  relic({ id: "rm_soft_boots", name: "Soft Boots", rarity: "common", tags: ["Tempo"], text: "+1% Dodge (+1%)", hooks: { stats: (s, n) => { s.dodge += n; } } }),
  relic({ id: "rm_sparrow_bone", name: "Sparrow Bone", rarity: "common", tags: ["Tempo"], text: "+2% Dodge (+2%)", hooks: { stats: (s, n) => { s.dodge += 2 * n; } } }),
  relic({ id: "rm_lead_weight", name: "Lead Weight", rarity: "common", tags: ["Strike"], text: "+1% Bash (+1%)", hooks: { stats: (s, n) => { s.bash += n; } } }),
  // Spells, statuses, damage dealt and taken
  relic({ id: "rm_ink_pot", name: "Ink Pot", rarity: "common", tags: ["Arcane"], text: "Spell Amp +3% (+3%)", hooks: { stats: (s, n) => { s.spellAmp += 3 * n; } } }),
  relic({ id: "rm_candle_stub", name: "Candle Stub", rarity: "common", tags: ["Arcane"], text: "Spell Amp +5% (+5%)", hooks: { stats: (s, n) => { s.spellAmp += 5 * n; } } }),
  relic({ id: "rm_rusty_nail", name: "Rusty Nail", rarity: "common", tags: ["Poison", "Burn", "Bleed"], text: "Status damage +3% (+3%)", hooks: { stats: (s, n) => { s.dotAmp = (s.dotAmp ?? 0) + 3 * n; } } }),
  relic({ id: "rm_sour_vial", name: "Sour Vial", rarity: "common", tags: ["Poison", "Burn", "Bleed"], text: "Status damage +5% (+5%)", hooks: { stats: (s, n) => { s.dotAmp = (s.dotAmp ?? 0) + 5 * n; } } }),
  relic({ id: "rm_whet_pebble", name: "Whet Pebble", rarity: "common", tags: ["Strike"], text: "You deal +2% damage (+2%)", hooks: { stats: (s, n) => { s.dmgDealt = (s.dmgDealt ?? 0) + 2 * n; } } }),
  relic({ id: "rm_quilted_lining", name: "Quilted Lining", rarity: "common", tags: ["Guard"], text: "You take 2% less damage (+2%)", hooks: { stats: (s, n) => { s.dmgTaken = (s.dmgTaken ?? 0) - Math.min(20, 2 * n); } } }),
  // Healing
  relic({ id: "rm_herb_bundle", name: "Herb Bundle", rarity: "common", tags: ["Blood"], text: "Healing +3% (+3%)", hooks: { healMult: n => 1 + (3 * n) / 100 } }),
  relic({ id: "rm_clean_linen", name: "Clean Linen", rarity: "common", tags: ["Blood"], text: "Healing +5% (+5%)", hooks: { healMult: n => 1 + (5 * n) / 100 } }),
  relic({ id: "rm_field_rations", name: "Field Rations", rarity: "common", tags: ["Blood"], text: "Heal 1 after each fight you win (+1)", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") heal(b, f, n, "Field Rations"); } } }),
  relic({ id: "rm_mint_leaves", name: "Mint Leaves", rarity: "common", tags: ["Blood"], text: "Heal 2 after each fight you win (+2)", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") heal(b, f, 2 * n, "Mint Leaves"); } } }),
  relic({ id: "rm_bone_charm", name: "Bone Charm", rarity: "common", tags: ["Kill", "Blood"], text: "Kills heal 1 (+1)", hooks: { onKill: (b, c, n) => { heal(b, c.attacker, n, "Bone Charm"); } } }),
  // Fight openers
  relic({ id: "rm_wax_seal", name: "Wax Seal", rarity: "common", tags: ["Guard"], text: "Start each fight with 1 Barrier (+1)", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "barrier", n) } }),
  relic({ id: "rm_cork_shield", name: "Cork Shield", rarity: "common", tags: ["Guard"], text: "Start each fight with 2 Barrier (+2)", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "barrier", 2 * n) } }),
  relic({ id: "rm_moss_pad", name: "Moss Pad", rarity: "common", tags: ["Blood"], text: "Start each fight with 1 Regen (+1)", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "regen", n) } }),
  relic({ id: "rm_opening_jab", name: "First Blood Ribbon", rarity: "common", tags: ["Strike"], text: "Your first hit each fight deals +2 (+2)",
    hooks: { modifyAttack: (_b, c, n) => { if (!c.attacker.flags["rmJab"]) { c.attacker.flags["rmJab"] = 1; c.bonus += 2 * n; } } } }),
  relic({ id: "rm_burr", name: "Burr", rarity: "common", tags: ["Thorns"], text: "When hit, deal 1 back (+1)", hooks: { whenHit: (b, c, n) => ping(b, c.attacker, n, "Burr") } }),
  // Gold
  relic({ id: "rm_tin_cup", name: "Tin Cup", rarity: "common", tags: ["Gold"], text: "+1 Gold from every fight you win (+1)", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.gold += n; } } }),
  relic({ id: "rm_bent_coin", name: "Bent Coin", rarity: "common", tags: ["Gold"], text: "+2 Gold from every fight you win (+2)", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.gold += 2 * n; } } }),
  // A little better (Uncommon)
  relic({ id: "rm_iron_flask", name: "Iron Flask", rarity: "uncommon", tags: ["Blood", "Guard"], text: "+3 Max HP and +1 Armor (+3 / +1)", hooks: { stats: (s, n) => { s.maxHp += 3 * n; s.armor += n; } } }),
  relic({ id: "rm_steel_thimble", name: "Steel Thimble", rarity: "uncommon", tags: ["Strike", "Crit"], text: "+1 Damage and +1% Crit chance (+1 / +1%)", hooks: { stats: (s, n) => { s.damage += n; s.critChance += n; } } }),
  relic({ id: "rm_traveller_cloak", name: "Traveller's Cloak", rarity: "uncommon", tags: ["Tempo", "Blood"], text: "+2% Dodge and +2 Max HP (+2% / +2)", hooks: { stats: (s, n) => { s.dodge += 2 * n; s.maxHp += 2 * n; } } })
];

// ---------- Small talents: I / II / III ----------
export const MINOR_TALENTS: HookDef[] = [
  talent({ id: "tm_sturdy", name: "Sturdy", tags: ["Blood"], text: "+3 / +5 / +8 Max HP", hooks: { stats: (s, n) => { s.maxHp += rank(n, 3, 5, 8); } } }),
  talent({ id: "tm_practiced", name: "Practiced Strikes", tags: ["Strike"], text: "+1 / +2 / +3 Damage", weight: 1.4, hooks: { stats: (s, n) => { s.damage += n; } } }),
  talent({ id: "tm_hardened", name: "Hardened", tags: ["Guard"], text: "+1 / +1 / +2 Armor, and +2 / +4 / +6 Max HP", hooks: { stats: (s, n) => { s.armor += rank(n, 1, 1, 2); s.maxHp += 2 * n; } } }),
  talent({ id: "tm_keen_edge", name: "Keen Edge", tags: ["Crit"], text: "Crits deal +5% / +10% / +15% damage", hooks: { stats: (s, n) => { s.critDmg = (s.critDmg ?? 0) + 5 * n; } } }),
  talent({ id: "tm_sharp_eye", name: "Sharp Eye", tags: ["Crit"], text: "+1% / +2% / +4% Crit chance", hooks: { stats: (s, n) => { s.critChance += rank(n, 1, 2, 4); } } }),
  talent({ id: "tm_nimble", name: "Nimble Step", tags: ["Tempo"], text: "+1% / +2% / +4% Dodge", hooks: { stats: (s, n) => { s.dodge += rank(n, 1, 2, 4); } } }),
  talent({ id: "tm_studious", name: "Studious", tags: ["Arcane"], text: "Spell Amp +4% / +8% / +12%", hooks: { stats: (s, n) => { s.spellAmp += 4 * n; } } }),
  talent({ id: "tm_field_medic", name: "Field Medic", tags: ["Blood"], text: "Healing +5% / +10% / +15%", hooks: { healMult: n => 1 + (5 * n) / 100 } }),
  talent({ id: "tm_second_wind", name: "Second Wind", tags: ["Blood"], text: "Heal 1 / 2 / 3 after each fight you win", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") heal(b, f, n, "Second Wind"); } } }),
  talent({ id: "tm_thrifty", name: "Thrifty", tags: ["Gold"], text: "+1 / +2 / +3 Gold from every fight you win", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.gold += n; } } }),
  talent({ id: "tm_padded", name: "Padded", tags: ["Guard"], text: "Start each fight with 1 / 2 / 3 Barrier", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "barrier", n) } }),
  talent({ id: "tm_steady_breath", name: "Steady Breath", tags: ["Blood"], text: "Start each fight with 1 / 1 / 2 Regen", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "regen", rank(n, 1, 1, 2)) } }),
  talent({ id: "tm_prickly", name: "Prickly", tags: ["Thorns"], text: "When hit, deal 1 / 1 / 2 back", hooks: { whenHit: (b, c, n) => ping(b, c.attacker, rank(n, 1, 1, 2), "Prickly") } }),
  talent({ id: "tm_offhand_drills", name: "Off-hand Drills", tags: ["Tempo"], text: "+1 / +1 / +2 off-hand Damage", hooks: { stats: (s, n) => { s.offDamage += rank(n, 1, 1, 2); } } }),
  talent({ id: "tm_lingering_harm", name: "Lingering Harm", tags: ["Poison", "Burn", "Bleed"], text: "Status damage +5% / +10% / +15%", hooks: { stats: (s, n) => { s.dotAmp = (s.dotAmp ?? 0) + 5 * n; } } }),
  talent({ id: "tm_precision", name: "Precision Training", tags: ["Strike"], text: "You deal +2% / +4% / +6% damage", hooks: { stats: (s, n) => { s.dmgDealt = (s.dmgDealt ?? 0) + 2 * n; } } }),
  talent({ id: "tm_toughened", name: "Toughened", tags: ["Guard"], text: "You take 2% / 4% / 6% less damage", hooks: { stats: (s, n) => { s.dmgTaken = (s.dmgTaken ?? 0) - 2 * n; } } }),
  talent({ id: "tm_heavy_hand", name: "Heavy Hand", tags: ["Strike"], text: "+1% / +2% / +3% Bash", hooks: { stats: (s, n) => { s.bash += n; } } }),
  talent({ id: "tm_opening_jab", name: "Opening Jab", tags: ["Strike"], text: "Your first hit each fight deals +2 / +3 / +5",
    hooks: { modifyAttack: (_b, c, n) => { if (!c.attacker.flags["tmJab"]) { c.attacker.flags["tmJab"] = 1; c.bonus += rank(n, 2, 3, 5); } } } })
];

// ---------- Draw weights for the existing pool (1 = normal; small and plain stays 1) ----------
// Read from what each one does: game-changing rules, "never / always / double / triple / every round",
// and pieces that build combos are the rarest; conditional status tricks sit in between.
const RARE_FIND = 0.12, UNCOMMON_FIND = 0.3, MIDDLING = 0.6;
const byWeight = (w: number, ids: string[]) => Object.fromEntries(ids.map(id => [id, w]));
export const RELIC_WEIGHT: Record<string, number> = {
  // Build-defining: rule changes and engines.
  ...byWeight(RARE_FIND, ["hemorrhage", "weighted_die", "cinder_crown", "r_fortress_heart", "mirror_of_spite", "plague_bearer", "doomsayers_bell",
    "blood_moon", "vampire_cloak", "nudging_stone", "sixth_sense", "r_counterstrike", "r_tower_crest", "r_titans_grip", "r_critical_mass",
    "r_flurry_charm", "r_unbroken_chain", "r_gauntlet_strength", "alchemists_catalyst", "war_drum", "r_halo_retribution", "r_arcane_prism",
    "r_sin_ledger", "gamblers_glove", "hydra_fang", "bloodletter", "executioners_axe", "r_unstoppable", "pc_grail",
    "lr_anvil_heart", "lr_crown_thorns", "lr_eye_storm", "lr_sixth_sun", "lr_saints_breath", "lr_doomclock", "lr_philosophers_stone", "lr_twin_souls",
    "lr_unbreakable_vow", "lr_stormheart"]),
  // Strong, or a key piece of a combo.
  ...byWeight(UNCOMMON_FIND, ["shock_coil", "odd_charm", "even_charm", "frostbite_needle", "conductor", "kindling_oil", "sulfur_pouch", "glacier_heart",
    "r_polished_mirror", "r_retribution", "r_ghost_step", "r_glass_cannon", "r_scissor_strike", "r_tempo_blades", "r_shatterpoint", "r_overcharged_cell",
    "r_war_harness", "r_iron_knuckles", "r_skullcracker", "purifying_salt", "pc_spare_vial", "four_leaf_clover", "r_paired_scabbards", "r_storm_glass",
    "r_tesla_coil", "r_reliquary_ash", "r_oathstone", "black_candle", "r_open_veins", "r_shackles_doubt", "lightning_rod", "r_smouldering_coal",
    "r_coal_bellows", "copper_coil", "parrying_dagger", "leech_fang", "r_hunters_eye", "rb_armor_4", "rb_armor_5"]),
  // Useful conditional tricks.
  ...byWeight(MIDDLING, ["tinderbox", "bellows", "nightshade_vial", "serrated_edge", "keen_eye", "rabbits_foot", "viper_fang", "flint", "frost_shard",
    "static_charm", "hand_mirror", "tonic_flask", "buckler", "antidote_ring", "fire_ward", "thermal_coat", "grounding_rod", "r_static_jar", "r_rain_barrel",
    "r_votive_candle", "r_spiked_rim", "raven_feather", "storm_bottle", "hex_doll", "r_lethal_focus", "r_bleeding_edge", "r_twin_sigil", "r_whetstone_pair",
    "r_cross_guard", "r_smoke_bomb", "r_riposte_charm", "skeleton_key", "pc_potion_belt", "trophy_belt", "battle_standard", "r_bracing_strap",
    "r_shield_polish", "rb_armor_3", "rb_hp_5"])
};
export const TALENT_WEIGHT: Record<string, number> = {
  ...byWeight(RARE_FIND, ["t_reaper", "t_pyromaniac", "t_immunologist", "t_spellweaver", "t_overkill", "t_catalyst", "t_iron_will", "t_vanguard",
    "t_boundless_static", "t_fire_within", "t_overwhelm", "t_reckless", "t_bloodrage", "t_battle_trance", "t_conductor", "t_ambidextrous",
    "t_exploit_opening", "t_crushing_blows", "t_quick_hands", "t_zealotry"]),
  ...byWeight(UNCOMMON_FIND, ["t_momentum", "t_last_stand", "t_kindler", "t_envenomed", "t_live_wire", "t_malediction", "t_divine_favor", "t_lucky_streak",
    "t_relentless", "t_whirlwind", "t_rhythm", "t_executioner", "t_hexer", "t_pyrotechnics", "t_static_charge", "t_shield_bash", "t_absolution",
    "t_counter_stance", "t_riposte", "t_righteous", "t_static_field", "t_troll_blood", "t_fault_lines"]),
  ...byWeight(MIDDLING, ["t_hemophile", "t_toxicologist", "t_stalwart", "t_retaliate", "t_cold_blooded", "t_duelist", "t_shield_wall", "t_frostbite",
    "t_hunters_mark", "t_tortoise", "t_slippery", "t_heavy_hitter", "t_twin_strikes", "t_exsanguinate", "t_kick_down", "t_battle_fury", "t_crossed_blades",
    "t_parrying_blades", "t_thick_skin", "t_light_feet"])
};
/** A relic's or talent's draw weight. */
export const drawWeight = (d: HookDef) => d.weight ?? (d.kind === "talent" ? TALENT_WEIGHT[d.id] : RELIC_WEIGHT[d.id]) ?? 1;
