import { BOSSRUSH_LAYERS, bossRushLevel, CLOCK_STEPS, drillLayers, PILGRIM_CURSES, PILGRIM_LOOT } from "./drills";
import { PATH_MAP, SKILL_LEVEL } from "../data/classpaths";
// A run: three floors of path choices, fights, chests, shops, forges and bosses.
import { drawWeight } from "../data/minors";
import { relicBonus } from "../data/basic_relics";
import { CURSES, EPIC_POWERS, KEEPSAKES, LEGENDARIES, RELICS, TALENTS } from "../data";
import { CAMPAIGN_FLOORS, DEATH_FLOOR, END_FLOOR, EPIC_CRIMSON_FLOORS, makeBoss, makeDeath, makeCrimsonBoss, makeThemeBoss, makeUber, WALL_FLOOR } from "../data/bosses";
import { THEMED_FLOORS, THEMES, themeById, type FloorTheme } from "../data/themes";
import { CROSSROADS_GUISES, crossroadsEvent, EVENTS, type GameEvent } from "../data/events";
import { FUSION_RECIPES } from "../data/fusions";
import { findRecipe, TRINKET_RECIPES } from "../data/jeweller";
import { ELITE_ONLY, MONSTERS, makeDragon, makeGoblin, makeMonster, makeNemesis, makeThief, makeUnique, type MonsterRank, UNIQUES } from "../data/monsters";
import { type Action, actionToll, BLESSINGS, BREWED_THROWS, isSkill, isUnholy, MANA_MAX, playRound, startBattle, THROW_INFO, THROWS, type Throw } from "../engine/combat";
import { eachHook, getItem } from "../engine/registry";
import { makeRng } from "../engine/rng";
import { applyStatus, heal as healF, isNegative, STATUS_INFO } from "../engine/statuses";
import { NUMERALS, RUNE_MAP, RUNE_MAX_RANK, RUNES, SHUFFLER_MAP, SHUFFLERS } from "../data/runes";
import type { Battle, Fighter, GearItem, OriginId, Rarity, StatusId } from "../engine/types";
import { RARITIES } from "../engine/types";
import { autoBattleWins } from "./auto";
import { BOUNTY_BOARD_CHANCE, bountyProgress, bountyText, makeOffers, rewardText, type Bounty } from "./bounty";
import { attrOf, slotsFor, type EquipSlot, type Sigil, SIGIL_BAG_SIZE, sigilSlots, removeItem, gainPotions, potionCap, potionsPerFight, manaPotionCap, gainCleansePotions, CLEANSE_POTION_CAP, gainManaPotions, addToBackpack, canGuard, EQUIP_SLOTS, itemName, packSize, baseOf, effectiveBase, equipItem, findItem, type Hero, heroTags, newHero, recompute, removeGear, rerollCost, gouge, MAX_REROLLS, scrapValue, upgradeCost, xpToLevel } from "./hero";
import { abyssMod, heatOf } from "./progress";
import { generate, genName, setGenLuck } from "./gen";
import { GEN_MINORS } from "../data/genparts";
import { SIGIL_SETS } from "../data/talisman";
const genNameFor = (base: string, r: Parameters<typeof genName>[1]) => genName(baseOf(base), r);
import { bossOdds, chestFloorOdds, crawlTables, isLocked, ladderOdds, legendaryDue, noteFind, luckyOdds, type LootState, resetDropped, type ResplendentCard, resplendentCards, makeRewardItem, rollEpicCrimson, rollItem, rollRarity, affixesFor, unlocked, setLocked, TABLES, ABYSS_TABLES } from "./loot";
import { affixById, rescaleAffixes } from "./affixpool";
import { BREWS, type BrewKind, MATS, matOfFamily, PLANTS, type Mat, type Plant } from "./camp";
import { ATTR_PER_LEVEL, PER } from "../data/attributes";
import { type Fish, fishById, POND_CASTS, rollCatch } from "./fishing";
import { MASTERY_FAMILIES, WM_XP } from "./longroad";
import { classify } from "./families";
import { tarotOf, tarotHeat, TAROT_MAP } from "./tarot";
import { OMENS, OMEN_MAP } from "./omens";
import { HEAT_LOOT_CAP, HEAT_LOOT_PER, PACT_MAP, pactHeat } from "./pact";
import { openedAt, SIGHT, type Tile, carve, dangerOf, DANGER_DMG, DANGER_HP, digPocket, GRID_DMG, GRID_HP, type Hazard, idx, isFloor, isSeenTile, LAYER_FLOORS, layerFloors, layerOf, look, POOL_STEPS, SLUDGE_STEPS, SPIKE_DMG, MAP_H, MAP_W, reachable, type FloorMap, type Rect, roomCenter, thingAt, walkDistances } from "./grid";

/** Every floor has a name, so going deeper feels like going somewhere. */
const FLOOR_NAMES = ["The Upper Halls", "The Flooded Crypts", "The Sunken Galleries", "The Bone Vaults", "The Source of the Darkness"];
const DEEP_NAMES = ["The Ashen Deep", "The Weeping Dark", "The Rift's Edge", "The Hollow Below", "The Endless Stair", "The Drowned Cathedral", "The Red Warrens", "The Starless Vault", "The Nether Shelf", "The Last Light"];
/** 1st, 2nd, 3rd, 4th… */
export const ordinal = (n: number) => `${n}${n % 100 >= 11 && n % 100 <= 13 ? "th" : (["th", "st", "nd", "rd"][n % 10] ?? "th")}`;
export const floorName = (floor: number) => (floor <= FLOOR_NAMES.length ? FLOOR_NAMES[floor - 1] : DEEP_NAMES[(floor - FLOOR_NAMES.length - 1) % DEEP_NAMES.length]);
const FLOOR_LINES = [
  "The stairs give way to wet stone and the smell of old water.",
  "The torches burn lower here. Something has been gnawing at the walls.",
  "Bones line the passages, stacked with a care that is worse than chaos.",
  "The air tastes of ash and iron. You are far from the sun now.",
  "Even the echoes sound tired down here.",
  "The walls pulse faintly, as if the dungeon were breathing."
];

/** The campaign is five floors (five bosses). Endless keeps going; a Horror waits on floor 20, DEATH on 25 and THE END on 26. */
export const FLOORS = CAMPAIGN_FLOORS;
const ABYSS_LINES = [
  "The dark here has weight. Something enormous shifts, far below.",
  "Bones of old heroes line the walls. Their gear is long gone. Someone took it.",
  "The air hums. The things down here are hungry, and well armed.",
  "Halfway. The light you brought feels thin.",
  "Every step echoes twice. The second one isn't yours.",
  "The Champions here wear crowns taken from kings.",
  "The stone sweats black. The deepest hoards are near.",
  "You can hear it breathing now.",
  "The last depth. Whatever rules the Abyss is waiting."
];
export const STEPS_PER_FLOOR = 7;
/** Standard runs (not the Abyss): Rare, Epic and Legendary finds this much more likely. */
export const STANDARD_LOOT = 1.12;
/** Normal monsters drop an item this often (Standard). */
export const STANDARD_DROP = 0.25;
export { DEATH_FLOOR, END_FLOOR, WALL_FLOOR };
export type Mode = "campaign" | "endless" | "abyss";
/** Abyss runs: ten floors, every foe a rank tougher, far richer drops. */
export const ABYSS_FLOORS = 10;
/** How deep the dungeon "really" is: in the Abyss each floor counts as two (enemy strength and item level). */
export const depth = (run: { mode: Mode; floor: number }) => run.floor;
/** The floor the loot odds use (the Abyss counts as at least floor 3). */
const luckFloor = (run: Run) => run.floor;
/** A chest's odds in the Crawl: never below the dungeon's floor-by-floor Epic and Legendary chances. */
const chestOdds = (run: Run, odds: Partial<Record<Rarity, number>>) => {
  if (!run.gridMode) return odds;
  const g = (Math.min(FLOORS, run.floor) - 1) * LAYER_FLOORS + Math.max(1, run.grid?.depth ?? 1);
  return chestFloorOdds(odds, (g - 1) / (FLOORS * LAYER_FLOORS - 1));
};
/** A Heat condition's rank in this run (none in the Abyss or a Daily). */
export const pactRank = (run: Run, id: string) => (run.mode === "abyss" || run.daily ? 0 : Math.min(PACT_MAP.get(id)?.max ?? 0, run.hero.pact?.[id] ?? 0));
/** A dropped item: heat, the hidden ladders and the floor's Fortune, then the ladders climb or reset with what came out. */
function dropItem(run: Run, odds: Partial<Record<Rarity, number>>): GearItem {
  const r = legendaryDue(run.loot, odds) ? "legendary" : rollRarity(run.rng, ladderOdds(run.loot, heatOdds(run, odds)), luckFloor(run));
  const it = rollItem(run.hero, r, depth(run), run.rng);
  noteFind(run.loot, it.rarity);
  gateItem(run, it);
  return it;
}
/** Crawl Elites (and Champions) sometimes drop a weapon or a piece of armour. */
export const CRAWL_ELITE_GEAR = 0.22, CRAWL_CHAMPION_GEAR = 0.45;
/** The first chest you open on the 1st Layer always holds a weapon or armour, Uncommon or better (a run shouldn't reach
 *  its second floor empty-handed). */
/** HP back (a share of Max HP) for each trapdoor drop: on the 1st Layer, and deeper. */
export const DROP_HEAL_FIRST = 0.25, DROP_HEAL = 0.1;
export const FIRST_FIND_ODDS: Partial<Record<Rarity, number>> = { uncommon: 0.75, rare: 0.25 };
function firstFind(run: Run): GearItem | null {
  const p = run.hero.f.persist;
  if (!run.gridMode || run.mode === "abyss" || run.floor !== 1 || p["firstFind"]) return null;
  p["firstFind"] = 1;
  const it = crawlGear(run, FIRST_FIND_ODDS);
  it.reqLevel = undefined;
  return it;
}
function crawlGear(run: Run, odds: Partial<Record<Rarity, number>>): GearItem {
  let it = dropItem(run, odds);
  for (let k = 0; k < 8 && !["weapon", "armour"].includes(effectiveBase(it).kind); k++) it = dropItem(run, odds);
  return it;
}
/** The Crawl: some finds (about 30%, of any rarity) want a slightly stronger hero than you are when you find them:
 *  one level more, never further. The rest you can use straight away. */
export const GATE_CHANCE = 0.3;
/** The most levels above you a find can ask for. */
export const GATE_MAX_ABOVE = 1;
export function gateItem(run: Run, it: GearItem) {
  if (!run.gridMode || run.rng() >= GATE_CHANCE) return;
  it.reqLevel = run.hero.level + GATE_MAX_ABOVE;
}
/** A find's odds, after Heat and the Tarot: Heat (and the Devil's curses, and Death's Reaping) make Rare-or-better likelier;
 *  the Wheel of Fortune swings to the extremes. */
const heatOdds = (run: Run, odds: Partial<Record<Rarity, number>>): Partial<Record<Rarity, number>> => {
  const h = run.hero, out = { ...odds };
  const devil = tarotOf(h, "devil"), wheel = tarotOf(h, "wheel");
  const curses = Object.values(h.curses).reduce((a, b) => a + b, 0);
  const up = (1 + HEAT_LOOT_PER * Math.min(HEAT_LOOT_CAP, heatOf(run))) * STANDARD_LOOT
    * (1 + 0.12 * devil.boon * curses) * (1 + (h.boundCurses?.length ? PILGRIM_LOOT * curses : 0)) * (1 + 0.03 * (h.f.persist["reaping"] ?? 0)) * (1 + 0.25 * (h.omens?.["gilded"] ?? 0));
  for (const r of ["rare", "epic", "legendary"] as const) if (out[r]) out[r] = out[r]! * up;
  if (wheel.on) {
    for (const r of ["epic", "legendary"] as const) if (out[r]) out[r] = out[r]! * (1 + 0.6 * wheel.boon);
    for (const r of ["rare", "uncommon"] as const) if (out[r]) out[r] = out[r]! * Math.pow(0.7, wheel.bane);
    if (odds.common !== undefined || odds.uncommon !== undefined) out.common = (out.common ?? 0) + 10 * wheel.bane;
  }
  return out;
};
/** The Abyss: the layer below the last (the 6th), its foes a little deadlier than that layer's own. */
export const ABYSS_LAYER = 6;
export const ABYSS_HP = 1.15, ABYSS_DMG = 1.1;
/** From this Campaign floor on, foes scale harder every floor. */
export const DEEP_FLOOR = 15;
/** In the Abyss, the 7th Elite fight in a row is a boss instead. */
export const ABYSS_ELITE_STREAK = 7;
/** Status immunities a boss can carry. */
const BOSS_IMMUNITIES = ["x_fireproof", "x_antitoxic", "x_bloodless", "x_insulated", "x_frostproof", "x_hexproof"];
/** Abyss Merchants charge far more. */
export const ABYSS_PRICE_MULT = 2;
export const ABYSS_BASE = 1.65;
export const ABYSS_DMG_GROWTH = 1.34;
export const ABYSS_DMG_BASE = 1.45;
/** From this floor on (outside the Abyss), bosses drop Ruin Shards, and sometimes a Vanadium Plate. */
export const RUIN_FLOOR = 20;
export const PLATE_CHANCE = 0.25;
const tables = (run: Run): Record<keyof typeof ABYSS_TABLES, Partial<Record<Rarity, number>>> => (run.gridMode ? crawlTables(run.floor) : run.mode === "abyss" ? ABYSS_TABLES : { ...TABLES, uber: TABLES.boss });

export type RoomType = "ascent" | "obsidian" | "doppelganger" | "sacred_spring" | "fallen_adventurer" | "starving_pilgrim" | "alchemist" | "blacksmith" | "gambling_den" | "fortune_teller" | "mirror_pool" | "card_sharp" | "sanguine" | "cleansing" | "nemesis" | "fight" | "elite" | "champion" | "wooden" | "iron" | "vault" | "altar" | "shrine" | "shop" | "forge" | "rest" | "event" | "boss" | "crimson_elite" | "crimson_vault" | "unique" | "goblin" | "sanctum" | "bounty" | "crossroads" | "jeweller" | "masterwork" | "oath" | "secret" | "offering" | "pond";

export const ROOM_INFO: Record<RoomType, { name: string; icon: string; text: string }> = {
  fight: { name: "Monster", icon: "⚔️", text: "A fight. Gold, XP, maybe a drop." },
  elite: { name: "Elite", icon: "💀", text: "A tougher fight. Always drops an item." },
  champion: { name: "Champion", icon: "👹", text: "Very dangerous. Rare loot, often better." },
  ascent: { name: "The Way Up", icon: "🧗", text: "A rope back to the surface, in a nook of its own. Climb out here: the deeper you are, the more it's worth." },
  obsidian: { name: "Obsidian Chest", icon: "🖤", text: "The item you sealed when you last climbed out. It waits here for you." },
  wooden: { name: "Wooden Chest", icon: "📦", text: "An old wooden chest." },
  iron: { name: "Iron Chest", icon: "🧰", text: "A heavy chest, bound in iron." },
  vault: { name: "Guarded Vault", icon: "🏛️", text: "Beat a Champion, then open a Resplendent chest." },
  altar: { name: "Blood Altar", icon: "🩸", text: "Pay 25% of your Max HP for a Resplendent chest." },
  shrine: { name: "Cursed Shrine", icon: "🕯️", text: "Take a curse for a Resplendent chest." },
  shop: { name: "Merchant", icon: "🪙", text: "Buy gear and potions." },
  forge: { name: "Forge", icon: "🔨", text: "Spend Scrap to upgrade gear, make an Offering or transmute." },
  masterwork: { name: "Masterwork", icon: "⚒️", text: "Rework a line, extract a Scroll of Power, empower or refine a Common." },
  rest: { name: "Campfire", icon: "🔥", text: "Rest and heal." },
  sanctum: { name: "Dragon Sanctum", icon: "🐲", text: "Your Dragon Heart beats faster. Something old waits here." },
  jeweller: { name: "Jeweller", icon: "💍", text: "Two things on the bench, one comes back. For a fee." },
  crossroads: { name: "The Crossroads", icon: "🌒", text: "Two tunnels, one figure." },
  cleansing: { name: "Cleansing", icon: "⛲", text: "Somewhere your curses could be lifted, for a price." },
  sanguine: { name: "Sanguine Altar", icon: "🩸", text: "Trade your own blood for power. The more you give, the more it gives back." },
  alchemist: { name: "The Alchemist", icon: "⚗️", text: "Bubbling flasks and a crooked smile. Tonics for the fights ahead." },
  blacksmith: { name: "Wandering Blacksmith", icon: "⚒️", text: "A portable anvil in a side passage, and a smith in a good mood." },
  gambling_den: { name: "Gambling Den", icon: "🎲", text: "Bone dice clatter on a crate. Double or nothing." },
  fortune_teller: { name: "Fortune Teller", icon: "🔮", text: "She sees gold in your future… for a price." },
  mirror_pool: { name: "The Mirror Pool", icon: "🪞", text: "Still black water. Your reflection doesn't blink." },
  card_sharp: { name: "Card Sharp", icon: "🃏", text: "A grinning rogue, a worn deck, and a wager." },
  doppelganger: { name: "The Changeling", icon: "🎭", text: "Something wearing your face, your gear, your tricks. Beat yourself for a Legendary." },
  sacred_spring: { name: "Sacred Spring", icon: "💧", text: "Clear water glowing in a hidden grotto." },
  fallen_adventurer: { name: "A Fallen Adventurer", icon: "⚰️", text: "Someone who got this far and no further. Their pack is still full." },
  starving_pilgrim: { name: "Starving Pilgrim", icon: "🧎", text: "A thin traveller with an outstretched hand." },
  bounty: { name: "Bounty Board", icon: "📋", text: "Notices nailed to a post. Work for hire." },
  event: { name: "Something Strange", icon: "🚪", text: "A door stands open onto a room you can't see into. A meeting, a find, a gamble." },
  boss: { name: "Boss", icon: "👑", text: "The guardian of this floor." },
  nemesis: { name: "Your Nemesis", icon: "😈", text: "It killed you last time. It remembers you. There's a bounty on its head." },
  unique: { name: "A Strange Presence", icon: "✴️", text: "Someone — something — with a name. Dangerous, once per run, and carrying something rare." },
  crimson_elite: { name: "Crimson Elite", icon: "🩸", text: "Rarer and deadlier than a Champion. Great loot, and often a Crimson Key." },
  goblin: { name: "Treasure Goblin", icon: "💰", text: "A Treasure Goblin, stuffed with loot! Kill it within 3 rounds before it escapes, and everything it carries is yours." },
  oath: { name: "Blood Oath", icon: "🩸", text: "A stone that wants a promise in blood. Give up Max HP for good, and take an item." },
  pond: { name: "Still Pool", icon: "🎣", text: "Black water, very still. Something moves under it." },
  offering: { name: "Offering Altar", icon: "⚱️", text: "An altar that takes what you lay on it. Give it two or more items and it may give one back, better. Or nothing at all." },
  secret: { name: "Secret Chest", icon: "💎", text: "Hidden away behind a locked door." },
  crimson_vault: { name: "Crimson Vault", icon: "🗝️", text: "Spend a Crimson Key: fight a Crimson boss for a Crimson item. Die here and your run is over." }
};

/** In the Abyss every fight is a rank tougher, and the map says so. */
export const ABYSS_ROOM_INFO: Partial<Record<RoomType, { name: string; icon: string; text: string }>> = {
  fight: { name: "Elite", icon: "💀", text: "The weakest thing down here. Always drops an item." },
  elite: { name: "Champion", icon: "👹", text: "Very dangerous. Rich loot." },
  champion: { name: "Boss", icon: "👑", text: "A boss, roaming the depths. Deadly — and the best loot outside the Uber boss." },
  boss: { name: "Uber boss", icon: "☠️", text: "The master of this depth, empowered. Its hoard is the richest in the Abyss." }
};

export interface ShopEntry { kind: "item" | "potion" | "mana" | "cleanse" | "scroll" | "relic" | "throw" | "seed"; item?: GearItem; relic?: string; throw?: Throw; plant?: Plant; price: number; sold?: boolean }

export type Scene =
  | { t: "map" }
  | { t: "omen"; options: string[] }
  | { t: "combat"; battle: Battle; rank: MonsterRank; then?: "resplendent" | "mimic" | "crimson" | "unique" | "goblin" | "dragon" | "transformed" | "death" | "nemesis" | "doppel"; uber?: boolean }
  | { t: "loot"; title: string; items: GearItem[]; gold: number; scrolls: number; relic?: string; /** Talisman sigils found (names). */ sigils?: string[]; potions: number; then?: "resplendent"; crimsonKey?: boolean; /** A Bounty Board payout (closing it doesn't use a step). */ bounty?: boolean; /** A Dragon Heart was torn from the dragon (its level now). */ dragonHeart?: number; /** The Transmuter's Crucible dropped. */ crucible?: boolean }
  | { t: "resplendent"; cards: ResplendentCard[]; picked: number | null; glove: boolean }
  /** The Tavern's parting gift: one of four, as a run sets out from the top. */
  | { t: "gift" }
  | { t: "pick"; title: string; items: GearItem[]; passed?: GearItem[]; /** Talisman sigils found (names). */ sigils?: string[]; /** A Keepsake on offer (bosses after floor 5). */ keepsake?: string }
  | { t: "talent"; options: string[] }
  | { t: "shop"; stock: ShopEntry[]; /** One item may be sold per Merchant visit. */ soldItem?: string; /** % markup from the Gold you carried when this stock was priced. */ markup?: number }
  | { t: "forge" }
  /** A still pool (the Crawl): a few casts of a line. */
  | { t: "fishing"; casts: number; log: string[] }
  /** An Offering Altar (the Crawl): sacrifice items for one new one, once. */
  | { t: "offering"; used?: boolean }
  /** The Masterwork; while a Rework's two options wait for a pick, they're held here. */
  | { t: "masterwork"; pending?: { uid: number; line: string; options: Record<string, number>[] } }
  | { t: "rest"; done: boolean }
  | { t: "confirm"; room: RoomType }
  | { t: "event"; ev: GameEvent; result: string | null; found: GearItem[]; note?: string; /** Met behind a strange door (the Crawl): it plays in a room of its own. */ strange?: boolean }
  | { t: "smith"; uses: number }
  /** The Dragon Sanctum: unify with your Dragon Heart. */
  | { t: "sanctum"; done?: boolean }
  /** The Jeweller's bench: two slots, then pay to fuse. */
  | { t: "jeweller"; mode: "fuse" | "infuse" | "upgrade"; left?: JewelSlot; right?: JewelSlot; tries: number }
  /** The Bounty Board: three contracts to choose from. */
  | { t: "bounty"; offers: Bounty[] }
  | { t: "alchemist"; stock: { id: string; price: number; sold?: boolean }[] }
  /** Holy Tribute: pay Gold to lift curses one at a time, each costing more than the last. */
  | { t: "tribute"; paid: number }
  | { t: "cleared"; floor: number; boss: string }
  /** At a trapdoor: drop deeper, or climb out with the haul (and, choosing, seal one item for the next run). */
  | { t: "extract"; pick?: boolean; fromCleared?: { floor: number; boss: string } }
  | { t: "over"; won: boolean };

export interface Run {
  /** The Crawl: foes beaten this run, by name (for the Camp's Bestiary and Trophy Room). */
  kills?: Record<string, { n: number; hp: number; power: number; family?: string; boss?: boolean }>;
  mode: Mode;
  seed: number;
  rng: () => number;
  hero: Hero;
  floor: number;
  step: number;
  choices: RoomType[];
  scene: Scene;
  loot: LootState;
  carry: number;
  /** Talent level-ups waiting to be chosen. */
  pendingTalents: number;
  /** The Crawl: the floor of this layer where a third Merchant stands (Knowledge: Merchant's Road). */
  gridShop2?: number;
  /** Set once a run's Abyss Tarot offer, or its Heat bounties, have been handed out. */
  tarotOffered?: boolean;
  bountyPaid?: boolean;
  bounties?: { heat: number; crowns: number; scrolls: number }[];
  /** The Omens on offer as you land on an Abyss floor. */
  omenOffer?: string[];
  /** The floor of this layer with the Hanged Man's Blood Oath. */
  gridOathAt?: number;
  message: string;
  stats: { kills: number; bestHit: number; bosses: number; legendaries: number; fusions: number };
  /** Leaderboards: all the Gold you've picked up this run, and the purse last time we looked. */
  goldEarned?: number;
  goldSeen?: number;
  /** This run's result has been sent to the leaderboard. */
  submitted?: boolean;
  /** The leaderboard server's own record of this run, and the last floor it was told about. */
  sid?: string;
  reportedFloor?: number;
  /** Ids found this run (for the Codex between runs). */
  found: Set<string>;
  /** Ids allowed in loot this run (unlocked by Renown); empty = everything. */
  locked: Set<string>;
  /** Named bosses already met this run. */
  seenBosses: Set<string>;
  /** Shop rerolls used at the current Merchant (each costs more). */
  shopRerolls: number;
  /** The Forge and the Jeweller take turns: true when the next one offered is the Jeweller. */
  jewellerNext?: boolean;
  /** The look the Crossroads wears on the map this time (an index into CROSSROADS_GUISES). */
  crossroadsGuise?: number;
  /** The contract taken at a Bounty Board (one at a time). */
  bounty?: Bounty;
  /** Normal monster fights chosen in a row (anything else resets it). Long streaks can spawn a Transformation. */
  normalStreak?: number;
  /** The floor whose "Floor cleared" screen has been shown (you continue from it to go deeper). */
  clearedFloor?: number;
  /** Whatever killed your last Campaign run, waiting somewhere in this one (from floor 2), and whether you've beaten it. */
  nemesis?: Nemesis;
  nemesisBeaten?: boolean;
  /** Four Legendary-less Campaign runs in a row: this run's first boss offers one. */
  legendaryDue?: boolean;
  /** Relics (by id) and scrolls ("scroll:N") just gained, waiting for their popup. */
  relicNews?: string[];
  /** Who ended the run (shown on the death screen). */
  killer?: { name: string; title?: string; family?: string; traitIds?: string[]; nemesis?: boolean; rank: string; hp: number; maxHp: number; damage: number; armor: number; crimson?: boolean; traits: string[]; statuses: [string, number][] };
  /** The player ended this run themselves. */
  abandoned?: boolean;
  /** Went home after conquering a layer (the run ends well, not in death). */
  retired?: boolean;
  /** The end-of-run results (Renown, unlocks, achievements), kept with the save so a finished run can be reopened. */
  endRecord?: { earned: number; unlocked: string[]; achievements: string[]; mastery?: { origin: string; gained: number; level: number; levelUp: boolean } };
  /** The leaderboard confirmed this run's latest post. */
  lbDone?: boolean;
  /** The last boss beaten (for the Floor cleared screen). */
  lastBoss?: string;
  /** A story popup waiting to be shown (e.g. arriving on the last floor). */
  popup?: { title: string; text: string; icon: string; list?: string[]; fanfare?: string };
  /** Beat THE END on floor 26: the whole game is won. */
  finale?: boolean;
  /** Two relics to choose between (one is yours), waiting for the player. */
  relicChoice?: string[];
  /** This run's floor themes (floors 1–7; later floors reuse them in turn). */
  themes?: string[];
  /** Heat level (optional Campaign difficulty) and this run's Abyss twist. */
  heat?: number;
  abyssMod?: string;
  /** Class Mastery XP already counted for this run (a won Campaign run that carries on is recorded twice). */
  masteryBanked?: number;
  /** Encounters this run (events met, choices taken, rooms used), for the Encounter achievements. */
  encounters?: string[];
  /** Build moments already celebrated this run. */
  moments?: string[];
  /** Inventory tabs as last seen (a short signature each), so new things get a dot. */
  seenTabs?: Record<string, string>;
  /** The Daily Dungeon this run belongs to (its UTC date, YYYY-MM-DD), if any. */
  daily?: string;
  /** A Drill (a challenge run from the Camp's Drills room). */
  drill?: string;
  /** This run was its Drill's first clear (by anyone). */
  drillFirst?: boolean;
  /** The Crawl (prototype): floors are fogged grids of rooms rather than a row of paths. */
  gridMode?: boolean;
  grid?: FloorMap;
  /** Crown Shards and Camp materials found this run (banked to the Camp as they're found). */
  campLoot?: { crowns: number; mats: Partial<Record<Mat, number>>; seeds?: Partial<Record<Plant, number>>; scrolls?: number; banked?: { crowns: number; mats: Partial<Record<Mat, number>>; seeds?: Partial<Record<Plant, number>>; scrolls?: number } };
  /** The Crawl: the monster in the tile being walked into. */
  nextFoe?: string;
  /** The boss's rewards, waiting in the chest of its treasure room; and the drop out of that room under way. */
  bossChest?: Scene;
  /** The item sealed in the Obsidian Chest by your last extraction (it waits in this run's Entrance), and whether it's been taken. */
  obsidian?: ObsidianSeal;
  obsidianTaken?: boolean;
  /** (The Camp has emptied its Obsidian Chest for this run.) */
  obsidianCleared?: boolean;
  /** Climbed out: the haul, and the item sealed for the next run. */
  extracted?: { mats: number; crowns: number; floors: number; seal?: ObsidianSeal; pouch?: boolean; banked?: boolean };
  /** Face Runes on offer (after each drop through a trapdoor): pick one, or a Shuffler, or skip. */
  runeOffer?: { id: string; face: number }[];
  /** The Shufflers offered beside them. */
  shuffleOffer?: string[];
  gridDescend?: boolean;
  /** Which floor of this layer each service turns up on. */
  gridPlan?: Partial<Record<RoomType, number>>;
  /** Ruin Shards and Vanadium Plates found this run, and how many of them are already banked on the device. */
  ruin?: { shards: number; plates: number; gems?: number; banked?: { shards: number; plates: number; gems?: number } };
}

/** A foe that ended a run, remembered: it returns, stronger each time it wins. */
export interface Nemesis { name: string; family?: string; traits: string[]; level: number }

export function newRun(origin: OriginId, seed = Date.now() & 0x7fffffff, mode: Mode = "campaign", locked: Set<string> = new Set()): Run {
  const run: Run = {
    mode, seed, rng: makeRng(seed), hero: newHero(origin), floor: 1, step: 0, choices: [], scene: { t: "map" },
    loot: { pity: 0 }, carry: 0, pendingTalents: 0, message: "", stats: { kills: 0, bestHit: 0, bosses: 0, legendaries: 0, fusions: 0 },
    found: new Set(), locked, seenBosses: new Set(), shopRerolls: 0
  };
  setLocked(locked);
  resetDropped();
  if (mode !== "abyss") run.themes = dealThemes(seed);
  run.choices = genChoices(run);
  const th = themeOf(run);
  if (th) run.message = `${th.icon} Floor 1 — ${th.name}. ${th.text}`;
  if (mode === "abyss") run.hero.f.persist["abyssRun"] = 1;
  return run;
}

/** After beating the campaign, keep delving: floors 11+ with generated bosses. */
export function continueEndless(run: Run) {
  run.mode = "endless";
  run.popup = {
    icon: "♾️", title: "Deeper Still",
    text: "The gate is shut, but the rift below still bleeds. Nothing down there has heard that you won. Here is what waits:",
    list: [
      "💰 Richer loot the deeper you go: rarer drops, fuller hoards, and treasures rarely seen above floor 5.",
      "👑 The bosses you didn't meet return, and new ones are forged from the depths, each with its own tricks.",
      "🩸 Crimson Elites: harder than any Champion. Some carry a Crimson Key.",
      "🗝️ Crimson Vaults: spend a key to face a Crimson boss for a Crimson item. Die in there and your run ends.",
      "🗡️ New gear waits below: Epics and Legendaries that never surface on the early floors, and darker things still for those who carry curses.",
      "🍀 New encounters stir in the deep: stranger shrines, treasures that glint only for a full purse, and creatures that bargain rather than bite.",
      "💎 Keepsakes: fallen bosses sometimes leave one behind. A rare charm with its own slot beside your trinkets, it stays with you for the rest of the run.",
      "✨ Blessings: dragons, angels and lucky finds may bless you for a few fights or a few chests. Your active Blessings are listed under Extras in your Inventory.",
      "⚠️ Every floor hits harder than the last, and somewhere far below waits a Horror.",
      "🎲 There's no last floor to win. Go as deep as you dare."
    ]
  };
  run.choices = genChoices(run);
  run.scene = { t: "map" };
}

const pickW = <T extends string>(rng: () => number, w: Partial<Record<T, number>>): T => {
  const entries = Object.entries(w) as [T, number][];
  const total = entries.reduce((s, [, n]) => s + n, 0);
  let x = rng() * total;
  for (const [k, n] of entries) {
    x -= n;
    if (x < 0) return k;
  }
  return entries[0][0];
};

/** How often a cursed hero is offered a Cleansing path at each choice. */
export const CLEANSING_PATH_CHANCE = 0.18;
/** The curse-lifting encounters: their own path on the map, never part of Something Strange. */
export const CLEANSING_EVENTS = ["cleansing_well", "holy_tribute"];
/** Encounters with their own path on the map, never part of Something Strange. */
/** Events that are their own paths on the map (out of Something Strange). */
export const EVENT_ROOMS: Partial<Record<RoomType, string>> = { alchemist: "alchemist", blacksmith: "blacksmith", gambling_den: "dice", fortune_teller: "teller", mirror_pool: "mirror", card_sharp: "card_sharp",
  sacred_spring: "spring", fallen_adventurer: "fallen", starving_pilgrim: "pilgrim" };
/** Minor encounters offered only on quiet steps (no fights ahead). */
const QUIET_ROOMS: RoomType[] = ["sacred_spring", "fallen_adventurer", "starving_pilgrim"];
/** The Changeling Doppelgänger: an Elite copy of you, from floor 5. */
export const DOPPEL_FLOOR = 5;
/** Rare foe weaknesses (each favours a different build), and how often a Campaign Unholy foe is swapped for another. */
export const WEAKNESSES = ["x_wk_blunt", "x_wk_sharp", "x_wk_twohand", "x_wk_spell", "x_wk_bleed", "x_wk_fragile"];
export const UNHOLY_REROLL = 0.4;
export const DOPPEL_AMBUSH = 0.35;
export const OWN_PATH_EVENTS = [...CLEANSING_EVENTS, "sanguine_altar", "blood_oath", ...Object.values(EVENT_ROOMS) as string[]];
/** Can this event happen right now (once-a-run ones not yet met, enough Gold, deep enough)? */
/** The Crawl: dragons and Blessings only below the first layer, and likelier the deeper you go (the layer they start on). */
export const DEEP_EVENTS: Record<string, number> = { dragon: 2, chained_dragon: 2, blind_dragon: 2, angelic_statue: 2, lucky_pot: 3 };
const eventMinFloor = (run: Run, e: GameEvent) => (run.gridMode ? DEEP_EVENTS[e.id] ?? Math.min(e.minFloor ?? 0, 3) : e.minFloor ?? 0);
const eventOpen = (run: Run, e: GameEvent) => (!e.unique || !run.seenBosses.has(`e:${e.id}`)) && (!e.needCurse || Object.keys(run.hero.curses).length > 0) && run.floor >= eventMinFloor(run, e) && run.hero.f.gold >= eventGold(run, e);
/** How often an event turns up behind a strange door: the deep ones grow likelier layer by layer. */
const eventWeight = (run: Run, e: GameEvent) => (e.weight ?? 1) * (run.gridMode && DEEP_EVENTS[e.id] ? 1 + 0.6 * (run.floor - DEEP_EVENTS[e.id]) : 1);
/** A quiet stretch: from floor 1, some steps offer no fights at all. */
export const PEACEFUL_CHANCE = 0.15;
export const MASTERWORK_FLOOR = 2;
const COMBAT_ROOMS: RoomType[] = ["doppelganger", "fight", "elite", "champion", "vault", "crimson_elite", "unique", "goblin", "nemesis", "crimson_vault"];

/** Gauntlets: from floor 3, 15% of steps offer only hard fights (a Guarded Vault is a Champion before a Resplendent chest). */
export const GAUNTLET_FLOOR = 3;
export const GAUNTLET_CHANCE = 0.15;
export const GAUNTLETS: RoomType[][] = [
  ["elite", "elite", "elite"],
  ["elite", "champion", "champion"],
  ["champion", "champion", "champion"],
  ["elite", "champion", "vault"]
];
/** How often each room turns up on this floor (the path map and the Crawl share it). */
function roomWeights(run: Run, first: boolean): Partial<Record<RoomType, number>> {
  const w: Partial<Record<RoomType, number>> = { fight: 34, elite: 13, wooden: 10, iron: 7, shop: 6, forge: 6, rest: 6, event: 6, vault: 3, altar: 3, shrine: 3, champion: 3, sanguine: 2,
    alchemist: 0.8, blacksmith: 1, gambling_den: 1.4, fortune_teller: 1.4, mirror_pool: 0.8, card_sharp: 1.4,
    sacred_spring: 3, fallen_adventurer: 3, starving_pilgrim: 3 };
  if (run.floor >= DOPPEL_FLOOR) w.doppelganger = 0.6;
  // The Masterwork: from floor 2 (not in the Abyss, which has its own trade).
  if (run.floor >= MASTERWORK_FLOOR && run.mode !== "abyss") w.masterwork = 5;
  // Event rooms only show up when their encounter can happen.
  for (const [room, id] of Object.entries(EVENT_ROOMS) as [RoomType, string][]) { const e = EVENTS.find(x => x.id === id); if (!e || !eventOpen(run, e)) w[room] = 0; }
  // After the fifth boss (Endless), Crimson Elites start to appear; they drop the keys to Crimson Vaults.
  if (crimsonActive(run)) w.crimson_elite = 4;
  // Named unique foes: from floor 2, rare, each one once per run.
  if (run.floor >= 2 && UNIQUES.some(u => !u.early && !run.seenBosses.has(`u:${u.id}`))) w.unique = 2;
  // Treasure Goblins: from floor 3, about as rare as a Legendary drop.
  if (run.floor >= 3) w.goblin = 0.5;
  if (abyssMod(run, "goblin_rush")) w.goblin = 6;

  // Your Nemesis: from floor 2, about as often as a Strange Presence, once per run.
  if (run.nemesis && run.floor >= 2 && !run.seenBosses.has("nemesis")) w.nemesis = 2.5;
  if (first) { w.doppelganger = 0; w.elite = 0; w.champion = 0; w.vault = 0; w.crimson_elite = 0; w.unique = 0; w.nemesis = 0; }
  return w;
}

export function genChoices(run: Run): RoomType[] {
  if (run.gridMode) { if (!run.grid || run.grid.floor !== run.floor) run.grid = makeGrid(run, 0); return []; }
  if (run.step >= STEPS_PER_FLOOR) return ["boss"];
  const w = roomWeights(run, run.step === 0);
  // A gauntlet: from floor 3 (not on a floor's first step), sometimes every path is a hard fight, and nothing else.
  if (run.floor >= GAUNTLET_FLOOR && run.step > 0 && run.rng() < GAUNTLET_CHANCE) {
    const set = GAUNTLETS[Math.floor(run.rng() * GAUNTLETS.length)];
    return [...set].sort(() => run.rng() - 0.5);
  }
  const out = new Set<RoomType>();
  // A quiet stretch (15% of steps from floor 1): no fights to pick, only everything else.
  const peaceful = run.rng() < PEACEFUL_CHANCE;
  if (peaceful) {
    const calm = Object.fromEntries(Object.entries(w).filter(([k, v]) => !COMBAT_ROOMS.includes(k as RoomType) && (v ?? 0) > 0)) as Partial<Record<RoomType, number>>;
    while (out.size < 3) out.add(pickW(run.rng, calm));
  } else {
    const busy = { ...w }; for (const q of QUIET_ROOMS) busy[q] = 0;
    out.add("fight");
    while (out.size < 3) out.add(pickW(run.rng, busy));
  }

  const rooms = [...out].sort(() => run.rng() - 0.5);
  // The Forge and the Jeweller take turns: every other time a forge would be offered, it's the Jeweller instead.
  const fi = rooms.indexOf("forge");
  if (fi >= 0) { if (run.jewellerNext) rooms[fi] = "jeweller"; run.jewellerNext = !run.jewellerNext; }
  // Holding a Crimson Key: a Crimson Vault is always offered as an extra path.
  if (crimsonActive(run) && run.hero.crimsonKeys > 0 && !peaceful) rooms.push("crimson_vault");
  // A Dragon Heart not yet unified: the Dragon Sanctum is very often an extra path.
  const heart = run.hero.dragonHeart;
  if (heart && !heart.unified && run.rng() < 0.7) rooms.push("sanctum");
  // Carrying a curse: somewhere to be rid of it is often an extra path (the Well of Cleansing or a Holy Tribute).
  if (Object.keys(run.hero.curses).length > 0 && run.rng() < CLEANSING_PATH_CHANCE) rooms.push("cleansing");
  // The Bounty Board: a rare extra path, from the first floor on.
  if (run.rng() < BOUNTY_BOARD_CHANCE) rooms.push("bounty");
  // The Crossroads, in disguise: a very rare extra path from floor 2, once per run.
  if (!peaceful && run.floor >= 2 && !run.seenBosses.has("e:crossroads") && run.rng() < CROSSROADS_PATH_CHANCE) {
    run.crossroadsGuise = Math.floor(run.rng() * CROSSROADS_GUISES.length);
    rooms.push("crossroads");
  }
  return rooms;
}

// ---------- The Crawl (prototype) ----------

const GRID_REPEAT: RoomType[] = ["fight", "elite", "wooden", "iron"];
const GRID_CAP: Partial<Record<RoomType, number>> = { champion: 2 };
/** Landmarks: the altars, shrines and encounters. A floor has none, one or two. */
export const LANDMARKS: RoomType[] = ["sanguine", "altar", "shrine", "event", "alchemist", "blacksmith", "gambling_den", "fortune_teller", "mirror_pool", "card_sharp", "sacred_spring", "fallen_adventurer", "starving_pilgrim"];
const HARD_ROOMS: RoomType[] = ["elite", "champion", "vault", "unique", "nemesis", "doppelganger", "crimson_elite", "goblin"];

const FOE_ROOMS: RoomType[] = ["fight", "elite", "champion", "unique", "goblin", "nemesis", "doppelganger", "crimson_elite"];

/** Where this layer's services fall: the campfire on the last floor before the boss, the others spread over the rest. */
function layerPlan(run: Run): Partial<Record<RoomType, number>> {
  const rng = run.rng, last = layerFloors(run) - 1, any = () => 1 + Math.floor(rng() * last);
  // Two Merchants a layer: one at the entrance (floor 0), and one somewhere on the third floor.
  // (Campfires, and a third Merchant, come from what the Camp's Knowledge Table has taught.)
  const plan: Partial<Record<RoomType, number>> = { shop: 3 };
  // The Hanged Man's Blood Oath: on one floor of every layer.
  run.gridOathAt = any();
  if (run.hero.f.persist["ins_campfires"]) plan.rest = last;
  run.gridShop2 = run.hero.f.persist["ins_merchant"] ? [1, 2, 4][Math.floor(rng() * 3)] : undefined;
  plan[run.jewellerNext ? "jeweller" : "forge"] = 2 + Math.floor(rng() * (last - 1));
  run.jewellerNext = !run.jewellerNext;
  if (run.floor >= MASTERWORK_FLOOR && run.mode !== "abyss") plan.masterwork = any();
  // The 1st Layer: one of its own named foes waits on a middle floor (2nd to 4th), in a little room of its own.
  if (run.floor === 1 && run.mode !== "abyss") plan.unique = 2 + Math.floor(rng() * 3);
  if (crimsonActive(run) && run.hero.crimsonKeys > 0) plan.crimson_vault = any();
  const heart = run.hero.dragonHeart;
  if (heart && !heart.unified) plan.sanctum = any();
  if (run.floor >= 2 && !run.seenBosses.has("e:crossroads") && rng() < CROSSROADS_PATH_CHANCE * STEPS_PER_FLOOR) {
    run.crossroadsGuise = Math.floor(rng() * CROSSROADS_GUISES.length);
    plan.crossroads = any();
  }
  return plan;
}

/** How many landmarks a floor holds: none (50%), one (40%) or two (10%). */
const floorLandmarks = (x: number) => (x < 0.5 ? 0 : x < 0.9 ? 1 : 2);
/** Crawl foes are near Elite strength: a plain monster's HP and Power. */
export const CRAWL_NORMAL_HP = 1.8;
export const CRAWL_NORMAL_POWER = 2;
/** How much softer Elites are on the first layer's first two floors. */
export const FIRST_ELITE_EASE = 0.85;
/** A 1st-Layer unique's drop: a Rare, or this often an Epic. */
export const EARLY_UNIQUE_EPIC = 0.4;
/** How often a curse-lifting altar turns up, as a landmark (the same whether or not you're cursed). */
export const CLEANSING_WEIGHT = 3;
/** Chance a floor has a Crimson foe's room: this much per layer below the first, up to the cap. */
export const CRIMSON_ROOM_STEP = 0.1, CRIMSON_ROOM_MAX = 0.5;
/** Every layer is a stage of its own, harder than the one before; within a layer, each floor down is a little harder.
 *  From the 4th layer, foes also carry much more HP (fights there used to be over in two or three rounds). */
export const LAYER_HP = 0.06, DEEP_HP = 0.15, DEEP_FROM = 4, FLOOR_STEP = 0.04;
export const layerScale = (_run: Run, depthIn: number) => 1 + FLOOR_STEP * Math.max(0, depthIn - 1);
const layerHpMult = (run: Run) => 1 + LAYER_HP * (run.floor - 1) + (run.floor >= DEEP_FROM ? DEEP_HP * (run.floor - DEEP_FROM + 1) : 0);
const layerDmgMult = (run: Run) => 1 + 0.04 * (run.floor - 1);
/** How often a pocket's doorway is guarded (the trapdoor's, and the rest). */
export const TRAP_GUARD = 0.7;
export const POCKET_GUARD = 0.5;
/** How often a roomy hall gets a pillar of wall in the middle. */
export const PILLAR_CHANCE = 0.5;
/** How often a one-tile nook's doorway is guarded. */
export const NOOK_GUARD = 0.35;

/** Lay out one floor of a layer: small halls joined by hallways, with every point of interest (the trapdoor, chests, services,
 *  landmarks) in a pocket of its own (one or two to a pocket) behind a one-tile doorway. Most doorways are guarded, and foes
 *  block some hallways too; a few more wander the halls, and those you can walk around. */
export function makeGrid(run: Run, depth = 1, explored = 0): FloorMap {
  const rng = run.rng;
  if (depth === 0 || !run.gridPlan) run.gridPlan = layerPlan(run);
  if (depth === 0) return makeEntrance(run, explored);
  const plan = run.gridPlan;
  const { tiles, rooms, start, order } = carve(rng);
  const s = roomCenter(rooms[start]);
  const m: FloorMap = { floor: run.floor, depth, w: MAP_W, h: MAP_H, tiles, seen: new Array(MAP_W * MAP_H).fill(0), rooms, things: [], px: s.x, py: s.y, explored };
  // Some of the roomier halls get a pillar in the middle: a block of wall one to three tiles long (never where you land).
  for (const r of rooms) {
    if (r.w < 5 || r.h < 4 || rng() > PILLAR_CHANCE) continue;
    const c = roomCenter(r);
    const len = 1 + Math.floor(rng() * Math.min(3, r.w - 4));
    const along = r.w >= r.h;
    const cells: number[] = [];
    for (let k = 0; k < len; k++) cells.push(along ? idx(m, c.x - Math.floor(len / 2) + k, c.y) : idx(m, c.x, c.y - Math.floor(len / 2) + k));
    if (cells.includes(idx(m, s.x, s.y))) continue;
    for (const i of cells) m.tiles[i] = 0;
    // Keep every floor tile reachable; if the pillar cuts anything off, take it back out.
    const reach = reachable(m, s.x, s.y, new Set());
    if (m.tiles.some((t, i) => t === 1 && !reach[i])) for (const i of cells) m.tiles[i] = 1;
  }
  const taken = new Set<number>([idx(m, s.x, s.y)]);
  const fromStart = walkDistances(m, s.x, s.y);
  const pockets = new Set<number>();
  const middle = order.filter(r => r !== start);
  const interior = (r: Rect) => {
    const out: number[] = [];
    for (let y = r.y + 1; y < r.y + r.h - 1; y++) for (let x = r.x + 1; x < r.x + r.w - 1; x++) if (!taken.has(idx(m, x, y)) && m.tiles[idx(m, x, y)] === 1) out.push(idx(m, x, y));
    return out;
  };
  /** Spots along a hall's walls (corners first) where an urn or a chest can stand without blocking a way in. */
  const byWall = (r: Rect) => {
    const out: [number, number][] = [];
    for (let y = r.y; y < r.y + r.h; y++) for (let x = r.x; x < r.x + r.w; x++) {
      const i = idx(m, x, y);
      if (taken.has(i) || m.tiles[i] !== 1) continue;
      const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [x + dx, y + dy] as [number, number]);
      const walls = nb.filter(([a, b]) => m.tiles[idx(m, a, b)] === 0).length;
      if (!walls) continue;
      // Not where a hallway comes in: every neighbour outside the hall must be rock.
      if (nb.some(([a, b]) => (a < r.x || a >= r.x + r.w || b < r.y || b >= r.y + r.h) && m.tiles[idx(m, a, b)] === 1)) continue;
      // And not right beside a hallway's mouth (or another urn or chest).
      if (nb.some(([a, b]) => { const j = idx(m, a, b); return m.tiles[j] === 1 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([ex, ey]) => { const q = [a + ex, b + ey]; return (q[0] < r.x || q[0] >= r.x + r.w || q[1] < r.y || q[1] >= r.y + r.h) && m.tiles[idx(m, q[0], q[1])] === 1; }); })) continue;
      out.push([i, walls]);
    }
    return out.sort((a, b) => b[1] - a[1] || rng() - 0.5).map(([i]) => i);
  };
  const LOOT = ["urn", "wooden", "iron", "vault"];
  const farFromLoot = (i: number) => m.things.every(t => !LOOT.includes(t.room) || Math.abs(t.x - (i % m.w)) + Math.abs(t.y - Math.floor(i / m.w)) > 3);
  const putAt = (i: number, room: string, guard = false) => { taken.add(i); m.things.push({ x: i % m.w, y: Math.floor(i / m.w), room, guard: guard || undefined }); return m.things.length - 1; };
  const putInHall = (room: string) => {
    const loot = LOOT.includes(room);
    for (const r of [...(middle.length ? middle : [start])].sort(() => rng() - 0.5)) {
      // Urns and chests stand against a wall (corners first), spread out; anything else stands in the open.
      const sp = loot ? byWall(rooms[r]).filter(farFromLoot).slice(0, 4) : interior(rooms[r]);
      if (sp.length) return putAt(sp[Math.floor(rng() * sp.length)], room);
    }
    return -1;
  };
  const count: Partial<Record<RoomType, number>> = {};
  const foe = (near: boolean): RoomType => {
    const wt = roomWeights(run, near);
    for (const k of Object.keys(wt) as RoomType[]) {
      if (!FOE_ROOMS.includes(k)) { wt[k] = 0; continue; }
      const cap = GRID_REPEAT.includes(k) ? Infinity : GRID_CAP[k] ?? 1;
      if ((count[k] ?? 0) >= cap) wt[k] = 0;
    }
    // Every Crawl foe is near Elite strength already, so true Elites are rarer (none on a layer's first floor), and Champions wait for its third.
    wt.elite = depth <= 1 ? 0 : (wt.elite ?? 0) * 0.5;
    if (depth <= (pactRank(run, "champions") ? 1 : 2)) wt.champion = 0;
    const room = pickW(rng, wt);
    count[room] = (count[room] ?? 0) + 1;
    return room;
  };
  const chest = (): RoomType => (depth >= 3 && rng() < 0.06 ? "vault" : rng() < 0.6 ? "wooden" : "iron");
  /** Dig a pocket and put things in it (never on the tile just inside the door, so you can always step in). */
  const pocket = (items: string[], guardChance: number, prefer?: (i: number) => number, size?: [number, number], door?: string) => {
    const two = items.length > 1;
    const [pw, ph] = size ?? (two ? (rng() < 0.5 ? [2, 3] : [3, 2]) : [2, 2]);
    // (Never through the wall an urn or a chest stands against.)
    const avoid = new Set(pockets);
    for (const t of m.things) if (LOOT.includes(t.room)) avoid.add(idx(m, t.x, t.y));
    const dug = digPocket(m, rng, pw, ph, avoid, prefer);
    if (!dug) { if (!door) for (const it of items) putInHall(it); return; }
    pockets.add(dug.door);
    for (const c of dug.cells) pockets.add(c);
    // On some floors, some little rooms have a second way in: if one door is guarded, try the other side.
    if (connected && !size && rng() < 0.55) {
      const cells = new Set(dug.cells);
      const tries: [number, number][] = [];
      for (const c of dug.cells) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) tries.push([c, dy * m.w + dx]);
      tries.sort(() => rng() - 0.5);
      for (const [c, d] of tries) {
        const w = c + d, f = c + 2 * d;
        if (m.tiles[w] !== 0 || m.tiles[f] !== 1 || cells.has(f) || pockets.has(f)) continue;
        // Rock on both sides of the new doorway, so it's a doorway and not a gap.
        const side = Math.abs(d) === 1 ? m.w : 1;
        if (m.tiles[w + side] !== 0 || m.tiles[w - side] !== 0) continue;
        // Never knock through the wall an urn or a chest stands against.
        if (m.things.some(t => LOOT.includes(t.room) && Math.abs(t.x - (w % m.w)) + Math.abs(t.y - Math.floor(w / m.w)) === 1)) continue;
        m.tiles[w] = 1;
        pockets.add(w);
        break;
      }
    }
    const spots = dug.cells.filter(c => c !== dug.front).sort(() => rng() - 0.5);
    // An urn or a chest stands against rock (a second doorway can leave a cell open all round).
    const rock = (c: number) => [1, -1, m.w, -m.w].filter(d => m.tiles[c + d] === 0).length;
    items.forEach((it, k) => { if (!LOOT.includes(it) || rock(spots[k] ?? dug.front) > 0) return; const j = spots.findIndex((c, q) => q !== k && rock(c) > 0); if (j >= 0) [spots[k], spots[j]] = [spots[j], spots[k]]; });
    // A strange door stands in a wall: put it on a cell with rock behind it (above), if the room has one.
    const ev = items.indexOf("event");
    if (ev >= 0) { const w = spots.findIndex(c => m.tiles[c - m.w] === 0); if (w >= 0 && w !== ev) [spots[ev], spots[w]] = [spots[w], spots[ev]]; }
    items.forEach((it, k) => putAt(spots[k] ?? dug.front, it));
    // A locked door or a cracked wall in the doorway instead of a guard.
    if (door) { putAt(dug.door, door); return; }
    if (rng() < guardChance) {
      // How far in this pocket is (its door hangs off a tile you walk to).
      const near = Math.min(...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => fromStart[dug.door + dy * m.w + dx]).filter(v => v >= 0)) < 6;
      putAt(dug.door, foe(near), true);
    }
  };
  // Some floors join their little rooms up more (a second door here and there).
  const connected = rng() < 0.6;
  // The trapdoor down: in a pocket as far from where you land as it can be.
  const farthest = Math.max(...fromStart);
  pocket(["trapdoor"], TRAP_GUARD, i => (fromStart[i] >= farthest * 0.7 ? 1000 + fromStart[i] * rng() : fromStart[i]));
  // The Way Up: a rope to the surface in a nook of its own, about halfway across the floor (where you can climb out).
  if (depth >= 1 && run.mode === "campaign" && !run.drill && !run.daily) pocket(["ascent"], 0, i => 1000 - Math.abs(fromStart[i] - farthest * 0.5) * 10 + rng(), [1, 1]);
  // This floor's services, landmarks and chests, one or two to a pocket.
  const pois: string[] = [];
  // (The Merchant stays put once met, so it stands out in a hall where it can't block a way through.)
  for (const [room, d] of Object.entries(plan) as [RoomType, number][]) if (d === depth) { if (room === "shop") putInHall(room); else pois.push(room); }
  if (run.gridShop2 === depth) putInHall("shop");
  // (A curse-lifting altar is a landmark like any other: carrying a curse doesn't summon one.)
  // Faith: while you carry a curse, they turn up more often.
  if (Object.keys(run.hero.curses).length > 0 && rng() < Math.min(0.4, 0.03 * attrOf(run.hero, "fai"))) pois.push("cleansing");
  const lw = roomWeights(run, false);
  const marks = Object.fromEntries(LANDMARKS.map(k => [k, lw[k] ?? 0]).filter(([, v]) => (v as number) > 0)) as Partial<Record<RoomType, number>>;
  // Blood Oaths: a Crawl landmark of their own.
  marks.oath = OATH_WEIGHT;
  marks.offering = OFFERING_WEIGHT;
  if (run.hero.f.persist["ins_angling"]) marks.pond = POND_WEIGHT;
  marks.cleansing = CLEANSING_WEIGHT;
  // (The 1st Layer is never bare: every floor has at least one.)
  for (let n = Math.max(run.floor === 1 && run.mode !== "abyss" ? 1 : 0, floorLandmarks(rng())); n > 0 && Object.keys(marks).length; n--) { const room = pickW(rng, marks); delete marks[room]; pois.push(room); }
  // (The Chariot: fewer chests.)
  for (let n = 1 + (rng() < 0.4 ? 1 : 0) - Math.round(tarotOf(run.hero, "chariot").bane); n > 0; n--) pois.push(chest());
  // Tarot landmarks: an altar to lift curses (the Hierophant), a Sacred Spring (the Star), one Blood Oath a layer (the Hanged Man).
  const T = (id: string) => tarotOf(run.hero, id).on;
  if (T("hierophant") && !pois.includes("cleansing")) pois.push("cleansing");
  if (T("star") && !pois.includes("sacred_spring")) pois.push("sacred_spring");
  if (T("hanged") && depth === (run.gridOathAt ?? 1) && !pois.includes("oath")) pois.push("oath");
  // Crimson foes: from the 2nd layer, now and then (likelier the deeper you go), each in a room of its own.
  if (crimsonActive(run) && rng() < Math.min(CRIMSON_ROOM_MAX, CRIMSON_ROOM_STEP * (run.floor - 1))) pocket(["crimson_elite"], 0);
  pois.sort(() => rng() - 0.5);
  // Something Strange: a door in a little nook of its own, one tile dug into a hall's wall (rock on three sides).
  for (let k = pois.indexOf("event"); k >= 0; k = pois.indexOf("event")) {
    const nooks: number[] = [];
    for (const r of rooms) for (let x = r.x; x < r.x + r.w; x++) {
      const u = (r.y - 1) * m.w + x;
      if (r.y < 3 || m.tiles[u] !== 0 || taken.has(u) || taken.has(u + m.w)) continue;
      if (m.tiles[u - 1] === 0 && m.tiles[u + 1] === 0 && m.tiles[u - m.w] === 0 && m.tiles[u - m.w - 1] === 0 && m.tiles[u - m.w + 1] === 0) nooks.push(u);
    }
    if (!nooks.length) break;
    pois.splice(k, 1);
    const u = nooks[Math.floor(rng() * nooks.length)];
    m.tiles[u] = 1;
    putAt(u, "event");
  }
  while (pois.length) {
    // Two to a little room now and then, but never two chests together.
    // (The Forge always gets a little room of its own.)
    const pairOk = pois.length > 1 && !(LOOT.includes(pois[0]) && LOOT.includes(pois[1])) && pois[0] !== "forge" && pois[1] !== "forge";
    pocket(pois.splice(0, pairOk && rng() < 0.35 ? 2 : 1), POCKET_GUARD);
  }
  // Foes across hallways: blocking the way on to other halls (and whatever hangs off them).
  const inHall = (i: number) => rooms.some(r => { const x = i % m.w, y = Math.floor(i / m.w); return x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h; });
  const all = reachable(m, s.x, s.y, new Set());
  const blockers: number[] = [];
  for (let i = 0; i < m.tiles.length; i++) {
    if (m.tiles[i] !== 1 || taken.has(i) || pockets.has(i) || inHall(i) || fromStart[i] < 4) continue;
    const cut = reachable(m, s.x, s.y, new Set([i]));
    if (m.tiles.some((t, j) => t === 1 && all[j] && !cut[j] && j !== i && !pockets.has(j))) blockers.push(i);
  }
  for (let n = 1 + (rng() < 0.6 ? 1 : 0); n > 0 && blockers.length; n--) {
    const k = Math.floor(rng() * blockers.length);
    const i = blockers.splice(k, 1)[0];
    putAt(i, foe(fromStart[i] < 6), true);
    // Not two in the same hallway.
    for (let j = blockers.length - 1; j >= 0; j--) if (Math.abs((blockers[j] % m.w) - (i % m.w)) + Math.abs(Math.floor(blockers[j] / m.w) - Math.floor(i / m.w)) < 4) blockers.splice(j, 1);
  }
  // A few more in the halls, which you can walk around.
  const rank = new Map(order.map((r, k) => [r, k]));
  for (const r of middle) {
    if (rng() > 0.6) continue;
    const near = (rank.get(r) ?? 0) <= 1;
    const room = foe(near);
    if (near && HARD_ROOMS.includes(room)) continue;
    const sp = interior(rooms[r]);
    if (sp.length) putAt(sp[Math.floor(rng() * sp.length)], room);
  }
  // More Elites and Champions: Heat's Elite Swarm and Champions' Call, the Emperor and Strength (never on a layer's first floor).
  const extraElites = depth >= 2 ? pactRank(run, "swarm") + Math.round(tarotOf(run.hero, "emperor").boon) : 0;
  const extraChamps = (depth >= 3 ? pactRank(run, "champions") : 0) + (depth >= 2 ? Math.round(tarotOf(run.hero, "strength").boon) : 0) + (run.hero.omens?.["hunters"] ?? 0);
  for (const [room, n] of [["elite", extraElites], ["champion", extraChamps]] as const) for (let k = 0; k < n; k++) {
    const far = middle.filter(r => (rank.get(r) ?? 0) > 1);
    const r = (far.length ? far : middle)[Math.floor(rng() * Math.max(1, (far.length ? far : middle).length))];
    const sp = r !== undefined ? interior(rooms[r]) : [];
    if (sp.length) putAt(sp[Math.floor(rng() * sp.length)], room);
  }
  // Nooks: a doorway and one tile, off a hall or a hallway, holding an urn or a chest; now and then someone stands in the doorway.
  if (rng() < 0.7) pocket([rng() < 0.35 ? chest() : "urn"], NOOK_GUARD, undefined, [1, 1]);
  // Secrets: a locked room with one rich chest (a Skeleton Key opens it), and now and then a cracked wall with a nook behind it.
  if (depth >= 2 && rng() < SECRET_ROOM_CHANCE) pocket(["secret"], 0, undefined, [2, 2], "locked");
  if (rng() < HIDDEN_NOOK_CHANCE) pocket([rng() < 0.5 ? "wooden" : "urn"], 0, undefined, [1, 1], "crack");
  // Urns: one to three about the halls, never two close together. Smash them for coins (and, rarely, a potion).
  const urns = () => m.things.filter(t => t.room === "urn");
  for (let n = 1 + (rng() < 0.4 ? 1 : 0), tries = 0; n > 0 && tries < 30; tries++) {
    const r = rooms[[...middle, start][Math.floor(rng() * (middle.length + 1))]];
    const sp = byWall(r).filter(i => i !== idx(m, s.x, s.y) && farFromLoot(i) && urns().every(u => Math.abs(u.x - (i % m.w)) + Math.abs(u.y - Math.floor(i / m.w)) > 4)).slice(0, 4);
    if (!sp.length) continue;
    putAt(sp[Math.floor(rng() * sp.length)], "urn");
    n--;
  }
  placeHazards(run, m, rng, depth, s, taken, pockets, inHall);
  // (The Abyss: few torches burn down there.)
  m.torches = wallTorches(m, rng, run.drill === "dark" ? 0 : run.mode === "abyss" ? 1 + Math.floor(rng() * 2) : 4 + Math.floor(rng() * 3));
  // Drills: Lights Out sees 1 tile; Against the Clock counts your steps; the Elite Gauntlet has no plain fights.
  if (run.drill === "dark") m.sight = 1;
  // (A Glowcap Tonic: see a tile further.)
  if ((run.hero.f.persist["draught_glow"] ?? 0) > 0) m.sight = (m.sight ?? SIGHT) + 1;
  if (run.drill === "clock") m.clock = CLOCK_STEPS;
  if (run.drill === "gauntlet") for (const t of m.things) if (t.room === "fight") t.room = "elite";
  // Each foe is decided now (so the map and the fight show the same monster): each layer has its own. Elites and Champions are sometimes a Tormentor.
  for (const t of m.things) if (t.room === "fight" || t.room === "elite" || t.room === "champion") {
    const pool = t.room !== "fight" && rng() < 0.25 ? ELITE_ONLY : layerFoes(run);
    t.foe = pool[Math.floor(rng() * pool.length)].name;
  }
  look(m);
  // The Knowledge Table: Keen Eye shows the trapdoor, Treasure Sense the chests, from the moment you land.
  const sense = (room: (r: string) => boolean) => { for (const t of m.things) if (room(t.room)) m.seen[idx(m, t.x, t.y)] = 1; };
  if (run.hero.f.persist["ins_keeneye"] || tarotOf(run.hero, "chariot").on) sense(r => r === "trapdoor");
  // The High Priestess: the whole floor, laid bare.
  if (tarotOf(run.hero, "priestess").on) m.seen.fill(1);
  if (run.hero.f.persist["ins_treasure"]) sense(r => r === "wooden" || r === "iron" || r === "vault");
  return m;
}

/** Blood Oaths turn up about as often as the other landmarks; secret rooms (from a layer's second floor) and hidden nooks now and then. */
export const OATH_WEIGHT = 6;
/** Offering Altars (the Forge's old Offering, now a landmark of its own). */
export const OFFERING_WEIGHT = 5;
/** Still pools for fishing. */
export const POND_WEIGHT = 4;
export const SECRET_ROOM_CHANCE = 0.4;
export const HIDDEN_NOOK_CHANCE = 0.3;
/** Crawl Elites very rarely carry a Skeleton Key. */
export const SKELETON_KEY_DROP = 0.1;

/** Each layer's own foes (the sixth layer on goes round again, tougher each time). */
export const LAYER_FOES: string[][] = [
  ["Skeleton", "Flayed", "Giant Spider", "Ghoul", "Wraith", "Hexer", "Acolyte"],
  ["Rot Leech", "Dust Leech", "Giant Spider", "Boar", "Blight Priest", "Ghoul", "Vampire Spawn"],
  ["Forge Golem", "Stone Golem", "Sentry", "Storm Wisp", "Acolyte", "Zealot", "Ash Wight"],
  ["Wraith", "Vampire Spawn", "Iron Tortoise", "Shieldbearer", "Gloomcaller", "Skeleton", "Ghoul"],
  ["Gloomcaller", "Blight Priest", "Zealot", "Vampire Spawn", "Stone Golem", "Storm Wisp", "Hexer"]
];
export function layerFoes(run: Run) {
  if (run.mode === "abyss") return MONSTERS;
  const names = LAYER_FOES[layerOf(run.floor)];
  const pool = MONSTERS.filter(mo => names.includes(mo.name));
  return pool.length ? pool : MONSTERS;
}
/** Hazard tiles: at most four on a floor, and about a third of floors have none. */
export const MAX_HAZARDS = 4;
export const HAZARD_FREE = 0.3;
/** Which pools each layer has (spikes are everywhere): sludge in the sewers, lava deeper down. */
const LAYER_POOLS: Hazard[][] = [["sludge"], ["sludge"], ["lava"], ["sludge", "lava"], ["lava", "sludge"]];

/** Hazards: spike traps and pools, often right across a hallway you have to take. */
function placeHazards(run: Run, m: FloorMap, rng: () => number, depth: number, s: { x: number; y: number }, taken: Set<number>, pockets: Set<number>, inHall: (i: number) => boolean) {
  const L = run.mode === "abyss" ? 4 : layerOf(run.floor);
  // The very first floor is gentle, and some floors have no hazards at all.
  if (L === 0 && depth <= 1) return;
  if (rng() < HAZARD_FREE) return;
  const haz: Record<number, Hazard> = {};
  const startI = idx(m, s.x, s.y);
  const all = reachable(m, s.x, s.y, new Set());
  const ok = (i: number) => m.tiles[i] === 1 && !taken.has(i) && !pockets.has(i) && i !== startI && !haz[i];
  // Hallway tiles you can't get around (taking one away cuts something off), and the rest of the hallways.
  const chokes: number[] = [], halls: number[] = [];
  for (let i = 0; i < m.tiles.length; i++) {
    if (!ok(i) || inHall(i) || Math.abs((i % m.w) - s.x) + Math.abs(Math.floor(i / m.w) - s.y) < 3) continue;
    const cut = reachable(m, s.x, s.y, new Set([i]));
    if (m.tiles.some((t, j) => t === 1 && all[j] && !cut[j] && j !== i)) chokes.push(i); else halls.push(i);
  }
  const far = (i: number) => Object.keys(haz).every(k => Math.abs((+k % m.w) - (i % m.w)) + Math.abs(Math.floor(+k / m.w) - Math.floor(i / m.w)) > 3);
  const pick = (list: number[]) => { const c = list.filter(i => ok(i) && far(i)); return c.length ? c[Math.floor(rng() * c.length)] : -1; };
  // Spike traps: one or two, most often on a tile you must cross.
  for (let n = 1 + (rng() < 0.45 ? 1 : 0); n > 0; n--) {
    const i = pick(rng() < 0.7 && chokes.length ? chokes : [...chokes, ...halls]);
    if (i >= 0) haz[i] = "spike";
  }
  // A pool across a hallway: two or three tiles of lava or sludge (on the first layer, only from its third floor).
  if ((L > 0 || depth >= 3) && rng() < (L === 0 ? 0.4 : 0.65)) {
    const kinds = LAYER_POOLS[L];
    const kind = kinds[Math.floor(rng() * kinds.length)];
    const c = pick(chokes.length ? chokes : halls);
    if (c >= 0) {
      const cells = [c];
      const len = 2 + (rng() < 0.5 ? 1 : 0);
      for (let k = 0; k < cells.length && cells.length < len; k++) {
        const x = cells[k] % m.w, y = Math.floor(cells[k] / m.w);
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const j = idx(m, x + dx, y + dy);
          if (cells.length < len && !cells.includes(j) && ok(j) && !inHall(j)) cells.push(j);
        }
      }
      for (const i of cells) haz[i] = kind;
    }
  }
  // Never more than a handful on one floor.
  const keys = Object.keys(haz);
  while (keys.length > MAX_HAZARDS) delete haz[+keys.splice(Math.floor(rng() * keys.length), 1)[0]];
  if (keys.length) m.haz = haz;
}

/** What a step costs on hazards: spikes bite each time, and a pool keeps burning for the next few steps. Never quite kills you. */
export function hazardStep(run: Run): number {
  const m = run.grid!, h = run.hero;
  let dmg = 0;
  // Vitality: every three points, spikes bite one less and pools burn one step shorter.
  const tough = Math.floor(attrOf(h, "vit") / 3);
  // Treadleaf Tea: hazards can't hurt you, and a pool's lingering burn goes out.
  if ((h.f.persist["draught_tread"] ?? 0) > 0) { m.burn = 0; m.burnKind = undefined; return 0; }
  if (m.burn && m.burn > 0) { dmg += 1; m.burn--; if (!m.burn) m.burnKind = undefined; }
  const hz = m.haz?.[idx(m, m.px, m.py)];
  if (hz === "spike") dmg += Math.max(1, SPIKE_DMG - tough);
  else if (hz === "lava" || hz === "sludge") { m.burn = Math.max(1, (hz === "sludge" ? SLUDGE_STEPS : POOL_STEPS) - tough); m.burnKind = hz; }
  if (!dmg) return 0;
  const was = h.f.hp;
  h.f.hp = Math.max(1, h.f.hp - dmg);
  return was - h.f.hp;
}

/** A few little torches on walls that face onto the floor. */
function wallTorches(m: FloorMap, rng: () => number, n: number): number[] {
  const cands: number[] = [];
  for (let i = m.w; i < m.tiles.length - m.w; i++) if (m.tiles[i] === 0 && m.tiles[i + m.w] === 1) cands.push(i);
  const out: number[] = [];
  while (out.length < n && cands.length) {
    const i = cands.splice(Math.floor(rng() * cands.length), 1)[0];
    if (out.every(o => Math.abs((o % m.w) - (i % m.w)) + Math.abs(Math.floor(o / m.w) - Math.floor(i / m.w)) > 4)) out.push(i);
  }
  return out;
}

/** Floor 0, the way in: one small room, a Merchant in the middle and the trapdoor down in a corner. */
function makeEntrance(run: Run, explored: number): FloorMap {
  const rng = run.rng;
  const tiles: Tile[] = new Array(MAP_W * MAP_H).fill(0);
  const room: Rect = { x: 7, y: 7, w: 5, h: 5 };
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) tiles[y * MAP_W + x] = 1;
  const m: FloorMap = { floor: run.floor, depth: 0, w: MAP_W, h: MAP_H, tiles, seen: new Array(MAP_W * MAP_H).fill(0), rooms: [room], things: [], px: 9, py: 11, explored };
  m.things.push({ x: 9, y: 9, room: "shop" });
  const corners: [number, number][] = [[7, 7], [11, 7], [7, 11], [11, 11]];
  const [tx, ty] = corners[Math.floor(rng() * corners.length)];
  m.things.push({ x: tx, y: ty, room: "trapdoor" });
  // The Obsidian Chest: the item you sealed when you last climbed out, here in the Entrance with the Merchant.
  if (run.obsidian && !run.obsidianTaken && run.floor === 1 && run.mode === "campaign") placeObsidian(m);
  m.torches = [(room.y - 1) * MAP_W + room.x + 1, (room.y - 1) * MAP_W + room.x + 3];
  look(m);
  return m;
}

/** What you start a Crawl with: enough Gold for one Healing Potion at the entrance, and no more. */
export const CRAWL_START_GOLD = 16;

/** Turn a fresh run into a Crawl (the prototype). */
export function startCrawl(run: Run) {
  run.gridMode = true;
  run.themes = [];
  run.message = "";
  run.hero.f.gold = CRAWL_START_GOLD;
  // You come in with nothing to drink: the entrance Merchant has a potion for you, if you want it.
  run.hero.potions = 0;
  // Loot sorted by class: each class finds its own weapons and off-hands.
  run.hero.f.persist["classLoot"] = 1;
  run.grid = makeGrid(run, 0);
  run.choices = [];
}

/** The Tavern's parting gift: you choose one as a run sets out from the top. */
export const GIFTS = {
  potion: { icon: "🧪", name: "A Healing Potion", text: "For the first fight that goes wrong." },
  key: { icon: "🗝️", name: "A Skeleton Key", text: "Opens one locked door, and what's behind it." },
  mana: { icon: "🔷", name: "A Mana Potion", text: "Fills your Mana: one more skill when it counts." }
} as const;
export type GiftId = keyof typeof GIFTS;
/** The Tavern's parting gift: one of the three, at random (the keeper decides). */
export function tavernGift(run: Run, rng: () => number = run.rng) {
  const ids = Object.keys(GIFTS) as GiftId[];
  run.scene = { t: "map" };
  takeGift(run, ids[Math.floor(rng() * ids.length)], true);
}
export function takeGift(run: Run, id: GiftId, given = false) {
  if (run.scene.t !== "gift" && !given) return;
  const h = run.hero;
  if (id === "potion") h.potions += 1;
  else if (id === "mana") h.manaPotions += 1;
  else h.f.persist["skelKeys"] = (h.f.persist["skelKeys"] ?? 0) + 1;
  run.message = `${GIFTS[id].icon} A parting gift from the Tavern: the keeper presses ${GIFTS[id].name.replace(/^A /, "a ")} into your hand. "Come back in one piece."`;
  run.scene = { t: "map" };
}

/** Choose your path's skill (from level 5): one of the two it offers, for the rest of the run. */
export function chooseSkill(run: Run, id: string): string | null {
  const h = run.hero, p = h.path ? PATH_MAP.get(h.path) : undefined;
  if (run.drill === "silent") return "No skills in this Drill.";
  if (!p) return "You walk no path.";
  if (h.skill) return "You've already chosen your skill.";
  if (h.level < SKILL_LEVEL) return `Reach level ${SKILL_LEVEL} first.`;
  if (!p.skills.includes(id)) return "That isn't one of your path's skills.";
  h.skill = id;
  return null;
}

/** Landing on an Abyss floor: three Omens on offer (accept one, or refuse them all). */
export function offerOmens(run: Run) {
  if (run.mode !== "abyss") return;
  const pool = OMENS.map(o => o.id).sort(() => run.rng() - 0.5);
  run.scene = { t: "omen", options: pool.slice(0, 3) };
}
/** Accept an Omen (or refuse, with null). */
export function chooseOmen(run: Run, id: string | null) {
  if (run.scene.t !== "omen") return;
  const h = run.hero;
  if (id && run.scene.options.includes(id)) {
    h.omens = { ...(h.omens ?? {}), [id]: (h.omens?.[id] ?? 0) + 1 };
    recompute(h);
    const f = h.f;
    if (id === "redharvest") f.hp = f.maxHp;
    if (id === "arcane") { f.persist["omenMana"] = (f.persist["omenMana"] ?? 0) + 1; f.maxMana = (f.maxMana ?? MANA_MAX) + 1; f.mana = f.maxMana; }
    if (id === "quarter") gainPotions(h, 2);
    if (id === "sight" && run.grid) run.grid.seen.fill(1);
    run.message = `${OMEN_MAP.get(id)!.icon} You accept ${OMEN_MAP.get(id)!.name}.`;
  } else run.message = "You turn away from the Omens.";
  run.scene = { t: "map" };
}
export const omensTaken = (h: Hero) => Object.values(h.omens ?? {}).reduce((a, b) => a + b, 0);

/** Set out with the Heat pact and the Tarot cards chosen at the Camp (normal runs only): the Heat they add, and what
 *  the cards do the moment you set out (gear, curses, Max HP). */
export function setOut(run: Run, pact: Partial<Record<string, number>>, cards: import("./tarot").TarotSlot[]) {
  const h = run.hero;
  if (run.mode === "abyss" || run.daily) { h.pact = undefined; h.tarot = undefined; run.heat = undefined; h.heat = undefined; recompute(h); return; }
  h.pact = Object.fromEntries(Object.entries(pact).filter(([, v]) => (v ?? 0) > 0));
  h.tarot = cards.filter(c => TAROT_MAP.has(c.id)).slice(0, 2);
  run.heat = pactHeat(h.pact) + tarotHeat(h.tarot) || undefined;
  h.heat = run.heat;
  const curse = (n: number) => { for (let k = 0; k < n; k++) { const c = CURSES[Math.floor(run.rng() * CURSES.length)]; h.curses[c.id] = (h.curses[c.id] ?? 0) + 1; h.f.persist["everCursed"] = 1; } };
  curse(pactRank(run, "cursed") + Math.round(tarotOf(h, "hierophant").bane) + Math.round(2 * tarotOf(h, "devil").bane));
  // The Fool: no starting kit, but an Epic weapon (and, from II, Epic armour).
  const fool = tarotOf(h, "fool");
  if (fool.on) {
    const of = (kind: string) => { let it = rollItem(h, "epic", Math.max(1, run.floor), run.rng); for (let k = 0; k < 40 && effectiveBase(it).kind !== kind; k++) it = rollItem(h, "epic", Math.max(1, run.floor), run.rng); return it; };
    delete h.equip.main; delete h.equip.off; delete h.equip.armour;
    const w = of("weapon"); w.revealed = true; h.equip.main = w; markFound(run, w);
    if (fool.boon >= 1.25) { const a = of("armour"); a.revealed = true; h.equip.armour = a; markFound(run, a); }
  }
  // The Hanged Man: set out with less Max HP.
  const hanged = tarotOf(h, "hanged");
  recompute(h);
  const loss = (hanged.on ? 0.15 * hanged.bane : 0) + (fool.bane >= 2 ? 0.1 : 0);
  if (loss) h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) + Math.round(h.f.maxHp * loss);
  recompute(h);
  h.f.hp = h.f.maxHp;
}

export const gridDanger = (run: Run) => (run.gridMode && run.grid ? dangerOf(run.grid) * (1 + 0.5 * pactRank(run, "dread") + 0.5 * (run.hero.omens?.["sight"] ?? 0)) : 0);

/** Pick a thing on the map (shows what it is). */
export function gridSelect(run: Run, t: number) {
  const m = run.grid;
  if (!m || run.scene.t !== "map" || !m.things[t] || m.things[t].done || !isSeenTile(m, m.things[t].x, m.things[t].y)) return;
  m.sel = t;
}

/** Take one step on the floor (to a tile next to you). Stepping onto a thing meets it.
 *  Returns what happened: "moved" (and which things came into view), "enter" (a room opened), or a reason you can't. */
export function gridStep(run: Run, x: number, y: number): { ok: true; entered: boolean; seen: number[]; hurt?: number } | { ok: false; why: string } {
  const m = run.grid;
  if (!m || run.scene.t !== "map") return { ok: false, why: "" };
  if (Math.abs(x - m.px) + Math.abs(y - m.py) !== 1 || !isFloor(m, x, y)) return { ok: false, why: "You can't go that way." };
  if (openedAt(m, x, y)) return { ok: false, why: "" };
  const t = thingAt(m, x, y);
  // A locked door: a Skeleton Key opens it; without one, you stay where you are.
  if (t >= 0 && m.things[t].room === "locked") {
    const h = run.hero;
    if ((h.f.persist["skelKeys"] ?? 0) <= 0) { m.sel = undefined; return { ok: false, why: "🔒 Locked. A Skeleton Key would open it." }; }
    h.f.persist["skelKeys"]--;
    m.things[t].done = true;
    m.sel = undefined;
    run.message = "🗝️ The Skeleton Key turns with a groan, and crumbles to dust. The door swings open.";
  }
  // A cracked wall gives way when you lean on it.
  else if (t >= 0 && m.things[t].room === "crack") {
    m.things[t].done = true;
    m.sel = undefined;
    run.message = "🧱 The cracked wall crumbles. There's a nook behind it!";
  }
  const t2 = thingAt(m, x, y);
  m.bx = m.px; m.by = m.py;
  m.px = x; m.py = y;
  const seen = look(m);
  let hurt = t2 < 0 || m.things[t2].room !== "urn" ? hazardStep(run) : 0;
  // Against the Clock (a Drill): every step past the floor's limit costs 1 HP (it never kills you).
  if (m.clock !== undefined && m.depth > 0) {
    m.clock--;
    if (m.clock < 0 && run.hero.f.hp > 1) { run.hero.f.hp--; hurt = (hurt ?? 0) + 1; }
  }
  if (t2 < 0) return { ok: true, entered: false, seen, hurt };
  return { ...gridMeet(run, t2, seen), hurt };
}

function gridMeet(run: Run, t: number, seen: number[]): { ok: true; entered: boolean; seen: number[] } {
  const m = run.grid!;
  m.sel = undefined;
  if (m.things[t].room === "trapdoor") { descend(run); return { ok: true, entered: true, seen }; }
  // The Way Up: climb out with what you've got (or not yet).
  if (m.things[t].room === "ascent") {
    if (canExtract(run)) { run.scene = { t: "extract" }; return { ok: true, entered: true, seen }; }
    if (m.bx !== undefined && m.by !== undefined) { m.px = m.bx; m.py = m.by; }
    return { ok: true, entered: false, seen };
  }
  if (m.things[t].room === "urn") { smashUrn(run, t); m.px = m.bx!; m.py = m.by!; return { ok: true, entered: false, seen }; }
  if (m.things[t].room === "bosschest") {
    m.things[t].done = true;
    m.things[t].opened = true;
    // You stay where you stood: the chest's still there, open.
    if (m.bx !== undefined && m.by !== undefined) { m.px = m.bx; m.py = m.by; }
    if (run.bossChest) { run.scene = run.bossChest; run.bossChest = undefined; }
    return { ok: true, entered: true, seen };
  }
  m.pending = t;
  run.nextFoe = m.things[t].foe;
  chooseRoom(run, m.things[t].room as RoomType);
  run.nextFoe = undefined;
  return { ok: true, entered: true, seen };
}

/** A cast at a dungeon pool: use one up, and say what (if anything) came up. Fish can be eaten now or kept for the Camp. */
export function fishCast(run: Run, struck: boolean): { text: string; fish?: Fish } {
  const s = run.scene;
  if (s.t !== "fishing" || s.casts <= 0) return { text: "" };
  s.casts--;
  if (!struck) { s.log.unshift("The line goes slack."); return { text: "The line goes slack." }; }
  const c = rollCatch(run.rng, Math.max(1, Math.min(5, run.floor)));
  const h = run.hero;
  let text = "";
  if (c.kind === "none") text = "Nothing on the hook.";
  else if (c.kind === "junk") {
    if (c.gold) { h.f.gold += c.gold; text = `${c.icon} ${c.name}: +${c.gold} Gold.`; }
    else { const it = rollItem(h, run.rng() < 0.3 ? "rare" : "uncommon", depth(run), run.rng); const err = addToBackpack(h, it); text = err ? `${c.icon} ${c.name}, but there's no room in your backpack for what's inside.` : `${c.icon} ${c.name}! Inside: ${itemName(it)} (in your backpack).`; if (!err) markFound(run, it); }
  } else {
    h.f.persist[`fishk_${c.fish.id}`] = (h.f.persist[`fishk_${c.fish.id}`] ?? 0) + 1;
    text = `${c.fish.icon} You land a ${c.fish.name}!`;
    s.log.unshift(text);
    return { text, fish: c.fish };
  }
  s.log.unshift(text);
  return { text };
}
/** Eat a fish caught this run (it no longer goes back to the Camp). */
export function eatFish(run: Run, id: string): string | null {
  const f = fishById(id), h = run.hero, k = `fishk_${id}`;
  if (!f || !(h.f.persist[k] ?? 0) || !f.heal) return null;
  h.f.persist[k]--;
  if (f.maxHp) { h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) - f.maxHp; recompute(h); h.f.hp += f.maxHp; }
  restore(h, f.heal);
  return `You eat the ${f.name}.${f.maxHp ? ` +${f.maxHp} Max HP.` : ""}`;
}
/** Sell a Gilded Koi for its gold (it no longer goes back to the Camp). */
export function sellFish(run: Run, id: string): string | null {
  const f = fishById(id), h = run.hero, k = `fishk_${id}`;
  if (!f?.gold || !(h.f.persist[k] ?? 0)) return null;
  h.f.persist[k]--;
  h.f.gold += f.gold;
  return `+${f.gold} Gold for the ${f.name}.`;
}

/** Bombs, Vile Brews and Smoke Bombs: bought, or found in urns and chests. You carry up to three of each. */
export const THROW_CAP = 3;
export const THROW_PRICE: Record<Throw, number> = { t_bomb: 28, t_fire: 24, t_frost: 24, t_knives: 20, t_holy: 22, t_net: 32, t_smoke: 30, t_brew: 0 };
/** What can be bought or found (the Blightcap Brew only comes from the Camp's Brewery). */
const FINDABLE_THROWS = THROWS.filter(t => !BREWED_THROWS.includes(t));
export function gainThrow(run: Run, t: Throw): boolean {
  const p = run.hero.f.persist, k = THROW_INFO[t].key;
  if ((p[k] ?? 0) >= THROW_CAP) return false;
  p[k] = (p[k] ?? 0) + 1;
  return true;
}
const randomThrow = (run: Run): Throw => FINDABLE_THROWS[Math.floor(run.rng() * FINDABLE_THROWS.length)];

/** Something for the Camp: a material (and how many), or Crown Shards. */
export function campGain(run: Run, mat: Mat | null, n: number, crowns = 0, scrolls = 0) {
  if (run.drill) return;
  const l = (run.campLoot ??= { crowns: 0, mats: {} });
  if (scrolls) l.scrolls = (l.scrolls ?? 0) + scrolls;
  if (mat && n) l.mats[mat] = (l.mats[mat] ?? 0) + n;
  l.crowns += crowns;
}

/** A seed for the Camp's Garden (Heartleaf most often, then Moonbell, then Blightcap). */
/** A random seed (common plants likelier), straight to the Camp's Garden store. */
export function seedDrop(run: Run, pick?: Plant): Plant {
  const pl = pick ?? pickW(run.rng, Object.fromEntries((Object.keys(PLANTS) as Plant[]).map(k => [k, PLANTS[k].weight])) as Record<Plant, number>);
  const l = (run.campLoot ??= { crowns: 0, mats: {} });
  (l.seeds ??= {})[pl] = (l.seeds[pl] ?? 0) + 1;
  return pl;
}

/** How often a Champion carries a seed for the Garden. */
export const CHAMPION_SEED = 0.3;
/** Seeds: Elites carry them now and then, and some chests hold one. */
export const ELITE_SEED = 0.08;
/** Seeds from plain foes of the wilder kinds (Beasts), now and then; from an urn, rarely; and from the Merchant. */
export const BEAST_SEED = 0.05, URN_SEED = 0.03, SHOP_SEED = 0.45;

/** Camp materials from Crawl foes: the chance a normal foe or an Elite drops some, an Elite's chance of a second, and a Champion's least. */
export const MAT_DROP = {
  often: { normal: 0.2, elite: 0.45, eliteTwo: 0.25, champ: 1 },
  rare: { normal: 0.35, elite: 0.7, eliteTwo: 0.4, champ: 2 },
};
/** Urns: mostly a few coins, now and then a Mana Potion, very rarely a Healing Potion. Smashed, they're gone. */
export const URN_MANA = 0.03, URN_HEAL = 0.01, URN_CLEANSE = 0.01;
/** Cleansing Potions are rare: an Elite or Champion only sometimes carries one. */
export const ELITE_CLEANSE = 0.04, CHAMPION_CLEANSE = 0.1;
export function smashUrn(run: Run, t: number) {
  const m = run.grid!, h = run.hero;
  m.things[t].done = true;
  const x = run.rng();
  if (x < URN_HEAL && h.potions < potionCap(h)) { gainPotions(h, 1); run.message = "🏺 The urn shatters. A Healing Potion rolls out! 🧪"; return; }
  if (x < URN_HEAL + URN_MANA && gainManaPotions(h, 1)) { run.message = "🏺 The urn shatters. A Mana Potion! 🔷"; return; }
  if (x < URN_HEAL + URN_MANA + URN_CLEANSE && gainCleansePotions(h, 1)) { run.message = "🏺 The urn shatters. A Cleansing Potion! 🫧"; return; }
  if (x < 0.07) { const t = randomThrow(run); if (gainThrow(run, t)) { run.message = `🏺 The urn shatters. Inside: ${THROW_INFO[t].icon} a ${THROW_INFO[t].name}!`; return; } }
  if (!run.drill && run.rng() < URN_SEED) { const pl = seedDrop(run); run.message = `🏺 The urn shatters. In the dust: ${PLANTS[pl].seedIcon} a ${PLANTS[pl].seed}, for the Camp's Garden.`; return; }
  if (x < 0.68) { const g = 1 + Math.floor(run.rng() * (2 + run.floor)); h.f.gold += g; run.message = `🏺 The urn shatters: ${g} Gold.`; return; }
  run.message = "🏺 The urn shatters. Nothing but dust.";
}

/** The Crawl: after a boss, its treasure room — the chest holding its rewards, and the hole down to the next layer. */
export const TREASURE_DEPTH = LAYER_FLOORS + 1;
function makeTreasure(run: Run): FloorMap {
  const tiles: Tile[] = new Array(MAP_W * MAP_H).fill(0);
  const room: Rect = { x: 7, y: 7, w: 5, h: 4 };
  for (let y = room.y; y < room.y + room.h; y++) for (let x = room.x; x < room.x + room.w; x++) tiles[y * MAP_W + x] = 1;
  const explored = run.grid?.explored ?? 0;
  const m: FloorMap = { floor: run.floor, depth: TREASURE_DEPTH, w: MAP_W, h: MAP_H, tiles, seen: new Array(MAP_W * MAP_H).fill(0), rooms: [room], things: [], px: 9, py: 10, explored };
  m.things.push({ x: 9, y: 8, room: "bosschest" });
  m.things.push({ x: run.rng() < 0.5 ? 7 : 11, y: 7, room: "trapdoor" });
  m.torches = [(room.y - 1) * MAP_W + room.x, (room.y - 1) * MAP_W + room.x + 4];
  look(m);
  return m;
}

/** Drop through the trapdoor: a fresh floor below (there's no climbing back), or, from the third, straight into the boss. */
export function descend(run: Run) {
  const m = run.grid;
  if (!m) return;
  run.hero.f.persist["floor"] = run.floor;
  // The Hermit: a floor left without a Healing Potion drunk on it gives Mana (and, from II, a little HP).
  const hermit = tarotOf(run.hero, "hermit"), hf = run.hero.f;
  if (hermit.on && !hf.persist["potFloor"] && m.depth !== TREASURE_DEPTH && m.depth > 0) {
    hf.mana = Math.min(hf.maxMana ?? MANA_MAX, (hf.mana ?? 0) + Math.round(hermit.boon));
    if (hermit.boon > 1) hf.hp = Math.min(hf.maxHp, hf.hp + Math.ceil(hf.maxHp * 0.05));
  }
  hf.persist["potFloor"] = 0;
  // From the boss's treasure room: down to the next layer.
  if (m.depth === TREASURE_DEPTH) { run.gridDescend = true; run.bossChest = undefined; advance(run); return; }
  // Against the Clock (a Drill): steps left over are Gold.
  if (m.clock !== undefined && m.clock > 0 && m.depth > 0) { run.hero.f.gold += m.clock; run.message = `⏳ ${m.clock} steps to spare: +${m.clock} Gold.`; }
  // Boss Rush (a Drill): the entrance's trapdoor drops you straight onto the guardian.
  if (m.depth + 1 >= layerFloors(run) || run.drill === "bossrush") {
    run.step = STEPS_PER_FLOOR;
    const name = run.mode === "abyss" ? "The Abyss's warden" : run.floor === WALL_FLOOR ? "The Horror" : run.floor === DEATH_FLOOR ? "DEATH" : run.floor === END_FLOOR ? "The End" : "The guardian of this layer";
    run.popup = { icon: "👑", title: `Floor ${layerFloors(run)} — the bottom`, text: `The trapdoor gives way and you land hard in the dark at the bottom of the layer. There's no way back up. ${name} is already here, and it has seen you.` };
    enterRoom(run, "boss");
    return;
  }
  tickDraughts(run);
  // Catch your breath: each drop through a trapdoor restores a little HP (more on the 1st Layer).
  const hf2 = run.hero.f, back = Math.min(hf2.maxHp - hf2.hp, Math.round(hf2.maxHp * (run.floor === 1 && run.mode !== "abyss" ? DROP_HEAL_FIRST : DROP_HEAL)));
  if (back > 0 && hf2.hp > 0) hf2.hp += back;
  run.grid = makeGrid(run, m.depth + 1, m.explored);
  // Every drop brings one gift for your die: a Face Rune, or now and then a Shuffler. Take it or leave it (not in Drills or the Abyss).
  if (run.mode !== "abyss" && !run.drill) rollDescentGift(run);
  if (run.floor === 1) run.hero.f.persist["l1depth"] = Math.max(run.hero.f.persist["l1depth"] ?? 0, m.depth + 1);
  // Still burning from the floor above: it carries on down.
  if (m.burn) { run.grid.burn = m.burn; run.grid.burnKind = m.burnKind; }
  run.message = `🕳️ You drop through the trapdoor to floor ${m.depth + 1}. There's no climbing back up.${back > 0 ? ` You catch your breath: +${back} HP.` : ""}`;
  // The Abyss: Omens wait on every floor.
  if (run.mode === "abyss") { if (run.hero.omens?.["sight"]) run.grid.seen.fill(1); offerOmens(run); }
}

/** Chests: once opened they stay on the map, empty. */
export const CHEST_ROOMS = ["obsidian", "wooden", "iron", "vault", "secret", "crimson_vault", "bosschest"];
/** Springs, altars, fountains, the Forge and other fixtures stay on the map once used, spent (you step back off them). */
export const FIXTURE_ROOMS = ["sacred_spring", "mirror_pool", "cleansing", "sanguine", "altar", "oath", "shrine", "offering", "forge", "masterwork", "jeweller", "bounty", "sanctum", "pond", "rest", "event", "crossroads"];

/** The thing you stepped onto is met (called as its room opens). */
function gridArrive(run: Run) {
  const m = run.grid;
  if (!m || m.pending === undefined) return;
  const t = m.things[m.pending];
  m.last = m.pending;
  m.pending = undefined;
  // A Merchant stays where it is (you step back off its tile); everything else is used up.
  if (t.room === "shop") { if (m.bx !== undefined && m.by !== undefined) { m.px = m.bx; m.py = m.by; } return; }
  t.done = true;
  // Chests stay where they were, open; you step back off them.
  if (CHEST_ROOMS.includes(t.room) || FIXTURE_ROOMS.includes(t.room)) { t.opened = true; if (m.bx !== undefined && m.by !== undefined) { m.px = m.bx; m.py = m.by; } }
  if (t.room !== "boss") m.explored++;
}

/** The Crimson mechanic kicks in once you've beaten the campaign's fifth boss. */
export function crimsonActive(run: Run) {
  // (The dungeon: from the 2nd layer. The old Campaign: after its fifth boss.)
  // (The Sun's bane: from the very first layer.)
  return run.gridMode ? run.floor >= 2 || tarotOf(run.hero, "sun").on : run.floor > FLOORS;
}

// ---------- Rooms ----------

export function chooseRoom(run: Run, room: RoomType) {
  run.message = "";
  if (room === "vault" || room === "altar" || room === "shrine" || room === "crimson_vault") {
    run.scene = { t: "confirm", room };
    return;
  }
  enterRoom(run, room);
}

/** Deal a run its floor themes: seven different ones from the pool, in a random order (from the run's seed). */
export function dealThemes(seed: number): string[] {
  const rng = makeRng((seed ^ 0x7e3a11) >>> 0);
  const ids = THEMES.map(t => t.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids.slice(0, THEMED_FLOORS);
}
/** This floor's theme (none in the Abyss, which is its own place). The first floors each have their own; deeper floors draw one at random
 *  (fixed by the run's seed, and never the same as the floor above). */
export function themeOf(run: Run, floor = run.floor): FloorTheme | undefined {
  // The Crawl has no floor themes.
  if (run.mode === "abyss" || run.gridMode) return undefined;
  if (!run.themes?.length) run.themes = dealThemes(run.seed);
  const fl = Math.max(1, floor);
  if (fl <= run.themes.length) return themeById(run.themes[fl - 1]);
  const prev = themeOf(run, fl - 1)?.id;
  const pool = THEMES.filter(t => t.id !== prev);
  const rng = makeRng(((run.seed ^ Math.imul(fl, 2654435761)) >>> 0) || 1);
  return pool[Math.floor(rng() * pool.length)];
}

/** The Changeling Doppelgänger: you, exactly as you are walking in (HP, stats, statuses, gear, passives, talents and relics). */
function makeDoppel(h: Hero): Fighter {
  const f = h.f;
  return {
    ...f, id: "enemy", name: "Changeling Doppelgänger", title: "Wearing your face", elite: true, doppel: true, gold: 0,
    statuses: { ...f.statuses }, flags: {}, persist: { ...f.persist }, items: { ...f.items },
    faces: [...f.faces], offFaces: f.offFaces ? [...f.offFaces] : undefined,
    barrierElements: f.barrierElements ? [...f.barrierElements] : undefined
  } as Fighter;
}

/** Begin an encounter (from Something Strange or its own path). */
function startEvent(run: Run, evDef: GameEvent) {
  if (evDef.unique) run.seenBosses.add(`e:${evDef.id}`);
  // The Wandering Blacksmith: two free upgrades at his anvil. The Alchemist: a shop of combat tonics.
  if (["blacksmith", "alchemist", "holy_tribute"].includes(evDef.id)) markEncounter(run, `ev:${evDef.id}`);
  if (evDef.id === "blacksmith") { run.scene = { t: "smith", uses: 2 }; return; }
  if (evDef.id === "alchemist") { run.scene = { t: "alchemist", stock: alchemistStock(run) }; return; }
  if (evDef.id === "crossroads") { run.scene = { t: "event", ev: crossroadsEvent(CROSSROADS_GUISES[Math.floor(run.rng() * CROSSROADS_GUISES.length)]), result: null, found: [] }; return; }
  if (evDef.id === "holy_tribute") { run.scene = { t: "tribute", paid: 0 }; return; }
  run.scene = { t: "event", ev: evDef, result: null, found: [] };
}

function enterRoom(run: Run, room: RoomType) {
  const h = run.hero;
  if (run.gridMode) gridArrive(run);
  // A contract's clock: every room you enter (except the board itself) uses one of its rooms.
  if (run.bounty && room !== "bounty") run.bounty.roomsLeft = Math.max(0, run.bounty.roomsLeft - 1);
  // Plain fights build the streak. Only fighting something other than a normal monster breaks it (see fight()).
  if (room === "fight") run.normalStreak = (run.normalStreak ?? 0) + 1;
  switch (room) {
    case "fight": return fight(run, "normal");
    case "elite": return fight(run, "elite");
    case "champion": return fight(run, "champion");
    case "boss": return fight(run, "boss");
    case "vault": return fight(run, "champion", "resplendent");
    case "crimson_elite": return fight(run, "crimson");
    case "crimson_vault":
      if (h.crimsonKeys <= 0) return advance(run);
      h.crimsonKeys--;
      return fight(run, "boss", "crimson");
    case "obsidian": {
      // The Obsidian Chest: what you sealed when you last climbed out (an item, your potions, or your gold).
      run.obsidianTaken = true;
      const o = run.obsidian;
      if (o?.item) { run.scene = { t: "loot", title: "Obsidian Chest", items: [o.item], gold: 0, scrolls: 0, potions: 0 }; return; }
      if (o?.gold) { h.f.gold += o.gold; run.message = `🖤 The Obsidian Chest opens: ${o.gold} Gold, just as you left it.`; return; }
      if (o?.potions) {
        const got = [o.potions.heal ? `${o.potions.heal} 🧪` : "", o.potions.mana ? `${gainManaPotions(h, o.potions.mana)} 🔷` : "", o.potions.cleanse ? `${gainCleansePotions(h, o.potions.cleanse)} 🫧` : ""].filter(Boolean).join(" · ");
        h.potions += o.potions.heal;
        run.message = `🖤 The Obsidian Chest opens: your potions, ${got || "none"}.`;
        return;
      }
      run.message = "🖤 The Obsidian Chest is empty.";
      return;
    }
    case "wooden": {
      setGenLuck(genLuck(run));
      // The Crawl: a chest holds one item and nothing else.
      const sg = run.gridMode ? null : rollSigilDrop(run, 0.06, 0.1);
      const woodOdds = chestOdds(run, useClover(run) ? luckyOdds(tables(run).wooden) : tables(run).wooden);
      run.scene = { t: "loot", title: "Wooden Chest", items: [firstFind(run) ?? dropItem(run, woodOdds)], gold: run.gridMode ? 0 : (3 + run.floor) * (abyssMod(run, "golden_depths") ? 2 : 1), scrolls: 0, potions: !run.gridMode && run.rng() < 0.08 ? 1 : 0, sigils: sg ? [sg] : undefined };
      return;
    }
    case "iron": {
      setGenLuck(genLuck(run));
      const sg = run.gridMode ? null : rollSigilDrop(run, 0.12, 0.15);
      const key = (h.relics["skeleton_key"] ?? 0) > 0;
      const moon = tarotOf(h, "moon");
      // (Never a Mimic while the 1st Layer's first find is still to come.)
      const firstPending = run.gridMode && run.mode !== "abyss" && run.floor === 1 && !h.f.persist["firstFind"];
      if (!key && !firstPending && run.rng() < (!moon.on ? 1 / 6 : moon.boon >= 2 ? 1 / 2 : moon.boon > 1 ? 2 / 5 : 1 / 3)) {
        run.message = "The chest bites! It's a Mimic.";
        // A Mimic isn't a chest: once it's dealt with, nothing stays behind.
        if (run.gridMode && run.grid?.last !== undefined) run.grid.things[run.grid.last].opened = undefined;
        // On a Crawl layer's first floor, a smaller one.
        return fight(run, run.gridMode && run.grid?.depth === 1 && !moon.on ? "normal" : "elite", "mimic");
      }
      const ironOdds = chestOdds(run, useClover(run) ? luckyOdds(tables(run).iron) : tables(run).iron);
      const items = [firstFind(run) ?? dropItem(run, ironOdds)];
      if (key && !run.gridMode) items.push(dropItem(run, ironOdds));
      run.scene = key ? { t: "pick", title: "Iron Chest — choose one", items } : { t: "loot", title: "Iron Chest", items, gold: run.gridMode ? 0 : (5 + run.floor * 2) * (abyssMod(run, "golden_depths") ? 2 : 1), scrolls: 0, potions: 0, sigils: sg ? [sg] : undefined };
      return;
    }
    case "altar":
      h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) + Math.round(h.f.maxHp * 0.25);
      recompute(h);
      run.message = "The altar drinks deep. Your Max HP falls by a quarter.";
      return openResplendent(run);
    case "shrine": {
      const c = CURSES[Math.floor(run.rng() * CURSES.length)];
      h.curses[c.id] = (h.curses[c.id] ?? 0) + 1;
      recompute(h);
      run.message = `You are cursed: ${c.name} — ${c.text}.`;
      return openResplendent(run);
    }
    case "shop": {
      // The Crawl's Merchants stay put: come back and the same stock is waiting.
      const th = run.gridMode && run.grid && run.grid.last !== undefined ? run.grid.things[run.grid.last] : undefined;
      if (th && th.room === "shop") {
        if (!th.stock) { run.shopRerolls = 0; th.stock = shopStock(run); th.rerolls = 0; }
        run.shopRerolls = th.rerolls ?? 0;
        run.scene = { t: "shop", stock: th.stock, markup: Math.round((wealthMult(run) - 1) * 100) };
        return;
      }
      run.shopRerolls = 0; run.scene = { t: "shop", stock: shopStock(run), markup: Math.round((wealthMult(run) - 1) * 100) }; return;
    }
    case "forge": run.scene = { t: "forge" }; return;
    case "masterwork": run.scene = { t: "masterwork" }; return;
    case "jeweller": run.scene = { t: "jeweller", mode: "fuse", tries: 0 }; return;
    case "rest": run.scene = { t: "rest", done: false }; return;
    case "event": {
      // Unique encounters (the dragon, the mirror pool) happen at most once per run.
      // (The Crossroads Dealer trades relics, and the Crawl has none.)
      const pool = EVENTS.filter(e => !OWN_PATH_EVENTS.includes(e.id) && eventOpen(run, e) && !(run.gridMode && e.id === "dealer"));
      const ev = pickW(run.rng, Object.fromEntries(pool.map(e => [e.id, eventWeight(run, e)])) as Record<string, number>);
      startEvent(run, pool.find(e => e.id === ev)!);
      // The Crawl: what's behind the door plays out in a room of its own.
      if (run.gridMode && run.scene.t === "event") run.scene.strange = true;
      return;
    }
    case "doppelganger": return fight(run, "elite", "doppel");
    case "alchemist": case "blacksmith": case "gambling_den": case "fortune_teller": case "mirror_pool": case "card_sharp": case "sacred_spring": case "fallen_adventurer": case "starving_pilgrim":
      return startEvent(run, EVENTS.find(e => e.id === EVENT_ROOMS[room])!);
    case "sanguine": run.scene = { t: "event", ev: EVENTS.find(e => e.id === "sanguine_altar")!, result: null, found: [] }; return;
    case "cleansing": {
      // The Well (rarer) or a Holy Tribute.
      const id = run.rng() < 0.25 ? "cleansing_well" : "holy_tribute";
      if (id === "holy_tribute") { markEncounter(run, `ev:${id}`); run.scene = { t: "tribute", paid: 0 }; return; }
      run.scene = { t: "event", ev: EVENTS.find(e => e.id === id)!, result: null, found: [] };
      return;
    }
    case "sanctum": run.scene = { t: "sanctum" }; return;
    case "offering": run.scene = { t: "offering" }; return;
    case "pond": run.scene = { t: "fishing", casts: POND_CASTS, log: [] }; return;
    case "oath": run.scene = { t: "event", ev: EVENTS.find(e => e.id === "blood_oath")!, result: null, found: [] }; return;
    case "secret": return openSecret(run);
    case "crossroads":
      run.seenBosses.add("e:crossroads");
      run.scene = { t: "event", ev: crossroadsEvent(CROSSROADS_GUISES[run.crossroadsGuise ?? 0]), result: null, found: [] };
      return;
    case "bounty": run.scene = { t: "bounty", offers: bountyOffers(run) }; return;
    case "unique": return fight(run, "elite", "unique");
    case "goblin": return fight(run, "elite", "goblin");
    case "nemesis": run.seenBosses.add("nemesis"); return fight(run, "champion", "nemesis");
  }
}

/** A secret chest: rare materials, a great deal of Gold, or very good loot (one of the three). */
function openSecret(run: Run) {
  const h = run.hero;
  const x = run.rng();
  if (x < 0.34) {
    const sm = 1 + (run.rng() < 0.5 ? 1 : 0), ori = 1 + (run.rng() < 0.4 ? 1 : 0);
    h.starmetal += sm;
    h.orilium = (h.orilium ?? 0) + ori;
    run.message = `💎 The secret chest holds rare materials: ${sm} Starmetal and ${ori} Orilium.`;
    run.scene = { t: "loot", title: "Secret Chest", items: [], gold: 0, scrolls: 0, potions: 0 };
  } else if (x < 0.67) {
    run.message = "💎 The secret chest is packed with Gold.";
    run.scene = { t: "loot", title: "Secret Chest", items: [], gold: 40 + 25 * run.floor, scrolls: 0, potions: 0 };
  } else {
    setGenLuck(genLuck(run));
    run.scene = { t: "loot", title: "Secret Chest", items: [rollItem(h, run.rng() < 0.45 ? "epic" : "rare", depth(run), run.rng)], gold: 0, scrolls: 0, potions: 0 };
  }
}

export function confirmRisk(run: Run, yes: boolean) {
  if (run.scene.t !== "confirm") return;
  // On the grid, turning back leaves the room as it was.
  if (!yes && run.gridMode && run.grid) {
    const m = run.grid;
    m.pending = undefined;
    if (m.bx !== undefined && m.by !== undefined) { m.px = m.bx; m.py = m.by; }
    run.scene = { t: "map" };
    return;
  }
  if (!yes) return advance(run);
  markEncounter(run, `room:${run.scene.room}`);
  enterRoom(run, run.scene.room);
}

function openResplendent(run: Run) {
  const cards = resplendentCards(run.hero, depth(run), run.loot, run.rng);
  useClover(run);
  run.scene = { t: "resplendent", cards, picked: null, glove: (run.hero.relics["gamblers_glove"] ?? 0) > 0 };
}

// ---------- Combat ----------

export function fight(run: Run, rank: MonsterRank, then?: "resplendent" | "mimic" | "crimson" | "unique" | "goblin" | "dragon" | "transformed" | "death" | "nemesis" | "doppel", defName?: string) {
  run.hero.f.persist["floor"] = run.floor;
  // The Crawl: the foe you walked into is the one you fight.
  const known = !then && rank !== "boss" && !defName && !!run.nextFoe;
  if (known) defName = run.nextFoe;
  const F = depth(run);
  // DEATH and the Changeling are exactly what they are: no depth, Heat or Abyss toughening.
  const exact = then === "death" || then === "doppel";
  // The Abyss: one layer below the last, and its warden at the bottom is an Uber boss.
  const uber = run.mode === "abyss" && !then && rank === "boss" && run.step >= STEPS_PER_FLOOR;
  // Fighting anything but a normal monster breaks the plain-fight streak (the floor boss doesn't count: you can't avoid it).
  if (rank !== "normal" && !(rank === "boss" && !then)) run.normalStreak = 0;
  // A Crimson Vault always holds a Crimson boss; in Endless, a floor boss is rarely Crimson too.
  // (Never on the floors with a special boss: the Horror, the Epic Crimson floors, DEATH and the End.)
  const special = run.floor === WALL_FLOOR || EPIC_CRIMSON_FLOORS.includes(run.floor) || run.floor === DEATH_FLOOR || run.floor === END_FLOOR;
  const crimsonBoss = rank === "boss" && (then === "crimson" || (crimsonActive(run) && !special && run.rng() < 0.06));
  // A rare gold thief sometimes turns up in place of a normal monster.
  const thief = rank === "normal" && !then && !known && run.rng() < 0.04;
  let enemy = then === "doppel" ? makeDoppel(run.hero) : then === "nemesis" && run.nemesis ? makeNemesis(run.nemesis, F) : then === "death" ? makeDeath() : then === "dragon" ? makeDragon(run.rng, F, defName ?? "The Chained Dragon", defName ? "Woken, and furious" : "Awake, and furious") : then === "goblin" ? makeGoblin(run.rng, F) : then === "unique" ? makeUnique(run.rng, F, run.seenBosses) : crimsonBoss ? makeCrimsonBoss(depth(run), run.rng) : rank === "boss" ? makeBoss(F, run.rng, run.seenBosses) : thief ? makeThief(run.rng, F) : makeMonster(run.rng, F, rank, defName, themeOf(run));
  // The Abyss holds fewer Unholy things (Undead, vampires, cursers): most of them are turned away for something else.
  if (run.mode === "abyss" && !then && !crimsonBoss && rank !== "boss" && !thief)
    for (let k = 0; k < 3 && isUnholy(enemy) && run.rng() < 0.65; k++) enemy = makeMonster(run.rng, F, rank, defName);
  // The Changeling sometimes strikes from your own shadow before you can act.
  if (then === "doppel" && run.rng() < DOPPEL_AMBUSH) enemy.items["m_ambush"] = 1;
  // The floor's theme: sometimes its own boss holds the floor (not the Hollow King's, nor the endgame's), and its foes carry its marks.
  const theme = themeOf(run);
  if (theme && rank === "boss" && !then && !crimsonBoss && !special && run.floor !== CAMPAIGN_FLOORS && !run.seenBosses.has(`t:${theme.id}`) && run.rng() < 0.5) {
    run.seenBosses.add(`t:${theme.id}`);
    enemy = makeThemeBoss(theme.boss, F);
  }
  if (theme && !exact && enemy.name !== "DEATH" && enemy.name !== "THE END" && !special) {
    if (rank !== "boss" && !thief && run.rng() < theme.traitChance) enemy.items[theme.trait] = 1;
    theme.tweak?.(enemy);
  }
  // Unholy foes are a rarer sight in the Campaign too: some of them are turned away for something else.
  if (run.mode !== "abyss" && !then && !known && rank !== "boss" && !thief && !crimsonBoss && isUnholy(enemy) && run.rng() < UNHOLY_REROLL) {
    enemy = makeMonster(run.rng, F, rank, defName, theme);
    if (theme) { if (run.rng() < theme.traitChance) enemy.items[theme.trait] = 1; theme.tweak?.(enemy); }
  }
  // A rare weakness: blunt, bladed or two-handed weapons, spells, Bleed, or Fracture and Spikes hit it harder.
  if (!exact && !special && enemy.name !== "DEATH" && enemy.name !== "THE END" && run.rng() < (rank === "boss" ? 0.12 : rank === "normal" ? 0.07 : 0.1))
    enemy.items[WEAKNESSES[Math.floor(run.rng() * WEAKNESSES.length)]] = 1;
  if (then === "mimic") {
    enemy.name = "Mimic";
    enemy.items["m_ambush"] = 1;
  }
  if (run.mode === "abyss" && !exact) {
    // The Abyss: a little deadlier than the layer above it, and darker; and the Omens you accepted.
    const o = (id: string) => run.hero.omens?.[id] ?? 0;
    let hp = ABYSS_HP * (1 + 0.15 * o("gilded")) * (rank === "elite" ? 1 + 0.25 * o("arcane") : 1);
    let dmg = ABYSS_DMG * (1 + 0.12 * o("redharvest")) * (rank === "champion" ? 1 + 0.2 * o("hunters") : 1);
    enemy.armor += o("whetstone");
    if (uber) { makeUber(enemy, F, run.rng); hp *= 0.8; dmg *= 0.9; }
    enemy.maxHp = enemy.hp = Math.round(enemy.hp * hp);
    enemy.damage = Math.round(enemy.damage * dmg);
  }
  // Bosses and Uber bosses sometimes shrug off a kind of status, strike true, or carry a Causality Mirror. Uber bosses always have something.
  if (rank === "boss" && !exact && enemy.name !== "DEATH") {
    const roll = (p: number) => run.rng() < p;
    const pick = BOSS_IMMUNITIES[Math.floor(run.rng() * BOSS_IMMUNITIES.length)];
    if (uber || (run.floor >= 2 && roll(0.35))) enemy.items[pick] = 1;
    if (roll(uber ? 0.4 : run.floor >= 3 ? 0.2 : 0)) enemy.items["x_truestrike"] = 1;
    if (roll(uber ? 0.4 : run.floor >= 4 ? 0.12 : 0)) enemy.items["x_mirror"] = 1;
    // Some bosses strip your blessings for a while, and some sour your healing.
    if (roll(uber ? 0.45 : run.floor >= 2 ? 0.25 : 0)) enemy.items["x_dispelling"] = 1;
    if (roll(uber ? 0.35 : run.floor >= 3 ? 0.15 : 0)) enemy.items[run.rng() < 0.5 ? "x_grievous" : "x_blighting"] = 1;
  }
  // Deeper foes wear more Armor, in every mode (bosses most of all). DEATH is its own thing.
  if (!exact) enemy.armor += Math.floor((F - 1) / 3) + (rank === "boss" ? Math.floor(F / 5) : 0);
  // From floor 15 of a Campaign, every floor is a good deal deadlier than the last.
  if (run.mode !== "abyss" && run.floor >= DEEP_FLOOR && !exact) {
    const k = run.floor - DEEP_FLOOR + 1;
    enemy.maxHp = enemy.hp = Math.round(enemy.hp * Math.pow(1.07, k));
    enemy.damage = Math.round(enemy.damage * Math.pow(1.05, k));
  }
  // Heat (the pact's conditions) and the Tarot's banes.
  if (!exact) {
    const h = run.hero, P = (id: string) => pactRank(run, id);
    let hp = 1 + 0.12 * P("hardened"), dmg = 1 + 0.1 * P("sharpened");
    enemy.armor += P("armored");
    if (rank === "boss") { hp *= 1 + 0.25 * P("bosses"); dmg *= 1 + 0.1 * P("bosses"); }
    // Edict cards: each point of their Heat toughens every foe a little.
    const edict = tarotHeat(h.tarot);
    hp *= 1 + 0.08 * edict; dmg *= 1 + 0.06 * edict;
    const T = (id: string) => tarotOf(h, id);
    hp *= 1 + 0.15 * T("empress").bane;
    dmg *= 1 + 0.12 * T("death").bane;
    if (rank === "elite") { hp *= 1 + 0.25 * T("emperor").bane; dmg *= 1 + 0.15 * T("emperor").bane; }
    if (rank === "champion") dmg *= 1 + 0.2 * T("strength").bane;
    if (rank === "boss") { hp *= 1 + 0.3 * T("tower").bane; dmg *= 1 + 0.15 * T("tower").bane; }
    if (then === "mimic") hp *= 1 + 0.25 * T("moon").bane;
    enemy.maxHp = enemy.hp = Math.round(enemy.hp * hp);
    enemy.damage = Math.round(enemy.damage * dmg);
  }
  // The Crawl: one foe at a time, but a harder one, and the floor grows more dangerous the longer you linger.
  // The Knowledge Table's lore: hit a kind of foe you've studied harder.
  if (run.gridMode && !exact) {
    const d = gridDanger(run);
    // Every foe in the Crawl is close to an Elite: plain monsters come much tougher.
    const near = rank === "normal" && !thief;
    // They ease you in: well short of that on a layer's first floor, full strength from the fourth.
    const depthIn = run.grid?.depth ?? layerFloors(run);
    // (The very first layer eases you in further: its plain foes reach full strength only on its last floors.)
    const ramp = run.floor <= 1 && run.mode !== "abyss" ? Math.min(1, 0.1 + 0.18 * (depthIn - 1)) : Math.min(1, 0.25 + 0.25 * (depthIn - 1));
    // Elites on the first layer's first two floors come a little softer too.
    const ease = (run.floor <= 1 && run.mode !== "abyss" && rank === "elite" && depthIn <= 2 ? FIRST_ELITE_EASE : 1) * layerScale(run, depthIn);
    enemy.maxHp = enemy.hp = Math.round(enemy.hp * ease * layerHpMult(run) * (near ? 1 + (CRAWL_NORMAL_HP - 1) * ramp : GRID_HP) * (1 + DANGER_HP * d));
    enemy.damage = Math.round(enemy.damage * ease * layerDmgMult(run) * GRID_DMG * (1 + DANGER_DMG * d)) + (near ? Math.round(CRAWL_NORMAL_POWER * ramp) : 0);
  }
  run.hero.f.persist["goldAtFight"] = run.hero.f.gold;
  const battle = startBattle(run.hero.f, enemy, Math.floor(run.rng() * 1e9), run.carry);
  // Angelic Blessing: heal 2 as the fight begins.
  if ((run.hero.f.persist["angelFights"] ?? 0) > 0) healF(battle, run.hero.f, 2, "Angelic Blessing");
  run.carry = 0;
  run.scene = { t: "combat", battle, rank, then, uber: uber || undefined };
  if (battle.over) afterFight(run);
}

/** Which actions the hero can take right now. Guard needs a shield (a Warrior can Guard with a two-hander too). */
export function availableActions(run: Run): Action[] {
  if (run.scene.t !== "combat") return [];
  const h = run.hero;
  const b = run.scene.battle;
  const out: Action[] = ["attack"];
  if (canGuard(h)) out.push("guard");
  // Class actions are always offered, even when they'd be wasted (e.g. Counter while Evade already covers the next hit):
  // reading the fight is part of the skill.
  // The ability chosen at the Camp's Skills (one a run); otherwise the class's own.
  // The path skill chosen at level 5 (none before that).
  if (h.skill && run.drill !== "silent") out.push(h.skill as Action);
  // Skills your Legendaries grant.
  if (run.drill !== "silent") for (const it of Object.values(h.equip)) { const g = it ? effectiveBase(it).grants : undefined; if (g && isSkill(g) && !out.includes(g)) out.push(g as Action); }
  // Abilities your gear grants (each one a button of its own, costing Mana like your class's).
  if (run.drill !== "silent") for (const id of Object.keys(h.f.items)) if (id.startsWith("ab_")) { const sk = id.slice(3) as Action; if (isSkill(sk) && !out.includes(sk)) out.push(sk); }
  // Things to throw, when you carry any.
  for (const t of THROWS) if ((h.f.persist[THROW_INFO[t].key] ?? 0) > 0) out.push(t);
  if (!b.enemy.boss && (!b.enemy.elite || b.player.flags["smoke"])) out.push("flee");
  return out;
}

export function combatAction(run: Run, action: Action) {
  if (run.scene.t !== "combat") return;
  if (!availableActions(run).includes(action)) action = "attack";
  const b = run.scene.battle;
  const before = b.enemy.hp;
  if (action !== "attack" && action !== "flee") run.hero.f.persist[`act_${action}`] = (run.hero.f.persist[`act_${action}`] ?? 0) + 1;
  playRound(b, action);
  run.stats.bestHit = Math.max(run.stats.bestHit, before - Math.max(0, b.enemy.hp));
  if (b.over) afterFight(run);
}

export const AUTO_BATTLE_FLOOR = 1;
/** Auto-battle is offered against normal foes, Elites and Champions (not bosses, dragons, goblins or named foes)
 *  once plain attacks are sure to win. */
export function canAutoBattle(run: Run): boolean {
  // The Crawl has no Quick Battle: every fight is yours.
  if (run.gridMode) return false;
  const s = run.scene;
  if (s.t !== "combat" || s.battle.over) return false;
  if (!["normal", "elite", "champion"].includes(s.rank)) return false;
  if (run.floor < AUTO_BATTLE_FLOOR) return false;
  if (s.then && ["dragon", "death", "goblin", "unique"].includes(s.then)) return false;
  return autoBattleWins(s.battle);
}

/** Play the rest of the fight out, attacking every turn. Returns a one-line summary. */
export function autoBattle(run: Run): string | null {
  if (!canAutoBattle(run) || run.scene.t !== "combat") return null;
  const b = run.scene.battle;
  const hp = b.player.hp, start = b.round;
  let n = 0;
  while (run.scene.t === "combat" && !b.over && n++ < 100) combatAction(run, "attack");
  b.fx.length = 0;
  const lost = Math.max(0, hp - run.hero.f.hp);
  return `⚡ Quick Battle: ${b.over === "won" ? "won" : "over"} in ${b.round - start} round${b.round - start === 1 ? "" : "s"}${lost ? `, −${lost} HP` : ", untouched"}.`;
}

/** After the UI has played a phase, finish the fight if it's over. */
export function settleCombat(run: Run) {
  if (run.scene.t === "combat" && run.scene.battle.over) afterFight(run);
}

/** Mana Potion: refills your mana (for class abilities). */
export function drinkMana(run: Run): string | null {
  const h = run.hero;
  if (run.scene.t !== "combat" || run.scene.battle.over || h.f.hp <= 0) return "Mana Potions only work in a fight.";
  if (h.manaPotions <= 0) return null;
  if (isParched(h)) return "🏜️ Parched: the potion turns to dust on your tongue. You can't drink potions.";
  if ((h.f.mana ?? 0) >= (h.f.maxMana ?? 0)) return "Your mana is already full.";
  h.manaPotions--;
  h.f.mana = h.f.maxMana;
  actionToll(run.scene.battle, h.f);
  run.scene.battle.fx.push({ who: "player", kind: "text", text: "Mana refilled!", icon: "🔷" });
  run.scene.battle.log.push("🔷 You drink a Mana Potion: your mana is full again.");
  return null;
}

/** Cleansing Potion: removes your worst negative status (the one with the most stacks). Uses your action, like any potion. */
export function drinkCleanse(run: Run): string | null {
  const h = run.hero;
  if (run.scene.t !== "combat" || run.scene.battle.over || h.f.hp <= 0) return "Cleansing Potions only work in a fight.";
  if ((h.cleansePotions ?? 0) <= 0) return null;
  if (isParched(h)) return "🏜️ Parched: the potion turns to dust on your tongue. You can't drink potions.";
  const bad = Object.entries(h.f.statuses).filter(([id, n]) => (n ?? 0) > 0 && isNegative(id as StatusId)).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
  if (!bad.length) return "Nothing to cleanse: no negative status on you.";
  const [id] = bad[0];
  h.cleansePotions = (h.cleansePotions ?? 0) - 1;
  delete h.f.statuses[id as StatusId];
  actionToll(run.scene.battle, h.f);
  const name = STATUS_INFO[id as StatusId]?.name ?? id;
  run.scene.battle.fx.push({ who: "player", kind: "text", text: `${name} washed away!`, icon: "🫧" });
  run.scene.battle.log.push(`🫧 You drink a Cleansing Potion: your ${name} is gone.`);
  return null;
}

// ---------- Extraction ----------

/** The Obsidian Chest goes on a free floor tile close to where you start (as close as can be, never on top of you). */
function placeObsidian(m: FloorMap) {
  const busy = new Set(m.things.map(t => idx(m, t.x, t.y)));
  // (Walkable from where you stand, so it's never sealed off behind a wall.)
  const canReach = reachable(m, m.px, m.py, busy);
  let best = -1, bestD = Infinity;
  for (let i = 0; i < m.tiles.length; i++) {
    if (m.tiles[i] !== 1 || busy.has(i) || !canReach[i]) continue;
    const x = i % m.w, y = Math.floor(i / m.w), d = Math.abs(x - m.px) + Math.abs(y - m.py);
    if (d >= 2 && d < bestD) { best = i; bestD = d; }
  }
  if (best >= 0) m.things.push({ x: best % m.w, y: Math.floor(best / m.w), room: "obsidian" });
}

/** You can climb out at any trapdoor below the Entrance (and from the boss's treasure room), in the Crawl's campaign:
 *  not in Drills, the Daily Dungeon or the Abyss. */
export function canExtract(run: Run): boolean {
  const m = run.grid;
  return !!m && !!run.gridMode && run.mode === "campaign" && !run.drill && !run.daily && (m.depth >= 1 || m.depth === TREASURE_DEPTH);
}
/** After a layer's boss, heading back to the Camp is climbing out too: the haul, and an item to seal. */
export function retireToExtract(run: Run): boolean {
  if (run.scene.t !== "cleared" || !canExtract(run)) return false;
  run.scene = { t: "extract", pick: true, fromCleared: { floor: run.scene.floor, boss: run.scene.boss } };
  return true;
}
/** Floors reached this run (every layer counts its floors; the boss's treasure room counts as the bottom). */
export function floorsReached(run: Run): number {
  const m = run.grid, lf = layerFloors(run);
  const d = !m ? 0 : m.depth === TREASURE_DEPTH ? lf : Math.min(m.depth, lf);
  return (run.floor - 1) * lf + d;
}
/** What climbing out pays: a Camp material per floor reached, a Crown Shard for every four. */
export function extractionHaul(run: Run, floors = floorsReached(run)) {
  return { mats: floors, crowns: Math.floor(floors / 4), floors };
}
/** Climb out: the run ends as a success, the haul goes to the Camp, and one item you carry (or none) is sealed for next time. */
/** What you take with you when you climb out: one thing only. Gear, potions and gold wait in the next run's Obsidian Chest;
 *  the pouch (every Camp material and seed of the run, and the climb's own haul) goes to a chest in the Camp's Garden. */
export type ClimbPick = { item: number } | { potions: true } | { gold: true } | { pouch: true } | null;
export function climbOut(run: Run, pick: ClimbPick): string | null {
  if (run.scene.t !== "extract" || !canExtract(run)) return "You can't climb out from here.";
  const haul = extractionHaul(run);
  const h = run.hero;
  // The climb's own haul: materials (into the pouch), Crown Shards (always home).
  const keys = Object.keys(MATS) as Mat[];
  for (let k = 0; k < haul.mats; k++) campGain(run, keys[Math.floor(run.rng() * keys.length)], 1);
  if (haul.crowns) campGain(run, null, 0, haul.crowns);
  const seal: ObsidianSeal = {};
  if (pick && "item" in pick) { const it = [...Object.values(h.equip), ...h.backpack].find(i => i?.uid === pick.item); if (it) seal.item = structuredClone(it); }
  if (pick && "potions" in pick) seal.potions = { heal: h.potions, mana: h.manaPotions, cleanse: h.cleansePotions ?? 0 };
  if (pick && "gold" in pick) seal.gold = h.f.gold;
  run.extracted = { ...haul, seal: Object.keys(seal).length ? seal : undefined, pouch: !!(pick && "pouch" in pick) };
  run.retired = true;
  run.popup = undefined;
  run.scene = { t: "over", won: false };
  return null;
}
/** The Obsidian Chest's contents: one sealed thing (an item, your potions, or your gold). */
export interface ObsidianSeal { item?: GearItem; gold?: number; potions?: { heal: number; mana: number; cleanse: number } }
/** Not yet: step back off the trapdoor and keep exploring. */
export function stayOnFloor(run: Run) {
  const m = run.grid;
  if (run.scene.t !== "extract" || !m) return;
  if (m.bx !== undefined && m.by !== undefined) { m.px = m.bx; m.py = m.by; }
  run.scene = { t: "map" };
}
/** Drop through the trapdoor after all. */
export function dropDeeper(run: Run) {
  if (run.scene.t !== "extract") return;
  run.scene = { t: "map" };
  descend(run);
}

/** How often a drop brings a Shuffler instead of a Face Rune. */
export const SHUFFLE_GIFT_CHANCE = 0.3;
/** The gift for your die on a drop: one Face Rune (never one that's already at its highest rank on that face), or one Shuffler. */
export function rollDescentGift(run: Run) {
  run.runeOffer = undefined;
  run.shuffleOffer = undefined;
  if (run.rng() < SHUFFLE_GIFT_CHANCE) { run.shuffleOffer = rollShuffleOffer(run).slice(0, 1); return; }
  for (let k = 0; k < 8; k++) {
    const o = rollRuneOffer(run).find(x => { const cur = run.hero.runes?.[x.face]; return !(cur && cur.id === x.id && cur.rank >= RUNE_MAX_RANK); });
    if (o) { run.runeOffer = [o]; return; }
  }
}
/** Three Face Runes to choose from: three different runes, each on a face of the die (a face whose rune can rank up turns up now and then). */
export function rollRuneOffer(run: Run): { id: string; face: number }[] {
  const h = run.hero, ids = RUNES.map(r => r.id);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(run.rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids.slice(0, 3).map(id => {
    const carved = Object.entries(h.runes ?? {}).find(([, v]) => v.id === id && v.rank < RUNE_MAX_RANK);
    const face = carved && run.rng() < 0.5 ? Number(carved[0]) : 1 + Math.floor(run.rng() * 6);
    return { id, face };
  });
}
/** Two Shufflers to choose from (never the one you already have). */
export function rollShuffleOffer(run: Run): string[] {
  const ids = SHUFFLERS.map(x => x.id).filter(id => id !== run.hero.shuffle);
  for (let i = ids.length - 1; i > 0; i--) { const j = Math.floor(run.rng() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
  return ids.slice(0, 2);
}
/** Take a Shuffler instead of a rune (it replaces any Shuffler you had). */
export function takeShuffle(run: Run, id: string): string | null {
  if (!run.shuffleOffer?.includes(id)) return null;
  run.runeOffer = undefined;
  run.shuffleOffer = undefined;
  run.hero.shuffle = id;
  recompute(run.hero);
  const sh = SHUFFLER_MAP.get(id)!;
  return `${sh.icon} ${sh.name}: ${sh.text}${run.hero.f.faces.length !== 6 ? " (Your die isn't six-sided: it waits until you hold one that is.)" : ""}`;
}
/** Carve the chosen rune into its face (the same rune there ranks up; another rune there is replaced). Null: no choice. */
export function takeRune(run: Run, i: number | null): string | null {
  const offer = run.runeOffer;
  run.runeOffer = undefined;
  run.shuffleOffer = undefined;
  if (!offer || i === null) return null;
  const pick = offer[i];
  if (!pick) return null;
  const h = run.hero, runes = (h.runes ??= {});
  const cur = runes[pick.face];
  const info = RUNE_MAP.get(pick.id)!;
  if (cur && cur.id === pick.id) cur.rank = Math.min(RUNE_MAX_RANK, cur.rank + 1);
  else runes[pick.face] = { id: pick.id, rank: 1 };
  recompute(h);
  const rk = runes[pick.face].rank;
  return `${info.icon} ${info.name} Rune${rk > 1 ? ` ${NUMERALS[rk]}` : ""} carved into your ${pick.face}s.`;
}

/** Take the Keepsake on offer (you can only hold one: it replaces yours). */
export function takeKeepsake(run: Run): string | null {
  const s = run.scene;
  if (s.t !== "pick" || !s.keepsake) return null;
  const h = run.hero;
  const old = h.keepsake;
  h.keepsake = s.keepsake;
  run.found.add(s.keepsake);
  s.keepsake = undefined;
  recompute(h);
  return old ? `You set down ${getItem(old).name}.` : null;
}

export const isParched = (h: Hero) => (h.curses["c_parched"] ?? 0) > 0 || (h.f.items["c_parched"] ?? 0) > 0;

export function drinkPotion(run: Run): string | null {
  const h = run.hero;
  // The dead don't drink: no potions once you've fallen or the run is over.
  if (h.potions <= 0 || h.f.hp <= 0 || run.scene.t === "over") return null;
  if (run.scene.t === "combat" && run.scene.battle.over) return null;
  if (isParched(h)) return "🏜️ Parched: the potion turns to dust on your tongue. You can't drink potions.";
  const inFight = run.scene.t === "combat";
  const drunk = h.f.flags["potionsDrunk"] ?? 0;
  if (inFight && drunk >= potionsPerFight(h)) return `You've already drunk ${potionsPerFight(h)} potions this fight.`;
  // Chalice of Plenty: the first potion each fight isn't used up.
  const free = inFight && drunk === 0 && (h.f.items["lo_chalice_plenty"] ?? 0) > 0;
  if (!free) h.potions--;
  h.f.persist["potFloor"] = 1;
  if (inFight) h.f.flags["potionsDrunk"] = drunk + 1;
  // Healing is scarce in the Crawl: a potion heals less there.
  let amount = h.f.items["l_bottomless"] ? Math.ceil(h.f.maxHp / 2) : run.gridMode ? CRAWL_POTION_HEAL : 12;
  // The Lovers make a potion go further; the Star's bane makes it go less far.
  amount = Math.max(1, Math.round(amount * (1 + 0.5 * tarotOf(h, "lovers").boon) * (1 - 0.2 * tarotOf(h, "star").bane)));
  if (h.f.items["pc_apothecary_ring"]) amount += 4;
  if (h.f.items["pc_spare_vial"]) amount += 3;
  if (h.f.items["pc_alchemist_coat"]) amount = Math.round(amount * 1.25);
  if (h.f.items["la_flaskwarden"]) amount *= 2;
  if (h.f.items["c_famine"]) amount = Math.ceil(amount / 2);
  if (abyssMod(run, "deep_flasks")) amount *= 2;
  h.f.persist["potsDrunk"] = (h.f.persist["potsDrunk"] ?? 0) + 1;
  if (run.scene.t === "combat") {
    const b = run.scene.battle;
    actionToll(b, h.f);
    const got = healF(b, h.f, amount, free ? "Potion — the Chalice refills" : "Potion");
    if (h.f.items["pc_brewmaster_mail"]) applyStatus(b, h.f, h.f, "barrier", Math.max(1, got || amount));
    if (h.f.items["pc_brewers_buckler"]) applyStatus(b, h.f, h.f, "ward", 1);
  }
  else restore(h, amount);
  return null;
}

function afterFight(run: Run) {
  if (run.scene.t !== "combat") return;
  const { battle: b, rank, then } = run.scene;
  const h = run.hero;
  // Something that hit you after the foe fell (a dying blast, a toll) can still put you down: at 0 HP the fight is lost.
  if (b.over === "won" && h.f.hp <= 0) { b.over = "lost"; b.log.push(`${h.f.name} falls.`); }
  // Stoutroot Stew lasts only the fight.
  if (h.f.flags["stout"]) { h.f.maxHp = Math.max(1, h.f.maxHp - h.f.flags["stout"]); h.f.hp = Math.min(h.f.hp, h.f.maxHp); h.f.flags["stout"] = 0; }
  // Curse-Eaters: curses devoured mid-fight are gone for good.
  let eaten = 0;
  for (const k of Object.keys(h.f.persist)) {
    if (!k.startsWith("eat_")) continue;
    const id = k.slice(4);
    const n = h.f.persist[k];
    delete h.f.persist[k];
    if (h.curses[id]) { h.curses[id] = Math.max(0, h.curses[id] - n); if (!h.curses[id]) delete h.curses[id]; eaten += n; }
  }
  if (eaten) recompute(h);
  const curseNote = applyQueuedCurses(run);
  // Heat 2+: Gold picked up mid-fight (item effects) is cut too.
  const g0 = h.f.persist["goldAtFight"];
  if (g0 !== undefined && h.f.gold > g0 && goldMult(run) < 1) h.f.gold = g0 + Math.floor((h.f.gold - g0) * goldMult(run));
  // The Angelic Blessing lasts 2 fights.
  if ((h.f.persist["angelFights"] ?? 0) > 0) {
    h.f.persist["angelFights"]--;
    if (h.f.persist["angelFights"] === 0) run.message = "👼 The Angelic Blessing fades.";
  }
  // A Dragon's Blessing lasts 5 fights.
  if ((h.f.persist["blessFights"] ?? 0) > 0) {
    h.f.persist["blessFights"]--;
    if (h.f.persist["blessFights"] === 0) { delete h.f.persist["blessKind"]; run.message = "🐲 The Dragon's Blessing fades."; }
  }
  // The Hall's Second Life: once a run, you get back up at half your Max HP (the foe is gone; a boss must be faced again).
  if (b.over === "lost" && run.gridMode && (h.f.persist["secondLife"] ?? 0) > 0) {
    h.f.persist["secondLife"] = 0;
    h.f.hp = Math.ceil(h.f.maxHp / 2);
    run.popup = { icon: "💫", title: "Second Life", text: "Everything goes dark... and then, somehow, you breathe again. You get back up, at half your strength. It won't happen twice." };
    if (rank === "boss") { run.scene = { t: "map" }; return enterRoom(run, "boss"); }
    run.message = "💫 Second Life: you get back up.";
    return advance(run);
  }
  if (b.over === "lost") {
    const p = h.f.persist;
    if ((b.player.flags["hits"] ?? 0) === 1) p["ach_one_hit"] = 1;
    if (b.enemy.hp >= b.enemy.maxHp) p["ach_no_dmg_death"] = 1;
    if (run.floor === 1 && rank === "boss" && !then) p["ach_f1_boss_death"] = 1;
    // Dying anywhere ends the run, Crimson Vaults included. Remember who did it.
    const e = b.enemy;
    run.killer = {
      name: e.name, title: e.title, family: e.family, rank: e.boss ? "Boss" : e.champion ? "Champion" : e.elite ? "Elite" : "",
      hp: Math.max(0, e.hp), maxHp: e.maxHp, damage: e.damage, armor: e.armor, crimson: e.crimson,
      traits: Object.keys(e.items).map(id => getItem(id).name), traitIds: Object.keys(e.items), nemesis: then === "nemesis" || undefined,
      statuses: Object.entries(e.statuses).filter(([, n]) => (n ?? 0) > 0) as [string, number][]
    };
    run.scene = { t: "over", won: false };
    return;
  }
  if (b.over === "fled") {
    // The Crawl: the foe stays where it stood, healed back to full; you're back on the tile you came from.
    const m = run.gridMode ? run.grid : undefined;
    if (m && m.last !== undefined && m.things[m.last]) {
      m.things[m.last].done = false;
      m.explored = Math.max(0, m.explored - 1);
      if (m.bx !== undefined && m.by !== undefined) { m.px = m.bx; m.py = m.by; }
      look(m);
      run.message = [`You get away. The ${b.enemy.name} stays where it was, and its wounds are already closing.`, curseNote].filter(Boolean).join(" ");
    } else run.message = curseNote;
    return advance(run);
  }
  // Transformation: after a long run of plain monster fights, a beaten monster can rise again as a Champion.
  if (b.over === "won" && rank === "normal" && !then && !b.enemy.items["m_thief"] && rollTransformation(run)) {
    const base = b.enemy.name;
    run.popup = { icon: "🧬", title: "It's not over…", text: `The ${base}'s corpse convulses. Bones crack and flesh splits as it rises again, bigger and angrier — a Champion! There's no time to catch your breath.` + (curseNote ? ` ${curseNote}` : "") };
    run.stats.kills++;
    return fight(run, "champion", "transformed", base);
  }
  if (b.over === "escaped") {
    run.message = (then === "goblin" ? "💨 The Treasure Goblin cackles and vanishes, hoard and all." : `${b.enemy.name} got away with your Gold.`) + (curseNote ? ` ${curseNote}` : "");
    return advance(run);
  }
  run.carry = b.carry;
  run.stats.kills++;
  // Bounty Board counters.
  const bump = (k: string) => { h.f.persist[k] = (h.f.persist[k] ?? 0) + 1; };
  bump("q_kills");
  if (rank === "elite" || rank === "crimson") bump("q_elites");
  if (rank === "champion") bump("q_champions");
  if (!b.player.flags["hurt"]) bump("q_flawless");
  if (b.round <= 3) bump("q_quick");
  // Forge Golems leave Scrap behind (more from Elite and Champion golems).
  let golemScrap = 0;
  if ((b.enemy.items["m_forge"] ?? 0) > 0) {
    golemScrap = ({ normal: 4, elite: 8, champion: 14, crimson: 14, boss: 14 } as Record<string, number>)[rank] + run.floor;
    h.scrap += golemScrap;
  }
  // Caught a thief: it coughs up 60% of what you're carrying, on top.
  let thiefPay = 0;
  if ((b.enemy.items["m_thief"] ?? 0) > 0) {
    thiefPay = Math.floor(h.f.gold * 0.6 * goldMult(run));
    h.f.gold += thiefPay;
  }
  // Achievement marks.
  if (h.f.hp > 0 && h.f.hp < h.f.maxHp * 0.1) bump("ach_low_hp_win");
  if (then === "dragon") bump("ach_dragon");
  if (rank === "champion" && run.floor === 1) bump("ach_champ1");
  if (then === "goblin") bump("ach_goblin");
  if (rank === "boss" && !b.player.flags["hurt"]) bump("ach_flawless_boss");
  if ((b.enemy.items["m_death"] ?? 0) > 0) bump("ach_death");
  if (rank === "boss") {
    run.stats.bosses++;
    if (then !== "crimson") run.lastBoss = b.enemy.name;
    h.f.persist["bossKills"] = (h.f.persist["bossKills"] ?? 0) + 1;
  }
  // Catch your breath: a small heal after every won fight (not in the Crawl: there, healing comes from potions, campfires and relics).
  if (!run.gridMode) restore(h, Math.ceil(h.f.maxHp * 0.15));
  // (Crawl monsters give a little less than an Elite's share: one or two.)
  const xp = { normal: run.gridMode ? (run.rng() < 0.5 ? 1 : 2) : 1, elite: 3, champion: 5, crimson: 7, boss: b.enemy.crimson ? 9 : 6 }[rank];
  gainXp(run, Math.round(xp * (1 + 0.15 * tarotOf(h, "chariot").boon)));
  // Death: a foe beaten within three rounds adds a Reaping (each: Rare-or-better finds a little likelier).
  const death = tarotOf(h, "death");
  if (death.on && b.round <= 3) h.f.persist["reaping"] = Math.min(Math.round(10 * death.boon), (h.f.persist["reaping"] ?? 0) + 1);
  // In the Crawl, foes only give XP (bosses still pay out, in their treasure room).
  const crawlFoe = run.gridMode && rank !== "boss" && (!then || then === "transformed" || then === "resplendent");
  // The Bestiary: every kind of foe beaten in the Crawl (and the toughest one of each seen).
  if (run.gridMode) {
    const e = b.enemy, k = ((run.kills ??= {})[e.name] ??= { n: 0, hp: 0, power: 0 });
    k.n++; k.hp = Math.max(k.hp, e.maxHp); k.power = Math.max(k.power, e.damage); k.family = e.family; if (rank === "boss") k.boss = true;
  }
  // Weapon mastery: every win in the Crawl teaches the weapon in your main hand.
  if (run.gridMode) for (const it of [h.equip.main, h.equip.off]) {
    // (The off-hand teaches only a shield: a second weapon learns nothing extra.)
    if (!it) continue;
    const fam = classify(effectiveBase(it)).family;
    if (it === h.equip.off && fam !== "shield") continue;
    if ((MASTERY_FAMILIES as string[]).includes(fam)) h.f.persist[`wmx_${fam}`] = (h.f.persist[`wmx_${fam}`] ?? 0) + (WM_XP[rank] ?? 1);
  }
  const gold = crawlFoe ? 0 : { normal: 4 + 2 * run.floor, elite: 10 + 3 * run.floor, champion: 20 + 4 * run.floor, crimson: 30 + 6 * run.floor, boss: (b.enemy.crimson ? 50 : 30) + 10 * run.floor }[rank] * (abyssMod(run, "golden_depths") ? 2 : 1) + relicBonus(h.relics, "gold");
  const items: GearItem[] = [];
  let scrolls = 0;
  let potions = 0;
  let relic: string | undefined;
  let keyFound = false;
  let keyNote = "";
  const T = tables(run);
  // Generated gear from tougher foes is more often Greater (✦) — or, very rarely, Overcharged.
  setGenLuck(genLuck(run) * ({ normal: 1, elite: 1.25, champion: 1.6, crimson: 2, boss: run.scene.uber ? 2.6 : 2 } as Record<string, number>)[rank] * (then === "unique" || then === "dragon" || then === "nemesis" ? 1.5 : 1));
  const roll = (odds: Partial<Record<Rarity, number>>) => dropItem(run, odds);
  if (!crawlFoe && rank === "normal" && run.rng() < (run.mode === "abyss" ? 0.2 : STANDARD_DROP)) items.push(roll(T.drop));
  if (!crawlFoe && rank === "normal" && run.rng() < 0.04) potions++;
  // Potion gear: a sober win brews a potion (the Alembic always, the Vial sometimes); the Grail refills one per boss.
  const sober = !b.player.flags["potionsDrunk"];
  if (sober && (h.f.items["lx_endless_alembic"] ?? 0) > 0) potions++;
  else if (sober && (h.f.items["pc_vial_of_plenty"] ?? 0) > 0 && run.rng() < 0.3) potions++;
  if (rank === "boss" && (h.f.items["pc_grail"] ?? 0) > 0) potions++;
  if (rank === "boss" && potions) gainPotions(h, potions); // (boss rewards come as a pick, not a loot screen)
  if (!crawlFoe && ((rank === "normal" && run.rng() < 0.03) || (rank === "elite" && run.rng() < 0.08))) {
    if (gainManaPotions(h, 1)) run.message = "You find a Mana Potion. 🔷";
  }
  let goblinGold = 0;
  let heartLevel = 0;
  let crucibleFound = false;
  if (then === "nemesis") {
    // The bounty on your Nemesis: a fat purse, an Epic (often a Legendary), a relic to choose and a scroll.
    run.nemesisBeaten = true;
    goblinGold = 40 + 15 * run.floor;
    items.push(rollItem(h, run.rng() < 0.3 ? "legendary" : "epic", depth(run), run.rng));
    relic = randomRelic(run, 2);
    scrolls++;
    run.message = `😈 Your Nemesis falls. It won't trouble you again — the bounty is yours.`;
  } else if (then === "dragon") {
    // The dragon's hoard: a big pile of Gold and Scrap; maybe a great relic, rarely an Epic or a Legendary.
    goblinGold = 80 + 25 * run.floor;
    h.scrap += 10 + 3 * run.floor;
    if (run.rng() < 0.2) relic = randomRelic(run, 2);
    if (run.rng() < 0.08) items.push(rollItem(h, "epic", depth(run), run.rng));
    if (run.rng() < 0.03) items.push(rollItem(h, "legendary", depth(run), run.rng));
    run.message = `🐉 The dragon's hoard: +${10 + 3 * run.floor} ⚙️ Scrap and a mountain of Gold.`;
    // Its heart: the first one is yours; every dragon after that makes it stronger.
    // (At most two hearts a run: the second one levels up the first.)
    if (!h.dragonHeart) { h.dragonHeart = { level: 1 }; heartLevel = 1; }
    else if (h.dragonHeart.level < MAX_DRAGON_HEARTS) heartLevel = ++h.dragonHeart.level;
  } else if (then === "goblin") {
    // Treasure Goblin: a guaranteed Rare and a fat purse, maybe an Epic, a Legendary or a scroll. All of it is yours.
    goblinGold = 25 + 8 * run.floor;
    items.push(rollItem(h, "rare", depth(run), run.rng));
    if (run.rng() < 0.45) items.push(rollItem(h, "epic", depth(run), run.rng));
    if (run.rng() < 0.1) items.push(rollItem(h, "legendary", depth(run), run.rng));
    if (run.rng() < 0.35) scrolls++;
    run.message = "💰 The Treasure Goblin bursts open. Everything it carried is yours.";
  } else if (then === "doppel") {
    // The Changeling: beating yourself is worth a Legendary, a purse and a scroll.
    items.push(rollItem(h, "legendary", depth(run), run.rng));
    goblinGold = 20 + 6 * run.floor;
    scrolls++;
    h.f.persist["ach_doppel"] = 1;
    run.message = "🎭 The Changeling comes apart like smoke. It leaves something of yours behind… no, better than yours.";
  } else if (then === "unique") {
    // Unique foes: always an Epic (sometimes a Legendary). (The 1st Layer's own: a Rare, often an Epic.)
    h.f.persist["uniquesBeaten"] = (h.f.persist["uniquesBeaten"] ?? 0) + 1;
    if (run.floor <= 1) items.push(rollItem(h, run.rng() < EARLY_UNIQUE_EPIC ? "epic" : "rare", depth(run), run.rng));
    else items.push(rollItem(h, run.rng() < 0.15 ? "legendary" : "epic", depth(run), run.rng));
    relic = randomRelic(run, 2);
    if (run.rng() < 0.3) scrolls++;
  } else if (rank === "elite" && crawlFoe) {
    // Crawl Elites now and then drop a weapon or a piece of armour; that's all (and, very rarely, a Skeleton Key).
    // (The Emperor: every Elite drops gear, one rarity better at II.)
    const emp = tarotOf(h, "emperor");
    // (The Elite Gauntlet, a Drill: the same as the Emperor at II.)
    const gaunt = run.drill === "gauntlet";
    if (emp.on || gaunt || run.rng() < CRAWL_ELITE_GEAR) items.push(crawlGear(run, emp.boon > 1 || gaunt ? T.champion : T.elite));
    if (run.rng() < SKELETON_KEY_DROP) { h.f.persist["skelKeys"] = (h.f.persist["skelKeys"] ?? 0) + 1; keyNote = "🗝️ It was carrying a Skeleton Key! Somewhere down here, a locked door."; }
  } else if (rank === "elite") {
    items.push(roll(T.elite));
    if (then === "mimic" && !run.gridMode) items.push(roll(T.elite));
    // The Moon: a Mimic's hoard holds a second, better item.
    if (then === "mimic" && run.gridMode && tarotOf(h, "moon").on) items.push(roll(T.champion));
    if (run.rng() < (abyssMod(run, "blood_moon") ? 0.7 : 0.35)) relic = randomRelic(run);
  }
  if (rank === "champion" && then !== "dragon") {
    if (!crawlFoe) items.push(roll(T.champion));
    else {
      // (Strength: every Champion drops gear, often Epic from II.)
      const str = tarotOf(h, "strength");
      if (str.on && str.boon > 1 && run.rng() < 0.5) items.push(rollItem(h, "epic", depth(run), run.rng));
      else if (str.on || h.omens?.["hunters"] || run.rng() < CRAWL_CHAMPION_GEAR) items.push(crawlGear(run, T.champion));
    }
    if (!crawlFoe && run.rng() < 0.2) scrolls++;
    const metal = run.rng() < 0.65 ? 1 + (run.rng() < 0.25 ? 1 : 0) : 0;
    if (metal) {
      h.starmetal += metal;
      run.message = `The Champion leaves ${metal} Starmetal behind.`;
    }
    // The Transmuter's Crucible: a rare artefact some Champions carry (once per run).
    if (!crawlFoe) relic = relic ?? randomRelic(run, 2);
  }
  if (rank === "crimson") {
    items.push(roll(T.crimson));
    relic = randomRelic(run, 2);
    if (run.rng() < 0.5) {
      h.crimsonKeys++;
      keyFound = true;
    } else run.message = "No key this time. Crimson Elites carry one about half the time.";
  }
  if (rank === "boss") {
    relic = randomRelic(run, 2);
    // The Transmuter's Crucible: yours once you've beaten the Campaign's fifth boss.
    if (!h.crucible && !run.gridMode && run.mode !== "abyss" && run.floor >= FLOORS && !b.enemy.crimson) {
      h.crucible = true;
      crucibleFound = true;
      run.popup = { icon: "⚗️", title: "The Transmuter's Crucible", text: "Among the Hollow King's things: a crucible that hums when you hold it. At any Forge, it turns a Common item and 4 Starmetal into a Legendary of the same kind." };
    }
    if (run.rng() < 0.15) scrolls++;
    const bossGold = Math.round(gold * goldMult(run));
    h.f.gold += bossGold;
    if (!run.gridMode) restore(h, Math.round(h.f.maxHp * 0.3));
    if (run.gridMode) relic = undefined; // (No relics in the dungeon: their effects live in the Passive Tree.)
    if (relic) offerRelic(run, relic, 1);
    grantScrolls(run, scrolls);
    recompute(h);
    const ruinNote = "";
    // THE END: nothing left to fight. The run is won, and there's a cookie.
    if ((b.enemy.items["m_the_end"] ?? 0) > 0) {
      const cookie = makeRewardItem(h, "lc_cookie", run.floor);
      h.backpack.push(cookie);
      markFound(run, cookie);
      run.popup = { icon: "🍪", title: "THE END HAS ENDED", text: "THEN THE PLAYER WEPT, FOR HE HAD NO MORE FOES LEFT TO CONQUER", fanfare: "legendary_crimson" };
      run.scene = { t: "over", won: true };
      run.finale = true;
      return;
    }
    // DEATH: its scythe is the only reward.
    if ((b.enemy.items["m_death"] ?? 0) > 0) {
      run.popup = { icon: "☠️", title: "DEATH IS DEAD", text: "Its scythe falls from bony fingers. Nothing in the dark will ever frighten you again.", fanfare: "legendary_crimson" };
      run.scene = { t: "pick", title: "DEATH falls. Its scythe is yours", items: [makeRewardItem(h, "lc_abaddon", run.floor)] };
      run.message = `+${bossGold} Gold${ruinNote}`;
      return;
    }
    // (Sigils belong to the old Campaign: the Crawl has no Talisman.)
    const bossSigil = run.gridMode ? null : rollSigilDrop(run, 0.4, 0.65);
    // Crimson bosses offer a Crimson item alongside two boss finds; the bosses of floors 20–24 offer an Epic Crimson.
    // The Tower: Epics and Legendaries far likelier from a layer boss, and a second item in its hoard.
    const tower = tarotOf(h, "tower");
    const tw = (o: Partial<Record<Rarity, number>>) => (!tower.on ? o : { ...o, epic: (o.epic ?? 0) * (1 + 0.5 * tower.boon), legendary: (o.legendary ?? 0) * (1 + 0.5 * tower.boon) });
    const bo = tw(run.scene.uber ? T.uber : run.gridMode || run.mode === "abyss" ? T.boss : bossOdds(run.floor));
    const offer = b.enemy.crimson ? [rollItem(h, "crimson", depth(run), run.rng), roll(bo), roll(bo)]
      : EPIC_CRIMSON_FLOORS.includes(run.floor) ? [rollEpicCrimson(h, depth(run), run.rng), roll(bo), roll(bo)]
      : run.gridMode ? [run.legendaryDue ? rollItem(h, "legendary", depth(run), run.rng) : roll(bo), ...(tower.on ? [roll(bo)] : [])]
      : [run.legendaryDue ? rollItem(h, "legendary", depth(run), run.rng) : roll(bo), roll(bo), roll(bo), ...(tower.on ? [roll(bo)] : [])];
    run.legendaryDue = false;
    // The Crawl: the boss's hoard holds one item (a choice of two with the Tower).
    if (run.gridMode) { offer.sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)); offer.length = tower.on ? 2 : 1; }
    // After the fifth boss, bosses sometimes leave a Keepsake behind.
    // Keepsakes are a rare find: about one boss in ten after floor 5 leaves one behind.
    const keepsake = run.floor > FLOORS && run.rng() < 0.1 ? KEEPSAKES.filter(k => k.id !== h.keepsake)[Math.floor(run.rng() * (KEEPSAKES.length - (h.keepsake ? 1 : 0)))]?.id : undefined;
    run.scene = { t: "pick", title: run.gridMode ? `${b.enemy.name}'s hoard` : `${b.enemy.name} falls! Choose one`, items: offer, keepsake, sigils: bossSigil ? [bossSigil] : undefined };
    run.message = `+${bossGold} Gold${run.relicChoice ? " · a relic to choose" : relic ? ` · relic: ${getItem(relic).name}` : ""}${ruinNote}${run.gridMode ? "" : " · healed 30%"}${curseNote ? ` ${curseNote}` : ""}`;
    // The Crawl: the rest of the boss's hoard waits in a chest in its treasure room, beside the way down.
    if (run.gridMode && !then) {
      // Crown Shards for the Camp's Hall (more from deeper layers), and a handful of its family's material.
      // (Drills give the Camp nothing.)
      if (!run.drill) {
        const crowns = 1 + Math.floor((run.floor - 1) / 2);
        campGain(run, null, 0, crowns, 1);
        const bm = matOfFamily(b.enemy.family);
        if (bm) campGain(run, bm, 3);
        run.message = `👑 +${crowns} Crown Shard${crowns === 1 ? "" : "s"} · 📜 a Scroll of Knowledge${bm ? ` · +3 ${MATS[bm].icon} ${MATS[bm].name}` : ""}. ${run.message}`;
      }
      // Layers this class has beaten (it unlocks other classes, and more of this class's loot).
      if (run.mode !== "abyss") {
        const was = h.f.persist["layersWon"] ?? 0;
        h.f.persist["layersWon"] = Math.max(was, run.floor);
        const joins = run.floor === 1 && h.origin === "mage" ? "Cleric" : run.floor === 1 && h.origin === "warrior" ? "Rogue" : null;
        if (joins && (h.f.persist["classLayers"] ?? 0) < 1) run.popup = { icon: "🍺", title: `The ${joins} will be waiting`, text: `Word of your win travels up through the dark. When this run is over, a ${joins} will be sitting in the Tavern, ready to join you.` };
      }
      run.bossChest = run.scene;
      run.grid = makeTreasure(run);
      run.scene = { t: "map" };
      run.message = `👑 ${b.enemy.name} falls. Beyond it, a small chamber: its hoard, and a hole leading deeper. ${run.message}`;
    }
    return;
  }
  // The Crawl: a beaten foe sometimes leaves materials behind (Scrap; Elites and Champions a little more).
  let mats = "";
  if (crawlFoe) {
    const n = rank === "normal" ? (run.rng() < 0.3 ? 1 + Math.floor(run.rng() * 2) : 0) : rank === "elite" ? (run.rng() < 0.55 ? 2 + Math.floor(run.rng() * 3) : 0) : 3 + Math.floor(run.rng() * 3);
    if (n) { h.scrap += n; mats = `+${n} ⚙️ Scrap`; }
    if (rank !== "normal" && run.rng() < 0.15) { h.azure = (h.azure ?? 0) + 1; mats += `${mats ? " · " : ""}+1 💠 Azure`; }
    // Camp materials, by the foe's family: Bone Dust from the Undead, Hide from Beasts, Cogs from Constructs, Sigils from Cultists.
    const cm = matOfFamily(b.enemy.family);
    // (The Empress: materials more often, and a little more of them.)
    const emp = 1 + 0.6 * tarotOf(h, "empress").boon;
    // (Hide, Bone Dust and Cult Sigils come off common foes, so they drop less often than Cogs.)
    const often = cm === "hide" || cm === "bone" || cm === "sigil";
    const od = often ? MAT_DROP.often : MAT_DROP.rare;
    const cn = (!cm ? 0 : rank === "normal" ? (run.rng() < Math.min(0.9, od.normal * emp) ? 1 : 0) : rank === "elite" ? (run.rng() < Math.min(0.95, od.elite * emp) ? 1 + (run.rng() < od.eliteTwo ? 1 : 0) : 0) : od.champ + Math.floor(run.rng() * 2))
      + (cm && emp > 1 && run.rng() < (emp - 1) / 2 ? 1 : 0);
    if (cm && cn && !run.drill) { campGain(run, cm, cn); mats += `${mats ? " · " : ""}+${cn} ${MATS[cm].icon} ${MATS[cm].name}`; }
    // Scrolls of Knowledge, for the Camp's Knowledge Table: Champions sometimes carry one.
    if (rank === "champion" && !run.drill && run.rng() < 0.25) { campGain(run, null, 0, 0, 1); mats += `${mats ? " · " : ""}+1 📜 Scroll of Knowledge`; }
    if (run.rng() < (rank === "champion" ? CHAMPION_CLEANSE : rank === "elite" ? ELITE_CLEANSE : 0) && gainCleansePotions(h, 1)) mats += `${mats ? " · " : ""}🫧 Cleansing Potion`;
    // Seeds for the Camp's Garden: only Champions carry them, and not often.
    if (!run.drill && run.rng() < (rank === "champion" ? CHAMPION_SEED : rank === "elite" ? ELITE_SEED : b.enemy.family === "Beast" ? BEAST_SEED : 0)) { const pl = seedDrop(run); mats += `${mats ? " · " : ""}${PLANTS[pl].seedIcon} ${PLANTS[pl].seed}`; }
  }
  // Relics are yours the moment the fight ends (and get a popup), not when you leave the loot screen.
  if (run.gridMode) relic = undefined;
  if (relic) offerRelic(run, relic, rank === "elite" && !then ? 0.25 : 0.5, rank === "elite" && !then ? 1 : 2);
  // Talisman sigils: plain ones from Elites, set pieces mostly from Champions and up.
  const sigil = crawlFoe ? null : rollSigilDrop(run, ({ normal: 0, elite: 0.18, champion: 0.3, crimson: 0.35, boss: 0.4 } as Record<string, number>)[rank] ?? 0, rank === "elite" && !then ? 0.12 : 0.6);
  if (scrolls) grantScrolls(run, scrolls);
  // The Crawl: one item per drop, always (the best of what it would have left).
  if (run.gridMode && items.length > 1) { items.sort((a, b) => RARITIES.indexOf(b.rarity) - RARITIES.indexOf(a.rarity)); items.length = then === "mimic" && tarotOf(h, "moon").on ? 2 : 1; }
  // Nothing to pick up: straight back to the floor.
  if (crawlFoe && !items.length && !potions && !keyFound && !relic && then !== "resplendent") {
    run.message = [`Victory: +${xp} XP${mats ? ` · ${mats}` : ""}.`, golemScrap ? `The golem breaks apart: +${golemScrap} ⚙️ Scrap.` : "", curseNote, keyNote].filter(Boolean).join(" ");
    return advance(run);
  }
  if (mats || keyNote) run.message = [run.message, mats, keyNote].filter(Boolean).join(" ");
  run.scene = { t: "loot", title: then === "dragon" ? "The Dragon's Hoard" : then === "goblin" ? "The Treasure Goblin's hoard" : then === "mimic" ? "The Mimic's hoard" : thiefPay ? `You caught the ${b.enemy.name}!` : "Victory", items, gold: gold + goblinGold, scrolls, relic: run.relicChoice ? undefined : relic, potions, then: then === "resplendent" ? "resplendent" : undefined, crimsonKey: keyFound || undefined, dragonHeart: heartLevel || undefined, crucible: crucibleFound || undefined, sigils: sigil ? [sigil] : undefined };
  const notes = [run.message, thiefPay ? `It drops its stash: +${thiefPay} Gold (60% of your purse).` : "", golemScrap ? `The golem breaks apart: +${golemScrap} ⚙️ Scrap.` : "", curseNote].filter(Boolean);
  run.message = notes.join(" ");
}

/** Curses laid on you mid-fight (Accursed Elites, Malediction) land when the fight ends. */
function applyQueuedCurses(run: Run): string {
  const h = run.hero;
  const n = h.f.persist["curseQueue"] ?? 0;
  const parched = (h.f.persist["parchQueue"] ?? 0) > 0;
  if (!n && !parched) return "";
  h.f.persist["curseQueue"] = 0;
  h.f.persist["parchQueue"] = 0;
  const names: string[] = [];
  if (parched && !h.curses["c_parched"]) { h.curses["c_parched"] = 1; names.push("Parched (You can't drink Healing or Mana Potions)"); }
  for (let i = 0; i < n; i++) {
    const c = CURSES[Math.floor(run.rng() * CURSES.length)];
    h.curses[c.id] = (h.curses[c.id] ?? 0) + 1;
    names.push(`${c.name} (${c.text})`);
  }
  recompute(h);
  return names.length ? `🕯️ You are cursed: ${names.join(", ")}. Only something holy can lift it.` : "";
}

/** How likely each relic rarity is at this depth. Good relics come later; Legendary relics only from floor 3. */
export function relicRarityWeight(rarity: string, floor: number, quality = 1): number {
  switch (rarity) {
    case "common": return 1;
    case "uncommon": return Math.min(1, 0.35 + 0.15 * (floor - 1));
    // Good relics were a little too easy to come by: Rare and Legendary relics are 20% rarer than before.
    case "rare": return 0.8 * Math.min(0.6, [0.03, 0.12, 0.25, 0.35, 0.45][floor - 1] ?? 0.6) * (quality > 1 ? 2 : 1);
    case "legendary": return floor < 3 ? 0 : 0.8 * Math.min(0.15, 0.02 + 0.03 * (floor - 3)) * (quality > 1 ? 3 : 1);
    default: return 0.5;
  }
}

/** Roll a relic. `quality` > 1 for bosses and Champions (better odds of Rare and Legendary). */
/** Burn and Smoulder relics are strong: they turn up a little less often. */
const fireRelicWeight = (r: { tags: readonly string[]; text: string }) => (r.tags.includes("Burn") || /smoulder/i.test(r.text) ? 0.8 : 1);
export function randomRelic(run: Run, quality = 1): string {
  const tags = heroTags(run.hero);
  const pool = RELICS.filter(r => !isLocked(r.id) && (!r.forClass || r.forClass === run.hero.origin));
  const w = pool.map(r => relicRarityWeight(r.rarity ?? "common", run.floor, quality) * (1 + 0.3 * r.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)) * fireRelicWeight(r) * drawWeight(r));
  let x = run.rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    x -= w[i];
    if (x < 0) return pool[i].id;
  }
  return pool[0].id;
}

/** A level-up heals this share of Max HP. */
export const LEVEL_HEAL = 0.2;
export function gainXp(run: Run, n: number) {
  const h = run.hero;
  // (Sage's Tea, from the Brewery.)
  if ((h.f.persist["draught_sage"] ?? 0) > 0) n = Math.round(n * 1.5);
  h.xp += n;
  while (h.xp >= xpToLevel(h.level)) {
    h.xp -= xpToLevel(h.level);
    h.level++;
    // Gear you were waiting to grow into is yours now: its level lock goes.
    for (const it of [...Object.values(h.equip), ...h.backpack]) if (it?.reqLevel && h.level >= it.reqLevel) delete it.reqLevel;
    // Every level-up heals a little: a fifth of Max HP (healing curses still apply).
    const healed = restore(h, Math.round(h.f.maxHp * LEVEL_HEAL));
    // The Crawl: attribute points instead of talents.
    if (run.gridMode) {
      // A level changes nothing by itself: it's the points you spend that make you stronger.
      h.attrPoints = (h.attrPoints ?? 0) + ATTR_PER_LEVEL * (run.drill === "silent" ? 2 : 1);
      const skillNow = h.level >= SKILL_LEVEL && !h.skill && !!h.path && run.drill !== "silent";
      run.popup = skillNow
        ? { icon: PATH_MAP.get(h.path!)?.icon ?? "⭐", title: `Level ${h.level}: choose your skill!`, text: `${healed ? `+${healed} HP. ` : ""}The ${PATH_MAP.get(h.path!)?.name ?? ""} path offers you a skill. Open your inventory's Attributes tab to choose it (and spend your ${h.attrPoints} attribute point${h.attrPoints === 1 ? "" : "s"}).` }
        : { icon: "⭐", title: `Level ${h.level}!`, text: `${healed ? `+${healed} HP. ` : ""}You have ${h.attrPoints} attribute point${h.attrPoints === 1 ? "" : "s"} to spend. Open your inventory's Attributes tab to put them to use.` };
    } else run.pendingTalents++;
  }
}

// ---------- Layers as stages ----------
/** The level you set out at when starting from a deeper layer. */
export const layerStartLevel = (L: number) => 1 + 3 * (L - 1);
/** Start the run from a deeper layer (one the class has earned): a few levels, a little Gold, a potion and some
 *  gear in the pack, so the hero isn't left behind. */
export function beginAtLayer(run: Run, L: number) {
  if (!run.gridMode || L <= 1) return;
  const h = run.hero;
  run.floor = L;
  h.f.persist["floor"] = L;
  h.f.persist["startLayer"] = L;
  recompute(h);
  while (h.level < layerStartLevel(L)) gainXp(run, xpToLevel(h.level) - h.xp);
  h.f.hp = h.f.maxHp;
  h.f.gold += 25 * (L - 1);
  h.potions = Math.max(h.potions, 1);
  const kit: GearItem[] = [];
  // (The Abyss: you set out as someone who has walked the whole dungeon, with more, and better.)
  const abyss = run.mode === "abyss";
  for (let k = 0; k < (abyss ? 5 : 3); k++) {
    const x = run.rng();
    const it = rollItem(h, abyss ? (x < 0.1 ? "legendary" : x < 0.7 ? "epic" : "rare") : L >= 3 && x < 0.35 ? "epic" : "rare", L - 1, run.rng);
    if (it.reqLevel && it.reqLevel > h.level) it.reqLevel = h.level;
    kit.push(it);
    // (The Abyss: whatever beats what you're wearing goes straight on.)
    const sl = slotsFor(it, h)[0];
    const cur = sl ? h.equip[sl] : undefined;
    if (abyss && sl && (!cur || RARITIES.indexOf(cur.rarity) < RARITIES.indexOf(it.rarity))) { it.revealed = true; if (!equipItem(h, it, sl)) continue; }
    if (h.backpack.length < packSize(h)) h.backpack.push(it);
  }
  run.gridPlan = undefined;
  run.grid = makeGrid(run, 0);
  run.popup = abyss ? { icon: "🕳️", title: "The Abyss", text: `Below the last layer, where the torches burn low. One layer, and its warden at the bottom. On every floor, Omens wait: accept one for its boon and its bane, or turn them away. Beat the warden and the Abyss gives you a Tarot card. You set out at level ${h.level}, with ${h.attrPoints ?? 0} attribute points, and gear in your pack: ${kit.map(i => itemName(i)).join(", ")}.` }
    : { icon: "🕳️", title: `The ${ordinal(L)} Layer`, text: `You set out from the ${ordinal(L)} Layer at level ${h.level}, with ${h.attrPoints ?? 0} attribute points to spend, a potion, some Gold, and gear in your pack: ${kit.map(i => itemName(i)).join(", ")}.` };
}

/** Head back to the Camp after conquering a layer: the run ends, as a success (not a death). */
export function retireRun(run: Run) {
  if (run.scene.t !== "cleared") return;
  run.retired = true;
  run.popup = undefined;
  run.scene = { t: "over", won: false };
}

// ---------- Loot scenes ----------

/** Collect gold/scrolls/relic from a loot scene (items are handled one by one). */
export function collectLoot(run: Run) {
  if (run.scene.t !== "loot") return;
  const s = run.scene;
  const h = run.hero;
  h.f.gold += Math.round(s.gold * goldMult(run));
  gainPotions(h, s.potions);
  recompute(h);
  lockGold(run);
  s.gold = 0;
  s.scrolls = 0;
  s.potions = 0;
  s.relic = undefined;
}

/** Take a found item: equip it, or put it in the backpack. */
export function takeItem(run: Run, uid: number, how: "equip" | "pack", slot?: EquipSlot): string | null {
  const sc = run.scene;
  if (sc.t !== "loot" && sc.t !== "pick") return null;
  const item = sc.items.find(i => i.uid === uid);
  if (!item) return null;
  const err = how === "equip" ? equipItem(run.hero, item, slot) : addToBackpack(run.hero, item);
  if (err) return err;
  markFound(run, item);
  sc.items = sc.items.filter(i => i.uid !== uid);
  if (sc.t === "pick") finishLoot(run);
  return null;
}

export function markFound(run: Run, item: GearItem) {
  run.found.add(item.base);
  for (const k of Object.keys(item.bonuses)) run.found.add(k);
  if (item.epic) run.found.add(item.epic);
  if (item.rarity === "legendary") run.stats.legendaries++;
}

/** Salvage a found item straight into Scrap. */
export function scrapFound(run: Run, uid: number) {
  const sc = run.scene;
  if (sc.t !== "loot" && sc.t !== "pick") return;
  const item = sc.items.find(i => i.uid === uid);
  if (!item) return;
  if (!run.gridMode) run.hero.scrap += scrapValue(run.hero, item);
  sc.items = sc.items.filter(i => i.uid !== uid);
  if (sc.t === "pick") finishLoot(run);
}

export function finishLoot(run: Run) {
  let bountyPay = false;
  if (run.scene.t === "loot") {
    bountyPay = !!run.scene.bounty;
    collectLoot(run);
    if (run.scene.then === "resplendent") return openResplendent(run);
  }
  advance(run, bountyPay);
}

export function pickResplendent(run: Run, i: number) {
  const s = run.scene;
  if (s.t !== "resplendent" || (s.picked !== null && !s.glove)) return;
  if (s.picked !== null && s.glove) s.glove = false; // Gambler's Glove: swap once
  s.picked = i;
}

export function claimResplendent(run: Run): string | null {
  const s = run.scene;
  if (s.t !== "resplendent" || s.picked === null) return null;
  const card = s.cards[s.picked];
  if (card.kind === "scroll") {
    grantScrolls(run, 1);
    advance(run);
    return null;
  }
  const passed = s.cards.filter((c, i) => i !== s.picked && c.kind === "item").map(c => (c as { item: GearItem }).item);
  run.scene = { t: "pick", title: "Your find", items: [card.item], passed };
  return null;
}

// ---------- Shop, Forge, Rest ----------

const PRICE: Record<Rarity, number> = { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 120, crimson: 250, epic_crimson: 900, legendary_crimson: 2500 };

function shopStock(run: Run): ShopEntry[] {
  const h = run.hero;
  const stock: ShopEntry[] = [];
  for (let i = 0; i < 3; i++) {
    const item = rollItem(h, rollRarity(run.rng, heatOdds(run, tables(run).shop), luckFloor(run)), depth(run), run.rng);
    gateItem(run, item);
    stock.push({ kind: "item", item, price: Math.round(PRICE[item.rarity] * shopMult(run)) });
  }
  const shopRelic = run.gridMode ? null : randomRelic(run);
  if (shopRelic) stock.push({ kind: "relic", relic: shopRelic, price: Math.round((({ common: 70, uncommon: 100, rare: 150, legendary: 280 } as Record<string, number>)[getItem(shopRelic).rarity ?? "common"] ?? 90) * shopMult(run)) });
  stock.push({ kind: "potion", price: Math.round(15 * shopMult(run)) });
  stock.push({ kind: "mana", price: Math.round(35 * shopMult(run)) });
  // Cleansing Potions: rare and dear (about one Merchant in three).
  if (run.rng() < 0.35) stock.push({ kind: "cleanse", price: Math.round(80 * shopMult(run)) });
  // The Crawl's Merchants also sell something to throw (one or two kinds).
  if (run.gridMode) {
    const kinds = [...FINDABLE_THROWS].sort(() => run.rng() - 0.5).slice(0, run.rng() < 0.5 ? 3 : 2);
    for (const t of kinds) stock.push({ kind: "throw", throw: t, price: Math.round(THROW_PRICE[t] * shopMult(run)) });
    // Now and then, a seed for the Camp's Garden (rarer plants cost more).
    if (!run.drill && run.rng() < SHOP_SEED) {
      const pl = pickW(run.rng, Object.fromEntries((Object.keys(PLANTS) as Plant[]).map(k => [k, PLANTS[k].weight])) as Record<Plant, number>);
      stock.push({ kind: "seed", plant: pl, price: Math.round((12 + 120 / PLANTS[pl].weight) * shopMult(run)) });
    }
  }
  return stock;
}

export function buy(run: Run, i: number): string | null {
  if (run.scene.t !== "shop") return null;
  const e = run.scene.stock[i];
  const h = run.hero;
  if (!e || e.sold) return null;
  if (h.f.gold < e.price) return "Not enough Gold.";
  if (e.kind === "potion" && h.potions >= potionCap(h)) return `You can't carry more than ${potionCap(h)} Healing Potions.`;
  if (e.kind === "mana" && h.manaPotions >= manaPotionCap(h)) return `You can't carry more than ${manaPotionCap(h)} Mana Potions.`;
  if (e.kind === "cleanse" && (h.cleansePotions ?? 0) >= CLEANSE_POTION_CAP) return `You can't carry more than ${CLEANSE_POTION_CAP} Cleansing Potions.`;
  if (e.kind === "throw" && e.throw && (h.f.persist[THROW_INFO[e.throw].key] ?? 0) >= THROW_CAP) return `You can't carry more than ${THROW_CAP}.`;
  if (e.kind === "item" && e.item) {
    const err = addToBackpack(h, e.item);
    if (err) return err;
  }
  if (e.kind === "potion") gainPotions(h, 1);
  if (e.kind === "mana") gainManaPotions(h, 1);
  if (e.kind === "cleanse") gainCleansePotions(h, 1);
  if (e.kind === "scroll") h.scrolls++;
  if (e.kind === "throw" && e.throw) gainThrow(run, e.throw);
  if (e.kind === "seed" && e.plant) seedDrop(run, e.plant);
  if (e.kind === "item" && e.item) markFound(run, e.item);
  if (e.kind === "relic" && e.relic) grantRelic(run, e.relic);
  h.f.gold -= e.price;
  e.sold = true;
  markEncounter(run, "room:shop");
  return null;
}

/** What a Merchant pays for an item: 40% of its shop price, plus a little per level. */
export const SELL_SHARE = 0.8;
export const sellPrice = (item: GearItem, h?: Hero) => {
  // The Merchant pays 80% of an item's value (its base shop price), plus a little for its level.
  const n = Math.round(PRICE[item.rarity] * SELL_SHARE) + 2 * (item.level - 1);
  return (h?.curses["c_tarnished"] ?? 0) > 0 ? Math.ceil(n / 2) : n;
};

/** What this Merchant pays for an item: 80% of its value, but never more than 90% of what they'd charge for it
 *  (with the Merchant's Ledger's discount, buying and selling back must still lose a little). */
export const sellOffer = (run: Run, item: GearItem) =>
  Math.max(1, Math.min(Math.round(sellPrice(item, run.hero) * goldMult(run)), Math.floor(PRICE[item.rarity] * shopMult(run) * 0.9)));

/** Sell an item (equipped or in the bag): as many as you like. */
export function sellItem(run: Run, uid: number): string | null {
  const s = run.scene;
  if (s.t !== "shop") return null;
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  const price = sellOffer(run, found.item);
  removeGear(h, uid);
  recompute(h);
  h.f.gold += price;
  lockGold(run);
  s.soldItem = `${baseName(found.item)} for ${price} Gold`;
  if (["legendary", "crimson", "epic_crimson", "legendary_crimson"].includes(found.item.rarity)) h.f.persist["ach_sell_leg"] = 1;
  if (found.where !== "backpack" && EQUIP_SLOTS.every(sl => !h.equip[sl])) h.f.persist["ach_sell_all"] = 1;
  return null;
}

/** Shop prices grow with the floor: +12% per floor below the first. */
/** Odds that a beaten normal monster transforms into a Champion: 0 until 17 plain fights in a row,
 *  then 10%, rising 10% with every plain fight after that (up to 90%). */
export function transformationChance(streak: number): number {
  return streak < TRANSFORM_STREAK ? 0 : Math.min(0.9, 0.1 + 0.1 * (streak - TRANSFORM_STREAK));
}
export const TRANSFORM_STREAK = 17;
function rollTransformation(run: Run): boolean {
  if (run.rng() >= transformationChance(run.normalStreak ?? 0)) return false;
  run.normalStreak = 0;
  return true;
}

/** The Merchant sizes up your purse: +1% per 5 Gold you carry, up to +75%. */
export const wealthMult = (run: Run) => 1 + Math.min(0.75, Math.max(0, run.hero.f.gold) / 500);
/** Shop prices: floor and curses (priceMult) times what the Merchant thinks you can afford. */
export const shopMult = (run: Run) => priceMult(run) * wealthMult(run) * (1 - Math.min(0.15, PER.forShop * attrOf(run.hero, "for")));

/** The Merchant's Ledger (a Knowledge Table insight): Merchants charge you 30% less. */
export const LEDGER_DISCOUNT = 0.3;
export const priceMult = (run: Run) => (run.hero.f.persist["ins_ledger"] ? 1 - LEDGER_DISCOUNT : 1) * (1 + 0.12 * (run.floor - 1)) * gouge(run.hero) * (1 + 0.2 * pactRank(run, "greed")) * (1 + 0.4 * tarotOf(run.hero, "hermit").bane) * (1 + 0.3 * (run.hero.omens?.["quarter"] ?? 0));
/** Each reroll at the same Merchant costs triple the last (from 15 Gold, scaled by the floor), up to 5 rerolls per visit. */
export const MAX_SHOP_REROLLS = 5;
export const shopRerollCost = (run: Run) => Math.round(15 * shopMult(run)) * 3 ** run.shopRerolls;

export function rerollShop(run: Run): string | null {
  if (run.scene.t !== "shop") return null;
  if (run.shopRerolls >= MAX_SHOP_REROLLS) return "The Merchant has nothing else to show you.";
  const cost = shopRerollCost(run);
  if (run.hero.f.gold < cost) return "Not enough Gold.";
  run.hero.f.gold -= cost;
  run.shopRerolls++;
  // A reroll brings new gear and scrolls, but not more potions or relics: those stay as they were (bought stays bought).
  const kept = (e: ShopEntry) => e.kind === "potion" || e.kind === "mana" || e.kind === "relic";
  const potions = run.scene.stock.filter(kept);
  const fresh = shopStock(run).filter(e => !kept(e));
  const scroll = fresh.filter(e => e.kind === "scroll");
  run.scene = { ...run.scene, stock: [...fresh.filter(e => e.kind !== "scroll"), ...potions, ...scroll], markup: Math.round((wealthMult(run) - 1) * 100) };
  const th = run.gridMode && run.grid && run.grid.last !== undefined ? run.grid.things[run.grid.last] : undefined;
  if (th && th.room === "shop") { th.stock = run.scene.stock; th.rerolls = run.shopRerolls; }
  return null;
}

export function forgeUpgrade(run: Run, uid: number): string | null {
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  if (isTrinket(found.item)) return "The Forge is for steel. Trinkets go to the Jeweller.";
  return upgradeItem(run, found.item, "room:forge");
}

/** The Jeweller's upgrade: trinkets only (the Forge won't touch them). */
export function jewelUpgrade(run: Run, uid: number): string | null {
  const found = findItem(run.hero, uid);
  if (!found) return null;
  if (!isTrinket(found.item)) return "\"Steel? Take it to a forge.\" The Jeweller only works on trinkets.";
  return upgradeItem(run, found.item, "room:jeweller");
}

function upgradeItem(run: Run, item: GearItem, seen: string): string | null {
  const h = run.hero;
  const found = { item };
  const cost = upgradeCost(found.item, h);
  if (h.scrap < cost) return `Needs ${cost} Scrap.`;
  h.scrap -= cost;
  found.item.level++;
  found.item.upgrades = (found.item.upgrades ?? 0) + 1;
  rescaleAffixes(found.item, baseOf(found.item.base).kind);
  recompute(h);
  markEncounter(run, seen);
  return null;
}

export function forgeReroll(run: Run, uid: number): string | null {
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  const keys = Object.keys(found.item.bonuses);
  if (found.item.gen) {
    // Generated gear: the Forge rerolls everything but its material.
    if ((found.item.rerolls ?? 0) >= MAX_REROLLS) return "This item can't be rerolled any more.";
    const cost = rerollCost(found.item, h);
    if (h.scrap < cost) return `Needs ${cost} Scrap.`;
    h.scrap -= cost;
    found.item.rerolls = (found.item.rerolls ?? 0) + 1;
    const m = found.item.gen.m;
    setGenLuck(genLuck(run));
    const fresh = generate(baseOf(found.item.base), found.item.rarity, found.item.level, depth(run), run.rng, heroTags(h));
    fresh.m = m;
    found.item.gen = { ...fresh, name: genNameFor(found.item.base, fresh) };
    recompute(h);
    return null;
  }
  if (!keys.length) return "This item has no bonuses to reroll.";
  if ((found.item.rerolls ?? 0) >= MAX_REROLLS) return "This item can't be rerolled any more.";
  const cost = rerollCost(found.item, h);
  if (h.scrap < cost) return `Needs ${cost} Scrap.`;
  h.scrap -= cost;
  found.item.rerolls = (found.item.rerolls ?? 0) + 1;
  // One line is rerolled into another of the same grade.
  const old = keys[Math.floor(run.rng() * keys.length)];
  delete found.item.bonuses[old];
  const grade = affixById(old)?.grade ?? "minor";
  const fresh = affixesFor(h, baseOf(found.item.base), found.item.rarity, found.item.level, run.rng, 1, found.item.bonuses, grade);
  Object.assign(found.item.bonuses, Object.keys(fresh).length ? fresh : { [old]: 1 });
  recompute(h);
  return null;
}

/** Campfire heal: 40% of Max HP (half that while Restless). */
/** Healing is scarce in the Crawl: potions and campfires heal less there. */
export const CRAWL_POTION_HEAL = 8;
export const restPct = (h: Hero) => ((h.curses["c_restless"] ?? 0) > 0 ? 0.2 : h.f.persist["classLoot"] ? 0.3 : 0.4);
export function rest(run: Run, _choice: "heal" = "heal"): string | null {
  const h = run.hero;
  if (run.scene.t !== "rest" || run.scene.done) return null;
  restore(h, Math.round(h.f.maxHp * restPct(h)));
  run.scene.done = true;
  markEncounter(run, "room:rest");
  return null;
}

// ---------- Events ----------

export function chooseEvent(run: Run, i: number) {
  const s = run.scene;
  if (s.t !== "event" || s.result) return;
  markEncounter(run, `ev:${s.ev.id}`);
  markEncounter(run, `evopt:${s.ev.id}:${i}`);
  const h = run.hero;
  const found: GearItem[] = [];
  let dragonWakes = false;
  let sleepingDragon = false;
  let toPast = false, toFuture = false;
  const ctx = {
    rng: run.rng,
    gold: () => h.f.gold,
    addGold: (n: number) => { h.f.gold = Math.max(0, h.f.gold + (n > 0 ? Math.round(n * goldMult(run)) : n)); },
    hp: () => h.f.hp,
    hurt: (n: number) => { h.f.hp = Math.max(1, h.f.hp - n); },
    healPct: (p: number) => { restore(h, Math.round(h.f.maxHp * p)); },
    addMaxHp: (n: number) => { h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) - n; recompute(h); h.f.hp += n; },
    bindMaxHp: () => { recompute(h); h.f.persist["maxHpCap"] = h.f.maxHp; recompute(h); },
    oathBound: () => !!h.f.persist["maxHpCap"],
    tarot: (id: string) => tarotOf(h, id).boon,
    cutMaxHp: (n: number) => { h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) + n; recompute(h); h.f.hp = Math.max(1, Math.min(h.f.hp, h.f.maxHp)); },
    gainItem: (r: Rarity) => { const it = rollItem(h, r, depth(run), run.rng); found.push(it); return it; },
    // (The dungeon has no relics: what would have been one is a purse of Gold.)
    gainRelic: () => { if (run.gridMode) { const g = Math.round((20 + 8 * run.floor) * goldMult(run)); h.f.gold += g; return `a purse of ${g} Gold`; } const id = randomRelic(run); grantRelic(run, id); return `a relic: ${getItem(id).name}`; },
    loseRelic: () => { const ids = Object.keys(h.relics); if (!ids.length) return null; const id = ids[Math.floor(run.rng() * ids.length)]; h.relics[id]--; if (!h.relics[id]) delete h.relics[id]; recompute(h); return getItem(id).name; },
    relicCount: () => Object.keys(h.relics).length,
    addCurse: () => { const c = CURSES[Math.floor(run.rng() * CURSES.length)]; h.curses[c.id] = (h.curses[c.id] ?? 0) + 1; recompute(h); return c.name; },
    clearCurses: () => { const n = Object.keys(h.curses).length; h.curses = {}; recompute(h); return n; },
    addXp: (n: number) => gainXp(run, n),
    addScrolls: (n: number) => { grantScrolls(run, n); },
    addPotions: (n: number) => { gainPotions(h, n); },
    addScrap: (n: number) => { h.scrap += n; },
    addPity: (n: number) => { run.loot.pity += n; },
    potions: () => h.potions,
    floor: () => run.floor,
    needGold: () => eventGold(run, s.ev),
    wakeDragon: (sleeping?: boolean) => { dragonWakes = true; sleepingDragon = !!sleeping; },
    dragonBlessing: () => {
      const k = 1 + Math.floor(run.rng() * 6);
      h.f.persist["blessKind"] = k;
      h.f.persist["blessFights"] = 5;
      return `🐲 Dragon's Blessing: ${BLESSINGS[k]}`;
    },
    cloverBlessing: () => { h.f.persist["cloverChests"] = 4; },
    angelicBlessing: () => { h.curses = {}; h.f.persist["angelFights"] = 2; recompute(h); },
    maxHp: () => h.f.maxHp,
    upgradeRandom: (n: number) => {
      const eq = EQUIP_SLOTS.map(sl => h.equip[sl]).filter((x): x is GearItem => !!x);
      if (!eq.length) return null;
      const it = eq[Math.floor(run.rng() * eq.length)];
      it.level += n;
      it.upgrades = (it.upgrades ?? 0) + n;
      rescaleAffixes(it, baseOf(it.base).kind);
      recompute(h);
      return itemName(it);
    },
    gainCommonRelic: () => {
      if (run.gridMode) { const g = Math.round((15 + 6 * run.floor) * goldMult(run)); h.f.gold += g; return `a purse of ${g} Gold`; }
      const pool = RELICS.filter(r => (r.rarity ?? "common") === "common" && !isLocked(r.id));
      const id = pool[Math.floor(run.rng() * pool.length)].id;
      grantRelic(run, id);
      return getItem(id).name;
    },
    addCrimsonKey: () => { h.crimsonKeys++; },
    seePast: () => { toPast = true; },
    seeFuture: () => { toFuture = true; },
    upgradeWeapon: () => { const w = h.equip.main; if (!w) return "You have no weapon."; w.level++; w.upgrades = (w.upgrades ?? 0) + 1; rescaleAffixes(w, baseOf(w.base).kind); recompute(h); return null; }
  };
  const opt = s.ev.options[i];
  if (!opt || (opt.can && !opt.can(ctx))) return;
  const result = opt.run(ctx);
  // The Chained Dragon woke up: straight into a fight.
  if (toPast) { run.message = result; return goToPast(run); }
  if (toFuture) { run.message = result; return fight(run, "boss", "death"); }
  if (dragonWakes) { run.message = result; fight(run, "champion", "dragon", sleepingDragon ? "The Sleeping Dragon" : undefined); return; }
  // Repeatable options (the Golden Altar): stay here; finds pile up until you leave.
  if (opt.repeat) {
    s.found.push(...found);
    s.note = result;
    lockGold(run);
    return;
  }
  const all = [...s.found, ...found];
  if (all.length) {
    run.scene = { t: "loot", title: s.ev.title, items: all, gold: 0, scrolls: 0, potions: 0 };
    run.message = result;
  } else s.result = result;
  lockGold(run);
}

export function eventOptionAvailable(run: Run, i: number): boolean {
  const s = run.scene;
  if (s.t !== "event") return false;
  const h = run.hero;
  const opt = s.ev.options[i];
  if (!opt.can) return true;
  // Only read-only helpers are used by `can`.
  return opt.can({ gold: () => h.f.gold, hp: () => h.f.hp, maxHp: () => h.f.maxHp, relicCount: () => Object.keys(h.relics).length, potions: () => h.potions, floor: () => run.floor, needGold: () => eventGold(run, s.ev), oathBound: () => !!h.f.persist["maxHpCap"] } as never);
}

// ---------- Fusions ----------

export function availableFusions(run: Run) {
  const r = run.hero.relics;
  return FUSION_RECIPES.filter(x => (r[x.a] ?? 0) > 0 && (r[x.b] ?? 0) > 0);
}

export function fuse(run: Run, out: string): string | null {
  const recipe = availableFusions(run).find(x => x.out === out);
  if (!recipe) return "You don't have both pieces.";
  const r = run.hero.relics;
  for (const id of [recipe.a, recipe.b]) {
    r[id]--;
    if (!r[id]) delete r[id];
  }
  r[out] = (r[out] ?? 0) + 1;
  run.found.add(out);
  run.stats.fusions++;
  recompute(run.hero);
  return null;
}

// ---------- Forge: Offering, Combine, Transmute ----------

const RARITY_POINTS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16, crimson: 32, epic_crimson: 96, legendary_crimson: 256 };

/** The value of an Offering; more and rarer items give better odds. */
export const offeringValue = (items: GearItem[]) => items.reduce((s, it) => s + RARITY_POINTS[it.rarity] * (1 + 0.25 * (it.level - 1)), 0);

/** Rarity odds an Offering of this value gives (for showing in the UI and for rolling). */
export function offeringOdds(value: number): Partial<Record<Rarity, number>> {
  const t = Math.log2(Math.max(1, value)); // 1 → 0 (common) … 16 → 4
  const odds: Partial<Record<Rarity, number>> = {};
  let total = 0;
  const FORGEABLE = RARITIES.filter(r => r !== "crimson" && r !== "epic_crimson" && r !== "legendary_crimson");
  FORGEABLE.forEach((r, i) => {
    let w = Math.max(0, 1.4 - Math.abs(i - 0.7 * t) * 1.1);
    if (r === "epic") w *= 0.8;
    if (r === "legendary") w = value >= 24 ? Math.min(0.5, (value - 24) / 80) : 0;
    odds[r] = w;
    total += w;
  });
  for (const r of FORGEABLE) odds[r] = Math.round(((odds[r] ?? 0) / total) * 100);
  return odds;
}

/** % chance an Offering gives nothing at all. */
export const OFFERING_FAIL = 20;

/** Sacrifice two or more backpack items for one new item (or, sometimes, nothing). */
export function forgeOffer(run: Run, uids: number[]): GearItem | string {
  const h = run.hero;
  const items = uids.map(u => findItem(h, u)?.item).filter((x): x is GearItem => !!x);
  if (items.length < 2) return "Offer at least two items.";
  if (run.scene.t === "offering") { if (run.scene.used) return "The altar has taken its offering."; run.scene.used = true; }
  for (const it of items) removeGear(h, it.uid);
  // The Forge doesn't always answer: sometimes the offering is simply lost.
  if (run.rng() * 100 < OFFERING_FAIL) {
    recompute(h);
    return "The altar swallows your offering… and gives nothing back.";
  }
  const rarity = rollRarity(run.rng, offeringOdds(offeringValue(items)));
  const out = rollItem(h, rarity, Math.max(depth(run), ...items.map(i => i.level)), run.rng);
  h.backpack.push(out);
  markFound(run, out);
  recompute(h);
  return out;
}

/** Two items of the same kind (same base): one stronger item, with a 30% chance to rise a rarity. */
export function forgeCombine(run: Run, a: number, b: number): GearItem | string {
  const h = run.hero;
  const A = findItem(h, a)?.item;
  const B = findItem(h, b)?.item;
  if (!A || !B || a === b) return "Pick two items.";
  if (A.gen || B.gen) return "Items made by chance (generated gear) can't be combined.";
  if (A.base !== B.base) return "Only two of the same item can be combined.";
  if (A.rarity === "legendary" || B.rarity === "legendary" || A.rarity === "crimson" || B.rarity === "crimson") return "Legendary and Crimson items can't be combined.";
  if (baseOf(A.base).noJewel) return `The ${baseOf(A.base).name} can't be combined.`;
  if (A.infused || B.infused) return "Infused items can't be combined.";
  const top = RARITIES.indexOf(A.rarity) >= RARITIES.indexOf(B.rarity) ? A : B;
  let r = RARITIES.indexOf(top.rarity);
  // Greater kit items are fixed to their rarity, so they never get promoted.
  const promoted = r < RARITIES.indexOf("epic") && !baseOf(top.base).onlyRarity && run.rng() < 0.3;
  if (promoted) r++;
  const rarity = RARITIES[r];
  const level = Math.max(A.level, B.level) + 1;
  const slots = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 0, crimson: 2, epic_crimson: 3, legendary_crimson: 0 }[rarity];
  const merged: Record<string, number> = {};
  for (const src of [A.bonuses, B.bonuses]) for (const [k, n] of Object.entries(src)) merged[k] = Math.max(merged[k] ?? 0, n);
  const keep = Object.entries(merged).sort((x, y) => y[1] - x[1]).slice(0, slots);
  const bonuses: Record<string, number> = Object.fromEntries(keep.map(([k, n]) => [k, n + 1]));
  if (Object.keys(bonuses).length < slots) {
    const fill = rollItem(h, rarity === "epic" ? "epic" : "rare", level, run.rng);
    for (const [k, n] of Object.entries(fill.bonuses)) if (Object.keys(bonuses).length < slots && !(k in bonuses)) bonuses[k] = n;
  }
  const epic = rarity === "epic" ? A.epic ?? B.epic ?? EPIC_POWERS[Math.floor(run.rng() * EPIC_POWERS.length)].id : undefined;
  const wasEquipped = findItem(h, top.uid)?.where;
  removeGear(h, A.uid);
  removeGear(h, B.uid);
  const out: GearItem = { uid: h.nextUid++, base: top.base, rarity, level, bonuses, epic, revealed: true, upgrades: 1 + Math.max(A.upgrades ?? 0, B.upgrades ?? 0) };
  if (wasEquipped && wasEquipped !== "backpack") equipItem(h, out, wasEquipped);
  else h.backpack.push(out);
  markFound(run, out);
  h.f.persist["ach_combine"] = 1;
  recompute(h);
  return out;
}


export const TRANSMUTE_COST = 4;

/** With the Transmuter's Crucible: a Common item + 4 Starmetal becomes a Legendary of the same kind. */
export function forgeTransmute(run: Run, uid: number): GearItem | string {
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found || found.item.rarity !== "common") return "Only Common items can be transmuted.";
  if (h.starmetal < TRANSMUTE_COST) return `Needs ${TRANSMUTE_COST} Starmetal.`;
  const slot = effectiveBase(found.item).slot;
  const pool = LEGENDARIES.filter(l => l.slot === slot && !isLocked(l.id) && (h.heat ?? 0) >= 2 * (l.heatMin ?? 0) && unlocked(h, l));
  const fitting = pool.filter(l => (l.legendary?.minFloor ?? 1) <= run.floor);
  const choice = (fitting.length ? fitting : pool)[Math.floor(run.rng() * (fitting.length || pool.length))];
  if (!choice) return "Nothing answers the Crucible.";
  h.starmetal -= TRANSMUTE_COST;
  const where = found.where;
  removeGear(h, uid);
  const out: GearItem = { uid: h.nextUid++, base: choice.id, rarity: "legendary", level: Math.max(found.item.level, depth(run)), bonuses: {}, revealed: true };
  if (where !== "backpack") equipItem(h, out, where);
  else if (h.backpack.length < packSize(h)) h.backpack.push(out);
  markFound(run, out);
  h.f.persist["ach_transmute"] = 1;
  recompute(h);
  return out;
}

// ---------- Talents and moving on ----------

export function talentOptions(run: Run): string[] {
  const tags = heroTags(run.hero);
  const pool = TALENTS.filter(t => (run.hero.talents[t.id] ?? 0) < 3 && !isLocked(t.id));
  const out: string[] = [];
  while (out.length < 3 && out.length < pool.length) {
    // Rare talents turn up about a third as often.
    const w = pool.map(t => (out.includes(t.id) ? 0 : (1 + 0.4 * t.tags.reduce((s, x) => s + Math.min(tags.get(x) ?? 0, 3), 0)) * (t.rarity === "rare" ? 0.3 : 1) * drawWeight(t)));
    let x = run.rng() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < pool.length; i++) {
      x -= w[i];
      if (x < 0) {
        out.push(pool[i].id);
        break;
      }
    }
  }
  return out;
}

/** Turn the talent down: take none this time (the Talentless notice). */
export function skipTalent(run: Run) {
  if (run.scene.t !== "talent") return;
  run.hero.f.persist["talentsSkipped"] = (run.hero.f.persist["talentsSkipped"] ?? 0) + 1;
  recompute(run.hero);
  run.pendingTalents--;
  run.scene = { t: "map" };
  advance(run, true);
}

export function chooseTalent(run: Run, id: string) {
  const h = run.hero;
  h.talents[id] = (h.talents[id] ?? 0) + 1;
  run.found.add(id);
  recompute(h);
  run.pendingTalents--;
  run.scene = { t: "map" };
  advance(run, true);
}

/** Move to the next step: offer pending talents first, then new path choices (or the next floor). */
export function advance(run: Run, fromTalent = false) {
  lockGold(run);
  // The Crawl's treasure room: closing its chest (or anything else there) leaves you in the room; the hole takes you on.
  const inTreasure = run.gridMode && run.grid?.depth === TREASURE_DEPTH && !run.gridDescend;
  if (!fromTalent && !inTreasure) {
    if (run.step >= STEPS_PER_FLOOR) {
      // After a floor boss, stop on a "Floor cleared" screen; the player continues when ready.
      // (Not after the campaign's final boss: that goes straight to the victory.)
      const finalBoss = (run.mode === "campaign" && run.floor >= runLayers(run)) || (run.mode === "abyss" && run.floor >= ABYSS_LAYER);
      if (!finalBoss && run.clearedFloor !== run.floor) {
        run.clearedFloor = run.floor;
        run.scene = { t: "cleared", floor: run.floor, boss: run.lastBoss ?? "The guardian" };
        return;
      }
      run.floor++;
      // Floor-scaled effects (some curses) update as you go deeper.
      run.hero.f.persist["floor"] = run.floor;
      recompute(run.hero);
      run.step = 0;
      if (run.gridMode) { tickDraughts(run); run.grid = makeGrid(run, 0); run.gridDescend = false; }
      // Boss Rush (a Drill): raised a few levels for each guardian.
      if (run.drill === "bossrush" && run.floor <= BOSSRUSH_LAYERS) bossRushLevels(run);
      // The Sun: each new layer begins with full HP and Mana (and, from II, a Healing Potion).
      const sun = tarotOf(run.hero, "sun");
      if (sun.on && run.gridMode) {
        const f = run.hero.f;
        f.hp = f.maxHp; f.mana = f.maxMana ?? MANA_MAX;
        if (sun.boon > 1) gainPotions(run.hero, 1);
      }
      run.message = `Floor ${run.floor}. The air is colder, and the hoards are richer: your Fortune grows.`;
      if (run.mode === "abyss") {
        if (run.floor > ABYSS_LAYER) { run.scene = { t: "over", won: true }; return; }
        run.message = `Abyss depth ${run.floor}. Everything down here is stronger — and so is what it carries.`;
        run.popup = { icon: "🕳️", title: `The Abyss — Depth ${run.floor}`, text: ABYSS_LINES[(run.floor - 2) % ABYSS_LINES.length] };
      } else if (run.floor !== FLOORS) {
        const th = themeOf(run);
        const where = run.gridMode ? `The ${ordinal(run.floor)} Layer` : `Floor ${run.floor}`;
        run.popup = th ? { icon: th.icon, title: `${where} — ${th.name}`, text: `${th.text} ${th.hint}. The deeper you go, the deadlier it gets — and the richer the loot.` }
          : { icon: "⬇️", title: `${where} — ${floorName(run.floor)}`, text: `${FLOOR_LINES[(run.floor - 2) % FLOOR_LINES.length]} The deeper you go, the deadlier it gets — and the richer the loot.` };
      }
      if (run.floor === FLOORS && run.mode !== "abyss") run.popup = { icon: "🕳️", title: `${run.gridMode ? `The ${ordinal(FLOORS)} Layer` : `Floor ${FLOORS}`} — The Source of the Darkness`, text: "You are close now. The darkness here is thick enough to taste, and every step pulls at you. A cold despair settles in your chest, whispering that the gate cannot be closed, that no one walks back out. Somewhere below, the gate breathes." };
      if (run.floor > runLayers(run) && run.mode === "campaign") {
        run.scene = { t: "over", won: true };
        return;
      }
    } else if (!run.gridMode) run.step++;
  }
  // The Crawl calls them layers (each layer is four floors).
  if (run.gridMode && run.popup && run.step === 0) { run.popup.title = run.popup.title.replace(/^Floor (\d+)( — [^]*)?$/, (_, n, rest) => `${ordinal(Number(n))} Layer${rest && !rest.includes(floorName(Number(n))) ? rest : ""}`); run.message = run.message.replace(/^Floor (\d+)\./, (_, n) => `${ordinal(Number(n))} Layer.`); }
  if (settleBounty(run)) return;
  if (run.pendingTalents > 0) {
    run.scene = { t: "talent", options: talentOptions(run) };
    return;
  }
  run.choices = genChoices(run);
  run.scene = { t: "map" };
}

// ---------- Bounty Board ----------

export const bountyOffers = (run: Run) => makeOffers(run.hero, run.rng, run.floor, heroTags(run.hero));

/** Take a contract (it replaces any you already hold), then move on. */
export function takeBounty(run: Run, i: number) {
  const s = run.scene;
  if (s.t !== "bounty") return;
  const offer = s.offers[i];
  if (offer) markEncounter(run, "room:bounty");
  if (!offer) return;
  run.bounty = { ...offer, base: run.hero.f.persist[offer.kind === "status" ? `q_st_${offer.status}` : `q_${offer.kind}`] ?? 0 };
  run.message = `📋 Contract taken: ${bountyText(offer, run.hero.origin)} within ${offer.roomsLeft} ${run.gridMode ? "encounters" : "rooms"}.`;
  advance(run);
}

export const bountyDone = (run: Run) => !!run.bounty && bountyProgress(run.hero, run.bounty) >= run.bounty.target;

/** Back on the map: pay out a finished contract, or tear up an expired one. Returns true if it opened a reward screen. */
function settleBounty(run: Run): boolean {
  const q = run.bounty;
  if (!q) return false;
  const h = run.hero;
  if (bountyDone(run)) {
    run.bounty = undefined;
    const r = q.reward;
    const what = `${bountyText(q, h.origin)}.`;
    if (r.kind === "scrap") { h.scrap += r.n; run.message = [run.message, `📋 Bounty complete! ${what} +${r.n} ⚙️ Scrap.`].filter(Boolean).join(" "); return false; }
    run.scene = { t: "loot", title: "📋 Bounty complete", items: r.kind === "item" ? [rollItem(h, r.rarity, depth(run), run.rng)] : [], gold: r.kind === "gold" ? r.n : 0, scrolls: 0, potions: 0, bounty: true };
    run.message = `${what} Your reward: ${rewardText(r)}.`;
    return true;
  }
  if (q.roomsLeft <= 0) {
    run.bounty = undefined;
    run.message = [run.message, `📋 Your bounty expired: ${bountyText(q, h.origin)}. (${bountyProgress(h, q)}/${q.target})`].filter(Boolean).join(" ");
  }
  return false;
}

// ---------- The Jeweller ----------

export type JewelSlot = { kind: "relic"; id: string } | { kind: "item"; uid: number };
export const JEWEL_TRIES = 2;
const TIER: Partial<Record<Rarity, number>> = { rare: 1, epic: 2, legendary: 3 };
const JEWEL_RARITIES = ["rare", "epic", "legendary"];

const slotItem = (run: Run, s?: JewelSlot) => (s && s.kind === "item" ? findItem(run.hero, s.uid) : null);
const isTrinket = (it: GearItem) => baseOf(it.base).slot === "trinket";
const isInfusable = (it: GearItem) => ["weapon", "off", "armour"].includes(baseOf(it.base).kind);

/** What the next try costs, once both slots are filled. Rare, Epic and Legendary work costs Starmetal, and much more. */
export function jewelCost(run: Run): { gold: number; scrap: number; starmetal: number } | null {
  const s = run.scene;
  if (s.t !== "jeweller" || !s.left || !s.right) return null;
  const m = shopMult(run), f = run.floor;
  if (s.mode === "fuse" && s.left.kind === "relic" && s.right.kind === "relic") return { gold: Math.round(25 * m), scrap: 6 + 2 * f, starmetal: 0 };
  const A = slotItem(run, s.left)?.item, B = slotItem(run, s.right)?.item;
  if (!A || !B) return null;
  if (s.mode === "infuse") {
    const t = TIER[A.rarity] ?? 1;
    return { gold: Math.round([80, 160, 300][t - 1] * m), scrap: 0, starmetal: [2, 4, 6][t - 1] };
  }
  const t = Math.max(TIER[A.rarity] ?? 1, TIER[B.rarity] ?? 1);
  return { gold: Math.round([60, 120, 200][t - 1] * m), scrap: [15 + 3 * f, 25 + 4 * f, 40 + 5 * f][t - 1], starmetal: t };
}

const sameSlot = (a?: JewelSlot, b?: JewelSlot) => !!a && !!b && a.kind === b.kind && (a.kind === "relic" ? a.id === (b as { id: string }).id : a.uid === (b as { uid: number }).uid);

export function jewelMode(run: Run, mode: "fuse" | "infuse" | "upgrade") {
  const s = run.scene;
  if (s.t !== "jeweller" || s.mode === mode) return;
  s.mode = mode;
  s.left = s.right = undefined;
}

/** Put something on the bench. Fuse: two trinkets or two relics. Infuse: a weapon, off-hand or armour (left) and a trinket (right). */
export function jewelPlace(run: Run, slot: JewelSlot): string | null {
  const s = run.scene;
  if (s.t !== "jeweller") return null;
  if (sameSlot(s.left, slot) || sameSlot(s.right, slot)) return "That's already on the bench.";
  if (slot.kind === "relic") return "The Jeweller only works on trinkets.";
  {
    const it = findItem(run.hero, slot.uid)?.item;
    if (!it) return null;
    if (it.gen) return "The Jeweller won't touch gear made by chance (generated items).";
    if (s.mode === "infuse") {
      if (isTrinket(it)) { s.right = slot; return null; }
      if (isInfusable(it)) { s.left = slot; return null; }
      return "Only weapons, off-hands, armour and trinkets.";
    }
    if (!isTrinket(it)) return "Only trinkets can be fused.";
  }
  if (!s.left) s.left = slot;
  else s.right = slot;
  return null;
}

export function jewelClear(run: Run, side: "left" | "right") {
  if (run.scene.t === "jeweller") run.scene[side] = undefined;
}

/** The Jeweller's rules. Breaking one costs nothing: he just won't do it. */
export function jewelCheck(run: Run): string | null {
  const s = run.scene;
  const h = run.hero;
  if (s.t !== "jeweller") return "";
  if (s.tries >= JEWEL_TRIES) return "\"That's enough for one visit.\" The Jeweller is already packing up.";
  if (!s.left || !s.right) return "Put something in both slots first.";
  if (s.mode === "fuse" && s.left.kind === "relic" && s.right.kind === "relic") return null;
  if (s.left.kind !== "item" || s.right.kind !== "item") return "Only trinkets go on this bench.";
  const A = slotItem(run, s.left)?.item, B = slotItem(run, s.right)?.item;
  if (!A || !B) return "Put something in both slots first.";
  for (const it of [A, B]) {
    if (!JEWEL_RARITIES.includes(it.rarity)) return "Only Rare, Epic and Legendary pieces can go on this bench.";
    if ((it.upgrades ?? 0) > 0) return `"Someone's already worked on this ${baseOf(it.base).name}. I won't touch it." (Upgraded items can't be fused or infused.)`;
    if (baseOf(it.base).noJewel) return `The ${baseOf(it.base).name} resists. It can't be fused or infused.`;
  }
  if (s.mode === "infuse") {
    if (A.rarity !== B.rarity) return `The rarities must match (a ${A.rarity} needs a ${A.rarity} trinket).`;
    if (A.infused) return `The ${itemName(A)} already holds an infusion.`;
  }
  const c = jewelCost(run)!;
  if (h.f.gold < c.gold || h.scrap < c.scrap || h.starmetal < c.starmetal) return `The Jeweller wants ${c.gold} Gold${c.scrap ? `, ${c.scrap} Scrap` : ""}${c.starmetal ? ` and ${c.starmetal} Starmetal` : ""}.`;
  return null;
}

/** Pay and try. A fusion that doesn't take still costs the fee. Two tries per visit. */
export function jewelFuse(run: Run): { ok: boolean; msg: string; made?: string } {
  const s = run.scene;
  const h = run.hero;
  if (s.t !== "jeweller") return { ok: false, msg: "" };
  const err = jewelCheck(run);
  if (err !== null) return { ok: false, msg: err };
  const c = jewelCost(run)!;
  h.f.gold -= c.gold;
  h.scrap -= c.scrap;
  h.starmetal -= c.starmetal;
  s.tries++;
  const L = s.left!, R = s.right!;
  s.left = s.right = undefined;
  const nothing = { ok: false, msg: "The stones grind together, spark… and come apart. Nothing. The Jeweller pockets the fee anyway." };
  // Two relics: a fusion recipe.
  if (L.kind === "relic" && R.kind === "relic") {
    const rec = findRecipe(FUSION_RECIPES, L.id, R.id);
    if (!rec || !h.relics[L.id] || !h.relics[R.id]) return nothing;
    for (const id of [L.id, R.id]) { h.relics[id]--; if (!h.relics[id]) delete h.relics[id]; }
    run.stats.fusions++;
    grantRelic(run, rec.out);
    run.hero.f.persist["ach_fuse"] = 1;
    return { ok: true, msg: `The two melt into one: ${getItem(rec.out).name}!`, made: getItem(rec.out).name };
  }
  const A = findItem(h, (L as { uid: number }).uid)!, B = findItem(h, (R as { uid: number }).uid)!;
  // Infusion: the trinket's effects and bonuses go into the gear, and the trinket is gone.
  if (s.mode === "infuse") {
    const t = B.item;
    const tb = baseOf(t.base);
    A.item.infused = tb.legendary && t.revealed ? tb.id : effectiveBase(t).id;
    for (const [k, v] of Object.entries(t.bonuses)) A.item.bonuses[k] = Math.max(A.item.bonuses[k] ?? 0, v);
    if (!A.item.epic && t.epic) A.item.epic = t.epic;
    removeItem(h, t.uid);
    recompute(h);
    run.hero.f.persist["ach_infuse"] = 1;
    return { ok: true, msg: `The ${tb.name} sinks into the ${itemName(A.item)} and is gone. Its power stays.`, made: itemName(A.item) };
  }
  // Two trinkets: a secret recipe.
  const rec = findRecipe(TRINKET_RECIPES, A.item.base, B.item.base);
  if (!rec) return nothing;
  const bonuses: Record<string, number> = { ...A.item.bonuses };
  for (const [k, v] of Object.entries(B.item.bonuses)) bonuses[k] = Math.max(bonuses[k] ?? 0, v);
  const rarity: Rarity = A.item.rarity === "legendary" || B.item.rarity === "legendary" ? "legendary" : "epic";
  const out: GearItem = { uid: h.nextUid++, base: rec.out, rarity, level: Math.max(A.item.level, B.item.level), bonuses, epic: A.item.epic ?? B.item.epic, revealed: true };
  const slot = A.where !== "backpack" ? A.where : B.where !== "backpack" ? B.where : null;
  removeItem(h, A.item.uid);
  removeItem(h, B.item.uid);
  if (slot) h.equip[slot] = out;
  else h.backpack.push(out);
  markFound(run, out);
  recompute(h);
  run.stats.fusions++;
  run.hero.f.persist["ach_fuse"] = 1;
  return { ok: true, msg: `The Jeweller holds it up to the light: ${baseOf(rec.out).name}!`, made: baseOf(rec.out).name };
}

// ---------- The Crossroads ----------

export const CROSSROADS_PATH_CHANCE = 0.015;
export const MAX_DRAGON_HEARTS = 2;

/** "The past": back to the first room of the previous floor (you keep everything you carry). */
function goToPast(run: Run) {
  const h = run.hero;
  run.floor = Math.max(1, run.floor - 1);
  run.step = 0;
  run.clearedFloor = undefined;
  h.f.persist["floor"] = run.floor;
  recompute(h);
  run.grid = undefined;
  run.popup = { icon: "⏪", title: `Floor ${run.floor} — again`, text: "The tunnels look familiar. The same cracks, the same smell of old smoke. You've been here before… haven't you?" };
  run.choices = genChoices(run);
  run.scene = { t: "map" };
}

// ---------- Dragon Sanctum ----------

/** Unify with your Dragon Heart: every stat +50% for the rest of the run. */
export function unifyHeart(run: Run): string | null {
  const s = run.scene;
  const h = run.hero;
  if (s.t !== "sanctum" || s.done || !h.dragonHeart || h.dragonHeart.unified) return null;
  const before = h.f.maxHp;
  h.dragonHeart.unified = true;
  markEncounter(run, "room:sanctum");
  recompute(h);
  h.f.hp = Math.min(h.f.maxHp, h.f.hp + Math.max(0, h.f.maxHp - before));
  s.done = true;
  return null;
}

/** Count every Gold you gain (call after each action): spending doesn't take it away. */
export function trackGold(run: Run) {
  const g = run.hero.f.gold;
  if (run.goldSeen !== undefined && g > run.goldSeen) run.goldEarned = (run.goldEarned ?? 0) + (g - run.goldSeen);
  run.goldSeen = g;
}

/** What a finished run puts on the leaderboards. */
export function runSummary(run: Run) {
  const p = run.hero.f.persist;
  trackGold(run);
  return {
    seed: run.seed, origin: run.hero.origin, mode: run.mode, floor: run.mode === "abyss" ? Math.min(run.floor, ABYSS_FLOORS) : run.floor, won: run.scene.t === "over" && run.scene.won,
    // The walkable dungeon: the floor reached inside the layer (0: the entrance), so the boards can show "Layer 2 · Floor 3".
    depth: run.mode !== "abyss" && run.gridMode && run.grid ? run.grid.depth : undefined,
    plates: run.hero.plates ?? 0, daily: run.daily, heat: heatOf(run) || undefined,
    level: run.hero.level, kills: run.stats.kills, elites: p["q_elites"] ?? 0, champions: p["q_champions"] ?? 0,
    damage: Math.round(p["t_dmg"] ?? 0), bestHit: Math.round(Math.max(p["t_best"] ?? 0, run.stats.bestHit)), gold: run.goldEarned ?? 0,
    killer: run.scene.t === "over" && !run.scene.won && !run.abandoned ? run.killer?.name : undefined
  };
}

export const baseName = (item: GearItem) => baseOf(item.base).name;

/** The player gives up: the run ends here, and Renown is earned for how far you got. */
export function abandonRun(run: Run) {
  if (run.scene.t === "over") return;
  run.abandoned = true;
  run.popup = undefined;
  run.message = "";
  run.scene = { t: "over", won: false };
}

/** Give the hero a relic and queue its "New relic!" popup. */
export function grantRelic(run: Run, id: string) {
  const h = run.hero;
  const isNew = !h.relics[id];
  h.relics[id] = (h.relics[id] ?? 0) + 1;
  run.found.add(id);
  // A relic you already have just merges in (×2, stronger), silently.
  if (isNew) (run.relicNews ??= []).push(id);
  recompute(h);
}

/** Heat 2+: less Gold from everything (fights, chests, events, sales). */
export const goldMult = (run: Run) => Math.max(0.1, 1 - 0.25 * pactRank(run, "lean") - 0.25 * tarotOf(run.hero, "priestess").bane) * (1 + PER.forGold * attrOf(run.hero, "for"))
  // (Prospector's Tea, from the Brewery.)
  * ((run.hero.f.persist["draught_gold"] ?? 0) > 0 ? 1.25 : 1);

/** Base luck for generated gear: the Abyss doubles it, every Heat level adds a little. */
const genLuck = (run: Run) => (run.mode === "abyss" ? 1.5 : 1) * (1 + 0.05 * Math.min(HEAT_LOOT_CAP, heatOf(run))) * (1 + PER.forLuck * attrOf(run.hero, "for"));

/** A relic reward: sometimes a choice of two instead (the player picks one). */
function offerRelic(run: Run, relic: string, chance: number, quality = 2) {
  if (run.rng() < chance) {
    let other = relic;
    for (let i = 0; i < 8 && other === relic; i++) other = randomRelic(run, quality);
    if (other !== relic) { run.relicChoice = [relic, other]; return; }
  }
  grantRelic(run, relic);
}
/** Take one of the two offered relics. */
export function chooseRelic(run: Run, id: string) {
  if (!run.relicChoice?.includes(id)) return;
  run.relicChoice = undefined;
  grantRelic(run, id);
}

/** Give the hero Scrolls of Revelation and queue their popup. */
export function grantScrolls(_run: Run, _n: number) {
  // (2.2: Scrolls of Revelation are retired: every Legendary arrives revealed.)
}

/** Heal the hero outside a fight. Curses that cut healing (Withered, Unhealing) apply here too. */
export function restore(h: Hero, amount: number) {
  let a = amount;
  eachHook(h.f, "healMult", (hm, n) => (a = Math.floor(a * hm(n))));
  const was = h.f.hp;
  if (a > 0) h.f.hp = Math.min(h.f.maxHp, h.f.hp + a);
  return h.f.hp - was;
}

/** Destitute: Gold can go down but never up again. Called after anything that hands out Gold. */
export function lockGold(run: Run) {
  const f = run.hero.f;
  if ((f.items["c_destitute"] ?? 0) <= 0) { delete f.persist["goldLock"]; return; }
  const lock = f.persist["goldLock"] ?? f.gold;
  f.gold = Math.min(f.gold, lock);
  f.persist["goldLock"] = f.gold;
}

/** The Wandering Blacksmith: upgrade an item for free (twice per visit). */
export function smithUpgrade(run: Run, uid: number): string | null {
  const s = run.scene;
  if (s.t !== "smith" || s.uses <= 0) return null;
  const found = findItem(run.hero, uid);
  if (!found) return null;
  if (isTrinket(found.item)) return "The Blacksmith shakes his head: trinkets are the Jeweller's work.";
  found.item.level++;
  found.item.upgrades = (found.item.upgrades ?? 0) + 1;
  rescaleAffixes(found.item, baseOf(found.item.base).kind);
  recompute(run.hero);
  s.uses--;
  return null;
}

// ---------- The Alchemist: combat tonics ----------
export const TONICS: Record<string, { name: string; icon: string; text: string; base: number; garden?: boolean }> = {
  might: { name: "Tonic of Might", icon: "💪", text: "Your next 3 attacks deal +4", base: 70 },
  weakness: { name: "Draught of Weakness", icon: "🥀", text: "The enemy is Weak for 3 rounds", base: 60 },
  barrier: { name: "Shellskin Elixir", icon: "🛡️", text: "Gain Barrier equal to 30% of your Max HP (it fades by half each round)", base: 75 },
  sunder: { name: "Armour-Rot Acid", icon: "🧪", text: "Halve the enemy's Armor for the rest of the fight", base: 90 },
  poison: { name: "Vial of Venom", icon: "☠️", text: "Apply 6 Poison, more on deeper floors", base: 65 },
  blind: { name: "Flash Powder", icon: "🌫️", text: "Blind the enemy for 3 rounds", base: 70 },
  // From the Camp's Brewery only (the Alchemist doesn't sell these).
  snack: { name: "Roasted Sweetroot", icon: "🍠", text: "Heal 15% of your Max HP", base: 0, garden: true },
  stout: { name: "Stoutroot Stew", icon: "🍲", text: "+25% Max HP (and that much HP) until this fight ends", base: 0, garden: true },
  salve: { name: "Frostmoss Salve", icon: "🧊", text: "Immune to Burn, Chill, Poison, Shock and Bleed for 4 rounds", base: 0, garden: true },
  bane: { name: "Banewort Draught", icon: "🥀", text: "An Elite, Champion or boss is Weak and Exposed for 2 rounds", base: 0, garden: true }
};
/** Holy Tribute: the price to lift one more curse. Scales with the floor and your purse, and doubles with each curse lifted. */
export function tributeCost(run: Run): number {
  const paid = run.scene.t === "tribute" ? run.scene.paid : 0;
  return Math.round(40 * shopMult(run)) * 2 ** paid;
}
export function payTribute(run: Run, curseId: string): string | null {
  const s = run.scene;
  if (s.t !== "tribute") return null;
  const h = run.hero;
  if (!h.curses[curseId]) return null;
  if (h.boundCurses?.includes(curseId)) return "That curse is bound to you for this Drill.";
  const cost = tributeCost(run);
  if (h.f.gold < cost) return "Not enough Gold.";
  h.f.gold -= cost;
  h.curses[curseId]--;
  if (h.curses[curseId] <= 0) delete h.curses[curseId];
  recompute(h);
  s.paid++;
  return null;
}

export function alchemistStock(run: Run) {
  const ids = Object.keys(TONICS).filter(id => !TONICS[id].garden).sort(() => run.rng() - 0.5).slice(0, 4);
  return ids.map(id => ({ id, price: Math.round(TONICS[id].base * priceMult(run) * 1.5) }));
}
export function buyTonic(run: Run, i: number): string | null {
  const s = run.scene;
  if (s.t !== "alchemist") return null;
  const e = s.stock[i];
  if (!e || e.sold) return null;
  if (run.hero.f.gold < e.price) return "Not enough Gold.";
  run.hero.f.gold -= e.price;
  e.sold = true;
  const t = (run.hero.tonics ??= {});
  t[e.id] = (t[e.id] ?? 0) + 1;
  return null;
}
/** Drink or throw a tonic in a fight. Doesn't use your turn. Status tonics fail on foes immune to statuses. */
export function useTonic(run: Run, id: string): string | null {
  const s = run.scene;
  if (s.t !== "combat" || s.battle.over) return "Tonics only work in a fight.";
  const t = run.hero.tonics ?? {};
  if (!t[id]) return null;
  const b = s.battle, p = b.player, e = b.enemy;
  t[id]--;
  if (!t[id]) delete t[id];
  if (id === "might") p.flags["tonicMight"] = (p.flags["tonicMight"] ?? 0) + 3;
  // Status tonics go through the normal rules: Ward, and foes that are immune to statuses, shrug them off.
  const tryStatus = (s: "weak" | "poison" | "blind", n: number) => {
    const before = e.statuses[s] ?? 0;
    applyStatus(b, p, e, s, n);
    if ((e.statuses[s] ?? 0) <= before) note = `${e.name} shrugs it off: it can't be affected right now.`;
  };
  let note: string | null = null;
  if (id === "weakness") tryStatus("weak", 3);
  if (id === "barrier") applyStatus(b, p, p, "barrier", Math.ceil(p.maxHp * 0.3));
  if (id === "sunder") e.armor = Math.floor(e.armor / 2);
  if (id === "poison") tryStatus("poison", 6 + run.floor);
  if (id === "blind") tryStatus("blind", 3);
  // The Brewery's tonics.
  if (id === "snack") healF(b, p, Math.max(1, Math.round(p.maxHp * 0.15)), "Roasted Sweetroot");
  if (id === "stout") { const n = Math.max(1, Math.round(p.maxHp * 0.25)); p.maxHp += n; p.hp += n; p.flags["stout"] = (p.flags["stout"] ?? 0) + n; }
  if (id === "salve") p.flags["salveUntil"] = b.round + 3;
  if (id === "bane") {
    if (e.boss || e.champion || e.elite) { applyStatus(b, p, e, "weak", 2); applyStatus(b, p, e, "exposed", 2); }
    else note = `Banewort only bites the strong: ${e.name} shrugs it off.`;
  }
  b.log.push(`${TONICS[id].icon} ${TONICS[id].name}!`);
  b.fx.push({ who: id === "might" || id === "barrier" || id === "snack" || id === "stout" || id === "salve" ? "player" : "enemy", kind: "text", text: TONICS[id].name, icon: TONICS[id].icon });
  return note;
}

/** Spend one chest of the Four-Leaf Clover blessing. Returns true if it was active for this chest. */
function useClover(run: Run): boolean {
  const f = run.hero.f;
  if ((f.persist["cloverChests"] ?? 0) <= 0) return false;
  f.persist["cloverChests"]--;
  if (f.persist["cloverChests"] === 0) run.message = "🍀 The Four-Leaf Clover wilts.";
  return true;
}

/** Gold an event asks for here: its minimum, scaled up each floor like shop prices. */
export function eventGold(run: Run, e: GameEvent): number {
  return e.minGold ? Math.round(e.minGold * priceMult(run)) : 0;
}

// ---------- Daily Dungeon ----------
/** Today's date in UTC (YYYY-MM-DD): everyone's Daily Dungeon changes at the same moment. */
export const utcDay = (d = new Date()) => d.toISOString().slice(0, 10);
const DAILY_ORIGINS: OriginId[] = ["warrior", "rogue", "mage", "cleric"];
/** The Daily Dungeon for a day: the same seed and class for every player. */
export function dailyFor(day: string): { day: string; seed: number; origin: OriginId } {
  let h = 2166136261;
  for (const ch of `dd2-daily-${day}`) { h ^= ch.charCodeAt(0); h = Math.imul(h, 16777619); }
  const seed = (h >>> 0) & 0x7fffffff;
  return { day, seed, origin: DAILY_ORIGINS[seed % DAILY_ORIGINS.length] };
}
/** Start a Daily Dungeon run (a Campaign run on the day's seed, with every item unlocked so it's the same for everyone). */
export function newDailyRun(day = utcDay()): Run {
  const d = dailyFor(day);
  const run = newRun(d.origin, d.seed, "campaign", new Set());
  run.daily = day;
  return run;
}

/** Drink a draught from the Brewery (not in a fight): it lasts this floor and the next few. */
export function drinkDraught(run: Run, id: string): string | null {
  const h = run.hero;
  if (run.scene.t === "combat") return "Not in the middle of a fight.";
  if ((h.draughts?.[id] ?? 0) <= 0) return null;
  const d = BREWS[id as BrewKind];
  if (!d?.floors) return null;
  h.draughts![id]--;
  if (!h.draughts![id]) delete h.draughts![id];
  h.f.persist[`draught_${id}`] = Math.max(h.f.persist[`draught_${id}`] ?? 0, d.floors);
  recompute(h);
  if (id === "glow" && run.grid) { run.grid.sight = (run.grid.sight ?? SIGHT) + 1; look(run.grid); }
  return null;
}
/** A floor down: every draught has a floor less to go. */
function tickDraughts(run: Run) {
  const p = run.hero.f.persist;
  let changed = false;
  for (const k of Object.keys(p)) if (k.startsWith("draught_") && (p[k] ?? 0) > 0) { p[k]--; changed = true; if (!p[k]) delete p[k]; }
  if (changed) recompute(run.hero);
}
/** How many layers this run goes down before it's won: the dungeon's five, or a Drill's own. */
export const runLayers = (run: Run) => (run.drill ? drillLayers(run.drill) : FLOORS);
/** Boss Rush: raised to this layer's level, with Gold for its Merchant. */
function bossRushLevels(run: Run) {
  const h = run.hero;
  while (h.level < bossRushLevel(run.floor)) gainXp(run, xpToLevel(h.level) - h.xp);
  h.f.gold += 40;
  h.f.hp = h.f.maxHp;
  run.popup = undefined;
}
/** Set a run up as a Drill (after startCrawl): its one rule, and the same footing for everyone. */
export function startDrill(run: Run, id: string) {
  const h = run.hero, f = h.f;
  run.drill = id;
  if (id === "glass") f.persist["drill_glass"] = 1;
  if (id === "bare") { f.persist["drill_bare"] = 1; delete h.equip.main; delete h.equip.off; delete h.equip.armour; }
  if (id === "dry") { f.persist["noPotions"] = 1; h.potions = 0; }
  if (id === "pilgrim") {
    const pool = CURSES.filter(c => !h.curses[c.id]);
    h.boundCurses = [];
    for (let k = 0; k < PILGRIM_CURSES && pool.length; k++) { const c = pool.splice(Math.floor(run.rng() * pool.length), 1)[0]; h.curses[c.id] = 1; h.boundCurses.push(c.id); }
    f.persist["everCursed"] = 1;
  }
  if (id === "borrowed") {
    const others = (["warrior", "rogue", "mage", "cleric"] as const).filter(o => o !== h.origin);
    const o = others[Math.floor(run.rng() * others.length)];
    h.lootAs = o;
    const kit = newHero(o).equip;
    h.equip.main = kit.main; h.equip.off = kit.off; h.equip.armour = kit.armour;
    if (!h.equip.off) delete h.equip.off;
  }
  if (id === "bossrush") bossRushLevels(run);
  recompute(h);
  f.hp = f.maxHp;
  run.grid = makeGrid(run, 0);
}

/** Achievement marks that depend on what you hold right now (checked every screen). */
export function trackMarks(run: Run) {
  const h = run.hero;
  const p = h.f.persist;
  p["ach_max_gold"] = Math.max(p["ach_max_gold"] ?? 0, h.f.gold);
  if ((p["angelFights"] ?? 0) > 0 || (p["blessFights"] ?? 0) > 0 || (p["cloverChests"] ?? 0) > 0) p["ach_blessing"] = 1;
  // Generated gear finds, and Talisman sets.
  for (const it of [...EQUIP_SLOTS.map(sl => h.equip[sl]), ...h.backpack]) {
    if (!it?.gen) continue;
    if (it.gen.broken) p["ach_overcharged"] = 1;
    if (it.gen.mods.some(m => m[2] >= 3)) p["ach_mythic"] = 1;
    if (it.gen.mods.some(m => m[2] >= 1)) p["ach_greater"] = 1;
    if (it.rarity === "crimson") p["ach_veined"] = 1;
  }
  // Five or more curses carried at once.
  if (Object.values(h.curses).reduce((n, x) => n + (x ?? 0), 0) >= 5) p["ach_curses5"] = 1;
  // Heatforged gear: found, worn (at the end, for Ashborn), and three worn at once.
  const heatWorn = EQUIP_SLOTS.filter(sl => h.equip[sl] && baseOf(h.equip[sl]!.base).heatMin).length;
  for (const it of [...EQUIP_SLOTS.map(sl => h.equip[sl]), ...h.backpack]) if (it && baseOf(it.base).heatMin) { p["ach_heatforged"] = 1; if (baseOf(it.base).legendary) p["ach_heatlegend"] = 1; }
  p["ach_heatworn"] = heatWorn > 0 ? 1 : 0;
  if (heatWorn >= 3) p["ach_heatforged3"] = 1;
  const wornSigils = new Set((h.sigils ?? []).map(x => x.id));
  for (const set of SIGIL_SETS) {
    const n = set.pieces.filter(id => wornSigils.has(id)).length;
    if (n >= 2) p["ach_sigil2"] = 1;
    if (n >= set.pieces.length) p["ach_sigil_full"] = 1;
  }
  // A full set: every slot you have filled (the off-hand may be empty behind a two-hander).
  const main = h.equip.main;
  const need = EQUIP_SLOTS.filter(sl => sl !== "trinket3" || h.equip.trinket3).filter(sl => !(sl === "off" && main && effectiveBase(main).twoHanded && !h.equip.off));
  if (need.every(sl => h.equip[sl])) {
    const rar = need.map(sl => h.equip[sl]!.rarity);
    const top = ["legendary", "crimson", "epic_crimson", "legendary_crimson"];
    if (rar.every(r => top.includes(r))) p["ach_all_leg"] = 1;
    if (rar.every(r => r === "epic")) p["ach_all_epic"] = 1;
    if (rar.every(r => r === "rare")) p["ach_all_rare"] = 1;
  }
}

/** Remember an encounter (an event met, a choice taken, a room used) for the achievements. */
export function markEncounter(run: Run, key: string) {
  const e = (run.encounters ??= []);
  if (!e.includes(key)) e.push(key);
}

// ---------- The Talisman ----------
/** Maybe find a sigil (straight into the sigil bag). Set pieces lean toward sets you've started. Returns its name. */
export function rollSigilDrop(run: Run, chance: number, setChance: number): string | null {
  const luck = (run.mode === "abyss" ? 1.5 : 1) * (1 + 0.02 * Math.min(HEAT_LOOT_CAP, heatOf(run)));
  if (run.rng() >= chance * luck) return null;
  const h = run.hero;
  const level = depth(run);
  let sg: Sigil;
  if (run.rng() < Math.min(0.9, setChance * luck)) {
    const owned = new Set([...(h.sigils ?? []), ...(h.sigilBag ?? [])].map(x => x.id));
    const sets = SIGIL_SETS.map(set => ({ set, w: 1 + 1.5 * set.pieces.filter(p => owned.has(p)).length }));
    let x = run.rng() * sets.reduce((a, b) => a + b.w, 0);
    const set = sets.find(o => (x -= o.w) < 0)?.set ?? SIGIL_SETS[0];
    const missing = set.pieces.filter(p => !owned.has(p));
    const pool = missing.length ? missing : set.pieces;
    sg = { uid: h.nextUid++, id: pool[Math.floor(run.rng() * pool.length)], level };
  } else {
    const mod = GEN_MINORS[Math.floor(run.rng() * GEN_MINORS.length)];
    sg = { uid: h.nextUid++, id: mod.id, level, tier: 2 + Math.floor(run.rng() * 3) };
  }
  const bag = (h.sigilBag ??= []);
  if (bag.length >= SIGIL_BAG_SIZE) { h.scrap += 3; return null; }
  bag.push(sg);
  return sigilName(sg);
}
export const sigilName = (sg: Sigil) => (GEN_MINORS.some(m => m.id === sg.id) ? `Sigil ${GEN_MINORS.find(m => m.id === sg.id)!.affix}` : getItem(sg.id).name);
/** Wear a sigil from the bag (if there's a free slot). */
export function wearSigil(run: Run, uid: number): string | null {
  const h = run.hero;
  const bag = h.sigilBag ?? [];
  const sg = bag.find(x => x.uid === uid);
  if (!sg) return null;
  if ((h.sigils ?? []).length >= sigilSlots(h)) return "Your Talisman is full. Take a sigil off first.";
  if (!GEN_MINORS.some(m => m.id === sg.id) && (h.sigils ?? []).some(x => x.id === sg.id)) return "You're already wearing that sigil.";
  h.sigilBag = bag.filter(x => x.uid !== uid);
  (h.sigils ??= []).push(sg);
  recompute(h);
  return null;
}
export function removeSigil(run: Run, uid: number): string | null {
  const h = run.hero;
  const sg = (h.sigils ?? []).find(x => x.uid === uid);
  if (!sg) return null;
  if ((h.sigilBag ?? []).length >= SIGIL_BAG_SIZE) return "Your sigil bag is full.";
  h.sigils = h.sigils!.filter(x => x.uid !== uid);
  (h.sigilBag ??= []).push(sg);
  recompute(h);
  return null;
}
export function scrapSigil(run: Run, uid: number): number {
  const h = run.hero;
  const before = (h.sigilBag ?? []).length;
  h.sigilBag = (h.sigilBag ?? []).filter(x => x.uid !== uid);
  if (h.sigilBag.length === before) return 0;
  const n = 4 + Math.floor(depth(run) / 2);
  h.scrap += n;
  return n;
}
