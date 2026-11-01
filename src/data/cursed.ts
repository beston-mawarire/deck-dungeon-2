// Cursed gear: Epics that feed on your curses, and Curse-Eaters that devour them for huge hits.
import type { Fighter, GearBase, StatBlock } from "../engine/types";
import { damageOf } from "../engine/combat";
import { getItem } from "../engine/registry";
import type { AttackCtx, Battle } from "../engine/types";
import { applyStatus, cast, CRIT, GRAZE, heal, hex, HIT, log, MISS, st } from "./helpers";

const ep = (d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity: "epic" });
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

// ---------- Curse-Eaters ----------
// A hit devours one of your curses (it's gone for good when the fight ends) and lands a huge bonus.
// The more curses you carry, the more hits get the bonus. No curses, no bonus.
function eatCurse(b: Battle, c: AttackCtx, mult: number, onlyCrit = false): boolean {
  if (c.offhand || (c.kind !== "hit" && c.kind !== "crit") || (onlyCrit && c.kind !== "crit")) return false;
  const a = c.attacker;
  const id = Object.keys(a.items).find(k => (a.items[k] ?? 0) > 0 && getItem(k).kind === "curse");
  if (!id) return false;
  a.items[id]--;
  a.persist[`eat_${id}`] = (a.persist[`eat_${id}`] ?? 0) + 1;
  c.bonus += Math.round(damageOf(a) * mult);
  log(b, `🕳️ It devours ${getItem(id).name}!`);
  b.fx.push({ who: c.defender.id, kind: "reaction", text: "Curse devoured!" });
  return true;
}
export const CURSE_EATERS: GearBase[] = [
  ep({ kind: "weapon", slot: "main", id: "ce_cursebreaker", name: "Cursebreaker Greatsword", tags: ["Hex", "Strike", "Kill"], damage: 11, twoHanded: true, faces: [MISS, HIT, HIT, HIT, CRIT, CRIT],
    text: "Curse-Eater. Two-handed. Each Hit or Crit devours one of your curses (gone for good) and deals +300% damage. No curses, no bonus.", hooks: { modifyAttack: (b, c) => { eatCurse(b, c, 3); } } }),
  ep({ kind: "weapon", slot: "main", weaponType: "dagger", id: "ce_hexeater", name: "Hexeater Dagger", tags: ["Hex", "Crit"], damage: 5, offDamage: 6, faces: [GRAZE, HIT, HIT, CRIT, CRIT, CRIT],
    text: "Curse-Eater dagger. Crits on 4–6. Each Crit devours one of your curses (gone for good) and deals +400% damage. No curses, no bonus.", hooks: { modifyAttack: (b, c) => { eatCurse(b, c, 4, true); } } }),
  ep({ kind: "weapon", slot: "main", id: "ce_sin_devourer", name: "Sin-Devourer", tags: ["Hex", "Holy", "Blood"], damage: 8, faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    text: "Holy Curse-Eater. Each Hit or Crit devours one of your curses (gone for good), deals +250% damage and heals you 10% of your Max HP. No curses, no bonus.",
    hooks: { modifyAttack: (b, c) => { if (eatCurse(b, c, 2.5)) heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.1), "Sin-Devourer"); } } })
];

// ---------- Cursed wands, one-handed weapons and staffs ----------
export const CURSED_CASTERS: GearBase[] = [
  ep({ kind: "weapon", slot: "main", id: "cu_hexwood_wand", name: "Hexwood Wand", tags: ["Hex", "Arcane"], damage: 3, offDamage: 3,
    faces: [GRAZE, cast("Hex", "hit", hex("weak", 1)), HIT, cast("Curse Bolt", "hit", hex("exposed", 2)), HIT, cast("Malediction", "crit", hex("doom", 3))],
    text: "Wand; works in the off-hand. Statuses you apply get +1 stack for every curse you carry.",
    hooks: { onStatusApplied: (_b, self, t, s) => { const c = self.persist["curseCount"] ?? 0; if (c && t !== self && st(t, s) > 0) t.statuses[s] = st(t, s) + c; } } }),
  ep({ kind: "weapon", slot: "main", id: "cu_wand_woe", name: "Wand of Woe", tags: ["Hex", "Arcane"], damage: 3, offDamage: 3,
    faces: [GRAZE, cast("Woe", "hit", hex("weak", 2)), HIT, cast("Woe", "hit", hex("weak", 2)), cast("Sorrow", "crit", hex("exposed", 2)), CRIT],
    text: "Wand; works in the off-hand. Spell Amp +20% for every curse you carry.", hooks: { stats: stat((s, c) => { s.spellAmp += 20 * c; }) } }),
  ep({ kind: "weapon", slot: "main", id: "cu_accursed_falchion", name: "Accursed Falchion", tags: ["Hex", "Crit", "Strike"], damage: 7, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: "One-handed. Crits on 5 and 6. +6% Crit chance for every curse you carry.", hooks: { stats: stat((s, c) => { s.critChance += 6 * c; }) } }),
  ep({ kind: "weapon", slot: "main", id: "cu_hexbite_hatchet", name: "Hexbite Hatchet", tags: ["Hex", "Strike"], damage: 7, faces: PLAIN,
    text: "One-handed axe. Its hits apply 1 Weak for every curse you carry.",
    hooks: { onHit: (b: Battle, c: AttackCtx) => { const n = c.attacker.persist["curseCount"] ?? 0; if (!c.offhand && n) applyStatus(b, c.attacker, c.defender, "weak", n); } } }),
  ep({ kind: "weapon", slot: "main", id: "cu_staff_ill_omen", name: "Staff of Ill Omen", tags: ["Hex", "Arcane"], damage: 5,
    faces: [cast("Omen", "graze", hex("weak", 2)), cast("Hex Bolt", "hit", hex("exposed", 2)), HIT, cast("Hex Bolt", "hit", hex("exposed", 2)), cast("Doom Bolt", "crit", hex("doom", 3)), cast("Ruin", "crit", hex("doom", 5))],
    text: "Staff. Hex spells. Spell Amp +15% for every curse you carry.", hooks: { stats: stat((s, c) => { s.spellAmp += 15 * c; }) } }),
  // Curse-Eaters
  ep({ kind: "weapon", slot: "main", id: "ce_malison_greatstaff", name: "Malison Greatstaff", tags: ["Hex", "Arcane"], damage: 7, twoHanded: true,
    faces: [cast("Hex", "graze", hex("weak", 2)), cast("Devour", "hit", hex("exposed", 2)), HIT, cast("Devour", "hit", hex("exposed", 2)), cast("Unbind", "crit", hex("doom", 4)), cast("Unmake", "crit", hex("doom", 6))],
    text: "Curse-Eater greatstaff. Two-handed. Each Hit or Crit devours one of your curses (gone for good) and deals +350% damage. No curses, no bonus.", hooks: { modifyAttack: (b, c) => { eatCurse(b, c, 3.5); } } }),
  ep({ kind: "weapon", slot: "main", id: "ce_wand_unbinding", name: "Wand of Unbinding", tags: ["Hex", "Arcane", "Crit"], damage: 4, offDamage: 4,
    faces: [GRAZE, cast("Unbind", "hit", hex("weak", 1)), HIT, cast("Unbind", "hit", hex("weak", 1)), CRIT, cast("Release", "crit", hex("exposed", 3))],
    text: "Curse-Eater wand; works in the off-hand. Each Crit devours one of your curses (gone for good) and deals +300% damage. No curses, no bonus.", hooks: { modifyAttack: (b, c) => { eatCurse(b, c, 3, true); } } })
];
