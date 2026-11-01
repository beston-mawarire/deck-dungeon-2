// The Jeweller: put two things on the bench and pay to fuse them.
// - Relic recipes (here and in fusions.ts): relics that fuse are labelled in your inventory.
// - Trinket recipes: never labelled. Plain-looking trinkets (and some old ones) turn into something
//   remarkable when fused with the right partner. Players find out by trying.
import { other } from "../engine/statuses";
import type { GearBase, HookDef } from "../engine/types";
import { applyStatus, heal } from "./helpers";

const relic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "relic", ...d });
const fused = (d: Omit<HookDef, "kind" | "rarity">): HookDef => ({ kind: "relic", rarity: "legendary", ...d });

// ---------- Relics: six new pairs (War Drum + Battle Standard are existing relics) ----------
export const JEWEL_RELICS: HookDef[] = [
  relic({ id: "quicksilver_vial", name: "Quicksilver Vial", rarity: "common", tags: ["Tempo"], text: "+3% Dodge (+3%)", hooks: { stats: (s, n) => { s.dodge += 3 * n; } } }),
  relic({ id: "feather_charm", name: "Feather Charm", rarity: "common", tags: ["Tempo"], text: "+3% Dodge (+3%)", hooks: { stats: (s, n) => { s.dodge += 3 * n; } } }),
  relic({ id: "grave_dirt", name: "Grave Dirt", rarity: "common", tags: ["Kill", "Blood"], text: "Kills heal 1 (+1)", hooks: { onKill: (b, c, n) => { heal(b, c.attacker, n, "Grave Dirt"); } } }),
  relic({ id: "raven_feather", name: "Raven Feather", rarity: "common", tags: ["Hex"], text: "Enemies start every fight with 1 Doom (+1)", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, other(b, f), "doom", n) } }),
  relic({ id: "storm_bottle", name: "Storm Bottle", rarity: "common", tags: ["Storm"], text: "Start every fight Charged", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "charged", 1) } }),
  relic({ id: "copper_coil", name: "Copper Coil", rarity: "uncommon", tags: ["Storm"], text: "Your Crits apply 1 Static (+1)", hooks: { onCrit: (b, c, n) => applyStatus(b, c.attacker, c.defender, "static", n) } }),
  relic({ id: "iron_ration", name: "Iron Ration", rarity: "common", tags: ["Blood"], text: "+4 Max HP (+4)", hooks: { stats: (s, n) => { s.maxHp += 4 * n; } } }),
  relic({ id: "healers_kit", name: "Healer's Kit", rarity: "common", tags: ["Blood"], text: "Heal 3 after every fight you win (+3)", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.hp = Math.min(f.maxHp, f.hp + 3 * n); } } }),
  relic({ id: "hex_doll", name: "Hex Doll", rarity: "common", tags: ["Hex"], text: "Enemies start every fight Weak", hooks: { onFightStart: (b, f) => applyStatus(b, f, other(b, f), "weak", 1) } }),
  relic({ id: "black_candle", name: "Black Candle", rarity: "uncommon", tags: ["Hex"], text: "Enemies start every fight Exposed", hooks: { onFightStart: (b, f) => applyStatus(b, f, other(b, f), "exposed", 1) } })
];

export const JEWEL_FUSED_RELICS: HookDef[] = [
  fused({ id: "f_windwalker", name: "Windwalker", tags: ["Tempo"], text: "+15% Dodge; every attack you dodge gives you Haste",
    hooks: { stats: s => { s.dodge += 15; }, onDodge: (b, c) => applyStatus(b, c.defender, c.defender, "haste", 1) } }),
  fused({ id: "f_reapers_toll", name: "Reaper's Toll", tags: ["Kill", "Hex"], text: "Enemies start every fight with 4 Doom; kills heal 10% of your Max HP",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, other(b, f), "doom", 4), onKill: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.1), "Reaper's Toll"); } } }),
  fused({ id: "f_thunderhead", name: "Thunderhead", tags: ["Storm"], text: "Every hit applies 2 Static; Crits also Shock",
    hooks: { onHit: (b, c) => { applyStatus(b, c.attacker, c.defender, "static", 2); if (c.kind === "crit") applyStatus(b, c.attacker, c.defender, "shock", 1); } } }),
  fused({ id: "f_warlords_banner", name: "Warlord's Banner", tags: ["Strike", "Tempo"], text: "Start every fight with 4 Might and Haste",
    hooks: { onFightStart: (b, f) => { applyStatus(b, f, f, "might", 4); applyStatus(b, f, f, "haste", 1); } } }),
  fused({ id: "f_undying_pack", name: "Undying Pack", tags: ["Blood"], text: "+20 Max HP; heal 3 at the end of every round",
    hooks: { stats: s => { s.maxHp += 20; }, onRoundEnd: (b, f) => { if (f.id === "player") heal(b, f, 3, "Undying Pack"); } } }),
  fused({ id: "f_witchs_altar", name: "Witch's Altar", tags: ["Hex"], text: "Enemies start every fight with 3 Weak, 3 Exposed and 2 Doom",
    hooks: { onFightStart: (b, f) => { const e = other(b, f); applyStatus(b, f, e, "weak", 3); applyStatus(b, f, e, "exposed", 3); applyStatus(b, f, e, "doom", 2); } } })
];

export const JEWEL_RELIC_RECIPES: { a: string; b: string; out: string }[] = [
  { a: "quicksilver_vial", b: "feather_charm", out: "f_windwalker" },
  { a: "grave_dirt", b: "raven_feather", out: "f_reapers_toll" },
  { a: "storm_bottle", b: "copper_coil", out: "f_thunderhead" },
  { a: "war_drum", b: "battle_standard", out: "f_warlords_banner" },
  { a: "iron_ration", b: "healers_kit", out: "f_undying_pack" },
  { a: "hex_doll", b: "black_candle", out: "f_witchs_altar" }
];

// ---------- Trinkets ----------
const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const T = { kind: "trinket" as const, slot: "trinket" as const };
/** Fused trinkets: only ever made at the Jeweller (weight 0: they never drop). */
const F = (d: Omit<GearBase, "onlyRarity" | "kind" | "slot">): GearBase => ({ ...T, ...d, onlyRarity: "epic", weight: 0 });

/** Plain trinkets. Little or nothing on their own. */
export const JEWEL_TRINKETS: GearBase[] = [
  only("rare", { ...T, id: "tj_copper_band", name: "Copper Band", tags: ["Blood"], maxHp: 2, text: "+2 Max HP.", hooks: {} }),
  only("rare", { ...T, id: "tj_glass_bead", name: "Glass Bead", tags: ["Luck"], text: "It catches the light.", hooks: {} }),
  only("rare", { ...T, id: "tj_bone_charm", name: "Bone Charm", tags: ["Guard"], armor: 1, text: "+1 Armor.", hooks: {} }),
  only("rare", { ...T, id: "tj_iron_ring", name: "Plain Iron Ring", tags: ["Strike"], text: "Heavy, and nothing more.", hooks: {} }),
  only("rare", { ...T, id: "tj_silver_locket", name: "Silver Locket", tags: ["Blood"], maxHp: 5, text: "+5 Max HP. It won't open.", hooks: {} }),
  only("rare", { ...T, id: "tj_cats_eye", name: "Cat's Eye Stone", tags: ["Crit"], text: "+3% Crit chance.", hooks: { stats: s => { s.critChance += 3; } } }),
  only("rare", { ...T, id: "tj_obsidian_shard", name: "Obsidian Shard", tags: ["Strike"], text: "+1 Damage.", hooks: { stats: s => { s.damage += 1; } } }),
  only("epic", { ...T, id: "tj_moonstone", name: "Moonstone", tags: ["Tempo"], text: "+5% Dodge.", hooks: { stats: s => { s.dodge += 5; } } }),
  only("epic", { ...T, id: "tj_amber_drop", name: "Amber Drop", tags: ["Luck"], text: "Something tiny is trapped inside.", hooks: {} }),
  only("epic", { ...T, id: "tj_war_totem", name: "War Totem", tags: ["Strike"], text: "Start every fight with 1 Might.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "might", 1) } }),
  only("epic", { ...T, id: "tj_sunstone", name: "Sunstone", tags: ["Blood"], maxHp: 3, text: "+3 Max HP. Warm to the touch.", hooks: {} }),
  only("epic", { ...T, id: "tj_serpent_ring", name: "Serpent Ring", tags: ["Poison"], text: "+1 Damage.", hooks: { stats: s => { s.damage += 1; } } }),
  only("epic", { ...T, id: "tj_gilded_thimble", name: "Gilded Thimble", tags: ["Gold"], text: "Tiny, golden, useless.", hooks: {} }),
  // Epic trinkets that can't be fused, infused or combined: good as they are.
  only("epic", { ...T, id: "tj_heartseeker", name: "Heartseeker Brooch", tags: ["Crit"], noJewel: true, text: "Your first hit each fight is a Crit.",
    hooks: { modifyAttack: (_b, c) => { if (!c.attacker.flags["heartseeker"] && (c.kind === "hit" || c.kind === "graze")) { c.attacker.flags["heartseeker"] = 1; c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; } } } }),
  only("epic", { ...T, id: "tj_pilgrim_token", name: "Pilgrim's Token", tags: ["Blood", "Holy"], noJewel: true, maxHp: 12, text: "+12 Max HP. Heal 3 as every fight begins.",
    hooks: { onFightStart: (b, f) => { heal(b, f, 3, "Pilgrim's Token"); } } }),
  only("epic", { ...T, id: "tj_stormcaller", name: "Stormcaller Torc", tags: ["Storm"], noJewel: true, text: "Your 6s Shock the enemy.",
    hooks: { modifyAttack: (b, c) => { if (c.face === 6 && !c.offhand) applyStatus(b, c.attacker, c.defender, "shock", 1); } } })
];

export const FUSED_TRINKETS: GearBase[] = [
  F({ id: "tf_wedding_metals", name: "Wedding of Metals", tags: ["Blood", "Guard"], maxHp: 10, armor: 2, text: "+10 Max HP, +2 Armor. Heal 2 at the end of every round.",
    hooks: { onRoundEnd: (b, f) => { if (f.id === "player") heal(b, f, 2, "Wedding of Metals"); } } }),
  F({ id: "tf_prism_eye", name: "Prism Eye", tags: ["Crit", "Luck"], text: "+12% Crit chance. Your Crits Blind the enemy.",
    hooks: { stats: s => { s.critChance += 12; }, onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "blind", 1) } }),
  F({ id: "tf_bonesplitter", name: "Bonesplitter Fetish", tags: ["Strike", "Bleed"], armor: 1, text: "+3 Damage, +1 Armor. Every hit applies 1 Bleed.",
    hooks: { stats: s => { s.damage += 3; s.offDamage += 3; }, onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 1) } }),
  F({ id: "tf_lunar_heart", name: "Lunar Heart", tags: ["Tempo", "Blood"], maxHp: 15, text: "+15 Max HP, +10% Dodge. Every attack you dodge heals you 4.",
    hooks: { stats: s => { s.dodge += 10; }, onDodge: (b, c) => { heal(b, c.defender, 4, "Lunar Heart"); } } }),
  F({ id: "tf_amber_hourglass", name: "Amber Hourglass", tags: ["Tempo", "Luck"], text: "Start every fight with 2 Haste.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "haste", 2) } }),
  F({ id: "tf_fortunes_amber", name: "Fortune's Amber", tags: ["Luck", "Gold"], text: "Your 1s become 4s. +4 Gold per fight.",
    hooks: { modifyRoll: (_b, _f, r) => (r === 1 ? 4 : r), onFightEnd: (b, f) => { if (b.over === "won" && f.id === "player") f.gold += 4; } } }),
  F({ id: "tf_titans_ring", name: "Ring of the Titan", tags: ["Strike"], text: "+3 Damage. Start every fight with 3 Might.",
    hooks: { stats: s => { s.damage += 3; s.offDamage += 3; }, onFightStart: (b, f) => applyStatus(b, f, f, "might", 3) } }),
  F({ id: "tf_vampires_coil", name: "Vampire's Coil", tags: ["Blood"], text: "Heal 3 every time you land a hit.",
    hooks: { onHit: (b, c) => { heal(b, c.attacker, 3, "Vampire's Coil"); } } }),
  F({ id: "tf_moonstep", name: "Moonstep Anklet", tags: ["Tempo"], text: "+8% Dodge. Start every fight with Haste and Evade.",
    hooks: { stats: s => { s.dodge += 8; }, onFightStart: (b, f) => { applyStatus(b, f, f, "haste", 1); applyStatus(b, f, f, "evade", 1); } } }),
  F({ id: "tf_executioners_eye", name: "Executioner's Eye", tags: ["Crit", "Kill"], text: "+10% Crit chance. Your Crits deal 50% more.",
    hooks: { stats: s => { s.critChance += 10; s.critDmg = (s.critDmg ?? 0) + 50; } } }),
  F({ id: "tf_bone_drum", name: "Bone Drum", tags: ["Strike", "Hex"], armor: 1, text: "+1 Armor. Start every fight with 3 Might; the enemy starts with 2 Weak.",
    hooks: { onFightStart: (b, f) => { applyStatus(b, f, f, "might", 3); applyStatus(b, f, other(b, f), "weak", 2); } } }),
  F({ id: "tf_eclipse", name: "Eclipse Pendant", tags: ["Tempo", "Crit"], text: "+8% Dodge, +8% Crit chance. Every attack you dodge gives you 1 Might.",
    hooks: { stats: s => { s.dodge += 8; s.critChance += 8; }, onDodge: (b, c) => applyStatus(b, c.defender, c.defender, "might", 1) } }),
  F({ id: "tf_vipers_gaze", name: "Viper's Gaze", tags: ["Poison", "Crit"], text: "+6% Crit chance. Every hit applies 1 Poison; Crits apply 3 more.",
    hooks: { stats: s => { s.critChance += 6; }, onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", c.kind === "crit" ? 4 : 1) } }),
  F({ id: "tf_golden_thimble", name: "Golden Thimble", tags: ["Gold", "Kill"], text: "Every kill gives you 8 Gold.",
    hooks: { onKill: (_b, c) => { c.attacker.gold += 8; } } }),
  F({ id: "tf_silver_hearth", name: "Hearth of Silver", tags: ["Blood"], maxHp: 25, text: "+25 Max HP. Heal 5% of your Max HP at the start of every fight.",
    hooks: { onFightStart: (b, f) => { heal(b, f, Math.ceil(f.maxHp * 0.05), "Hearth of Silver"); } } })
];

/** Trinket recipes, by base id (either order). Never shown to the player. */
export const TRINKET_RECIPES: { a: string; b: string; out: string }[] = [
  { a: "tj_copper_band", b: "tj_iron_ring", out: "tf_wedding_metals" },
  { a: "tj_glass_bead", b: "tj_cats_eye", out: "tf_prism_eye" },
  { a: "tj_bone_charm", b: "tj_obsidian_shard", out: "tf_bonesplitter" },
  { a: "tj_silver_locket", b: "tj_moonstone", out: "tf_lunar_heart" },
  { a: "tj_amber_drop", b: "tj_glass_bead", out: "tf_amber_hourglass" },
  { a: "tj_amber_drop", b: "t_lucky_coin", out: "tf_fortunes_amber" },
  { a: "tj_iron_ring", b: "t_ring_might", out: "tf_titans_ring" },
  { a: "tj_copper_band", b: "tk_old_wolf", out: "tf_vampires_coil" },
  { a: "tj_moonstone", b: "tk_quickstep", out: "tf_moonstep" },
  { a: "tj_cats_eye", b: "tk_exec_signet", out: "tf_executioners_eye" },
  { a: "tj_bone_charm", b: "tj_war_totem", out: "tf_bone_drum" },
  { a: "tj_silver_locket", b: "tk_mountain_heart", out: "tf_silver_hearth" },
  { a: "tj_sunstone", b: "tj_moonstone", out: "tf_eclipse" },
  { a: "tj_serpent_ring", b: "tj_cats_eye", out: "tf_vipers_gaze" },
  { a: "tj_gilded_thimble", b: "tk_ferryman", out: "tf_golden_thimble" }
];

export const findRecipe = <R extends { a: string; b: string }>(list: R[], x: string, y: string) =>
  list.find(r => (r.a === x && r.b === y) || (r.a === y && r.b === x));
