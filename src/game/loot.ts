// Loot: rarity tables, rolling gear, chests (Wooden, Iron, Resplendent) and bad-luck protection.
import { EPIC_CRIMSON } from "../data/abyss";
import { BONUSES, CRIMSON, EPIC_POWERS, GEAR_BASES, LEGENDARIES } from "../data";
import type { GearBase, GearItem, Rarity } from "../engine/types";
import { RARITIES } from "../engine/types";
import { AFFINITY } from "../data/origins";
import { type Hero, heroTags } from "./hero";

export type Odds = Partial<Record<Rarity, number>>;

export const TABLES = {
  wooden: { common: 70, uncommon: 30 },
  iron: { uncommon: 70, rare: 30 },
  drop: { common: 65, uncommon: 28, rare: 7 },
  elite: { uncommon: 67, rare: 32, epic: 1 },
  champion: { uncommon: 10, rare: 79, epic: 9, legendary: 2 },
  boss: { rare: 89, epic: 9, legendary: 2 },
  /** Crimson Elites: harder, better loot (and sometimes a Crimson Key). */
  crimson: { rare: 62, epic: 32, legendary: 6 },
  shop: { common: 15, uncommon: 50, rare: 33.5, epic: 1.5 }
} satisfies Record<string, Odds>;

/** Resplendent card odds: Epic and Legendary grow with depth, and are rare early on. */
export function resplendentOdds(floor: number): Odds {
  const legendary = Math.min(8, 0.5 + 0.7 * (floor - 1));
  const epic = Math.min(22, 2.5 + 1.8 * (floor - 1));
  const rare = 40;
  return { uncommon: 100 - legendary - epic - rare, rare, epic, legendary };
}

/**
 * Fortune: the deeper you go, the better every find. The boost is small (a few % per floor on Rare and up),
 * but the game tells you about it, to make delving deeper feel worth it.
 */
export const fortune = (floor: number) => 1 + 0.03 * Math.min(floor - 1, 4) + 0.015 * Math.max(0, floor - 5);
/** Fortune shown to the player: one ✦ per floor reached, up to ten. */
export const fortunePips = (floor: number) => Math.min(10, floor);

export function withFortune(odds: Odds, floor: number): Odds {
  const f = fortune(floor);
  const out: Odds = { ...odds };
  for (const r of ["rare", "epic", "legendary"] as const) if (out[r]) out[r] = out[r]! * f;
  // Floors 1 and 2 are the green floors: most of what would have been Rare is Uncommon instead.
  const shift = floor <= 1 ? 0.65 : floor === 2 ? 0.45 : 0;
  for (const r of ["rare", "epic"] as const) {
    if (!shift || !out[r]) continue;
    out.uncommon = (out.uncommon ?? 0) + out[r]! * shift;
    out[r] = out[r]! * (1 - shift);
  }
  return out;
}

export function rollRarity(rng: () => number, odds: Odds, floor?: number): Rarity {
  if (floor !== undefined) odds = withFortune(odds, floor);
  const total = RARITIES.reduce((s, r) => s + (odds[r] ?? 0), 0);
  let x = rng() * total;
  for (const r of RARITIES) {
    x -= odds[r] ?? 0;
    if (x < 0) return r;
  }
  return "common";
}

const weighted = <T>(rng: () => number, items: T[], weight: (t: T) => number): T => {
  const total = items.reduce((s, t) => s + weight(t), 0);
  let x = rng() * total;
  for (const t of items) {
    x -= weight(t);
    if (x < 0) return t;
  }
  return items[items.length - 1];
};

/** Lean toward tags the hero already owns, without ever guaranteeing them. */
const tagWeight = (tags: Map<string, number>, own: readonly string[]) => 1 + 0.35 * own.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0);

const rank = (r: Rarity) => RARITIES.indexOf(r);

/** Items still locked behind Renown (set at the start of each run). */
let LOCKED = new Set<string>();
export const setLocked = (ids: Set<string>) => { LOCKED = ids; };
export const isLocked = (id: string) => LOCKED.has(id);

/** Bash on weapons, Rare and up: a % chance to Stun and deal +50%. Only the weapon (and rare relics) give it. */
const BASH_RANGE: Partial<Record<Rarity, [number, number]>> = { rare: [4, 10], epic: [8, 16], legendary: [12, 22], crimson: [18, 30] };
function rollBash(rarity: Rarity, base: GearBase, rng: () => number): number | undefined {
  const r = BASH_RANGE[rarity];
  if (!r || base.kind !== "weapon" || (!base.alwaysBash && rng() >= 0.45)) return undefined;
  return Math.round(r[0] + rng() * (r[1] - r[0]));
}

/** Legendaries (and Crimson items) already rolled this run: each drops at most once per run. */
let DROPPED = new Set<string>();
export const resetDropped = () => { DROPPED = new Set(); };
export const getDropped = () => [...DROPPED];
export const setDropped = (ids: string[]) => { DROPPED = new Set(ids); };

/** Elemental gear (Burn, Frost, Storm, Poison) had flooded the pool: it rolls at this weight. */
const ELEMENTAL_TAGS = ["Burn", "Frost", "Storm", "Poison"];
const ELEMENTAL_WEIGHT = 0.5;
const elementalW = (tags: readonly string[]) => (tags.some(t => ELEMENTAL_TAGS.includes(t)) ? ELEMENTAL_WEIGHT : 1);

export function rollItem(h: Hero, rarity: Rarity, floor: number, rng: () => number): GearItem {
  const tags = heroTags(h);
  if (rarity === "crimson") {
    const pool = CRIMSON.filter(c => !DROPPED.has(c.id));
    const base = weighted(rng, pool.length ? pool : CRIMSON, b => (1 + 0.15 * b.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)) * elementalW(b.tags));
    DROPPED.add(base.id);
    return { uid: h.nextUid++, base: base.id, rarity: "crimson", level: floor, bonuses: rollBonuses(h, "rare", base, floor, rng, 2), revealed: true, bash: rollBash("crimson", base, rng) };
  }
  if (rarity === "legendary") {
    const pool = LEGENDARIES.filter(l => (l.legendary?.minFloor ?? 1) <= floor && !LOCKED.has(l.id) && !DROPPED.has(l.id));
    if (pool.length === 0) rarity = "epic";
    else {
      // A gentle lean toward your build; Legendaries should feel like a surprise, not a fixed path.
      const base = weighted(rng, pool, b => (1 + 0.15 * b.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)) * elementalW(b.tags));
      DROPPED.add(base.id);
      return { uid: h.nextUid++, base: base.id, rarity: "legendary", level: floor, bonuses: {}, revealed: false, bash: rollBash("legendary", base, rng) };
    }
  }
  const fav = new Set(AFFINITY[h.origin]);
  const base: GearBase = weighted(rng, GEAR_BASES.filter(g => (!LOCKED.has(g.id) || (g.deep && floor > 5)) && floor >= (g.floorMin ?? 0) && (!g.onlyRarity || g.onlyRarity === rarity) && rank(rarity) >= rank(g.minItemRarity ?? "common")), b => tagWeight(tags, b.tags) * (fav.has(b.id) ? 2.2 : 1) * (b.weight ?? 1) * elementalW(b.tags));
  const nBonuses = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 0, crimson: 2, epic_crimson: 3, legendary_crimson: 0 }[rarity];
  const bonuses = rollBonuses(h, rarity, base, floor, rng, nBonuses);
  const epic = rarity === "epic" ? weighted(rng, EPIC_POWERS.filter(e => !LOCKED.has(e.id)), e => tagWeight(tags, e.tags)).id : undefined;
  return { uid: h.nextUid++, base: base.id, rarity, level: floor, bonuses, epic, revealed: true, bash: rollBash(rarity, base, rng) };
}

function rollBonuses(h: Hero, rarity: Rarity, base: GearBase, floor: number, rng: () => number, n: number): Record<string, number> {
  const tags = heroTags(h);
  const bonuses: Record<string, number> = {};
  const pool = BONUSES.filter(x => rank(rarity) >= rank(x.minRarity ?? "uncommon") && !LOCKED.has(x.id));
  for (let i = 0; i < n && pool.length; i++) {
    const pick = weighted(rng, pool, x => (1 + 0.6 * x.tags.filter(t => base.tags.includes(t)).length + 0.25 * x.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)) * elementalW(x.tags));
    pool.splice(pool.indexOf(pick), 1);
    bonuses[pick.id] = floor;
  }
  return bonuses;
}

export type ResplendentCard = { kind: "item"; item: GearItem } | { kind: "scroll" };

export interface LootState {
  /** Bad-luck protection: bonus % added to Epic and Legendary on Resplendent cards. */
  pity: number;
}

/** Deal the face-down cards of a Resplendent chest. */
/** The Four-Leaf Clover blessing (Lucky Pot): a small nudge toward Rare, Epic and Legendary, for a few chests. */
export function luckyOdds(odds: Odds): Odds {
  return { ...odds, rare: (odds.rare ?? 0) + 4, epic: (odds.epic ?? 0) + 1.5, legendary: (odds.legendary ?? 0) + 0.5 };
}

export function resplendentCards(h: Hero, floor: number, loot: LootState, rng: () => number): ResplendentCard[] {
  let base = resplendentOdds(floor);
  if ((h.f.persist["cloverChests"] ?? 0) > 0) base = luckyOdds(base);
  const clover = 3 * (h.relics["four_leaf_clover"] ?? 0);
  base.epic = (base.epic ?? 0) + loot.pity;
  base.legendary = (base.legendary ?? 0) + loot.pity / 2 + clover;
  const count = 3 + (Object.values(h.equip).some(i => i?.base === "t_prospector") ? 1 : 0);
  const cards: ResplendentCard[] = [];
  for (let i = 0; i < count; i++) {
    if (rng() < 0.015) cards.push({ kind: "scroll" });
    else cards.push({ kind: "item", item: rollItem(h, rollRarity(rng, base, floor), floor, rng) });
  }
  const great = cards.some(c => c.kind === "item" && rank(c.item.rarity) >= rank("epic"));
  loot.pity = great ? 0 : loot.pity + 3;
  return cards;
}

/** Epic Crimson: one of the Abyss items you haven't had this run, with three rolled bonuses. Only the bosses of floors 30–70 drop them. */
export function rollEpicCrimson(h: Hero, floor: number, rng: () => number): GearItem {
  const pool = EPIC_CRIMSON.filter(e => !DROPPED.has(e.id));
  const base = (pool.length ? pool : EPIC_CRIMSON)[Math.floor(rng() * (pool.length || EPIC_CRIMSON.length))];
  DROPPED.add(base.id);
  return { uid: h.nextUid++, base: base.id, rarity: "epic_crimson", level: floor, bonuses: rollBonuses(h, "epic", base, floor, rng, 3), revealed: true };
}

/** A fixed reward item (Abaddon, the Cookie). */
export function makeRewardItem(h: Hero, id: string, floor: number): GearItem {
  return { uid: h.nextUid++, base: id, rarity: "legendary_crimson", level: floor, bonuses: {}, revealed: true };
}
