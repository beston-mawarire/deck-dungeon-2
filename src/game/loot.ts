import { MASTERY_FAMILIES, TOTEM_WEIGHT, TOTEMS } from "./longroad";
import { generate, GEN_SHARE } from "./gen";
// Loot: rarity tables, rolling gear, chests (Wooden, Iron, Resplendent) and bad-luck protection.
import { EPIC_CRIMSON } from "../data/abyss";
import { CRIMSON, GEAR_BASES, LEGENDARIES } from "../data";
import type { GearBase, GearItem, Rarity } from "../engine/types";
import { RARITIES } from "../engine/types";
import { AFFINITY } from "../data/origins";
import { baseOf, type Hero, heroTags } from "./hero";
import { affixPool, CONVERTED, type Grade, rollAffixes, type RollCtx } from "./affixpool";
import { classify, type Family } from "./families";

/** The Crawl: each class has its own loot. Weapons and off-hands come from its families; armour, rings, amulets and
 *  charms are shared by everyone. */
export const CLASS_FAMILIES: Record<string, Family[]> = {
  warrior: ["shortblade", "greatblade", "blunt", "breaker", "polearm", "shield"],
  mage: ["arcane", "focus", "knife"],
  rogue: ["knife", "shortblade", "ranged", "throwable"],
  cleric: ["blunt", "breaker", "shield", "focus"]
};
/** A totem set at the door leans the loot toward its kind (null when none is set: the usual case). */
function totemWeigher(h: Hero): ((b: GearBase) => number) | null {
  const t = TOTEMS.find(x => h.f.persist[`totem_${x.id}`]);
  if (!t) return null;
  return b => {
    const c = classify(b);
    const hit = (t.families?.includes(c.family) ?? false) || (t.heavy && (c.load === "heavy" || !!b.twoHanded)) || (t.light && b.kind === "armour" && c.load === "light") || (t.tags?.some(x => (b.tags as string[]).includes(x)) ?? false);
    return hit ? TOTEM_WEIGHT : 1;
  };
}
/** Does this base belong in this hero's loot? (Only the Crawl sorts loot by class, and by weapon mastery.) */
export function classFits(h: Hero, b: GearBase): boolean {
  if (!h.f.persist["classLoot"] || (b.kind !== "weapon" && b.kind !== "off")) return true;
  const fam = classify(b).family;
  const fams = CLASS_FAMILIES[h.origin];
  if (fams && !fams.includes(fam)) return false;
  // Weapon mastery: a family's weapons join the pool a few at a time as you master it.
  return masteryOpen(b, h.f.persist[`wm_${fam}`] ?? 0);
}

/** Each weapon family's bases in the order mastery opens them (the plainest first, then by floor and name). */
let FAMILY_ORDER: Map<string, number> | null = null;
function familyRank(b: GearBase): { rank: number; size: number } {
  if (!FAMILY_ORDER) {
    FAMILY_ORDER = new Map();
    const by = new Map<string, GearBase[]>();
    for (const g of GEAR_BASES) {
      if ((g.kind !== "weapon" && g.kind !== "off") || g.legendary) continue;
      const f = classify(g).family;
      if (!(MASTERY_FAMILIES as string[]).includes(f)) continue;
      (by.get(f) ?? by.set(f, []).get(f)!).push(g);
    }
    for (const [f, list] of by) {
      list.sort((x, y) => (x.floorMin ?? 0) - (y.floorMin ?? 0) || (x.onlyRarity ? 1 : 0) - (y.onlyRarity ? 1 : 0) || x.id.localeCompare(y.id));
      list.forEach((g, i) => FAMILY_ORDER!.set(g.id, i));
      FAMILY_ORDER.set(`#${f}`, list.length);
    }
  }
  const rank = FAMILY_ORDER.get(b.id);
  return rank === undefined ? { rank: -1, size: 0 } : { rank, size: FAMILY_ORDER.get(`#${classify(b).family}`) ?? 0 };
}
/** How much of a family is open at a mastery level: two-fifths at first, all of it at level 10. */
export const masteryShare = (level: number) => Math.min(1, 0.4 + 0.06 * level);
export function masteryOpen(b: GearBase, level: number): boolean {
  const { rank, size } = familyRank(b);
  if (rank < 0) return true;
  return rank < Math.max(3, Math.ceil(size * masteryShare(level)));
}
/** How many of a family's weapons are in the pool at a mastery level, out of how many. */
export function familyOpenCount(fam: string, level: number): { open: number; total: number } {
  familyRank(GEAR_BASES[0]);
  const total = FAMILY_ORDER!.get(`#${fam}`) ?? 0;
  return { open: Math.min(total, Math.max(3, Math.ceil(total * masteryShare(level)))), total };
}

export type Odds = Partial<Record<Rarity, number>>;

export const TABLES = {
  wooden: { common: 70, uncommon: 30 },
  // (Epics and Legendaries a little more often since 1.85: a rare iron chest holds one now.)
  iron: { uncommon: 72, rare: 25, epic: 2.6, legendary: 0.4 },
  drop: { common: 66.5, uncommon: 28, rare: 5.5 },
  elite: { uncommon: 62, rare: 32, epic: 5, legendary: 1 },
  champion: { uncommon: 16, rare: 64, epic: 15, legendary: 5 },
  boss: { rare: 86, epic: 11, legendary: 3 },
  /** Crimson Elites: harder, better loot (and sometimes a Crimson Key). */
  crimson: { rare: 69, epic: 26, legendary: 5 },
  shop: { common: 14, uncommon: 56, rare: 28, epic: 2 }
} satisfies Record<string, Odds>;

/** Campaign boss picks grow richer floor by floor: early bosses mostly offer Uncommons, a Rare is a treat. */
export function bossOdds(floor: number): Odds {
  if (floor <= 7) return { uncommon: 40, rare: 54, epic: 5, legendary: 1 };
  if (floor <= 14) return { uncommon: 25, rare: 66.2, epic: 7.2, legendary: 1.6 };
  return TABLES.boss;
}

/** Abyss drop tables: far richer than the campaign, and richest from the toughest foes (Champions, bosses, Uber bosses). */
export const ABYSS_TABLES = {
  ...TABLES,
  wooden: { uncommon: 48, rare: 44, epic: 8 },
  iron: { rare: 63, epic: 31, legendary: 6 },
  elite: { uncommon: 48, rare: 44, epic: 7.2, legendary: 0.8 },
  champion: { rare: 63, epic: 29, legendary: 8 },
  boss: { rare: 40, epic: 44, legendary: 16 },
  uber: { epic: 63, legendary: 37 },
  crimson: { rare: 48, epic: 40, legendary: 12 }
} satisfies Record<string, Odds>;

/** Resplendent card odds: Epic and Legendary grow with depth, and are rare early on. */
export function resplendentOdds(floor: number): Odds {
  const legendary = Math.min(6.5, 0.4 + 0.55 * (floor - 1));
  const epic = Math.min(18, 2 + 1.45 * (floor - 1));
  const rare = 34;
  return { uncommon: 100 - legendary - epic - rare, rare, epic, legendary };
}

/**
 * Fortune: the deeper you go, the better every find. The boost is small (a few % per floor on Rare and up),
 * but the game tells you about it, to make delving deeper feel worth it.
 */
export const fortune = (floor: number) => 1 + 0.03 * Math.min(floor - 1, 4) + 0.01 * Math.max(0, floor - 5);
/** Fortune shown to the player: one ✦ per floor reached, up to ten. */
export const fortunePips = (floor: number) => Math.min(10, floor);

export function withFortune(odds: Odds, floor: number): Odds {
  const f = fortune(floor);
  const out: Odds = { ...odds };
  for (const r of ["rare", "epic", "legendary"] as const) if (out[r]) out[r] = out[r]! * f;
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

/** (Early floors used to turn most Legendaries into Epics; they no longer do. Kept so callers stay simple.) */
export function earlyCap(_h: Hero, rarity: Rarity, _rng: () => number, _floor = 1): Rarity {
  return rarity;
}

/** Snake Eyes Legendaries turn up once you've rolled this many 1s in a run; the Talentless once you've turned a talent down and hold none. */
export const SNAKE_ONES = 20;
/** Most Legendaries can turn up from floor 1 (only the strongest wait for floor 4 or deeper). */
const legFloor = (l: GearBase) => { const m = l.legendary?.minFloor ?? 1; return m <= 3 ? 1 : m; };
const minOK = (_h: Hero, floor: number, n: number) => floor >= n;
export const unlocked = (h: Hero, l: GearBase) =>
  !l.unlock || (l.unlock === "snake" ? (h.f.persist["onesRolled"] ?? 0) >= SNAKE_ONES : (h.f.persist["talentsSkipped"] ?? 0) > 0 && Object.values(h.talents).every(n => !n));

/** What the affix roller needs to know about the hero. */
function rollCtx(h: Hero, floor: number): RollCtx {
  const tags = heroTags(h);
  return { origin: h.origin, heat: h.heat ?? 0, everCursed: (h.f.persist["everCursed"] ?? 0) > 0, floor, locked: LOCKED, crawl: !!h.f.persist["classLoot"], classLayers: h.f.persist["classLayers"] ?? 0,
    tagWeight: t => (1 + 0.25 * t.reduce((s, x) => s + Math.min(tags.get(x) ?? 0, 3), 0)) * elementalW(t) };
}
/** Roll an item's affix lines for its tier. */
export const affixesFor = (h: Hero, base: GearBase, rarity: Rarity, floor: number, rng: () => number, n?: number, keep?: Record<string, number>, grade?: Grade) =>
  rollAffixes(base, rarity, floor, rng, rollCtx(h, floor), n, keep, grade);

export function rollItem(h: Hero, rarity: Rarity, floor: number, rng: () => number): GearItem {
  const it = rollItemRaw(h, rarity, floor, rng);
  if (h.f.persist["classLoot"]) rollAttrLine(it, rng);
  return it;
}

/** How big an attribute line is, by rarity (a range: low to high). */
export const ATTR_LINE: Partial<Record<Rarity, [number, number]>> = { uncommon: [1, 1], rare: [1, 2], epic: [3, 5], legendary: [4, 6], crimson: [5, 7], epic_crimson: [6, 8], legendary_crimson: [7, 9] };
/** How often an item of each rarity comes with one. */
export const ATTR_LINE_CHANCE: Partial<Record<Rarity, number>> = { uncommon: 0.3, rare: 0.4, epic: 0.5, legendary: 0.6, crimson: 0.6, epic_crimson: 0.7, legendary_crimson: 0.7 };
type A = NonNullable<GearItem["attr"]>["a"];
/** Which attributes a kind of gear leans toward (weights). Light armour is mostly Agility, but not always. */
export function attrLeans(base: GearBase): Partial<Record<A, number>> {
  const c = classify(base);
  if (base.kind === "trinket") return { str: 1, agi: 1, int: 1, fai: 1, vit: 1, for: 1.3 };
  if (base.kind === "armour") {
    if (/robe|vestment|habit|mantle|shroud/i.test(base.name)) return { int: 3, fai: 3, vit: 1, for: 0.6 };
    return c.load === "heavy" ? { str: 3, vit: 3, fai: 0.8 } : c.load === "medium" ? { vit: 3, str: 2, agi: 2, for: 0.6 } : { agi: 4, vit: 1.5, for: 1.5 };
  }
  if (c.family === "shield") return c.load === "light" ? { agi: 2, str: 2, vit: 1 } : { str: 3, vit: 3, fai: 1 };
  if (c.family === "focus" || c.family === "arcane") return base.tags.includes("Holy") ? { fai: 4, int: 2, vit: 1 } : { int: 4, fai: 1.5, for: 0.6 };
  if (base.tags.includes("Holy")) return { fai: 4, str: 2, vit: 1 };
  if (c.family === "knife" || c.family === "ranged" || c.family === "throwable") return { agi: 4, for: 1.5, int: 0.6 };
  if (c.family === "shortblade") return { agi: 3, str: 2, for: 1 };
  return { str: 4, vit: 2, agi: 0.6 };
}
/** Now and then, Uncommon-and-up gear in the Crawl gets "+N" to an attribute. */
export function rollAttrLine(it: GearItem, rng: () => number) {
  const range = ATTR_LINE[it.rarity], chance = ATTR_LINE_CHANCE[it.rarity] ?? 0;
  if (!range || rng() >= chance) return;
  const leans = Object.entries(attrLeans(baseOf(it.base))) as [A, number][];
  let x = rng() * leans.reduce((s, [, w]) => s + w, 0);
  let a = leans[leans.length - 1][0];
  for (const [k, w] of leans) { x -= w; if (x < 0) { a = k; break; } }
  it.attr = { a, n: range[0] + Math.floor(rng() * (range[1] - range[0] + 1)) };
}

function rollItemRaw(h: Hero, rarity: Rarity, floor: number, rng: () => number): GearItem {
  affixPool();
  rarity = earlyCap(h, rarity, rng, floor);
  // Ill Fortune (curse): about a third of Rare, Epic and Legendary finds come out one rarity lower.
  if ((h.curses["c_ill_fortune"] ?? 0) > 0 && (rarity === "rare" || rarity === "epic" || rarity === "legendary") && rng() < 0.3)
    rarity = rarity === "legendary" ? "epic" : rarity === "epic" ? "rare" : "uncommon";
  const tags = heroTags(h);
  // Half of most drops come from the item generator (fewer Legendaries and Crimson: the hand-made ones are special).
  if (GEN_ON && (GEN_SHARE[rarity] ?? 0) > 0 && rng() < GEN_SHARE[rarity]!) {
    const g = rollGenerated(h, rarity, floor, rng);
    if (g) return g;
  }
  if (rarity === "crimson") {
    const pool = CRIMSON.filter(c => !DROPPED.has(c.id) && classFits(h, c));
    const base = weighted(rng, pool.length ? pool : CRIMSON, b => (1 + 0.15 * b.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)) * elementalW(b.tags));
    DROPPED.add(base.id);
    return { uid: h.nextUid++, base: base.id, rarity: "crimson", level: floor, bonuses: affixesFor(h, base, "crimson", floor, rng), revealed: true, bash: rollBash("crimson", base, rng) };
  }
  if (rarity === "legendary") {
    const pool = LEGENDARIES.filter(l => classFits(h, l) && minOK(h, floor, legFloor(l)) && (h.heat ?? 0) >= (l.heatMin ?? 0) && unlocked(h, l) && !LOCKED.has(l.id) && !DROPPED.has(l.id));
    if (pool.length === 0) rarity = "epic";
    else {
      // A gentle lean toward your build; Legendaries should feel like a surprise, not a fixed path.
      const base = weighted(rng, pool, b => (1 + 0.15 * b.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)) * elementalW(b.tags));
      DROPPED.add(base.id);
      return { uid: h.nextUid++, base: base.id, rarity: "legendary", level: floor, bonuses: affixesFor(h, base, "legendary", floor, rng), revealed: false, bash: rollBash("legendary", base, rng) };
    }
  }
  const fav = new Set(AFFINITY[h.origin]);
  const tw = totemWeigher(h);
  const base: GearBase = weighted(rng, GEAR_BASES.filter(g => classFits(h, g) && (!LOCKED.has(g.id) || (g.deep && floor > 5)) && minOK(h, floor, g.floorMin ?? 0) && (h.heat ?? 0) >= (g.heatMin ?? 0) && (!g.needsCurse || (h.f.persist["everCursed"] ?? 0) > 0) && (!g.forClass || g.forClass === h.origin) && (g.weight ?? 1) > 0 && (!g.onlyRarity || g.onlyRarity === rarity || (CONVERTED.has(g.id) && rank(rarity) >= rank(g.onlyRarity))) && rank(rarity) >= rank(g.minItemRarity ?? "common")), b => tagWeight(tags, b.tags) * (fav.has(b.id) ? 2.2 : 1) * (b.weight ?? 1) * elementalW(b.tags) * (tw ? tw(b) : 1));
  // Rarity is the number of affix lines: Uncommon 1, Rare 2, Epic 3.
  const bonuses = affixesFor(h, base, rarity, floor, rng);
  return { uid: h.nextUid++, base: base.id, rarity, level: floor, bonuses, revealed: true, bash: rollBash(rarity, base, rng), bare: CONVERTED.has(base.id) || undefined };
}

/** The old item generator is retired: its lines live on in the affix pool. */
let GEN_ON = false;
/** Turn the item generator on or off (tests of hand-made loot switch it off). */
export const setGenEnabled = (on: boolean) => { GEN_ON = on; };

/** A generated item: a form from the ordinary pool (no hand-made Legendaries), built up by the generator. */
export function rollGenerated(h: Hero, rarity: Rarity, floor: number, rng: () => number, depth = floor): GearItem | null {
  const tags = heroTags(h);
  const fav = new Set(AFFINITY[h.origin]);
  const pool = GEAR_BASES.filter(g => classFits(h, g) && !g.legendary && (!LOCKED.has(g.id) || (g.deep && floor > 5)) && minOK(h, floor, g.floorMin ?? 0) && (h.heat ?? 0) >= (g.heatMin ?? 0) && (!g.needsCurse || (h.f.persist["everCursed"] ?? 0) > 0) && (!g.forClass || g.forClass === h.origin)
    && (g.weight ?? 1) > 0 && !g.noJewel && (!g.onlyRarity || g.onlyRarity === rarity || (rank(rarity) >= rank("rare") && rank(g.onlyRarity) <= rank("rare"))));
  if (!pool.length) return null;
  const base = weighted(rng, pool, b => tagWeight(tags, b.tags) * (fav.has(b.id) ? 2.2 : 1) * (b.weight ?? 1) * elementalW(b.tags));
  const gen = generate(base, rarity, floor, depth, rng, tags, LOCKED);
  return { uid: h.nextUid++, base: base.id, rarity, level: floor, bonuses: {}, revealed: true, bash: rollBash(rarity === "crimson" ? "crimson" : rarity, base, rng), gen };
}


export type ResplendentCard = { kind: "item"; item: GearItem } | { kind: "scroll" };

export interface LootState {
  /** Bad-luck protection: bonus % added to Epic and Legendary on Resplendent cards. */
  pity: number;
  /** Hidden bad-luck ladders (percentage points): Rare-or-better, Epic and Legendary, and the dry spells behind them. */
  ladder?: { rare: number; epic: number; leg: number; dryEpic: number; dryLeg: number };
}
export const LADDER = { RARE_START: -5, RARE_STEP: 1.5, RARE_CAP: 30, EPIC_STEP: 0.5, EPIC_SOFT_AFTER: 15, EPIC_SOFT_STEP: 3, LEG_STEP: 0.2, LEG_HARD: 60 };
const ladderOf = (s: LootState) => (s.ladder ??= { rare: LADDER.RARE_START, epic: 0, leg: 0, dryEpic: 0, dryLeg: 0 });
const LOW: Rarity[] = ["common", "uncommon"];
/** Move `pts` points of chance from the low tiers (in proportion) to `to` (negative: back from `to` to Uncommon). */
function shift(out: Odds, to: Rarity, pts: number) {
  if (!pts) return;
  if (pts < 0) { const take = Math.min(out[to] ?? 0, -pts); out[to] = (out[to] ?? 0) - take; out.uncommon = (out.uncommon ?? 0) + take; return; }
  const low = LOW.reduce((s, r) => s + (out[r] ?? 0), 0);
  if (low <= 0) return;
  const take = Math.min(low, pts);
  for (const r of LOW) if (out[r]) out[r] = out[r]! - take * (out[r]! / low);
  out[to] = (out[to] ?? 0) + take;
}
/** Odds with the hidden ladders applied (only where the table can give that tier at all). */
export function ladderOdds(s: LootState, odds: Odds): Odds {
  const l = ladderOf(s);
  const out: Odds = { ...odds };
  if (out.rare !== undefined) shift(out, "rare", l.rare);
  if (out.rare !== undefined || out.epic !== undefined) shift(out, "epic", l.epic);
  if (out.epic !== undefined || out.legendary !== undefined) shift(out, "legendary", l.leg);
  return out;
}
/** Hard pity: this many items without a Legendary, and the next table that can give an Epic gives a Legendary. */
export const legendaryDue = (s: LootState, odds: Odds) => ladderOf(s).dryLeg >= LADDER.LEG_HARD && (odds.epic !== undefined || odds.legendary !== undefined);
/** Climb or reset the ladders after a find. */
export function noteFind(s: LootState, r: Rarity) {
  const l = ladderOf(s);
  const rank = RARITIES.indexOf(r);
  if (rank >= RARITIES.indexOf("rare")) l.rare = LADDER.RARE_START; else l.rare = Math.min(LADDER.RARE_CAP, l.rare + LADDER.RARE_STEP);
  if (rank >= RARITIES.indexOf("epic")) { l.epic = 0; l.dryEpic = 0; }
  else { l.dryEpic++; l.epic += l.dryEpic > LADDER.EPIC_SOFT_AFTER ? LADDER.EPIC_SOFT_STEP : LADDER.EPIC_STEP; }
  if (r === "legendary" || rank > RARITIES.indexOf("legendary")) { l.leg = 0; l.dryLeg = 0; }
  else { l.dryLeg++; l.leg += LADDER.LEG_STEP; }
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

/** Epic Crimson: one of the Abyss items you haven't had this run, with three rolled bonuses. Only the bosses of floors 20–24 drop them. */
export function rollEpicCrimson(h: Hero, floor: number, rng: () => number): GearItem {
  const pool = EPIC_CRIMSON.filter(e => !DROPPED.has(e.id));
  const base = (pool.length ? pool : EPIC_CRIMSON)[Math.floor(rng() * (pool.length || EPIC_CRIMSON.length))];
  DROPPED.add(base.id);
  return { uid: h.nextUid++, base: base.id, rarity: "epic_crimson", level: floor, bonuses: affixesFor(h, base, "epic_crimson", floor, rng), revealed: true };
}

/** A fixed reward item (Abaddon, the Cookie). */
export function makeRewardItem(h: Hero, id: string, floor: number, rng: () => number = Math.random): GearItem {
  affixPool();
  const base = GEAR_BASES.find(g => g.id === id) ?? EPIC_CRIMSON.find(g => g.id === id);
  return { uid: h.nextUid++, base: id, rarity: "legendary_crimson", level: floor, bonuses: base ? affixesFor(h, base, "legendary_crimson", floor, rng) : {}, revealed: true };
}
