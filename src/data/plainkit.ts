// Plain kits: well-made gear with no special effects, just strong numbers (higher than effect gear of the same rarity).
// Four tiers by rarity: Fine (Common), Tempered (Uncommon), Masterwork (Rare), Exalted (Epic). Normal drop odds.
import type { FaceSpec, GearBase } from "../engine/types";
import { CRIT, GRAZE, HIT, MISS } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity" | "hooks"> & { hooks?: GearBase["hooks"] }): GearBase => ({ hooks: {}, ...d, onlyRarity });
const PLAIN: FaceSpec[] = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const HEAVY: FaceSpec[] = [MISS, HIT, HIT, HIT, CRIT, CRIT];
const W = { kind: "weapon" as const, slot: "main" as const };
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };

type Tier = { r: GearBase["onlyRarity"]; p: string; sword: number; great: number; dagger: [number, number]; staff: number; shield: number; shieldHp: number; light: [number, number]; heavy: [number, number]; ring: [number, number, number] };
const TIERS: Tier[] = [
  { r: "common", p: "Fine", sword: 5, great: 7, dagger: [4, 3], staff: 6, shield: 2, shieldHp: 0, light: [1, 4], heavy: [3, 3], ring: [0, 0, 6] },
  { r: "uncommon", p: "Tempered", sword: 6, great: 9, dagger: [5, 4], staff: 8, shield: 3, shieldHp: 3, light: [2, 6], heavy: [4, 5], ring: [1, 0, 6] },
  { r: "rare", p: "Masterwork", sword: 8, great: 12, dagger: [6, 5], staff: 11, shield: 4, shieldHp: 5, light: [3, 8], heavy: [6, 8], ring: [2, 1, 8] },
  { r: "epic", p: "Exalted", sword: 10, great: 15, dagger: [7, 6], staff: 14, shield: 6, shieldHp: 8, light: [4, 10], heavy: [8, 12], ring: [3, 2, 12] }
];
const slug = (t: Tier, k: string) => `pl_${t.r}_${k}`;

export const PLAIN_KITS: GearBase[] = TIERS.flatMap(t => [
  only(t.r, { ...W, id: slug(t, "sword"), name: `${t.p} Longsword`, tags: ["Strike"], damage: t.sword, faces: PLAIN, text: "Sword. Plain, but very well made." }),
  only(t.r, { ...W, id: slug(t, "greatsword"), name: `${t.p} Greatsword`, tags: ["Strike"], damage: t.great, twoHanded: true, heavy: true, faces: HEAVY, text: "Two-handed, Heavy. Plain, but very well made." }),
  only(t.r, { ...W, id: slug(t, "dagger"), name: `${t.p} Dagger`, weaponType: "dagger", tags: ["Crit"], damage: t.dagger[0], offDamage: t.dagger[1], faces: PLAIN, text: "Dagger. Plain, but very well made. Works in the off-hand." }),
  only(t.r, { ...W, id: slug(t, "staff"), name: `${t.p} Quarterstaff`, tags: ["Arcane", "Strike"], damage: t.staff, twoHanded: true, faces: PLAIN, text: "Two-handed staff. Plain, but very well made." }),
  only(t.r, { ...O, id: slug(t, "shield"), name: `${t.p} Heater Shield`, shield: true, tags: ["Guard"], armor: t.shield, maxHp: t.shieldHp || undefined,
    text: `Shield. +${t.shield} Armor${t.shieldHp ? ` and +${t.shieldHp} Max HP` : ""}.` }),
  only(t.r, { ...A, id: slug(t, "leathers"), name: `${t.p} Leathers`, tags: ["Tempo"], armor: t.light[0], text: `Light: +${t.light[0]} Armor, +${t.light[1]}% Dodge.`, hooks: { stats: s => { s.dodge += t.light[1]; } } }),
  only(t.r, { ...A, id: slug(t, "plate"), name: `${t.p} Plate`, tags: ["Guard"], armor: t.heavy[0], maxHp: t.heavy[1], text: `Heavy: +${t.heavy[0]} Armor and +${t.heavy[1]} Max HP.` }),
  only(t.r, { ...T, id: slug(t, "ring"), name: `${t.p} Signet`, tags: ["Strike", "Guard"], armor: t.ring[1] || undefined, maxHp: t.ring[2],
    text: `${t.ring[0] ? `+${t.ring[0]} Damage, ` : ""}${t.ring[1] ? `+${t.ring[1]} Armor, ` : ""}+${t.ring[2]} Max HP.`, hooks: t.ring[0] ? { stats: s => { s.damage += t.ring[0]; } } : {} })
]);

// Plain Legendaries and Crimson items: no tricks at all, just enormous numbers to make up for it.
const leg = (asBase: string, reveal: string, d: Omit<GearBase, "rarity" | "legendary" | "hooks"> & { hooks?: GearBase["hooks"] }, minFloor = 3): GearBase =>
  ({ hooks: {}, ...d, rarity: "legendary", legendary: { minFloor, asBase, reveal } });
export const PLAIN_LEGENDARIES: GearBase[] = [
  leg("w_sword", "No tricks: a sword so well made it simply hits harder than anything else.", { ...W, id: "lp_sovereign_blade", name: "The Sovereign Blade", tags: ["Strike"], damage: 24, faces: PLAIN, text: "A king's sword, and every inch of it earned." }),
  leg("w_axe", "Two-handed, Heavy. No tricks: just a colossal blade.", { ...W, id: "lp_titanfall", name: "Titanfall", tags: ["Strike"], damage: 38, twoHanded: true, heavy: true, faces: HEAVY, text: "It was made to kill something much bigger than you." }, 4),
  leg("w_dagger", "No tricks: the sharpest knife ever made. Works in the off-hand.", { ...W, id: "lp_kingsfang", name: "Kingsfang", weaponType: "dagger", tags: ["Crit"], damage: 16, offDamage: 15, faces: PLAIN, text: "Thin enough to slip between two heartbeats." }),
  leg("o_kite_shield", "Shield. No tricks: +18 Armor and +35 Max HP.", { ...O, id: "lp_unbroken_bulwark", name: "The Unbroken Bulwark", shield: true, tags: ["Guard"], armor: 18, maxHp: 35, text: "It has never been breached. It has been tried." }),
  leg("a_plate", "Heavy. No tricks: +24 Armor and +60 Max HP.", { ...A, id: "lp_aegis_first_king", name: "Aegis of the First King", tags: ["Guard"], armor: 24, maxHp: 60, text: "The first king never fell in battle. He died of boredom." }, 4),
  leg("a_leather", "Light. No tricks: +10 Armor, +20 Max HP and +22% Dodge.", { ...A, id: "lp_windcutter", name: "Windcutter Mantle", tags: ["Tempo"], armor: 10, maxHp: 20, text: "It moves a moment before you do.", hooks: { stats: s => { s.dodge += 22; } } }),
  leg("t_ring_might", "No tricks: +6 Damage, +7 Armor and +60 Max HP.", { ...T, id: "lp_mountain_heart", name: "Heart of the Mountain", tags: ["Strike", "Guard"], armor: 7, maxHp: 60, text: "A stone that beats.", hooks: { stats: s => { s.damage += 6; } } })
];
const crim = (d: Omit<GearBase, "rarity" | "hooks"> & { hooks?: GearBase["hooks"] }): GearBase => ({ hooks: {}, ...d, rarity: "crimson" });
export const PLAIN_CRIMSON: GearBase[] = [
  crim({ ...W, id: "cp_bloodsteel_sabre", name: "Bloodsteel Sabre", tags: ["Strike"], damage: 26, faces: PLAIN, text: "No tricks: Bloodsteel, and a great deal of it." }),
  crim({ ...W, id: "cp_crimson_executioner", name: "The Crimson Executioner", tags: ["Strike"], damage: 44, twoHanded: true, heavy: true, faces: HEAVY, text: "Two-handed, Heavy. No tricks: the heaviest blade in the Red Vaults." }),
  crim({ ...O, id: "cp_crimson_bastion", name: "Crimson Bastion", shield: true, tags: ["Guard"], armor: 20, maxHp: 45, text: "Shield. No tricks: +20 Armor and +45 Max HP." }),
  crim({ ...A, id: "cp_bloodforged_plate", name: "Bloodforged Plate", tags: ["Guard"], armor: 26, maxHp: 70, text: "Heavy. No tricks: +26 Armor and +70 Max HP." }),
  crim({ ...T, id: "cp_crimson_heart", name: "Heart of Crimson", tags: ["Strike", "Blood"], maxHp: 75, text: "No tricks: +8 Damage and +75 Max HP.", hooks: { stats: s => { s.damage += 8; } } })
];
