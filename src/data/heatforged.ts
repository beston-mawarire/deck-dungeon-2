// Heatforged gear: only drops in Campaign runs played at Heat 1 or more (the strongest pieces need Heat 3 or 5).
// Fire-and-risk items that reward playing hot. Normal drop odds for their rarity, once the Heat is high enough.
import type { AttackCtx, Battle, GearBase } from "../engine/types";
import { applyStatus, CRIT, GRAZE, HIT, log, other, st } from "./helpers";

const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const W = { kind: "weapon" as const, slot: "main" as const };
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };
/** A Heatforged piece: one rarity only, and only at this Heat or more. */
const hf = (heatMin: number, onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity" | "heatMin">): GearBase => ({ ...d, onlyRarity, heatMin });
const burns = (n: number) => (b: Battle, c: AttackCtx) => { if (!c.offhand) applyStatus(b, c.attacker, c.defender, "burn", n); };
/** Your hits on a Burning enemy deal +n. */
const vsBurning = (n: number) => (b: Battle, c: AttackCtx) => { if (c.attacker === b.player && st(c.defender, "burn") > 0) c.bonus += n; };

export const HEAT_GEAR: GearBase[] = [
  // ---------- Heat 1 ----------
  hf(1, "common", { ...W, id: "hf_branding_iron", name: "Branding Iron", tags: ["Burn", "Strike"], damage: 4, faces: PLAIN,
    text: "Heatforged. Its Hits apply 2 Burn.", hooks: { onHit: burns(2) } }),
  hf(1, "uncommon", { ...O, id: "hf_bellows", name: "Forge Bellows", tags: ["Burn", "Tempo"],
    text: "Heatforged. Each round, a Burning enemy's Burn grows by 2.", hooks: { onRoundStart: (b, f) => { const e = other(b, f); if (st(e, "burn") > 0) applyStatus(b, f, e, "burn", 2); } } }),
  hf(1, "uncommon", { ...A, id: "hf_ashen_cloak", name: "Ashen Cloak", tags: ["Burn", "Guard"], armor: 1,
    text: "Heatforged. Light: +1 Armor. When you're hit, the attacker gets 2 Burn.", hooks: { whenHit: (b, c) => { if (c.dealt > 0) applyStatus(b, c.defender, c.attacker, "burn", 2); } } }),
  hf(1, "uncommon", { ...T, id: "hf_tinderbox", name: "Tinderbox Charm", tags: ["Burn", "Strike"],
    text: "Heatforged. Your hits on Burning enemies deal +2.", hooks: { modifyAttack: vsBurning(2) } }),
  hf(1, "rare", { ...W, id: "hf_cinderblade", name: "Cinderblade", tags: ["Burn", "Crit"], damage: 7, faces: PLAIN,
    text: "Heatforged. Its Hits apply 2 Burn and deal +2 to Burning enemies.", hooks: { onHit: burns(2), modifyAttack: vsBurning(2) } }),
  hf(1, "rare", { ...T, id: "hf_coal_heart", name: "Coal Heart", tags: ["Burn", "Blood"], maxHp: 6,
    text: "Heatforged. +6 Max HP. Start each fight with 2 Might.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "might", 2) } }),
  // ---------- Heat 3 ----------
  hf(3, "rare", { ...O, id: "hf_ember_lantern", name: "Ember Lantern", tags: ["Burn"],
    text: "Heatforged (Heat 3+). Start each fight: the enemy gets 6 Burn.", hooks: { onFightStart: (b, f) => applyStatus(b, f, other(b, f), "burn", 6) } }),
  hf(3, "rare", { ...A, id: "hf_cinderweave", name: "Cinderweave Robe", tags: ["Burn", "Hex"], armor: 2,
    text: "Heatforged (Heat 3+). Light: +2 Armor. Status damage +40%.", hooks: { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 40; } } }),
  hf(3, "epic", { ...W, id: "hf_magma_maul", name: "Magma Maul", tags: ["Burn", "Strike"], damage: 12, twoHanded: true, faces: PLAIN,
    text: "Heatforged (Heat 3+). Two-handed. Every Hit applies 3 Burn; Hits on Burning enemies deal +3.", hooks: { onHit: burns(3), modifyAttack: vsBurning(3) } }),
  hf(3, "epic", { ...A, id: "hf_furnace_plate", name: "Furnace Plate", tags: ["Burn", "Guard"], armor: 6, maxHp: 6,
    text: "Heatforged (Heat 3+). Heavy: +6 Armor and +6 Max HP. When you Guard, the enemy gets 4 Burn.", hooks: { onGuard: (b, f) => applyStatus(b, f, other(b, f), "burn", 4) } }),
  hf(3, "epic", { ...T, id: "hf_phoenix_feather", name: "Phoenix Feather", tags: ["Burn", "Guard"],
    text: "Heatforged (Heat 3+). Once per fight, a hit that would drop you to 0 leaves you at 1 HP, and the attacker gets 6 Burn.",
    hooks: { whenHit: (b, c) => { const d = c.defender; if (d.hp <= 0 && !d.flags["dead"] && !d.flags["phoenix"]) { d.flags["phoenix"] = 1; d.hp = 1; applyStatus(b, d, c.attacker, "burn", 6); log(b, "🪶 Phoenix Feather: you rise from the ashes at 1 HP."); } } } }),
  // ---------- Heat 5 ----------
  hf(5, "epic", { ...O, id: "hf_infernal_brazier", name: "Infernal Brazier", tags: ["Burn", "Strike"],
    text: "Heatforged (Heat 5). You deal 30% more damage to Burning enemies.", hooks: { modifyAttack: (b, c) => { if (c.attacker === b.player && st(c.defender, "burn") > 0) c.mult *= 1.3; } } })
];

export const HEAT_LEGENDARIES: GearBase[] = [
  { ...T, id: "lx_crown_of_embers", rarity: "legendary", heatMin: 3, name: "Crown of Embers", tags: ["Burn", "Strike"],
    legendary: { minFloor: 3, asBase: "t_ring_might", reveal: "Heatforged (Heat 3+). Your hits apply 3 Burn and deal extra damage equal to the enemy's Burn (up to 8)." },
    text: "Heavy as a forge, and twice as hot.",
    hooks: { onHit: burns(3), modifyAttack: (b, c) => { if (c.attacker === b.player) c.bonus += Math.min(8, st(c.defender, "burn")); } } },
  { ...W, id: "lx_hearthfall", rarity: "legendary", heatMin: 5, name: "Hearthfall", tags: ["Burn", "Kill", "Strike"], damage: 14, twoHanded: true, faces: PLAIN,
    legendary: { minFloor: 4, asBase: "w_sword", reveal: "Heatforged (Heat 5). Two-handed. Every Hit applies 3 Burn. When you kill a Burning enemy, its Burn carries over: the next foe starts with it." },
    text: "It was a hearthstone once. Then the house burned down.",
    hooks: {
      onHit: burns(3),
      onKill: (b, c) => { const n = st(c.defender, "burn"); if (n > 0) c.attacker.persist["hearthBurn"] = n; },
      onFightStart: (b, f) => { const n = f.persist["hearthBurn"] ?? 0; if (n > 0) { delete f.persist["hearthBurn"]; applyStatus(b, f, other(b, f), "burn", n); log(b, `🔥 Hearthfall: the last fire spreads (${n} Burn).`); } }
    } }
];
