// Gear from the deep Endless floors: Epics and Legendaries that only drop from floor 10, or from floor 20.
import type { GearBase } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, log, loseHp, other } from "./helpers";

const ep = (floorMin: number, d: Omit<GearBase, "onlyRarity" | "floorMin">): GearBase => ({ ...d, onlyRarity: "epic", floorMin });
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];

export const DEPTH_EPICS: GearBase[] = [
  // ---------- Floor 10+ ----------
  ep(10, { kind: "weapon", slot: "main", id: "dp_starfall", name: "Starfall Blade", tags: ["Strike", "Crit"], damage: 13, faces: [GRAZE, HIT, HIT, CRIT, CRIT, CRIT],
    text: "From floor 10. Crits on 4–6. Your Crits deal 40% more.", hooks: { stats: s => { s.critDmg = (s.critDmg ?? 0) + 40; } } }),
  ep(10, { kind: "armour", slot: "armour", id: "dp_abyssal_scale", name: "Abyssal Scale", tags: ["Guard", "Blood"], armor: 9, maxHp: 20,
    text: "From floor 10. Heavy: +9 Armor, +20 Max HP. Hits that deal 10 or more to you are cut by 3.",
    hooks: { whenHit: (b, c) => { if (c.dealt >= 10) { c.defender.hp = Math.min(c.defender.maxHp, c.defender.hp + 3); log(b, "Abyssal Scale: 3 turned aside."); } } } }),
  ep(10, { kind: "trinket", slot: "trinket", id: "dp_tenth_gate", name: "Crown of the Tenth Gate", tags: ["Strike", "Tempo"], maxHp: 10,
    text: "From floor 10. +10 Max HP. Start every fight with 3 Might and Haste.", hooks: { onFightStart: (b, f) => { applyStatus(b, f, f, "might", 3); applyStatus(b, f, f, "haste", 1); } } }),
  // ---------- Floor 20+ ----------
  ep(20, { kind: "weapon", slot: "main", id: "dp_voidreaver", name: "Voidreaver", tags: ["Strike", "Hex", "Kill"], damage: 20, twoHanded: true, faces: PLAIN,
    text: "From floor 20. Two-handed. Every hit also deals 3% of the enemy's Max HP. Kills heal 15%.",
    hooks: { onHit: (b, c) => { if (!c.offhand && c.defender.hp > 0) loseHp(b, c.defender, Math.ceil(c.defender.maxHp * 0.03)); }, onKill: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.15), "Voidreaver"); } } }),
  ep(20, { kind: "off", slot: "off", shield: true, id: "dp_twentieth_wall", name: "Wall of the Twentieth Deep", tags: ["Guard", "Thorns"], armor: 12, maxHp: 25,
    text: "From floor 20. Shield. +12 Armor, +25 Max HP. Guarding gives Barrier equal to half your Max HP.", hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", Math.ceil(f.maxHp / 2)) } }),
  ep(20, { kind: "trinket", slot: "trinket", id: "dp_deep_eye", name: "Eye of the Deep Dark", tags: ["Crit", "Hex"],
    text: "From floor 20. +20% Crit chance, Crits deal 50% more, and every Crit Exposes and Weakens the enemy.",
    hooks: { stats: s => { s.critChance += 20; s.critDmg = (s.critDmg ?? 0) + 50; }, onCrit: (b, c) => { applyStatus(b, c.attacker, c.defender, "exposed", 2); applyStatus(b, c.attacker, c.defender, "weak", 2); } } })
];

export const DEPTH_LEGENDARIES: GearBase[] = [
  // Floor 10+
  { kind: "weapon", slot: "main", id: "lx_tenfold_edge", rarity: "legendary", name: "The Tenfold Edge", tags: ["Strike", "Crit"], damage: 14, faces: PLAIN,
    legendary: { minFloor: 10, asBase: "w_sword", reveal: "Every 10th hit you land in a fight deals ten times its damage." },
    text: "It counts. It always counts.",
    hooks: { modifyAttack: (_b, c) => { const n = (c.attacker.flags["tenfold"] ?? 0) + 1; if (n % 10 === 0) c.mult *= 10; }, onHit: (_b, c) => { c.attacker.flags["tenfold"] = (c.attacker.flags["tenfold"] ?? 0) + 1; } } },
  { kind: "trinket", slot: "trinket", id: "lx_lantern_deep", rarity: "legendary", name: "Lantern of the Deep", tags: ["Holy", "Guard", "Blood"],
    legendary: { minFloor: 10, asBase: "t_brass_amulet", reveal: "Start every fight with Ward and 6 Regen. You take 25% less damage." },
    text: "It was lit on the surface. It has never gone out.",
    hooks: { stats: s => { s.dmgTaken = (s.dmgTaken ?? 0) - 25; }, onFightStart: (b, f) => { applyStatus(b, f, f, "ward", 1); applyStatus(b, f, f, "regen", 6); } } },
  // Floor 20+
  { kind: "armour", slot: "armour", id: "lx_skin_of_the_deep", rarity: "legendary", name: "Skin of the Twentieth Deep", tags: ["Guard", "Blood", "Thorns"], armor: 15, maxHp: 40,
    legendary: { minFloor: 20, asBase: "a_chain", reveal: "Heavy: +15 Armor, +40 Max HP. Anything that hits you takes 20% of the damage it tried to deal." },
    text: "Whatever wore it first is still down there, cold.",
    hooks: { whenHit: (b, c) => { const n = Math.ceil((c.raw ?? 0) * 0.2); if (n > 0 && c.attacker.hp > 0) { loseHp(b, c.attacker, n); log(b, `Skin of the Deep: ${n} back.`); } } } },
  { kind: "off", slot: "off", id: "lx_choir_below", rarity: "legendary", name: "Hymnal of the Choir Below", barrierElement: "doom", tags: ["Arcane", "Hex", "Holy"],
    legendary: { minFloor: 20, asBase: "o_tome", reveal: "Spell Amp +50%. Every round, the enemy gains 3 Doom, and every negative status on it deals 2 damage." },
    text: "They're still singing. They'll sing for you too.",
    hooks: { stats: s => { s.spellAmp += 50; }, onRoundStart: (b, f) => { const e = other(b, f); applyStatus(b, f, e, "doom", 3); const kinds = Object.entries(e.statuses).filter(([k, n]) => (n ?? 0) > 0 && !["barrier", "might", "regen", "ward", "haste", "focus", "evade", "spikes", "charged", "kindled", "grounded", "smoulder_soul", "consecrated", "reinforced", "blessed"].includes(k)).length; if (kinds) { loseHp(b, e, 2 * kinds); log(b, `🎶 The Choir Below: ${2 * kinds}.`); } } } }
];
