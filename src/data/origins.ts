// Origins (starting kit + one small passive) and curses.
import type { HookDef, OriginId } from "../engine/types";
import { applyStatus, depth, heal, log, ping, st } from "./helpers";

/** Each origin's favourite gear shows up about twice as often in its loot. */
export const AFFINITY: Record<OriginId, string[]> = {
  warrior: ["w_sword", "w_axe", "w_hand_axe", "w_hammer", "w_morningstar", "w_spear", "o_wooden_shield", "o_tower_shield", "o_kite_shield", "o_spiked_shield", "o_war_banner", "a_chain", "a_plate", "a_scale", "a_spiked", "t_warlord_torc"],
  rogue: ["w_dagger", "w_throwing_knife", "w_rapier", "w_katana", "w_whip", "w_sickle", "w_main_gauche", "w_bow", "o_smoke_pouch", "o_buckler", "a_leather", "a_shadow", "a_assassin", "t_thieves_ring", "t_lucky_coin"],
  mage: ["w_staff", "w_greatstaff", "w_wand", "w_lute", "o_ember_charm", "o_frost_orb", "o_grimoire", "o_tome", "o_storm_lantern", "o_crystal_orb", "o_runestone", "a_cloth", "a_bloodweave", "t_archmage_signet", "t_ember_pendant"],
  cleric: ["w_mace", "w_morningstar", "w_flail", "w_hammer", "o_holy_symbol", "o_prayer_beads", "o_sun_disc", "o_reliquary", "o_censer", "a_padded", "a_vestments", "a_scale", "t_templar_seal", "t_band_vigor"]
};

export const ORIGINS: Record<OriginId, { name: string; hp: number; kit: string[]; passive: string; blurb: string }> = {
  warrior: { name: "Warrior", hp: 32, kit: ["w_sword", "o_wooden_shield", "a_chain"], passive: "o_warrior", blurb: "Steel and shield. Hard to put down." },
  rogue: { name: "Rogue", hp: 26, kit: ["w_dagger", "w_throwing_knife", "a_leather"], passive: "o_rogue", blurb: "Two blades, two dice, first strike." },
  mage: { name: "Mage", hp: 28, kit: ["w_staff", "o_ember_charm", "a_cloth"], passive: "o_mage", blurb: "Weak blows, but every face can be a spell." },
  cleric: { name: "Cleric", hp: 28, kit: ["w_mace", "o_holy_symbol", "a_padded"], passive: "o_cleric", blurb: "Faith that heals what it fights for." }
};

const origin = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "origin", ...d });
export const ORIGIN_PASSIVES: HookDef[] = [
  origin({ id: "o_warrior", name: "Battle-Hardened", tags: ["Guard"], text: "Start each fight with Barrier equal to your Armor (at most 1 + 2 per floor)", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "barrier", Math.min(f.armor, 1 + 2 * depth(f))) } }),
  origin({ id: "o_rogue", name: "Opportunist", tags: ["Crit", "Luck"], text: "Your first attack each fight rolls twice and keeps the better", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "focus", 1) } }),
  origin({ id: "o_mage", name: "Arcane Spark", tags: ["Arcane"], text: "Statuses your weapon's spell faces apply get +1 stack",
    hooks: { onStatusApplied: (_b, self, t, status) => { if (self.flags["casting"] && t !== self && !["stun", "shock"].includes(status)) t.statuses[status] = st(t, status) + 1; } } }),
  origin({ id: "o_cleric", name: "Devotion", tags: ["Blood"], text: "At the end of each round, heal 1 for each positive status you have",
    hooks: { onRoundEnd: (b, f) => { const n = (["regen", "barrier", "might", "haste", "focus", "evade", "spikes", "ward"] as const).filter(s => st(f, s) > 0).length; if (n) heal(b, f, n, "Devotion"); } } })
];

const curse = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "curse", ...d });
export const CURSES: HookDef[] = [
  curse({ id: "c_rust", name: "Rust", tags: ["Guard"], text: "−1 Armor", hooks: { stats: s => { s.armor -= 1; } } }),
  curse({ id: "c_withered", name: "Withered", tags: ["Blood"], text: "Healing is halved", hooks: { healMult: () => 0.5 } }),
  curse({ id: "c_haunted", name: "Haunted", tags: ["Poison"], text: "Every fight starts with 2 Poison on you", hooks: { onFightStart: (b, f) => applyStatus(b, null, f, "poison", 2) } }),
  curse({ id: "c_fragile", name: "Fragile", tags: ["Blood"], text: "−5 Max HP", hooks: { stats: s => { s.maxHp -= 5; } } }),
  curse({ id: "c_clumsy", name: "Clumsy", tags: ["Luck"], text: "Your 1s miss and deal 2 to you",
    hooks: { modifyAttack: (b, c) => { if (c.face === 1 && !c.offhand) { c.noDamage = true; ping(b, c.attacker, 2, "Clumsy"); } } } }),
  curse({ id: "c_dread", name: "Dread", tags: ["Hex"], text: "Start every fight Weak for 2 rounds", hooks: { onFightStart: (b, f) => { applyStatus(b, null, f, "weak", 2); log(b, "Dread weighs on you."); } } })
];
