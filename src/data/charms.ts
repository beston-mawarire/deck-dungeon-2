// Multi-element charms: off-hands that mix two, three or four elements on different rolls,
// and throw every one of them back when an Elemental Barrier is hit. Normal drop odds for their rarity.
import type { Battle, AttackCtx, GearBase, StatusId } from "../engine/types";
import { applyStatus, on } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const hexIt = (id: StatusId, n: number) => (b: Battle, c: AttackCtx) => { applyStatus(b, c.attacker, c.defender, id, n); };
const many = (...parts: [StatusId, number][]) => (b: Battle, c: AttackCtx) => { for (const [id, n] of parts) applyStatus(b, c.attacker, c.defender, id, n); };

/** Uncommon, Rare and Epic charms (they join GEAR_BASES). */
export const CHARMS: GearBase[] = [
  // ---------- Uncommon: two elements ----------
  only("uncommon", { id: "ch_cinderfrost", kind: "off", slot: "off", name: "Cinderfrost Charm", tags: ["Arcane", "Burn", "Frost"],
    barrierElement: "burn", barrierElements: ["burn", "chill"],
    text: "On a 2: apply 2 Burn. On a 4: apply 2 Chill. Elemental Barrier: Burn and Chill.",
    hooks: { face: [on(2, hexIt("burn", 2)), on(4, hexIt("chill", 2))] } }),
  only("uncommon", { id: "ch_marsh", kind: "off", slot: "off", name: "Marshlight Charm", tags: ["Arcane", "Poison", "Frost"],
    barrierElement: "poison", barrierElements: ["poison", "soaked"],
    text: "On a 1: apply 2 Soaked. On a 3: apply 2 Poison. Elemental Barrier: Poison and Soaked.",
    hooks: { face: [on(1, hexIt("soaked", 2)), on(3, hexIt("poison", 2))] } }),

  // ---------- Rare: two or three elements ----------
  only("rare", { id: "ch_tempest", kind: "off", slot: "off", name: "Tempest Charm", tags: ["Arcane", "Storm", "Frost"],
    barrierElement: "static", barrierElements: ["static", "soaked"],
    text: "On a 3: apply 2 Soaked. On a 5: apply 3 Static. Elemental Barrier: Static and Soaked.",
    hooks: { face: [on(3, hexIt("soaked", 2)), on(5, hexIt("static", 3))] } }),
  only("rare", { id: "ch_triad", kind: "off", slot: "off", name: "Triad Charm", tags: ["Arcane", "Burn", "Frost", "Storm"],
    barrierElement: "burn", barrierElements: ["burn", "chill", "static"],
    text: "On a 2: apply 2 Burn. On a 4: apply 2 Chill. On a 6: apply 3 Static. Elemental Barrier: Burn, Chill and Static.",
    hooks: { face: [on(2, hexIt("burn", 2)), on(4, hexIt("chill", 2)), on(6, hexIt("static", 3))] } }),

  // ---------- Epic: three elements ----------
  only("epic", { id: "ch_prism", kind: "off", slot: "off", name: "Prism Charm", tags: ["Arcane", "Burn", "Frost", "Storm"],
    barrierElement: "chill", barrierElements: ["chill", "burn", "static"],
    text: "Spell Amp +10%. On a 1 or 2: apply 2 Chill. On a 3 or 4: apply 2 Burn. On a 5 or 6: apply 3 Static. Elemental Barrier: Chill, Burn and Static.",
    hooks: { stats: s => { s.spellAmp += 10; },
      face: [on(1, hexIt("chill", 2)), on(2, hexIt("chill", 2)), on(3, hexIt("burn", 2)), on(4, hexIt("burn", 2)), on(5, hexIt("static", 3)), on(6, hexIt("static", 3))] } }),
  only("epic", { id: "ch_witchfire", kind: "off", slot: "off", name: "Witchfire Charm", tags: ["Arcane", "Burn", "Poison", "Frost"],
    barrierElement: "poison", barrierElements: ["burn", "poison", "chill"],
    text: "On a 2: apply 3 Burn. On a 3: apply 3 Poison. On a 5: apply 2 Chill and 2 Poison. Elemental Barrier: Burn, Poison and Chill.",
    hooks: { face: [on(2, hexIt("burn", 3)), on(3, hexIt("poison", 3)), on(5, many(["chill", 2], ["poison", 2]))] } })
];

/** Legendary charm (joins LEGENDARIES: one per run, hidden until found). */
export const CHARM_LEGENDARIES: GearBase[] = [
  { id: "lx_four_winds", rarity: "legendary", kind: "off", slot: "off", name: "Charm of the Four Winds", tags: ["Arcane", "Burn", "Frost", "Storm"],
    barrierElement: "burn", barrierElements: ["soaked", "burn", "chill", "static"],
    legendary: { minFloor: 3, asBase: "o_ember_charm", reveal: "On a 1: apply 2 Soaked. On a 2: apply 3 Burn. On a 4: apply 3 Chill. On a 6: apply 4 Static. Elemental Barrier: all four." },
    text: "Every wind that ever blew, knotted on one cord.",
    hooks: { face: [on(1, hexIt("soaked", 2)), on(2, hexIt("burn", 3)), on(4, hexIt("chill", 3)), on(6, hexIt("static", 4))] } }
];

/** Crimson charm (joins CRIMSON). */
export const CHARM_CRIMSON: GearBase[] = [
  { id: "cx_bloodstorm", rarity: "crimson", kind: "off", slot: "off", name: "Bloodstorm Charm", tags: ["Arcane", "Burn", "Frost", "Storm", "Poison"],
    barrierElement: "burn", barrierElements: ["burn", "chill", "static", "poison"],
    text: "Every roll is a storm: 1: 3 Poison. 2: 3 Burn. 3: 3 Chill. 4: 4 Static. 5: 3 Burn and 3 Chill. 6: 2 of all four. Reactions you cause deal +50%. Elemental Barrier: all four.",
    hooks: { reactionMult: () => 1.5,
      face: [on(1, hexIt("poison", 3)), on(2, hexIt("burn", 3)), on(3, hexIt("chill", 3)), on(4, hexIt("static", 4)),
        on(5, many(["burn", 3], ["chill", 3])), on(6, many(["burn", 2], ["chill", 2], ["static", 2], ["poison", 2]))] } }
];
