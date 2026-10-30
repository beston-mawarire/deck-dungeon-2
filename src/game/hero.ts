// The hero: origin, equipped gear, backpack, relics, talents, curses — and turning all of that into a Fighter.
import { GEAR_BASES, LEGENDARIES } from "../data";
import { ORIGINS } from "../data/origins";
import { PLAIN_FACES } from "../engine/combat";
import { eachHook, getItem } from "../engine/registry";
import type { Fighter, GearBase, GearItem, OriginId, Rarity, Slot, StatBlock } from "../engine/types";

export type EquipSlot = "main" | "off" | "armour" | "trinket1" | "trinket2";
export const EQUIP_SLOTS: EquipSlot[] = ["main", "off", "armour", "trinket1", "trinket2"];
export const BACKPACK_SIZE = 4;

export interface Hero {
  origin: OriginId;
  f: Fighter;
  equip: Partial<Record<EquipSlot, GearItem>>;
  backpack: GearItem[];
  relics: Record<string, number>;
  talents: Record<string, number>;
  curses: Record<string, number>;
  potions: number;
  scrolls: number;
  scrap: number;
  xp: number;
  level: number;
  nextUid: number;
}

const BASES = new Map<string, GearBase>([...GEAR_BASES, ...LEGENDARIES].map(g => [g.id, g]));
export const baseOf = (id: string) => {
  const b = BASES.get(id);
  if (!b) throw new Error(`Unknown gear base ${id}`);
  return b;
};

/** An unrevealed Legendary works like a Common of its base type. */
export function effectiveBase(item: GearItem): GearBase {
  const b = baseOf(item.base);
  return b.legendary && !item.revealed ? baseOf(b.legendary.asBase) : b;
}

export const RARITY_DAMAGE: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 1, epic: 2, legendary: 0 };
export const RARITY_COLOR: Record<Rarity, string> = { common: "#9a9aa2", uncommon: "#4fc074", rare: "#4f9cf0", epic: "#b06cf0", legendary: "#f08a2a" };

export function weaponDamage(item: GearItem, offhand = false): number {
  const base = effectiveBase(item);
  const d = offhand ? base.offDamage ?? 0 : base.damage ?? 0;
  return d + (item.level - 1) + RARITY_DAMAGE[item.rarity];
}

export function itemName(item: GearItem): string {
  const b = baseOf(item.base);
  if (b.legendary && !item.revealed) return `??? (unrevealed ${effectiveBase(item).name})`;
  if (b.legendary) return b.name;
  const epic = item.epic ? `${getItem(item.epic).affix} ` : "";
  const first = Object.keys(item.bonuses)[0];
  const suffix = first ? ` ${getItem(first).affix}` : "";
  return `${epic}${b.name}${suffix}`;
}

export const fillText = (text: string, n: number) =>
  text.replace(/\{(\d*)n([+-]\d+)?\}/g, (_m, mul, add) => String((mul ? Number(mul) : 1) * n + (add ? Number(add) : 0)))
    .replace(/\{(\d+)-n\}/g, (_m, k) => String(Math.max(4, Number(k) - n)));

/** Lines describing an item for the UI. */
export function itemLines(item: GearItem): string[] {
  const b = baseOf(item.base);
  const eb = effectiveBase(item);
  const lines: string[] = [];
  if (eb.damage !== undefined) lines.push(`Damage ${weaponDamage(item)}${eb.twoHanded ? " · two-handed" : ""}${eb.offDamage ? ` · off-hand ${weaponDamage(item, true)}` : ""}`);
  const armor = (eb.armor ?? 0) + Math.floor((item.level - 1) / 2);
  if (armor) lines.push(`Armor ${armor}`);
  if (eb.faces) lines.push(`Faces: ${eb.faces.map((f, i) => `${i + 1} ${f.name ?? f.kind[0].toUpperCase() + f.kind.slice(1)}`).join(" · ")}`);
  if (b.legendary && !item.revealed) lines.push("A Legendary, waiting to be revealed. Use a Scroll of Revelation.");
  else if (b.legendary) lines.push(`★ ${b.legendary.reveal}`);
  else if (eb.text) lines.push(eb.text);
  if (item.epic) lines.push(`✦ ${getItem(item.epic).name}: ${getItem(item.epic).text}`);
  for (const [id, n] of Object.entries(item.bonuses)) lines.push(`+ ${fillText(getItem(id).text, n)}`);
  return lines;
}

export const slotOfBase = (b: GearBase): Slot => b.slot;

/** Rebuild the Fighter's stats and hook sources from everything the hero has. */
export function recompute(h: Hero) {
  const f = h.f;
  const o = ORIGINS[h.origin];
  const items: Record<string, number> = { [o.passive]: 1 };
  const add = (id: string, n = 1) => (items[id] = (items[id] ?? 0) + n);
  for (const [id, n] of Object.entries(h.relics)) add(id, n);
  for (const [id, n] of Object.entries(h.talents)) add(id, n);
  for (const [id, n] of Object.entries(h.curses)) add(id, n);

  const s: StatBlock = { maxHp: o.hp, armor: 0, damage: 1, offDamage: 0 };
  f.faces = PLAIN_FACES;
  f.offFaces = undefined;
  for (const slot of EQUIP_SLOTS) {
    const it = h.equip[slot];
    if (!it) continue;
    const real = baseOf(it.base);
    const eb = effectiveBase(it);
    // Hooks: a revealed Legendary uses its own; otherwise the effective base's.
    add(real.legendary && it.revealed ? real.id : eb.id);
    for (const [id, n] of Object.entries(it.bonuses)) add(id, n);
    if (it.epic) add(it.epic);
    s.armor += (eb.armor ?? 0) + (eb.armor ? Math.floor((it.level - 1) / 2) : 0);
    s.maxHp += eb.maxHp ?? 0;
    if (slot === "main" && eb.kind === "weapon") {
      s.damage = weaponDamage(it);
      f.faces = eb.faces ?? PLAIN_FACES;
    }
    if (slot === "off" && eb.kind === "weapon" && eb.offDamage !== undefined) {
      s.offDamage = weaponDamage(it, true);
      f.offFaces = eb.faces;
    }
  }
  f.items = items;
  s.maxHp -= f.persist["maxHpLoss"] ?? 0;
  eachHook(f, "stats", (hk, n) => hk(s, n));
  f.maxHp = Math.max(1, s.maxHp);
  f.hp = Math.min(f.hp, f.maxHp);
  f.armor = Math.max(0, s.armor);
  f.damage = Math.max(0, s.damage);
  f.offDamage = f.offFaces ? Math.max(0, s.offDamage) : undefined;
  if (!items["l_hollow_crown"]) delete f.persist["keepBarrier"];
}

export function newHero(origin: OriginId): Hero {
  const o = ORIGINS[origin];
  const f: Fighter = { id: "player", name: o.name, hp: o.hp, maxHp: o.hp, armor: 0, damage: 1, faces: PLAIN_FACES, statuses: {}, flags: {}, persist: {}, items: {}, gold: 0 };
  const h: Hero = { origin, f, equip: {}, backpack: [], relics: {}, talents: {}, curses: {}, potions: 1, scrolls: 0, scrap: 0, xp: 0, level: 1, nextUid: 1 };
  const [main, off, arm] = o.kit;
  h.equip.main = { uid: h.nextUid++, base: main, rarity: "common", level: 1, bonuses: {}, revealed: true };
  h.equip.off = { uid: h.nextUid++, base: off, rarity: "common", level: 1, bonuses: {}, revealed: true };
  h.equip.armour = { uid: h.nextUid++, base: arm, rarity: "common", level: 1, bonuses: {}, revealed: true };
  recompute(h);
  f.hp = f.maxHp;
  return h;
}

/** Which equip slots an item can go into. */
export function slotsFor(item: GearItem): EquipSlot[] {
  const eb = effectiveBase(item);
  if (eb.slot === "main") return eb.offDamage !== undefined && !eb.twoHanded ? ["main", "off"] : ["main"];
  if (eb.slot === "off") return ["off"];
  if (eb.slot === "armour") return ["armour"];
  return ["trinket1", "trinket2"];
}

/** Find an item anywhere the hero holds it. */
export function findItem(h: Hero, uid: number): { item: GearItem; where: EquipSlot | "backpack" } | null {
  for (const s of EQUIP_SLOTS) if (h.equip[s]?.uid === uid) return { item: h.equip[s]!, where: s };
  const it = h.backpack.find(i => i.uid === uid);
  return it ? { item: it, where: "backpack" } : null;
}

function removeItem(h: Hero, uid: number) {
  for (const s of EQUIP_SLOTS) if (h.equip[s]?.uid === uid) delete h.equip[s];
  h.backpack = h.backpack.filter(i => i.uid !== uid);
}

/** Equip an item from the backpack (or a new find). Displaced items go to the backpack. Returns an error message or null. */
export function equipItem(h: Hero, item: GearItem, slot?: EquipSlot): string | null {
  const allowed = slotsFor(item);
  const target = slot && allowed.includes(slot) ? slot : allowed.find(s => !h.equip[s]) ?? allowed[0];
  const displaced: GearItem[] = [];
  if (h.equip[target]) displaced.push(h.equip[target]!);
  const twoHanded = effectiveBase(item).twoHanded;
  if (target === "main" && twoHanded && h.equip.off) displaced.push(h.equip.off);
  if (target === "off" && h.equip.main && effectiveBase(h.equip.main).twoHanded) displaced.push(h.equip.main);
  const inPack = h.backpack.some(i => i.uid === item.uid);
  const free = BACKPACK_SIZE - h.backpack.length + (inPack ? 1 : 0);
  if (displaced.length > free) return "Your backpack is full. Salvage something first.";
  removeItem(h, item.uid);
  for (const d of displaced) removeItem(h, d.uid);
  h.equip[target] = item;
  if (target === "main" && twoHanded) delete h.equip.off;
  h.backpack.push(...displaced);
  recompute(h);
  return null;
}

export function unequip(h: Hero, slot: EquipSlot): string | null {
  const it = h.equip[slot];
  if (!it) return null;
  if (h.backpack.length >= BACKPACK_SIZE) return "Your backpack is full.";
  delete h.equip[slot];
  h.backpack.push(it);
  recompute(h);
  return null;
}

export function addToBackpack(h: Hero, item: GearItem): string | null {
  if (h.backpack.length >= BACKPACK_SIZE) return "Your backpack is full. Salvage something first.";
  h.backpack.push(item);
  return null;
}

export const SCRAP_VALUE: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12 };

export function salvage(h: Hero, uid: number): number {
  const found = findItem(h, uid);
  if (!found) return 0;
  const n = SCRAP_VALUE[found.item.rarity] + (found.item.level - 1);
  removeItem(h, uid);
  h.scrap += n;
  recompute(h);
  return n;
}

export function reveal(h: Hero, uid: number): string | null {
  const found = findItem(h, uid);
  if (!found) return "Item not found.";
  if (!baseOf(found.item.base).legendary || found.item.revealed) return "That item has nothing to reveal.";
  if (h.scrolls <= 0) return "You need a Scroll of Revelation.";
  h.scrolls--;
  found.item.revealed = true;
  recompute(h);
  return null;
}

export const upgradeCost = (item: GearItem) => 3 * item.level;
export const REROLL_COST = 4;

/** Tags of everything equipped, relics and talents (used to lean loot and talent offers). */
export function heroTags(h: Hero): Map<string, number> {
  const tags = new Map<string, number>();
  for (const [id, n] of Object.entries(h.f.items)) {
    let def;
    try { def = getItem(id); } catch { continue; }
    for (const t of def.tags) tags.set(t, (tags.get(t) ?? 0) + Math.min(n, 3));
  }
  return tags;
}

export const xpToLevel = (level: number) => 3 + 2 * (level - 1);
