// Gear bases: weapons (your die), off-hands, armour and trinkets. Rarity and bonuses are rolled on top.
import type { GearBase } from "../engine/types";
import { applyStatus, cast, CRIT, GRAZE, heal, hex, HIT, MISS, on, other, ping, self, spell, st } from "./helpers";

const weapon = (d: Omit<GearBase, "kind" | "slot">): GearBase => ({ kind: "weapon", slot: "main", ...d });
const off = (d: Omit<GearBase, "kind" | "slot">): GearBase => ({ kind: "off", slot: "off", ...d });
const armour = (d: Omit<GearBase, "kind" | "slot">): GearBase => ({ kind: "armour", slot: "armour", ...d });
const trinket = (d: Omit<GearBase, "kind" | "slot">): GearBase => ({ kind: "trinket", slot: "trinket", ...d });

export const WEAPONS: GearBase[] = [
  weapon({ id: "w_sword", name: "Iron Sword", tags: ["Strike"], text: "Steady and reliable.", damage: 4, faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], hooks: {} }),
  weapon({ id: "w_dagger", name: "Dagger", tags: ["Bleed", "Crit"], text: "Light; can be held in the off-hand for a second die.", damage: 3, offDamage: 2,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, spell("Gut", "crit", hex("bleed", 2))], hooks: {} }),
  weapon({ id: "w_throwing_knife", name: "Throwing Knife", tags: ["Crit", "Tempo"], text: "Best in the off-hand.", damage: 2, offDamage: 2,
    faces: [MISS, HIT, HIT, HIT, CRIT, CRIT], hooks: {} }),
  weapon({ id: "w_hand_axe", name: "Hand Axe", tags: ["Strike", "Bleed"], text: "One-handed; works in the off-hand.", damage: 4, offDamage: 3,
    faces: [MISS, HIT, HIT, HIT, spell("Hack", "hit", hex("bleed", 2)), { kind: "crit", name: "Cleave", cleave: true }], hooks: {} }),
  weapon({ id: "w_axe", name: "Battle Axe", tags: ["Strike", "Kill"], text: "Two-handed. Swingy, brutal.", damage: 6, twoHanded: true,
    faces: [MISS, MISS, HIT, HIT, HIT, { kind: "crit", name: "Cleave", cleave: true }], hooks: {} }),
  weapon({ id: "w_hammer", name: "War Hammer", tags: ["Strike", "Guard"], text: "Two-handed. A 6 stuns.", damage: 6, twoHanded: true,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Crush", "crit", hex("stun", 1))], hooks: {} }),
  weapon({ id: "w_mace", name: "Mace", tags: ["Strike", "Guard"], text: "A 5 dazes (Weak).", damage: 4,
    faces: [GRAZE, HIT, HIT, HIT, spell("Daze", "hit", hex("weak", 2)), CRIT], hooks: {} }),
  weapon({ id: "w_staff", name: "Apprentice Staff", tags: ["Arcane", "Burn", "Frost"], text: "Weak blows, but its faces cast spells.", damage: 3,
    faces: [{ kind: "miss", name: "Fizzle" }, cast("Fire Bolt", "hit", hex("burn", 3)), HIT, cast("Frost Lance", "hit", hex("chill", 2)), HIT, cast("Arc", "crit", hex("shock", 1))], hooks: {} }),
  weapon({ id: "w_greatstaff", name: "Greatstaff", tags: ["Arcane", "Storm", "Poison"], text: "Two-handed. More spells, bigger spells.", damage: 3, twoHanded: true,
    faces: [cast("Venom Mist", "graze", hex("poison", 3)), cast("Fire Bolt", "hit", hex("burn", 4)), cast("Frost Lance", "hit", hex("chill", 3)), HIT, cast("Hex Bolt", "hit", hex("exposed", 2)), cast("Chain Lightning", "crit", hex("shock", 2))], hooks: {} }),
  weapon({ id: "w_wand", name: "Ember Wand", tags: ["Arcane", "Burn"], text: "One-handed spark-thrower; works in the off-hand.", damage: 2, offDamage: 2,
    faces: [{ kind: "miss", name: "Fizzle" }, HIT, cast("Spark", "hit", hex("burn", 2)), HIT, cast("Spark", "hit", hex("burn", 2)), cast("Flare", "crit", hex("burn", 4))], hooks: {} }),
  weapon({ id: "w_bow", name: "Hunting Bow", tags: ["Crit", "Hex"], text: "Two-handed. A 6 pierces (Exposed).", damage: 4, twoHanded: true,
    faces: [MISS, HIT, HIT, HIT, HIT, spell("Pierce", "crit", hex("exposed", 2))], hooks: {} }),
  weapon({ id: "w_spear", name: "Spear", tags: ["Tempo", "Guard"], text: "Two-handed. A 5 lunges and sets you up to dodge.", damage: 5, twoHanded: true,
    faces: [GRAZE, HIT, HIT, HIT, spell("Lunge", "hit", self("evade", 1)), CRIT], hooks: {} }),
  weapon({ id: "w_scythe", name: "Scythe", tags: ["Bleed", "Hex", "Kill"], text: "Two-handed. Reaps the dying.", damage: 5, twoHanded: true,
    faces: [GRAZE, spell("Rend", "hit", hex("bleed", 1)), HIT, spell("Rend", "hit", hex("bleed", 1)), HIT, spell("Reap", "crit", hex("doom", 3))], hooks: {} }),
  weapon({ id: "w_rapier", name: "Rapier", tags: ["Crit", "Tempo"], text: "Precise. A 6 sets up your next roll.", damage: 3,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, spell("Riposte", "crit", self("focus", 1))], hooks: {} })
];

export const OFFHANDS: GearBase[] = [
  off({ id: "o_wooden_shield", name: "Wooden Shield", tags: ["Guard"], text: "+1 Armor. Guarding gives 2 Barrier.", armor: 1,
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", 2) } }),
  off({ id: "o_tower_shield", name: "Tower Shield", tags: ["Guard", "Thorns"], text: "+2 Armor. While Guarding, attackers take 2.", armor: 2,
    hooks: { whenHit: (b, ctx) => { if (ctx.defender.flags["guarding"]) ping(b, ctx.attacker, 2, "Tower Shield"); } } }),
  off({ id: "o_ember_charm", name: "Ember Charm", tags: ["Burn", "Arcane"], text: "On a 2: apply 2 Burn.", hooks: { face: [on(2, (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "burn", 2))] } }),
  off({ id: "o_frost_orb", name: "Frost Orb", tags: ["Frost", "Arcane"], text: "On a 4: apply 2 Chill. Chill you apply lasts 1 round longer.",
    hooks: { face: [on(4, (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "chill", 2))],
      onStatusApplied: (_b, _s, t, status) => { if (status === "chill") t.statuses.chill = st(t, "chill") + 1; } } }),
  off({ id: "o_holy_symbol", name: "Holy Symbol", tags: ["Blood", "Guard"], text: "Start each fight with Ward. On a 6: gain 3 Regen.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1), face: [on(6, (b, ctx) => applyStatus(b, ctx.attacker, ctx.attacker, "regen", 3))] } }),
  off({ id: "o_tome", name: "Tome of Hexes", tags: ["Hex", "Arcane"], text: "On a 3: apply 2 Weak. On a 1: apply 2 Exposed.",
    hooks: { face: [on(3, (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "weak", 2)), on(1, (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "exposed", 2))] } }),
  off({ id: "o_storm_lantern", name: "Storm Lantern", tags: ["Storm", "Arcane"], text: "On a 5: apply Shock.", hooks: { face: [on(5, (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "shock", 1))] } }),
  off({ id: "o_bone_focus", name: "Bone Focus", tags: ["Hex", "Kill"], text: "On a 1: apply 2 Doom instead of grazing.",
    hooks: { face: [on(1, (b, ctx) => { ctx.noDamage = true; applyStatus(b, ctx.attacker, ctx.defender, "doom", 2); })] } })
];

export const ARMOURS: GearBase[] = [
  armour({ id: "a_chain", name: "Chain Vest", tags: ["Guard"], text: "Medium armour.", armor: 2, hooks: {} }),
  armour({ id: "a_plate", name: "Plate Armour", tags: ["Guard"], text: "Heavy: +4 Armor, but you start fights Weak for 1 round.", armor: 4,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "weak", 1) } }),
  armour({ id: "a_leather", name: "Leather Jerkin", tags: ["Tempo", "Luck"], text: "Light: +1 Armor. Start each fight with Evade.", armor: 1,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "evade", 1) } }),
  armour({ id: "a_shadow", name: "Shadow Cloak", tags: ["Hex", "Tempo"], text: "Start each fight with Evade and Focus.",
    hooks: { onFightStart: (b, f) => { applyStatus(b, f, f, "evade", 1); applyStatus(b, f, f, "focus", 1); } } }),
  armour({ id: "a_cloth", name: "Cloth Robes", tags: ["Arcane", "Guard"], text: "Start each fight with 4 Barrier. Burn and Chill you apply get +1 stack.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "barrier", 4), onStatusApplied: (_b, _s, t, status) => { if (status === "burn" || status === "chill") t.statuses[status] = st(t, status) + 1; } } }),
  armour({ id: "a_padded", name: "Padded Robes", tags: ["Blood"], text: "+1 Armor. Start each fight with 2 Regen.", armor: 1,
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 2) } }),
  armour({ id: "a_spiked", name: "Spiked Mail", tags: ["Thorns", "Guard"], text: "+2 Armor. When hit, deal 2 back.", armor: 2,
    hooks: { whenHit: (b, ctx) => ping(b, ctx.attacker, 2, "Spiked Mail") } }),
  armour({ id: "a_bloodweave", name: "Bloodweave Robe", tags: ["Blood", "Bleed"], text: "Heal 1 at the end of each round the enemy is Bleeding.",
    hooks: { onRoundEnd: (b, f) => { if (st(other(b, f), "bleed") > 0) heal(b, f, 1, "Bloodweave"); } } })
];

export const TRINKETS: GearBase[] = [
  trinket({ id: "t_brass_amulet", name: "Brass Amulet", tags: ["Blood"], text: "+3 Max HP.", maxHp: 3, hooks: {} }),
  trinket({ id: "t_ring_might", name: "Ring of Might", tags: ["Strike"], text: "+1 Damage.", hooks: { stats: s => { s.damage += 1; s.offDamage += 1; } } }),
  trinket({ id: "t_band_vigor", name: "Band of Vigor", tags: ["Blood"], text: "+6 Max HP.", maxHp: 6, hooks: {} }),
  trinket({ id: "t_ember_pendant", name: "Ember Pendant", tags: ["Burn"], text: "Burn you apply +1.",
    hooks: { onStatusApplied: (_b, _s, t, status) => { if (status === "burn") t.statuses.burn = st(t, "burn") + 1; } } }),
  trinket({ id: "t_viper_ring", name: "Viper Ring", tags: ["Poison"], text: "On a 3: apply 3 Poison.", hooks: { face: [on(3, (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "poison", 3))] } }),
  trinket({ id: "t_lucky_coin", name: "Lucky Coin", tags: ["Luck", "Gold"], text: "Reroll your first 1 each fight. +2 Gold per fight.",
    hooks: {
      modifyRoll: (b, f, r) => { if (r === 1 && !f.flags["coin"]) { f.flags["coin"] = 1; const n = 1 + Math.floor(b.rng() * 6); b.log.push(`Lucky Coin rerolls the 1 → ${n}.`); return n; } return r; },
      onFightEnd: (b, f) => { if (b.over === "won" && f.id === "player") f.gold += 2; }
    } }),
  trinket({ id: "t_thorn_ring", name: "Thorn Ring", tags: ["Thorns"], text: "When hit, deal 1 back.", hooks: { whenHit: (b, ctx) => ping(b, ctx.attacker, 1, "Thorn Ring") } }),
  trinket({ id: "t_storm_amulet", name: "Stormcaller Amulet", tags: ["Storm", "Crit"], text: "Crits apply Shock.", hooks: { onCrit: (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "shock", 1) } }),
  trinket({ id: "t_prospector", name: "Prospector's Ring", tags: ["Luck"], text: "Resplendent chests show a 4th card.", hooks: {} }),
  trinket({ id: "t_monocle", name: "Seer's Monocle", tags: ["Luck"], text: "Resplendent card backs show their rarity colour.", hooks: {} })
];

export const GEAR_BASES: GearBase[] = [...WEAPONS, ...OFFHANDS, ...ARMOURS, ...TRINKETS];
