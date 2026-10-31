// Consecration gear. How long it lasts depends on the item's rarity:
// Common/Uncommon 1 round, Rare 2, Epic 3, Legendary the whole fight.
import { CONSECRATE_FIGHT } from "../engine/statuses";
import type { AttackCtx, Battle, Fighter, GearBase } from "../engine/types";
import { isUnholy } from "../engine/combat";
import { applyStatus, CRIT, GRAZE, heal, HIT, log, loseHp, on, other, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const consFoe = (n: number) => (b: Battle, c: AttackCtx) => applyStatus(b, c.attacker, c.defender, "consecrated", n);
const consSelf = (b: Battle, f: Fighter, n: number) => applyStatus(b, f, f, "consecrated", n);

export const CONSECRATE_GEAR: GearBase[] = [
  // Common: 1 round
  only("common", { kind: "weapon", slot: "main", id: "cs_chapel_mace", name: "Chapel Mace", tags: ["Holy", "Strike"], damage: 4, faces: PLAIN,
    text: "Holy. On a 6: Consecrate the enemy for 1 round.", hooks: { face: [on(6, consFoe(1))] } }),
  only("common", { kind: "trinket", slot: "trinket", id: "cs_votive_candle", name: "Votive Candle", tags: ["Holy"],
    text: "Start every fight Consecrated for 1 round (your Holy weapons deal 30% more).", hooks: { onFightStart: (b, f) => consSelf(b, f, 1) } }),
  // Uncommon: 1 round
  only("uncommon", { kind: "off", slot: "off", id: "cs_rite_censer", name: "Censer of Rites", tags: ["Holy", "Hex"],
    text: "Holy. On a 2 or a 5: Consecrate the enemy for 1 round.", hooks: { face: [on(2, consFoe(1)), on(5, consFoe(1))] } }),
  only("uncommon", { kind: "armour", slot: "armour", id: "cs_acolyte_vest", name: "Acolyte's Vestments", tags: ["Holy", "Guard"], armor: 1,
    text: "Light: +1 Armor. Guarding Consecrates you for 1 round.", hooks: { onGuard: (b, f) => consSelf(b, f, 1) } }),
  // Rare: 2 rounds
  only("rare", { kind: "weapon", slot: "main", id: "cs_sanctified_greatsword", name: "Sanctified Greatsword", tags: ["Holy", "Strike", "Crit"], damage: 8, twoHanded: true, faces: PLAIN,
    text: "Holy. Two-handed. Crits Consecrate the enemy for 2 rounds.", hooks: { onCrit: consFoe(2) } }),
  only("rare", { kind: "off", slot: "off", shield: true, id: "cs_vow_bulwark", name: "Bulwark of Vows", tags: ["Holy", "Guard"], armor: 3,
    text: "Holy shield. +3 Armor. Guarding Consecrates you for 2 rounds.", hooks: { onGuard: (b, f) => consSelf(b, f, 2) } }),
  only("rare", { kind: "trinket", slot: "trinket", id: "cs_pilgrim_badge", name: "Pilgrim's Badge", tags: ["Holy", "Guard"],
    text: "When your Ward stops a status, Consecrate the enemy for 2 rounds.", hooks: { onWard: (b, f) => applyStatus(b, f, other(b, f), "consecrated", 2) } }),
  // Epic: 3 rounds
  only("epic", { kind: "weapon", slot: "main", id: "cs_dawnbreaker", name: "Dawnbreaker", tags: ["Holy", "Strike", "Burn"], damage: 9, faces: PLAIN,
    text: "Holy. Every hit Consecrates the enemy for 3 rounds.", hooks: { onHit: (b, c) => { if (!c.offhand) consFoe(3)(b, c); } } }),
  only("epic", { kind: "armour", slot: "armour", id: "cs_seventh_seal", name: "Plate of the Seventh Seal", tags: ["Holy", "Guard"], armor: 6,
    text: "Heavy: +6 Armor. Start every fight Consecrated for 3 rounds, and Consecrate the enemy for 3.", hooks: { onFightStart: (b, f) => { consSelf(b, f, 3); applyStatus(b, f, other(b, f), "consecrated", 3); } } })
];

/** Legendary: the whole fight. */
export const CONSECRATE_LEGENDARIES: GearBase[] = [
  { kind: "trinket", slot: "trinket", id: "lx_saint_halo", rarity: "legendary", name: "Halo of the Last Saint", tags: ["Holy", "Guard"],
    legendary: { minFloor: 3, asBase: "t_brass_amulet", reveal: "Every fight, you and the enemy are Consecrated for the whole fight." },
    text: "It still glows for someone who isn't there.",
    hooks: { onFightStart: (b, f) => { consSelf(b, f, CONSECRATE_FIGHT); applyStatus(b, f, other(b, f), "consecrated", CONSECRATE_FIGHT); } } }
];

// ---------- Holy damage without Consecration ----------
/** Holy damage from a non-weapon source: +50% to Unholy foes, +30% for each side that's Consecrated. Ignores Armor. */
export function holyPing(b: Battle, a: Fighter, d: Fighter, n: number, why: string) {
  if (d.hp <= 0) return;
  let dmg = n;
  if (isUnholy(d)) dmg *= 1.5;
  if (st(d, "consecrated") > 0) dmg *= 1.3;
  if (st(a, "consecrated") > 0) dmg *= 1.3;
  const lost = loseHp(b, d, Math.round(dmg));
  log(b, `✝️ ${why}: ${lost} Holy damage.`);
}

export const HOLY_WEAPONS: GearBase[] = [
  only("common", { kind: "weapon", slot: "main", id: "hw_blessed_hammer", name: "Blessed Hammer", tags: ["Holy", "Strike"], damage: 4, faces: PLAIN, text: "Holy. A plain hammer, blessed at a roadside shrine.", hooks: {} }),
  only("uncommon", { kind: "weapon", slot: "main", id: "hw_sunsteel_falchion", name: "Sunsteel Falchion", tags: ["Holy", "Crit"], damage: 5, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Holy. Crits on 5 and 6.", hooks: {} }),
  only("uncommon", { kind: "weapon", slot: "main", id: "hw_prayer_flail", name: "Prayer Flail", tags: ["Holy", "Blood"], damage: 4, faces: PLAIN, text: "Holy. Its hits heal you 1.",
    hooks: { onHit: (b, c) => { if (!c.offhand) heal(b, c.attacker, 1, "Prayer Flail"); } } }),
  only("rare", { kind: "weapon", slot: "main", id: "hw_lightbringer", name: "Lightbringer", tags: ["Holy", "Strike"], damage: 6, faces: PLAIN, text: "Holy. Its hits deal +3 to Unholy foes (Undead, Crimson, and anything that curses or Dooms).",
    hooks: { modifyAttack: (_b, c) => { if (!c.offhand && isUnholy(c.defender)) c.bonus += 3; } } }),
  only("rare", { kind: "weapon", slot: "main", weaponType: "dagger", id: "hw_silver_stiletto", name: "Silver Stiletto", tags: ["Holy", "Crit", "Tempo"], damage: 3, offDamage: 4, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: "Holy dagger. Crits on 5 and 6. Best in the off-hand: a second, Holy die.", hooks: {} }),
  only("epic", { kind: "weapon", slot: "main", id: "hw_judgement_blade", name: "Blade of Final Judgement", tags: ["Holy", "Crit", "Kill"], damage: 10, twoHanded: true, faces: PLAIN,
    text: "Holy. Two-handed. Crits also deal 8% of the enemy's Max HP as Holy damage.", hooks: { onCrit: (b, c) => holyPing(b, c.attacker, c.defender, Math.ceil(c.defender.maxHp * 0.08), "Final Judgement") } })
];

export const HOLY_OFFHANDS: GearBase[] = [
  only("common", { kind: "off", slot: "off", id: "ho_wooden_icon", name: "Wooden Icon", tags: ["Holy"], text: "On a 6: deal 2 Holy damage.",
    hooks: { face: [on(6, (b, c) => holyPing(b, c.attacker, c.defender, 2, "Wooden Icon"))] } }),
  only("uncommon", { kind: "weapon", slot: "main", weaponType: "throwing", id: "ho_blessed_knives", name: "Blessed Throwing Knives", tags: ["Holy", "Crit", "Tempo"], damage: 2, offDamage: 3, faces: PLAIN,
    text: "Holy. Best in the off-hand: a second, Holy die.", hooks: {} }),
  only("rare", { kind: "off", slot: "off", id: "ho_radiant_orb", name: "Radiant Orb", tags: ["Holy", "Arcane"], text: "On a 4 or a 6: deal 4 Holy damage.",
    hooks: { face: [on(4, (b, c) => holyPing(b, c.attacker, c.defender, 4, "Radiant Orb")), on(6, (b, c) => holyPing(b, c.attacker, c.defender, 4, "Radiant Orb"))] } }),
  only("rare", { kind: "off", slot: "off", shield: true, id: "ho_sunburst_shield", name: "Sunburst Shield", tags: ["Holy", "Guard"], armor: 3, text: "Holy shield. +3 Armor. Guarding deals 5 Holy damage to the enemy.",
    hooks: { onGuard: (b, f) => holyPing(b, f, other(b, f), 5, "Sunburst Shield") } }),
  only("epic", { kind: "off", slot: "off", id: "ho_light_reliquary", name: "Reliquary of Light", tags: ["Holy", "Blood"], text: "Holy. At the start of every round, deal 4 Holy damage to the enemy and heal 2.",
    hooks: { onRoundStart: (b, f) => { holyPing(b, f, other(b, f), 4, "Reliquary of Light"); heal(b, f, 2, "Reliquary of Light"); } } })
];
