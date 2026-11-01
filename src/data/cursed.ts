// Cursed gear: Epics that feed on your curses. They only turn up once you've been cursed at least once.
import type { Fighter, GearBase, StatBlock } from "../engine/types";
import { CRIT, GRAZE, HIT, MISS } from "./helpers";

const ep = (d: Omit<GearBase, "onlyRarity" | "needsCurse">): GearBase => ({ ...d, onlyRarity: "epic", needsCurse: true });
const curses = (f: Fighter) => f.persist["curseCount"] ?? 0;
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const stat = (fn: (s: StatBlock, c: number) => void) => (s: StatBlock, _n: number, f: Fighter) => fn(s, curses(f));

export const CURSED_EPICS: GearBase[] = [
  // ---------- Weapons ----------
  ep({ kind: "weapon", slot: "main", id: "cu_hexed_executioner", name: "Hexed Executioner", tags: ["Hex", "Strike", "Kill"], damage: 12, twoHanded: true, faces: [MISS, HIT, HIT, HIT, CRIT, CRIT],
    text: "Two-handed. You deal 20% more damage for every curse you carry.", hooks: { stats: stat((s, c) => { s.dmgDealt = (s.dmgDealt ?? 0) + 20 * c; }) } }),
  ep({ kind: "weapon", slot: "main", id: "cu_blade_damned", name: "Blade of the Damned", tags: ["Hex", "Strike"], damage: 8, faces: PLAIN,
    text: "While you're cursed, you deal 50% more damage.", hooks: { stats: stat((s, c) => { if (c > 0) s.dmgDealt = (s.dmgDealt ?? 0) + 50; }) } }),
  ep({ kind: "weapon", slot: "main", weaponType: "dagger", id: "cu_witchbone", name: "Witchbone Dagger", tags: ["Hex", "Crit"], damage: 4, offDamage: 5, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: "Dagger. Crits on 5 and 6. +2 Damage (both hands) for every curse you carry.", hooks: { stats: stat((s, c) => { s.damage += 2 * c; s.offDamage += 2 * c; }) } }),
  ep({ kind: "weapon", slot: "main", id: "cu_grave_iron", name: "Grave-Iron Maul", tags: ["Hex", "Crit", "Strike"], damage: 13, twoHanded: true, heavy: true, faces: [MISS, HIT, HIT, HIT, CRIT, CRIT],
    text: "Heavy, two-handed (builds Stagger). Your Crits deal 25% more for every curse you carry.", hooks: { stats: stat((s, c) => { s.critDmg = (s.critDmg ?? 0) + 25 * c; }) } }),
  // ---------- Armour ----------
  ep({ kind: "armour", slot: "armour", id: "cu_many_sorrows", name: "Shroud of Many Sorrows", tags: ["Hex", "Blood"], armor: 2,
    text: "Light: +2 Armor. +6 Max HP for every curse you carry.", hooks: { stats: stat((s, c) => { s.maxHp += 6 * c; }) } }),
  ep({ kind: "armour", slot: "armour", id: "cu_penitent_iron", name: "Penitent's Iron", tags: ["Hex", "Guard"], armor: 4,
    text: "Heavy: +4 Armor. +2 Armor for every curse you carry.", hooks: { stats: stat((s, c) => { s.armor += 2 * c; }) } }),
  ep({ kind: "armour", slot: "armour", id: "cu_accursed_mantle", name: "Mantle of the Accursed", tags: ["Hex", "Guard", "Blood"], armor: 3,
    text: "Medium: +3 Armor. While you're cursed: +4 more Armor and +15 Max HP.", hooks: { stats: stat((s, c) => { if (c > 0) { s.armor += 4; s.maxHp += 15; } }) } }),
  ep({ kind: "armour", slot: "armour", id: "cu_condemned_chains", name: "Chains of the Condemned", tags: ["Hex", "Guard", "Blood"], armor: 5,
    text: "Heavy: +5 Armor. +2 Armor and +4 Max HP for every curse you carry.", hooks: { stats: stat((s, c) => { s.armor += 2 * c; s.maxHp += 4 * c; }) } })
];
