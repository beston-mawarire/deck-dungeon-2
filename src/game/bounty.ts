// The Bounty Board: pick one of three contracts, finish it within 14 rooms, get paid.
// Progress is read from counters the combat engine keeps on the hero (persist "q_*").
import type { Rarity, StatusId } from "../engine/types";
import type { Hero } from "./hero";

export const BOUNTY_ROOMS = 14;
export const BOUNTY_BOARD_CHANCE = 0.07;

export type BountyKind = "flawless" | "crits" | "elites" | "champions" | "skill" | "status" | "reactions" | "kills" | "quick";

export type BountyReward = { kind: "gold"; n: number } | { kind: "scrap"; n: number } | { kind: "item"; rarity: Rarity };

export interface Bounty {
  kind: BountyKind;
  target: number;
  /** For "status" contracts: which status to apply. */
  status?: StatusId;
  /** Counter value when the contract was taken. */
  base: number;
  roomsLeft: number;
  reward: BountyReward;
}

const SKILL: Record<string, { name: string; n: number }> = {
  warrior: { name: "War Cry", n: 5 }, rogue: { name: "Counter", n: 6 }, mage: { name: "Elemental Barrier", n: 6 }, cleric: { name: "Penance", n: 6 }
};

/** Statuses a contract may ask for, and the gear tags that make them doable. */
const STATUS_TAGS: [StatusId, string, string][] = [
  ["burn", "Burn", "Burn"], ["poison", "Poison", "Poison"], ["bleed", "Bleed", "Bleed"], ["chill", "Frost", "Chill"],
  ["shock", "Shock", "Shock"], ["weak", "Hex", "Weak"], ["exposed", "Hex", "Exposed"]
];

export function counterKey(b: Pick<Bounty, "kind" | "status">): string {
  return b.kind === "status" ? `q_st_${b.status}` : `q_${b.kind}`;
}

export function bountyProgress(h: Hero, b: Bounty): number {
  return Math.max(0, (h.f.persist[counterKey(b)] ?? 0) - b.base);
}

export function bountyText(b: Pick<Bounty, "kind" | "target" | "status">, origin?: string): string {
  switch (b.kind) {
    case "flawless": return `Win ${b.target} fights without losing any HP`;
    case "crits": return `Land ${b.target} Crits`;
    case "elites": return `Defeat ${b.target} Elites`;
    case "champions": return `Defeat ${b.target} Champions`;
    case "skill": return `Use ${SKILL[origin ?? "warrior"]?.name ?? "your class action"} ${b.target} times`;
    case "status": return `Apply ${STATUS_TAGS.find(s => s[0] === b.status)?.[2] ?? b.status} to foes ${b.target} times`;
    case "reactions": return `Set off ${b.target} reactions`;
    case "kills": return `Defeat ${b.target} foes`;
    case "quick": return `Win ${b.target} fights in 3 rounds or fewer`;
  }
}

export function rewardText(r: BountyReward): string {
  if (r.kind === "gold") return `🪙 ${r.n} Gold`;
  if (r.kind === "scrap") return `⚙️ ${r.n} Scrap`;
  return r.rarity === "epic" ? "🟣 An Epic item" : r.rarity === "rare" ? "🔵 A Rare item" : "🟢 An Uncommon item";
}

function rollReward(rng: () => number, floor: number): BountyReward {
  const x = rng();
  if (x < 0.55) return { kind: "gold", n: 50 + 15 * floor };
  if (x < 0.75) return { kind: "scrap", n: 18 + 4 * floor };
  if (x < 0.87) return { kind: "item", rarity: "uncommon" };
  if (x < 0.96) return { kind: "item", rarity: "rare" };
  return { kind: "item", rarity: "epic" };
}

/** Three different contracts the hero can actually do. */
export function makeOffers(h: Hero, rng: () => number, floor: number, tags: Map<string, number>): Bounty[] {
  const kinds: BountyKind[] = ["flawless", "crits", "elites", "champions", "reactions", "kills", "quick"];
  if (h.origin !== "mage" || h.f.barrierElement) kinds.push("skill");
  const statuses = STATUS_TAGS.filter(([, tag]) => (tags.get(tag) ?? 0) > 0);
  if (statuses.length) kinds.push("status");
  const out: Bounty[] = [];
  while (out.length < 3 && kinds.length) {
    const kind = kinds.splice(Math.floor(rng() * kinds.length), 1)[0];
    const status = kind === "status" ? statuses[Math.floor(rng() * statuses.length)][0] : undefined;
    const target = ({ flawless: 2, crits: 10, elites: 2, champions: 2, skill: SKILL[h.origin]?.n ?? 6, status: 12, reactions: 4, kills: 9, quick: 3 } as Record<BountyKind, number>)[kind];
    const draft: Bounty = { kind, target, status, base: 0, roomsLeft: BOUNTY_ROOMS, reward: rollReward(rng, floor) };
    draft.base = h.f.persist[counterKey(draft)] ?? 0;
    out.push(draft);
  }
  return out;
}
