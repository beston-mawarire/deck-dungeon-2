// Between-run progress: Class Mastery (and the starting kits it unlocks), Achievements (Renown and titles),
// Heat levels (optional Campaign difficulty) and the Abyss's weekly twist.
import { GEAR_BASES } from "../data";
import { EVENTS } from "../data/events";
import type { GearItem, OriginId, Rarity } from "../engine/types";
import { EQUIP_SLOTS, recompute } from "./hero";
import type { Run } from "./run";

// ---------- Class Mastery ----------
/** Total mastery XP needed for each level (level 1 is free). */
export const MASTERY_XP = [0, 0, 6, 14, 25, 40, 58, 80, 106, 136, 170];
export const MASTERY_MAX = 10;
/** Common starting-kit choices open at this mastery level; Uncommon ones at the next. */
export const KIT_COMMON_LEVEL = 2;
export const KIT_UNCOMMON_LEVEL = 6;

export function masteryLevel(xp: number): number {
  let lv = 1;
  for (let l = 2; l <= MASTERY_MAX; l++) if (xp >= MASTERY_XP[l]) lv = l;
  return lv;
}
/** Mastery XP a run earns for its class: floors reached plus bosses beaten. */
export function masteryFor(run: Run): number {
  const won = run.scene.t === "over" && run.scene.won;
  return Math.max(0, run.floor - 1 + (won ? 1 : 0)) + run.stats.bosses;
}

export type KitSlot = "main" | "off" | "armour";
export const KIT_SLOTS: KitSlot[] = ["main", "off", "armour"];
export type Kit = Partial<Record<KitSlot, string>>;

/** The plain items a class can start with in a slot: Commons (and, at high mastery, Uncommons). */
export function kitOptions(slot: KitSlot, level: number, locked: Set<string> = new Set()): { id: string; name: string; rarity: Rarity; text: string }[] {
  const allowed: Rarity[] = level >= KIT_UNCOMMON_LEVEL ? ["common", "uncommon"] : level >= KIT_COMMON_LEVEL ? ["common"] : [];
  return GEAR_BASES.filter(b => b.onlyRarity && allowed.includes(b.onlyRarity) && !b.legendary && !locked.has(b.id) && (b.weight ?? 1) > 0 &&
    (slot === "off" ? b.slot === "off" || (b.kind === "weapon" && b.offDamage !== undefined) : b.slot === slot))
    .map(b => ({ id: b.id, name: b.name, rarity: b.onlyRarity!, text: b.text }))
    .sort((a, b) => (a.rarity === b.rarity ? a.name.localeCompare(b.name) : a.rarity === "common" ? -1 : 1));
}

/** Swap the chosen starting-kit items in (anything not chosen stays as the class's own). */
export function applyKit(run: Run, kit: Kit | undefined, level: number) {
  if (!kit) return;
  const h = run.hero;
  for (const slot of KIT_SLOTS) {
    const id = kit[slot];
    if (!id) continue;
    const opt = kitOptions(slot, level).find(o => o.id === id);
    if (!opt) continue;
    const it: GearItem = { uid: h.nextUid++, base: id, rarity: opt.rarity, level: 1, bonuses: {}, revealed: true };
    h.equip[slot] = it;
  }
  recompute(h);
  h.f.hp = h.f.maxHp;
}

// ---------- Achievements ----------
export interface Achievement { id: string; name: string; text: string; renown: number; title?: string; group?: string; check: (run: Run, m: { wins?: number; winsBy?: Record<string, number>; encounters?: string[] }) => boolean }
const won = (r: Run) => r.scene.t === "over" && r.scene.won;
const P = (r: Run, k: string) => r.hero.f.persist[k] ?? 0;
const campaignWon = (r: Run) => r.scene.t === "over" && r.scene.won && r.mode === "campaign";
export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_boss", name: "First Steps", text: "Beat a floor boss", renown: 10, title: "Delver", check: r => r.stats.bosses >= 1 },
  { id: "champ_f1", name: "Punching Up", text: "Beat a Champion on floor 1", renown: 15, title: "Upstart", check: r => P(r, "ach_champ1") > 0 },
  { id: "goblin", name: "Goblin Slayer", text: "Catch a Treasure Goblin before it escapes", renown: 10, check: r => P(r, "ach_goblin") > 0 },
  { id: "flawless_boss", name: "Untouched", text: "Beat a boss without taking a hit", renown: 20, title: "Untouchable", check: r => P(r, "ach_flawless_boss") > 0 },
  { id: "campaign_win", name: "Gatecloser", text: "Win the Campaign", renown: 30, title: "Gatecloser", check: r => won(r) && r.mode === "campaign" },
  { id: "teetotal", name: "Teetotal", text: "Win the Campaign without drinking a single potion", renown: 40, title: "Teetotaller", check: r => won(r) && r.mode === "campaign" && P(r, "potsDrunk") === 0 },
  { id: "hot_win", name: "Trial by Fire", text: "Win the Campaign at Heat 3 or higher", renown: 50, title: "Firewalker", check: r => won(r) && r.mode === "campaign" && (r.heat ?? 0) >= 3 },
  { id: "inferno_win", name: "Inferno", text: "Win the Campaign at Heat 5", renown: 100, title: "Inferno-born", check: r => won(r) && r.mode === "campaign" && (r.heat ?? 0) >= 5 },
  { id: "floor10", name: "Into the Deep", text: "Reach floor 10", renown: 20, check: r => r.mode !== "abyss" && r.floor >= 10 },
  { id: "floor20", name: "Horror's Doorstep", text: "Reach floor 20", renown: 30, title: "Deepwalker", check: r => r.mode !== "abyss" && r.floor >= 20 },
  { id: "cursed20", name: "Damned and Delving", text: "Reach floor 20 carrying 3 or more curses", renown: 40, title: "The Damned", check: r => r.mode !== "abyss" && r.floor >= 20 && Object.values(r.hero.curses).reduce((a, n) => a + n, 0) >= 3 },
  { id: "death", name: "Reaper's Reaper", text: "Beat DEATH", renown: 100, title: "Deathless", check: r => P(r, "ach_death") > 0 },
  { id: "the_end", name: "After the End", text: "Beat THE END", renown: 200, title: "Eternal", check: r => !!r.finale },
  { id: "nemesis", name: "Settled Score", text: "Beat your Nemesis", renown: 15, title: "Avenger", check: r => !!r.nemesisBeaten },
  { id: "legend_set", name: "Living Legend", text: "Finish a run wearing nothing but Legendaries", renown: 40, title: "Living Legend", check: r => EQUIP_SLOTS.every(s => !r.hero.equip[s] || ["legendary", "crimson", "epic_crimson", "legendary_crimson"].includes(r.hero.equip[s]!.rarity)) && EQUIP_SLOTS.filter(s => r.hero.equip[s]).length >= 5 },
  { id: "hit1k", name: "Heavy Hitter", text: "Land a hit of 1,000 or more", renown: 15, check: r => Math.max(P(r, "t_best"), r.stats.bestHit) >= 1000 },
  { id: "hit100k", name: "Worldbreaker", text: "Land a hit of 100,000 or more", renown: 50, title: "Worldbreaker", check: r => Math.max(P(r, "t_best"), r.stats.bestHit) >= 100000 },
  { id: "daily", name: "Daily Grind", text: "Reach floor 3 in a Daily Dungeon", renown: 10, check: r => !!r.daily && r.floor >= 3 },
  { id: "abyss5", name: "Abyss Diver", text: "Reach depth 5 of the Abyss", renown: 30, title: "Abyss Diver", check: r => r.mode === "abyss" && r.floor >= 5 },
  { id: "abyss10", name: "Rock Bottom", text: "Clear the Abyss", renown: 100, title: "Abyssal", check: r => r.mode === "abyss" && won(r) },
  { id: "all_classes", name: "Paragon", text: "Win the Campaign with every class", renown: 50, title: "Paragon", check: (_r, m) => ["warrior", "rogue", "mage", "cleric"].every(o => (m.winsBy?.[o] ?? 0) > 0) },
  { id: "mastery10", name: "Grandmaster", text: "Reach mastery 10 with a class", renown: 50, title: "Grandmaster", check: () => false },
  { id: "mastery_all", name: "Master of All", text: "Reach mastery 10 with every class", renown: 150, title: "Master of All", check: () => false },
  { id: "low_hp_win", name: "By a Thread", text: "Win a fight with less than 10% of your HP left", renown: 15, check: r => P(r, "ach_low_hp_win") > 0 },
  { id: "all_leg", name: "Legendary Wardrobe", text: "Wear only Legendaries, in every slot", renown: 40, title: "Legend-clad", check: r => P(r, "ach_all_leg") > 0 },
  { id: "all_epic", name: "Purple Reign", text: "Wear only Epics, in every slot", renown: 25, check: r => P(r, "ach_all_epic") > 0 },
  { id: "all_rare", name: "Feeling Blue", text: "Wear only Rares, in every slot", renown: 15, check: r => P(r, "ach_all_rare") > 0 },
  { id: "common_win", name: "Humble Hero", text: "Win the Campaign with a Common item equipped", renown: 25, title: "the Humble", check: r => campaignWon(r) && EQUIP_SLOTS.some(sl => r.hero.equip[sl]?.rarity === "common") },
  { id: "empty_slot_win", name: "Underdressed", text: "Win the Campaign with an empty equipment slot", renown: 25, check: r => campaignWon(r) && ["main", "off", "armour", "trinket1", "trinket2"].some(sl => !r.hero.equip[sl as "main"]) },
  { id: "gold2k", name: "Deep Pockets", text: "Hold 2,000 Gold at once", renown: 15, check: r => P(r, "ach_max_gold") >= 2000 },
  { id: "gold10k", name: "Dragon's Hoard", text: "Hold 10,000 Gold at once", renown: 40, title: "the Hoarder", check: r => P(r, "ach_max_gold") >= 10000 },
  { id: "dragon", name: "Dragonslayer", text: "Beat a dragon", renown: 30, title: "Dragonslayer", check: r => P(r, "ach_dragon") > 0 },
  { id: "blessing", name: "Blessed", text: "Receive a blessing", renown: 10, check: r => P(r, "ach_blessing") > 0 },
  { id: "one_hit", name: "One and Done", text: "Die to a single hit", renown: 5, check: r => P(r, "ach_one_hit") > 0 },
  { id: "no_dmg_death", name: "Pacifist", text: "Die without hurting the enemy at all", renown: 5, check: r => P(r, "ach_no_dmg_death") > 0 },
  { id: "f1_boss_death", name: "Humbled", text: "Die to the floor 1 boss", renown: 5, check: r => P(r, "ach_f1_boss_death") > 0 },
  { id: "miss3", name: "Butterfingers", text: "Miss 3 attacks in a row", renown: 5, check: r => P(r, "bestMissStreak") >= 3 },
  { id: "crit3", name: "On a Roll", text: "Roll 3 Crits in a row", renown: 15, check: r => P(r, "bestCritStreak") >= 3 },
  { id: "crit6", name: "Loaded Dice", text: "Roll 6 Crits in a row", renown: 50, title: "the Lucky", check: r => P(r, "bestCritStreak") >= 6 },
  { id: "salvage_leg", name: "What Have I Done", text: "Scrap a Legendary", renown: 10, check: r => P(r, "ach_salvage_leg") > 0 },
  { id: "sell_leg", name: "Cash Is King", text: "Sell a Legendary", renown: 10, check: r => P(r, "ach_sell_leg") > 0 },
  { id: "sell_all", name: "Naked Ambition", text: "Sell every piece of gear you're wearing", renown: 10, check: r => P(r, "ach_sell_all") > 0 },
  { id: "combine", name: "Two Become One", text: "Combine two items at the Forge", renown: 10, check: r => P(r, "ach_combine") > 0 },
  { id: "transmute", name: "Alchemist", text: "Transmute an item with the Crucible", renown: 20, check: r => P(r, "ach_transmute") > 0 },
  { id: "fuse", name: "Jeweller's Apprentice", text: "Fuse two things at the Jeweller", renown: 15, check: r => P(r, "ach_fuse") > 0 },
  { id: "infuse", name: "Infused", text: "Infuse a trinket into your gear at the Jeweller", renown: 15, check: r => P(r, "ach_infuse") > 0 },
  { id: "warrior_noguard", name: "No Shield Needed", text: "Win the Campaign as a Warrior without ever Guarding", renown: 50, title: "the Reckless", check: r => campaignWon(r) && r.hero.origin === "warrior" && P(r, "act_guard") === 0 },
  { id: "mage_nobarrier", name: "Unshielded", text: "Win the Campaign as a Mage without ever using Elemental Barrier", renown: 50, check: r => campaignWon(r) && r.hero.origin === "mage" && P(r, "act_barrier") === 0 },
  { id: "rogue_nocounter", name: "Straight Shooter", text: "Win the Campaign as a Rogue without ever Countering", renown: 50, check: r => campaignWon(r) && r.hero.origin === "rogue" && P(r, "act_counter") === 0 },
  { id: "gen_greater", name: "A Cut Above", text: "Find an item with a ✦ Greater roll", renown: 10, check: r => P(r, "ach_greater") > 0 },
  { id: "gen_mythic", name: "Mythic", text: "Find an item with a ✦✦✦ Mythic roll", renown: 40, title: "the Blessed", check: r => P(r, "ach_mythic") > 0 },
  { id: "gen_overcharged", name: "Overcharged", text: "Find an Overcharged item", renown: 50, title: "Live Wire", check: r => P(r, "ach_overcharged") > 0 },
  { id: "gen_veined", name: "Red in the Vein", text: "Find a Crimson-veined item", renown: 20, check: r => P(r, "ach_veined") > 0 },
  { id: "sigil_two", name: "Matching Pair", text: "Wear two sigils of the same set", renown: 10, check: r => P(r, "ach_sigil2") > 0 },
  { id: "sigil_full", name: "Full Talisman", text: "Wear a complete sigil set", renown: 40, title: "the Complete", check: r => P(r, "ach_sigil_full") > 0 },
  { id: "cleric_nopenance", name: "No Regrets", text: "Win the Campaign as a Cleric without ever using Penance", renown: 50, check: r => campaignWon(r) && r.hero.origin === "cleric" && P(r, "act_penance") === 0 }
];

// ---------- Heat ----------
/** Optional Campaign difficulty, unlocked by your first Campaign win. Each level adds its twist on top of the ones below. */
export const HEAT_LEVELS = [
  { level: 1, name: "Tougher foes", text: "Every enemy has 30% more HP" },
  { level: 2, name: "Lean pickings", text: "Shop prices are 30% higher, and you get 25% less Gold from everything" },
  { level: 3, name: "Cold campfires", text: "Campfires heal half as much" },
  { level: 4, name: "Hungry dark", text: "No heal after winning a fight" },
  { level: 5, name: "Elite swarm", text: "Elites and Champions turn up twice as often, and every enemy hits 20% harder" }
];
export const HEAT_MAX = 5;
export const HEAT_RENOWN = 0.2;
export const heatOf = (run: Run) => (run.mode === "abyss" || run.daily ? 0 : run.heat ?? 0);

// ---------- The Abyss: this week's twist ----------
export const ABYSS_MODS = [
  { id: "crimson_tide", icon: "🩸", name: "Crimson Tide", text: "Every Champion is Crimson: deadlier, with Crimson loot and Keys" },
  { id: "deep_flasks", icon: "🧪", name: "Deep Flasks", text: "Healing Potions heal twice as much" },
  { id: "glass_cannon", icon: "💥", name: "Glass Cannon", text: "You deal 30% more damage, and so does everything else" },
  { id: "golden_depths", icon: "🪙", name: "Golden Depths", text: "Twice the Gold from fights and chests" },
  { id: "thick_hides", icon: "🛡️", name: "Thick Hides", text: "Enemies have 30% more HP, but you earn 50% more XP" },
  { id: "merciful_dark", icon: "🕯️", name: "Merciful Dark", text: "Each won fight heals twice as much" },
  { id: "blood_moon", icon: "🌕", name: "Blood Moon", text: "Every foe grows stronger each round, but relics drop twice as often" },
  { id: "goblin_rush", icon: "💰", name: "Goblin Rush", text: "Treasure Goblins are everywhere" }
] as const;
export type AbyssModId = (typeof ABYSS_MODS)[number]["id"];
/** This week's twist (weeks start on Monday, UTC). */
export function currentAbyssMod(now = Date.now()) {
  const week = Math.floor((now / 864e5 + 3) / 7);
  return ABYSS_MODS[week % ABYSS_MODS.length];
}
export const abyssMod = (run: Run, id: AbyssModId) => run.mode === "abyss" && run.abyssMod === id;

export type { OriginId };

// ---------- Encounter achievements: every event (and every choice in it), and the special rooms ----------
const met = (key: string) => (_r: Run, m: { encounters?: string[] }) => !!m.encounters?.includes(key);
const ROOM_ACHIEVEMENTS: [string, string, string][] = [
  ["rest", "Warm Hands", "Rest at a Campfire"],
  ["shop", "Customer", "Buy something from the Merchant"],
  ["forge", "Smith's Apprentice", "Upgrade an item at the Forge"],
  ["shrine", "Devotee", "Pray at a Shrine (and take its curse)"],
  ["altar", "Bloodletting", "Give your blood to an Altar"],
  ["vault", "Vault Breaker", "Open a Resplendent Vault"],
  ["crimson_vault", "Into the Red", "Enter a Crimson Vault"],
  ["bounty", "Bounty Hunter", "Take a contract at a Bounty Board"],
  ["sanctum", "Dragonblood", "Unify with a Dragon Heart"]
];
for (const [room, name, text] of ROOM_ACHIEVEMENTS) ACHIEVEMENTS.push({ id: `room_${room}`, name, text, renown: 5, group: "Encounters", check: met(`room:${room}`) });
for (const ev of EVENTS) {
  ACHIEVEMENTS.push({ id: `ev_${ev.id}`, name: ev.title, text: ev.unique ? "Meet this once-a-run encounter" : (ev.weight ?? 1) < 1 ? "Find this rare encounter" : "Take part in this encounter", renown: ev.unique || (ev.weight ?? 1) < 1 ? 10 : 5, group: "Encounters", check: met(`ev:${ev.id}`) });
  if (ev.options.length >= 2) ACHIEVEMENTS.push({ id: `evall_${ev.id}`, name: `${ev.title}: every choice`, text: `Try all ${ev.options.length} choices here (across your runs)`, renown: 10, group: "Encounters",
    check: (_r, m) => ev.options.every((_, i) => !!m.encounters?.includes(`evopt:${ev.id}:${i}`)) });
}
