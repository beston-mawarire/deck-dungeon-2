// The Ice Forge: gear that piles on Chill so Frostbitten (6+ Chill bursts) becomes a real build.
// Three per category (Rare, Epic, Legendary): swords, daggers, one-handed axes, staffs, greatstaffs, wands, trinkets, off-hands.
import type { AttackCtx, Battle, GearBase } from "../engine/types";
import { applyStatus, cast, CRIT, GRAZE, heal, hex, HIT, on, other, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity, weight: 2 });
const leg = (asBase: string, reveal: string, d: Omit<GearBase, "rarity" | "legendary">): GearBase => ({ ...d, rarity: "legendary", legendary: { minFloor: 3, asBase, reveal } });
const W = { kind: "weapon" as const, slot: "main" as const };
const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const chillHit = (n: number) => (b: Battle, c: AttackCtx) => applyStatus(b, c.attacker, c.defender, "chill", n);
const moreChill = (k: number) => (_b: Battle, self: Parameters<typeof other>[1], t: Parameters<typeof other>[1], s: string) => { if (s === "chill" && t !== self) t.statuses.chill = st(t, "chill") + k; };

export const ICE_FORGE: GearBase[] = [
  // Swords
  only("rare", { ...W, id: "if_rimeblade", name: "Rimeblade of the Ice Forge", tags: ["Frost", "Strike"], damage: 6, faces: PLAIN, text: "Its hits apply 3 Chill.", hooks: { onHit: (b, c) => { if (!c.offhand) chillHit(3)(b, c); } } }),
  only("epic", { ...W, id: "if_glacier_edge", name: "Glacier Edge of the Ice Forge", tags: ["Frost", "Strike", "Crit"], damage: 8, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Crits on 5 and 6. Its hits apply 3 Chill; its Crits apply 6.",
    hooks: { onHit: (b, c) => { if (!c.offhand) chillHit(c.kind === "crit" ? 6 : 3)(b, c); } } }),
  // Daggers
  only("rare", { ...W, weaponType: "dagger", id: "if_icicle_shiv", name: "Icicle Shiv of the Ice Forge", tags: ["Frost", "Crit"], damage: 3, offDamage: 4, faces: PLAIN, text: "Dagger. Its hits apply 2 Chill, in either hand.", hooks: { onHit: chillHit(2) } }),
  only("epic", { ...W, weaponType: "dagger", id: "if_frostbite_fang", name: "Frostbite Fang of the Ice Forge", tags: ["Frost", "Crit"], damage: 4, offDamage: 5, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: "Dagger. Crits on 5 and 6. Hits apply 2 Chill; Crits apply 5.", hooks: { onHit: (b, c) => chillHit(c.kind === "crit" ? 5 : 2)(b, c) } }),
  // One-handed axes
  only("rare", { ...W, id: "if_frost_hatchet", name: "Frost Hatchet of the Ice Forge", tags: ["Frost", "Strike", "Kill"], damage: 6, faces: PLAIN, text: "One-handed axe. Hits apply 2 Chill and deal +2 to Chilled enemies.",
    hooks: { onHit: (b, c) => { if (!c.offhand) chillHit(2)(b, c); }, modifyAttack: (_b, c) => { if (!c.offhand && st(c.defender, "chill") > 0) c.bonus += 2; } } }),
  only("epic", { ...W, id: "if_rime_cleaver", name: "Rime Cleaver of the Ice Forge", tags: ["Frost", "Strike", "Kill"], damage: 9, faces: PLAIN, text: "One-handed axe. Its hits apply 4 Chill.", hooks: { onHit: (b, c) => { if (!c.offhand) chillHit(4)(b, c); } } }),
  // One-handed staffs
  only("rare", { ...W, id: "if_frostwood_staff", name: "Frostwood Staff of the Ice Forge", tags: ["Frost", "Arcane"], damage: 4,
    faces: [GRAZE, cast("Frost Bolt", "hit", hex("chill", 3)), HIT, cast("Frost Bolt", "hit", hex("chill", 3)), HIT, cast("Ice Spear", "crit", hex("chill", 4))], text: "Staff. Frost spells on 2, 4 and 6.", hooks: {} }),
  only("epic", { ...W, id: "if_hoarfrost_staff", name: "Staff of Hoarfrost of the Ice Forge", tags: ["Frost", "Arcane"], damage: 5,
    faces: [cast("Rime", "graze", hex("chill", 2)), cast("Frost Bolt", "hit", hex("chill", 4)), HIT, cast("Frost Bolt", "hit", hex("chill", 4)), cast("Ice Spear", "crit", hex("chill", 5)), cast("Glacier", "crit", hex("chill", 6))], text: "Staff. Frost on five faces.", hooks: {} }),
  // Two-handed staffs
  only("rare", { ...W, id: "if_glacial_greatstaff", name: "Glacial Greatstaff of the Ice Forge", tags: ["Frost", "Arcane"], damage: 6, twoHanded: true,
    faces: [cast("Rime", "graze", hex("chill", 3)), cast("Frost Lance", "hit", hex("chill", 4)), HIT, cast("Frost Lance", "hit", hex("chill", 4)), cast("Ice Spear", "crit", hex("chill", 5)), CRIT], text: "Two-handed. Big frost spells.", hooks: {} }),
  only("epic", { ...W, id: "if_blizzard_pillar", name: "Blizzard Pillar of the Ice Forge", tags: ["Frost", "Arcane"], damage: 8, twoHanded: true,
    faces: [cast("Sleet", "graze", hex("chill", 4)), cast("Blizzard", "hit", hex("chill", 6)), cast("Blizzard", "hit", hex("chill", 6)), HIT, cast("Ice Spear", "crit", hex("chill", 6)), cast("Absolute Zero", "crit", hex("chill", 8))],
    text: "Two-handed. Spell Amp +15%. Blizzards on almost every face.", hooks: { stats: s => { s.spellAmp += 15; } } }),
  // Wands
  only("rare", { ...W, id: "if_frost_wand", name: "Frost Wand of the Ice Forge", tags: ["Frost", "Arcane"], damage: 2, offDamage: 2,
    faces: [GRAZE, cast("Chill", "hit", hex("chill", 2)), HIT, cast("Chill", "hit", hex("chill", 3)), HIT, cast("Ice Shard", "crit", hex("chill", 3))], text: "Wand; works in the off-hand. Frost spells.", hooks: {} }),
  only("epic", { ...W, id: "if_wand_rime", name: "Wand of Rime of the Ice Forge", tags: ["Frost", "Arcane"], damage: 3, offDamage: 3,
    faces: [cast("Chill", "graze", hex("chill", 2)), cast("Rime", "hit", hex("chill", 4)), HIT, cast("Rime", "hit", hex("chill", 4)), cast("Ice Shard", "crit", hex("chill", 4)), cast("Hailstorm", "crit", hex("chill", 5))], text: "Wand; works in the off-hand. Frost on five faces.", hooks: {} }),
  // Trinkets
  only("rare", { kind: "trinket", slot: "trinket", id: "if_frostbite_charm", name: "Frostbite Charm of the Ice Forge", tags: ["Frost"], text: "Chill you apply gets +1.", hooks: { onStatusApplied: moreChill(1) } }),
  only("epic", { kind: "trinket", slot: "trinket", id: "if_rime_heart", name: "Rime Heart of the Ice Forge", tags: ["Frost"], text: "Chill you apply gets +2. The enemy starts every fight with 3 Chill.",
    hooks: { onStatusApplied: moreChill(2), onFightStart: (b, f) => applyStatus(b, f, other(b, f), "chill", 3) } }),
  // Off-hands
  only("rare", { kind: "off", slot: "off", barrierElement: "chill", id: "if_frost_ward", name: "Frost Ward of the Ice Forge", tags: ["Frost", "Arcane", "Guard"], text: "Elemental Barrier (Chill). On a 2 or a 4: apply 3 Chill.",
    hooks: { face: [on(2, hex("chill", 3)), on(4, hex("chill", 3))] } }),
  only("epic", { kind: "off", slot: "off", shield: true, id: "if_glacier_shield", name: "Glacier Shield of the Ice Forge", tags: ["Frost", "Guard"], armor: 3, text: "Shield. +3 Armor. Guarding applies 4 Chill to the enemy. Anything that hits you gets 2 Chill.",
    hooks: { onGuard: (b, f) => applyStatus(b, f, other(b, f), "chill", 4), whenHit: (b, c) => { if (!c.noDamage && c.attacker.hp > 0) applyStatus(b, c.defender, c.attacker, "chill", 2); } } })
];

export const ICE_FORGE_LEGENDARIES: GearBase[] = [
  leg("w_sword", "Hits apply 4 Chill. Your reactions and bursts (Frostbitten included) deal double.", { ...W, id: "lx_winters_verdict", name: "Winter's Verdict of the Ice Forge", tags: ["Frost", "Strike"], damage: 9, faces: PLAIN,
    text: "Cold justice.", hooks: { onHit: (b, c) => { if (!c.offhand) chillHit(4)(b, c); }, reactionMult: () => 2 } }),
  leg("w_dagger", "Dagger. Hits apply 3 Chill, and Chill on the enemy never wears off.", { ...W, weaponType: "dagger", id: "lx_nevermelt", name: "Shard of Nevermelt of the Ice Forge", tags: ["Frost", "Crit"], damage: 5, offDamage: 6, faces: PLAIN,
    text: "It was cold before the world was.", hooks: { onHit: chillHit(3), onRoundStart: (b, f) => { other(b, f).flags["chillNoFade"] = 1; } } }),
  leg("w_mace", "One-handed axe. Hits apply 5 Chill, and deal +4 to Chilled enemies.", { ...W, id: "lx_avalanche", name: "Avalanche of the Ice Forge", tags: ["Frost", "Strike", "Kill"], damage: 10, faces: PLAIN,
    text: "First a crack. Then the mountain.", hooks: { onHit: (b, c) => { if (!c.offhand) chillHit(5)(b, c); }, modifyAttack: (_b, c) => { if (!c.offhand && st(c.defender, "chill") > 0) c.bonus += 4; } } }),
  leg("w_staff", "Staff. Every face casts Chill (3 to 7).", { ...W, id: "lx_polar_scepter", name: "Polar Scepter of the Ice Forge", tags: ["Frost", "Arcane"], damage: 6,
    faces: [cast("Frost", "hit", hex("chill", 3)), cast("Frost", "hit", hex("chill", 4)), cast("Rime", "hit", hex("chill", 4)), cast("Ice Spear", "crit", hex("chill", 5)), cast("Glacier", "crit", hex("chill", 6)), cast("Polar Night", "crit", hex("chill", 7))],
    text: "The north, held in one hand.", hooks: {} }),
  leg("w_greatstaff", "Two-handed. Every face casts 6 Chill. Your reactions and bursts deal +75%.", { ...W, id: "lx_heart_of_winter", name: "Heart of Winter of the Ice Forge", tags: ["Frost", "Arcane"], damage: 9, twoHanded: true,
    faces: [cast("Winter", "hit", hex("chill", 6)), cast("Winter", "hit", hex("chill", 6)), cast("Winter", "hit", hex("chill", 6)), cast("Winter", "crit", hex("chill", 6)), cast("Winter", "crit", hex("chill", 6)), cast("Long Night", "crit", hex("chill", 6))],
    text: "It beats once a year.", hooks: { reactionMult: () => 1.75 } }),
  leg("w_wand", "Wand; works in the off-hand. Spells apply 5 Chill, and Chill you apply gets +1.", { ...W, id: "lx_long_winter", name: "Wand of the Long Winter of the Ice Forge", tags: ["Frost", "Arcane"], damage: 4, offDamage: 4,
    faces: [cast("Chill", "graze", hex("chill", 5)), cast("Chill", "hit", hex("chill", 5)), HIT, cast("Chill", "hit", hex("chill", 5)), cast("Hail", "crit", hex("chill", 5)), cast("Long Winter", "crit", hex("chill", 5))],
    text: "Spring isn't coming.", hooks: { onStatusApplied: moreChill(1) } }),
  leg("t_brass_amulet", "Chill you apply is doubled.", { kind: "trinket", slot: "trinket", id: "lx_ice_crown", name: "Crown of the Ice Forge", tags: ["Frost"],
    text: "Forged at the coldest anvil there is.", hooks: { onStatusApplied: (_b, self, t, s, n) => { if (s === "chill" && t !== self) t.statuses.chill = st(t, "chill") + n; } } }),
  leg("o_frost_orb", "Elemental Barrier (Chill). Every round the enemy gains 3 Chill. Each Frostbitten burst heals you 5.", { kind: "off", slot: "off", barrierElement: "chill", id: "lx_endless_winter_mirror", name: "Mirror of Endless Winter of the Ice Forge", tags: ["Frost", "Arcane"],
    text: "Your reflection's breath fogs the glass.", hooks: { onRoundStart: (b, f) => applyStatus(b, f, other(b, f), "chill", 3),
      onStatusApplied: (b, self, t, s) => { if (s === "chill" && t !== self && st(t, "chill") === 0) heal(b, self, 5, "Endless Winter"); } } })
];
