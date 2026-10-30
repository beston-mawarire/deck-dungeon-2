// Between runs: Renown (earned from every run), unlock tiers that add items to the loot pools,
// and the Codex of everything you've found. Stored in the browser (localStorage), per player.
import type { Run } from "./run";

export interface Meta {
  renown: number;
  runs: number;
  wins: number;
  bestFloor: number;
  found: string[];
}

const KEY = "dd2-meta-v1";

export const UNLOCK_TIERS: { at: number; name: string; ids: string[] }[] = [
  { at: 20, name: "Wandering Armoury", ids: ["w_crossbow", "w_trident", "w_lute", "o_grimoire", "a_frost_plate"] },
  { at: 50, name: "Epic Lore", ids: ["e_frostbound", "e_thundering", "e_bloodthirsty", "e_bastion", "e_hexing", "e_lucky", "e_cataclysmic", "e_gorgon"] },
  { at: 90, name: "Legends of the Deep I", ids: ["l_tempest_maul", "l_gravecaller", "l_sanguine_regalia", "t_quicksilver", "war_drum", "blood_moon"] },
  { at: 150, name: "Legends of the Deep II", ids: ["l_ouroboros", "l_loaded_fate", "l_crown_endless", "t_alchemist_ring", "a_mirror_mail"] },
  { at: 220, name: "Trophies of the Fallen", ids: ["l_skarn_horn", "l_morwen_tear", "l_hollow_decree"] }
];

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
  m.bestFloor = Math.max(m.bestFloor, run.floor);
  m.found = [...new Set([...m.found, ...run.found])];
  saveMeta(m);
  return { earned, unlocked: UNLOCK_TIERS.filter(t => before < t.at && m.renown >= t.at).map(t => t.name) };
}
