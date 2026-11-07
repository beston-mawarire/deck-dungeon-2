import { pathsOf } from "../data/classpaths";
// Between runs: Renown (earned from every run), unlock tiers that add items to the loot pools,
// and the Codex of everything you've found. Stored in the browser (localStorage), per player.
import { CAMP_CASTS, FISH } from "./fishing";
import { MASTERY_FAMILIES, TOTEMS, treeOf, treeOpen, treePointsFor } from "./longroad";
import { trackMarks, type ObsidianSeal, type Run } from "./run";
import { EQUIP_SLOTS, itemName } from "./hero";
import { BOUNTY_CAP, bountyReward } from "./pact";
import { TAROT_MAP, TAROT_MAX_LEVEL, TAROT_SLOTS, tarotOffer, type TarotSlot } from "./tarot";
import { OMENS_FOR_FOUR } from "./omens";
import { makeRng } from "../engine/rng";
import type { GearItem } from "../engine/types";
import { DRILL_CROWNS } from "./drills";
import { omensTaken } from "./run";
import { ACHIEVEMENTS, heatOf, HEAT_RENOWN, type Kit, masteryFor, masteryLevel, MASTERY_MAX } from "./progress";

/** One finished run, for the Run history. */
export interface HistoryEntry {
  at: number;
  mode: string;
  daily?: string;
  /** A Drill run. */
  drill?: string;
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
  /** The Camp's "new in the crawl" slides were switched off. */
  campIntroOff?: boolean;
  /** The Obsidian Chest: the one thing sealed by your last climb out (an item, your potions or your gold), waiting in the next run's Entrance. */
  obsidian?: ObsidianSeal;
  /** The Camp's stores (Crown Shards, materials) and the Hall's upgrades. */
  camp?: import("./camp").CampStore;
  /** The Crawl: how many layers each class has beaten (its best run). Opens other classes and more of its loot. */
  layersBeaten?: Partial<Record<string, number>>;
  /** The passive tree, per class: points to spend and where they've gone. */
  tree?: Record<string, import("./longroad").ClassTree>;
  /** Weapon mastery XP, by weapon family (shared by every class). */
  weaponXp?: Partial<Record<string, number>>;
  /** The Bestiary: every kind of foe beaten in the Crawl, how many times, and the most HP and Power seen on it. */
  bestiary?: Record<string, { kills: number; hp: number; power: number; family?: string; boss?: boolean }>;
  /** Fish caught and kept (from dungeon pools and the Camp's), and casts left at the Camp's pool. */
  fish?: Partial<Record<string, number>>;
  fishCasts?: number;
  /** Totems held, and the one set at the dungeon door for the next run. */
  totems?: Partial<Record<string, number>>;
  totemSet?: string;
  /** The ability each class takes into its runs (from the Camp's Skills). */
  skillPick?: Record<string, string>;
  /** Each class's chosen path (Bulwark or Berserker, and so on). */
  path?: Record<string, string>;
  /** The Camp Ledger: the marks each path has earned (see LEDGER_MARKS). */
  ledger?: Record<string, string[]>;
  /** The guided first run: tips already read, and whether tips are switched off. */
  tips?: string[];
  tipsOff?: boolean;
  /** Don't show the trapdoor explainer after Descend any more. */
  skipTrapIntro?: boolean;
  /** Drills: the classes that have cleared each one (its medal). */
  drills?: Record<string, import("../engine/types").OriginId[]>;
  /** Campaign runs in a row that ended without a Legendary (four, and the next run's first boss offers one). */
  dryRuns?: number;
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
  /** Ruin Gems not on any class, and the gems on each class. Gems move freely between classes. */
  ruinGems?: number;
  classGems?: Partial<Record<string, number>>;
  /** Tarot cards owned (each at level 1–3), the two carried into normal runs (Reversed or not), and an Abyss
   *  clear's offer still waiting to be taken. */
  tarot?: Partial<Record<string, number>>;
  tarotEquip?: { id: string; rev?: boolean }[];
  tarotOffer?: string[];
  /** The Heat pact (each condition's rank), and each class's best Heat with the dungeon beaten (bounties paid to it). */
  pact?: Partial<Record<string, number>>;
  heatBest?: Partial<Record<string, number>>;
  /** Abyss runs won. */
  abyssWins?: number;
  /** The deepest Abyss depth reached, and how many Abyss runs. */
  abyssBest?: number;
  abyssRuns?: number;
  /** Today's Daily Dungeon attempt (one a day). */
  daily?: { day: string; floor: number; won: boolean; done?: boolean };
  /** Class Mastery XP, and each class's chosen starting kit. */
  mastery?: Partial<Record<string, number>>;
  /** Which Mastery reset this save has been through. */
  masteryEpoch?: number;
  kits?: Partial<Record<string, Kit>>;
  /** Campaign wins per class. */
  winsBy?: Partial<Record<string, number>>;
  /** Achievements earned, and the title shown by your name on the leaderboards. */
  achievements?: string[];
  title?: string;
  /** Heat level chosen for Campaign runs (0 = off). */
  heat?: number;
  /** Every encounter you've had, across runs (for the Encounter achievements). */
  encounters?: string[];
  /** Legendaries whose lore you've read (shown the first time you hold each). */
  loreSeen?: string[];
  /** What killed your last Campaign run: it waits in the next one. */
  nemesis?: { name: string; family?: string; traits: string[]; level: number };
  /** The last few finished runs, newest first. */
  history?: HistoryEntry[];
}

/** The Abyss opens to anyone who has beaten floor 15 (reached floor 16) in the campaign. */
export const ABYSS_UNLOCK_FLOOR = 15;
/** The Abyss opens once any class has beaten the dungeon's last layer. */
export const abyssUnlocked = (m: Meta) => Object.values(m.layersBeaten ?? {}).some(n => (n ?? 0) >= ABYSS_UNLOCK_LAYERS) || m.bestFloor > ABYSS_UNLOCK_FLOOR;
export const ABYSS_UNLOCK_LAYERS = 5;


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

/** Bumped when Class Mastery is reset for everyone (1: the slower Mastery curve). */
export const MASTERY_EPOCH = 1;
export function loadMeta(): Meta {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [], ...JSON.parse(raw) };
      // (2.7: the Obsidian Chest held a bare item before; now it holds a seal.)
      if (m.obsidian && "base" in (m.obsidian as object)) m.obsidian = { item: m.obsidian as unknown as GearItem };
      // Mastery reset: every class starts again from Mastery 1 (and its kit choices go back to the class's own).
      if ((m.masteryEpoch ?? 0) < MASTERY_EPOCH) { m.mastery = {}; m.kits = {}; m.masteryEpoch = MASTERY_EPOCH; saveMeta(m); }
      return m;
    }
  } catch { /* storage unavailable */ }
  return { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [], masteryEpoch: MASTERY_EPOCH };
}

export function saveMeta(m: Meta) {
  try { localStorage.setItem(KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
}

/** Item ids still locked at this Renown. */
export function lockedIds(m: Meta): Set<string> {
  const out = new Set<string>();
  // (Renown is retired: nothing is locked behind it any more.)
  void m; void UNLOCK_TIERS;
  return out;
}

export function renownFor(run: Run): number {
  const floors = run.floor - 1 + (run.scene.t === "over" && run.scene.won ? 1 : 0);
  return Math.round(Math.max(1, floors * 2 + run.stats.bosses * 5 + run.stats.legendaries * 3 + run.stats.fusions * 5) * (1 + HEAT_RENOWN * heatOf(run)));
}

/** Record a finished run. Returns the Renown earned and any tiers newly unlocked. */
/** The Camp Ledger's marks, earned per path: how far each way of playing each class has gone. */
export const LEDGER_MARKS: { id: string; icon: string; name: string }[] = [
  { id: "l1", icon: "🥉", name: "Beat the 1st Layer" },
  { id: "l3", icon: "🥈", name: "Beat the 3rd Layer" },
  { id: "win", icon: "🏆", name: "Beat the dungeon" },
  { id: "h4", icon: "🔥", name: "Beat the dungeon at Heat 4 or more" },
  { id: "h8", icon: "🌋", name: "Beat the dungeon at Heat 8 or more" },
  { id: "abyss", icon: "🕳️", name: "Clear the Abyss" }
];
/** The marks this run earns its path. */
export function ledgerMarks(run: Run): string[] {
  const won = run.scene.t === "over" && run.scene.won, out: string[] = [];
  if (!run.hero.path || run.daily) return out;
  if (run.mode === "abyss") return won ? ["abyss"] : out;
  if (run.mode !== "campaign") return out;
  const layers = run.hero.f.persist["layersWon"] ?? 0, heat = run.heat ?? 0;
  if (layers >= 1 || won) out.push("l1");
  if (layers >= 3 || won) out.push("l3");
  if (won) out.push("win");
  if (won && heat >= 4) out.push("h4");
  if (won && heat >= 8) out.push("h8");
  return out;
}

/** A Drill's end: its medal (and a first clear's Crown Shards), achievements, the Bestiary and found items. */
function recordDrill(m: Meta, run: Run, before: number, earned: number): ReturnType<typeof recordRun> {
  void before;
  const won = run.scene.t === "over" && run.scene.won, id = run.drill!, o = run.hero.origin;
  if (won) {
    const by = ((m.drills ??= {})[id] ??= []);
    if (!by.length) { (m.camp ??= { crowns: 0, mats: {}, hall: {} }).crowns += DRILL_CROWNS; run.drillFirst = true; }
    if (!by.includes(o)) by.push(o);
  }
  const entry: HistoryEntry = { at: Date.now(), mode: run.mode, origin: o, floor: run.floor, won, drill: id, abandoned: run.abandoned || undefined, level: run.hero.level, kills: run.stats.kills, bosses: run.stats.bosses,
    killer: run.killer ? `${run.killer.name}${run.killer.rank ? ` (${run.killer.rank})` : ""}` : undefined,
    build: EQUIP_SLOTS.map(sl => run.hero.equip[sl]).filter((x): x is NonNullable<typeof x> => !!x).map(it => ({ name: itemName(it), rarity: it.rarity, level: it.level })) };
  m.history = [entry, ...(m.history ?? [])].slice(0, HISTORY_SIZE);
  m.found = [...new Set([...m.found, ...run.found])];
  trackMarks(run);
  m.encounters = [...new Set([...(m.encounters ?? []), ...(run.encounters ?? [])])];
  const got: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (m.achievements?.includes(a.id) || a.id === "mastery10" || a.id === "mastery_all") continue;
    if (a.check(run, { wins: m.wins, winsBy: m.winsBy as Record<string, number>, encounters: m.encounters })) { (m.achievements ??= []).push(a.id); m.renown += a.renown; got.push(a.id); }
  }
  saveMeta(m);
  return { earned, unlocked: [], achievements: got };
}

export function recordRun(m: Meta, run: Run, alreadyEarned = 0): { earned: number; unlocked: string[]; achievements: string[]; mastery?: { origin: string; gained: number; level: number; levelUp: boolean } } {
  const before = m.renown;
  const earned = Math.max(0, renownFor(run) - alreadyEarned);
  m.renown += earned;
  if (!alreadyEarned) m.runs++;
  // Drills count only towards their own medals (and Renown, achievements and the Bestiary).
  if (run.drill) return recordDrill(m, run, before, earned);
  if (!alreadyEarned && run.mode !== "abyss" && !run.daily) m.dryRuns = run.stats.legendaries > 0 ? 0 : (m.dryRuns ?? 0) + 1;
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
  if (run.scene.t === "over" && !run.scene.won && k && !run.abandoned && run.mode !== "abyss" && !run.daily && k.name !== "DEATH" && k.name !== "THE END" && k.name !== "Changeling Doppelgänger") {
    const again = k.nemesis || m.nemesis?.name === k.name;
    m.nemesis = { name: k.name, family: k.family, traits: (k.traitIds ?? []).filter(t => /^(m_|x_)/.test(t) && t !== "m_death" && t !== "m_the_end" && t !== "m_goblin" && t !== "m_thief"), level: again ? (m.nemesis?.level ?? 1) + 1 : 1 };
  }
  // The Abyss: a clear offers a Tarot card (three to choose from; four after four or more Omens accepted).
  const runWon = run.scene.t === "over" && run.scene.won;
  if (run.mode === "abyss" && runWon && !alreadyEarned && !run.tarotOffered) {
    run.tarotOffered = true;
    m.abyssWins = (m.abyssWins ?? 0) + 1;
    m.tarotOffer = tarotOffer(m.tarot ?? {}, makeRng(run.seed ^ 0x7a307), omensTaken(run.hero) >= OMENS_FOR_FOUR ? 4 : 3);
  }
  // Heat bounties: the dungeon beaten at a Heat this class hasn't beaten it at before (up to the cap).
  if (run.mode === "campaign" && runWon && !run.daily && !run.bountyPaid) {
    run.bountyPaid = true;
    run.bounties = payBounties(m, run.hero.origin, heatOf(run));
  }
  // The Camp Ledger: marks for this run's path.
  const marks = ledgerMarks(run);
  if (marks.length && run.hero.path) { const l = ((m.ledger ??= {})[run.hero.path] ??= []); for (const k of marks) if (!l.includes(k)) l.push(k); }
  const won = run.hero.f.persist["layersWon"] ?? 0;
  if (run.gridMode && won) (m.layersBeaten ??= {})[run.hero.origin] = Math.max(m.layersBeaten[run.hero.origin] ?? 0, won);
  if (run.gridMode && !alreadyEarned) bankLongRoad(m, run);
  else m.bestFloor = Math.max(m.bestFloor, run.floor);
  m.found = [...new Set([...m.found, ...run.found])];
  saveMeta(m);
  // Class Mastery: floors reached and bosses beaten (only the part not counted yet, if a won run carried on).
  const o = run.hero.origin;
  const total = masteryFor(run);
  const gained = Math.max(0, total - (run.masteryBanked ?? 0));
  run.masteryBanked = total;
  const beforeLv = masteryLevel(m.mastery?.[o] ?? 0);
  m.mastery = { ...(m.mastery ?? {}), [o]: (m.mastery?.[o] ?? 0) + gained };
  const lv = masteryLevel(m.mastery[o] ?? 0);
  if (run.scene.t === "over" && run.scene.won && run.mode === "campaign" && !alreadyEarned) m.winsBy = { ...(m.winsBy ?? {}), [o]: (m.winsBy?.[o] ?? 0) + 1 };
  // Achievements: each once, with a Renown bonus.
  trackMarks(run);
  m.encounters = [...new Set([...(m.encounters ?? []), ...(run.encounters ?? [])])];
  const got: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (m.achievements?.includes(a.id)) continue;
    const ok = a.id === "mastery10" ? lv >= MASTERY_MAX : a.id === "mastery_all" ? ["warrior", "rogue", "mage", "cleric"].every(c => masteryLevel(m.mastery?.[c] ?? 0) >= MASTERY_MAX) : a.check(run, { wins: m.wins, winsBy: m.winsBy as Record<string, number>, encounters: m.encounters });
    if (!ok) continue;
    m.achievements = [...(m.achievements ?? []), a.id];
    m.renown += a.renown;
    got.push(a.id);
  }
  saveMeta(m);
  return { earned, achievements: got, mastery: { origin: o, gained, level: lv, levelUp: lv > beforeLv }, unlocked: UNLOCK_TIERS.filter(t => before < t.at && m.renown >= t.at).map(t => t.name) };
}


/** The classes in the Tavern: the Warrior and the Mage from the start; beat the first layer's boss as the Mage for the
 *  Cleric, as the Warrior for the Rogue. */
export const CLASS_UNLOCK: Record<string, { by: string; text: string } | null> = {
  warrior: null, mage: null,
  cleric: { by: "mage", text: "Beat the first layer's boss as the Mage." },
  rogue: { by: "warrior", text: "Beat the first layer's boss as the Warrior." }
};
export const classOpen = (m: Meta, origin: string) => { const u = CLASS_UNLOCK[origin]; return !u || (m.layersBeaten?.[u.by] ?? 0) >= 1; };


/** The Crawl's long road, banked when a run ends: passive tree points (once the class's tree is open), weapon
 *  mastery XP, and any totems found. */
export function bankLongRoad(m: Meta, run: Run) {
  const p = run.hero.f.persist;
  if (treeOpen(m, run.hero.origin)) treeOf(m, run.hero.origin).points += treePointsFor(p["layersWon"] ?? 0, p["l1depth"] ?? 0);
  for (const fam of MASTERY_FAMILIES) if (p[`wmx_${fam}`]) (m.weaponXp ??= {})[fam] = (m.weaponXp[fam] ?? 0) + p[`wmx_${fam}`];
  for (const t of TOTEMS) if (p[`totf_${t.id}`]) (m.totems ??= {})[t.id] = (m.totems[t.id] ?? 0) + p[`totf_${t.id}`];
  // Fish carried home, and the Camp's pool is full of bites again.
  for (const f of FISH) if (p[`fishk_${f.id}`]) (m.fish ??= {})[f.id] = (m.fish[f.id] ?? 0) + p[`fishk_${f.id}`];
  m.fishCasts = CAMP_CASTS;
  // The Bestiary: what this run beat.
  for (const [name, k] of Object.entries(run.kills ?? {})) {
    const e = ((m.bestiary ??= {})[name] ??= { kills: 0, hp: 0, power: 0 });
    e.kills += k.n; e.hp = Math.max(e.hp, k.hp); e.power = Math.max(e.power, k.power); e.family = k.family ?? e.family; e.boss = e.boss || k.boss || undefined;
  }
}

// ---------- Tarot ----------
/** Take a card from an Abyss clear's offer: a new card at level I, or one you own a level up (to III at most). */
export function takeTarot(m: Meta, id: string): boolean {
  if (!m.tarotOffer?.includes(id)) return false;
  m.tarot = { ...(m.tarot ?? {}), [id]: Math.min(TAROT_MAX_LEVEL, (m.tarot?.[id] ?? 0) + 1) };
  m.tarotOffer = undefined;
  saveMeta(m);
  return true;
}
/** Carry a card into normal runs (or set it down). Two at most. */
export function toggleTarot(m: Meta, id: string): string | null {
  if (!m.tarot?.[id]) return null;
  const eq = m.tarotEquip ?? [];
  if (eq.some(e => e.id === id)) m.tarotEquip = eq.filter(e => e.id !== id);
  else if (eq.length >= TAROT_SLOTS) return `You can carry ${TAROT_SLOTS} cards. Set one down first.`;
  else m.tarotEquip = [...eq, { id }];
  saveMeta(m);
  return null;
}
/** Turn a carried card over (Reversed: twice the boon, twice the bane). From level II. */
export function flipTarot(m: Meta, id: string): boolean {
  const e = m.tarotEquip?.find(x => x.id === id);
  if (!e || (m.tarot?.[id] ?? 0) < 2 || TAROT_MAP.get(id)?.noReverse) return false;
  e.rev = !e.rev;
  saveMeta(m);
  return true;
}
/** The cards carried, as the run takes them. */
export const carriedTarot = (m: Meta): TarotSlot[] => (m.tarotEquip ?? []).filter(e => (m.tarot?.[e.id] ?? 0) > 0 && TAROT_MAP.has(e.id)).map(e => ({ id: e.id, lvl: m.tarot![e.id]!, rev: e.rev && (m.tarot![e.id] ?? 0) >= 2 && !TAROT_MAP.get(e.id)?.noReverse ? true : undefined }));

// ---------- Heat bounties ----------
/** Pay the bounties for beating the dungeon at Heat n with a class: one for each Heat level above its best (up to the cap). */
export function payBounties(m: Meta, origin: string, heat: number): { heat: number; crowns: number; scrolls: number }[] {
  const best = m.heatBest?.[origin] ?? 0, top = Math.min(BOUNTY_CAP, heat);
  if (top <= best) return [];
  const out: { heat: number; crowns: number; scrolls: number }[] = [];
  const c = (m.camp ??= { crowns: 0, mats: {}, hall: {} });
  for (let n = best + 1; n <= top; n++) { const r = bountyReward(n); c.crowns += r.crowns; c.scrolls = (c.scrolls ?? 0) + r.scrolls; out.push({ heat: n, ...r }); }
  m.heatBest = { ...(m.heatBest ?? {}), [origin]: top };
  return out;
}

/** A class's path for the next run: the one chosen at the Camp (if it's open), else its first. */
export function chosenPath(m: Meta, origin: string): string {
  const ps = pathsOf(origin as never);
  const want = m.path?.[origin];
  const i = ps.findIndex(p => p.id === want);
  return i > 0 && (m.layersBeaten?.[origin] ?? 0) < 1 ? ps[0].id : (ps[i]?.id ?? ps[0].id);
}
