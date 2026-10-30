// A run: three floors of path choices, fights, chests, shops, forges and bosses.
import { CURSES, RELICS, TALENTS } from "../data";
import { makeMonster, type MonsterRank } from "../data/monsters";
import { type Action, playRound, startBattle } from "../engine/combat";
import { getItem } from "../engine/registry";
import { makeRng } from "../engine/rng";
import { heal as healF } from "../engine/statuses";
import type { Battle, GearItem, OriginId, Rarity } from "../engine/types";
import { addToBackpack, baseOf, equipItem, findItem, type Hero, heroTags, newHero, recompute, REROLL_COST, upgradeCost, xpToLevel } from "./hero";
import { type LootState, type ResplendentCard, resplendentCards, rollItem, rollRarity, TABLES } from "./loot";

export const FLOORS = 3;
export const STEPS_PER_FLOOR = 8;

export type RoomType = "fight" | "elite" | "champion" | "wooden" | "iron" | "vault" | "altar" | "shrine" | "shop" | "forge" | "rest" | "boss";

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
  boss: { name: "Boss", icon: "👑", text: "The guardian of this floor." }
};

export interface ShopEntry { kind: "item" | "potion" | "scroll" | "relic"; item?: GearItem; relic?: string; price: number; sold?: boolean }

export type Scene =
  | { t: "map" }
  | { t: "combat"; battle: Battle; rank: MonsterRank; then?: "resplendent" | "mimic" }
  | { t: "loot"; title: string; items: GearItem[]; gold: number; scrolls: number; relic?: string; potions: number; then?: "resplendent" }
  | { t: "resplendent"; cards: ResplendentCard[]; picked: number | null; glove: boolean }
  | { t: "pick"; title: string; items: GearItem[]; passed?: GearItem[] }
  | { t: "talent"; options: string[] }
  | { t: "shop"; stock: ShopEntry[] }
  | { t: "forge" }
  | { t: "rest"; done: boolean }
  | { t: "confirm"; room: RoomType }
  | { t: "over"; won: boolean };

export interface Run {
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
  stats: { kills: number; bestHit: number };
}

export function newRun(origin: OriginId, seed = Date.now() & 0x7fffffff): Run {
  const run: Run = {
    seed, rng: makeRng(seed), hero: newHero(origin), floor: 1, step: 0, choices: [], scene: { t: "map" },
    loot: { pity: 0 }, carry: 0, pendingTalents: 0, message: "", stats: { kills: 0, bestHit: 0 }
  };
  run.choices = genChoices(run);
  return run;
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
  const w: Partial<Record<RoomType, number>> = { fight: 34, elite: 12, wooden: 12, iron: 8, shop: 7, forge: 6, rest: 7, vault: 3, altar: 3, shrine: 3, champion: 3 };
  if (run.step === 0) { w.elite = 0; w.champion = 0; w.vault = 0; }
  const out = new Set<RoomType>();
  out.add("fight");
  while (out.size < 3) out.add(pickW(run.rng, w));
  return [...out].sort(() => run.rng() - 0.5);
}

// ---------- Rooms ----------

export function chooseRoom(run: Run, room: RoomType) {
  run.message = "";
  if (room === "vault" || room === "altar" || room === "shrine") {
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
    case "wooden":
      run.scene = { t: "loot", title: "Wooden Chest", items: [rollItem(h, rollRarity(run.rng, TABLES.wooden), run.floor, run.rng)], gold: 3 + run.floor, scrolls: 0, potions: run.rng() < 0.2 ? 1 : 0 };
      return;
    case "iron": {
      const key = (h.relics["skeleton_key"] ?? 0) > 0;
      if (!key && run.rng() < 1 / 6) {
        run.message = "The chest bites! It's a Mimic.";
        return fight(run, "elite", "mimic");
      }
      const items = [rollItem(h, rollRarity(run.rng, TABLES.iron), run.floor, run.rng)];
      if (key) items.push(rollItem(h, rollRarity(run.rng, TABLES.iron), run.floor, run.rng));
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
    case "shop": run.scene = { t: "shop", stock: shopStock(run) }; return;
    case "forge": run.scene = { t: "forge" }; return;
    case "rest": run.scene = { t: "rest", done: false }; return;
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

function fight(run: Run, rank: MonsterRank, then?: "resplendent" | "mimic") {
  const enemy = makeMonster(run.rng, run.floor, rank);
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

export function drinkPotion(run: Run) {
  const h = run.hero;
  if (h.potions <= 0) return;
  h.potions--;
  if (run.scene.t === "combat") healF(run.scene.battle, h.f, 12, "Potion");
  else h.f.hp = Math.min(h.f.maxHp, h.f.hp + 12);
}

function afterFight(run: Run) {
  if (run.scene.t !== "combat") return;
  const { battle: b, rank, then } = run.scene;
  const h = run.hero;
  if (b.over === "lost") {
    run.scene = { t: "over", won: false };
    return;
  }
  if (b.over === "fled") return advance(run);
  run.carry = b.carry;
  run.stats.kills++;
  // Catch your breath: a small heal after every won fight.
  h.f.hp = Math.min(h.f.maxHp, h.f.hp + Math.ceil(h.f.maxHp * 0.15));
  const xp = { normal: 1, elite: 3, champion: 5, boss: 6 }[rank];
  gainXp(run, xp);
  const gold = { normal: 4 + 2 * run.floor, elite: 10 + 3 * run.floor, champion: 20 + 4 * run.floor, boss: 30 + 10 * run.floor }[rank];
  const items: GearItem[] = [];
  let scrolls = 0;
  let potions = 0;
  let relic: string | undefined;
  const roll = (odds: Partial<Record<Rarity, number>>) => rollItem(h, rollRarity(run.rng, odds), run.floor, run.rng);
  if (rank === "normal" && run.rng() < 0.2) items.push(roll(TABLES.drop));
  if (rank === "normal" && run.rng() < 0.1) potions++;
  if (rank === "elite") {
    items.push(roll(TABLES.elite));
    if (then === "mimic") items.push(roll(TABLES.elite));
    if (run.rng() < 0.35) relic = randomRelic(run);
  }
  if (rank === "champion") {
    items.push(roll(TABLES.champion));
    if (run.rng() < 0.6) scrolls++;
    relic = randomRelic(run);
  }
  if (rank === "boss") {
    relic = randomRelic(run);
    if (run.rng() < 0.35) scrolls++;
    h.f.gold += gold;
    h.f.hp = Math.min(h.f.maxHp, h.f.hp + Math.round(h.f.maxHp * 0.3));
    if (relic) h.relics[relic] = (h.relics[relic] ?? 0) + 1;
    h.scrolls += scrolls;
    recompute(h);
    run.scene = { t: "pick", title: `${b.enemy.name} falls! Choose one`, items: [roll(TABLES.boss), roll(TABLES.boss), roll(TABLES.boss)] };
    run.message = `+${gold} Gold${relic ? ` · relic: ${getItem(relic).name}` : ""}${scrolls ? " · a Scroll of Revelation" : ""} · healed 30%`;
    return;
  }
  run.scene = { t: "loot", title: then === "mimic" ? "The Mimic's hoard" : "Victory", items, gold, scrolls, relic, potions, then: then === "resplendent" ? "resplendent" : undefined };
}

function randomRelic(run: Run): string {
  const tags = heroTags(run.hero);
  const pool = RELICS;
  const w = pool.map(r => 1 + 0.3 * r.tags.reduce((s, t) => s + Math.min(tags.get(t) ?? 0, 3), 0) * ({ common: 1, uncommon: 0.7, rare: 0.35 }[r.rarity as "common"] ?? 0.5));
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
  if (s.relic) h.relics[s.relic] = (h.relics[s.relic] ?? 0) + 1;
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
  sc.items = sc.items.filter(i => i.uid !== uid);
  if (sc.t === "pick") finishLoot(run);
  return null;
}

/** Salvage a found item straight into Scrap. */
export function scrapFound(run: Run, uid: number) {
  const sc = run.scene;
  if (sc.t !== "loot" && sc.t !== "pick") return;
  const item = sc.items.find(i => i.uid === uid);
  if (!item) return;
  run.hero.scrap += { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12 }[item.rarity] + item.level - 1;
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

const PRICE: Record<Rarity, number> = { common: 10, uncommon: 20, rare: 35, epic: 60, legendary: 120 };

function shopStock(run: Run): ShopEntry[] {
  const h = run.hero;
  const stock: ShopEntry[] = [];
  for (let i = 0; i < 3; i++) {
    const item = rollItem(h, rollRarity(run.rng, TABLES.shop), run.floor, run.rng);
    stock.push({ kind: "item", item, price: PRICE[item.rarity] + 5 * (run.floor - 1) });
  }
  stock.push({ kind: "relic", relic: randomRelic(run), price: 45 });
  stock.push({ kind: "potion", price: 15 });
  if (run.rng() < 0.3) stock.push({ kind: "scroll", price: 80 });
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
  if (e.kind === "relic" && e.relic) {
    h.relics[e.relic] = (h.relics[e.relic] ?? 0) + 1;
    recompute(h);
  }
  h.f.gold -= e.price;
  e.sold = true;
  return null;
}

export function rerollShop(run: Run): string | null {
  if (run.scene.t !== "shop") return null;
  if (run.hero.f.gold < 10) return "Not enough Gold.";
  run.hero.f.gold -= 10;
  run.scene.stock = shopStock(run);
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
  if (h.scrap < REROLL_COST) return `Needs ${REROLL_COST} Scrap.`;
  h.scrap -= REROLL_COST;
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

// ---------- Talents and moving on ----------

export function talentOptions(run: Run): string[] {
  const tags = heroTags(run.hero);
  const pool = TALENTS.filter(t => (run.hero.talents[t.id] ?? 0) < 3);
  const out: string[] = [];
  while (out.length < 3 && out.length < pool.length) {
    const w = pool.map(t => (out.includes(t.id) ? 0 : 1 + 0.4 * t.tags.reduce((s, x) => s + Math.min(tags.get(x) ?? 0, 3), 0)));
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
      if (run.floor > FLOORS) {
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
