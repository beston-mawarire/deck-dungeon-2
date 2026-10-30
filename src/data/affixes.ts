// Rolled bonuses (Uncommon+), Epic powers (Epic) and Legendaries (one of a kind).
// A bonus's stacks are its magnitude n; "{n}" in text is replaced when shown.
import { attack } from "../engine/combat";
import { log } from "../engine/registry";
import type { Battle, Fighter, GearBase, HookDef } from "../engine/types";
import { applyStatus, cast, CRIT, GRAZE, heal, hex, HIT, MISS, on, ping, st } from "./helpers";

const bonus = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "bonus", ...d });
const epic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "epic", rarity: "epic", ...d });

export const BONUSES: HookDef[] = [
  bonus({ id: "b_damage", name: "+Damage", affix: "of Might", tags: ["Strike"], text: "+{n} Damage", hooks: { stats: (s, n) => { s.damage += n; } } }),
  bonus({ id: "b_armor", name: "+Armor", affix: "of the Bulwark", tags: ["Guard"], text: "+{n} Armor", hooks: { stats: (s, n) => { s.armor += n; } } }),
  bonus({ id: "b_hp", name: "+Max HP", affix: "of Vigor", tags: ["Blood"], text: "+{3n} Max HP", hooks: { stats: (s, n) => { s.maxHp += 3 * n; } } }),
  bonus({ id: "b_burn", name: "Embers", affix: "of Embers", tags: ["Burn"], text: "On a 5: apply {n+1} Burn", hooks: { face: [on(5, (b, c, n) => applyStatus(b, c.attacker, c.defender, "burn", n + 1))] } }),
  bonus({ id: "b_poison", name: "Venom", affix: "of Venom", tags: ["Poison"], text: "On a 3: apply {n+1} Poison", hooks: { face: [on(3, (b, c, n) => applyStatus(b, c.attacker, c.defender, "poison", n + 1))] } }),
  bonus({ id: "b_bleed", name: "Rending", affix: "of Rending", tags: ["Bleed"], text: "Your hits apply {n} Bleed", hooks: { onHit: (b, c, n) => applyStatus(b, c.attacker, c.defender, "bleed", n) } }),
  bonus({ id: "b_chill", name: "Frost", affix: "of Frost", tags: ["Frost"], text: "On a 2: apply {n} Chill", hooks: { face: [on(2, (b, c, n) => applyStatus(b, c.attacker, c.defender, "chill", n))] } }),
  bonus({ id: "b_shock", name: "Sparks", affix: "of Sparks", tags: ["Storm"], text: "On a 4: apply Shock", hooks: { face: [on(4, (b, c) => applyStatus(b, c.attacker, c.defender, "shock", 1))] } }),
  bonus({ id: "b_regen", name: "Renewal", affix: "of Renewal", tags: ["Blood"], text: "Start fights with {n+1} Regen", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "regen", n + 1) } }),
  bonus({ id: "b_barrier", name: "Warding", affix: "of Warding", tags: ["Guard"], text: "Start fights with {2n+1} Barrier", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "barrier", 2 * n + 1) } }),
  bonus({ id: "b_thorns", name: "Thorns", affix: "of Thorns", tags: ["Thorns"], text: "When hit, deal {n} back", hooks: { whenHit: (b, c, n) => ping(b, c.attacker, n, "Thorns") } }),
  bonus({ id: "b_leech", name: "Leech", affix: "of the Leech", tags: ["Blood", "Crit"], text: "Crits heal {n+1}", hooks: { onCrit: (b, c, n) => { heal(b, c.attacker, n + 1, "Leech"); } } }),
  bonus({ id: "b_gold", name: "Fortune", affix: "of Fortune", tags: ["Gold"], text: "+{2n} Gold per fight won", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.gold += 2 * n; } } }),
  bonus({ id: "b_fury", name: "Fury", affix: "of Fury", tags: ["Strike", "Crit"], text: "On a 6: gain {n} Might", hooks: { face: [on(6, (b, c, n) => applyStatus(b, c.attacker, c.attacker, "might", n))] } }),
  bonus({ id: "b_exposed", name: "Exposure", affix: "of Exposure", tags: ["Hex"], text: "On a 1: apply {n+1} Exposed", hooks: { face: [on(1, (b, c, n) => applyStatus(b, c.attacker, c.defender, "exposed", n + 1))] } }),
  bonus({ id: "b_weak", name: "Withering", affix: "of Withering", tags: ["Hex"], text: "On a 3: apply {n} Weak", hooks: { face: [on(3, (b, c, n) => applyStatus(b, c.attacker, c.defender, "weak", n))] } }),
  bonus({ id: "b_focus", name: "Insight", affix: "of Insight", tags: ["Luck"], text: "Start fights with Focus", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "focus", 1) } }),
  bonus({ id: "b_alchemy", name: "Alchemy", affix: "of Alchemy", tags: ["Arcane", "Hex"], text: "Reactions deal +{25n}%", hooks: { reactionMult: (_b, _f, n) => 1 + 0.25 * n } }),
  bonus({ id: "b_spikes", name: "Bristling", affix: "of Bristling", tags: ["Thorns"], text: "On a 4: gain {n+1} Spikes", hooks: { face: [on(4, (b, c, n) => applyStatus(b, c.attacker, c.attacker, "spikes", n + 1))] } }),
  // Rare+ only: twists borrowed from the old classes.
  bonus({ id: "b_twin", name: "Twin Fang", affix: "of the Twin Fang", minRarity: "rare", tags: ["Tempo"], text: "Your 6s attack again (once per round)",
    hooks: { onHit: (b, c) => { if (c.face === 6 && !c.offhand && c.attacker.flags["twin"] !== b.round && c.defender.hp > 0) { c.attacker.flags["twin"] = b.round; log(b, "Twin Fang: attack again!"); attackAgain(b, c.attacker, c.defender); } } } }),
  bonus({ id: "b_sovereign", name: "Sovereign Blood", affix: "of Sovereign Blood", minRarity: "rare", tags: ["Blood"], text: "+1 Damage per {8-n} current HP",
    hooks: { modifyAttack: (_b, c, n) => { c.bonus += Math.floor(Math.max(0, c.attacker.hp) / Math.max(4, 8 - n)); } } }),
  bonus({ id: "b_carnage", name: "Carnage", affix: "of Carnage", minRarity: "rare", tags: ["Kill"], text: "Overkill carries into the next fight",
    hooks: { onKill: (b, c) => { if (c.defender.hp < 0 && !c.spec.cleave) { b.carry += -c.defender.hp; log(b, `Carnage: ${-c.defender.hp} carries over.`); } } } })
];

const attackAgain = (b: Battle, a: Fighter, d: Fighter) => attack(b, a, d);

export const EPIC_POWERS: HookDef[] = [
  epic({ id: "e_echoing", name: "Echoing", affix: "Echoing", tags: ["Crit", "Tempo"], text: "When you roll a 6, attack again (once per round)",
    hooks: { onHit: (b, c) => { if (c.face === 6 && !c.offhand && c.attacker.flags["echo"] !== b.round && c.defender.hp > 0) { c.attacker.flags["echo"] = b.round; log(b, "Echoing: the 6 strikes again!"); attackAgain(b, c.attacker, c.defender); } } } }),
  epic({ id: "e_stormcaller", name: "Stormcaller", affix: "Stormcaller's", tags: ["Storm", "Crit"], text: "Every crit applies Shock and 2 Exposed",
    hooks: { onCrit: (b, c) => { applyStatus(b, c.attacker, c.defender, "shock", 1); applyStatus(b, c.attacker, c.defender, "exposed", 2); } } }),
  epic({ id: "e_unbreaking", name: "Unbreaking", affix: "Unbreaking", tags: ["Guard"], text: "Once per fight, a hit that would drop you to 0 leaves you at 1 HP",
    hooks: { whenHit: (b, c) => { const d = c.defender; if (d.hp <= 0 && !d.flags["unbroken"]) { d.flags["unbroken"] = 1; d.hp = 1; log(b, "Unbreaking: you stand at 1 HP."); } } } }),
  epic({ id: "e_gilded", name: "Gilded", affix: "Gilded", tags: ["Gold", "Kill"], text: "Kills drop Gold equal to twice the enemy's Power",
    hooks: { onKill: (b, c) => { c.attacker.gold += c.defender.damage * 2; log(b, `Gilded: +${c.defender.damage * 2} Gold.`); } } }),
  epic({ id: "e_sundering", name: "Sundering", affix: "Sundering", tags: ["Strike", "Hex"], text: "Your hits strip 1 Armor from the enemy for the fight",
    hooks: { onHit: (b, c) => { if (c.defender.armor > 0) { c.defender.armor -= 1; log(b, `Sundering: ${c.defender.name} loses 1 Armor.`); } } } }),
  epic({ id: "e_vampiric", name: "Vampiric", affix: "Vampiric", tags: ["Blood", "Crit"], text: "Crits heal half the damage dealt", hooks: { onCrit: (b, c) => { heal(b, c.attacker, Math.ceil(c.dealt / 2), "Vampiric"); } } }),
  epic({ id: "e_blazing", name: "Blazing", affix: "Blazing", tags: ["Burn"], text: "Every hit applies 2 Burn", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2) } }),
  epic({ id: "e_executioner", name: "Executioner's", affix: "Executioner's", tags: ["Kill"], text: "Double damage to enemies under 30% HP",
    hooks: { modifyAttack: (_b, c) => { if (c.defender.hp < c.defender.maxHp * 0.3) c.mult *= 2; } } }),
  epic({ id: "e_swift", name: "Swift", affix: "Swift", tags: ["Tempo"], text: "Start each fight with Haste", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "haste", 1) } }),
  epic({ id: "e_venomous", name: "Venomous", affix: "Venomous", tags: ["Poison"], text: "Every hit applies 2 Poison", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 2) } }),
  epic({ id: "e_frostbound", name: "Frostbound", affix: "Frostbound", tags: ["Frost"], text: "Every hit applies 1 Chill", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "chill", 1) } }),
  epic({ id: "e_thundering", name: "Thundering", affix: "Thundering", tags: ["Storm", "Crit"], text: "Your 6s Stun", hooks: { face: [on(6, (b, c) => applyStatus(b, c.attacker, c.defender, "stun", 1))] } }),
  epic({ id: "e_bloodthirsty", name: "Bloodthirsty", affix: "Bloodthirsty", tags: ["Blood", "Kill"], text: "Kills restore 15% of your Max HP", hooks: { onKill: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.15), "Bloodthirsty"); } } }),
  epic({ id: "e_bastion", name: "Bastion", affix: "Bastion", tags: ["Guard", "Thorns"], text: "Guarding also deals your Armor to the enemy", hooks: { onGuard: (b, f) => ping(b, b.player === f ? b.enemy : b.player, f.armor, "Bastion") } }),
  epic({ id: "e_hexing", name: "Hexing", affix: "Hexing", tags: ["Hex"], text: "Every hit applies 1 Weak and 1 Exposed", hooks: { onHit: (b, c) => { applyStatus(b, c.attacker, c.defender, "weak", 1); applyStatus(b, c.attacker, c.defender, "exposed", 1); } } }),
  epic({ id: "e_lucky", name: "Lucky", affix: "Lucky", tags: ["Luck"], text: "Your first 1 each fight becomes a 6",
    hooks: { modifyRoll: (b, f, r) => { if (r === 1 && !f.flags["lucky"]) { f.flags["lucky"] = 1; log(b, "Lucky: the 1 becomes a 6!"); return 6; } return r; } } })
];

const legendary = (d: Omit<GearBase, "rarity">): GearBase => ({ ...d, rarity: "legendary" });

export const LEGENDARIES: GearBase[] = [
  legendary({ id: "l_kingsbane", kind: "weapon", slot: "main", name: "Kingsbane", tags: ["Strike", "Kill"], damage: 6,
    faces: [HIT, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 1, asBase: "w_sword", reveal: "No Grazes. Gains +1 Damage for the rest of the run every time you kill an Elite or boss." },
    text: "A sword that grows with every great kill.",
    hooks: {
      modifyAttack: (_b, c) => { c.bonus += c.attacker.persist["kingsbane"] ?? 0; },
      onKill: (b, c) => { if (c.defender.elite || c.defender.boss) { c.attacker.persist["kingsbane"] = (c.attacker.persist["kingsbane"] ?? 0) + 1; log(b, `Kingsbane grows (+${c.attacker.persist["kingsbane"]}).`); } }
    } }),
  legendary({ id: "l_starfall", kind: "weapon", slot: "main", name: "Starfall Staff", tags: ["Arcane", "Burn"], damage: 3,
    faces: [cast("Venom Dart", "graze", hex("poison", 3)), cast("Fire Bolt", "hit", hex("burn", 4)), cast("Frost Lance", "hit", hex("chill", 3)), cast("Arc", "hit", hex("shock", 1)), cast("Hex Bolt", "hit", hex("exposed", 2)),
      cast("Meteor", "crit", (b, c) => { const n = c.attacker.flags["burnTotal"] ?? 0; c.bonus += n; if (n) log(b, `☄️ Meteor adds all ${n} Burn you've applied this fight.`); })],
    legendary: { minFloor: 3, asBase: "w_staff", reveal: "Every face is a spell. On a 6, a meteor adds all the Burn you've applied this fight to the hit." },
    text: "The sky answers.",
    hooks: { onStatusApplied: (_b, self, _t, status, n) => { if (status === "burn") self.flags["burnTotal"] = (self.flags["burnTotal"] ?? 0) + n; } } }),
  legendary({ id: "l_aegis_dawn", kind: "off", slot: "off", name: "Aegis of Dawn", tags: ["Guard", "Thorns"], armor: 3,
    legendary: { minFloor: 3, asBase: "o_wooden_shield", reveal: "Damage you fully block is stored. Guarding releases it all as one hit." },
    text: "It remembers every blow.",
    hooks: { onGuard: (b, f) => { const n = f.flags["blocked"] ?? 0; if (n > 0) { f.flags["blocked"] = 0; ping(b, b.enemy === f ? b.player : b.enemy, n, "☀️ Aegis of Dawn releases the stored blows"); } } } }),
  legendary({ id: "l_mantle", kind: "armour", slot: "armour", name: "Thousand-Eyed Mantle", tags: ["Hex", "Arcane"], armor: 1,
    legendary: { minFloor: 4, asBase: "a_cloth", reveal: "Every negative status you apply lands twice, and reactions can fire off the second." },
    text: "It sees every weakness.",
    hooks: { onStatusApplied: (b, self, t, status, n) => {
      if (t === self || self.flags["mantle"] || ["regen", "barrier", "might", "haste", "focus", "evade", "spikes", "ward"].includes(status)) return;
      self.flags["mantle"] = 1; applyStatus(b, self, t, status, n); self.flags["mantle"] = 0;
    } } }),
  legendary({ id: "l_chronoglass", kind: "trinket", slot: "trinket", name: "Chronoglass", tags: ["Luck", "Tempo"],
    legendary: { minFloor: 6, asBase: "t_brass_amulet", reveal: "Once per fight, a round that costs you HP (or your life) is rewound and played again." },
    text: "Sand that falls upward.", hooks: {} }),
  legendary({ id: "l_hollow_crown", kind: "trinket", slot: "trinket", name: "Hollow Crown", tags: ["Guard", "Arcane"],
    legendary: { minFloor: 7, asBase: "t_ring_might", reveal: "Your Max HP becomes 1. Barrier never fades between fights, every face you roll gives 3 Barrier, and each fight starts with at least 10." },
    text: "Heavy is the head.",
    hooks: {
      stats: s => { s.maxHp = 1; },
      onFightStart: (b, f) => { f.persist["keepBarrier"] = 1; if (st(f, "barrier") < 10) f.statuses.barrier = 10; },
      face: [on("any", (b, c) => applyStatus(b, c.attacker, c.attacker, "barrier", 3))]
    } }),
  legendary({ id: "l_tempest_maul", kind: "weapon", slot: "main", name: "Tempest Maul", tags: ["Storm", "Strike"], damage: 7, twoHanded: true,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 5, asBase: "w_hammer", reveal: "Every hit Shocks. Your 6s Stun and deal triple instead of double." },
    text: "Thunder in a handle.",
    hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "shock", 1), modifyAttack: (b, c) => { if (c.face === 6 && !c.offhand) { c.mult = 3; applyStatus(b, c.attacker, c.defender, "stun", 1); } } } }),
  legendary({ id: "l_gravecaller", kind: "off", slot: "off", name: "Gravecaller's Lantern", tags: ["Hex", "Kill"],
    legendary: { minFloor: 5, asBase: "o_bone_focus", reveal: "Doom kills once it reaches half the enemy's HP. On a 1 or 2: apply 3 Doom." },
    text: "It lights the way for the dying.",
    hooks: { face: [on("low", (b, c) => applyStatus(b, c.attacker, c.defender, "doom", 3))],
      onRoundEnd: (b, f) => { const e = b.player === f ? b.enemy : b.player; if (st(e, "doom") > 0 && st(e, "doom") * 2 >= e.hp && e.hp > 0) { e.hp = 0; log(b, "💀 The Gravecaller claims its due."); b.fx.push({ who: e.id, kind: "text", text: "Claimed", icon: "💀" }); } } } }),
  legendary({ id: "l_ouroboros", kind: "trinket", slot: "trinket", name: "Ouroboros Band", tags: ["Arcane", "Hex"],
    legendary: { minFloor: 5, asBase: "t_brass_amulet", reveal: "Reactions hit twice as hard, and every reaction you cause heals you 3." },
    text: "The end feeds the beginning.",
    hooks: { reactionMult: () => 2 } }), // healing on reactions: see statuses.ts
  legendary({ id: "l_sanguine_regalia", kind: "armour", slot: "armour", name: "Sanguine Regalia", tags: ["Blood", "Guard"], armor: 2,
    legendary: { minFloor: 5, asBase: "a_padded", reveal: "Heal 1 on every hit you land. Healing above your Max HP becomes Barrier." },
    text: "Royal blood, rightly spilled.",
    hooks: { onHit: (b, c) => { const f = c.attacker; if (f.hp >= f.maxHp) applyStatus(b, f, f, "barrier", 1); else heal(b, f, 1, "Regalia"); } } }),
  legendary({ id: "l_crown_endless", kind: "trinket", slot: "trinket", name: "Crown of the Endless", tags: ["Strike", "Kill"],
    legendary: { minFloor: 9, asBase: "t_ring_might", reveal: "+1 Damage for every boss you've slain this run." },
    text: "Every throne you topple becomes a jewel.",
    hooks: { modifyAttack: (_b, c) => { c.bonus += c.attacker.persist["bossKills"] ?? 0; } } }),
  legendary({ id: "l_loaded_fate", kind: "trinket", slot: "trinket", name: "Loaded Fate", tags: ["Luck"],
    legendary: { minFloor: 6, asBase: "t_lucky_coin", reveal: "Every 1 and 2 you roll is rerolled once." },
    text: "The dice were never fair. Now they're yours.",
    hooks: { modifyRoll: (b, f, r) => (r <= 2 ? 1 + Math.floor(b.rng() * 6) : r) } }),
  legendary({ id: "l_worldsplitter", kind: "weapon", slot: "main", name: "Worldsplitter", tags: ["Strike", "Kill"], damage: 7, twoHanded: true,
    faces: [MISS, MISS, HIT, HIT, HIT, ...Array.from({ length: 7 }, () => ({ kind: "crit" as const, name: "Cleave", cleave: true }))],
    legendary: { minFloor: 8, asBase: "w_axe", reveal: "Your die has 12 faces, and faces 6–12 are all Cleaves." },
    text: "It was never meant for one world.", hooks: {} })
];
