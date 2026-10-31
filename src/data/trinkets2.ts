// Trinkets that don't give Armor (Crit damage, Max HP, other effects), crit gear that punishes
// Chilled, Poisoned and Smouldering foes, more Common trinkets, and four new Legendary trinkets.
import type { AttackCtx, GearBase } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, log, loseHp, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const T = { kind: "trinket" as const, slot: "trinket" as const };
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
/** Crits against a foe with this status deal `pct`% more. */
const critVs = (status: "chill" | "poison" | "smoulder", pct: number) => (_b: unknown, c: AttackCtx) => {
  if (c.kind === "crit" && st(c.defender, status) > 0) c.mult *= 1 + pct / 100;
};

export const TRINKETS_2: GearBase[] = [
  // Crit damage
  only("uncommon", { ...T, id: "tk_whetstone", name: "Whetstone Pendant", tags: ["Crit"], text: "Your Crits deal 20% more.", hooks: { stats: s => { s.critDmg = (s.critDmg ?? 0) + 20; } } }),
  only("rare", { ...T, id: "tk_exec_signet", name: "Executioner's Signet", tags: ["Crit", "Kill"], text: "Your Crits deal 35% more.", hooks: { stats: s => { s.critDmg = (s.critDmg ?? 0) + 35; } } }),
  only("epic", { ...T, id: "tk_old_wolf", name: "Fang of the Old Wolf", tags: ["Crit", "Blood"], text: "Your Crits deal 50% more and heal you 2.",
    hooks: { stats: s => { s.critDmg = (s.critDmg ?? 0) + 50; }, onCrit: (b, c) => { heal(b, c.attacker, 2, "Fang of the Old Wolf"); } } }),
  // Max HP
  only("common", { ...T, id: "tk_hearthstone", name: "Hearthstone Ring", tags: ["Blood"], maxHp: 5, text: "+5 Max HP.", hooks: {} }),
  only("uncommon", { ...T, id: "tk_fortitude", name: "Amulet of Fortitude", tags: ["Blood"], maxHp: 10, text: "+10 Max HP.", hooks: {} }),
  only("rare", { ...T, id: "tk_mountain_heart", name: "Heart of the Mountain", tags: ["Blood", "Guard"], maxHp: 18, text: "+18 Max HP. Heal 5% of your Max HP at the start of every fight.",
    hooks: { onFightStart: (b, f) => { heal(b, f, Math.ceil(f.maxHp * 0.05), "Heart of the Mountain"); } } }),
  // Other effects
  only("uncommon", { ...T, id: "tk_leech_ring", name: "Leech Ring", tags: ["Blood"], text: "Heal 1 every time you land a hit.", hooks: { onHit: (b, c) => { heal(b, c.attacker, 1, "Leech Ring"); } } }),
  only("rare", { ...T, id: "tk_quickstep", name: "Quickstep Anklet", tags: ["Tempo"], text: "Start every fight with Haste (an extra attack).", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "haste", 1) } }),
  only("rare", { ...T, id: "tk_ferryman", name: "Ferryman's Coin", tags: ["Luck", "Kill"], text: "Every kill gives you 4 extra Gold.", hooks: { onKill: (b, c) => { c.attacker.gold += 4; log(b, "🪙 The Ferryman's Coin: +4 Gold."); } } }),
  // More Commons
  only("common", { ...T, id: "tk_tin_whistle", name: "Tin Whistle", tags: ["Strike"], text: "Start every fight with 1 Might.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "might", 1) } }),
  only("common", { ...T, id: "tk_river_stone", name: "River Stone", tags: ["Blood"], maxHp: 3, text: "+3 Max HP.", hooks: {} }),
  only("common", { ...T, id: "tk_knucklebone", name: "Knucklebone Charm", tags: ["Crit", "Luck"], text: "+4% Crit chance.", hooks: { stats: s => { s.critChance += 4; } } }),
  only("common", { ...T, id: "tk_ribbon", name: "Frayed Ribbon", tags: ["Tempo"], dodge: { common: 3 }, text: "+3% Dodge.", hooks: {} }),
  only("common", { ...T, id: "tk_bent_nail", name: "Bent Nail", tags: ["Crit"], text: "Your Crits deal 10% more.", hooks: { stats: s => { s.critDmg = (s.critDmg ?? 0) + 10; } } })
];

/** Crit gear that punishes Chilled, Poisoned and Smouldering foes: three items for each, across the item types. */
export const CRIT_VS_STATUS: GearBase[] = [
  // Chilled
  only("rare", { kind: "weapon", slot: "main", id: "cv_frostfang", name: "Frostfang Blade", tags: ["Crit", "Frost"], damage: 5, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: "Crits on 5 and 6. Its Crits deal 50% more to Chilled enemies.", hooks: { modifyAttack: (b, c) => { if (!c.offhand) critVs("chill", 50)(b, c); } } }),
  only("uncommon", { kind: "off", slot: "off", id: "cv_rimeglass", name: "Rimeglass Focus", tags: ["Crit", "Frost", "Arcane"], text: "Your Crits deal 40% more to Chilled enemies.", hooks: { modifyAttack: critVs("chill", 40) } }),
  only("epic", { ...T, id: "cv_winter_shard", name: "Shard of Deep Winter", tags: ["Crit", "Frost"], text: "Your Crits deal 60% more to Chilled enemies, and Chill them 1 more.",
    hooks: { modifyAttack: critVs("chill", 60), onCrit: (b, c) => { if (st(c.defender, "chill") > 0) applyStatus(b, c.attacker, c.defender, "chill", 1); } } }),
  // Poisoned
  only("rare", { kind: "weapon", slot: "main", weaponType: "dagger", id: "cv_vipers_kiss", name: "Viper's Kiss", tags: ["Crit", "Poison"], damage: 3, offDamage: 4, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: "Dagger. Crits on 5 and 6. Crits deal 50% more to Poisoned enemies. Best in the off-hand.", hooks: { modifyAttack: critVs("poison", 50) } }),
  only("uncommon", { kind: "armour", slot: "armour", id: "cv_toxin_jerkin", name: "Toxin-Weave Jerkin", tags: ["Crit", "Poison"], armor: 1, text: "Light: +1 Armor. Your Crits deal 40% more to Poisoned enemies.", hooks: { modifyAttack: critVs("poison", 40) } }),
  only("epic", { ...T, id: "cv_asp_earring", name: "Asp-Fang Earring", tags: ["Crit", "Poison"], text: "Your Crits deal 60% more to Poisoned enemies and add 2 Poison.",
    hooks: { modifyAttack: critVs("poison", 60), onCrit: (b, c) => { if (st(c.defender, "poison") > 0) applyStatus(b, c.attacker, c.defender, "poison", 2); } } }),
  // Smouldering
  only("epic", { kind: "weapon", slot: "main", id: "cv_pyre_maul", name: "Pyre Maul", tags: ["Crit", "Burn", "Strike"], damage: 9, twoHanded: true, faces: PLAIN,
    text: "Two-handed. Crits deal 75% more to Smouldering enemies.", hooks: { modifyAttack: critVs("smoulder", 75) } }),
  only("rare", { kind: "off", slot: "off", shield: true, id: "cv_ember_bulwark", name: "Ember Bulwark", tags: ["Crit", "Burn", "Guard"], armor: 2, text: "Shield. +2 Armor. Your Crits deal 40% more to Smouldering enemies.", hooks: { modifyAttack: critVs("smoulder", 40) } }),
  only("rare", { ...T, id: "cv_cinder_eye", name: "Cinder Eye", tags: ["Crit", "Burn"], text: "Your Crits deal 50% more to Smouldering enemies.", hooks: { modifyAttack: critVs("smoulder", 50) } })
];

/** Four new Legendary trinkets. */
export const TRINKET_LEGENDARIES: GearBase[] = [
  { ...T, id: "lx_ruinous_eye", rarity: "legendary", name: "The Ruinous Eye", tags: ["Hex", "Kill"],
    legendary: { minFloor: 3, asBase: "t_brass_amulet", reveal: "Every hit you land also deals 4% of the enemy's Max HP (ignores Armor)." },
    text: "It doesn't look at you. It looks at what's left of you.",
    hooks: { onHit: (b, c) => { if (c.defender.hp > 0) { const n = Math.max(1, Math.ceil(c.defender.maxHp * 0.04)); loseHp(b, c.defender, n); log(b, `👁️ The Ruinous Eye: ${n}.`); } } } },
  { ...T, id: "lx_gilded_skull", rarity: "legendary", name: "The Gilded Skull", tags: ["Kill", "Blood"],
    legendary: { minFloor: 3, asBase: "t_band_vigor", reveal: "Every kill gives you +1 Max HP for the rest of the run." },
    text: "It grins wider with every name it learns.",
    hooks: { onKill: (b, c) => { const a = c.attacker; a.persist["maxHpLoss"] = (a.persist["maxHpLoss"] ?? 0) - 1; a.maxHp += 1; a.hp += 1; log(b, "💀 The Gilded Skull: +1 Max HP."); } } },
  { ...T, id: "lx_vanity_mirror", rarity: "legendary", name: "Mirror of Vanity", tags: ["Crit", "Luck"],
    legendary: { minFloor: 3, asBase: "t_ring_might", reveal: "+15% Crit chance and your Crits deal 60% more." },
    text: "It only ever shows you at your best.",
    hooks: { stats: s => { s.critChance += 15; s.critDmg = (s.critDmg ?? 0) + 60; } } },
  { ...T, id: "lx_heart_thorns", rarity: "legendary", name: "Heart of Thorns", tags: ["Thorns", "Guard"],
    legendary: { minFloor: 3, asBase: "t_brass_amulet", reveal: "Whenever you're hit, the attacker takes half the damage you took." },
    text: "Love it, and it bleeds you. Strike it, and it bleeds you back.",
    hooks: { whenHit: (b, c) => { if (c.dealt > 0 && c.attacker.hp > 0) { const n = Math.ceil(c.dealt / 2); loseHp(b, c.attacker, n); log(b, `🌹 Heart of Thorns: ${n} back.`); } } } }
];
