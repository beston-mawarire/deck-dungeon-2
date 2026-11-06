/** Heat: a pact you make before a run. Pick the conditions you want, each worth Heat; the total makes finds richer
 *  (Rare-or-better likelier) and counts toward your class's Heat bounties. Nothing is locked behind it but its own rewards. */
export interface PactDef { id: string; icon: string; name: string; max: number; cost: number; text: (rank: number) => string }

export const PACT: PactDef[] = [
  { id: "hardened", icon: "🛡️", name: "Hardened Foes", max: 3, cost: 1, text: r => `Every foe has ${12 * r}% more HP` },
  { id: "sharpened", icon: "🗡️", name: "Sharpened Blades", max: 3, cost: 1, text: r => `Every foe hits ${10 * r}% harder` },
  { id: "armored", icon: "🪖", name: "Iron Hides", max: 2, cost: 1, text: r => `Every foe has +${r} Armor` },
  { id: "lean", icon: "🪙", name: "Lean Purse", max: 2, cost: 1, text: r => `Gold found −${25 * r}%` },
  { id: "greed", icon: "⚖️", name: "Merchant's Greed", max: 2, cost: 1, text: r => `Merchants charge ${20 * r}% more` },
  { id: "dim", icon: "🕯️", name: "Dim Fires", max: 2, cost: 1, text: r => `All your healing −${20 * r}%` },
  { id: "dread", icon: "⏳", name: "Creeping Dread", max: 2, cost: 1, text: r => `A floor's danger builds ${50 * r}% faster the longer you stay` },
  { id: "swarm", icon: "👹", name: "Elite Swarm", max: 2, cost: 2, text: r => `${r} more Elite${r > 1 ? "s" : ""} on every floor (from a layer's second)` },
  { id: "champions", icon: "🏆", name: "Champions' Call", max: 1, cost: 2, text: () => "Champions appear from a layer's second floor, and one more on every floor from its third" },
  { id: "bosses", icon: "🐉", name: "Cruel Masters", max: 2, cost: 2, text: r => `Layer bosses have ${25 * r}% more HP and hit ${10 * r}% harder` },
  { id: "supply", icon: "🧪", name: "Short Supply", max: 1, cost: 2, text: () => "You can carry one fewer Healing Potion" },
  { id: "cursed", icon: "☠️", name: "Ill Omen", max: 1, cost: 2, text: () => "Set out with a random curse" }
];
export const PACT_MAP = new Map(PACT.map(p => [p.id, p]));
export const PACT_MAX = PACT.reduce((a, p) => a + p.max * p.cost, 0);
/** Heat in a pact. */
export const pactHeat = (pact: Partial<Record<string, number>> | undefined) => PACT.reduce((a, p) => a + Math.min(p.max, pact?.[p.id] ?? 0) * p.cost, 0);
/** Heat bounties: the first time each class beats the dungeon at each Heat (up to this), a reward. */
export const BOUNTY_CAP = 10;
/** What clearing Heat n for the first time (with a class) gives: Crown Shards, and a Scroll of Knowledge every other level. */
export const bountyReward = (n: number) => ({ crowns: 2 * n, scrolls: n % 2 === 0 ? 1 : 0 });
/** Each point of Heat: Rare-or-better finds this much likelier (up to 20 points' worth). */
export const HEAT_LOOT_PER = 0.04, HEAT_LOOT_CAP = 20;
