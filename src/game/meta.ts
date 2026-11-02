// Between runs: Renown (earned from every run), unlock tiers that add items to the loot pools,
// and the Codex of everything you've found. Stored in the browser (localStorage), per player.
import type { Run } from "./run";
import { EQUIP_SLOTS, itemName } from "./hero";

/** One finished run, for the Run history. */
export interface HistoryEntry {
  at: number;
  mode: string;
  daily?: string;
  origin: string;
  floor: number;
  won: boolean;
  abandoned?: boolean;
  level: number;
  kills: number;
  bosses: number;
  plates?: number;
  killer?: string;
  build: { name: string; rarity: string; level: number }[];
}
export const HISTORY_SIZE = 10;

export interface Meta {
  renown: number;
  runs: number;
  wins: number;
  bestFloor: number;
  found: string[];
  /** Ruin Shards: each one opens a single Abyss run. */
  ruinShards?: number;
  /** Vanadium Plates not yet given to a class. */
  plates?: number;
  /** Plates given to each class (for good). They only count in Abyss runs. */
  classPlates?: Partial<Record<string, number>>;
  /** The deepest Abyss depth reached, and how many Abyss runs. */
  abyssBest?: number;
  abyssRuns?: number;
  /** Today's Daily Dungeon attempt (one a day). */
  daily?: { day: string; floor: number; won: boolean; done?: boolean };
  /** Legendaries whose lore you've read (shown the first time you hold each). */
  loreSeen?: string[];
  /** What killed your last Campaign run: it waits in the next one. */
  nemesis?: { name: string; family?: string; traits: string[]; level: number };
  /** The last few finished runs, newest first. */
  history?: HistoryEntry[];
}

/** The Abyss opens to anyone who has beaten floor 15 (reached floor 16) in the campaign. */
export const ABYSS_UNLOCK_FLOOR = 15;
export const abyssUnlocked = (m: Meta) => m.bestFloor > ABYSS_UNLOCK_FLOOR;

/** Move this run's Ruin Shards and Vanadium Plates to the device as soon as they drop. True if anything changed. */
export function bankRuin(m: Meta, run: Run): boolean {
  const r = run.ruin;
  if (!r) return false;
  const b = (r.banked = r.banked ?? { shards: 0, plates: 0 });
  const ds = r.shards - b.shards, dp = r.plates - b.plates;
  if (!ds && !dp) return false;
  m.ruinShards = (m.ruinShards ?? 0) + ds;
  m.plates = (m.plates ?? 0) + dp;
  b.shards = r.shards; b.plates = r.plates;
  saveMeta(m);
  return true;
}

/** Give one unassigned plate to a class, for good. */
export function applyPlate(m: Meta, origin: string): boolean {
  if ((m.plates ?? 0) <= 0) return false;
  m.plates = (m.plates ?? 0) - 1;
  m.classPlates = { ...(m.classPlates ?? {}), [origin]: (m.classPlates?.[origin] ?? 0) + 1 };
  saveMeta(m);
  return true;
}

/** Pay a Ruin Shard to enter the Abyss. */
export function spendShard(m: Meta): boolean {
  if ((m.ruinShards ?? 0) <= 0) return false;
  m.ruinShards = (m.ruinShards ?? 0) - 1;
  m.abyssRuns = (m.abyssRuns ?? 0) + 1;
  saveMeta(m);
  return true;
}

const KEY = "dd2-meta-v1";

const TIERS: { at: number; name: string; ids: string[] }[] = [
  { at: 20, name: "Wandering Armoury", ids: ["w_crossbow", "w_trident", "w_lute", "o_grimoire", "a_frost_plate"] },
  { at: 50, name: "Epic Lore", ids: ["e_frostbound", "e_thundering", "e_bloodthirsty", "e_bastion", "e_hexing", "e_lucky", "e_cataclysmic", "e_gorgon"] },
  { at: 90, name: "Legends of the Deep I", ids: ["l_tempest_maul", "l_gravecaller", "l_sanguine_regalia", "t_quicksilver", "war_drum", "blood_moon"] },
  { at: 150, name: "Legends of the Deep II", ids: ["l_ouroboros", "l_loaded_fate", "l_crown_endless", "t_alchemist_ring", "a_mirror_mail", "lr_twin_souls", "lr_philosophers_stone"] },
  { at: 220, name: "Trophies of the Fallen", ids: ["l_skarn_horn", "l_morwen_tear", "l_hollow_decree"] },
  { at: 120, name: "Deep Treasures (Rares that rival Epics, from floor 1)", ids: ["dr_abyssal_edge", "dr_moltencore_maul", "dr_riftwood_staff", "dr_wardens_tower", "dr_voidglass_orb", "dr_deepforged_plate", "dr_nightglass_leathers", "dr_pilgrim_signet", "dr_echo_charm", "dr_marrow_ring"] }
];
/** Unlock tiers, in Renown order. */
export const UNLOCK_TIERS = [...TIERS].sort((a, b) => a.at - b.at);

export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [], ...JSON.parse(raw) };
  } catch { /* storage unavailable */ }
  return { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] };
}

export function saveMeta(m: Meta) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
}

/** Item ids still locked at this Renown. */
export function lockedIds(m: Meta): Set<string> {
  const out = new Set<string>();
  for (const t of UNLOCK_TIERS) if (m.renown < t.at) for (const id of t.ids) out.add(id);
  return out;
}

export function renownFor(run: Run): number {
  const floors = run.floor - 1 + (run.scene.t === "over" && run.scene.won ? 1 : 0);
  return Math.max(1, floors * 2 + run.stats.bosses * 5 + run.stats.legendaries * 3 + run.stats.fusions * 5);
}

/** Record a finished run. Returns the Renown earned and any tiers newly unlocked. */
export function recordRun(m: Meta, run: Run, alreadyEarned = 0): { earned: number; unlocked: string[] } {
  const before = m.renown;
  const earned = Math.max(0, renownFor(run) - alreadyEarned);
  m.renown += earned;
  if (!alreadyEarned) m.runs++;
  if (run.scene.t === "over" && run.scene.won) m.wins++;
  if (run.daily && m.daily?.day === run.daily) m.daily = { day: run.daily, floor: Math.max(m.daily.floor, run.floor), won: m.daily.won || (run.scene.t === "over" && run.scene.won), done: true };
  const entry: HistoryEntry = {
    at: Date.now(), mode: run.mode, daily: run.daily, origin: run.hero.origin, floor: run.floor, won: run.scene.t === "over" && run.scene.won,
    abandoned: run.abandoned || undefined, level: run.hero.level, kills: run.stats.kills, bosses: run.stats.bosses, plates: run.hero.plates || undefined,
    killer: run.killer ? `${run.killer.name}${run.killer.rank ? ` (${run.killer.rank})` : ""}` : undefined,
    build: EQUIP_SLOTS.map(sl => run.hero.equip[sl]).filter((x): x is NonNullable<typeof x> => !!x).map(it => ({ name: itemName(it), rarity: it.rarity, level: it.level }))
  };
  // A Campaign win that carries on deeper is recorded again when it ends: replace its earlier entry.
  const hist = (m.history ?? []).filter(e => !(alreadyEarned && e.origin === entry.origin && e.mode !== "abyss" && entry.at - e.at < 6 * 3600e3 && e.won));
  m.history = [entry, ...hist].slice(0, HISTORY_SIZE);
  // Your Nemesis: beaten, it's gone; killed by something (in the Campaign), that's the new one (stronger if it's the same foe again).
  if (run.nemesisBeaten) m.nemesis = undefined;
  const k = run.killer;
  if (run.scene.t === "over" && !run.scene.won && k && !run.abandoned && run.mode !== "abyss" && !run.daily && k.name !== "DEATH" && k.name !== "THE END") {
    const again = k.nemesis || m.nemesis?.name === k.name;
    m.nemesis = { name: k.name, family: k.family, traits: (k.traitIds ?? []).filter(t => /^(m_|x_)/.test(t) && t !== "m_death" && t !== "m_the_end" && t !== "m_goblin" && t !== "m_thief"), level: again ? (m.nemesis?.level ?? 1) + 1 : 1 };
  }
  if (run.mode === "abyss") m.abyssBest = Math.max(m.abyssBest ?? 0, Math.min(run.floor, 10));
  else m.bestFloor = Math.max(m.bestFloor, run.floor);
  bankRuin(m, run);
  m.found = [...new Set([...m.found, ...run.found])];
  saveMeta(m);
  return { earned, unlocked: UNLOCK_TIERS.filter(t => before < t.at && m.renown >= t.at).map(t => t.name) };
}
