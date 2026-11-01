// A run: three floors of path choices, fights, chests, shops, forges and bosses.
import { relicBonus } from "../data/basic_relics";
import { CURSES, EPIC_POWERS, KEEPSAKES, LEGENDARIES, RELICS, TALENTS } from "../data";
import { CAMPAIGN_FLOORS, DEATH_FLOOR, END_FLOOR, EPIC_CRIMSON_FLOORS, makeBoss, makeCrimsonBoss, WALL_FLOOR } from "../data/bosses";
import { EVENTS, type GameEvent } from "../data/events";
import { FUSION_RECIPES } from "../data/fusions";
import { makeGoblin, makeMonster, makeThief, makeUnique, type MonsterRank, UNIQUES } from "../data/monsters";
import { type Action, actionToll, playRound, startBattle } from "../engine/combat";
import { eachHook, getItem } from "../engine/registry";
import { makeRng } from "../engine/rng";
import { heal as healF } from "../engine/statuses";
import type { Battle, GearItem, OriginId, Rarity } from "../engine/types";
import { RARITIES } from "../engine/types";
import { addToBackpack, canGuard, BACKPACK_SIZE, baseOf, effectiveBase, equipItem, findItem, type Hero, heroTags, newHero, recompute, removeGear, rerollCost, MAX_REROLLS, scrapValue, upgradeCost, xpToLevel } from "./hero";
import { isLocked, type LootState, resetDropped, type ResplendentCard, resplendentCards, makeRewardItem, rollEpicCrimson, rollItem, rollRarity, setLocked, TABLES } from "./loot";

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

/** The campaign is five floors (five bosses). Endless keeps going; a Horror waits on floor 30. */
export const FLOORS = CAMPAIGN_FLOORS;
export const STEPS_PER_FLOOR = 7;
export { DEATH_FLOOR, END_FLOOR, WALL_FLOOR };
export type Mode = "campaign" | "endless";

export type RoomType = "fight" | "elite" | "champion" | "wooden" | "iron" | "vault" | "altar" | "shrine" | "shop" | "forge" | "rest" | "event" | "boss" | "crimson_elite" | "crimson_vault" | "unique" | "goblin";

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
  rest: { name: "Campfire", icon: "🔥", text: "Heal, or cleanse a curse." },
  event: { name: "Something Strange", icon: "❔", text: "A meeting, a find, a gamble." },
  boss: { name: "Boss", icon: "👑", text: "The guardian of this floor." },
  unique: { name: "A Strange Presence", icon: "✴️", text: "Someone — something — with a name. Dangerous, once per run, and carrying something rare." },
  crimson_elite: { name: "Crimson Elite", icon: "🩸", text: "Rarer and deadlier than a Champion. Great loot, and often a Crimson Key." },
  goblin: { name: "Treasure Goblin", icon: "💰", text: "A Treasure Goblin, stuffed with loot! Kill it within 3 rounds before it escapes, and everything it carries is yours." },
  crimson_vault: { name: "Crimson Vault", icon: "🗝️", text: "Spend a Crimson Key: fight a Crimson boss for a Crimson item. Die here and your run is over." }
};

export interface ShopEntry { kind: "item" | "potion" | "mana" | "scroll" | "relic"; item?: GearItem; relic?: string; price: number; sold?: boolean }

export type Scene =
  | { t: "map" }
  | { t: "combat"; battle: Battle; rank: MonsterRank; then?: "resplendent" | "mimic" | "crimson" | "unique" | "goblin" }
  | { t: "loot"; title: string; items: GearItem[]; gold: number; scrolls: number; relic?: string; potions: number; then?: "resplendent"; crimsonKey?: boolean }
  | { t: "resplendent"; cards: ResplendentCard[]; picked: number | null; glove: boolean }
  | { t: "pick"; title: string; items: GearItem[]; passed?: GearItem[]; /** A Keepsake on offer (bosses after floor 5). */ keepsake?: string }
  | { t: "talent"; options: string[] }
  | { t: "shop"; stock: ShopEntry[]; /** One item may be sold per Merchant visit. */ soldItem?: string }
  | { t: "forge" }
  | { t: "rest"; done: boolean }
  | { t: "confirm"; room: RoomType }
  | { t: "event"; ev: GameEvent; result: string | null; found: GearItem[]; note?: string }
  | { t: "smith"; uses: number }
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
  /** Ids found this run (for the Codex between runs). */
  found: Set<string>;
  /** Ids allowed in loot this run (unlocked by Renown); empty = everything. */
  locked: Set<string>;
  /** Named bosses already met this run. */
  seenBosses: Set<string>;
  /** Shop rerolls used at the current Merchant (each costs more). */
  shopRerolls: number;
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
  /** Beat THE END on floor 90: the whole game is won. */
  finale?: boolean;
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
      "💎 Fallen bosses sometimes leave a Keepsake, a rare charm that sits beside your trinkets.",
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
  // Holding a Crimson Key: a Crimson Vault is always offered as an extra path.
  if (crimsonActive(run) && run.hero.crimsonKeys > 0) rooms.push("crimson_vault");
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
      run.scene = { t: "loot", title: "Wooden Chest", items: [rollItem(h, rollRarity(run.rng, TABLES.wooden, run.floor), run.floor, run.rng)], gold: 3 + run.floor, scrolls: 0, potions: run.rng() < 0.2 ? 1 : 0 };
      return;
    case "iron": {
      const key = (h.relics["skeleton_key"] ?? 0) > 0;
      if (!key && run.rng() < 1 / 6) {
        run.message = "The chest bites! It's a Mimic.";
        return fight(run, "elite", "mimic");
      }
      const items = [rollItem(h, rollRarity(run.rng, TABLES.iron, run.floor), run.floor, run.rng)];
      if (key) items.push(rollItem(h, rollRarity(run.rng, TABLES.iron, run.floor), run.floor, run.rng));
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
    case "shop": run.shopRerolls = 0; run.scene = { t: "shop", stock: shopStock(run) }; return;
    case "forge": run.scene = { t: "forge" }; return;
    case "rest": run.scene = { t: "rest", done: false }; return;
    case "event": {
      // Unique encounters (the dragon, the mirror pool) happen at most once per run.
      const pool = EVENTS.filter(e => !e.unique || !run.seenBosses.has(`e:${e.id}`));
      const ev = pool[Math.floor(run.rng() * pool.length)];
      if (ev.unique) run.seenBosses.add(`e:${ev.id}`);
      // The Wandering Blacksmith: two free upgrades at his anvil.
      if (ev.id === "blacksmith") { run.scene = { t: "smith", uses: 2 }; return; }
      run.scene = { t: "event", ev, result: null, found: [] };
      return;
    }
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
  run.scene = { t: "resplendent", cards: resplendentCards(run.hero, run.floor, run.loot, run.rng), picked: null, glove: (run.hero.relics["gamblers_glove"] ?? 0) > 0 };
}

// ---------- Combat ----------

function fight(run: Run, rank: MonsterRank, then?: "resplendent" | "mimic" | "crimson" | "unique" | "goblin") {
  run.hero.f.persist["floor"] = run.floor;
  // A Crimson Vault always holds a Crimson boss; in Endless, a floor boss is rarely Crimson too.
  // (Never on the floors with a special boss: the Horror, the Epic Crimson floors, DEATH and the End.)
  const special = run.floor === WALL_FLOOR || EPIC_CRIMSON_FLOORS.includes(run.floor) || run.floor === DEATH_FLOOR || run.floor === END_FLOOR;
  const crimsonBoss = rank === "boss" && (then === "crimson" || (crimsonActive(run) && !special && run.rng() < 0.06));
  // A rare gold thief sometimes turns up in place of a normal monster.
  const thief = rank === "normal" && !then && run.rng() < 0.04;
  const enemy = then === "goblin" ? makeGoblin(run.rng, run.floor) : then === "unique" ? makeUnique(run.rng, run.floor, run.seenBosses) : crimsonBoss ? makeCrimsonBoss(run.floor, run.rng) : rank === "boss" ? makeBoss(run.floor, run.rng, run.seenBosses) : thief ? makeThief(run.rng, run.floor) : makeMonster(run.rng, run.floor, rank);
  if (then === "mimic") {
    enemy.name = "Mimic";
    enemy.items["m_ambush"] = 1;
  }
  const battle = startBattle(run.hero.f, enemy, Math.floor(run.rng() * 1e9), run.carry);
  run.carry = 0;
  run.scene = { t: "combat", battle, rank, then };
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

/** After the UI has played a phase, finish the fight if it's over. */
export function settleCombat(run: Run) {
  if (run.scene.t === "combat" && run.scene.battle.over) afterFight(run);
}

/** Mana Potion: spells hit 50% harder, and statuses they apply get +1, for the rest of the fight. */
export function drinkMana(run: Run): string | null {
  const h = run.hero;
  if (run.scene.t !== "combat" || run.scene.battle.over || h.f.hp <= 0) return "Mana Potions only work in a fight.";
  if (h.manaPotions <= 0) return null;
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

export function drinkPotion(run: Run) {
  const h = run.hero;
  // The dead don't drink: no potions once you've fallen or the run is over.
  if (h.potions <= 0 || h.f.hp <= 0 || run.scene.t === "over") return;
  if (run.scene.t === "combat" && run.scene.battle.over) return;
  h.potions--;
  let amount = h.f.items["l_bottomless"] ? Math.ceil(h.f.maxHp / 2) : 12;
  if (h.f.items["c_famine"]) amount = Math.ceil(amount / 2);
  if (run.scene.t === "combat") { actionToll(run.scene.battle, h.f); healF(run.scene.battle, h.f, amount, "Potion"); }
  else restore(h, amount);
}

function afterFight(run: Run) {
  if (run.scene.t !== "combat") return;
  const { battle: b, rank, then } = run.scene;
  const h = run.hero;
  const curseNote = applyQueuedCurses(run);
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
  if (b.over === "escaped") {
    run.message = (then === "goblin" ? "💨 The Treasure Goblin cackles and vanishes, hoard and all." : `${b.enemy.name} got away with your Gold.`) + (curseNote ? ` ${curseNote}` : "");
    return advance(run);
  }
  run.carry = b.carry;
  run.stats.kills++;
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
  const roll = (odds: Partial<Record<Rarity, number>>) => rollItem(h, rollRarity(run.rng, odds, run.floor), run.floor, run.rng);
  if (rank === "normal" && run.rng() < 0.2) items.push(roll(TABLES.drop));
  if (rank === "normal" && run.rng() < 0.1) potions++;
  if ((rank === "normal" && run.rng() < 0.05) || (rank === "elite" && run.rng() < 0.15)) {
    h.manaPotions++;
    run.message = "You find a Mana Potion. 🔷";
  }
  let goblinGold = 0;
  if (then === "goblin") {
    // Treasure Goblin: a guaranteed Rare and a fat purse, maybe an Epic, a Legendary or a scroll. All of it is yours.
    goblinGold = 25 + 8 * run.floor;
    items.push(rollItem(h, "rare", run.floor, run.rng));
    if (run.rng() < 0.45) items.push(rollItem(h, "epic", run.floor, run.rng));
    if (run.rng() < 0.1) items.push(rollItem(h, "legendary", run.floor, run.rng));
    if (run.rng() < 0.35) scrolls++;
    run.message = "💰 The Treasure Goblin bursts open. Everything it carried is yours.";
  } else if (then === "unique") {
    // Unique foes: always an Epic (sometimes a Legendary), a good relic and a fat purse.
    items.push(rollItem(h, run.rng() < 0.15 ? "legendary" : "epic", run.floor, run.rng));
    relic = randomRelic(run, 2);
    if (run.rng() < 0.3) scrolls++;
  } else if (rank === "elite") {
    items.push(roll(TABLES.elite));
    if (then === "mimic") items.push(roll(TABLES.elite));
    if (run.rng() < 0.35) relic = randomRelic(run);
  }
  if (rank === "champion") {
    items.push(roll(TABLES.champion));
    if (run.rng() < 0.2) scrolls++;
    const metal = run.rng() < 0.65 ? 1 + (run.rng() < 0.25 ? 1 : 0) : 0;
    if (metal) {
      h.starmetal += metal;
      run.message = `The Champion leaves ${metal} Starmetal behind.`;
    }
    if (!h.relics["transmuter"] && run.rng() < 0.12) relic = "transmuter";
    relic = relic ?? randomRelic(run, 2);
  }
  if (rank === "crimson") {
    items.push(roll(TABLES.crimson));
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
      run.message = `+${gold} Gold`;
      return;
    }
    // Crimson bosses offer a Crimson item alongside two boss finds; the bosses of floors 30–70 offer an Epic Crimson.
    const offer = b.enemy.crimson ? [rollItem(h, "crimson", run.floor, run.rng), roll(TABLES.boss), roll(TABLES.boss)]
      : EPIC_CRIMSON_FLOORS.includes(run.floor) ? [rollEpicCrimson(h, run.floor, run.rng), roll(TABLES.boss), roll(TABLES.boss)]
      : [roll(TABLES.boss), roll(TABLES.boss), roll(TABLES.boss)];
    // After the fifth boss, bosses sometimes leave a Keepsake behind.
    // Keepsakes are a rare find: about one boss in ten after floor 5 leaves one behind.
    const keepsake = run.floor > FLOORS && run.rng() < 0.1 ? KEEPSAKES.filter(k => k.id !== h.keepsake)[Math.floor(run.rng() * (KEEPSAKES.length - (h.keepsake ? 1 : 0)))]?.id : undefined;
    run.scene = { t: "pick", title: `${b.enemy.name} falls! Choose one`, items: offer, keepsake };
    run.message = `+${gold} Gold${relic ? ` · relic: ${getItem(relic).name}` : ""}${scrolls ? " · a Scroll of Revelation" : ""} · healed 30%${curseNote ? ` ${curseNote}` : ""}`;
    return;
  }
  // Relics are yours the moment the fight ends (and get a popup), not when you leave the loot screen.
  if (relic) grantRelic(run, relic);
  if (scrolls) grantScrolls(run, scrolls);
  run.scene = { t: "loot", title: then === "goblin" ? "The Treasure Goblin's hoard" : then === "mimic" ? "The Mimic's hoard" : thiefPay ? `You caught the ${b.enemy.name}!` : "Victory", items, gold: gold + goblinGold, scrolls, relic, potions, then: then === "resplendent" ? "resplendent" : undefined, crimsonKey: keyFound || undefined };
  const notes = [run.message, thiefPay ? `It drops its stash: +${thiefPay} Gold (60% of your purse).` : "", golemScrap ? `The golem breaks apart: +${golemScrap} ⚙️ Scrap.` : "", curseNote].filter(Boolean);
  run.message = notes.join(" ");
}

/** Curses laid on you mid-fight (Accursed Elites, Malediction) land when the fight ends. */
function applyQueuedCurses(run: Run): string {
  const h = run.hero;
  const n = h.f.persist["curseQueue"] ?? 0;
  if (!n) return "";
  h.f.persist["curseQueue"] = 0;
  const names: string[] = [];
  for (let i = 0; i < n; i++) {
    const c = CURSES[Math.floor(run.rng() * CURSES.length)];
    h.curses[c.id] = (h.curses[c.id] ?? 0) + 1;
    names.push(`${c.name} (${c.text})`);
  }
  recompute(h);
  return `🕯️ You are cursed: ${names.join(", ")}. A Campfire can cleanse it.`;
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
export function randomRelic(run: Run, quality = 1): string {
  const tags = heroTags(run.hero);
  const pool = RELICS.filter(r => !isLocked(r.id) && r.id !== "transmuter");
  const w = pool.map(r => relicRarityWeight(r.rarity ?? "common", run.floor, quality) * (1 + 0.3 * r.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0)));
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
  h.potions += s.potions;
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
  if (run.scene.t === "loot") {
    collectLoot(run);
    if (run.scene.then === "resplendent") return openResplendent(run);
  }
  advance(run);
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
    const item = rollItem(h, rollRarity(run.rng, TABLES.shop, run.floor), run.floor, run.rng);
    stock.push({ kind: "item", item, price: Math.round(PRICE[item.rarity] * priceMult(run)) });
  }
  const shopRelic = randomRelic(run);
  stock.push({ kind: "relic", relic: shopRelic, price: Math.round((({ common: 40, uncommon: 55, rare: 85, legendary: 160 } as Record<string, number>)[getItem(shopRelic).rarity ?? "common"] ?? 50) * priceMult(run)) });
  stock.push({ kind: "potion", price: Math.round(15 * priceMult(run)) });
  if (run.rng() < 0.5) stock.push({ kind: "mana", price: Math.round(25 * priceMult(run)) });
  if (run.rng() < 0.12) stock.push({ kind: "scroll", price: Math.round(100 * priceMult(run)) });
  return stock;
}

export function buy(run: Run, i: number): string | null {
  if (run.scene.t !== "shop") return null;
  const e = run.scene.stock[i];
  const h = run.hero;
  if (!e || e.sold) return null;
  if (h.f.gold < e.price) return "Not enough Gold.";
  if (e.kind === "item" && e.item) {
    const err = addToBackpack(h, e.item);
    if (err) return err;
  }
  if (e.kind === "potion") h.potions++;
  if (e.kind === "mana") h.manaPotions++;
  if (e.kind === "scroll") h.scrolls++;
  if (e.kind === "item" && e.item) markFound(run, e.item);
  if (e.kind === "relic" && e.relic) grantRelic(run, e.relic);
  h.f.gold -= e.price;
  e.sold = true;
  return null;
}

/** What a Merchant pays for an item: 40% of its shop price, plus a little per level. */
export const sellPrice = (item: GearItem) => Math.round(PRICE[item.rarity] * 0.4) + 2 * (item.level - 1);

/** Sell one item (equipped or in the bag) — once per Merchant visit. */
export function sellItem(run: Run, uid: number): string | null {
  const s = run.scene;
  if (s.t !== "shop") return null;
  if (s.soldItem) return "This Merchant has already bought something from you.";
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  const price = sellPrice(found.item);
  removeGear(h, uid);
  recompute(h);
  h.f.gold += price;
  lockGold(run);
  s.soldItem = `${baseOf(found.item.base).legendary && !found.item.revealed ? "an unrevealed Legendary" : baseName(found.item)} for ${price} Gold`;
  return null;
}

/** Shop prices grow with the floor: +12% per floor below the first. */
export const priceMult = (run: Run) => 1 + 0.12 * (run.floor - 1);
/** Each reroll at the same Merchant costs double the last (from 10 Gold, scaled by the floor), up to 5 rerolls per visit. */
export const MAX_SHOP_REROLLS = 5;
export const shopRerollCost = (run: Run) => Math.round(10 * priceMult(run)) * 2 ** run.shopRerolls;

export function rerollShop(run: Run): string | null {
  if (run.scene.t !== "shop") return null;
  if (run.shopRerolls >= MAX_SHOP_REROLLS) return "The Merchant has nothing else to show you.";
  const cost = shopRerollCost(run);
  if (run.hero.f.gold < cost) return "Not enough Gold.";
  run.hero.f.gold -= cost;
  run.shopRerolls++;
  run.scene = { ...run.scene, stock: shopStock(run) };
  return null;
}

export function forgeUpgrade(run: Run, uid: number): string | null {
  const h = run.hero;
  const found = findItem(h, uid);
  if (!found) return null;
  const cost = upgradeCost(found.item);
  if (h.scrap < cost) return `Needs ${cost} Scrap.`;
  h.scrap -= cost;
  found.item.level++;
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
  const cost = rerollCost(found.item);
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

export function rest(run: Run, choice: "heal" | "cleanse"): string | null {
  const h = run.hero;
  if (run.scene.t !== "rest" || run.scene.done) return null;
  if (choice === "heal") restore(h, Math.round(h.f.maxHp * 0.4));
  else {
    const ids = Object.keys(h.curses);
    if (!ids.length) return "You have no curses.";
    delete h.curses[ids[0]];
    recompute(h);
  }
  run.scene.done = true;
  return null;
}

// ---------- Events ----------

export function chooseEvent(run: Run, i: number) {
  const s = run.scene;
  if (s.t !== "event" || s.result) return;
  const h = run.hero;
  const found: GearItem[] = [];
  const ctx = {
    rng: run.rng,
    gold: () => h.f.gold,
    addGold: (n: number) => { h.f.gold = Math.max(0, h.f.gold + n); },
    hp: () => h.f.hp,
    hurt: (n: number) => { h.f.hp = Math.max(1, h.f.hp - n); },
    healPct: (p: number) => { restore(h, Math.round(h.f.maxHp * p)); },
    addMaxHp: (n: number) => { h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) - n; recompute(h); h.f.hp += n; },
    gainItem: (r: Rarity) => { const it = rollItem(h, r, run.floor, run.rng); found.push(it); return it; },
    gainRelic: () => { const id = randomRelic(run); grantRelic(run, id); return getItem(id).name; },
    loseRelic: () => { const ids = Object.keys(h.relics); if (!ids.length) return null; const id = ids[Math.floor(run.rng() * ids.length)]; h.relics[id]--; if (!h.relics[id]) delete h.relics[id]; recompute(h); return getItem(id).name; },
    relicCount: () => Object.keys(h.relics).length,
    addCurse: () => { const c = CURSES[Math.floor(run.rng() * CURSES.length)]; h.curses[c.id] = (h.curses[c.id] ?? 0) + 1; recompute(h); return c.name; },
    clearCurses: () => { const n = Object.keys(h.curses).length; h.curses = {}; recompute(h); return n; },
    addXp: (n: number) => gainXp(run, n),
    addScrolls: (n: number) => { grantScrolls(run, n); },
    addPotions: (n: number) => { h.potions += n; },
    addScrap: (n: number) => { h.scrap += n; },
    addPity: (n: number) => { run.loot.pity += n; },
    potions: () => h.potions,
    upgradeWeapon: () => { const w = h.equip.main; if (!w) return "You have no weapon."; w.level++; for (const k of Object.keys(w.bonuses)) w.bonuses[k]++; recompute(h); return null; }
  };
  const opt = s.ev.options[i];
  if (!opt || (opt.can && !opt.can(ctx))) return;
  const result = opt.run(ctx);
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
  return opt.can({ gold: () => h.f.gold, hp: () => h.f.hp, relicCount: () => Object.keys(h.relics).length, potions: () => h.potions } as never);
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
  const items = uids.map(u => h.backpack.find(i => i.uid === u)).filter((x): x is GearItem => !!x);
  if (items.length < 2) return "Offer at least two items from your bag.";
  for (const it of items) removeGear(h, it.uid);
  // The Forge doesn't always answer: sometimes the offering is simply lost.
  if (run.rng() * 100 < OFFERING_FAIL) {
    recompute(h);
    return "The Forge swallows your offering… and gives nothing back.";
  }
  const rarity = rollRarity(run.rng, offeringOdds(offeringValue(items)));
  const out = rollItem(h, rarity, Math.max(run.floor, ...items.map(i => i.level)), run.rng);
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
  const out: GearItem = { uid: h.nextUid++, base: top.base, rarity, level, bonuses, epic, revealed: true };
  if (wasEquipped && wasEquipped !== "backpack") equipItem(h, out, wasEquipped);
  else h.backpack.push(out);
  markFound(run, out);
  recompute(h);
  return out;
}

/** Pairs of identical items the hero could combine. */
export function combinablePairs(run: Run): [GearItem, GearItem][] {
  const h = run.hero;
  const all = [...Object.values(h.equip).filter((x): x is GearItem => !!x), ...h.backpack].filter(i => i.rarity !== "legendary" && i.rarity !== "crimson");
  const pairs: [GearItem, GearItem][] = [];
  for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) if (all[i].base === all[j].base) pairs.push([all[i], all[j]]);
  return pairs;
}

export const TRANSMUTE_COST = 4;

/** With the Transmuter's Crucible: a Common item + 4 Starmetal becomes an (unrevealed) Legendary of the same kind. */
export function forgeTransmute(run: Run, uid: number): GearItem | string {
  const h = run.hero;
  if (!h.relics["transmuter"]) return "You need the Transmuter's Crucible.";
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
  const out: GearItem = { uid: h.nextUid++, base: choice.id, rarity: "legendary", level: Math.max(found.item.level, run.floor), bonuses: {}, revealed: false };
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
      const finalBoss = run.mode === "campaign" && run.floor >= FLOORS;
      if (!finalBoss && run.clearedFloor !== run.floor) {
        run.clearedFloor = run.floor;
        run.scene = { t: "cleared", floor: run.floor, boss: run.lastBoss ?? "The guardian" };
        return;
      }
      run.floor++;
      run.step = 0;
      run.message = `Floor ${run.floor}. The air is colder, and the hoards are richer: your Fortune grows.`;
      if (run.floor !== FLOORS) run.popup = { icon: "⬇️", title: `Floor ${run.floor} — ${floorName(run.floor)}`, text: `${FLOOR_LINES[(run.floor - 2) % FLOOR_LINES.length]} The deeper you go, the deadlier it gets — and the richer the loot.` };
      if (run.floor === FLOORS) run.popup = { icon: "🕳️", title: `Floor ${FLOORS} — The Source of the Darkness`, text: "You are close now. The darkness here is thick enough to taste, and every step pulls at you. A cold despair settles in your chest, whispering that the gate cannot be closed, that no one walks back out. Somewhere below, the gate breathes." };
      if (run.floor > FLOORS && run.mode === "campaign") {
        run.scene = { t: "over", won: true };
        return;
      }
    } else run.step++;
  }
  if (run.pendingTalents > 0) {
    run.scene = { t: "talent", options: talentOptions(run) };
    return;
  }
  run.choices = genChoices(run);
  run.scene = { t: "map" };
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
  h.relics[id] = (h.relics[id] ?? 0) + 1;
  run.found.add(id);
  (run.relicNews ??= []).push(id);
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
  for (const k of Object.keys(found.item.bonuses)) found.item.bonuses[k]++;
  recompute(run.hero);
  s.uses--;
  return null;
}
