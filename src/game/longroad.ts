// The long road between runs: the shared passive tree, weapon mastery and totems.
import { TALENTS } from "../data";
import type { HookDef } from "../engine/types";
import type { Attr } from "../data/attributes";
import { SET_BONUSES, SET_BONUSES_2, SET_PIECES, SET_PIECES_2 } from "../data/talisman";
import { fillText } from "./hero";
import type { Meta } from "./meta";
import type { Family, WeaponFamily } from "./families";

// ---------- The passive tree ----------

/** One big tree, the same for every class. Each branch opens with a row of small attribute nodes (+1 to an
 *  attribute each), then its passives, the gentler ones near the top and the strongest deep down. A ranked passive
 *  is a chain of nodes (I, then II and III deeper down, each needing the one before), so it starts small and grows. */
export interface TreeNode { key: string; talent: string; level: number; prereq?: string; branch: string; tier: number; col: number; /** A name of its own (the old sigil set bonuses). */ title?: string }
export interface TreeBranch { id: string; name: string; icon: string; tags: string[]; attrs: [Attr, Attr]; nodes: TreeNode[]; tiers: number }
const BRANCH_DEFS: Omit<TreeBranch, "nodes" | "tiers">[] = [
  { id: "might", name: "Might", icon: "⚔️", tags: ["Strike", "Kill"], attrs: ["str", "vit"] },
  { id: "bulwark", name: "Bulwark", icon: "🛡️", tags: ["Guard", "Thorns"], attrs: ["vit", "str"] },
  { id: "grace", name: "Grace", icon: "🗡️", tags: ["Tempo", "Crit"], attrs: ["agi", "for"] },
  { id: "affliction", name: "Affliction", icon: "☠️", tags: ["Bleed", "Poison", "Burn", "Hex", "Frost"], attrs: ["int", "agi"] },
  { id: "arcana", name: "Arcana", icon: "🔮", tags: ["Arcane", "Storm"], attrs: ["int", "vit"] },
  { id: "devotion", name: "Devotion", icon: "✝️", tags: ["Holy", "Blood"], attrs: ["fai", "vit"] },
  { id: "fortune", name: "Fortune", icon: "🍀", tags: ["Gold", "Luck"], attrs: ["for", "agi"] }
];
/** Old passives left out of the tree: the small stat bumps that attributes now give (Crit, Dodge, Healing, status
 *  damage, Bash, Max HP…), and ones the Crawl has little room for (a 150-Gold purse, Cleave carry-over). */
export const TREE_DROPPED = new Set(["tm_sharp_eye", "tm_nimble", "tm_field_medic", "tm_lingering_harm", "tm_studious", "tm_sturdy", "tm_heavy_hand", "tm_keen_edge",
  "tm_steady_breath", "tm_thrifty", "t_mercenary", "t_carver"]);
/** Weakest to strongest, from fights simulated at layer 6 with every class (each passive at rank III against the
 *  same foes), with the build-defining ones moved to the very end. Anything unlisted sits in the middle. */
export const TREE_ORDER = [
  "t_bounty_hunter", "t_gold_digger", "t_blade_dance", "t_thorn_dance", "t_coup_de_grace", "t_bloodied_knuckles", "t_cold_blooded", "t_kick_down", "t_fault_finder",
  "t_pyromaniac", "t_last_stand", "t_spellweaver", "t_righteous", "t_absolution", "t_overkill", "t_whirlwind", "t_duelist", "t_hemophile", "t_exsanguinate",
  "t_ambidextrous", "t_slippery", "t_bloodrage", "t_heavy_hitter", "t_riposte", "t_counter_stance", "t_parrying_blades", "t_rhythm", "t_hexer", "t_twin_strikes",
  "t_tortoise", "t_static_field", "t_shield_wall", "t_kindler", "t_pummel", "tm_offhand_drills", "t_evasion", "t_momentum", "t_shield_bash", "t_crossed_blades",
  "t_hunters_mark", "t_live_wire", "t_light_feet", "tm_prickly", "t_toxicologist", "t_heavy_hands", "t_stalwart", "tm_opening_jab", "t_rend", "t_relentless",
  "t_juggernaut", "t_retaliate", "t_envenomed", "t_splinter", "t_overwhelm", "tm_toughened", "tm_padded", "tm_precision", "tm_second_wind", "tm_practiced",
  "t_thick_skin", "t_barbed", "tm_hardened", "t_haymaker", "t_double_down", "t_battle_fury", "t_vigor", "t_static_charge", "t_malediction", "t_zealotry",
  "t_loaded_dice", "t_troll_blood", "t_lucky_streak", "t_frostbite", "t_battle_trance", "t_immunologist", "t_fault_lines", "t_executioner", "t_divine_favor",
  "t_quick_hands", "t_vanguard", "t_iron_will", "t_fire_within", "t_pyrotechnics", "t_conductor", "t_crushing_blows", "t_exploit_opening", "t_catalyst",
  "t_reckless", "t_boundless_static", "t_reaper"
];
// The Talisman's sigils live in the tree too: each set piece and set bonus is a passive of its own (at the strength a
// sigil from the 6th floor had). Left out: the ones that only repeat what attributes give, and Cleave/overkill carry-over.
export const SIGIL_TREE_STACKS = 6;
const SIGIL_DROPPED = new Set(["sc_flame_locket", "sc_conductor_ring", "sc_loaded_die", "sc_tithe_ledger", "sc_dance_step", "sb_tithe_2", "sb_gamble_2", "sb_dance_2", "sb_ember_2",
  "sc_guild_tally", "sb_guild_3"]);
const BONUS_NAME = ["", "", "Favour", "Blessing", "Crown"];
const sigilDefs = () => [...SET_PIECES, ...SET_PIECES_2, ...SET_BONUSES, ...SET_BONUSES_2].filter(d => !SIGIL_DROPPED.has(d.id));
export const isTreeSigil = (id: string) => /^s[cb]_/.test(id);
/** A tree passive's text at a rank (sigils read at their tree strength). */
export const nodeText = (d: HookDef, level: number) => (isTreeSigil(d.id) ? fillText(d.text, SIGIL_TREE_STACKS) : rankText(d.text, level));
/** The name a node shows ("Ember Court (2)" becomes "Ember Court's Favour"). */
export const nodeName = (n: TreeNode, d: HookDef) => n.title ?? d.name;
const strength = (id: string) => {
  // Set pieces sit mid-tree; a set's bonuses get stronger (and deeper) with the number of pieces it once needed.
  if (id.startsWith("sc_")) return TREE_ORDER.length * 0.45;
  const sb = /^sb_.+_(\d)$/.exec(id);
  if (sb) return TREE_ORDER.length * ({ 2: 0.5, 3: 0.72, 4: 0.97 } as Record<string, number>)[sb[1]];
  const k = TREE_ORDER.indexOf(id); return k < 0 ? TREE_ORDER.length / 2 : k;
};
/** Nodes per tier (the row you start from is this wide), and the points a branch needs before its next tier opens. */
export const TIER_WIDTH = 5;
export const TIER_STEP = 2;
/** A class's tree opens once it has beaten this many layers. */
export const TREE_LAYERS = 5;
export const NUMERAL = ["", "I", "II", "III"];
/** The attribute nodes a branch opens with (its own attribute, then a second one, in turn). */
const ATTR_ROW = [0, 1, 0, 1, 0] as const;

let TREE: TreeBranch[] | null = null;
let NODES: Map<string, TreeNode> | null = null;
/** The tree (built once from the passives). */
export function passiveTree(): TreeBranch[] {
  if (TREE) return TREE;
  const used = new Set<string>();
  NODES = new Map();
  TREE = BRANCH_DEFS.map(b => {
    const talents = [...TALENTS, ...sigilDefs()].filter(t => !used.has(t.id) && !TREE_DROPPED.has(t.id) && b.tags.includes(t.tags[0] ?? "")).sort((x, y) => strength(x.id) - strength(y.id) || x.name.localeCompare(y.name));
    talents.forEach(t => used.add(t.id));
    const top: TreeNode[] = ATTR_ROW.map((w, col) => ({ key: `ta_${b.attrs[w]}@${b.id}${col}`, talent: `ta_${b.attrs[w]}`, level: 1, branch: b.id, tier: 0, col }));
    // Passives are dealt into the branch's columns below that; down each column a passive's ranks follow one under
    // the other (I, then II a row deeper, then III), so a node's stronger version hangs right below it.
    const cols: Omit<TreeNode, "tier" | "col">[][] = Array.from({ length: TIER_WIDTH }, () => []);
    talents.forEach((t, i) => {
      const sb = /^sb_.+_(\d)$/.exec(t.id);
      const title = sb ? `${t.name.replace(/\s*\(\d\)$/, "")}'s ${BONUS_NAME[Number(sb[1])]}` : undefined;
      // Into the shortest column (the leftmost of them), so each passive goes as high as the ones before it allow.
      const col = cols.reduce((best, c, k) => (c.length < cols[best].length ? k : best), i % TIER_WIDTH);
      for (let lv = 1; lv <= (isTreeSigil(t.id) ? 1 : nodeRanks(t)); lv++) cols[col].push({ key: lv === 1 ? t.id : `${t.id}#${lv}`, talent: t.id, level: lv, prereq: lv > 1 ? (lv === 2 ? t.id : `${t.id}#2`) : undefined, branch: b.id, title });
    });
    const nodes = [...top, ...cols.flatMap((c, col) => c.map((n, tier) => ({ ...n, tier: tier + 1, col })))];
    for (const n of nodes) NODES!.set(n.key, n);
    return { ...b, nodes, tiers: 1 + Math.max(...cols.map(c => c.length)) };
  });
  return TREE;
}
export const treeNode = (key: string) => { passiveTree(); return NODES!.get(key); };
/** How many ranks a talent has (talents written "1 / 2 / 4" have three). */
export const nodeRanks = (t: HookDef) => (/\d+%?\s*\/\s*[+−-]?\d+/.test(t.text) ? 3 : 1);
/** A talent's text at one rank ("+1 / +2 / +3 Damage" at rank II reads "+2 Damage"). */
export const rankText = (text: string, level: number) => text.replace(/([^\s/]+)\s*\/\s*([^\s/]+)\s*\/\s*([^\s/]+)/g, (_m, a, b, c) => [a, b, c][level - 1] ?? a);

export interface ClassTree { points: number; spent: Record<string, number> }
export function treeOf(m: Meta, origin: string): ClassTree {
  const t = ((m.tree ??= {})[origin] ??= { points: 0, spent: {} });
  // Nodes the tree no longer has (it was reworked) give their points back.
  for (const k of Object.keys(t.spent)) if (!treeNode(k)) { if (t.spent[k]) t.points++; delete t.spent[k]; }
  return t;
}
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
  for (const [key, v] of Object.entries(treeOf(m, origin).spent)) { const n = treeNode(key); if (v && n) out[n.talent] = isTreeSigil(n.talent) ? SIGIL_TREE_STACKS : (out[n.talent] ?? 0) + 1; }
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
