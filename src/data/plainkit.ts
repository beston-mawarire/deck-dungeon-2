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
