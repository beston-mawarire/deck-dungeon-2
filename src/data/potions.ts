// Potion gear: you can carry 3 Healing Potions and drink 3 per fight. Each of these adds potion slots
// (both more to carry and more to drink): Uncommon +1, Rare +2, Epic +3, Legendary +4.
// Uncommon to Legendary, at their rarity's normal drop odds.
import type { GearBase, HookDef } from "../engine/types";
import { applyStatus, heal, on } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const T = { kind: "trinket" as const, slot: "trinket" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const O = { kind: "off" as const, slot: "off" as const };
const relic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "relic", ...d });

export const POTION_GEAR: GearBase[] = [
  // Trinkets
  only("uncommon", { ...T, id: "pc_flask_chain", name: "Flask Chain", tags: ["Blood"], text: "+1 potion slot: carry and drink 1 more Healing Potion.", hooks: {} }),
  only("rare", { ...T, id: "pc_apothecary_ring", name: "Apothecary's Ring", tags: ["Blood"], text: "+2 potion slots: carry and drink 2 more Healing Potions. Your potions heal 4 more.", hooks: {} }),
  only("epic", { ...T, id: "pc_vial_of_plenty", name: "Vial of Plenty", tags: ["Blood", "Luck"], text: "+3 potion slots: carry and drink 3 more Healing Potions. Win a fight without drinking one: a chance to find a potion.", hooks: {} }),

  // Armours
  only("uncommon", { ...A, id: "pc_bandolier_vest", name: "Bandolier Vest", tags: ["Blood"], armor: 1, text: "Light: +1 Armor. +1 potion slot: carry and drink 1 more Healing Potion.", hooks: {} }),
  only("rare", { ...A, id: "pc_alchemist_coat", name: "Alchemist's Coat", tags: ["Blood", "Arcane"], armor: 2, text: "+2 Armor. +2 potion slots: carry and drink 2 more Healing Potions. Your potions heal 25% more.", hooks: {} }),
  only("epic", { ...A, id: "pc_brewmaster_mail", name: "Brewmaster's Mail", tags: ["Blood", "Guard"], armor: 4, text: "+4 Armor. +3 potion slots: carry and drink 3 more Healing Potions. Drinking one also gives you Barrier equal to what it heals.", hooks: {} }),

  // Off-hands
  only("uncommon", { ...O, id: "pc_potion_satchel", name: "Potion Satchel", tags: ["Blood"], text: "+1 potion slot: carry and drink 1 more Healing Potion.", hooks: {} }),
  only("rare", { ...O, id: "pc_tincture_lantern", name: "Tincture Lantern", tags: ["Blood", "Arcane"], text: "+2 potion slots: carry and drink 2 more Healing Potions. On a 6: heal 2.",
    hooks: { face: [on(6, (b, c) => { heal(b, c.attacker, 2, "Tincture Lantern"); })] } }),
  only("epic", { ...O, id: "pc_brewers_buckler", name: "Brewer's Buckler", shield: true, tags: ["Blood", "Guard"], armor: 2, text: "+2 Armor. +3 potion slots: carry and drink 3 more Healing Potions. Drinking one also gives you Ward.", hooks: {} }),
];

export const POTION_LEGENDARIES: GearBase[] = [
  { ...T, id: "lx_endless_alembic", rarity: "legendary", name: "The Endless Alembic", tags: ["Blood", "Luck"],
    legendary: { minFloor: 3, asBase: "t_lucky_coin", reveal: "+4 potion slots: carry and drink 4 more Healing Potions. Every fight you win without drinking one brews you a potion." },
    text: "It's always a little warm, and it's never quite empty.", hooks: {} },
  { ...A, id: "la_flaskwarden", rarity: "legendary", name: "Mantle of the Flaskwarden", tags: ["Blood", "Guard"], armor: 1,
    legendary: { minFloor: 3, asBase: "a_padded", reveal: "+4 potion slots: carry and drink 4 more Healing Potions. Your potions heal twice as much." },
    text: "Every pocket clinks.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 2) } },
  { ...O, id: "lo_chalice_plenty", rarity: "legendary", name: "Chalice of Plenty", tags: ["Blood", "Luck"],
    legendary: { minFloor: 3, asBase: "o_prayer_beads", reveal: "+4 potion slots: carry and drink 4 more Healing Potions. The first potion you drink each fight isn't used up." },
    text: "Drink deep. It refills.", hooks: { face: [on(2, (b, c) => applyStatus(b, c.attacker, c.attacker, "regen", 1)), on(4, (b, c) => applyStatus(b, c.attacker, c.attacker, "regen", 1))] } },
];

export const POTION_RELICS: HookDef[] = [
  relic({ id: "pc_potion_belt", name: "Potion Belt", rarity: "uncommon", tags: ["Blood"], text: "+1 potion slot: carry and drink 1 more Healing Potion", hooks: {} }),
  relic({ id: "pc_spare_vial", name: "Spare Vial", rarity: "rare", tags: ["Blood"], text: "+2 potion slots: carry and drink 2 more Healing Potions. Your potions heal 3 more", hooks: {} }),
  relic({ id: "pc_grail", name: "The Grail of Plenty", rarity: "legendary", tags: ["Blood", "Luck"], text: "+4 potion slots: carry and drink 4 more Healing Potions. Every boss you beat refills one", hooks: {} })
];

const SLOTS: Record<string, number> = { uncommon: 1, rare: 2, epic: 3, legendary: 4 };
/** Potion slots each item or relic adds, by its rarity. */
export const POTION_SLOTS: Record<string, number> = Object.fromEntries([
  ...POTION_GEAR.map(g => [g.id, SLOTS[g.onlyRarity ?? "uncommon"]]),
  ...POTION_LEGENDARIES.map(g => [g.id, 4]),
  ...POTION_RELICS.map(r => [r.id, SLOTS[r.rarity ?? "uncommon"]])
]);
