// New build paths that don't stack elemental statuses: Briar (Spikes / Thorns), Mercenary (Gold carried), Executioner
// (finishing wounded foes) and the Gambler (bending your dice). Gear, Legendaries, relics and talents for each.
// Everything here drops at the normal odds for its rarity; relics and talents use the usual draw-weight tiers.
import type { AttackCtx, Battle, FaceSpec, Fighter, GearBase, HookDef } from "../engine/types";
import { applyStatus, CRIT, gold, GRAZE, heal, HIT, log, MISS, on, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const leg = (asBase: string, reveal: string, d: Omit<GearBase, "rarity" | "legendary">, minFloor = 3): GearBase => ({ ...d, rarity: "legendary", legendary: { minFloor, asBase, reveal } });
const W = { kind: "weapon" as const, slot: "main" as const };
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };
const PLAIN: FaceSpec[] = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const WILD: FaceSpec[] = [MISS, GRAZE, HIT, HIT, CRIT, CRIT];
const rank = (s: number, ...v: number[]) => v[Math.min(s, v.length) - 1];
const mine = (b: Battle, c: AttackCtx) => c.attacker === b.player;
const landed = (c: AttackCtx) => c.kind === "hit" || c.kind === "crit";
/** Spikes deal this much more (%), for the fight. */
const spikeAmp = (f: Fighter, n: number) => { f.flags["spikeAmp"] = (f.flags["spikeAmp"] ?? 0) + n; };
const missingPct = (f: Fighter) => Math.max(0, 1 - f.hp / Math.max(1, f.maxHp));
const crit = (c: AttackCtx) => { c.kind = "crit"; c.mult = Math.max(c.mult, 2); c.ignoreArmor = true; c.noDamage = false; };

export const PATH_GEAR: GearBase[] = [
  // ===================== BRIAR: Spikes hurt whatever hits you =====================
  only("common", { ...A, id: "pb_briar_vest", name: "Briar Vest", tags: ["Thorns", "Guard"], armor: 1,
    text: "Light: +1 Armor. Start each fight with 3 Spikes.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "spikes", 3) } }),
  only("uncommon", { ...O, id: "pb_thorned_buckler", name: "Thorned Buckler", shield: true, tags: ["Thorns", "Guard"], armor: 1,
    text: "Shield. +1 Armor. When you Guard, gain 3 Spikes.", hooks: { onGuard: (b, f) => applyStatus(b, f, f, "spikes", 3) } }),
  only("rare", { ...T, id: "pb_bramble_heart", name: "Bramble Heart", tags: ["Thorns"],
    text: "Your Spikes deal 50% more.", hooks: { onFightStart: (_b, f) => spikeAmp(f, 50) } }),
  only("rare", { ...W, id: "pb_thornlash", name: "Thornlash", tags: ["Thorns", "Strike"], damage: 5, faces: PLAIN,
    text: "Whip. Its Hits give you 1 Spikes, and deal +1 for every 2 Spikes you have (up to +5).",
    hooks: { onHit: (b, c) => { if (!c.offhand) applyStatus(b, c.attacker, c.attacker, "spikes", 1); }, modifyAttack: (b, c) => { if (mine(b, c)) c.bonus += Math.min(5, Math.floor(st(c.attacker, "spikes") / 2)); } } }),
  only("epic", { ...A, id: "pb_ironbark_plate", name: "Ironbark Plate", tags: ["Thorns", "Guard"], armor: 5, maxHp: 4,
    text: "Heavy: +5 Armor and +4 Max HP. When you're hit, gain 2 Spikes.", hooks: { whenHit: (b, c) => { if (!c.noDamage) applyStatus(b, c.defender, c.defender, "spikes", 2); } } }),

  // ===================== MERCENARY: the Gold you carry is your strength =====================
  only("common", { ...T, id: "pm_coin_purse", name: "Coin Purse", tags: ["Gold", "Kill"],
    text: "Your kills earn 3 Gold.", hooks: { onKill: (b, c) => { if (mine(b, c)) gold(b, c.attacker, 3); } } }),
  only("uncommon", { ...W, id: "pm_moneylender_cudgel", name: "Moneylender's Cudgel", tags: ["Gold", "Strike"], damage: 5, faces: PLAIN,
    text: "Its hits deal +1 for every 60 Gold you carry (up to +5).", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && !c.offhand) c.bonus += Math.min(5, Math.floor(c.attacker.gold / 60)); } } }),
  only("rare", { ...O, id: "pm_golden_aegis", name: "Golden Aegis", shield: true, tags: ["Gold", "Guard"], armor: 1,
    text: "Shield. +1 Armor. Start each fight with Barrier worth 4% of your Gold (up to 12).", hooks: { onFightStart: (b, f) => { const n = Math.min(12, Math.floor(f.gold * 0.04)); if (n > 0) applyStatus(b, f, f, "barrier", n); } } }),
  only("rare", { ...A, id: "pm_brigandine", name: "Mercenary's Brigandine", tags: ["Gold", "Crit"], armor: 3,
    text: "Medium: +3 Armor. Your Crits earn 2 Gold.", hooks: { onCrit: (b, c) => { if (mine(b, c)) gold(b, c.attacker, 2); } } }),
  only("epic", { ...W, id: "pm_midas_blade", name: "Midas Blade", tags: ["Gold", "Strike"], damage: 7, faces: PLAIN,
    text: "Its Hits earn 1 Gold. You deal 1% more damage for every 20 Gold you carry (up to 30%).",
    hooks: { onHit: (b, c) => { if (mine(b, c) && !c.offhand) gold(b, c.attacker, 1); }, modifyAttack: (b, c) => { if (mine(b, c)) c.mult *= 1 + Math.min(30, Math.floor(c.attacker.gold / 20)) / 100; } } }),

  // ===================== EXECUTIONER: finish what's wounded =====================
  only("uncommon", { ...T, id: "pe_hangmans_noose", name: "Hangman's Noose", tags: ["Kill", "Strike"],
    text: "Your hits on enemies below 25% HP deal +3.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && c.defender.hp < c.defender.maxHp * 0.25) c.bonus += 3; } } }),
  only("rare", { ...W, id: "pe_headsmans_axe", name: "Headsman's Axe", tags: ["Kill", "Strike"], damage: 10, twoHanded: true, faces: PLAIN,
    text: "Two-handed. Deals 50% more to enemies below 40% HP.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && c.defender.hp < c.defender.maxHp * 0.4) c.mult *= 1.5; } } }),
  only("rare", { ...A, id: "pe_reapers_shroud", name: "Reaper's Shroud", tags: ["Kill", "Blood"], armor: 1,
    text: "Light: +1 Armor. Every kill heals you 5.", hooks: { onKill: (b, c) => { if (mine(b, c)) heal(b, c.attacker, 5, "Reaper's Shroud"); } } }),
  only("epic", { ...O, id: "pe_guillotine", name: "Guillotine Blade", tags: ["Kill"],
    text: "A Hit that leaves an enemy (not a boss or Champion) below 12% HP finishes it.",
    hooks: { onHit: (b, c) => { const d = c.defender; if (mine(b, c) && d.hp > 0 && !d.boss && !d.champion && !d.crimson && d.hp < d.maxHp * 0.12) { d.hp = 0; log(b, "🪓 Guillotine: it's over."); } } } }),

  // ===================== GAMBLER: bend the die =====================
  only("common", { ...T, id: "pg_bone_charm", name: "Bone Charm", tags: ["Luck"],
    text: "Your 1s become 2s.", hooks: { modifyRoll: (_b, _f, r) => (r === 1 ? 2 : r) } }),
  only("uncommon", { ...O, id: "pg_dice_pouch", name: "Weighted Dice Pouch", tags: ["Luck", "Crit"],
    text: "On a 6: gain Focus (your next roll is rolled twice, keep the better).", hooks: { face: [on(6, (b, c) => applyStatus(b, c.attacker, c.attacker, "focus", 1))] } }),
  only("rare", { ...W, id: "pg_gamblers_saber", name: "Gambler's Saber", tags: ["Luck", "Crit"], damage: 8, faces: WILD,
    text: "All or nothing: a 1 misses, a 2 grazes, 5 and 6 Crit. Its Crits deal 50% more.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && c.kind === "crit" && !c.offhand) c.mult *= 1.5; } } }),
  only("rare", { ...A, id: "pg_lucky_jacket", name: "Lucky Jacket", tags: ["Luck", "Tempo"], armor: 1,
    text: "Light: +1 Armor, +6% Dodge. When you roll a 1, gain Focus.", hooks: { stats: s => { s.dodge += 6; }, modifyRoll: (b, f, r) => { if (r === 1) applyStatus(b, f, f, "focus", 1); return r; } } }),
  only("epic", { ...T, id: "pg_snake_eyes", name: "Snake-Eye Talisman", tags: ["Luck", "Crit"],
    text: "Your 1s become Crits.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && c.face === 1 && !c.offhand) crit(c); } } })
];

export const PATH_LEGENDARIES: GearBase[] = [
  leg("a_leather", "Your Spikes deal double, and each time they strike back, gain 1 more Spikes. Start each fight with 4 Spikes.", { ...A, id: "lx_briar_king", name: "Mantle of the Briar King", tags: ["Thorns", "Guard"], armor: 3,
    text: "Nothing has hugged him in a hundred years.",
    hooks: { onFightStart: (b, f) => { spikeAmp(f, 100); applyStatus(b, f, f, "spikes", 4); } } }),
  leg("t_ring_might", "Your hits deal +1 for every 30 Gold you carry (up to +12), and every kill earns 5 Gold.", { ...T, id: "lx_dragons_tithe", name: "The Dragon's Tithe", tags: ["Gold", "Strike"],
    text: "A dragon's due, paid in advance.",
    hooks: { modifyAttack: (b, c) => { if (mine(b, c)) c.bonus += Math.min(12, Math.floor(c.attacker.gold / 30)); }, onKill: (b, c) => { if (mine(b, c)) gold(b, c.attacker, 5); } } }),
  leg("w_axe", "Two-handed. Deals 1% more for every 1% of HP the enemy is missing.", { ...W, id: "lx_final_word", name: "The Final Word", tags: ["Kill", "Strike"], damage: 12, twoHanded: true, faces: PLAIN,
    text: "Every sentence ends with it.",
    hooks: { modifyAttack: (b, c) => { if (mine(b, c) && landed(c)) c.mult *= 1 + missingPct(c.defender); } } }, 4),
  leg("o_tome", "Every roll you make is rolled twice: you keep the better.", { ...O, id: "lx_fortunes_favor", name: "Fortune's Favour", tags: ["Luck"],
    text: "The house always wins. You are the house now.",
    hooks: { modifyRoll: (b, _f, r) => Math.max(r, 1 + Math.floor(b.rng() * 6)) } }, 4)
];

export const PATH_RELICS: HookDef[] = [
  { kind: "relic", id: "pr_thorn_ring", name: "Thorn Ring", rarity: "uncommon", tags: ["Thorns"], weight: 0.6, text: "Your Spikes deal 25% more (+25%)", hooks: { onFightStart: (_b, f, s) => spikeAmp(f, 25 * s) } },
  { kind: "relic", id: "pr_porcupine_quill", name: "Porcupine Quill", rarity: "uncommon", tags: ["Thorns", "Guard"], weight: 0.6, text: "When you Guard, gain 2 Spikes (+2)", hooks: { onGuard: (b, f, s) => applyStatus(b, f, f, "spikes", 2 * s) } },
  { kind: "relic", id: "pr_tax_collector", name: "Tax Collector's Seal", rarity: "uncommon", tags: ["Gold", "Kill"], weight: 0.6, text: "Every kill earns 2 Gold (+2)", hooks: { onKill: (b, c, s) => { if (mine(b, c)) gold(b, c.attacker, 2 * s); } } },
  { kind: "relic", id: "pr_war_chest", name: "War Chest", rarity: "rare", tags: ["Gold", "Strike"], weight: 0.3, text: "While you carry 150 Gold or more, you deal 10% more damage (+10%)", hooks: { modifyAttack: (b, c, s) => { if (mine(b, c) && c.attacker.gold >= 150) c.mult *= 1 + 0.1 * s; } } },
  { kind: "relic", id: "pr_trophy_rack", name: "Trophy Rack", rarity: "rare", tags: ["Kill", "Strike"], weight: 0.3, text: "Every 5 kills this run: +1 Damage on your hits (up to +5; each extra copy raises the cap by 5)",
    hooks: { onKill: (b, c) => { if (mine(b, c)) c.attacker.persist["trophies"] = (c.attacker.persist["trophies"] ?? 0) + 1; }, modifyAttack: (b, c, s) => { if (mine(b, c)) c.bonus += Math.min(5 * s, Math.floor((c.attacker.persist["trophies"] ?? 0) / 5)); } } },
  { kind: "relic", id: "pr_lucky_seven", name: "Lucky Seven", rarity: "uncommon", tags: ["Luck"], weight: 0.6, text: "Every 7th roll you make is a 6 (one roll sooner with each extra copy)",
    hooks: { modifyRoll: (_b, f, r, s) => { f.flags["luckyN"] = (f.flags["luckyN"] ?? 0) + 1; if (f.flags["luckyN"] >= Math.max(3, 8 - s)) { f.flags["luckyN"] = 0; return 6; } return r; } } }
];

export const PATH_TALENTS: HookDef[] = [
  { kind: "talent", id: "t_barbed", name: "Barbed", tags: ["Thorns"], weight: 0.6, text: "Start every fight with 2 / 4 / 6 Spikes", hooks: { onFightStart: (b, f, s) => applyStatus(b, f, f, "spikes", rank(s, 2, 4, 6)) } },
  { kind: "talent", id: "t_mercenary", name: "Mercenary", tags: ["Gold"], weight: 0.3, text: "While you carry 150 Gold or more, you deal 5% / 10% / 15% more damage",
    hooks: { modifyAttack: (b, c, s) => { if (mine(b, c) && c.attacker.gold >= 150) c.mult *= 1 + rank(s, 0.05, 0.1, 0.15); } } },
  { kind: "talent", id: "t_coup_de_grace", name: "Coup de Grâce", tags: ["Kill"], weight: 0.6, text: "Your hits on enemies below 30% HP deal +2 / +4 / +6",
    hooks: { modifyAttack: (b, c, s) => { if (mine(b, c) && c.defender.hp < c.defender.maxHp * 0.3) c.bonus += rank(s, 2, 4, 6); } } },
  { kind: "talent", id: "t_loaded_dice", name: "Loaded Dice", tags: ["Luck"], weight: 0.3, text: "Your die never rolls below 2 / 2 / 3 (III: and your 6s deal 25% more)",
    hooks: { modifyRoll: (_b, _f, r, s) => Math.max(r, s >= 3 ? 3 : 2), modifyAttack: (b, c, s) => { if (s >= 3 && mine(b, c) && c.face === 6) c.mult *= 1.25; } } }
];
