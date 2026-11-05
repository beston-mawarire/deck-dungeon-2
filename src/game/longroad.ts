// The long road between runs: the shared passive tree, weapon mastery and totems.
import { TALENTS } from "../data";
import type { HookDef } from "../engine/types";
import type { Meta } from "./meta";
import type { Family, WeaponFamily } from "./families";

// ---------- The passive tree ----------

/** One big tree, the same for every class: the old talents, sorted into branches. A ranked talent becomes a chain
 *  of nodes (I, then II and III deeper down, each needing the one before), so it starts small and grows. */
export interface TreeNode { key: string; talent: string; level: number; prereq?: string; branch: string; tier: number; col: number }
export interface TreeBranch { id: string; name: string; icon: string; tags: string[]; nodes: TreeNode[]; tiers: number }
const BRANCH_DEFS: Omit<TreeBranch, "nodes" | "tiers">[] = [
  { id: "might", name: "Might", icon: "⚔️", tags: ["Strike", "Kill"] },
  { id: "bulwark", name: "Bulwark", icon: "🛡️", tags: ["Guard", "Thorns"] },
  { id: "grace", name: "Grace", icon: "🗡️", tags: ["Tempo", "Crit"] },
  { id: "affliction", name: "Affliction", icon: "☠️", tags: ["Bleed", "Poison", "Burn", "Hex", "Frost"] },
  { id: "arcana", name: "Arcana", icon: "🔮", tags: ["Arcane", "Storm"] },
  { id: "devotion", name: "Devotion", icon: "✝️", tags: ["Holy", "Blood"] },
  { id: "fortune", name: "Fortune", icon: "🍀", tags: ["Gold", "Luck"] }
];
/** Nodes per tier (the row you start from is this wide), and the points a branch needs before its next tier opens. */
export const TIER_WIDTH = 5;
export const TIER_STEP = 2;
/** A class's tree opens once it has beaten this many layers. */
export const TREE_LAYERS = 5;
export const NUMERAL = ["", "I", "II", "III"];

let TREE: TreeBranch[] | null = null;
let NODES: Map<string, TreeNode> | null = null;
/** The tree (built once from the talents: every talent's first rank first, then the second ranks, then the third). */
export function passiveTree(): TreeBranch[] {
  if (TREE) return TREE;
  const used = new Set<string>();
  NODES = new Map();
  TREE = BRANCH_DEFS.map(b => {
    const talents = TALENTS.filter(t => !used.has(t.id) && b.tags.includes(t.tags[0] ?? "")).sort((x, y) => (y.weight ?? 1) - (x.weight ?? 1) || x.name.localeCompare(y.name));
    talents.forEach(t => used.add(t.id));
    // Talents are dealt into the branch's columns; down each column a talent's ranks follow one under the other
    // (I, then II a row deeper, then III), so a node's stronger version hangs right below it.
    const cols: Omit<TreeNode, "tier" | "col">[][] = Array.from({ length: TIER_WIDTH }, () => []);
    talents.forEach((t, i) => {
      for (let lv = 1; lv <= nodeRanks(t); lv++) cols[i % TIER_WIDTH].push({ key: lv === 1 ? t.id : `${t.id}#${lv}`, talent: t.id, level: lv, prereq: lv > 1 ? (lv === 2 ? t.id : `${t.id}#2`) : undefined, branch: b.id });
    });
    const nodes = cols.flatMap((c, col) => c.map((n, tier) => ({ ...n, tier, col })));
    for (const n of nodes) NODES!.set(n.key, n);
    return { ...b, nodes, tiers: Math.max(...cols.map(c => c.length)) };
  });
  return TREE;
}
export const treeNode = (key: string) => { passiveTree(); return NODES!.get(key); };
/** How many ranks a talent has (talents written "1 / 2 / 4" have three). */
export const nodeRanks = (t: HookDef) => (/\d+%?\s*\/\s*[+−-]?\d+/.test(t.text) ? 3 : 1);
/** A talent's text at one rank ("+1 / +2 / +3 Damage" at rank II reads "+2 Damage"). */
export const rankText = (text: string, level: number) => text.replace(/([^\s/]+)\s*\/\s*([^\s/]+)\s*\/\s*([^\s/]+)/g, (_m, a, b, c) => [a, b, c][level - 1] ?? a);

export interface ClassTree { points: number; spent: Record<string, number> }
export const treeOf = (m: Meta, origin: string): ClassTree => ((m.tree ??= {})[origin] ??= { points: 0, spent: {} });
export const treeOpen = (m: Meta, origin: string) => (m.layersBeaten?.[origin] ?? 0) >= TREE_LAYERS;
export const branchSpent = (t: ClassTree, b: TreeBranch) => b.nodes.reduce((a, n) => a + (t.spent[n.key] ? 1 : 0), 0);
/** Is this tier of a branch open (enough points spent lower down)? */
export const tierOpen = (t: ClassTree, b: TreeBranch, tier: number) => branchSpent(t, b) >= tier * TIER_STEP;
/** Why a node can't take a point right now (null: it can). */
export function nodeBlock(m: Meta, origin: string, key: string): string | null {
  const n = treeNode(key);
  if (!n) return "No such node.";
  if (!treeOpen(m, origin)) return `The tree opens once this class has beaten layer ${TREE_LAYERS}.`;
  const t = treeOf(m, origin);
  if (t.spent[key]) return "You've taken this one.";
  const b = passiveTree().find(br => br.id === n.branch)!;
  if (!tierOpen(t, b, n.tier)) return `Spend ${n.tier * TIER_STEP} points in ${b.name} first.`;
  if (n.prereq && !t.spent[n.prereq]) return `Take ${NUMERAL[n.level - 1]} first.`;
  if (t.points <= 0) return "No points to spend.";
  return null;
}
/** Put a point into a node. Returns an error, or null. */
export function spendNode(m: Meta, origin: string, key: string): string | null {
  const err = nodeBlock(m, origin, key);
  if (err) return err;
  const t = treeOf(m, origin);
  t.spent[key] = 1;
  t.points--;
  return null;
}
/** Take every point back out (free). */
export function resetTree(m: Meta, origin: string) {
  const t = treeOf(m, origin);
  t.points += Object.values(t.spent).filter(Boolean).length;
  t.spent = {};
}
/** The talents a class's spent nodes add up to (each node is one rank). */
export function treeTalents(m: Meta, origin: string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, v] of Object.entries(treeOf(m, origin).spent)) { const n = treeNode(key); if (v && n) out[n.talent] = (out[n.talent] ?? 0) + 1; }
  return out;
}
/** Points a finished run earns its class (once the tree is open): one for each layer beaten. */
export function treePointsFor(layersWon: number, _deepest = 0): number {
  return Math.max(0, layersWon);
}

// ---------- Weapon mastery ----------

export const MASTERY_FAMILIES: (WeaponFamily | "shield")[] = ["knife", "shortblade", "greatblade", "blunt", "breaker", "polearm", "arcane", "ranged", "shield"];
export const WM_MAX = 10;
/** Weapon mastery XP needed for a level (5, 20, 45, 80 …). */
export const wmLevel = (xp: number) => Math.min(WM_MAX, Math.floor(Math.sqrt(Math.max(0, xp) / 5)));
export const wmNext = (level: number) => 5 * (level + 1) * (level + 1);
/** Each family's name (mastery opens more of its weapons to your loot, a few at a time). */
export const WM_PERK: Record<WeaponFamily | "shield", { name: string }> = {
  shield: { name: "Shields" },
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
