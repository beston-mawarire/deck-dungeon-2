// The long road between runs: the shared passive tree, weapon mastery and totems.
import { TALENTS } from "../data";
import type { HookDef } from "../engine/types";
import type { Meta } from "./meta";
import type { Family, WeaponFamily } from "./families";

// ---------- The passive tree ----------

/** One big tree, the same for every class: the old talents, sorted into branches, in tiers. */
export interface TreeBranch { id: string; name: string; icon: string; tags: string[]; tiers: string[][] }
const BRANCH_DEFS: Omit<TreeBranch, "tiers">[] = [
  { id: "might", name: "Might", icon: "⚔️", tags: ["Strike", "Kill"] },
  { id: "bulwark", name: "Bulwark", icon: "🛡️", tags: ["Guard", "Thorns"] },
  { id: "grace", name: "Grace", icon: "🗡️", tags: ["Tempo", "Crit"] },
  { id: "affliction", name: "Affliction", icon: "☠️", tags: ["Bleed", "Poison", "Burn", "Hex", "Frost"] },
  { id: "arcana", name: "Arcana", icon: "🔮", tags: ["Arcane", "Storm"] },
  { id: "devotion", name: "Devotion", icon: "✝️", tags: ["Holy", "Blood"] },
  { id: "fortune", name: "Fortune", icon: "🍀", tags: ["Gold", "Luck"] }
];
/** Nodes per tier, and the points a branch needs before its next tier opens. */
export const TIER_SIZE = 3;
export const TIER_STEP = 2;
/** A class's tree opens once it has beaten this many layers. */
export const TREE_LAYERS = 5;

let TREE: TreeBranch[] | null = null;
/** The tree (built once from the talents: small, common ones low down; the rare, big ones at the top). */
export function passiveTree(): TreeBranch[] {
  if (TREE) return TREE;
  const used = new Set<string>();
  TREE = BRANCH_DEFS.map(b => {
    const nodes = TALENTS.filter(t => !used.has(t.id) && b.tags.includes(t.tags[0] ?? "")).sort((x, y) => (y.weight ?? 1) - (x.weight ?? 1) || x.name.localeCompare(y.name));
    nodes.forEach(n => used.add(n.id));
    const tiers: string[][] = [];
    for (let i = 0; i < nodes.length; i += TIER_SIZE) tiers.push(nodes.slice(i, i + TIER_SIZE).map(n => n.id));
    return { ...b, tiers };
  });
  return TREE;
}
const TALENT_BY_ID = () => new Map<string, HookDef>(TALENTS.map(t => [t.id, t]));
/** How many ranks a node has (talents written "1 / 2 / 4" have three). */
export const nodeRanks = (t: HookDef) => (/\d+%?\s*\/\s*[+−-]?\d+/.test(t.text) ? 3 : 1);

export interface ClassTree { points: number; spent: Record<string, number> }
export const treeOf = (m: Meta, origin: string): ClassTree => ((m.tree ??= {})[origin] ??= { points: 0, spent: {} });
export const treeOpen = (m: Meta, origin: string) => (m.layersBeaten?.[origin] ?? 0) >= TREE_LAYERS;
const branchSpent = (t: ClassTree, b: TreeBranch) => b.tiers.flat().reduce((a, id) => a + (t.spent[id] ?? 0), 0);
/** Is this tier of a branch open (enough points spent lower down)? */
export const tierOpen = (t: ClassTree, b: TreeBranch, tier: number) => branchSpent(t, b) >= tier * TIER_STEP;

/** Put a point into a node. Returns an error, or null. */
export function spendNode(m: Meta, origin: string, id: string): string | null {
  if (!treeOpen(m, origin)) return `The tree opens once this class has beaten layer ${TREE_LAYERS}.`;
  const t = treeOf(m, origin);
  if (t.points <= 0) return "No points to spend.";
  const b = passiveTree().find(br => br.tiers.some(ti => ti.includes(id)));
  if (!b) return "No such node.";
  const tier = b.tiers.findIndex(ti => ti.includes(id));
  if (!tierOpen(t, b, tier)) return `Spend ${tier * TIER_STEP} points lower in ${b.name} first.`;
  const def = TALENT_BY_ID().get(id)!;
  if ((t.spent[id] ?? 0) >= nodeRanks(def)) return "That one's full.";
  t.spent[id] = (t.spent[id] ?? 0) + 1;
  t.points--;
  return null;
}
/** Take every point back out (free). */
export function resetTree(m: Meta, origin: string) {
  const t = treeOf(m, origin);
  t.points += Object.values(t.spent).reduce((a, n) => a + n, 0);
  t.spent = {};
}
/** Points a finished run earns its class (once the tree is open): 2 for each layer beaten, or 1 for getting
 *  halfway through the first layer and falling there. */
export function treePointsFor(layersWon: number, deepest: number): number {
  if (layersWon > 0) return 2 * layersWon;
  return deepest >= 3 ? 1 : 0;
}

// ---------- Weapon mastery ----------

export const MASTERY_FAMILIES: WeaponFamily[] = ["knife", "shortblade", "greatblade", "blunt", "breaker", "polearm", "arcane", "ranged"];
export const WM_MAX = 10;
/** Weapon mastery XP needed for a level (5, 20, 45, 80 …). */
export const wmLevel = (xp: number) => Math.min(WM_MAX, Math.floor(Math.sqrt(Math.max(0, xp) / 5)));
export const wmNext = (level: number) => 5 * (level + 1) * (level + 1);
/** Each family's name (mastery opens more of its weapons to your loot, a few at a time). */
export const WM_PERK: Record<WeaponFamily, { name: string }> = {
  knife: { name: "Knives" }, shortblade: { name: "Short Blades" }, greatblade: { name: "Great Blades" }, blunt: { name: "Blunt weapons" },
  breaker: { name: "Breakers" }, polearm: { name: "Polearms" }, arcane: { name: "Staves and wands" }, ranged: { name: "Bows and slings" }
};
/** XP from one fight won with that weapon. */
export const WM_XP: Record<string, number> = { normal: 1, elite: 2, champion: 3, crimson: 4, boss: 5 };

// ---------- Totems ----------

/** Endgame items set at the dungeon door before a run; used up when it starts. Each leans the loot one way. */
export interface Totem { id: string; name: string; icon: string; text: string; families?: Family[]; heavy?: boolean; light?: boolean; tags?: string[] }
export const TOTEMS: Totem[] = [
  { id: "giant", name: "Totem of the Giant", icon: "🗿", text: "More heavy weapons, heavy armour and two-handers", heavy: true },
  { id: "spell", name: "Totem of Spellcraft", icon: "🔮", text: "More wands, staves and focuses", families: ["arcane", "focus"] },
  { id: "shadow", name: "Totem of the Shadow", icon: "🌑", text: "More knives, short blades and light armour", families: ["knife", "shortblade"], light: true },
  { id: "embers", name: "Totem of Embers", icon: "🔥", text: "More gear that burns", tags: ["Burn"] },
  { id: "venom", name: "Totem of Venom", icon: "🐍", text: "More gear that poisons", tags: ["Poison"] },
  { id: "dawn", name: "Totem of the Dawn", icon: "🌅", text: "More holy gear", tags: ["Holy"] },
  { id: "bulwark", name: "Totem of the Bulwark", icon: "🧱", text: "More shields and guarding gear", families: ["shield"], tags: ["Guard"] }
];
export const totemById = (id: string) => TOTEMS.find(t => t.id === id);
/** How often a layer boss from the third layer down leaves a totem. */
export const TOTEM_DROP = 0.35;
export const TOTEM_LAYER = 3;
/** How much a totem leans the loot toward its kind. */
export const TOTEM_WEIGHT = 3;
