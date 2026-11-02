// The item generator: builds gear from a form (an existing base), a material, minor and major modules,
// an Epic-style signature on Epic and up, and sometimes a flaw. Every item spends a power budget set by its
// rarity and slot, so generated gear sits in the same band as hand-made gear. A few rolls break the rules on
// purpose: Greater grades (✦ ✦✦ ✦✦✦) and, very rarely, an Overcharged item with far more than its share.
import { EPIC_POWERS } from "../data";
import { GEN_FLAWS, GEN_MAJORS, GEN_MATERIALS, GEN_MINORS, GEN_MODULES, type GenMaterial, type GenModule, VEINED } from "../data/genparts";
import type { GearBase, GearItem, GenRecipe, Rarity, Slot, Tag } from "../engine/types";

export type { GenRecipe };

export const GEN_MODULE_MAP = new Map<string, GenModule>(GEN_MODULES.map(m => [m.id, m]));
export const GEN_MATERIAL_MAP = new Map<string, GenMaterial>([...GEN_MATERIALS, VEINED].map(m => [m.id, m]));

// ---------- Tuning (all in one place) ----------
/** Share of drops of each rarity that come from the generator (the rest are hand-made). */
export const GEN_SHARE: Partial<Record<Rarity, number>> = { common: 0.5, uncommon: 0.5, rare: 0.5, epic: 0.5, legendary: 0.35, crimson: 0.4 };
/** Power budget per rarity (tier points). */
const BUDGET: Partial<Record<Rarity, number>> = { common: 3, uncommon: 7, rare: 12, epic: 20, legendary: 30, crimson: 42 };
/** Slots don't all carry the same power (a weapon does the most). */
const SLOT_MOD: Record<Slot, number> = { main: 1, off: 0.8, armour: 0.9, trinket: 0.75 };
/** How many of each part, [min, max]. */
const COUNTS: Partial<Record<Rarity, { minor: [number, number]; major: [number, number]; sig: [number, number] }>> = {
  common: { minor: [0, 1], major: [0, 0], sig: [0, 0] },
  uncommon: { minor: [1, 2], major: [0, 1], sig: [0, 0] },
  rare: { minor: [1, 2], major: [1, 2], sig: [0, 0] },
  epic: { minor: [1, 2], major: [2, 3], sig: [1, 1] },
  legendary: { minor: [2, 2], major: [3, 4], sig: [1, 2] },
  crimson: { minor: [2, 3], major: [3, 4], sig: [1, 2] }
};
/** Chance that each module rolls Greater (and, more rarely, Grand or Mythic). */
const GREATER: Partial<Record<Rarity, number>> = { common: 0.02, uncommon: 0.03, rare: 0.04, epic: 0.05, legendary: 0.07, crimson: 0.09 };
export const GRADE_MULT = [1, 1.5, 2, 3];
export const GRADE_MARK = ["", "✦", "✦✦", "✦✦✦"];
export const GRADE_NAME = ["", "Greater", "Grand", "Mythic"];
/** Drawback chance: rare on Rare, Epic and Legendary, near-certain on Crimson-veined. */
const FLAW: Partial<Record<Rarity, number>> = { rare: 0.08, epic: 0.1, legendary: 0.12, crimson: 0.85 };
/** Overcharged items: rare on purpose (about 1 drop in 300, more from bosses, the Abyss and Heat). */
const BROKEN = 0.0033;
/** Innate (material) strength by rarity. */
const INNATE_TIER: Partial<Record<Rarity, number>> = { common: 2, uncommon: 2, rare: 3, epic: 4, legendary: 5, crimson: 6 };
const RANK: Rarity[] = ["common", "uncommon", "rare", "epic", "legendary", "crimson"];

/** Greater / Overcharged luck for the next rolls (set by who dropped it: Champions, bosses, the Abyss, Heat). */
let LUCK = 1;
export const setGenLuck = (n: number) => { LUCK = n; };

/** How strong a module is at a tier and grade on an item of this level. */
export function modValue(mod: GenModule, tier: number, grade: number, level: number): number {
  const tierF = 0.5 + 0.25 * (tier - 1);
  const lvlF = mod.flat ? 1 : Math.max(1, level);
  return Math.max(1, Math.round(mod.unit * tierF * (GRADE_MULT[grade] ?? 1) * lvlF));
}

const pickW = <T>(rng: () => number, items: T[], w: (t: T) => number): T | undefined => {
  const total = items.reduce((s, t) => s + Math.max(0, w(t)), 0);
  if (total <= 0) return undefined;
  let x = rng() * total;
  for (const t of items) { x -= Math.max(0, w(t)); if (x < 0) return t; }
  return items[items.length - 1];
};
const between = (rng: () => number, [a, b]: [number, number]) => a + Math.floor(rng() * (b - a + 1));
const affinity = (tags: Tag[], want: Set<Tag>, build: Map<string, number>) =>
  1 + 0.6 * tags.filter(t => want.has(t)).length + 0.25 * tags.reduce((s, t) => s + Math.min(build.get(t) ?? 0, 3), 0);

/** Roll a generated item of this rarity on this form. */
export function generate(base: GearBase, rarity: Rarity, level: number, depth: number, rng: () => number, build: Map<string, number> = new Map(), locked: Set<string> = new Set()): GenRecipe {
  const counts = COUNTS[rarity] ?? COUNTS.rare!;
  const slot = base.slot;
  const broken = rarity !== "common" && rng() < BROKEN * LUCK;
  // Material: deeper floors open rarer makes; Crimson-veined is its own.
  const mats = GEN_MATERIALS.filter(m => m.minDepth <= Math.max(1, depth) && (!m.slots || m.slots.includes(slot)));
  const want = new Set<Tag>(base.tags);
  const material = rarity === "crimson" ? VEINED : pickW(rng, mats, m => (m.weight ?? 1) * affinity(m.tags, want, build)) ?? GEN_MATERIALS[0];
  for (const t of material.tags) want.add(t);
  const rankBonus = Math.max(0, RANK.indexOf(rarity) - 1);
  const maxTier = Math.min(7, 2 + Math.floor(depth / 3) + rankBonus + (broken ? 2 : 0));
  let budget = (BUDGET[rarity] ?? 12) * SLOT_MOD[slot] * (broken ? 2.5 : 1);
  const recipe: GenRecipe = { m: material.id, mods: [], name: "" };
  const groups = new Set<string>();
  const fits = (m: GenModule) => (!m.slots || m.slots.includes(slot)) && !groups.has(m.group) && m.id !== material.innate;
  // A drawback first: it pays into the budget.
  if (!broken && rng() < (FLAW[rarity] ?? 0)) {
    const f = pickW(rng, GEN_FLAWS, () => 1)!;
    const t = Math.min(maxTier, 2 + Math.floor(rng() * 3));
    recipe.flaw = [f.id, t];
    budget += t * f.cost * 1.3;
  }
  // Signatures (Epic and up): one, sometimes two.
  const nSig = between(rng, counts.sig) + (broken && rarity !== "uncommon" && rarity !== "rare" ? 1 : 0);
  if (nSig > 0) {
    const sigs = EPIC_POWERS.filter(e => !locked.has(e.id));
    for (let i = 0; i < nSig; i++) {
      const pick = pickW(rng, sigs.filter(e => !recipe.sig?.includes(e.id)), e => affinity(e.tags, want, build));
      if (pick) (recipe.sig ??= []).push(pick.id);
    }
    budget -= nSig * 4;
  }
  const nMajor = between(rng, counts.major) + (broken ? 1 : 0);
  const nMinor = between(rng, counts.minor);
  const picks: GenModule[] = [];
  for (let i = 0; i < nMajor; i++) {
    const m = pickW(rng, GEN_MAJORS.filter(fits), x => (x.weight ?? 1) * affinity(x.tags, want, build));
    if (m) { picks.push(m); groups.add(m.group); }
  }
  for (let i = 0; i < nMinor; i++) {
    const m = pickW(rng, GEN_MINORS.filter(fits), x => (x.weight ?? 1) * affinity(x.tags, want, build));
    if (m) { picks.push(m); groups.add(m.group); }
  }
  // Spend the budget: each module gets its share, a little randomness, and maybe a Greater grade.
  let left = Math.max(picks.length, budget);
  picks.forEach((m, i) => {
    const share = left / (picks.length - i);
    let t = Math.max(1, Math.min(maxTier, Math.floor(share / m.cost)));
    t = Math.max(1, t - Math.floor(rng() * 3) + (broken ? 2 : 0));
    t = Math.min(7, t);
    left -= t * m.cost;
    const g = rng();
    const pG = (GREATER[rarity] ?? 0.03) * LUCK * (broken ? 3 : 1);
    const grade = g < pG * 0.05 ? 3 : g < pG * 0.25 ? 2 : g < pG ? 1 : 0;
    recipe.mods.push([m.id, t, grade]);
  });
  if (broken) recipe.broken = true;
  recipe.name = genName(base, recipe);
  return recipe;
}

/** A generated item's name: [⚡] [Signature] Material Form [of Suffix]. */
export function genName(base: GearBase, r: GenRecipe): string {
  const mat = GEN_MATERIAL_MAP.get(r.m);
  const lead = r.mods.map(([id, t, g]) => ({ m: GEN_MODULE_MAP.get(id)!, score: t * (GRADE_MULT[g] ?? 1) * (GEN_MODULE_MAP.get(id)?.gen === "major" ? 1.2 : 1) })).filter(x => x.m?.affix).sort((a, b) => b.score - a.score)[0];
  const sig = r.sig?.[0] ? EPIC_POWERS.find(e => e.id === r.sig![0])?.affix : undefined;
  return `${r.broken ? "⚡ " : ""}${sig ? `${sig} ` : ""}${mat?.name ?? ""} ${base.name}${lead ? ` ${lead.m.affix}` : ""}`.replace(/\s+/g, " ").trim();
}

/** The best Greater grade on an item (for its marks). */
export const genTopGrade = (r: GenRecipe) => Math.max(0, ...r.mods.map(m => m[2]));

/** Hooks to add for a generated item: [id, stacks]. */
export function genHooks(item: GearItem): [string, number][] {
  const r = item.gen;
  if (!r) return [];
  const out: [string, number][] = [];
  const mat = GEN_MATERIAL_MAP.get(r.m);
  const innate = mat && GEN_MODULE_MAP.get(mat.innate);
  if (innate) out.push([innate.id, modValue(innate, INNATE_TIER[item.rarity] ?? 3, 0, item.level)]);
  for (const [id, t, g] of r.mods) { const m = GEN_MODULE_MAP.get(id); if (m) out.push([id, modValue(m, t, g, item.level)]); }
  if (r.flaw) { const f = GEN_MODULE_MAP.get(r.flaw[0]); if (f) out.push([f.id, modValue(f, r.flaw[1], 0, item.level)]); }
  for (const id of r.sig ?? []) out.push([id, 1]);
  return out;
}

/** Lines for an item card. */
export function genLines(item: GearItem, fill: (text: string, n: number) => string, epicText: (id: string) => string): string[] {
  const r = item.gen;
  if (!r) return [];
  const lines: string[] = [];
  const mat = GEN_MATERIAL_MAP.get(r.m);
  const innate = mat && GEN_MODULE_MAP.get(mat.innate);
  if (mat && innate) lines.push(`${mat.name}: ${fill(innate.text, modValue(innate, INNATE_TIER[item.rarity] ?? 3, 0, item.level))}`);
  for (const id of r.sig ?? []) lines.push(`★ ${epicText(id)}`);
  for (const [id, t, g] of r.mods) {
    const m = GEN_MODULE_MAP.get(id);
    if (m) lines.push(`${g ? `${GRADE_MARK[g]} ` : ""}${fill(m.text, modValue(m, t, g, item.level))}`);
  }
  if (r.flaw) { const f = GEN_MODULE_MAP.get(r.flaw[0]); if (f) lines.push(`⛓️ ${fill(f.text, modValue(f, r.flaw[1], 0, item.level))}`); }
  if (r.broken) lines.push("⚡ Overcharged: far stronger than it has any right to be.");
  return lines;
}

/** A rough power score (budget points actually spent, with grades counted), for tests and tuning. */
export function genPower(r: GenRecipe): number {
  let p = 0;
  for (const [id, t, g] of r.mods) { const m = GEN_MODULE_MAP.get(id); if (m) p += t * m.cost * (GRADE_MULT[g] ?? 1); }
  p += (r.sig?.length ?? 0) * 4;
  if (r.flaw) { const f = GEN_MODULE_MAP.get(r.flaw[0]); if (f) p -= r.flaw[1] * f.cost; }
  return p;
}
export const genBudget = (rarity: Rarity, slot: Slot) => (BUDGET[rarity] ?? 12) * SLOT_MOD[slot];
