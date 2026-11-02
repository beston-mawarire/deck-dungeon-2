// A run: three floors of path choices, fights, chests, shops, forges and bosses.
import { relicBonus } from "../data/basic_relics";
import { CURSES, EPIC_POWERS, KEEPSAKES, LEGENDARIES, RELICS, TALENTS } from "../data";
import { CAMPAIGN_FLOORS, DEATH_FLOOR, END_FLOOR, EPIC_CRIMSON_FLOORS, makeBoss, makeDeath, makeCrimsonBoss, makeUber, WALL_FLOOR } from "../data/bosses";
import { CROSSROADS_GUISES, crossroadsEvent, EVENTS, type GameEvent } from "../data/events";
import { FUSION_RECIPES } from "../data/fusions";
import { findRecipe, TRINKET_RECIPES } from "../data/jeweller";
import { makeDragon, makeGoblin, makeMonster, makeThief, makeUnique, type MonsterRank, UNIQUES } from "../data/monsters";
import { type Action, actionToll, BLESSINGS, playRound, startBattle } from "../engine/combat";
import { eachHook, getItem } from "../engine/registry";
import { makeRng } from "../engine/rng";
import { applyStatus, heal as healF } from "../engine/statuses";
import type { Battle, GearItem, OriginId, Rarity } from "../engine/types";
import { RARITIES } from "../engine/types";
import { autoBattleWins } from "./auto";
import { BOUNTY_BOARD_CHANCE, bountyProgress, bountyText, makeOffers, rewardText, type Bounty } from "./bounty";
import { removeItem, gainPotions, potionCap, potionsPerFight, addToBackpack, canGuard, EQUIP_SLOTS, itemName, BACKPACK_SIZE, baseOf, effectiveBase, equipItem, findItem, type Hero, heroTags, newHero, recompute, removeGear, rerollCost, gouge, MAX_REROLLS, scrapValue, upgradeCost, xpToLevel } from "./hero";
import { isLocked, luckyOdds, type LootState, resetDropped, type ResplendentCard, resplendentCards, makeRewardItem, rollEpicCrimson, rollItem, rollRarity, setLocked, TABLES, ABYSS_TABLES } from "./loot";

/** Every floor has a name, so going deeper feels like going somewhere. */
const FLOOR_NAMES = ["The Upper Halls", "The Flooded Crypts", "The Sunken Galleries", "The Bone Vaults", "The Source of the Darkness"];
const DEEP_NAMES = ["The Ashen Deep", "The Weeping Dark", "The Rift's Edge", "The Hollow Below", "The Endless Stair", "The Drowned Cathedral", "The Red Warrens", "The Starless Vault", "The Nether Shelf", "The Last Light"];
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
export { DEATH_FLOOR, END_FLOOR, WALL_FLOOR };
export type Mode = "campaign" | "endless" | "abyss";
/** Abyss runs: ten floors, every foe a rank tougher, far richer drops. */
export const ABYSS_FLOORS = 10;
/** How deep the dungeon "really" is: in the Abyss each floor counts as two (enemy strength and item level). */
export const depth = (run: { mode: Mode; floor: number }) => (run.mode === "abyss" ? 2 * run.floor - 1 : run.floor);
/** The floor the loot odds use. The Abyss never has the "green floors" (where most Rares are Uncommon). */
const luckFloor = (run: Run) => (run.mode === "abyss" ? Math.max(3, depth(run)) : run.floor);
/** Abyss: every floor down, everything gets this much tougher on top of its depth. */
export const ABYSS_GROWTH = 1.06;
/** From this floor on (outside the Abyss), bosses drop Ruin Shards, and sometimes a Vanadium Plate. */
export const RUIN_FLOOR = 20;
export const PLATE_CHANCE = 0.25;
const tables = (run: Run): Record<keyof typeof ABYSS_TABLES, Partial<Record<Rarity, number>>> => (run.mode === "abyss" ? ABYSS_TABLES : { ...TABLES, uber: TABLES.boss });

export type RoomType = "fight" | "elite" | "champion" | "wooden" | "iron" | "vault" | "altar" | "shrine" | "shop" | "forge" | "rest" | "event" | "boss" | "crimson_elite" | "crimson_vault" | "unique" | "goblin" | "sanctum" | "bounty" | "crossroads" | "jeweller";

export const ROOM_INFO: Record<RoomType, { name: string; icon: string; text: string }> = {
  fight: { name: "Monster", icon: "⚔️", text: "A fight. Gold, XP, maybe a drop." },
  elite: { name: "Elite", icon: "💀", text: "A tougher fight. Always drops an item." },
  champion: { name: "Champion", icon: "👹", text: "Very dangerous. Rare loot and often a Scroll of Revelation." },
  wooden: { name: "Wooden Chest", icon: "📦", text: "One item, Common or Uncommon." },
  iron: { name: "Iron Chest", icon: "🧰", text: "One item, Uncommon or Rare. Sometimes a Mimic." },
  vault: { name: "Guarded Vault", icon: "🏛️", text: "Beat a Champion, then open a Resplendent chest." },
  altar: { name: "Blood Altar", icon: "🩸", text: "Pay 25% of your Max HP for a Resplendent chest." },
  shrine: { name: "Cursed Shrine", icon: "🕯️", text: "Take a curse for a Resplendent chest." },
  shop: { name: "Merchant", icon: "🪙", text: "Buy gear, potions and scrolls." },
  forge: { name: "Forge", icon: "🔨", text: "Spend Scrap to upgrade or reroll gear." },
  rest: { name: "Campfire", icon: "🔥", text: "Rest and heal." },
  sanctum: { name: "Dragon Sanctum", icon: "🐲", text: "Your Dragon Heart beats faster. Something old waits here." },
  jeweller: { name: "Jeweller", icon: "💍", text: "Two things on the bench, one comes back. For a fee." },
  crossroads: { name: "The Crossroads", icon: "🌒", text: "Two tunnels, one figure." },
  bounty: { name: "Bounty Board", icon: "📋", text: "Notices nailed to a post. Work for hire." },
  event: { name: "Something Strange", icon: "❔", text: "A meeting, a find, a gamble." },
  boss: { name: "Boss", icon: "👑", text: "The guardian of this floor." },
  unique: { name: "A Strange Presence", icon: "✴️", text: "Someone — something — with a name. Dangerous, once per run, and carrying something rare." },
  crimson_elite: { name: "Crimson Elite", icon: "🩸", text: "Rarer and deadlier than a Champion. Great loot, and often a Crimson Key." },
  goblin: { name: "Treasure Goblin", icon: "💰", text: "A Treasure Goblin, stuffed with loot! Kill it within 3 rounds before it escapes, and everything it carries is yours." },
  crimson_vault: { name: "Crimson Vault", icon: "🗝️", text: "Spend a Crimson Key: fight a Crimson boss for a Crimson item. Die here and your run is over." }
};

/** In the Abyss every fight is a rank tougher, and the map says so. */
export const ABYSS_ROOM_INFO: Partial<Record<RoomType, { name: string; icon: string; text: string }>> = {
  fight: { name: "Elite", icon: "💀", text: "The weakest thing down here. Always drops an item." },
  elite: { name: "Champion", icon: "👹", text: "Very dangerous. Rich loot." },
  champion: { name: "Boss", icon: "👑", text: "A boss, roaming the depths. Deadly — and the best loot outside the Uber boss." },
  boss: { name: "Uber boss", icon: "☠️", text: "The master of this depth, empowered. Its hoard is the richest in the Abyss." }
};

export interface ShopEntry { kind: "item" | "potion" | "mana" | "scroll" | "relic"; item?: GearItem; relic?: string; price: number; sold?: boolean }

export type Scene =
  | { t: "map" }
  | { t: "combat"; battle: Battle; rank: MonsterRank; then?: "resplendent" | "mimic" | "crimson" | "unique" | "goblin" | "dragon" | "transformed" | "death"; uber?: boolean }
  | { t: "loot"; title: string; items: GearItem[]; gold: number; scrolls: number; relic?: string; potions: number; then?: "resplendent"; crimsonKey?: boolean; /** A Bounty Board payout (closing it doesn't use a step). */ bounty?: boolean; /** A Dragon Heart was torn from the dragon (its level now). */ dragonHeart?: number; /** The Transmuter's Crucible dropped. */ crucible?: boolean }
  | { t: "resplendent"; cards: ResplendentCard[]; picked: number | null; glove: boolean }
  | { t: "pick"; title: string; items: GearItem[]; passed?: GearItem[]; /** A Keepsake on offer (bosses after floor 5). */ keepsake?: string }
  | { t: "talent"; options: string[] }
  | { t: "shop"; stock: ShopEntry[]; /** One item may be sold per Merchant visit. */ soldItem?: string; /** % markup from the Gold you carried when this stock was priced. */ markup?: number }
  | { t: "forge" }
  | { t: "rest"; done: boolean }
  | { t: "confirm"; room: RoomType }
  | { t: "event"; ev: GameEvent; result: string | null; found: GearItem[]; note?: string }
  | { t: "smith"; uses: number }
  /** The Dragon Sanctum: unify with your Dragon Heart. */
  | { t: "sanctum"; done?: boolean }
  /** The Jeweller's bench: two slots, then pay to fuse. */
  | { t: "jeweller"; mode: "fuse" | "infuse"; left?: JewelSlot; right?: JewelSlot; tries: number }
  /** The Bounty Board: three contracts to choose from. */
  | { t: "bounty"; offers: Bounty[] }
  | { t: "alchemist"; stock: { id: string; price: number; sold?: boolean }[] }
  /** Holy Tribute: pay Gold to lift curses one at a time, each costing more than the last. */
  | { t: "tribute"; paid: number }
  | { t: "cleared"; floor: number; boss: string }
  | { t: "over"; won: boolean };

export interface Run {
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
  /** Relics (by id) and scrolls ("scroll:N") just gained, waiting for their popup. */
  relicNews?: string[];
  /** Who ended the run (shown on the death screen). */
  killer?: { name: string; title?: string; family?: string; rank: string; hp: number; maxHp: number; damage: number; armor: number; crimson?: boolean; traits: string[]; statuses: [string, number][] };
  /** The player ended this run themselves. */
  abandoned?: boolean;
  /** The last boss beaten (for the Floor cleared screen). */
  lastBoss?: string;
  /** A story popup waiting to be shown (e.g. arriving on the last floor). */
  popup?: { title: string; text: string; icon: string; list?: string[]; fanfare?: string };
  /** Beat THE END on floor 26: the whole game is won. */
  finale?: boolean;
  /** Inventory tabs as last seen (a short signature each), so new things get a dot. */
  seenTabs?: Record<string, string>;
  /** The Daily Dungeon this run belongs to (its UTC date, YYYY-MM-DD), if any. */
  daily?: string;
  /** Ruin Shards and Vanadium Plates found this run, and how many of them are already banked on the device. */
  ruin?: { shards: number; plates: number; banked?: { shards: number; plates: number } };
}

export function newRun(origin: OriginId, seed = Date.now() & 0x7fffffff, mode: Mode = "campaign", locked: Set<string> = new Set()): Run {
  const run: Run = {
    mode, seed, rng: makeRng(seed), hero: newHero(origin), floor: 1, step: 0, choices: [], scene: { t: "map" },
    loot: { pity: 0 }, carry: 0, pendingTalents: 0, message: "", stats: { kills: 0, bestHit: 0, bosses: 0, legendaries: 0, fusions: 0 },
    found: new Set(), locked, seenBosses: new Set(), shopRerolls: 0
  };
  setLocked(locked);
  resetDropped();
  run.choices = genChoices(run);
  if (mode === "abyss") run.popup = { icon: "🕳️", title: "The Abyss", text: "The Ruin Shard crumbles in your hand, and the floor gives way. Down here every beast is a rank deadlier than it should be, and every one of them carries something worth killing for. The strongest carry the best of it. Ten depths. Few see the bottom." };
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

export function genChoices(run: Run): RoomType[] {
  if (run.step >= STEPS_PER_FLOOR) return ["boss"];
  const w: Partial<Record<RoomType, number>> = { fight: 34, elite: 13, wooden: 10, iron: 7, shop: 6, forge: 6, rest: 6, event: 9, vault: 3, altar: 3, shrine: 3, champion: 3 };
  // After the fifth boss (Endless), Crimson Elites start to appear; they drop the keys to Crimson Vaults.
  if (crimsonActive(run)) w.crimson_elite = 4;
  // Named unique foes: from floor 2, rare, each one once per run.
  if (run.floor >= 2 && UNIQUES.some(u => !run.seenBosses.has(`u:${u.id}`))) w.unique = 2;
  // Treasure Goblins: from floor 3, about as rare as a Legendary drop.
  if (run.floor >= 3) w.goblin = 0.5;
  if (run.step === 0) { w.elite = 0; w.champion = 0; w.vault = 0; w.crimson_elite = 0; w.unique = 0; }
  const out = new Set<RoomType>();
  out.add("fight");
  while (out.size < 3) out.add(pickW(run.rng, w));
  const rooms = [...out].sort(() => run.rng() - 0.5);
  // The Forge and the Jeweller take turns: every other time a forge would be offered, it's the Jeweller instead.
  const fi = rooms.indexOf("forge");
  if (fi >= 0) { if (run.jewellerNext) rooms[fi] = "jeweller"; run.jewellerNext = !run.jewellerNext; }
  // Holding a Crimson Key: a Crimson Vault is always offered as an extra path.
  if (crimsonActive(run) && run.hero.crimsonKeys > 0) rooms.push("crimson_vault");
  // A Dragon Heart not yet unified: the Dragon Sanctum is very often an extra path.
  const heart = run.hero.dragonHeart;
  if (heart && !heart.unified && run.rng() < 0.7) rooms.push("sanctum");
  // The Bounty Board: a rare extra path, from the first floor on.
  if (run.rng() < BOUNTY_BOARD_CHANCE) rooms.push("bounty");
  // The Crossroads, in disguise: a very rare extra path from floor 2, once per run.
  if (run.floor >= 2 && !run.seenBosses.has("e:crossroads") && run.rng() < CROSSROADS_PATH_CHANCE) {
    run.crossroadsGuise = Math.floor(run.rng() * CROSSROADS_GUISES.length);
    rooms.push("crossroads");
  }
  return rooms;
}

/** The Crimson mechanic kicks in once you've beaten the campaign's fifth boss. */
export function crimsonActive(run: Run) {
  return run.floor > FLOORS;
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

function enterRoom(run: Run, room: RoomType) {
  const h = run.hero;
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
    case "wooden":
      const woodOdds = useClover(run) ? luckyOdds(tables(run).wooden) : tables(run).wooden;
      run.scene = { t: "loot", title: "Wooden Chest", items: [rollItem(h, rollRarity(run.rng, woodOdds, luckFloor(run)), depth(run), run.rng)], gold: 3 + run.floor, scrolls: 0, potions: run.rng() < 0.2 ? 1 : 0 };
      return;
    case "iron": {
      const key = (h.relics["skeleton_key"] ?? 0) > 0;
      if (!key && run.rng() < 1 / 6) {
        run.message = "The chest bites! It's a Mimic.";
        return fight(run, "elite", "mimic");
      }
      const ironOdds = useClover(run) ? luckyOdds(tables(run).iron) : tables(run).iron;
      const items = [rollItem(h, rollRarity(run.rng, ironOdds, luckFloor(run)), depth(run), run.rng)];
      if (key) items.push(rollItem(h, rollRarity(run.rng, ironOdds, luckFloor(run)), depth(run), run.rng));
      run.scene = key ? { t: "pick", title: "Iron Chest — choose one", items } : { t: "loot", title: "Iron Chest", items, gold: 5 + run.floor * 2, scrolls: 0, potions: 0 };
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
    case "shop": run.shopRerolls = 0; run.scene = { t: "shop", stock: shopStock(run), markup: Math.round((wealthMult(run) - 1) * 100) }; return;
    case "forge": run.scene = { t: "forge" }; return;
    case "jeweller": run.scene = { t: "jeweller", mode: "fuse", tries: 0 }; return;
    case "rest": run.scene = { t: "rest", done: false }; return;
    case "event": {
      // Unique encounters (the dragon, the mirror pool) happen at most once per run.
      const cursed = Object.keys(run.hero.curses).length > 0;
      const pool = EVENTS.filter(e => (!e.unique || !run.seenBosses.has(`e:${e.id}`)) && (!e.needCurse || cursed) && run.floor >= (e.minFloor ?? 0) && run.hero.f.gold >= eventGold(run, e));
      const ev = pickW(run.rng, Object.fromEntries(pool.map(e => [e.id, e.weight ?? 1])) as Record<string, number>);
      const evDef = pool.find(e => e.id === ev)!;
      if (evDef.unique) run.seenBosses.add(`e:${evDef.id}`);
      // The Wandering Blacksmith: two free upgrades at his anvil. The Alchemist: a shop of combat tonics.
      if (evDef.id === "blacksmith") { run.scene = { t: "smith", uses: 2 }; return; }
      if (evDef.id === "alchemist") { run.scene = { t: "alchemist", stock: alchemistStock(run) }; return; }
      if (evDef.id === "crossroads") { run.scene = { t: "event", ev: crossroadsEvent(CROSSROADS_GUISES[Math.floor(run.rng() * CROSSROADS_GUISES.length)]), result: null, found: [] }; return; }
      if (evDef.id === "holy_tribute") { run.scene = { t: "tribute", paid: 0 }; return; }
      run.scene = { t: "event", ev: evDef, result: null, found: [] };
      return;
    }
    case "sanctum": run.scene = { t: "sanctum" }; return;
    case "crossroads":
      run.seenBosses.add("e:crossroads");
      run.scene = { t: "event", ev: crossroadsEvent(CROSSROADS_GUISES[run.crossroadsGuise ?? 0]), result: null, found: [] };
      return;
    case "bounty": run.scene = { t: "bounty", offers: bountyOffers(run) }; return;
    case "unique": return fight(run, "elite", "unique");
    case "goblin": return fight(run, "elite", "goblin");
  }
}

export function confirmRisk(run: Run, yes: boolean) {
  if (run.scene.t !== "confirm") return;
  if (!yes) return advance(run);
  enterRoom(run, run.scene.room);
}

function openResplendent(run: Run) {
  const cards = resplendentCards(run.hero, depth(run), run.loot, run.rng);
  useClover(run);
  run.scene = { t: "resplendent", cards, picked: null, glove: (run.hero.relics["gamblers_glove"] ?? 0) > 0 };
}

// ---------- Combat ----------

function fight(run: Run, rank: MonsterRank, then?: "resplendent" | "mimic" | "crimson" | "unique" | "goblin" | "dragon" | "transformed" | "death", defName?: string) {
  run.hero.f.persist["floor"] = run.floor;
  const F = depth(run);
  // The Abyss: every plain fight is a rank tougher. Monsters become Elites, Elites Champions, Champions bosses, and the floor boss an Uber boss.
  let uber = false;
  if (run.mode === "abyss" && !then) {
    if (rank === "boss" && run.step >= STEPS_PER_FLOOR) uber = true;
    else rank = ({ normal: "elite", elite: "champion", champion: "boss" } as Partial<Record<MonsterRank, MonsterRank>>)[rank] ?? rank;
  }
  // Fighting anything but a normal monster breaks the plain-fight streak (the floor boss doesn't count: you can't avoid it).
  if (rank !== "normal" && !(rank === "boss" && !then)) run.normalStreak = 0;
  // A Crimson Vault always holds a Crimson boss; in Endless, a floor boss is rarely Crimson too.
  // (Never on the floors with a special boss: the Horror, the Epic Crimson floors, DEATH and the End.)
  const special = run.floor === WALL_FLOOR || EPIC_CRIMSON_FLOORS.includes(run.floor) || run.floor === DEATH_FLOOR || run.floor === END_FLOOR;
  const crimsonBoss = rank === "boss" && (then === "crimson" || (crimsonActive(run) && !special && run.rng() < 0.06));
  // A rare gold thief sometimes turns up in place of a normal monster.
  const thief = rank === "normal" && !then && run.rng() < 0.04;
  const enemy = then === "death" ? makeDeath() : then === "dragon" ? makeDragon(run.rng, F, defName ?? "The Chained Dragon", defName ? "Woken, and furious" : "Awake, and furious") : then === "goblin" ? makeGoblin(run.rng, F) : then === "unique" ? makeUnique(run.rng, F, run.seenBosses) : crimsonBoss ? makeCrimsonBoss(depth(run), run.rng) : rank === "boss" ? makeBoss(F, run.rng, run.seenBosses) : thief ? makeThief(run.rng, F) : makeMonster(run.rng, F, rank, defName);
  if (then === "mimic") {
    enemy.name = "Mimic";
    enemy.items["m_ambush"] = 1;
  }
  if (run.mode === "abyss") {
    const g = Math.pow(ABYSS_GROWTH, run.floor - 1);
    enemy.maxHp = enemy.hp = Math.round(enemy.hp * g);
    enemy.damage = Math.round(enemy.damage * g);
    if (uber) makeUber(enemy, F, run.rng);
  }
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
  if (h.origin === "rogue") out.push("counter");
  if (h.origin === "mage" && h.f.barrierElement) out.push("barrier");
  if (h.origin === "cleric") out.push("penance");
  if (h.origin === "warrior" && !h.f.flags["warcry"]) out.push("warcry");
  if (!b.enemy.boss && !b.enemy.elite) out.push("flee");
  return out;
}

export function combatAction(run: Run, action: Action) {
  if (run.scene.t !== "combat") return;
  if (!availableActions(run).includes(action)) action = "attack";
  const b = run.scene.battle;
  const before = b.enemy.hp;
  playRound(b, action);
  run.stats.bestHit = Math.max(run.stats.bestHit, before - Math.max(0, b.enemy.hp));
  if (b.over) afterFight(run);
}

export const AUTO_BATTLE_FLOOR = 2;
/** Auto-battle is offered against normal foes, Elites and Champions (not bosses, dragons, goblins or named foes)
 *  once plain attacks are sure to win. */
export function canAutoBattle(run: Run): boolean {
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
  return `⚡ Auto-battle: ${b.over === "won" ? "won" : "over"} in ${b.round - start} round${b.round - start === 1 ? "" : "s"}${lost ? `, −${lost} HP` : ", untouched"}.`;
}

/** After the UI has played a phase, finish the fight if it's over. */
export function settleCombat(run: Run) {
  if (run.scene.t === "combat" && run.scene.battle.over) afterFight(run);
}

/** Mana Potion: spells hit 50% harder, and statuses they apply get +1, for the rest of the fight. */
export function drinkMana(run: Run): string | null {
  const h = run.hero;
  if (run.scene.t !== "combat" || run.scene.battle.over || h.f.hp <= 0) return "Mana Potions only work in a fight.";
  if (h.manaPotions <= 0) return null;
  if (isParched(h)) return "🏜️ Parched: the potion turns to dust on your tongue. You can't drink potions.";
  if (h.f.flags["mana"]) return "You're already brimming with mana this fight.";
  h.manaPotions--;
  h.f.flags["mana"] = 1;
  actionToll(run.scene.battle, h.f);
  run.scene.battle.fx.push({ who: "player", kind: "text", text: "Mana surges!", icon: "🔷" });
  run.scene.battle.log.push("🔷 You drink a Mana Potion: your spells surge for the rest of the fight.");
  return null;
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
  if (inFight) h.f.flags["potionsDrunk"] = drunk + 1;
  let amount = h.f.items["l_bottomless"] ? Math.ceil(h.f.maxHp / 2) : 12;
  if (h.f.items["pc_apothecary_ring"]) amount += 4;
  if (h.f.items["pc_spare_vial"]) amount += 3;
  if (h.f.items["pc_alchemist_coat"]) amount = Math.round(amount * 1.25);
  if (h.f.items["la_flaskwarden"]) amount *= 2;
  if (h.f.items["c_famine"]) amount = Math.ceil(amount / 2);
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
  if (b.over === "lost") {
    // Dying anywhere ends the run, Crimson Vaults included. Remember who did it.
    const e = b.enemy;
    run.killer = {
      name: e.name, title: e.title, family: e.family, rank: e.boss ? "Boss" : e.champion ? "Champion" : e.elite ? "Elite" : "",
      hp: Math.max(0, e.hp), maxHp: e.maxHp, damage: e.damage, armor: e.armor, crimson: e.crimson,
      traits: Object.keys(e.items).map(id => getItem(id).name),
      statuses: Object.entries(e.statuses).filter(([, n]) => (n ?? 0) > 0) as [string, number][]
    };
    run.scene = { t: "over", won: false };
    return;
  }
  if (b.over === "fled") { run.message = curseNote; return advance(run); }
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
    thiefPay = Math.floor(h.f.gold * 0.6);
    h.f.gold += thiefPay;
  }
  if (rank === "boss") {
    run.stats.bosses++;
    if (then !== "crimson") run.lastBoss = b.enemy.name;
    h.f.persist["bossKills"] = (h.f.persist["bossKills"] ?? 0) + 1;
  }
  // Catch your breath: a small heal after every won fight.
  restore(h, Math.ceil(h.f.maxHp * 0.15));
  const xp = { normal: 1, elite: 3, champion: 5, crimson: 7, boss: b.enemy.crimson ? 9 : 6 }[rank];
  gainXp(run, xp);
  const gold = { normal: 4 + 2 * run.floor, elite: 10 + 3 * run.floor, champion: 20 + 4 * run.floor, crimson: 30 + 6 * run.floor, boss: (b.enemy.crimson ? 50 : 30) + 10 * run.floor }[rank] + relicBonus(h.relics, "gold");
  const items: GearItem[] = [];
  let scrolls = 0;
  let potions = 0;
  let relic: string | undefined;
  let keyFound = false;
  const T = tables(run);
  const roll = (odds: Partial<Record<Rarity, number>>) => rollItem(h, rollRarity(run.rng, odds, luckFloor(run)), depth(run), run.rng);
  if (rank === "normal" && run.rng() < 0.2) items.push(roll(T.drop));
  if (rank === "normal" && run.rng() < 0.1) potions++;
  // Potion gear: a sober win brews a potion (the Alembic always, the Vial sometimes); the Grail refills one per boss.
  const sober = !b.player.flags["potionsDrunk"];
  if (sober && (h.f.items["lx_endless_alembic"] ?? 0) > 0) potions++;
  else if (sober && (h.f.items["pc_vial_of_plenty"] ?? 0) > 0 && run.rng() < 0.3) potions++;
  if (rank === "boss" && (h.f.items["pc_grail"] ?? 0) > 0) potions++;
  if (rank === "boss" && potions) gainPotions(h, potions); // (boss rewards come as a pick, not a loot screen)
  if ((rank === "normal" && run.rng() < 0.05) || (rank === "elite" && run.rng() < 0.15)) {
    h.manaPotions++;
    run.message = "You find a Mana Potion. 🔷";
  }
  let goblinGold = 0;
  let heartLevel = 0;
  let crucibleFound = false;
  if (then === "dragon") {
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
  } else if (then === "unique") {
    // Unique foes: always an Epic (sometimes a Legendary), a good relic and a fat purse.
    items.push(rollItem(h, run.rng() < 0.15 ? "legendary" : "epic", depth(run), run.rng));
    relic = randomRelic(run, 2);
    if (run.rng() < 0.3) scrolls++;
  } else if (rank === "elite") {
    items.push(roll(T.elite));
    if (then === "mimic") items.push(roll(T.elite));
    if (run.rng() < 0.35) relic = randomRelic(run);
  }
  if (rank === "champion" && then !== "dragon") {
    items.push(roll(T.champion));
    if (run.rng() < 0.2) scrolls++;
    const metal = run.rng() < 0.65 ? 1 + (run.rng() < 0.25 ? 1 : 0) : 0;
    if (metal) {
      h.starmetal += metal;
      run.message = `The Champion leaves ${metal} Starmetal behind.`;
    }
    // The Transmuter's Crucible: a rare artefact some Champions carry (once per run).
    if (!h.crucible && run.rng() < 0.12) { h.crucible = true; crucibleFound = true; }
    relic = relic ?? randomRelic(run, 2);
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
    if (run.rng() < 0.15) scrolls++;
    h.f.gold += gold;
    restore(h, Math.round(h.f.maxHp * 0.3));
    if (relic) {
      grantRelic(run, relic);
    }
    grantScrolls(run, scrolls);
    recompute(h);
    // From floor 20, every boss leaves a Ruin Shard (the key to an Abyss run), and sometimes a Vanadium Plate.
    let ruinNote = "";
    if (run.mode !== "abyss" && run.floor >= RUIN_FLOOR) {
      run.ruin = run.ruin ?? { shards: 0, plates: 0 };
      run.ruin.shards++;
      ruinNote = " · 🪨 a Ruin Shard";
      if (run.rng() < PLATE_CHANCE) {
        run.ruin.plates++;
        ruinNote += " · ⬛ a Vanadium Plate!";
        if (!run.popup) run.popup = { icon: "⬛", title: "A Vanadium Plate", text: "Among the remains lies a plate of dark, impossibly hard metal, cold to the touch. It's yours to keep, beyond this run. In the Abyss, it makes one of your heroes stronger.", fanfare: "epic" };
      }
    }
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
      run.popup = { icon: "☠️", title: "DEATH IS DEAD", text: "Damn, that's crazy! Tell Beston he owes you R600…", fanfare: "legendary_crimson" };
      run.scene = { t: "pick", title: "DEATH falls. Its scythe is yours", items: [makeRewardItem(h, "lc_abaddon", run.floor)] };
      run.message = `+${gold} Gold${ruinNote}`;
      return;
    }
    // Crimson bosses offer a Crimson item alongside two boss finds; the bosses of floors 20–24 offer an Epic Crimson.
    const offer = b.enemy.crimson ? [rollItem(h, "crimson", depth(run), run.rng), roll(T.boss), roll(T.boss)]
      : EPIC_CRIMSON_FLOORS.includes(run.floor) ? [rollEpicCrimson(h, depth(run), run.rng), roll(T.boss), roll(T.boss)]
      : run.scene.uber ? [roll(T.uber), roll(T.uber), roll(T.uber)]
      : [roll(T.boss), roll(T.boss), roll(T.boss)];
    // After the fifth boss, bosses sometimes leave a Keepsake behind.
    // Keepsakes are a rare find: about one boss in ten after floor 5 leaves one behind.
    const keepsake = run.floor > FLOORS && run.rng() < 0.1 ? KEEPSAKES.filter(k => k.id !== h.keepsake)[Math.floor(run.rng() * (KEEPSAKES.length - (h.keepsake ? 1 : 0)))]?.id : undefined;
    run.scene = { t: "pick", title: `${b.enemy.name} falls! Choose one`, items: offer, keepsake };
    run.message = `+${gold} Gold${relic ? ` · relic: ${getItem(relic).name}` : ""}${scrolls ? " · a Scroll of Revelation" : ""}${ruinNote} · healed 30%${curseNote ? ` ${curseNote}` : ""}`;
    return;
  }
  // Relics are yours the moment the fight ends (and get a popup), not when you leave the loot screen.
  if (relic) grantRelic(run, relic);
  if (scrolls) grantScrolls(run, scrolls);
  run.scene = { t: "loot", title: then === "dragon" ? "The Dragon's Hoard" : then === "goblin" ? "The Treasure Goblin's hoard" : then === "mimic" ? "The Mimic's hoard" : thiefPay ? `You caught the ${b.enemy.name}!` : "Victory", items, gold: gold + goblinGold, scrolls, relic, potions, then: then === "resplendent" ? "resplendent" : undefined, crimsonKey: keyFound || undefined, dragonHeart: heartLevel || undefined, crucible: crucibleFound || undefined };
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
  const pool = RELICS.filter(r => !isLocked(r.id));
  const w = pool.map(r => relicRarityWeight(r.rarity ?? "common", run.floor, quality) * (1 + 0.3 * r.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)) * fireRelicWeight(r));
  let x = run.rng() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < pool.length; i++) {
    x -= w[i];
    if (x < 0) return pool[i].id;
  }
  return pool[0].id;
}

function gainXp(run: Run, n: number) {
  const h = run.hero;
  h.xp += n;
  while (h.xp >= xpToLevel(h.level)) {
    h.xp -= xpToLevel(h.level);
    h.level++;
    run.pendingTalents++;
  }
}

// ---------- Loot scenes ----------

/** Collect gold/scrolls/relic from a loot scene (items are handled one by one). */
export function collectLoot(run: Run) {
  if (run.scene.t !== "loot") return;
  const s = run.scene;
  const h = run.hero;
  h.f.gold += s.gold;
  gainPotions(h, s.potions);
  recompute(h);
  lockGold(run);
  s.gold = 0;
  s.scrolls = 0;
  s.potions = 0;
  s.relic = undefined;
}

/** Take a found item: equip it, or put it in the backpack. */
export function takeItem(run: Run, uid: number, how: "equip" | "pack"): string | null {
  const sc = run.scene;
  if (sc.t !== "loot" && sc.t !== "pick") return null;
  const item = sc.items.find(i => i.uid === uid);
  if (!item) return null;
  const err = how === "equip" ? equipItem(run.hero, item) : addToBackpack(run.hero, item);
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
  run.hero.scrap += scrapValue(run.hero, item);
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
    const item = rollItem(h, rollRarity(run.rng, TABLES.shop, luckFloor(run)), depth(run), run.rng);
    stock.push({ kind: "item", item, price: Math.round(PRICE[item.rarity] * shopMult(run)) });
  }
  const shopRelic = randomRelic(run);
  stock.push({ kind: "relic", relic: shopRelic, price: Math.round((({ common: 40, uncommon: 55, rare: 85, legendary: 160 } as Record<string, number>)[getItem(shopRelic).rarity ?? "common"] ?? 50) * shopMult(run)) });
  stock.push({ kind: "potion", price: Math.round(15 * shopMult(run)) });
  if (run.rng() < 0.5) stock.push({ kind: "mana", price: Math.round(25 * shopMult(run)) });
  if (run.rng() < 0.12) stock.push({ kind: "scroll", price: Math.round(100 * shopMult(run)) });
  return stock;
}

export function buy(run: Run, i: number): string | null {
  if (run.scene.t !== "shop") return null;
  const e = run.scene.stock[i];
  const h = run.hero;
  if (!e || e.sold) return null;
  if (h.f.gold < e.price) return "Not enough Gold.";
  if (e.kind === "potion" && h.potions >= potionCap(h)) return `You can't carry more than ${potionCap(h)} Healing Potions.`;
  if (e.kind === "item" && e.item) {
    const err = addToBackpack(h, e.item);
    if (err) return err;
  }
  if (e.kind === "potion") gainPotions(h, 1);
  if (e.kind === "mana") h.manaPotions++;
  if (e.kind === "scroll") h.scrolls++;
  if (e.kind === "item" && e.item) markFound(run, e.item);
  if (e.kind === "relic" && e.relic) grantRelic(run, e.relic);
  h.f.gold -= e.price;
  e.sold = true;
  return null;
}

/** What a Merchant pays for an item: 40% of its shop price, plus a little per level. */
export const sellPrice = (item: GearItem, h?: Hero) => {
  const n = Math.round(PRICE[item.rarity] * 0.4) + 2 * (item.level - 1);
  return (h?.curses["c_tarnished"] ?? 0) > 0 ? Math.ceil(n / 2) : n;
};

/** Sell one item (equipped or in the bag) — once per Merchant visit. */
export function sellItem(run: Run, uid: number): string | null {
  const s = run.scene;
  if (s.t !== "shop") return null;
  if (s.soldItem) return "This Merchant has already bought something from you.";
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  const price = sellPrice(found.item, h);
  removeGear(h, uid);
  recompute(h);
  h.f.gold += price;
  lockGold(run);
  s.soldItem = `${baseOf(found.item.base).legendary && !found.item.revealed ? "an unrevealed Legendary" : baseName(found.item)} for ${price} Gold`;
  return null;
}

/** Shop prices grow with the floor: +12% per floor below the first. */
/** Odds that a beaten normal monster transforms into a Champion: 0 until 14 plain fights in a row,
 *  then 10%, rising 10% with every plain fight after that (up to 90%). */
export function transformationChance(streak: number): number {
  return streak < TRANSFORM_STREAK ? 0 : Math.min(0.9, 0.1 + 0.1 * (streak - TRANSFORM_STREAK));
}
export const TRANSFORM_STREAK = 14;
function rollTransformation(run: Run): boolean {
  if (run.rng() >= transformationChance(run.normalStreak ?? 0)) return false;
  run.normalStreak = 0;
  return true;
}

/** The Merchant sizes up your purse: +1% per 5 Gold you carry, up to +75%. */
export const wealthMult = (run: Run) => 1 + Math.min(0.75, Math.max(0, run.hero.f.gold) / 500);
/** Shop prices: floor and curses (priceMult) times what the Merchant thinks you can afford. */
export const shopMult = (run: Run) => priceMult(run) * wealthMult(run);

export const priceMult = (run: Run) => (1 + 0.12 * (run.floor - 1)) * gouge(run.hero);
/** Each reroll at the same Merchant costs double the last (from 10 Gold, scaled by the floor), up to 5 rerolls per visit. */
export const MAX_SHOP_REROLLS = 5;
export const shopRerollCost = (run: Run) => Math.round(10 * shopMult(run)) * 2 ** run.shopRerolls;

export function rerollShop(run: Run): string | null {
  if (run.scene.t !== "shop") return null;
  if (run.shopRerolls >= MAX_SHOP_REROLLS) return "The Merchant has nothing else to show you.";
  const cost = shopRerollCost(run);
  if (run.hero.f.gold < cost) return "Not enough Gold.";
  run.hero.f.gold -= cost;
  run.shopRerolls++;
  run.scene = { ...run.scene, stock: shopStock(run), markup: Math.round((wealthMult(run) - 1) * 100) };
  return null;
}

export function forgeUpgrade(run: Run, uid: number): string | null {
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  const cost = upgradeCost(found.item, h);
  if (h.scrap < cost) return `Needs ${cost} Scrap.`;
  h.scrap -= cost;
  found.item.level++;
  found.item.upgrades = (found.item.upgrades ?? 0) + 1;
  for (const k of Object.keys(found.item.bonuses)) found.item.bonuses[k]++;
  recompute(h);
  return null;
}

export function forgeReroll(run: Run, uid: number): string | null {
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  const keys = Object.keys(found.item.bonuses);
  if (!keys.length) return "This item has no bonuses to reroll.";
  if ((found.item.rerolls ?? 0) >= MAX_REROLLS) return "This item can't be rerolled any more.";
  const cost = rerollCost(found.item, h);
  if (h.scrap < cost) return `Needs ${cost} Scrap.`;
  h.scrap -= cost;
  found.item.rerolls = (found.item.rerolls ?? 0) + 1;
  const old = keys[Math.floor(run.rng() * keys.length)];
  const n = found.item.bonuses[old];
  delete found.item.bonuses[old];
  const fresh = rollItem(h, found.item.rarity === "uncommon" ? "uncommon" : "rare", n, run.rng);
  const pick = Object.keys(fresh.bonuses).find(k => !(k in found.item.bonuses)) ?? old;
  found.item.bonuses[pick] = n;
  recompute(h);
  return null;
}

/** Campfire heal: 40% of Max HP (half that while Restless). */
export const restPct = (h: Hero) => ((h.curses["c_restless"] ?? 0) > 0 ? 0.2 : 0.4);
export function rest(run: Run, _choice: "heal" = "heal"): string | null {
  const h = run.hero;
  if (run.scene.t !== "rest" || run.scene.done) return null;
  restore(h, Math.round(h.f.maxHp * restPct(h)));
  run.scene.done = true;
  return null;
}

// ---------- Events ----------

export function chooseEvent(run: Run, i: number) {
  const s = run.scene;
  if (s.t !== "event" || s.result) return;
  const h = run.hero;
  const found: GearItem[] = [];
  let dragonWakes = false;
  let sleepingDragon = false;
  let toPast = false, toFuture = false;
  const ctx = {
    rng: run.rng,
    gold: () => h.f.gold,
    addGold: (n: number) => { h.f.gold = Math.max(0, h.f.gold + n); },
    hp: () => h.f.hp,
    hurt: (n: number) => { h.f.hp = Math.max(1, h.f.hp - n); },
    healPct: (p: number) => { restore(h, Math.round(h.f.maxHp * p)); },
    addMaxHp: (n: number) => { h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) - n; recompute(h); h.f.hp += n; },
    gainItem: (r: Rarity) => { const it = rollItem(h, r, depth(run), run.rng); found.push(it); return it; },
    gainRelic: () => { const id = randomRelic(run); grantRelic(run, id); return getItem(id).name; },
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
      for (const k of Object.keys(it.bonuses)) it.bonuses[k] += n;
      recompute(h);
      return itemName(it);
    },
    gainCommonRelic: () => {
      const pool = RELICS.filter(r => (r.rarity ?? "common") === "common" && !isLocked(r.id));
      const id = pool[Math.floor(run.rng() * pool.length)].id;
      grantRelic(run, id);
      return getItem(id).name;
    },
    addCrimsonKey: () => { h.crimsonKeys++; },
    seePast: () => { toPast = true; },
    seeFuture: () => { toFuture = true; },
    upgradeWeapon: () => { const w = h.equip.main; if (!w) return "You have no weapon."; w.level++; w.upgrades = (w.upgrades ?? 0) + 1; for (const k of Object.keys(w.bonuses)) w.bonuses[k]++; recompute(h); return null; }
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
  return opt.can({ gold: () => h.f.gold, hp: () => h.f.hp, maxHp: () => h.f.maxHp, relicCount: () => Object.keys(h.relics).length, potions: () => h.potions, floor: () => run.floor, needGold: () => eventGold(run, s.ev) } as never);
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
  for (const it of items) removeGear(h, it.uid);
  // The Forge doesn't always answer: sometimes the offering is simply lost.
  if (run.rng() * 100 < OFFERING_FAIL) {
    recompute(h);
    return "The Forge swallows your offering… and gives nothing back.";
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
  recompute(h);
  return out;
}

/** Pairs of identical items the hero could combine. */
export function combinablePairs(run: Run): [GearItem, GearItem][] {
  const h = run.hero;
  const all = [...Object.values(h.equip).filter((x): x is GearItem => !!x), ...h.backpack].filter(i => i.rarity !== "legendary" && i.rarity !== "crimson" && !baseOf(i.base).noJewel && !i.infused);
  const pairs: [GearItem, GearItem][] = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (all[i].base === all[j].base) pairs.push([all[i], all[j]]);
  return pairs;
}

export const TRANSMUTE_COST = 4;

/** With the Transmuter's Crucible: a Common item + 4 Starmetal becomes an (unrevealed) Legendary of the same kind. */
export function forgeTransmute(run: Run, uid: number): GearItem | string {
  const h = run.hero;
  if (!h.crucible) return "You need the Transmuter's Crucible.";
  const found = findItem(h, uid);
  if (!found || found.item.rarity !== "common") return "Only Common items can be transmuted.";
  if (h.starmetal < TRANSMUTE_COST) return `Needs ${TRANSMUTE_COST} Starmetal.`;
  const slot = effectiveBase(found.item).slot;
  const pool = LEGENDARIES.filter(l => l.slot === slot && !isLocked(l.id));
  const fitting = pool.filter(l => (l.legendary?.minFloor ?? 1) <= run.floor);
  const choice = (fitting.length ? fitting : pool)[Math.floor(run.rng() * (fitting.length || pool.length))];
  if (!choice) return "Nothing answers the Crucible.";
  h.starmetal -= TRANSMUTE_COST;
  const where = found.where;
  removeGear(h, uid);
  const out: GearItem = { uid: h.nextUid++, base: choice.id, rarity: "legendary", level: Math.max(found.item.level, depth(run)), bonuses: {}, revealed: false };
  if (where !== "backpack") equipItem(h, out, where);
  else if (h.backpack.length < BACKPACK_SIZE) h.backpack.push(out);
  markFound(run, out);
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
    const w = pool.map(t => (out.includes(t.id) ? 0 : (1 + 0.4 * t.tags.reduce((s, x) => s + Math.min(tags.get(x) ?? 0, 3), 0)) * (t.rarity === "rare" ? 0.3 : 1)));
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
  if (!fromTalent) {
    if (run.step >= STEPS_PER_FLOOR) {
      // After a floor boss, stop on a "Floor cleared" screen; the player continues when ready.
      // (Not after the campaign's final boss: that goes straight to the victory.)
      const finalBoss = (run.mode === "campaign" && run.floor >= FLOORS) || (run.mode === "abyss" && run.floor >= ABYSS_FLOORS);
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
      run.message = `Floor ${run.floor}. The air is colder, and the hoards are richer: your Fortune grows.`;
      if (run.mode === "abyss") {
        if (run.floor > ABYSS_FLOORS) { run.scene = { t: "over", won: true }; return; }
        run.message = `Abyss depth ${run.floor}. Everything down here is stronger — and so is what it carries.`;
        run.popup = { icon: "🕳️", title: `The Abyss — Depth ${run.floor}`, text: ABYSS_LINES[(run.floor - 2) % ABYSS_LINES.length] };
      } else if (run.floor !== FLOORS) run.popup = { icon: "⬇️", title: `Floor ${run.floor} — ${floorName(run.floor)}`, text: `${FLOOR_LINES[(run.floor - 2) % FLOOR_LINES.length]} The deeper you go, the deadlier it gets — and the richer the loot.` };
      if (run.floor === FLOORS && run.mode !== "abyss") run.popup = { icon: "🕳️", title: `Floor ${FLOORS} — The Source of the Darkness`, text: "You are close now. The darkness here is thick enough to taste, and every step pulls at you. A cold despair settles in your chest, whispering that the gate cannot be closed, that no one walks back out. Somewhere below, the gate breathes." };
      if (run.floor > FLOORS && run.mode === "campaign") {
        run.scene = { t: "over", won: true };
        return;
      }
    } else run.step++;
  }
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
  if (!offer) return;
  run.bounty = { ...offer, base: run.hero.f.persist[offer.kind === "status" ? `q_st_${offer.status}` : `q_${offer.kind}`] ?? 0 };
  run.message = `📋 Contract taken: ${bountyText(offer, run.hero.origin)} within ${offer.roomsLeft} rooms.`;
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

export function jewelMode(run: Run, mode: "fuse" | "infuse") {
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
  if (slot.kind === "relic") {
    if (s.mode === "infuse") return "Only gear can be infused.";
    if (!run.hero.relics[slot.id]) return null;
  } else {
    const it = findItem(run.hero, slot.uid)?.item;
    if (!it) return null;
    if (s.mode === "infuse") {
      if (isTrinket(it)) { s.right = slot; return null; }
      if (isInfusable(it)) { s.left = slot; return null; }
      return "Only weapons, off-hands, armour and trinkets.";
    }
    if (!isTrinket(it)) return "Only trinkets and relics can be fused.";
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
  if (s.left.kind !== "item" || s.right.kind !== "item") return "Relics only fuse with relics, and trinkets with trinkets.";
  const A = slotItem(run, s.left)?.item, B = slotItem(run, s.right)?.item;
  if (!A || !B) return "Put something in both slots first.";
  for (const it of [A, B]) {
    if (!JEWEL_RARITIES.includes(it.rarity)) return "Only Rare, Epic and Legendary pieces can go on this bench.";
    if ((it.upgrades ?? 0) > 0) return `"Someone's already worked on this ${baseOf(it.base).name}. I won't touch it." (Upgraded items can't be fused or infused.)`;
    if (baseOf(it.base).noJewel) return `The ${baseOf(it.base).name} resists. It can't be fused or infused.`;
    if (it.rarity === "legendary" && !it.revealed) return "Reveal that Legendary first.";
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
    plates: run.hero.plates ?? 0, daily: run.daily,
    level: run.hero.level, kills: run.stats.kills, elites: p["q_elites"] ?? 0, champions: p["q_champions"] ?? 0,
    damage: Math.round(p["t_dmg"] ?? 0), bestHit: Math.round(Math.max(p["t_best"] ?? 0, run.stats.bestHit)), gold: run.goldEarned ?? 0
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

/** Give the hero Scrolls of Revelation and queue their popup. */
export function grantScrolls(run: Run, n: number) {
  if (n <= 0) return;
  run.hero.scrolls += n;
  (run.relicNews ??= []).push(`scroll:${n}`);
}

/** Heal the hero outside a fight. Curses that cut healing (Withered, Unhealing) apply here too. */
export function restore(h: Hero, amount: number) {
  let a = amount;
  eachHook(h.f, "healMult", (hm, n) => (a = Math.floor(a * hm(n))));
  if (a > 0) h.f.hp = Math.min(h.f.maxHp, h.f.hp + a);
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
  found.item.level++;
  found.item.upgrades = (found.item.upgrades ?? 0) + 1;
  for (const k of Object.keys(found.item.bonuses)) found.item.bonuses[k]++;
  recompute(run.hero);
  s.uses--;
  return null;
}

// ---------- The Alchemist: combat tonics ----------
export const TONICS: Record<string, { name: string; icon: string; text: string; base: number }> = {
  might: { name: "Tonic of Might", icon: "💪", text: "Your next 3 attacks deal +4", base: 70 },
  weakness: { name: "Draught of Weakness", icon: "🥀", text: "The enemy is Weak for 3 rounds", base: 60 },
  barrier: { name: "Shellskin Elixir", icon: "🛡️", text: "Gain Barrier equal to 30% of your Max HP (it fades by half each round)", base: 75 },
  sunder: { name: "Armour-Rot Acid", icon: "🧪", text: "Halve the enemy's Armor for the rest of the fight", base: 90 },
  poison: { name: "Vial of Venom", icon: "☠️", text: "Apply 6 Poison, more on deeper floors", base: 65 },
  blind: { name: "Flash Powder", icon: "🌫️", text: "Blind the enemy for 3 rounds", base: 70 }
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
  const ids = Object.keys(TONICS).sort(() => run.rng() - 0.5).slice(0, 4);
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
  b.log.push(`${TONICS[id].icon} ${TONICS[id].name}!`);
  b.fx.push({ who: id === "might" || id === "barrier" ? "player" : "enemy", kind: "text", text: TONICS[id].name, icon: TONICS[id].icon });
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
