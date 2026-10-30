// Enemy suit traits and Elite affixes. Enemies hold these as items.
import { other } from "../engine/statuses";
import type { ItemDef } from "../engine/types";
import { applyStatus, heal, log } from "./helpers";

const affix = (d: Omit<ItemDef, "kind" | "rarity">): ItemDef => ({ kind: "affix", rarity: "common", ...d });

export const SUIT_TRAITS: ItemDef[] = [
  affix({ id: "trait_S", name: "Spades", tags: ["Strike"], text: "Hits harder (+1 Power)", hooks: {} }),
  affix({ id: "trait_C", name: "Clubs", tags: ["Guard"], text: "Has 1 Armor", hooks: {} }),
  affix({ id: "trait_H", name: "Hearts", tags: ["Blood"], text: "Drains: heals 1 when it hits you", hooks: { onHit: (b, ctx) => { heal(b, ctx.attacker, 1, "drain"); } } }),
  affix({ id: "trait_D", name: "Diamonds", tags: ["Gold"], text: "Steals 1 Gold when it hits you",
    hooks: { onHit: (b, ctx) => { const g = ctx.defender.gold ?? 0; if (g > 0) { ctx.defender.gold = g - 1; log(b, "It steals 1 Gold."); } } } })
];

export const ELITE_AFFIXES: ItemDef[] = [
  affix({ id: "blazing", name: "Blazing", tags: ["Burn"], text: "Its hits apply 2 Burn", hooks: { onHit: (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "burn", 2) } }),
  affix({ id: "venomous", name: "Venomous", tags: ["Poison"], text: "Its hits apply 2 Poison", hooks: { onHit: (b, ctx) => applyStatus(b, ctx.attacker, ctx.defender, "poison", 2) } }),
  affix({ id: "armored", name: "Armored", tags: ["Guard"], text: "+3 Armor; can't be Exposed",
    hooks: { onFightStart: (_b, f) => { f.armor += 3; }, incomingStatus: (_b, _f, s, amount) => (s === "exposed" ? 0 : amount) } }),
  affix({ id: "vampiric", name: "Vampiric", tags: ["Blood"], text: "Heals half the damage it deals", hooks: { onHit: (b, ctx) => { heal(b, ctx.attacker, Math.floor(ctx.dealt / 2), "Vampiric"); } } }),
  affix({ id: "swift", name: "Swift", tags: ["Tempo"], text: "Starts every fight with Haste", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "haste", 1) } }),
  affix({ id: "spiteful", name: "Spiteful", tags: ["Thorns"], text: "When it dies, you take 5",
    hooks: { onFightEnd: (b, f) => { if (b.over === "won" && f.id === "enemy") { other(b, f).hp -= 5; log(b, "Spiteful: you take 5 as it dies."); } } } }),
  affix({ id: "warded", name: "Warded", tags: ["Guard"], text: "Immune to statuses for the first 2 rounds",
    hooks: { incomingStatus: (b, _f, _s, amount) => (b.round <= 2 ? 0 : amount) } }),
  affix({ id: "greedy", name: "Greedy", tags: ["Gold"], text: "Steals 5 Gold per hit; drops it all plus 20 when it dies",
    hooks: {
      onHit: (b, ctx) => { const g = Math.min(5, ctx.defender.gold ?? 0); ctx.defender.gold = (ctx.defender.gold ?? 0) - g; ctx.attacker.flags["stolen"] = (ctx.attacker.flags["stolen"] ?? 0) + g; if (g) log(b, `It steals ${g} Gold.`); },
      onFightEnd: (b, f) => { if (b.over === "won" && f.id === "enemy") { const p = other(b, f); const g = (f.flags["stolen"] ?? 0) + 20; p.gold = (p.gold ?? 0) + g; log(b, `Greedy drops ${g} Gold.`); } }
    } })
];

export const ENEMY_ITEMS: ItemDef[] = [...SUIT_TRAITS, ...ELITE_AFFIXES];
