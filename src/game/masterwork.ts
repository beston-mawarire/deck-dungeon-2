// The Masterwork: rework one affix line, extract an item's lines into a Scroll of Power, empower a Common with a scroll,
// and refine a Common so it can hold more. Paid for with Scrap, Azure dust (Rares), Orilium (Epics), Starmetal and Gold.
import type { GearBase, GearItem, Rarity } from "../engine/types";
import { affixById, type Grade } from "./affixpool";
import { classify, FAMILY_NAME, type Family } from "./families";
import { baseOf, findItem, type Hero, recompute } from "./hero";
import { affixesFor } from "./loot";

export interface PowerScroll { uid: number; family: Family; kind: GearBase["kind"]; rarity: Rarity; lines: Record<string, number> }
export interface Cost { scrap?: number; gold?: number; azure?: number; orilium?: number; starmetal?: number }

export const SCROLL_SLOTS = 6;
export const MAX_REWORKS = 5;
export const MAX_REFINE = 3;
/** Lines a Common holds: 1, then 2, 3 and 4 with each Refine dot. */
export const capacity = (it: GearItem) => 1 + (it.refine ?? 0);
const NO_CRAFT: Rarity[] = ["legendary", "epic_crimson", "legendary_crimson"];

const lineCount = (it: GearItem) => Object.keys(it.bonuses).length;
export const canEmpowerTarget = (it: GearItem) => it.rarity === "common" && !baseOf(it.base).legendary;

// ---------- Costs ----------
const REWORK_BASE: Partial<Record<Rarity, Cost>> = {
  common: { scrap: 5 }, uncommon: { scrap: 5 }, rare: { scrap: 6, azure: 1 }, epic: { orilium: 1, starmetal: 1 },
  legendary: { orilium: 2, starmetal: 1 }, crimson: { orilium: 2, starmetal: 1 }
};
const scale = (c: Cost, f: number): Cost => Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.ceil((v as number) * f)])) as Cost;
export function reworkCost(it: GearItem): Cost | null {
  const b = REWORK_BASE[it.rarity];
  return b ? scale(b, Math.pow(1.5, it.reworks ?? 0)) : null;
}
export function refineCost(it: GearItem, goldMult = 1): Cost {
  const lvl = (it.refine ?? 0) + 1;
  const c: Cost = lvl === 1 ? { scrap: 8, gold: 40, azure: 1 } : lvl === 2 ? { scrap: 14, gold: 80, azure: 2, orilium: 1 } : { scrap: 20, gold: 140, orilium: 2, starmetal: 1 };
  c.gold = Math.round(c.gold! * goldMult);
  return c;
}
export function canAfford(h: Hero, c: Cost): string | null {
  const have = { scrap: h.scrap, gold: h.f.gold, azure: h.azure ?? 0, orilium: h.orilium ?? 0, starmetal: h.starmetal };
  const name = { scrap: "Scrap", gold: "Gold", azure: "Azure dust", orilium: "Orilium", starmetal: "Starmetal" };
  for (const [k, v] of Object.entries(c) as [keyof Cost, number][]) if (v && have[k] < v) return `Needs ${v} ${name[k]} (you have ${have[k]}).`;
  return null;
}
function pay(h: Hero, c: Cost) {
  h.scrap -= c.scrap ?? 0; h.f.gold -= c.gold ?? 0; h.starmetal -= c.starmetal ?? 0;
  h.azure = (h.azure ?? 0) - (c.azure ?? 0); h.orilium = (h.orilium ?? 0) - (c.orilium ?? 0);
}
export const costText = (c: Cost) => [c.scrap ? `${c.scrap} ⚙️` : "", c.gold ? `${c.gold} 🪙` : "", c.azure ? `${c.azure} 💠` : "", c.orilium ? `${c.orilium} 🔶` : "", c.starmetal ? `${c.starmetal} ✴️` : ""].filter(Boolean).join(" ");

// ---------- Rework ----------
/** Why this line can't be reworked (or null). */
export function reworkBlock(it: GearItem, line: string): string | null {
  if (!(line in it.bonuses)) return "That line isn't on this item.";
  if (!reworkCost(it)) return "This item can't be reworked.";
  if (it.reworkLine && it.reworkLine !== line) return "Only one line on an item can ever be reworked, and this item's is already chosen.";
  if ((it.reworks ?? 0) >= MAX_REWORKS) return "This item can't be reworked any more.";
  return null;
}
/** Pay and roll two new options for one line (same grade, no clashing groups). The cost is spent whatever you pick. */
export function rework(h: Hero, uid: number, line: string, rng: () => number): { options: Record<string, number>[] } | string {
  const found = findItem(h, uid);
  if (!found) return "No such item.";
  const it = found.item;
  const why = reworkBlock(it, line);
  if (why) return why;
  const cost = reworkCost(it)!;
  const short = canAfford(h, cost);
  if (short) return short;
  pay(h, cost);
  it.reworkLine = line;
  it.reworks = (it.reworks ?? 0) + 1;
  const grade: Grade = affixById(line)?.grade ?? "minor";
  const rest = { ...it.bonuses };
  delete rest[line];
  const base = baseOf(it.base);
  const tier = it.lineTier?.[line] ?? it.rarity;
  const options: Record<string, number>[] = [];
  for (let i = 0; i < 2; i++) {
    const exclude = { ...rest, ...Object.assign({}, ...options) };
    const o = affixesFor(h, base, tier, it.level, rng, 1, { ...exclude, [line]: 1 }, grade);
    if (Object.keys(o).length) options.push(o);
  }
  return { options };
}
/** Take one of the rolled options (or keep the line as it was: pass null). */
export function applyRework(h: Hero, uid: number, line: string, option: Record<string, number> | null) {
  const found = findItem(h, uid);
  if (!found || !option) return;
  const it = found.item;
  const [id, v] = Object.entries(option)[0];
  const tier = it.lineTier?.[line];
  const next: Record<string, number> = {};
  for (const [k, n] of Object.entries(it.bonuses)) if (k === line) next[id] = v; else next[k] = n;
  it.bonuses = next;
  if (tier) { delete it.lineTier![line]; it.lineTier![id] = tier; }
  it.reworkLine = id;
  recompute(h);
}

// ---------- Extract ----------
export function extractBlock(h: Hero, it: GearItem): string | null {
  if (NO_CRAFT.includes(it.rarity) || baseOf(it.base).legendary) return "Legendaries can't be extracted.";
  if (it.bound) return "Empowered items are bound: their lines can't be lifted again.";
  if (!lineCount(it)) return "This item has no lines to extract.";
  if ((h.powerScrolls ?? []).length >= SCROLL_SLOTS) return `Your Scrolls tab is full (${SCROLL_SLOTS}). Use or scrap one first.`;
  return null;
}
/** Lift every line off an item into a Scroll of Power; the item becomes a plain Common. */
export function extract(h: Hero, uid: number): PowerScroll | string {
  const found = findItem(h, uid);
  if (!found) return "No such item.";
  const it = found.item;
  const why = extractBlock(h, it);
  if (why) return why;
  const base = baseOf(it.base);
  const scroll: PowerScroll = { uid: h.nextUid++, family: classify(base).family, kind: base.kind, rarity: it.rarity === "common" ? "uncommon" : it.rarity, lines: { ...it.bonuses } };
  h.powerScrolls = [...(h.powerScrolls ?? []), scroll];
  it.bonuses = {};
  it.rarity = "common";
  delete it.lineTier; delete it.reworkLine; delete it.reworks;
  recompute(h);
  return scroll;
}
export const scrollName = (s: PowerScroll) => `${s.rarity === "crimson" ? "Crimson " : ""}Scroll of Power · ${FAMILY_NAME[s.family]}`;

// ---------- Empower ----------
export function empowerBlock(it: GearItem, s: PowerScroll, keep: string[]): string | null {
  if (!canEmpowerTarget(it)) return "Only Common items (plain or Refined) can be Empowered.";
  const b = baseOf(it.base);
  if (b.kind !== s.kind || classify(b).family !== s.family) return `This scroll only fits ${FAMILY_NAME[s.family]} items.`;
  if (!keep.length) return "Keep at least one line.";
  const free = capacity(it) - lineCount(it);
  if (keep.length > free) return `This item has room for ${free} more line${free === 1 ? "" : "s"}${(it.refine ?? 0) < MAX_REFINE ? ": Refine it to hold more, or strike lines out" : ""}.`;
  const groups = new Set(Object.keys(it.bonuses).map(id => affixById(id)?.group ?? id));
  if (keep.some(id => groups.has(affixById(id)?.group ?? id))) return "The item already has a line like one of these.";
  return null;
}
/** Put the kept lines of a scroll onto a Common item. The scroll is used up and the item is bound for good. */
export function empower(h: Hero, scrollUid: number, uid: number, keep: string[]): string | null {
  const s = (h.powerScrolls ?? []).find(x => x.uid === scrollUid);
  const found = findItem(h, uid);
  if (!s || !found) return "Nothing to empower.";
  const it = found.item;
  const why = empowerBlock(it, s, keep);
  if (why) return why;
  it.lineTier = it.lineTier ?? {};
  for (const id of keep) { it.bonuses[id] = s.lines[id]; it.lineTier[id] = s.rarity; }
  it.bound = true;
  h.powerScrolls = (h.powerScrolls ?? []).filter(x => x.uid !== scrollUid);
  recompute(h);
  return null;
}

// ---------- Refine ----------
export function refineBlock(h: Hero, it: GearItem, goldMult = 1): string | null {
  if (!canEmpowerTarget(it)) return "Only Common items can be Refined.";
  if ((it.refine ?? 0) >= MAX_REFINE) return "This item is as refined as it gets.";
  return canAfford(h, refineCost(it, goldMult));
}
export function refine(h: Hero, uid: number, goldMult = 1): string | null {
  const found = findItem(h, uid);
  if (!found) return "No such item.";
  const why = refineBlock(h, found.item, goldMult);
  if (why) return why;
  pay(h, refineCost(found.item, goldMult));
  found.item.refine = (found.item.refine ?? 0) + 1;
  recompute(h);
  return null;
}

// ---------- Scrolls ----------
const SCROLL_SCRAP: Partial<Record<Rarity, Cost>> = { uncommon: { scrap: 3 }, rare: { azure: 1 }, epic: { orilium: 1 }, crimson: { starmetal: 2 } };
export const scrollScrapValue = (s: PowerScroll): Cost => SCROLL_SCRAP[s.rarity] ?? { scrap: 3 };
export function scrapScroll(h: Hero, uid: number): Cost | null {
  const s = (h.powerScrolls ?? []).find(x => x.uid === uid);
  if (!s) return null;
  const v = scrollScrapValue(s);
  h.scrap += v.scrap ?? 0; h.azure = (h.azure ?? 0) + (v.azure ?? 0); h.orilium = (h.orilium ?? 0) + (v.orilium ?? 0); h.starmetal += v.starmetal ?? 0;
  h.powerScrolls = (h.powerScrolls ?? []).filter(x => x.uid !== uid);
  return v;
}

