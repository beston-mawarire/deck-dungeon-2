// The Camp's stores and the Hall: Crown Shards (from the bosses of each layer) and Camp materials (from the foes of
// each family), kept between runs once you bring them home (a death brings home nothing). The Hall spends them on lasting upgrades.
import { MASTERY_FAMILIES, treeOpen, treeTalents, wmLevel } from "./longroad";
import type { Meta } from "./meta";
import type { Run } from "./run";
import { recompute } from "./hero";

export type Mat = "bone" | "hide" | "cog" | "sigil";
export const MATS: Record<Mat, { name: string; icon: string; family: string }> = {
  bone: { name: "Bone Dust", icon: "🦴", family: "Undead" },
  hide: { name: "Hide", icon: "🐾", family: "Beast" },
  cog: { name: "Cogs", icon: "🔩", family: "Construct" },
  sigil: { name: "Cult Sigils", icon: "🔯", family: "Cultist" }
};
export const matOfFamily = (family?: string): Mat | undefined => (Object.keys(MATS) as Mat[]).find(k => MATS[k].family === family);

/** Seeds found below grow into herbs in the Garden; herbs become brews in the Brewery. */
export type Plant = "heartleaf" | "moonbell" | "blightcap" | "glowcap" | "ironroot" | "swiftfern" | "goldthistle" | "dreamleaf" | "emberroot" | "sweetroot" | "stoutroot" | "frostmoss" | "banewort" | "treadleaf" | "steelvine";
export type BrewKind = "heal" | "mana" | "vile" | "glow" | "iron" | "swift" | "gold" | "sage" | "ember" | "snack" | "stout" | "salve" | "bane" | "tread";
/** Each plant: its seed, how many runs it takes to grow, how often its seed turns up (weight), and what it brews into. */
export const PLANTS: Record<Plant, { name: string; seed: string; icon: string; seedIcon: string; brew: BrewKind; runs: number; weight: number; /** Steelvine: grows into a weapon, not herbs. */ weapon?: boolean }> = {
  heartleaf: { name: "Heartleaf", seed: "Heartleaf Seed", icon: "🌿", seedIcon: "🌰", brew: "heal", runs: 1, weight: 28 },
  moonbell: { name: "Moonbell", seed: "Moonbell Seed", icon: "🪻", seedIcon: "🫘", brew: "mana", runs: 2, weight: 18 },
  blightcap: { name: "Blightcap", seed: "Blightcap Spores", icon: "🍄", seedIcon: "🍂", brew: "vile", runs: 2, weight: 10 },
  glowcap: { name: "Glowcap", seed: "Glowcap Spores", icon: "🍄‍🟫", seedIcon: "✨", brew: "glow", runs: 1, weight: 10 },
  ironroot: { name: "Ironroot", seed: "Ironroot Seed", icon: "🪵", seedIcon: "🔩", brew: "iron", runs: 2, weight: 8 },
  swiftfern: { name: "Swiftfern", seed: "Swiftfern Spores", icon: "🌱", seedIcon: "🍃", brew: "swift", runs: 2, weight: 8 },
  goldthistle: { name: "Goldthistle", seed: "Goldthistle Seed", icon: "🌼", seedIcon: "🟡", brew: "gold", runs: 1, weight: 7 },
  dreamleaf: { name: "Dreamleaf", seed: "Dreamleaf Seed", icon: "🍀", seedIcon: "💤", brew: "sage", runs: 2, weight: 6 },
  emberroot: { name: "Emberroot", seed: "Emberroot Seed", icon: "🌶️", seedIcon: "🔥", brew: "ember", runs: 2, weight: 5 },
  // 2.7: food for the fight, wards, a bane for the strong, a tea against hazards, and a vine that grows a weapon.
  sweetroot: { name: "Sweetroot", seed: "Sweetroot Seed", icon: "🍠", seedIcon: "🟤", brew: "snack", runs: 1, weight: 20 },
  stoutroot: { name: "Stoutroot", seed: "Stoutroot Seed", icon: "🥔", seedIcon: "🪨", brew: "stout", runs: 2, weight: 9 },
  frostmoss: { name: "Frostmoss", seed: "Frostmoss Spores", icon: "🧊", seedIcon: "❄️", brew: "salve", runs: 2, weight: 8 },
  banewort: { name: "Banewort", seed: "Banewort Seed", icon: "🥀", seedIcon: "⚫", brew: "bane", runs: 2, weight: 7 },
  treadleaf: { name: "Treadleaf", seed: "Treadleaf Seed", icon: "🍃", seedIcon: "👣", brew: "tread", runs: 1, weight: 8 },
  steelvine: { name: "Steelvine", seed: "Steelvine Seed", icon: "🗡️", seedIcon: "⚙️", brew: "heal", runs: 3, weight: 3, weapon: true }
};
/** What each brew is. Potions and the Blightcap Brew go to their usual places; draughts are drunk out of a fight and last some floors. */
export const BREWS: Record<BrewKind, { name: string; icon: string; text: string; floors?: number }> = {
  heal: { name: "Healing Potion", icon: "🧪", text: "A Healing Potion for your belt" },
  mana: { name: "Mana Potion", icon: "🔷", text: "A Mana Potion" },
  vile: { name: "Blightcap Brew", icon: "🍄", text: "A throwable: Poison and Weak" },
  glow: { name: "Glowcap Tonic", icon: "🕯️", text: "See 1 tile further", floors: 3 },
  iron: { name: "Ironbark Draught", icon: "🪵", text: "+2 Armor", floors: 2 },
  swift: { name: "Fleetfoot Tonic", icon: "🍃", text: "+5% Dodge", floors: 2 },
  gold: { name: "Prospector's Tea", icon: "🪙", text: "+25% Gold from foes and urns", floors: 3 },
  sage: { name: "Sage's Tea", icon: "📖", text: "+50% XP", floors: 2 },
  ember: { name: "Firebrand Oil", icon: "🔥", text: "Your hits apply 1 Burn", floors: 1 },
  snack: { name: "Roasted Sweetroot", icon: "🍠", text: "Eat it in a fight: heal 15% of your Max HP (less than a potion, and it doesn't take your turn)" },
  stout: { name: "Stoutroot Stew", icon: "🍲", text: "In a fight: +25% Max HP (and that much HP) until the fight ends" },
  salve: { name: "Frostmoss Salve", icon: "🧊", text: "In a fight: immune to Burn, Chill, Poison, Shock and Bleed for 4 rounds" },
  bane: { name: "Banewort Draught", icon: "🥀", text: "Thrown at an Elite, a Champion or a boss: Weak and Exposed for 2 rounds (lesser foes shrug it off)" },
  tread: { name: "Treadleaf Tea", icon: "👣", text: "Spikes, lava and sludge can't hurt you", floors: 2 }
};
/** Brews carried as fight tonics (drawn from your potion drawer, and they don't use your turn). */
export const TONIC_BREWS: BrewKind[] = ["snack", "stout", "salve", "bane"];
export const isDraught = (k: string) => !!BREWS[k as BrewKind]?.floors;
export interface Plot { plant: Plant; left: number }
export interface CampStore {
  crowns: number; mats: Partial<Record<Mat, number>>; hall: Record<string, number>;
  seeds?: Partial<Record<Plant, number>>; herbs?: Partial<Record<Plant, number>>;
  /** Weapons grown on Steelvine (their rarity), waiting to go in your pack on the next run. */
  sprouts?: ("uncommon" | "rare" | "epic" | "legendary")[];
  /** (Old saves only: a pouch waiting to be unpacked. campOf moves it into the Storehouse.) */
  pouch?: { mats: Partial<Record<Mat, number>>; seeds: Partial<Record<Plant, number>> };
  /** Garden plots (null = empty), and potions brewed and waiting to be taken on the next run. */
  plots?: (Plot | null)[];
  brews?: Partial<Record<BrewKind, number>>;
  /** Scrolls of Knowledge carried home, and the insights learned from them at the Knowledge Table. */
  scrolls?: number;
  insights?: Record<string, number>;
}
export const campOf = (m: Meta): CampStore => {
  const c = (m.camp ??= { crowns: 0, mats: {}, hall: {} });
  // (A pouch from 2.7.0, still waiting to be unpacked: it goes straight into the Storehouse now.)
  if (c.pouch) {
    for (const [k, n] of Object.entries(c.pouch.mats) as [Mat, number][]) c.mats[k] = (c.mats[k] ?? 0) + n;
    for (const [k, n] of Object.entries(c.pouch.seeds) as [Plant, number][]) (c.seeds ??= {})[k] = (c.seeds[k] ?? 0) + n;
    delete c.pouch;
  }
  return c;
};

export interface HallUpgrade {
  id: string; name: string; icon: string; ranks: number;
  /** What each rank gives. */
  per: string;
  /** Cost of the next rank (1-based). */
  cost: (rank: number) => { crowns: number; mat: Mat; n: number };
}
export const HALL: HallUpgrade[] = [
  { id: "pockets", name: "Deep Pockets", icon: "👛", ranks: 4, per: "+25 starting Gold", cost: r => ({ crowns: [1, 1, 2, 2][r - 1], mat: "hide", n: 1 + r }) },
  { id: "belt", name: "Apothecary's Belt", icon: "🧪", ranks: 2, per: "+1 starting Healing Potion", cost: r => ({ crowns: [2, 3][r - 1], mat: "bone", n: 2 + 2 * r }) },
  { id: "straps", name: "Packmule's Straps", icon: "🎒", ranks: 4, per: "+4 Backpack slots", cost: r => ({ crowns: [1, 2, 2, 3][r - 1], mat: "cog", n: 1 + r }) },
  { id: "hardy", name: "Hardy", icon: "❤️", ranks: 5, per: "+4 starting Max HP", cost: r => ({ crowns: [1, 1, 2, 2, 3][r - 1], mat: "bone", n: 1 + r }) },
  { id: "thumb", name: "Green Thumb", icon: "🌱", ranks: 4, per: "+1 Garden plot (from 2)", cost: r => ({ crowns: [1, 1, 2, 3][r - 1], mat: "hide", n: 2 * r }) },
  { id: "steady", name: "Steady Hands", icon: "🫗", ranks: 2, per: "The Brewery's sweet spot is 1 wider", cost: r => ({ crowns: [2, 3][r - 1], mat: "cog", n: 3 * r }) },
  { id: "second", name: "Second Life", icon: "💫", ranks: 1, per: "Once a run, when you would die, get back up at half your Max HP", cost: () => ({ crowns: 5, mat: "sigil", n: 6 }) }
];
export const hallRank = (m: Meta, id: string) => campOf(m).hall[id] ?? 0;

/** Buy the next rank of a Hall upgrade. Returns why not, or null. */
export function buyHall(m: Meta, id: string): string | null {
  const u = HALL.find(x => x.id === id);
  if (!u) return null;
  const c = campOf(m), r = hallRank(m, id);
  if (r >= u.ranks) return `${u.name} is complete.`;
  const cost = u.cost(r + 1);
  if (c.crowns < cost.crowns) return `You need ${cost.crowns} Crown Shard${cost.crowns === 1 ? "" : "s"}.`;
  if ((c.mats[cost.mat] ?? 0) < cost.n) return `You need ${cost.n} ${MATS[cost.mat].name}.`;
  c.crowns -= cost.crowns;
  c.mats[cost.mat] = (c.mats[cost.mat] ?? 0) - cost.n;
  c.hall[id] = r + 1;
  return null;
}

/** A Crawl run sets out with the Hall's upgrades. */
export function applyHall(m: Meta, run: Run) {
  const h = run.hero;
  // How far this class has got before: some of its loot only turns up once it has beaten a layer.
  h.f.persist["classLayers"] = m.layersBeaten?.[h.origin] ?? 0;
  // The passive tree (once open): its nodes come along as talents.
  if (treeOpen(m, h.origin)) for (const [id, n] of Object.entries(treeTalents(m, h.origin))) h.talents[id] = n;
  // Weapon mastery: each family's level rides along.
  for (const fam of MASTERY_FAMILIES) { const lv = wmLevel(m.weaponXp?.[fam] ?? 0); if (lv) h.f.persist[`wm_${fam}`] = lv; }
  // A totem set at the door is used up as you go in.
  // (Totems are retired: class-sorted loot and Weapon Mastery do their job now.)
  m.totemSet = undefined;
  h.f.gold += 25 * hallRank(m, "pockets");
  h.potions += hallRank(m, "belt");
  h.packBonus = 4 * hallRank(m, "straps") || undefined;
  const hp = 4 * hallRank(m, "hardy");
  if (hp) h.f.persist["hallHp"] = hp;
  if (hallRank(m, "second")) h.f.persist["secondLife"] = 1;
  // Potions brewed at the Camp come along (and the Garden grows a little while you're gone).
  const c = campOf(m);
  if (c.brews) {
    h.potions += c.brews.heal ?? 0;
    h.manaPotions = (h.manaPotions ?? 0) + (c.brews.mana ?? 0);
    // Blightcap Brews go along to be thrown; draughts go in your pack, to drink when you choose.
    if (c.brews.vile) h.f.persist["c_brew"] = (h.f.persist["c_brew"] ?? 0) + c.brews.vile;
    for (const [k, n] of Object.entries(c.brews)) if (isDraught(k) && n) (h.draughts ??= {})[k] = (h.draughts[k] ?? 0) + n;
    for (const k of TONIC_BREWS) if (c.brews[k]) (h.tonics ??= {})[k] = (h.tonics[k] ?? 0) + c.brews[k]!;
    c.brews = {};
  }
  for (const p of gardenPlots(m)) if (p && p.left > 0) p.left--;
  // What the Knowledge Table has taught.
  for (const k of Object.keys(c.insights ?? {})) h.f.persist[`ins_${k}`] = 1;
  if (c.insights?.["transmute"]) h.crucible = true;
  recompute(h);
  h.f.hp = h.f.maxHp;
}

/** What a run found for the Camp, banked when the run ends well; a death brings home nothing.
 *  Crown Shards and Scrolls of Knowledge come home on any success. Materials and seeds: everything on a victory;
 *  after climbing out, only if you took the pouch. Either way they go straight into the Storehouse. */
export function bankCamp(m: Meta, run: Run): boolean {
  const l = run.campLoot;
  if (!l || run.scene.t !== "over") return false;
  const won = run.scene.won, ok = won || !!run.retired;
  if (!ok) return false;
  const toPouch = !won && !!run.extracted;
  if (toPouch && !run.extracted!.pouch) { l.mats = {}; l.seeds = {}; }
  const b = (l.banked ??= { crowns: 0, mats: {} });
  const c = campOf(m);
  let changed = false;
  if ((l.scrolls ?? 0) > (b.scrolls ?? 0)) { c.scrolls = (c.scrolls ?? 0) + (l.scrolls! - (b.scrolls ?? 0)); b.scrolls = l.scrolls; changed = true; }
  if (l.crowns > b.crowns) { c.crowns += l.crowns - b.crowns; b.crowns = l.crowns; changed = true; }
  for (const k of Object.keys(l.seeds ?? {}) as Plant[]) {
    const d = (l.seeds![k] ?? 0) - (b.seeds?.[k] ?? 0);
    if (d > 0) { const into = (c.seeds ??= {}); into[k] = (into[k] ?? 0) + d; (b.seeds ??= {})[k] = l.seeds![k]; changed = true; }
  }
  for (const k of Object.keys(l.mats) as Mat[]) {
    const d = (l.mats[k] ?? 0) - (b.mats[k] ?? 0);
    if (d > 0) { const into = c.mats; into[k] = (into[k] ?? 0) + d; b.mats[k] = l.mats[k]; changed = true; }
  }
  return changed;
}

// ---------- The Garden ----------

export const GARDEN_PLOTS = 2;
/** The Garden's plots (two, more from Green Thumb). */
export function gardenPlots(m: Meta): (Plot | null)[] {
  const c = campOf(m), n = GARDEN_PLOTS + hallRank(m, "thumb");
  const plots = (c.plots ??= []);
  while (plots.length < n) plots.push(null);
  return plots;
}
/** Sow a seed in an empty plot: it grows while you're away, a run or two. */
export function sow(m: Meta, i: number, plant: Plant): string | null {
  const c = campOf(m), plots = gardenPlots(m);
  if (plots[i]) return "Something's already growing there.";
  if ((c.seeds?.[plant] ?? 0) <= 0) return `You have no ${PLANTS[plant].seed}s.`;
  c.seeds![plant]!--;
  plots[i] = { plant, left: PLANTS[plant].runs };
  return null;
}
/** Harvest a grown plot: two or three herbs. */
export function harvest(m: Meta, i: number, rng: () => number = Math.random): string | null {
  const c = campOf(m), plots = gardenPlots(m), p = plots[i];
  if (!p) return null;
  if (p.left > 0) return `Still growing: ${p.left} more run${p.left === 1 ? "" : "s"}.`;
  // Steelvine grows a weapon (usually Uncommon, now and then far better); it goes with you on your next run.
  if (PLANTS[p.plant].weapon) {
    const x = rng(), rarity = x < 0.05 ? "legendary" : x < 0.2 ? "epic" : x < 0.5 ? "rare" : "uncommon";
    (c.sprouts ??= []).push(rarity);
    plots[i] = null;
    return `🗡️ The Steelvine has grown into a ${rarity[0].toUpperCase()}${rarity.slice(1)} weapon. It goes in your pack on your next run.`;
  }
  const n = 2 + (rng() < 0.4 ? 1 : 0) + (campOf(m).insights?.herbalism ? 1 : 0);
  (c.herbs ??= {})[p.plant] = (c.herbs[p.plant] ?? 0) + n;
  plots[i] = null;
  return `+${n} ${PLANTS[p.plant].icon} ${PLANTS[p.plant].name}`;
}

// ---------- The Brewery: push your luck ----------

/** Two herbs make a brew. Stir to heat the pot (a die each time); bottle it inside the band for a potion, at the sweet spot for two. Too hot and it spoils. */
export const BREW_HERBS = 2;
export const BREW_LOW = 10, BREW_SWEET = 12, BREW_HIGH = 14;
export interface Brew { plant: Plant; heat: number; rolls: number[]; done?: "spoiled" | "bottled"; made?: number }
export const brewBand = (m: Meta) => ({ low: BREW_LOW, sweetLo: BREW_SWEET, sweetHi: BREW_SWEET + 1 + hallRank(m, "steady"), high: BREW_HIGH + hallRank(m, "steady") });
export function startBrew(m: Meta, plant: Plant): Brew | string {
  const c = campOf(m);
  if ((c.herbs?.[plant] ?? 0) < BREW_HERBS) return `You need ${BREW_HERBS} ${PLANTS[plant].name}.`;
  c.herbs![plant]! -= BREW_HERBS;
  return { plant, heat: 0, rolls: [] };
}
export function stir(m: Meta, b: Brew, rng: () => number = Math.random) {
  if (b.done) return;
  const r = 1 + Math.floor(rng() * 6);
  b.rolls.push(r);
  b.heat += r;
  if (b.heat > brewBand(m).high) b.done = "spoiled";
}
export function bottle(m: Meta, b: Brew) {
  if (b.done) return;
  const band = brewBand(m);
  b.done = "bottled";
  b.made = b.heat < band.low ? 0 : b.heat >= band.sweetLo && b.heat <= band.sweetHi ? 2 : 1;
  const c = campOf(m);
  const k = PLANTS[b.plant].brew;
  c.brews ??= {};
  c.brews[k] = (c.brews[k] ?? 0) + b.made;
}

// ---------- The Knowledge Table ----------

export interface Insight { id: string; name: string; icon: string; text: string; cost: number }
export const INSIGHTS: Insight[] = [
  { id: "angling", name: "Angler's Notes", icon: "🎣", text: "Still Pools turn up in the dungeon, to fish in", cost: 1 },
  { id: "campfires", name: "Fireside Craft", icon: "🔥", text: "A campfire waits on the last floor before each layer's guardian", cost: 2 },
  { id: "merchant", name: "Merchant's Road", icon: "🛒", text: "A third Merchant sets up somewhere on every layer", cost: 2 },
  { id: "transmute", name: "The Crucible's Secret", icon: "⚗️", text: "You can transmute at the dungeon's Forges: a Common item and Starmetal become a Legendary", cost: 3 },
  { id: "herbalism", name: "Herbalism", icon: "🌿", text: "Every Garden harvest gives one more herb", cost: 2 },
  { id: "keeneye", name: "Keen Eye", icon: "👁️", text: "On every floor, you know where the trapdoor is from the start", cost: 2 },
  { id: "ledger", name: "Merchant's Ledger", icon: "📒", text: "Merchants charge you 30% less", cost: 2 },
  { id: "treasure", name: "Treasure Sense", icon: "🧭", text: "On every floor, you can sense where its chests lie", cost: 3 }
];
export function learn(m: Meta, id: string): string | null {
  const ins = INSIGHTS.find(x => x.id === id);
  if (!ins) return null;
  const c = campOf(m);
  if (c.insights?.[id]) return "You already know this.";
  if ((c.scrolls ?? 0) < ins.cost) return `You need ${ins.cost} Scroll${ins.cost === 1 ? "" : "s"} of Knowledge.`;
  c.scrolls = (c.scrolls ?? 0) - ins.cost;
  (c.insights ??= {})[id] = 1;
  return null;
}
