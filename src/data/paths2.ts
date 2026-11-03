// More ways to build that aren't elemental stacking:
//   Brawler (Bash, Stun, Might) · Butcher (Bleed and Cleave) · Duelist (Dodge) · Stonebreaker (Fracture) · Might
// plus more pieces for the Briar, Mercenary, Executioner and Gambler paths (see paths.ts).
// Normal drop odds for each rarity; relics and talents use the usual draw-weight tiers.
import type { AttackCtx, Battle, FaceSpec, Fighter, GearBase, HookDef } from "../engine/types";
import { applyStatus, CRIT, gold, GRAZE, heal, HIT, MISS, on, other, ping, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const leg = (asBase: string, reveal: string, d: Omit<GearBase, "rarity" | "legendary">, minFloor = 3): GearBase => ({ ...d, rarity: "legendary", legendary: { minFloor, asBase, reveal } });
const W = { kind: "weapon" as const, slot: "main" as const };
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };
const PLAIN: FaceSpec[] = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const TWO: FaceSpec[] = [GRAZE, HIT, HIT, HIT, CRIT, CRIT];
const HEAVY: FaceSpec[] = [MISS, HIT, HIT, HIT, CRIT, CRIT];
const CLEAVE: FaceSpec = { kind: "crit", name: "Cleave", cleave: true };
const CLEAVER: FaceSpec[] = [GRAZE, HIT, HIT, HIT, HIT, CLEAVE];
const CARVER: FaceSpec[] = [MISS, HIT, HIT, HIT, CLEAVE, CLEAVE];
const rank = (s: number, ...v: number[]) => v[Math.min(s, v.length) - 1];
const mine = (b: Battle, c: AttackCtx) => c.attacker === b.player;
/** Reeling: Stunned, Staggered, or it lost its last turn. */
export const reeling = (b: Battle, d: Fighter) => st(d, "stun") > 0 || st(d, "broken") > 0 || (d.flags["stunnedAt"] ?? -9) >= b.round - 1;
const addFlag = (f: Fighter, k: string, n: number) => { f.flags[k] = (f.flags[k] ?? 0) + n; };
const might = (b: Battle, f: Fighter, n: number, cap = 99) => { const now = st(f, "might"); if (now < cap) applyStatus(b, f, f, "might", Math.min(n, cap - now)); };
const crit = (c: AttackCtx) => { c.kind = "crit"; c.mult = Math.max(c.mult, 2); c.ignoreArmor = true; c.noDamage = false; };
/** Shattering: Fracture just went off on the target (it was applied and is now 0). */
const shattered = (self: Fighter, t: Fighter, s: string) => s === "fracture" && t !== self && st(t, "fracture") === 0;
const spikeAmp = (f: Fighter, n: number) => addFlag(f, "spikeAmp", n);

export const PATH_GEAR_2: GearBase[] = [
  // ===================== BRAWLER: Bash, Stun and Might =====================
  only("common", { ...W, id: "pf_knuckle_club", name: "Knuckle Club", tags: ["Strike", "Tempo"], damage: 4, faces: PLAIN,
    text: "Club. +6% Bash.", hooks: { stats: s => { s.bash += 6; } } }),
  only("uncommon", { ...O, id: "pf_bashing_shield", name: "Bashing Shield", shield: true, tags: ["Guard", "Strike"], armor: 1,
    text: "Shield. +1 Armor, +6% Bash.", hooks: { stats: s => { s.bash += 6; } } }),
  only("uncommon", { ...A, id: "pf_brawler_wraps", name: "Brawler's Wraps", tags: ["Strike", "Tempo"], armor: 1,
    text: "Light: +1 Armor, +4% Bash. Each Bash gives 1 Might.", hooks: { stats: s => { s.bash += 4; }, onBash: (b, c) => might(b, c.attacker, 1) } }),
  only("rare", { ...W, id: "pf_skullsplitter", name: "Skullsplitter Mace", tags: ["Strike"], damage: 7, faces: PLAIN,
    text: "Mace. +10% Bash. Each Bash gives 2 Might.", hooks: { stats: s => { s.bash += 10; }, onBash: (b, c) => might(b, c.attacker, 2) } }),
  only("rare", { ...T, id: "pf_concussion_charm", name: "Concussion Charm", tags: ["Strike", "Tempo"],
    text: "Your hits on reeling enemies (Stunned, Staggered, or just lost a turn) deal +4.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && reeling(b, c.defender)) c.bonus += 4; } } }),
  only("rare", { ...O, id: "pf_war_gauntlet", name: "War Gauntlet", tags: ["Strike", "Guard"], armor: 1,
    text: "Off-hand. +1 Armor, +5% Bash. Whenever you Stun an enemy, gain 1 Haste.", hooks: { stats: s => { s.bash += 5; }, onStatusApplied: (b, self, t, s) => { if (s === "stun" && t !== self && st(t, "stun") > 0) applyStatus(b, self, self, "haste", 1); } } }),
  only("epic", { ...W, id: "pf_earthshaker", name: "Earthshaker Maul", tags: ["Strike", "Hex"], damage: 13, twoHanded: true, heavy: true, faces: HEAVY,
    text: "Two-handed, Heavy. +15% Bash. Your Bashes also apply 2 Fracture and 1 Weak.", hooks: { stats: s => { s.bash += 15; }, onBash: (b, c) => { applyStatus(b, c.attacker, c.defender, "fracture", 2); applyStatus(b, c.attacker, c.defender, "weak", 1); } } }),
  only("epic", { ...A, id: "pf_gladiator_harness", name: "Gladiator's Harness", tags: ["Strike", "Guard"], armor: 4, maxHp: 5,
    text: "Heavy: +4 Armor and +5 Max HP. Start each fight with 2 Might; whenever you Stun an enemy, gain 2 more.",
    hooks: { onFightStart: (b, f) => might(b, f, 2), onStatusApplied: (b, self, t, s) => { if (s === "stun" && t !== self && st(t, "stun") > 0) might(b, self, 2); } } }),

  // ===================== MIGHT: stack it, spend it =====================
  only("common", { ...T, id: "pf_iron_bracer", name: "Iron Bracer", tags: ["Strike"],
    text: "Start each fight with 1 Might.", hooks: { onFightStart: (b, f) => might(b, f, 1) } }),
  only("uncommon", { ...W, id: "pf_sledge", name: "Sledge", tags: ["Strike"], damage: 5, faces: PLAIN,
    text: "Hammer. Its Hits give 1 Might (up to 8).", hooks: { onHit: (b, c) => { if (!c.offhand) might(b, c.attacker, 1, 8); } } }),
  only("rare", { ...T, id: "pf_brutes_signet", name: "Brute's Signet", tags: ["Strike", "Crit"],
    text: "Each Might you have gives your Hits a 2% chance to become Crits.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && c.kind === "hit" && b.rng() * 100 < 2 * st(c.attacker, "might")) crit(c); } } }),
  only("epic", { ...A, id: "pf_titan_plate", name: "Titan's Plate", tags: ["Strike", "Guard"], armor: 5,
    text: "Heavy: +5 Armor. Every 3 Might you have gives +1 Armor.", hooks: { onFightStart: (_b, f) => { f.flags["titan"] = 1; } } }),
  only("epic", { ...O, id: "pf_war_horn", name: "Horn of the Warlord", tags: ["Strike", "Tempo"],
    text: "Off-hand. Every other round, gain 2 Might.", hooks: { onRoundStart: (b, f) => { if (b.round % 2 === 0) might(b, f, 2); } } }),

  // ===================== BUTCHER: Bleed and Cleave =====================
  only("common", { ...W, id: "pk_meat_cleaver", name: "Meat Cleaver", tags: ["Kill", "Bleed"], damage: 4, faces: CLEAVER,
    text: "Axe. A 6 Cleaves (overkill carries into the next fight).", hooks: {} }),
  only("uncommon", { ...T, id: "pk_gristle_hook", name: "Gristle Hook", tags: ["Kill"],
    text: "Overkill carries into the next fight at 50% (on top of any Cleave).", hooks: { onKill: (b, c) => { if (mine(b, c) && c.defender.hp < 0 && !c.spec.cleave) b.carry += Math.round(-c.defender.hp * 0.5); } } }),
  only("uncommon", { ...A, id: "pk_slaughter_leathers", name: "Slaughterhouse Leathers", tags: ["Bleed", "Kill"], armor: 1,
    text: "Light: +1 Armor. After a kill, the next enemy starts with 4 Bleed.",
    hooks: { onKill: (b, c) => { if (mine(b, c)) c.attacker.persist["nextBleed"] = 4; }, onFightStart: (b, f) => { const n = f.persist["nextBleed"] ?? 0; if (n) { delete f.persist["nextBleed"]; applyStatus(b, f, other(b, f), "bleed", n); } } } }),
  only("rare", { ...W, id: "pk_carver", name: "The Carver", tags: ["Kill", "Strike"], damage: 11, twoHanded: true, faces: CARVER,
    text: "Two-handed axe. 5 and 6 Cleave.", hooks: {} }),
  only("rare", { ...W, id: "pk_throwing_hatchet", name: "Throwing Hatchets", weaponType: "throwing", tags: ["Bleed", "Kill"], damage: 3, offDamage: 3, faces: PLAIN,
    text: "Throwing weapon. Its hits apply 1 Bleed, in either hand. Works in the off-hand.", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 1) } }),
  only("rare", { ...O, id: "pk_bone_saw", name: "Bone Saw", tags: ["Bleed", "Strike"],
    text: "Off-hand. Your hits deal +1 for every 3 Bleed on the enemy (up to +5).", hooks: { modifyAttack: (b, c) => { if (mine(b, c)) c.bonus += Math.min(5, Math.floor(st(c.defender, "bleed") / 3)); } } }),
  only("epic", { ...A, id: "pk_abattoir_mail", name: "Abattoir Mail", tags: ["Kill", "Bleed"], armor: 3,
    text: "Medium: +3 Armor. Damage you carry into a fight also lands as that much Bleed.", hooks: { onFightStart: (b, f) => { const n = f.flags["carriedIn"] ?? 0; if (n > 0) applyStatus(b, f, other(b, f), "bleed", n); } } }),
  only("epic", { ...T, id: "pk_hemorrhage_seal", name: "Hemorrhage Seal", tags: ["Bleed"],
    text: "Bleed you apply gets +2. Your hits deal +2 to Bleeding enemies.",
    hooks: { onStatusApplied: (_b, self, t, s) => { if (s === "bleed" && t !== self && st(t, "bleed") > 0) t.statuses.bleed = st(t, "bleed") + 2; }, modifyAttack: (b, c) => { if (mine(b, c) && st(c.defender, "bleed") > 0) c.bonus += 2; } } }),

  // ===================== DUELIST: Dodge =====================
  only("common", { ...A, id: "pd_fencer_jerkin", name: "Fencer's Jerkin", tags: ["Tempo"], armor: 0,
    text: "Light: +5% Dodge.", hooks: { stats: s => { s.dodge += 5; } } }),
  only("uncommon", { ...W, id: "pd_dueling_rapier", name: "Dueling Rapier", tags: ["Tempo", "Crit"], damage: 5, faces: PLAIN,
    text: "Sword. +5% Dodge. After you dodge, your next hit deals +4.",
    hooks: { stats: s => { s.dodge += 5; }, onDodge: (_b, c) => { c.defender.flags["riposteBonus"] = 4; }, modifyAttack: (b, c) => { if (mine(b, c) && c.attacker.flags["riposteBonus"]) { c.bonus += c.attacker.flags["riposteBonus"]; c.attacker.flags["riposteBonus"] = 0; } } } }),
  only("uncommon", { ...O, id: "pd_parrying_cloak", name: "Parrying Cloak", tags: ["Tempo", "Strike"],
    text: "Off-hand. +6% Dodge. After you dodge, gain 1 Might.", hooks: { stats: s => { s.dodge += 6; }, onDodge: (b, c) => might(b, c.defender, 1) } }),
  only("rare", { ...T, id: "pd_feather_charm", name: "Feather Charm", tags: ["Tempo"],
    text: "+10% Dodge.", hooks: { stats: s => { s.dodge += 10; } } }),
  only("rare", { ...A, id: "pd_shadowsilk", name: "Shadowsilk Garb", tags: ["Tempo", "Hex"], armor: 1,
    text: "Light: +1 Armor, +8% Dodge. Your first dodge each fight gives you Evade.", hooks: { stats: s => { s.dodge += 8; }, onDodge: (b, c) => { if (!c.defender.flags["silk"]) { c.defender.flags["silk"] = 1; applyStatus(b, c.defender, c.defender, "evade", 1); } } } }),
  only("epic", { ...W, id: "pd_whisperwind", name: "Whisperwind", tags: ["Tempo", "Strike"], damage: 6, faces: PLAIN,
    text: "Sword. +10% Dodge. Every dodge strikes back for your Damage.", hooks: { stats: s => { s.dodge += 10; }, onDodge: (b, c) => { if (c.attacker.hp > 0) ping(b, c.attacker, c.defender.damage, "Whisperwind"); } } }),
  only("epic", { ...O, id: "pd_mirage_lantern", name: "Mirage Lantern", tags: ["Tempo", "Hex"],
    text: "Off-hand. +6% Dodge. Whenever you dodge, the attacker is Blinded for 2 rounds.", hooks: { stats: s => { s.dodge += 6; }, onDodge: (b, c) => applyStatus(b, c.defender, c.attacker, "blind", 2) } }),

  // ===================== STONEBREAKER: Fracture =====================
  only("common", { ...W, id: "ps_quarry_pick", name: "Quarry Pick", tags: ["Hex", "Crit"], damage: 4, faces: PLAIN,
    text: "Pick. Its Crits apply 1 Fracture.", hooks: { onCrit: (b, c) => { if (!c.offhand) applyStatus(b, c.attacker, c.defender, "fracture", 1); } } }),
  only("uncommon", { ...T, id: "ps_fault_ring", name: "Fault Line Ring", tags: ["Hex"],
    text: "Fracture you shatter deals +1 per stack.", hooks: { onFightStart: (_b, f) => addFlag(f, "shatterPlus", 1) } }),
  only("rare", { ...A, id: "ps_masonry_mail", name: "Masonry Mail", tags: ["Hex", "Guard"], armor: 3,
    text: "Medium: +3 Armor. Whatever hits you gets 1 Fracture.", hooks: { whenHit: (b, c) => { if (!c.noDamage && c.attacker.hp > 0) applyStatus(b, c.defender, c.attacker, "fracture", 1); } } }),
  only("rare", { ...W, id: "ps_rockbreaker", name: "Rockbreaker", tags: ["Hex", "Strike"], damage: 10, twoHanded: true, heavy: true, faces: HEAVY,
    text: "Two-handed, Heavy. Its hits apply 1 Fracture; Staggering an enemy applies 3.", hooks: { onHit: (b, c) => { if (!c.offhand) applyStatus(b, c.attacker, c.defender, "fracture", 1); }, onStagger: (b, self, foe) => applyStatus(b, self, foe, "fracture", 3) } }),
  only("epic", { ...O, id: "ps_tremor_stone", name: "Tremor Stone", tags: ["Hex"],
    text: "Off-hand. Every round, the enemy gets 1 Fracture.", hooks: { onRoundStart: (b, f) => applyStatus(b, f, other(b, f), "fracture", 1) } }),
  only("epic", { ...T, id: "ps_shatterglass_eye", name: "Shatterglass Eye", tags: ["Hex", "Blood"],
    text: "Each time Fracture shatters on an enemy, gain 2 Might and heal 4.", hooks: { onStatusApplied: (b, self, t, s) => { if (shattered(self, t, s)) { might(b, self, 2); heal(b, self, 4, "Shatterglass Eye"); } } } }),

  // ===================== More BRIAR (Spikes) =====================
  only("uncommon", { ...W, id: "pb_briar_whip", name: "Briar Whip", tags: ["Thorns", "Strike"], damage: 4, faces: PLAIN,
    text: "Whip. Its Crits give you 3 Spikes.", hooks: { onCrit: (b, c) => { if (!c.offhand) applyStatus(b, c.attacker, c.attacker, "spikes", 3); } } }),
  only("rare", { ...O, id: "pb_hedgehog_shield", name: "Hedgehog Shield", shield: true, tags: ["Thorns", "Guard"], armor: 2,
    text: "Shield. +2 Armor. While you Guard, your Spikes deal double.", hooks: { onGuard: (_b, f) => { f.flags["hedgeRound"] = 1; spikeAmp(f, 100); }, onRoundEnd: (_b, f) => { if (f.flags["hedgeRound"]) { f.flags["hedgeRound"] = 0; spikeAmp(f, -100); } } } }),
  only("epic", { ...T, id: "pb_thornheart", name: "Thornheart Amulet", tags: ["Thorns", "Blood"],
    text: "Whenever your Spikes strike back, heal 2.", hooks: { whenHit: (b, c) => { if (!c.noDamage && st(c.defender, "spikes") > 0 && c.attacker.hp > 0) heal(b, c.defender, 2, "Thornheart"); } } }),

  // ===================== More MERCENARY (Gold) =====================
  only("common", { ...A, id: "pm_padded_coat", name: "Sellsword's Coat", tags: ["Gold", "Guard"], armor: 2,
    text: "Medium: +2 Armor. +2 Gold for every fight you win.", hooks: { onFightEnd: (b, f) => { if (b.over === "won" && f === b.player) f.gold += 2; } } }),
  only("rare", { ...W, id: "pm_paymasters_flail", name: "Paymaster's Flail", tags: ["Gold", "Crit"], damage: 6, faces: TWO,
    text: "Flail. Crits on 5 and 6; each Crit earns 2 Gold.", hooks: { onCrit: (b, c) => { if (mine(b, c) && !c.offhand) gold(b, c.attacker, 2); } } }),
  only("epic", { ...O, id: "pm_coffer_shield", name: "Iron Coffer", shield: true, tags: ["Gold", "Guard"], armor: 2,
    text: "Shield. +2 Armor. While Guarding: +1 Armor for every 50 Gold you carry (up to +6).", hooks: { onGuard: (_b, f) => { f.flags["guardArmor"] = (f.flags["guardArmor"] ?? 0) + Math.min(6, Math.floor(f.gold / 50)); } } }),

  // ===================== More EXECUTIONER (Kill) =====================
  only("common", { ...W, id: "pe_headsman_knife", name: "Headsman's Knife", weaponType: "dagger", tags: ["Kill", "Crit"], damage: 3, offDamage: 3, faces: PLAIN,
    text: "Dagger. +2 damage to enemies below 30% HP. Works in the off-hand.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && c.defender.hp < c.defender.maxHp * 0.3) c.bonus += 2; } } }),
  only("uncommon", { ...O, id: "pe_black_hood", name: "Executioner's Hood", tags: ["Kill", "Hex"],
    text: "Off-hand. Enemies below 50% HP are Exposed (take +2 from every hit).", hooks: { onRoundStart: (b, f) => { const e = other(b, f); if (e.hp < e.maxHp * 0.5 && st(e, "exposed") === 0) applyStatus(b, f, e, "exposed", 1); } } }),
  only("epic", { ...A, id: "pe_reaper_plate", name: "Deathknell Plate", tags: ["Kill", "Guard"], armor: 5,
    text: "Heavy: +5 Armor. Each kill gives Barrier equal to 10% of your Max HP for the next fight.",
    hooks: { onKill: (b, c) => { if (mine(b, c)) c.attacker.persist["knell"] = 1; }, onFightStart: (b, f) => { if (f.persist["knell"]) { delete f.persist["knell"]; applyStatus(b, f, f, "barrier", Math.ceil(f.maxHp * 0.1)); } } } }),

  // ===================== More GAMBLER (Luck) =====================
  only("uncommon", { ...W, id: "pg_coin_flip", name: "Coin-Flip Cutlass", tags: ["Luck", "Strike"], damage: 5, faces: PLAIN,
    text: "Sword. Even rolls deal +2; odd rolls deal −1.", hooks: { modifyAttack: (b, c) => { if (mine(b, c) && !c.offhand) c.bonus += c.face % 2 === 0 ? 2 : -1; } } }),
  only("rare", { ...O, id: "pg_hustlers_deck", name: "Hustler's Deck", tags: ["Luck", "Hex"],
    text: "Off-hand. On a 1 or a 6: the enemy is Exposed for 2 rounds.", hooks: { face: [on(1, (b, c) => applyStatus(b, c.attacker, c.defender, "exposed", 2)), on(6, (b, c) => applyStatus(b, c.attacker, c.defender, "exposed", 2))] } }),
  only("epic", { ...A, id: "pg_jesters_motley", name: "Jester's Motley", tags: ["Luck", "Tempo"], armor: 1,
    text: "Light: +1 Armor. Start each fight with Focus; every 6 you roll gives Focus again.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "focus", 1), modifyRoll: (b, f, r) => { if (r === 6) applyStatus(b, f, f, "focus", 1); return r; } } })
];

export const PATH_LEGENDARIES_2: GearBase[] = [
  leg("t_ring_might", "+15% Bash, and your Bash chance can reach 45%. Every Might you have adds 1% more. Every Bash gives 3 Might.", { ...T, id: "lx_mountain_fist", name: "Fist of the Mountain", tags: ["Strike", "Tempo"],
    text: "Knocks on a door once. The door is no longer there.",
    hooks: { stats: s => { s.bash += 15; }, onFightStart: (_b, f) => { addFlag(f, "bashCap", 15); f.flags["mightBash"] = Math.max(f.flags["mightBash"] ?? 0, 1); }, onBash: (b, c) => might(b, c.attacker, 3) } }),
  leg("w_axe", "Every Crit Cleaves. Damage you carry into a fight also lands as that much Bleed.", { ...W, id: "lx_gorehowl", name: "Gorehowl", tags: ["Kill", "Bleed"], damage: 7, faces: TWO,
    text: "It sings the same note every time it lands.",
    hooks: { onKill: (b, c) => { if (mine(b, c) && c.kind === "crit" && !c.spec.cleave && c.defender.hp < 0) b.carry += -c.defender.hp; }, onFightStart: (b, f) => { const n = f.flags["carriedIn"] ?? 0; if (n > 0) applyStatus(b, f, other(b, f), "bleed", n); } } }),
  leg("a_leather", "+15% Dodge, and your Dodge can reach 70%. Each dodge gives 2 Might and makes your next Hit a Crit.", { ...A, id: "lx_untouched_veil", name: "Veil of the Untouched", tags: ["Tempo", "Crit"], armor: 1,
    text: "Woven from the wind of a blade that missed.",
    hooks: { stats: s => { s.dodge += 15; }, onFightStart: (_b, f) => addFlag(f, "dodgeCap", 10), onDodge: (b, c) => { might(b, c.defender, 2); c.defender.flags["veilCrit"] = 1; },
      modifyAttack: (b, c) => { if (mine(b, c) && c.attacker.flags["veilCrit"] && c.kind === "hit") { c.attacker.flags["veilCrit"] = 0; crit(c); } } } }, 4),
  leg("w_hammer", "Two-handed. Every hit applies 2 Fracture. Your Fracture shatters at 2 stacks instead of 3, and each shatter Stuns.", { ...W, id: "lx_worldbreaker", name: "Worldbreaker", tags: ["Hex", "Strike"], damage: 13, twoHanded: true, heavy: true, faces: HEAVY,
    text: "The mountains have a word for it. They don't say it aloud.",
    hooks: { onFightStart: (_b, f) => { f.flags["shatterAt2"] = 1; }, onHit: (b, c) => { if (!c.offhand) applyStatus(b, c.attacker, c.defender, "fracture", 2); }, onStatusApplied: (b, self, t, s) => { if (shattered(self, t, s) && t.hp > 0) applyStatus(b, self, t, "stun", 1); } } }, 4),
  leg("w_sword", "Each stack of Might gives +2 Damage instead of +1. Start each fight with 2 Might.", { ...W, id: "lx_colossus_blade", name: "Colossus Blade", tags: ["Strike"], damage: 9, faces: PLAIN,
    text: "Forged for a giant. Wielded, somehow, by you.",
    hooks: { onFightStart: (b, f) => { addFlag(f, "mightPlus", 1); might(b, f, 2); } } })
];

export const PATH_RELICS_2: HookDef[] = [
  { kind: "relic", id: "pr_brass_knuckles", name: "Brass Knuckles", rarity: "uncommon", tags: ["Strike"], weight: 0.6, text: "+5% Bash (+5%)", hooks: { stats: (s, n) => { s.bash += 5 * n; } } },
  { kind: "relic", id: "pr_iron_jaw", name: "Iron Jaw", rarity: "uncommon", tags: ["Strike", "Blood"], weight: 0.6, text: "Whenever you Stun an enemy, heal 3 (+3)", hooks: { onStatusApplied: (b, self, t, s, _a, n) => { if (s === "stun" && t !== self && st(t, "stun") > 0) heal(b, self, 3 * n, "Iron Jaw"); } } },
  { kind: "relic", id: "pr_ox_yoke", name: "Ox Yoke", rarity: "uncommon", tags: ["Strike"], weight: 0.6, text: "Start each fight with 1 Might (+1)", hooks: { onFightStart: (b, f, n) => might(b, f, n) } },
  { kind: "relic", id: "pr_butchers_ledger", name: "Butcher's Ledger", rarity: "rare", tags: ["Kill"], weight: 0.3, text: "Overkill carries into the next fight at 30% (+30%)", hooks: { onKill: (b, c, n) => { if (mine(b, c) && c.defender.hp < 0 && !c.spec.cleave) b.carry += Math.round(-c.defender.hp * 0.3 * n); } } },
  { kind: "relic", id: "pr_leech_hook", name: "Leech Hook", rarity: "uncommon", tags: ["Bleed", "Blood"], weight: 0.6, text: "Your hits on Bleeding enemies heal 1 (+1)", hooks: { onHit: (b, c, n) => { if (mine(b, c) && st(c.defender, "bleed") > 0) heal(b, c.attacker, n, "Leech Hook"); } } },
  { kind: "relic", id: "pr_dancers_bell", name: "Dancer's Bell", rarity: "uncommon", tags: ["Tempo", "Blood"], weight: 0.6, text: "Every dodge heals 2 (+2)", hooks: { onDodge: (b, c, n) => heal(b, c.defender, 2 * n, "Dancer's Bell") } },
  { kind: "relic", id: "pr_quickstep", name: "Quickstep Anklet", rarity: "uncommon", tags: ["Tempo"], weight: 0.6, text: "+4% Dodge (+4%)", hooks: { stats: (s, n) => { s.dodge += 4 * n; } } },
  { kind: "relic", id: "pr_keystone", name: "Keystone", rarity: "rare", tags: ["Hex"], weight: 0.3, text: "Fracture you shatter deals +1 per stack (+1)", hooks: { onFightStart: (_b, f, n) => addFlag(f, "shatterPlus", n) } },
  { kind: "relic", id: "pr_chisel_set", name: "Mason's Chisels", rarity: "uncommon", tags: ["Hex", "Crit"], weight: 0.6, text: "Your Crits apply 1 Fracture (+1)", hooks: { onCrit: (b, c, n) => applyStatus(b, c.attacker, c.defender, "fracture", n) } },
  { kind: "relic", id: "pr_bramble_crown", name: "Bramble Crown", rarity: "rare", tags: ["Thorns", "Strike"], weight: 0.3, text: "Each time your Spikes strike back, gain 1 Might (up to 5; +5)", hooks: { whenHit: (b, c, n) => { if (!c.noDamage && st(c.defender, "spikes") > 0 && c.attacker.hp > 0) might(b, c.defender, 1, 5 * n); } } },
  { kind: "relic", id: "pr_loaded_purse", name: "Loaded Purse", rarity: "uncommon", tags: ["Gold", "Luck"], weight: 0.6, text: "Every 6 you roll earns 1 Gold (+1)", hooks: { modifyRoll: (b, f, r, n) => { if (r === 6 && f === b.player) f.gold += n; return r; } } },
  { kind: "relic", id: "pr_headsmans_tally", name: "Headsman's Tally", rarity: "rare", tags: ["Kill", "Tempo"], weight: 0.3, text: "After a kill, start the next fight with 1 Haste (+1)",
    hooks: { onKill: (b, c) => { if (mine(b, c)) c.attacker.persist["tallyHaste"] = 1; }, onFightStart: (b, f, n) => { if (f.persist["tallyHaste"]) { delete f.persist["tallyHaste"]; applyStatus(b, f, f, "haste", n); } } } }
];

export const PATH_TALENTS_2: HookDef[] = [
  { kind: "talent", id: "t_haymaker", name: "Haymaker", tags: ["Strike"], weight: 0.6, text: "+4% / +8% / +12% Bash", hooks: { stats: (s, n) => { s.bash += rank(n, 4, 8, 12); } } },
  { kind: "talent", id: "t_pummel", name: "Pummel", tags: ["Strike", "Tempo"], weight: 0.6, text: "Your hits on reeling enemies (Stunned, Staggered, or just lost a turn) deal +2 / +4 / +6", hooks: { modifyAttack: (b, c, n) => { if (mine(b, c) && reeling(b, c.defender)) c.bonus += rank(n, 2, 4, 6); } } },
  { kind: "talent", id: "t_heavy_hands", name: "Heavy Hands", tags: ["Strike"], weight: 0.3, text: "Each Might you have adds 1% / 2% / 3% Bash", hooks: { onFightStart: (_b, f, n) => { f.flags["mightBash"] = Math.max(f.flags["mightBash"] ?? 0, rank(n, 1, 2, 3)); } } },
  { kind: "talent", id: "t_rend", name: "Rend", tags: ["Bleed"], weight: 0.6, text: "Your hits apply 1 / 1 / 2 Bleed (II and III: Crits apply 2 more)", hooks: { onHit: (b, c, n) => { if (mine(b, c) && !c.offhand) applyStatus(b, c.attacker, c.defender, "bleed", rank(n, 1, 1, 2) + (n >= 2 && c.kind === "crit" ? 2 : 0)); } } },
  { kind: "talent", id: "t_carver", name: "Carver", tags: ["Kill"], weight: 0.3, text: "Cleaves carry 50% / 100% / 150% more into the next fight", hooks: { onKill: (b, c, n) => { if (mine(b, c) && c.spec.cleave && c.defender.hp < 0) b.carry += Math.round(-c.defender.hp * rank(n, 0.5, 1, 1.5)); } } },
  { kind: "talent", id: "t_evasion", name: "Evasion", tags: ["Tempo"], weight: 0.6, text: "+3% / +6% / +9% Dodge", hooks: { stats: (s, n) => { s.dodge += rank(n, 3, 6, 9); } } },
  { kind: "talent", id: "t_blade_dance", name: "Blade Dance", tags: ["Tempo", "Strike"], weight: 0.6, text: "After a dodge, your next hit deals +3 / +5 / +8",
    hooks: { onDodge: (_b, c, n) => { c.defender.flags["danceBonus"] = rank(n, 3, 5, 8); }, modifyAttack: (b, c) => { if (mine(b, c) && c.attacker.flags["danceBonus"]) { c.bonus += c.attacker.flags["danceBonus"]; c.attacker.flags["danceBonus"] = 0; } } } },
  { kind: "talent", id: "t_fault_finder", name: "Fault Finder", tags: ["Hex"], weight: 0.6, text: "Fracture you shatter deals +1 / +2 / +3 per stack", hooks: { onFightStart: (_b, f, n) => addFlag(f, "shatterPlus", rank(n, 1, 2, 3)) } },
  { kind: "talent", id: "t_splinter", name: "Splinter", tags: ["Hex", "Strike"], weight: 0.3, text: "Your Hits apply 1 Fracture every other hit / every hit / every hit, and Crits apply 1 more",
    hooks: { onHit: (b, c, n) => { if (!mine(b, c) || c.offhand) return; c.attacker.flags["splinter"] = (c.attacker.flags["splinter"] ?? 0) + 1; if (n >= 2 || c.attacker.flags["splinter"] % 2 === 0) applyStatus(b, c.attacker, c.defender, "fracture", 1 + (n >= 3 && c.kind === "crit" ? 1 : 0)); } } },
  { kind: "talent", id: "t_bloodied_knuckles", name: "Bloodied Knuckles", tags: ["Strike", "Bleed"], weight: 0.6, text: "Your Bashes apply 2 / 3 / 4 Bleed", hooks: { onBash: (b, c, n) => applyStatus(b, c.attacker, c.defender, "bleed", rank(n, 2, 3, 4)) } },
  { kind: "talent", id: "t_thorn_dance", name: "Thorn Dance", tags: ["Thorns", "Tempo"], weight: 0.6, text: "Every dodge gives 1 / 2 / 3 Spikes", hooks: { onDodge: (b, c, n) => applyStatus(b, c.defender, c.defender, "spikes", rank(n, 1, 2, 3)) } },
  { kind: "talent", id: "t_bounty_hunter", name: "Bounty Hunter", tags: ["Gold", "Kill"], weight: 0.6, text: "Elites, Champions and bosses you kill drop 10 / 20 / 30 more Gold", hooks: { onKill: (b, c, n) => { const d = c.defender; if (mine(b, c) && (d.elite || d.champion || d.boss)) gold(b, c.attacker, rank(n, 10, 20, 30)); } } },
  { kind: "talent", id: "t_double_down", name: "Double Down", tags: ["Luck", "Crit"], weight: 0.3, text: "Your 6s deal 20% / 35% / 50% more", hooks: { modifyAttack: (b, c, n) => { if (mine(b, c) && c.face === 6) c.mult *= 1 + rank(n, 0.2, 0.35, 0.5); } } }
];

