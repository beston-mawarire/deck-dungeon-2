// More daggers, Uncommon to Legendary. Daggers work in the off-hand too. Normal drop odds for their rarity.
import type { AttackCtx, Battle, GearBase } from "../engine/types";
import { applyStatus, CRIT, gold, GRAZE, heal, HIT, st } from "./helpers";

const DAG = { kind: "weapon" as const, slot: "main" as const, weaponType: "dagger" as const };
const ONE = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const TWO = [GRAZE, HIT, HIT, HIT, CRIT, CRIT];
const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const isToughFoe = (b: Battle, c: AttackCtx) => c.attacker === b.player && !!(c.defender.boss || c.defender.champion || c.defender.elite || c.defender.crimson);

export const MORE_DAGGERS: GearBase[] = [
  // ---------- Uncommon ----------
  only("uncommon", { ...DAG, id: "dg_cutpurse_knife", name: "Cutpurse Knife", tags: ["Crit", "Luck"], damage: 3, offDamage: 3, faces: ONE,
    text: "Dagger. Your crits snatch 3 Gold. Works in the off-hand.", hooks: { onCrit: (b, c) => { if (c.attacker === b.player) gold(b, c.attacker, 3); } } }),
  only("uncommon", { ...DAG, id: "dg_serrated_shiv", name: "Serrated Shiv", tags: ["Bleed", "Strike"], damage: 3, offDamage: 2, faces: ONE,
    text: "Dagger. Its Hits apply 1 Bleed. Works in the off-hand.", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 1) } }),
  only("uncommon", { ...DAG, id: "dg_quickblade", name: "Quickblade", tags: ["Tempo", "Crit"], damage: 2, offDamage: 3, faces: ONE,
    text: "Dagger. +5% Dodge. Works in the off-hand.", hooks: { stats: s => { s.dodge += 5; } } }),
  // ---------- Rare ----------
  only("rare", { ...DAG, id: "dg_moonsilver_dirk", name: "Moonsilver Dirk", tags: ["Crit", "Hex"], damage: 4, offDamage: 4, faces: TWO,
    text: "Dagger. Crits on 5 and 6; your crits apply 2 Exposed. Works in the off-hand.", hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "exposed", 2) } }),
  only("rare", { ...DAG, id: "dg_frostbite_kris", name: "Frostbite Kris", tags: ["Frost", "Crit"], damage: 4, offDamage: 3, faces: ONE,
    text: "Dagger. Its Hits apply 1 Chill and deal +2 to Chilled enemies. Works in the off-hand.",
    hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "chill", 1), modifyAttack: (b, c) => { if (c.attacker === b.player && st(c.defender, "chill") > 0) c.bonus += 2; } } }),
  only("rare", { ...DAG, id: "dg_backstabber", name: "Backstabber", tags: ["Crit", "Kill"], damage: 4, offDamage: 4, faces: ONE,
    text: "Dagger. Your first hit in each fight deals double. Works in the off-hand.",
    hooks: { onFightStart: (_b, f) => { f.flags["backstab"] = 1; }, modifyAttack: (b, c) => { if (c.attacker === b.player && c.attacker.flags["backstab"] && (c.kind === "hit" || c.kind === "crit")) { c.attacker.flags["backstab"] = 0; c.mult *= 2; } } } }),
  // ---------- Epic ----------
  only("epic", { ...DAG, id: "dg_scorpion_sting", name: "Scorpion's Sting", tags: ["Poison", "Crit"], damage: 5, offDamage: 4, faces: TWO,
    text: "Dagger. Crits on 5 and 6; your crits apply 4 Poison, and your hits on Poisoned enemies deal +2. Works in the off-hand.",
    hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 4), modifyAttack: (b, c) => { if (c.attacker === b.player && st(c.defender, "poison") > 0) c.bonus += 2; } } }),
  only("epic", { ...DAG, id: "dg_misericorde", name: "Misericorde", tags: ["Kill", "Crit"], damage: 5, offDamage: 4, faces: ONE,
    text: "Dagger. Your Hits on enemies below 30% HP become Crits. Works in the off-hand.",
    hooks: { modifyAttack: (b, c) => { if (c.attacker === b.player && c.kind === "hit" && c.defender.hp < c.defender.maxHp * 0.3) { c.kind = "crit"; c.mult = Math.max(c.mult, 2); c.ignoreArmor = true; } } } }),
  only("epic", { ...DAG, id: "dg_shadowstep", name: "Shadowstep Blade", tags: ["Tempo", "Crit"], damage: 4, offDamage: 4, faces: ONE,
    text: "Dagger. +8% Dodge. After you dodge a hit, your next Hit is a Crit. Works in the off-hand.",
    hooks: { stats: s => { s.dodge += 8; }, onDodge: (_b, c) => { c.defender.flags["shadowstep"] = 1; },
      modifyAttack: (b, c) => { if (c.attacker === b.player && c.attacker.flags["shadowstep"] && c.kind === "hit") { c.attacker.flags["shadowstep"] = 0; c.kind = "crit"; c.mult = Math.max(c.mult, 2); c.ignoreArmor = true; } } } })
];

export const DAGGER_LEGENDARIES: GearBase[] = [
  { ...DAG, id: "lx_nightfall", rarity: "legendary", name: "Nightfall", tags: ["Crit", "Tempo"], damage: 6, offDamage: 5, faces: TWO,
    legendary: { minFloor: 3, asBase: "w_dagger", reveal: "Crits on 5 and 6. Every crit you land in a fight makes your crits deal 20% more for the rest of it (up to +200%). Works in the off-hand." },
    text: "It only ever comes out after dark. It's always dark somewhere.",
    hooks: {
      onFightStart: (_b, f) => { f.flags["nightfall"] = 0; },
      modifyAttack: (b, c) => { if (c.attacker === b.player && c.kind === "crit") c.mult *= 1 + 0.2 * Math.min(10, c.attacker.flags["nightfall"] ?? 0); },
      onCrit: (b, c) => { if (c.attacker === b.player) c.attacker.flags["nightfall"] = (c.attacker.flags["nightfall"] ?? 0) + 1; }
    } },
  { ...DAG, id: "lx_kingslayer", rarity: "legendary", name: "Kingslayer", tags: ["Kill", "Crit"], damage: 6, offDamage: 5, faces: ONE,
    legendary: { minFloor: 4, asBase: "w_dagger", reveal: "Deals 40% more to bosses, Champions and Elites, and killing one heals you for 10% of your Max HP. Works in the off-hand." },
    text: "Small enough to hide in a sleeve. Sharp enough to end a dynasty.",
    hooks: {
      modifyAttack: (b, c) => { if (isToughFoe(b, c)) c.mult *= 1.4; },
      onKill: (b, c) => { if (isToughFoe(b, c)) heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.1), "Kingslayer"); }
    } }
];
