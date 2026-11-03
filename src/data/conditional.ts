// Legendaries that only enter the pool once something has happened in the run (kept hidden from the player):
// the Snake Eyes family, once you've rolled enough 1s; the ... of the Talentless, once you've turned a talent down and hold none.
import type { AttackCtx, Battle, Fighter, GearBase } from "../engine/types";
import { applyStatus, CRIT, heal, HIT } from "./helpers";

const leg = (unlock: GearBase["unlock"], asBase: string, reveal: string, d: Omit<GearBase, "rarity" | "legendary" | "unlock">): GearBase =>
  ({ ...d, unlock, rarity: "legendary", legendary: { minFloor: 1, asBase, reveal } });
const W = { kind: "weapon" as const, slot: "main" as const };
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };
const mine = (b: Battle, c: AttackCtx) => c.attacker === b.player;
/** Talents turned down, while holding none (0 once you take one). */
const skipped = (f: Fighter) => ((f.persist["talentCount"] ?? 0) > 0 ? 0 : f.persist["talentsSkipped"] ?? 0);

export const CONDITIONAL_LEGENDARIES: GearBase[] = [
  // ---------- Snake Eyes ----------
  leg("snake", "w_sword", "Your 1s are Crits, and they deal 50% more.", { ...W, id: "lx_snake_eyes", name: "Snake Eyes", tags: ["Crit", "Luck"], damage: 8,
    faces: [{ kind: "crit", name: "Snake Eyes" }, HIT, HIT, HIT, HIT, CRIT],
    text: "Two little eyes, both looking at you.",
    hooks: { modifyAttack: (b, c) => { if (mine(b, c) && !c.offhand && c.face === 1) c.mult *= 1.5; } } }),
  leg("snake", "o_tome", "Every 1 you roll gives you 2 Might and the enemy 3 Poison.", { ...O, id: "lx_serpent_coil", name: "The Serpent's Coil", tags: ["Luck", "Poison"],
    text: "It tightens a little every time you're unlucky.",
    hooks: { onRollOne: (b, f) => { applyStatus(b, f, f, "might", 2); applyStatus(b, f, b.enemy, "poison", 3); } } }),
  leg("snake", "a_leather", "Every 1 you roll heals 6% of your Max HP and gives 4 Barrier.", { ...A, id: "lx_viper_skin", name: "Viperskin Jerkin", tags: ["Luck", "Blood"], armor: 3,
    text: "Shed by something that never once had a good day.",
    hooks: { onRollOne: (b, f) => { heal(b, f, Math.ceil(f.maxHp * 0.06), "Viperskin Jerkin"); applyStatus(b, f, f, "barrier", 4); } } }),
  leg("snake", "t_brass_amulet", "Each 1 you roll this fight makes your hits deal +2 (up to +16).", { ...T, id: "lx_eye_of_snake", name: "Eye of the Snake", tags: ["Luck", "Strike"],
    text: "It doesn't blink. It doesn't need to.",
    hooks: { onRollOne: (_b, f) => { f.flags["snakeOnes"] = (f.flags["snakeOnes"] ?? 0) + 1; }, modifyAttack: (b, c) => { if (mine(b, c)) c.bonus += Math.min(16, 2 * (c.attacker.flags["snakeOnes"] ?? 0)); } } }),

  // ---------- ... of the Talentless ----------
  leg("talentless", "w_axe", "While you hold no talents, your hits deal +3 for every talent you've turned down (up to +24).", { ...W, id: "lx_edge_talentless", name: "Edge of the Talentless", tags: ["Strike"], damage: 9,
    faces: [HIT, HIT, HIT, HIT, HIT, CRIT],
    text: "Nobody taught it anything. It learned anyway.",
    hooks: { modifyAttack: (b, c) => { if (mine(b, c)) c.bonus += Math.min(24, 3 * skipped(c.attacker)); } } }),
  leg("talentless", "o_wooden_shield", "Shield. While you hold no talents, +2 Armor for every talent you've turned down (up to +16).", { ...O, id: "lx_aegis_talentless", name: "Aegis of the Talentless", shield: true, tags: ["Guard"], armor: 2,
    text: "Plain wood, no crest. It has never needed one.",
    hooks: { stats: (s, _n, f) => { s.armor += Math.min(16, 2 * skipped(f)); } } }),
  leg("talentless", "a_cloth", "While you hold no talents, +6 Max HP for every talent you've turned down (up to +60), and start each fight with that much Barrier.", { ...A, id: "lx_mantle_talentless", name: "Mantle of the Talentless", tags: ["Guard", "Blood"], armor: 2,
    text: "Woven from every gift its wearer refused.",
    hooks: { stats: (s, _n, f) => { s.maxHp += Math.min(60, 6 * skipped(f)); }, onFightStart: (b, f) => { const n = Math.min(60, 6 * skipped(f)); if (n) applyStatus(b, f, f, "barrier", n); } } }),
  leg("talentless", "t_ring_might", "While you hold no talents, you deal 8% more damage for every talent you've turned down (up to 80%).", { ...T, id: "lx_crown_talentless", name: "Ring of the Talentless", tags: ["Strike"],
    text: "A plain band, for someone who wanted nothing handed to them.",
    hooks: { modifyAttack: (b, c) => { if (mine(b, c)) c.mult *= 1 + Math.min(0.8, 0.08 * skipped(c.attacker)); } } })
];
