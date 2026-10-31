// Non-elemental gear and new effects: Reckless (deal more, take more), roll caps, and Fracture
// (does nothing until 3 stacks, then shatters). Normal drop odds for their rarity.
import type { GearBase, HookDef } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, other, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const W = { kind: "weapon" as const, slot: "main" as const };
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };
const reckless = (dealt: number, taken: number) => (s: { dmgDealt?: number; dmgTaken?: number }) => { s.dmgDealt = (s.dmgDealt ?? 0) + dealt; s.dmgTaken = (s.dmgTaken ?? 0) + taken; };
const fracture = (n: number) => (b: Parameters<NonNullable<GearBase["hooks"]["onHit"]>>[0], c: Parameters<NonNullable<GearBase["hooks"]["onHit"]>>[1]) => applyStatus(b, c.attacker, c.defender, "fracture", n);

export const BRUTE_GEAR: GearBase[] = [
  // ---------- Weapons ----------
  only("common", { ...W, id: "bt_militia_spear", name: "Militia Spear", tags: ["Strike"], damage: 4, faces: PLAIN, text: "A sturdy spear. Nothing fancy, nothing wrong with it.", hooks: {} }),
  only("uncommon", { ...W, id: "bt_splitting_hammer", name: "Splitting Hammer", tags: ["Strike", "Hex"], damage: 5, faces: PLAIN,
    text: "Its Hits apply 1 Fracture (at 3 stacks Fracture shatters for 4 per stack).", hooks: { onHit: (b, c) => { if (!c.offhand) fracture(1)(b, c); } } }),
  only("rare", { ...W, id: "bt_leaden_maul", name: "Leaden Maul", tags: ["Strike", "Crit"], damage: 11, twoHanded: true, faces: [HIT, HIT, HIT, CRIT, CRIT, CRIT],
    text: "Two-handed. Too heavy to swing high: your die can't roll above 4. A 4 is a Crit.", hooks: { onFightStart: (_b, f) => { f.flags["rollCap"] = 4; } } }),
  only("epic", { ...W, id: "bt_berserker_axe", name: "Berserker's Greataxe", tags: ["Strike", "Blood"], damage: 10, twoHanded: true, faces: PLAIN,
    text: "Two-handed. Reckless: you deal 30% more damage and take 20% more.", hooks: { stats: reckless(30, 20) } }),
  // ---------- Off-hands ----------
  only("uncommon", { ...O, id: "bt_chisel", name: "Mason's Chisel", tags: ["Hex", "Strike"], text: "On a 4 or a 5: apply 1 Fracture.",
    hooks: { face: [{ group: 4, run: (b, c) => applyStatus(b, c.attacker, c.defender, "fracture", 1) }, { group: 5, run: (b, c) => applyStatus(b, c.attacker, c.defender, "fracture", 1) }] } }),
  only("rare", { ...O, id: "bt_war_drum", name: "War Drum", tags: ["Strike", "Tempo"], text: "Each round, gain 1 Might (up to 4).",
    hooks: { onRoundStart: (b, f) => { if (st(f, "might") < 4) applyStatus(b, f, f, "might", 1); } } }),
  only("epic", { ...O, id: "bt_reckless_buckler", name: "Reckless Buckler", shield: true, tags: ["Guard", "Strike"], armor: 1,
    text: "Shield. +1 Armor. Reckless: you deal 25% more damage and take 15% more.", hooks: { stats: reckless(25, 15) } }),
  // ---------- Armour ----------
  only("common", { ...A, id: "bt_gambeson", name: "Padded Gambeson", tags: ["Guard", "Blood"], armor: 2, maxHp: 3, text: "Medium: +2 Armor and +3 Max HP.", hooks: {} }),
  only("uncommon", { ...A, id: "bt_berserker_hide", name: "Berserker Hide", tags: ["Strike", "Blood"], armor: 2,
    text: "Medium: +2 Armor. Reckless: you deal 20% more damage and take 20% more.", hooks: { stats: reckless(20, 20) } }),
  only("rare", { ...A, id: "bt_stonecarver", name: "Stonecarver's Apron", tags: ["Hex", "Crit"], armor: 1,
    text: "Light: +1 Armor. Your Crits apply 2 Fracture.", hooks: { onCrit: fracture(2) } }),
  only("epic", { ...A, id: "bt_juggernaut", name: "Juggernaut Plate", tags: ["Guard", "Blood"], armor: 7, maxHp: 8,
    text: "Heavy: +7 Armor and +8 Max HP. So heavy your die can't roll above 5.", hooks: { onFightStart: (_b, f) => { f.flags["rollCap"] = Math.min(f.flags["rollCap"] || 5, 5); } } }),
  // ---------- Trinkets ----------
  only("uncommon", { ...T, id: "bt_executioner_mark", name: "Executioner's Mark", tags: ["Kill", "Strike"],
    text: "Your hits on enemies below 30% HP deal +3.", hooks: { modifyAttack: (_b, c) => { if (c.defender.hp < c.defender.maxHp * 0.3) c.bonus += 3; } } }),
  only("rare", { ...T, id: "bt_berserker_torc", name: "Berserker's Torc", tags: ["Strike", "Blood"],
    text: "Reckless: you deal 25% more damage and take 25% more.", hooks: { stats: reckless(25, 25) } }),
  only("epic", { ...T, id: "bt_manacles", name: "Manacles of the Warden", tags: ["Guard", "Hex"],
    text: "Shackles the enemy: its die can't roll above 4.", hooks: { onFightStart: (b, f) => { other(b, f).flags["rollCap"] = 4; } } })
];

export const BRUTE_LEGENDARIES: GearBase[] = [
  { ...T, id: "lx_berserker_mask", rarity: "legendary", name: "Mask of the Berserker", tags: ["Strike", "Blood", "Kill"],
    legendary: { minFloor: 3, asBase: "t_ring_might", reveal: "Reckless: you deal 60% more damage and take 30% more. Kills heal 15% of your Max HP." },
    text: "It doesn't hide your face. It shows the other one.",
    hooks: { stats: reckless(60, 30), onKill: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.15), "Mask of the Berserker"); } } }
];

export const BRUTE_CRIMSON: GearBase[] = [
  { ...W, id: "cx_earthsplitter", rarity: "crimson", name: "Earthsplitter", tags: ["Strike", "Hex", "Crit"], damage: 13, twoHanded: true, faces: PLAIN,
    text: "Two-handed. Every hit applies 2 Fracture; Crits apply 3 more. Each time Fracture shatters, gain 2 Might.",
    hooks: { onHit: fracture(2), onCrit: fracture(3), onStatusApplied: (b, self, t, s) => { if (s === "fracture" && t !== self && st(t, "fracture") === 0) applyStatus(b, self, self, "might", 2); } } }
];

export const BRUTE_TALENTS: HookDef[] = [
  { kind: "talent", id: "t_reckless", name: "Reckless Abandon", tags: ["Strike", "Blood"], text: "Deal 15% / 25% / 40% more damage, and take 10% / 20% / 30% more",
    hooks: { stats: (s, n) => { const i = Math.min(n, 3) - 1; s.dmgDealt = (s.dmgDealt ?? 0) + [15, 25, 40][i]; s.dmgTaken = (s.dmgTaken ?? 0) + [10, 20, 30][i]; } } },
  { kind: "talent", id: "t_fault_lines", name: "Fault Lines", tags: ["Hex", "Crit"], text: "Your Crits apply 1 / 2 / 3 Fracture",
    hooks: { onCrit: (b, c, s) => applyStatus(b, c.attacker, c.defender, "fracture", Math.min(3, s)) } }
];

export const BRUTE_CURSES: HookDef[] = [
  { kind: "curse", id: "c_leaden_hands", name: "Leaden Hands", tags: ["Strike"], text: "Your die can't roll above 5",
    hooks: { onFightStart: (_b, f) => { f.flags["rollCap"] = Math.min(f.flags["rollCap"] || 5, 5); } } }
];

