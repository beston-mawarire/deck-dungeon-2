// Consecration gear. How long it lasts depends on the item's rarity:
// Common/Uncommon 1 round, Rare 2, Epic 3, Legendary the whole fight.
import { CONSECRATE_FIGHT } from "../engine/statuses";
import type { AttackCtx, Battle, Fighter, GearBase } from "../engine/types";
import { applyStatus, CRIT, GRAZE, HIT, on, other } from "./helpers";

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
