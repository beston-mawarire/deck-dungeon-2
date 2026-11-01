// Build-around gear for Bleed, Weak, Might, and Heavy weapons (Stagger), with relics and talents to match.
import type { AttackCtx, Battle, GearBase, HookDef } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, log, loseHp, MISS, on, other, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const leg = (asBase: string, reveal: string, d: Omit<GearBase, "rarity" | "legendary">): GearBase => ({ ...d, rarity: "legendary", legendary: { minFloor: 3, asBase, reveal } });
const W = { kind: "weapon" as const, slot: "main" as const };
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const HEAVY_FACES = [MISS, HIT, HIT, HIT, CRIT, CRIT];
const inflict = (s: "bleed" | "weak", n: number) => (b: Battle, c: AttackCtx) => applyStatus(b, c.attacker, c.defender, s, n);
const rank = (s: number, ...v: number[]) => v[Math.min(s, v.length) - 1];

// ===================== BLEED =====================
export const BLEED_GEAR: GearBase[] = [
  only("rare", { ...W, id: "bd_serrated_cleaver", name: "Serrated Cleaver", tags: ["Bleed", "Strike"], damage: 6, faces: PLAIN, text: "One-handed axe. Its hits apply 2 Bleed.", hooks: { onHit: (b, c) => { if (!c.offhand) inflict("bleed", 2)(b, c); } } }),
  only("rare", { kind: "armour", slot: "armour", id: "bd_butcher_apron", name: "Butcher's Apron", tags: ["Bleed", "Strike"], armor: 2, text: "Medium: +2 Armor. Bleed you apply gets +1. Your hits deal +2 to enemies with 5 or more Bleed.",
    hooks: { onStatusApplied: (_b, self, t, s) => { if (s === "bleed" && t !== self) t.statuses.bleed = st(t, "bleed") + 1; }, modifyAttack: (_b, c) => { if (st(c.defender, "bleed") >= 5) c.bonus += 2; } } }),
  only("rare", { kind: "trinket", slot: "trinket", id: "bd_razor_fang", name: "Razor Fang", tags: ["Bleed", "Crit"], text: "Your Crits apply 4 Bleed.", hooks: { onCrit: inflict("bleed", 4) } }),
  only("epic", { kind: "off", slot: "off", id: "bd_hemomancer_chalice", name: "Hemomancer's Chalice", tags: ["Bleed", "Blood"], text: "Bleed you apply gets +2. Every Bled Out burst heals you 8.",
    hooks: { onStatusApplied: (b, self, t, s) => { if (s === "bleed" && t !== self) { if (st(t, "bleed") === 0) heal(b, self, 8, "Hemomancer's Chalice"); else t.statuses.bleed = st(t, "bleed") + 2; } } } }),
  only("epic", { ...W, weaponType: "dagger", id: "bd_bloodletter", name: "Bloodletter", tags: ["Bleed", "Crit"], damage: 4, offDamage: 5, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. Crits on 5 and 6. Its hits apply 3 Bleed, in either hand.", hooks: { onHit: inflict("bleed", 3) } })
];
export const BLEED_LEGENDARIES: GearBase[] = [
  leg("t_ring_might", "Bleed on the enemy never fades, and it ticks twice a round.", { kind: "trinket", slot: "trinket", id: "lx_red_tithe", name: "The Red Tithe", tags: ["Bleed", "Blood"],
    text: "Everything that bleeds pays it.", hooks: { onRoundStart: (b, f) => { const e = other(b, f); e.flags["bleedNoFade"] = 1; e.flags["rupture"] = 1; } } })
];

// ===================== WEAK =====================
export const WEAK_GEAR: GearBase[] = [
  only("rare", { ...W, id: "wk_enervating_mace", name: "Enervating Mace", tags: ["Hex", "Strike"], damage: 6, faces: PLAIN, text: "Its hits apply 1 Weak.", hooks: { onHit: (b, c) => { if (!c.offhand) inflict("weak", 1)(b, c); } } }),
  only("rare", { kind: "off", slot: "off", id: "wk_hex_frailty", name: "Hex of Frailty", tags: ["Hex", "Arcane"], text: "On a 1, 2 or 3: apply 2 Weak.", hooks: { face: [on(1, inflict("weak", 2)), on(2, inflict("weak", 2)), on(3, inflict("weak", 2))] } }),
  only("rare", { kind: "trinket", slot: "trinket", id: "wk_bully_ring", name: "Bully's Ring", tags: ["Hex", "Strike"], text: "Your hits deal +3 to Weak enemies.", hooks: { modifyAttack: (_b, c) => { if (st(c.defender, "weak") > 0) c.bonus += 3; } } }),
  only("epic", { kind: "armour", slot: "armour", id: "wk_oppressor_mail", name: "Oppressor's Mail", tags: ["Hex", "Guard"], armor: 3, text: "Medium: +3 Armor. Anything that hits you is Weakened for 2 rounds. Your hits deal +3 to Weak enemies.",
    hooks: { whenHit: (b, c) => { if (!c.noDamage && c.attacker.hp > 0) applyStatus(b, c.defender, c.attacker, "weak", 2); }, modifyAttack: (_b, c) => { if (st(c.defender, "weak") > 0) c.bonus += 3; } } })
];
export const WEAK_LEGENDARIES: GearBase[] = [
  leg("o_tome", "Every hit applies 1 Weak. Weak enemies take 30% more from you.", { kind: "off", slot: "off", id: "lx_subjugation", name: "Crown of Subjugation", tags: ["Hex", "Strike"],
    text: "Kneel.", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "weak", 1), modifyAttack: (_b, c) => { if (st(c.defender, "weak") > 0) c.mult *= 1.3; } } })
];

// ===================== MIGHT =====================
export const MIGHT_GEAR: GearBase[] = [
  only("rare", { ...W, id: "mt_warlord_blade", name: "Warlord's Blade", tags: ["Strike"], damage: 6, faces: PLAIN, text: "Its hits give you 1 Might.", hooks: { onHit: (b, c) => { if (!c.offhand) applyStatus(b, c.attacker, c.attacker, "might", 1); } } }),
  only("rare", { kind: "armour", slot: "armour", id: "mt_gladiator_harness", name: "Gladiator's Harness", tags: ["Strike", "Guard"], armor: 3, text: "Medium: +3 Armor. Start every fight with 2 Might.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "might", 2) } }),
  only("rare", { kind: "off", slot: "off", id: "mt_champion_pennant", name: "Champion's Pennant", tags: ["Strike", "Hex"], text: "Every 2nd round, gain 2 Might. With 6 or more Might, your hits also Weaken.",
    hooks: { onRoundStart: (b, f) => { if (b.round % 2 === 0) applyStatus(b, f, f, "might", 2); }, onHit: (b, c) => { if (st(c.attacker, "might") >= 6) applyStatus(b, c.attacker, c.defender, "weak", 1); } } }),
  only("epic", { kind: "trinket", slot: "trinket", id: "mt_bull_horn", name: "Horn of the Bull", tags: ["Strike"], text: "Your Might counts double on every hit.", hooks: { modifyAttack: (_b, c) => { c.bonus += st(c.attacker, "might"); } } })
];
export const MIGHT_LEGENDARIES: GearBase[] = [
  leg("t_band_vigor", "Start every fight with 5 Might. Might you gain gets +1.", { kind: "trinket", slot: "trinket", id: "lx_titan_heart", name: "Heart of the Titan", tags: ["Strike", "Blood"],
    text: "It beats like a war drum.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "might", 5), onStatusApplied: (_b, self, t, s) => { if (s === "might" && t === self) t.statuses.might = st(t, "might") + 1; } } })
];

// ===================== HEAVY (Stagger) =====================
// Heavy weapons are two-handed swords and axes, Rare and up: every hit builds Stagger on the enemy.
const H = { ...W, twoHanded: true, heavy: true };
export const HEAVY_GEAR: GearBase[] = [
  only("rare", { ...H, id: "bk_breaker_greatsword", name: "Breaker Greatsword", tags: ["Strike", "Guard"], damage: 10, faces: HEAVY_FACES, text: "Heavy, two-handed. Hits build Stagger: fill it and the enemy loses its next action and takes double from your next hit.", hooks: {} }),
  only("rare", { ...H, id: "bk_splitting_greataxe", name: "Splitting Greataxe", tags: ["Strike", "Kill"], damage: 11, faces: HEAVY_FACES, text: "Heavy, two-handed. Hits build Stagger. Kills heal 5.", hooks: { onKill: (b, c) => { heal(b, c.attacker, 5, "Splitting Greataxe"); } } }),
  only("epic", { ...H, id: "bk_colossus_zweihander", name: "Colossus Zweihänder", tags: ["Strike", "Guard"], damage: 14, faces: HEAVY_FACES, text: "Heavy, two-handed. Hits build Stagger. Each Stagger gives you 3 Might.", hooks: { onStagger: (b, self) => applyStatus(b, self, self, "might", 3) } }),
  only("epic", { ...H, id: "bk_headsman_greataxe", name: "Headsman's Greataxe", tags: ["Strike", "Bleed", "Kill"], damage: 15, faces: HEAVY_FACES, text: "Heavy, two-handed. Hits build Stagger. Each Stagger applies 6 Bleed.", hooks: { onStagger: (b, self, foe) => applyStatus(b, self, foe, "bleed", 6) } }),
  only("rare", { kind: "armour", slot: "armour", id: "bk_breaker_harness", name: "Breaker's Harness", tags: ["Strike", "Guard"], armor: 4, text: "Heavy: +4 Armor. Heavy Crits build 1 more Stagger.", hooks: {} }),
  only("epic", { kind: "armour", slot: "armour", id: "bk_unbroken_plate", name: "Plate of the Unbroken", tags: ["Guard", "Strike"], armor: 6, maxHp: 8, text: "Heavy: +6 Armor, +8 Max HP. Each time you Stagger an enemy, gain 10 Barrier.", hooks: { onStagger: (b, self) => applyStatus(b, self, self, "barrier", 10) } }),
  only("rare", { kind: "trinket", slot: "trinket", id: "bk_breaker_seal", name: "Breaker's Seal", tags: ["Strike", "Crit"], text: "Your hit on a Staggered enemy deals ×2.5 instead of ×2.", hooks: {} }),
  only("epic", { kind: "trinket", slot: "trinket", id: "bk_anvil_pendant", name: "Anvil Pendant", tags: ["Strike", "Guard"], text: "Every Heavy hit builds 1 more Stagger.", hooks: {} })
];
export const HEAVY_LEGENDARIES: GearBase[] = [
  leg("w_axe", "Heavy, two-handed. Enemies Stagger 2 sooner.", { ...H, id: "lx_mountainbreaker", name: "Mountainbreaker", tags: ["Strike", "Guard"], damage: 16, faces: HEAVY_FACES,
    text: "It was made to end sieges, not duels.", hooks: {} }),
  leg("w_axe", "Heavy, two-handed. Every Stagger also deals 15% of the enemy's Max HP.", { ...H, id: "lx_worldsunder", name: "Worldsunder", tags: ["Strike", "Kill"], damage: 17, faces: HEAVY_FACES,
    text: "The ground remembers where it fell.", hooks: { onStagger: (b, _self, foe) => { const n = Math.ceil(foe.maxHp * 0.15); loseHp(b, foe, n); log(b, `🪓 Worldsunder: ${n}.`); } } })
];

// ===================== RELICS AND TALENTS =====================
export const BUILD_RELICS: HookDef[] = [
  { kind: "relic", id: "r_open_veins", name: "Open Veins", rarity: "uncommon", tags: ["Bleed"], text: "The enemy starts every fight with 3 Bleed (+3)", hooks: { onFightStart: (b, f, s) => applyStatus(b, f, other(b, f), "bleed", 3 * s) } },
  { kind: "relic", id: "r_shackles_doubt", name: "Shackles of Doubt", rarity: "uncommon", tags: ["Hex"], text: "The enemy starts every fight Weak for 2 rounds (+2)", hooks: { onFightStart: (b, f, s) => applyStatus(b, f, other(b, f), "weak", 2 * s) } },
  { kind: "relic", id: "r_gauntlet_strength", name: "Gauntlet of Strength", rarity: "rare", tags: ["Strike"], text: "Gain 1 Might whenever you're hit (+1)", hooks: { whenHit: (b, c, s) => { if (c.dealt > 0) applyStatus(b, c.defender, c.defender, "might", s); } } },
  { kind: "relic", id: "r_shatterpoint", name: "Shatterpoint", rarity: "rare", tags: ["Strike", "Blood"], text: "Each time you Stagger an enemy, heal 10% of your Max HP (+5%)", hooks: { onStagger: (b, self, _f, s) => { heal(b, self, Math.ceil(self.maxHp * (0.05 + 0.05 * s)), "Shatterpoint"); } } },
  { kind: "relic", id: "r_unstoppable", name: "Unstoppable Force", rarity: "legendary", tags: ["Strike"], text: "Enemies Stagger 1 sooner (+1)", hooks: {} }
];

export const BUILD_TALENTS: HookDef[] = [
  { kind: "talent", id: "t_exsanguinate", name: "Exsanguinate", tags: ["Bleed"], text: "Your hits deal +1 / +2 / +3 to Bleeding enemies", hooks: { modifyAttack: (_b, c, s) => { if (st(c.defender, "bleed") > 0) c.bonus += rank(s, 1, 2, 3); } } },
  { kind: "talent", id: "t_kick_down", name: "Kick Them While They're Down", tags: ["Hex"], text: "Your hits deal +2 / +3 / +5 to Weak enemies", hooks: { modifyAttack: (_b, c, s) => { if (st(c.defender, "weak") > 0) c.bonus += rank(s, 2, 3, 5); } } },
  { kind: "talent", id: "t_battle_fury", name: "Battle Fury", tags: ["Strike"], text: "Start every fight with 1 / 2 / 3 Might", hooks: { onFightStart: (b, f, s) => applyStatus(b, f, f, "might", Math.min(3, s)) } },
  { kind: "talent", id: "t_crushing_blows", name: "Crushing Blows", rarity: "rare", tags: ["Strike"], text: "Rare. Heavy Crits build 1 / 2 / 3 more Stagger", hooks: {} },
  { kind: "talent", id: "t_exploit_opening", name: "Exploit the Opening", rarity: "rare", tags: ["Strike", "Crit"], text: "Rare. Your hit on a Staggered enemy deals +25% / +50% / +75% more", hooks: {} }
];
