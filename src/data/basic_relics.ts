// Basic relics: plain, stackable stat boosts. Each one is its own relic, at normal relic odds.
import type { HookDef } from "../engine/types";

type R = "common" | "uncommon" | "rare";
const RAR: R[] = ["common", "common", "uncommon", "uncommon", "rare"];
const ARMOR_RAR: R[] = ["common", "uncommon", "uncommon", "rare", "rare"];
const GOLD_RAR: R[] = ["common", "common", "uncommon", "uncommon", "uncommon"];

const HP_NAMES = ["Copper Locket", "Hearty Charm", "Oak Heart", "Bear's Tooth", "Giant's Marrow"];
const ARMOR_NAMES = ["Iron Rivet", "Steel Buckle", "Bronze Pauldron", "Knight's Crest", "Bastion Stone"];
const GOLD_NAMES = ["Lucky Penny", "Coin Purse", "Merchant's Ledger", "Golden Idol", "Dragon's Tithe"];
const SCRAP_NAMES = ["Rusty Pliers", "Tinker's Pouch", "Salvager's Hook", "Scrapper's Gauntlet", "Master Tinker's Kit"];

export const BASIC_RELICS: HookDef[] = [
  ...HP_NAMES.map((name, i): HookDef => ({ kind: "relic", id: `rb_hp_${i + 1}`, name, rarity: RAR[i], tags: ["Blood"], text: `+${i + 1} Max HP`,
    hooks: { stats: (s, n) => { s.maxHp += (i + 1) * n; } } })),
  ...ARMOR_NAMES.map((name, i): HookDef => ({ kind: "relic", id: `rb_armor_${i + 1}`, name, rarity: ARMOR_RAR[i], tags: ["Guard"], text: `+${i + 1} Armor`,
    hooks: { stats: (s, n) => { s.armor += (i + 1) * n; } } })),
  ...GOLD_NAMES.map((name, i): HookDef => ({ kind: "relic", id: `rb_gold_${i + 1}`, name, rarity: GOLD_RAR[i], tags: ["Luck"], text: `+${i + 1} Gold from every fight you win`, hooks: {} })),
  ...SCRAP_NAMES.map((name, i): HookDef => ({ kind: "relic", id: `rb_scrap_${i + 1}`, name, rarity: RAR[i], tags: ["Luck"], text: `+${i + 1} Scrap every time you scrap an item`, hooks: {} }))
];

/** Extra Gold per won fight, and extra Scrap per scrapped item, from basic relics. */
export function relicBonus(relics: Record<string, number>, kind: "gold" | "scrap"): number {
  let n = 0;
  for (let i = 1; i <= 5; i++) n += i * (relics[`rb_${kind}_${i}`] ?? 0);
  return n;
}
