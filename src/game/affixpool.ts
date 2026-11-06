// The affix pool: every line an item can roll. Rarity is how many affixes an item carries (Uncommon 1, Rare 2, Epic 3,
// Legendary 3 + its ✦ special, Crimson tiers 4 + their ✦), and higher tiers reach stronger grades.
//
// The pool is built from what the game already had:
//  - Minor: the rolled bonuses ("of Might") and the generator's stat lines. Their value grows with tier and item level.
//  - Major: the generator's trigger → payload lines (value grows too), and the effects of hand-made Uncommon and Rare items.
//  - Grand: the old Epic powers and the effects of hand-made Epic items.
// A hand-made item's effect now lives here (as "fx_<item id>"), and that item no longer drops as a base of its own.
import type { GearBase, HookDef, OriginId, Rarity, Tag } from "../engine/types";
import { register } from "../engine/registry";
import { BONUSES, EPIC_POWERS, GEAR_BASES } from "../data";
import { GEN_MAJORS, GEN_MINORS, type GenModule } from "../data/genparts";
import { ABILITY_DEFS, ABILITY_LINES } from "../data/abilities";
import { modValue } from "./gen";
import { classify, type Family, type Load } from "./families";
import { AFFIX_FIXES } from "../data/affixfixes";

export type Grade = "minor" | "major" | "grand";
export interface Affix {
  id: string;
  def: HookDef;
  grade: Grade;
  /** No two affixes of one group on an item. */
  group: string;
  /** Which kinds of item it can roll on. */
  kinds: GearBase["kind"][];
  /** Only these families (none: any family of those kinds). */
  families?: Family[];
  /** Only these weights (heavy-only and light-only lines). */
  loads?: Load[];
  /** Value grows with tier and level (minor stat lines and generator lines); otherwise a fixed effect (stacks 1). */
  gen?: GenModule;
  bonus?: boolean;
  weight: number;
  forClass?: OriginId;
  heatMin?: number;
  needsCurse?: boolean;
  floorMin?: number;
  /** The Crawl only, and only once your class has beaten this many layers. */
  crawlOnly?: boolean;
  classLayers?: number;
  tags: Tag[];
}

const WEAPON_GROUPS: Record<string, Family[]> = {
  blade: ["knife", "shortblade", "greatblade", "polearm", "ranged"],
  blunt: ["blunt", "breaker"],
  breaking: ["blunt", "breaker"],
  spell: ["arcane"]
};

/** Strip what described the old item's own body (its Armor and Max HP, "Shield.", "Dagger.", "Works in the off-hand.",
 *  the Heat or floor it needed) from an effect text, keeping only what the effect itself does. */
export function cleanText(text: string, b?: Pick<GearBase, "armor" | "maxHp">): string {
  let t = text.trim();
  const lead = [
    /^(Light|Medium|Heavy|Robe)( armour)?:\s*/i,
    /^Shield\.\s*/,
    /^Heatforged \(Heat \d\+\)\.\s*/,
    /^From floor \d+\.\s*/,
    /^(One|Two)-handed(,? Heavy)?( staff)?\.\s*/i,
    /^Heavy\.\s*/,
    /^Elemental Barrier:[^.]*\.\s*/,
    /^Medium armour\.\s*/i,
    /^(A )?[Gg]reater [^.]*\.\s*/,
    /^\+\d+ Armor\.\s*/,
    /^[A-Z][a-z'’-]+(?: [a-z'’-]+)?\.\s+(?=[A-Z+])/
  ];
  for (let again = true; again;) {
    again = false;
    for (const re of lead) { const n = t.replace(re, ""); if (n !== t) { t = n; again = true; } }
  }
  t = t.replace(/\s*Works in the off-hand\.?/g, "");
  // The body's own Armor and Max HP are the base's, not the effect's.
  for (const frag of [b?.armor ? `\\+${b.armor} Armor` : null, b?.maxHp ? `\\+${b.maxHp} Max HP` : null]) {
    if (!frag) continue;
    t = t.replace(new RegExp(`^${frag}(,\\s*| and |\\.\\s*)`), "").replace(new RegExp(`(,\\s*| and )${frag}(?=[.,]|$)`), "").replace(new RegExp(`^${frag}$`), "");
  }
  t = t.replace(/^[,.\s]+/, "").replace(/\s{2,}/g, " ").trim();
  return /[a-z0-9]/i.test(t) ? t : "";
}

const hasHooks = (b: GearBase) => Object.keys(b.hooks ?? {}).length > 0;
const GRADE_OF: Partial<Record<Rarity, Grade>> = { uncommon: "minor", rare: "major", epic: "grand" };

let POOL: Affix[] | null = null;
/** Hand-made items whose effect moved into the pool (they no longer drop as bases, and their own hooks no longer apply). */
export const CONVERTED = new Set<string>();

export function affixPool(): Affix[] {
  if (POOL) return POOL;
  const out: Affix[] = [];
  const ALL_KINDS: GearBase["kind"][] = ["weapon", "off", "armour", "trinket"];
  // ---- Minor: rolled bonuses ----
  for (const b of BONUSES) out.push({ id: b.id, def: b, grade: b.minRarity === "rare" ? "major" : "minor", group: b.id, kinds: ALL_KINDS, bonus: true, weight: 1.4, tags: b.tags });
  // ---- Minor: the generator's stat lines (Damage, Armor and Max HP are already bonuses) ----
  for (const m of GEN_MINORS) {
    if (["gm_damage", "gm_armor", "gm_hp"].includes(m.id)) continue;
    const kinds = m.slots ? ALL_KINDS.filter(k => m.slots!.includes(k === "weapon" ? "main" : k === "off" ? "off" : k === "armour" ? "armour" : "trinket")) : ALL_KINDS;
    // (Staff damage only rolls on staves, wands and foci.)
    out.push({ id: m.id, def: m, grade: "minor", group: m.group, kinds, gen: m, weight: m.weight ?? 1, tags: m.tags, families: m.id === "gm_staffdmg" ? ["arcane", "focus"] : undefined });
  }
  // ---- Major: the generator's trigger → payload lines ----
  for (const m of GEN_MAJORS) {
    const kinds = m.slots ? ALL_KINDS.filter(k => m.slots!.includes(k === "weapon" ? "main" : k === "off" ? "off" : k === "armour" ? "armour" : "trinket")) : ALL_KINDS;
    out.push({ id: m.id, def: m, grade: "major", group: m.group, kinds, gen: m, weight: 0.35 * (m.weight ?? 1), tags: m.tags });
  }
  // ---- Major: abilities on items (the Crawl) ----
  for (const ab of ABILITY_LINES) out.push({ id: `ab_${ab.skill}`, def: ABILITY_DEFS.find(d => d.id === `ab_${ab.skill}`)!, grade: "major", group: "ability", kinds: ab.kinds, families: ab.families, loads: ab.loads, weight: 1.6, crawlOnly: true, classLayers: ab.layers, tags: [] });
  // ---- Grand: the old Epic powers ----
  for (const p of EPIC_POWERS) out.push({ id: p.id, def: p, grade: "grand", group: p.id, kinds: ALL_KINDS, weight: 1, tags: p.tags });
  // ---- Hand-made effects ----
  for (const b of GEAR_BASES) {
    const grade = b.onlyRarity ? GRADE_OF[b.onlyRarity] : undefined;
    if (!grade || !hasHooks(b) || b.legendary || (b.weight ?? 1) <= 0) continue;
    const text = cleanText(b.text, b);
    if (!text) continue;
    const c = classify(b);
    let families: Family[] | undefined;
    let loads: Load[] | undefined;
    if (b.kind === "weapon") families = c.family === "throwable" ? ["throwable"] : WEAPON_GROUPS[c.strike ?? "blade"];
    else if (b.kind === "off") families = [c.family];
    // Effects from heavy gear stay on heavy gear (heavy's own pay-off); quick, dodge-y effects from light gear stay light.
    if (c.load === "heavy" && b.kind !== "trinket") loads = ["heavy"];
    else if (c.load === "light" && (b.kind === "armour" || c.family === "knife" || (c.family === "shield" && c.load === "light")) && b.tags.includes("Tempo")) loads = ["light"];
    const id = `fx_${b.id}`;
    CONVERTED.add(b.id);
    // The quality pass: some lines are cut, reworded, regraded or narrowed.
    const fix = AFFIX_FIXES[id];
    if (fix?.action === "cut") continue;
    const def: HookDef = { id, name: b.name, kind: "bonus", tags: b.tags, text: fix?.text ?? text, hooks: b.hooks, forClass: b.forClass };
    out.push({ id, def, grade: fix?.grade ?? grade, group: id, kinds: fix?.kinds ?? [b.kind], families: fix?.families ?? families, loads: fix?.loads ?? loads, weight: 1, forClass: b.forClass, heatMin: b.heatMin, needsCurse: b.needsCurse, floorMin: b.floorMin, tags: b.tags });
  }
  register(out.filter(a => a.id.startsWith("fx_")).map(a => a.def));
  POOL = out;
  return out;
}
let BY_ID: Map<string, Affix> | null = null;
export const affixById = (id: string) => { if (!BY_ID) BY_ID = new Map(affixPool().map(a => [a.id, a])); return BY_ID.get(id); };

/** The tier an affix value is rolled at (generator lines): Uncommon 2 … Crimson 6. */
const TIER: Partial<Record<Rarity, number>> = { common: 1, uncommon: 2, rare: 3, epic: 4, legendary: 5, crimson: 6, epic_crimson: 7, legendary_crimson: 7 };
/** Rolled bonuses grow with tier as well as level. */
export const TIER_SCALE: Record<Rarity, number> = { common: 1, uncommon: 1, rare: 1.15, epic: 1.3, legendary: 1.4, crimson: 1.6, epic_crimson: 1.8, legendary_crimson: 2 };
/** Trinkets carry a little less of a value-scaled line. */
const SLOT_SCALE: Record<GearBase["kind"], number> = { weapon: 1, off: 0.85, armour: 0.9, trinket: 0.7 };

/** How strong an affix is on an item of this rarity, kind and level. Fixed effects are 1. */
export function affixValue(a: Affix, rarity: Rarity, kind: GearBase["kind"], level: number): number {
  if (a.gen) return Math.max(1, Math.round(modValue(a.gen, TIER[rarity] ?? 2, 0, level) * (a.gen.flat ? 1 : SLOT_SCALE[kind])));
  if (a.bonus) return Math.max(1, Math.round(level * TIER_SCALE[rarity] * SLOT_SCALE[kind]));
  return 1;
}

/** Affix lines per tier (✦ specials are extra, on Legendaries and Crimson). */
export const AFFIX_COUNT: Record<Rarity, number> = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 3, crimson: 4, epic_crimson: 4, legendary_crimson: 4 };
/** Which grade each line rolls at, per tier ("mm" = minor or major). */
const SLOTS: Record<Rarity, ("minor" | "major" | "grand" | "mm")[]> = {
  common: [],
  uncommon: ["mm"],
  rare: ["major", "mm"],
  epic: ["grand", "major", "mm"],
  legendary: ["major", "major", "mm"],
  crimson: ["grand", "major", "major", "mm"],
  epic_crimson: ["grand", "grand", "major", "major"],
  legendary_crimson: ["grand", "grand", "grand", "major"]
};

export interface RollCtx { origin: OriginId; heat: number; everCursed: boolean; floor: number; locked: Set<string>; tagWeight: (tags: readonly string[]) => number; crawl?: boolean; classLayers?: number }

/** Can this affix go on this base? */
export function fits(a: Affix, base: GearBase, ctx?: Pick<RollCtx, "origin" | "heat" | "everCursed" | "floor" | "crawl" | "classLayers">): boolean {
  if (!a.kinds.includes(base.kind)) return false;
  const c = classify(base);
  if (a.families && !a.families.includes(c.family)) return false;
  if (a.loads && !a.loads.includes(c.load)) return false;
  if (ctx) {
    if (a.forClass && a.forClass !== ctx.origin) return false;
    if (2 * (a.heatMin ?? 0) > ctx.heat) return false;
    if (a.needsCurse && !ctx.everCursed) return false;
    if ((a.floorMin ?? 0) > ctx.floor) return false;
    if (a.crawlOnly && !ctx.crawl) return false;
    if ((a.classLayers ?? 0) > (ctx.classLayers ?? 0)) return false;
  }
  return true;
}

/** Renown unlocks: a hand-made item still locked keeps its effect out of the pool too. */
const isLocked = (a: Affix, locked: Set<string>) => locked.has(a.id) || (a.id.startsWith("fx_") && locked.has(a.id.slice(3)));
const BY_BASE = new Map<string, Affix[]>();
/** The affixes that can ever go on this base (by kind, family and weight). */
export function forBase(base: GearBase): Affix[] {
  let l = BY_BASE.get(base.id);
  if (!l) { l = affixPool().filter(a => fits(a, base)); BY_BASE.set(base.id, l); }
  return l;
}

/** Roll the affix lines for an item: one per slot of its tier, never two from the same group. */
export function rollAffixes(base: GearBase, rarity: Rarity, level: number, rng: () => number, ctx: RollCtx, n = AFFIX_COUNT[rarity], keep: Record<string, number> = {}, gradeOnly?: Grade): Record<string, number> {
  const out: Record<string, number> = {};
  const groups = new Set<string>(Object.keys(keep).map(id => affixById(id)?.group ?? id));
  const usable = forBase(base).filter(a => fits(a, base, ctx) && !isLocked(a, ctx.locked));
  const plan = SLOTS[rarity].slice(0, n);
  while (plan.length < n) plan.push("mm");
  for (const slot of plan) {
    const grade: Grade = gradeOnly ?? (slot === "mm" ? (rng() < 0.55 ? "minor" : "major") : slot);
    let pool = usable.filter(a => a.grade === grade && !groups.has(a.group));
    if (!pool.length) pool = usable.filter(a => !groups.has(a.group));
    if (!pool.length) break;
    const w = pool.map(a => a.weight * ctx.tagWeight(a.tags) * (a.tags.some(t => base.tags.includes(t)) ? 1.4 : 1));
    let x = rng() * w.reduce((s, v) => s + v, 0);
    let pick = pool[pool.length - 1];
    for (let i = 0; i < pool.length; i++) { x -= w[i]; if (x < 0) { pick = pool[i]; break; } }
    groups.add(pick.group);
    out[pick.id] = affixValue(pick, rarity, base.kind, level);
  }
  return out;
}

/** After an item's level changes, set each affix's value for the new level (fixed effects stay at 1). */
export function rescaleAffixes(item: { bonuses: Record<string, number>; rarity: Rarity; level: number; lineTier?: Record<string, Rarity> }, kind: GearBase["kind"]) {
  for (const id of Object.keys(item.bonuses)) {
    const a = affixById(id);
    item.bonuses[id] = a ? affixValue(a, item.lineTier?.[id] ?? item.rarity, kind, item.level) : item.bonuses[id] + 1;
  }
}
