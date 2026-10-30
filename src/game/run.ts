// A run: three floors of path choices, fights, chests, shops, forges and bosses.
import { CURSES, EPIC_POWERS, LEGENDARIES, RELICS, TALENTS } from "../data";
import { CAMPAIGN_FLOORS, makeBoss, makeCrimsonBoss, WALL_FLOOR } from "../data/bosses";
import { EVENTS, type GameEvent } from "../data/events";
import { FUSION_RECIPES } from "../data/fusions";
import { makeMonster, makeThief, type MonsterRank } from "../data/monsters";
import { type Action, playRound, startBattle } from "../engine/combat";
import { getItem } from "../engine/registry";
import { makeRng } from "../engine/rng";
import { heal as healF } from "../engine/statuses";
import type { Battle, GearItem, OriginId, Rarity } from "../engine/types";
import { RARITIES } from "../engine/types";
import { addToBackpack, BACKPACK_SIZE, baseOf, effectiveBase, equipItem, findItem, type Hero, heroTags, newHero, recompute, removeGear, rerollCost, upgradeCost, xpToLevel } from "./hero";
import { isLocked, type LootState, resetDropped, type ResplendentCard, resplendentCards, rollItem, rollRarity, setLocked, TABLES } from "./loot";

/** The campaign is five floors (five bosses). Endless keeps going; floor 30 is the wall. */
export const FLOORS = CAMPAIGN_FLOORS;
export const STEPS_PER_FLOOR = 7;
export { WALL_FLOOR };
export type Mode = "campaign" | "endless";

export type RoomType = "fight" | "elite" | "champion" | "wooden" | "iron" | "vault" | "altar" | "shrine" | "shop" | "forge" | "rest" | "event" | "boss" | "crimson_elite" | "crimson_vault";

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
  crimson_elite: { name: "Crimson Elite", icon: "🩸", text: "Rarer and deadlier than a Champion. Great loot, and often a Crimson Key." },
  crimson_vault: { name: "Crimson Vault", icon: "🗝️", text: "Spend a Crimson Key: fight a Crimson boss for a Crimson item. Dying here doesn't end your run." }
};

export interface ShopEntry { kind: "item" | "potion" | "scroll" | "relic"; item?: GearItem; relic?: string; price: number; sold?: boolean }

export type Scene =
  | { t: "map" }
  | { t: "combat"; battle: Battle; rank: MonsterRank; then?: "resplendent" | "mimic" | "crimson" }
  | { t: "loot"; title: string; items: GearItem[]; gold: number; scrolls: number; relic?: string; potions: number; then?: "resplendent" }
  | { t: "resplendent"; cards: ResplendentCard[]; picked: number | null; glove: boolean }
  | { t: "pick"; title: string; items: GearItem[]; passed?: GearItem[] }
  | { t: "talent"; options: string[] }
  | { t: "shop"; stock: ShopEntry[]; /** One item may be sold per Merchant visit. */ soldItem?: string }
  | { t: "forge" }
  | { t: "rest"; done: boolean }
  | { t: "confirm"; room: RoomType }
  | { t: "event"; ev: GameEvent; result: string | null; found: GearItem[] }
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
  if (run.step === 0) { w.elite = 0; w.champion = 0; w.vault = 0; w.crimson_elite = 0; }
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
    case "event": run.scene = { t: "event", ev: EVENTS[Math.floor(run.rng() * EVENTS.length)], result: null, found: [] }; return;
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

function fight(run: Run, rank: MonsterRank, then?: "resplendent" | "mimic" | "crimson") {
  run.hero.f.persist["floor"] = run.floor;
  // A Crimson Vault always holds a Crimson boss; in Endless, a floor boss is rarely Crimson too.
  const crimsonBoss = rank === "boss" && (then === "crimson" || (crimsonActive(run) && run.floor !== WALL_FLOOR && run.rng() < 0.06));
  // A rare gold thief sometimes turns up in place of a normal monster.
  const thief = rank === "normal" && !then && run.rng() < 0.04;
  const enemy = crimsonBoss ? makeCrimsonBoss(run.floor, run.rng) : rank === "boss" ? makeBoss(run.floor, run.rng, run.seenBosses) : thief ? makeThief(run.rng, run.floor) : makeMonster(run.rng, run.floor, rank);
  if (then === "mimic") {
    enemy.name = "Mimic";
    enemy.items["m_ambush"] = 1;
  }
  const battle = startBattle(run.hero.f, enemy, Math.floor(run.rng() * 1e9), run.carry);
  run.carry = 0;
  run.scene = { t: "combat", battle, rank, then };
  if (battle.over) afterFight(run);
}

export function combatAction(run: Run, action: Action) {
  if (run.scene.t !== "combat") return;
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

export function drinkPotion(run: Run) {
  const h = run.hero;
  if (h.potions <= 0) return;
  h.potions--;
  let amount = h.f.items["l_bottomless"] ? Math.ceil(h.f.maxHp / 2) : 12;
  if (h.f.items["c_famine"]) amount = Math.ceil(amount / 2);
  if (run.scene.t === "combat") healF(run.scene.battle, h.f, amount, "Potion");
  else h.f.hp = Math.min(h.f.maxHp, h.f.hp + amount);
}

function afterFight(run: Run) {
  if (run.scene.t !== "combat") return;
  const { battle: b, rank, then } = run.scene;
  const h = run.hero;
  const curseNote = applyQueuedCurses(run);
  if (b.over === "lost") {
    // A Crimson Vault doesn't kill you: you crawl out and carry on.
    if (then === "crimson") {
      h.f.hp = Math.max(1, Math.ceil(h.f.maxHp * 0.25));
      h.f.persist["crimsonEscapes"] = (h.f.persist["crimsonEscapes"] ?? 0) + 1;
      run.message = `${b.enemy.name} casts you out of the vault. You crawl away at ${h.f.hp} HP; the key is spent.${curseNote ? ` ${curseNote}` : ""}`;
      return advance(run);
    }
    run.scene = { t: "over", won: false };
    return;
  }
  if (b.over === "fled") { run.message = curseNote; return advance(run); }
  if (b.over === "escaped") {
    run.message = `${b.enemy.name} got away with your Gold.${curseNote ? ` ${curseNote}` : ""}`;
    return advance(run);
  }
  run.carry = b.carry;
  run.stats.kills++;
  // Caught a thief: it coughs up 60% of what you're carrying, on top.
  let thiefPay = 0;
  if ((b.enemy.items["m_thief"] ?? 0) > 0) {
    thiefPay = Math.floor(h.f.gold * 0.6);
    h.f.gold += thiefPay;
  }
  if (rank === "boss") {
    run.stats.bosses++;
    h.f.persist["bossKills"] = (h.f.persist["bossKills"] ?? 0) + 1;
  }
  // Catch your breath: a small heal after every won fight.
  h.f.hp = Math.min(h.f.maxHp, h.f.hp + Math.ceil(h.f.maxHp * 0.15));
  const xp = { normal: 1, elite: 3, champion: 5, crimson: 7, boss: b.enemy.crimson ? 9 : 6 }[rank];
  gainXp(run, xp);
  const gold = { normal: 4 + 2 * run.floor, elite: 10 + 3 * run.floor, champion: 20 + 4 * run.floor, crimson: 30 + 6 * run.floor, boss: (b.enemy.crimson ? 50 : 30) + 10 * run.floor }[rank];
  const items: GearItem[] = [];
  let scrolls = 0;
  let potions = 0;
  let relic: string | undefined;
  const roll = (odds: Partial<Record<Rarity, number>>) => rollItem(h, rollRarity(run.rng, odds, run.floor), run.floor, run.rng);
  if (rank === "normal" && run.rng() < 0.2) items.push(roll(TABLES.drop));
  if (rank === "normal" && run.rng() < 0.1) potions++;
  if (rank === "elite") {
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
      run.message = "A Crimson Key falls from the body. 🗝️ A Crimson Vault will now be offered on your path.";
    } else run.message = "No key this time. Crimson Elites carry one about half the time.";
  }
  if (rank === "boss") {
    relic = randomRelic(run, 2);
    if (run.rng() < 0.15) scrolls++;
    h.f.gold += gold;
    h.f.hp = Math.min(h.f.maxHp, h.f.hp + Math.round(h.f.maxHp * 0.3));
    if (relic) {
      h.relics[relic] = (h.relics[relic] ?? 0) + 1;
      run.found.add(relic);
    }
    h.scrolls += scrolls;
    recompute(h);
    // Crimson bosses offer a Crimson item alongside two boss finds.
    const offer = b.enemy.crimson ? [rollItem(h, "crimson", run.floor, run.rng), roll(TABLES.boss), roll(TABLES.boss)] : [roll(TABLES.boss), roll(TABLES.boss), roll(TABLES.boss)];
    run.scene = { t: "pick", title: `${b.enemy.name} falls! Choose one`, items: offer };
    run.message = `+${gold} Gold${relic ? ` · relic: ${getItem(relic).name}` : ""}${scrolls ? " · a Scroll of Revelation" : ""} · healed 30%${curseNote ? ` ${curseNote}` : ""}`;
    return;
  }
  run.scene = { t: "loot", title: then === "mimic" ? "The Mimic's hoard" : thiefPay ? `You caught the ${b.enemy.name}!` : "Victory", items, gold, scrolls, relic, potions, then: then === "resplendent" ? "resplendent" : undefined };
  const notes = [run.message, thiefPay ? `It drops its stash: +${thiefPay} Gold (60% of your purse).` : "", curseNote].filter(Boolean);
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
    case "rare": return Math.min(0.6, [0.03, 0.12, 0.25, 0.35, 0.45][floor - 1] ?? 0.6) * (quality > 1 ? 2 : 1);
    case "legendary": return floor < 3 ? 0 : Math.min(0.15, 0.02 + 0.03 * (floor - 3)) * (quality > 1 ? 3 : 1);
    default: return 0.5;
  }
}

/** Roll a relic. `quality` > 1 for bosses and Champions (better odds of Rare and Legendary). */
function randomRelic(run: Run, quality = 1): string {
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
  h.scrolls += s.scrolls;
  h.potions += s.potions;
  if (s.relic) {
    h.relics[s.relic] = (h.relics[s.relic] ?? 0) + 1;
    run.found.add(s.relic);
  }
  recompute(h);
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
  run.hero.scrap += { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12, crimson: 20 }[item.rarity] + item.level - 1;
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
    run.hero.scrolls++;
    advance(run);
    return null;
  }
  const passed = s.cards.filter((c, i) => i !== s.picked && c.kind === "item").map(c => (c as { item: GearItem }).item);
  run.scene = { t: "pick", title: "Your find", items: [card.item], passed };
  return null;
}

// ---------- Shop, Forge, Rest ----------

const PRICE: Record<Rarity, number> = { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 120, crimson: 250 };

function shopStock(run: Run): ShopEntry[] {
  const h = run.hero;
  const stock: ShopEntry[] = [];
  for (let i = 0; i < 3; i++) {
    const item = rollItem(h, rollRarity(run.rng, TABLES.shop, run.floor), run.floor, run.rng);
    stock.push({ kind: "item", item, price: PRICE[item.rarity] + 5 * (run.floor - 1) });
  }
  const shopRelic = randomRelic(run);
  stock.push({ kind: "relic", relic: shopRelic, price: ({ common: 40, uncommon: 55, rare: 85, legendary: 160 } as Record<string, number>)[getItem(shopRelic).rarity ?? "common"] ?? 50 });
  stock.push({ kind: "potion", price: 15 });
  if (run.rng() < 0.12) stock.push({ kind: "scroll", price: 100 + 25 * (run.floor - 1) });
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
  if (e.kind === "scroll") h.scrolls++;
  if (e.kind === "item" && e.item) markFound(run, e.item);
  if (e.kind === "relic" && e.relic) {
    h.relics[e.relic] = (h.relics[e.relic] ?? 0) + 1;
    run.found.add(e.relic);
    recompute(h);
  }
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
  s.soldItem = `${baseOf(found.item.base).legendary && !found.item.revealed ? "an unrevealed Legendary" : baseName(found.item)} for ${price} Gold`;
  return null;
}

/** Each reroll at the same Merchant costs 10 more than the last. */
export const shopRerollCost = (run: Run) => 10 + 10 * run.shopRerolls;

export function rerollShop(run: Run): string | null {
  if (run.scene.t !== "shop") return null;
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
  if (choice === "heal") h.f.hp = Math.min(h.f.maxHp, h.f.hp + Math.round(h.f.maxHp * 0.4));
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
    healPct: (p: number) => { h.f.hp = Math.min(h.f.maxHp, h.f.hp + Math.round(h.f.maxHp * p)); },
    addMaxHp: (n: number) => { h.f.persist["maxHpLoss"] = (h.f.persist["maxHpLoss"] ?? 0) - n; recompute(h); h.f.hp += n; },
    gainItem: (r: Rarity) => { const it = rollItem(h, r, run.floor, run.rng); found.push(it); return it; },
    gainRelic: () => { const id = randomRelic(run); h.relics[id] = (h.relics[id] ?? 0) + 1; run.found.add(id); recompute(h); return getItem(id).name; },
    loseRelic: () => { const ids = Object.keys(h.relics); if (!ids.length) return null; const id = ids[Math.floor(run.rng() * ids.length)]; h.relics[id]--; if (!h.relics[id]) delete h.relics[id]; recompute(h); return getItem(id).name; },
    relicCount: () => Object.keys(h.relics).length,
    addCurse: () => { const c = CURSES[Math.floor(run.rng() * CURSES.length)]; h.curses[c.id] = (h.curses[c.id] ?? 0) + 1; recompute(h); return c.name; },
    clearCurses: () => { const n = Object.keys(h.curses).length; h.curses = {}; recompute(h); return n; },
    addXp: (n: number) => gainXp(run, n),
    addScrolls: (n: number) => { h.scrolls += n; },
    addPotions: (n: number) => { h.potions += n; },
    addScrap: (n: number) => { h.scrap += n; },
    addPity: (n: number) => { run.loot.pity += n; },
    upgradeWeapon: () => { const w = h.equip.main; if (!w) return "You have no weapon."; w.level++; for (const k of Object.keys(w.bonuses)) w.bonuses[k]++; recompute(h); return null; }
  };
  const opt = s.ev.options[i];
  if (!opt || (opt.can && !opt.can(ctx))) return;
  const result = opt.run(ctx);
  if (found.length) {
    run.scene = { t: "loot", title: s.ev.title, items: found, gold: 0, scrolls: 0, potions: 0 };
    run.message = result;
  } else s.result = result;
}

export function eventOptionAvailable(run: Run, i: number): boolean {
  const s = run.scene;
  if (s.t !== "event") return false;
  const h = run.hero;
  const opt = s.ev.options[i];
  if (!opt.can) return true;
  // Only read-only helpers are used by `can`.
  return opt.can({ gold: () => h.f.gold, hp: () => h.f.hp, relicCount: () => Object.keys(h.relics).length } as never);
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

const RARITY_POINTS: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 4, epic: 8, legendary: 16, crimson: 32 };

/** The value of an Offering; more and rarer items give better odds. */
export const offeringValue = (items: GearItem[]) => items.reduce((s, it) => s + RARITY_POINTS[it.rarity] * (1 + 0.25 * (it.level - 1)), 0);

/** Rarity odds an Offering of this value gives (for showing in the UI and for rolling). */
export function offeringOdds(value: number): Partial<Record<Rarity, number>> {
  const t = Math.log2(Math.max(1, value)); // 1 → 0 (common) … 16 → 4
  const odds: Partial<Record<Rarity, number>> = {};
  let total = 0;
  const FORGEABLE = RARITIES.filter(r => r !== "crimson");
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
  const slots = { common: 0, uncommon: 1, rare: 2, epic: 3, legendary: 0, crimson: 2 }[rarity];
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
  if (!fromTalent) {
    if (run.step >= STEPS_PER_FLOOR) {
      run.floor++;
      run.step = 0;
      run.message = `Floor ${run.floor}. The air is colder, and the hoards are richer: your Fortune grows.`;
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
