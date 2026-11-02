// The hero: origin, equipped gear, backpack, relics, talents, curses — and turning all of that into a Fighter.
import { POTION_SLOTS } from "../data/potions";
import { ABYSS_ITEMS } from "../data/abyss";
import { relicBonus } from "../data/basic_relics";
import { CRIMSON, GEAR_BASES, LEGENDARIES } from "../data";
import { ORIGINS } from "../data/origins";
import { genHooks, genLines, GRADE_MARK, genTopGrade, GEN_MODULE_MAP, modValue } from "./gen";
import { SIGIL_SETS } from "../data/talisman";
import { PLAIN_FACES } from "../engine/combat";
import { eachHook, getItem } from "../engine/registry";
import type { Fighter, GearBase, GearItem, OriginId, Rarity, Slot, StatBlock } from "../engine/types";

export type EquipSlot = "main" | "off" | "armour" | "trinket1" | "trinket2" | "trinket3";
/** trinket3 only opens with the Keepsake of the Collector. */
export const EQUIP_SLOTS: EquipSlot[] = ["main", "off", "armour", "trinket1", "trinket2", "trinket3"];
export const hasThirdTrinket = (h: Hero) => h.keepsake === "ks_collector";
/** The slots this hero can actually use right now. */
export const openSlots = (h: Hero) => EQUIP_SLOTS.filter(s => s !== "trinket3" || hasThirdTrinket(h));
export const BACKPACK_SIZE = 6;
export const DRAGON_HEART_MULT = 1.5;
/** A Talisman sigil: a set piece (its id) or a plain one (a minor module at a tier). Its level is the floor it came from. */
export interface Sigil { uid: number; id: string; level: number; tier?: number }
export const SIGIL_BAG_SIZE = 12;
/** Talisman slots: 2, then one more on floors 3, 6, 10 and 15. */
export const SIGIL_FLOORS = [3, 6, 10, 15];
export const sigilSlots = (h: Hero) => 2 + SIGIL_FLOORS.filter(f => (h.f.persist["floor"] ?? 1) >= f).length;
/** Each Vanadium Plate on a class (Abyss runs only): Max HP, Armor and Damage this much stronger. */
export const PLATE_BONUS = 0.06;
/** Healing Potions: 3 slots to start (potion gear adds more). */
export const BASE_POTION_CAP = 3;
/** Potion slots: how many Healing Potions you can carry, and also how many you can drink in one fight. */
export function potionCap(h: Hero): number {
  let n = BASE_POTION_CAP;
  for (const [id, slots] of Object.entries(POTION_SLOTS)) n += slots * Math.max(0, h.f.items[id] ?? 0);
  return n;
}
export const potionsPerFight = potionCap;
/** Add potions up to what you can carry. Returns how many you actually took. */
export function gainPotions(h: Hero, n: number): number {
  if (n <= 0) { h.potions = Math.max(0, h.potions + n); return n; }
  const got = Math.max(0, Math.min(n, potionCap(h) - h.potions));
  h.potions += got;
  return got;
}

export interface Hero {
  origin: OriginId;
  f: Fighter;
  equip: Partial<Record<EquipSlot, GearItem>>;
  backpack: GearItem[];
  relics: Record<string, number>;
  talents: Record<string, number>;
  curses: Record<string, number>;
  potions: number;
  /** The Alchemist's combat tonics, by id. */
  tonics?: Record<string, number>;
  scrolls: number;
  scrap: number;
  /** Starmetal: dropped only by Champions (and scrapped Legendaries); fuels the Transmuter. */
  starmetal: number;
  /** Crimson Keys (from Crimson Elites): each opens one Crimson Vault. */
  crimsonKeys: number;
  /** Mana Potions: spells hit harder for the rest of a fight. */
  manaPotions: number;
  /** One Keepsake at a time (from bosses after floor 5). */
  keepsake?: string;
  /** The Transmuter's Crucible: an artefact (not a relic). With it, the Forge can turn a Common into a Legendary. */
  crucible?: boolean;
  /** Torn from a slain dragon. Each further dragon slain raises its level. Unified at a Dragon Sanctum: every stat +50%. */
  dragonHeart?: { level: number; unified?: boolean };
  /** The run's Heat level (Heat 3+ halves all healing). */
  heat?: number;
  /** The Talisman: sigils worn (outside the gear slots) and sigils carried. */
  sigils?: Sigil[];
  sigilBag?: Sigil[];
  /** Vanadium Plates this class carries into an Abyss run (set only on Abyss runs). */
  plates?: number;
  xp: number;
  level: number;
  nextUid: number;
}

const BASES = new Map<string, GearBase>([...GEAR_BASES, ...LEGENDARIES, ...CRIMSON, ...ABYSS_ITEMS].map(g => [g.id, g]));
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

export const RARITY_DAMAGE: Record<Rarity, number> = { common: 0, uncommon: 0, rare: 1, epic: 3, legendary: 1, crimson: 3, epic_crimson: 8, legendary_crimson: 12 };
export const RARITY_COLOR: Record<Rarity, string> = { common: "#9a9aa2", uncommon: "#4fc074", rare: "#4f9cf0", epic: "#b06cf0", legendary: "#f08a2a", crimson: "#e0283f", epic_crimson: "#ff2e88", legendary_crimson: "#ff7a1a" };

/**
 * Ordinary weapons (swords, axes, maces...) are clumsy in the off-hand: 60% damage. Daggers, throwing knives,
 * kunai, shuriken, grenades, Arcane weapons (wands) and purpose-made off-hand blades keep their full off-hand damage.
 */
export function offhandPenalty(item: GearItem): boolean {
  const eb = effectiveBase(item);
  // Blades built as a second weapon (off-hand damage at least their main damage) are exempt too.
  return eb.kind === "weapon" && !eb.twoHanded && !eb.weaponType && !eb.tags.includes("Arcane") && (eb.offDamage ?? 0) < (eb.damage ?? 0);
}

/** Throwing knives, kunai and shuriken work in either hand, but hit a little softer from the main hand. */
export const THROWN_TYPES = ["throwing", "kunai", "shuriken"];

export function weaponDamage(item: GearItem, offhand = false): number {
  const base = effectiveBase(item);
  const thrown = !!base.weaponType && THROWN_TYPES.includes(base.weaponType);
  const d = offhand ? base.offDamage ?? 0 : thrown ? Math.max(1, (base.offDamage ?? base.damage ?? 0) - 1) : base.damage ?? 0;
  const hidden = !!baseOf(item.base).legendary && !item.revealed;
  const full = d + (item.level - 1) + (hidden ? 0 : RARITY_DAMAGE[item.rarity]);
  return offhand && offhandPenalty(item) ? Math.max(1, Math.floor(full * 0.6)) : full;
}

export function itemName(item: GearItem): string {
  const b = baseOf(item.base);
  if (b.legendary && !item.revealed) return `??? (unrevealed ${effectiveBase(item).name})`;
  if (b.legendary) return b.name;
  if (item.gen) { const g = genTopGrade(item.gen); return `${item.gen.name}${g ? ` ${GRADE_MARK[g]}` : ""}`; }
  const epic = item.epic ? `${getItem(item.epic).affix} ` : "";
  const first = Object.keys(item.bonuses)[0];
  const suffix = first ? ` ${getItem(first).affix}` : "";
  return `${epic}${b.name}${suffix}`;
}

export const fillText = (text: string, n: number) =>
  text.replace(/\{(\d*)n([+-]\d+)?\}/g, (_m, mul, add) => String((mul ? Number(mul) : 1) * n + (add ? Number(add) : 0)))
    .replace(/\{(\d+)-n\}/g, (_m, k) => String(Math.max(4, Number(k) - n)))
    .replace(/\{n\/(\d+)\}/g, (_m, d) => String(Math.max(1, Math.ceil(n / Number(d)))));

/** Lines describing an item for the UI. */
export function itemLines(item: GearItem): string[] {
  const b = baseOf(item.base);
  const eb = effectiveBase(item);
  const lines: string[] = [];
  if (eb.damage !== undefined) lines.push(`Damage ${weaponDamage(item)}${eb.twoHanded ? " · two-handed" : ""}${eb.offDamage ? ` · off-hand ${weaponDamage(item, true)}${offhandPenalty(item) ? " (clumsy: 60%)" : ""}` : ""}`);
  const armor = (eb.armor ?? 0) + (eb.armor ? Math.floor((item.level - 1) / 2) : 0);
  if (armor) lines.push(`Armor ${armor}`);
  if (eb.faces) lines.push(`Faces: ${eb.faces.map((f, i) => `${i + 1} ${f.name ?? f.kind[0].toUpperCase() + f.kind.slice(1)}`).join(" · ")}`);
  if (eb.kind === "weapon" && eb.tags.includes("Holy")) lines.push("✝️ Holy: +50% to Undead, vampires, Crimson foes and anything that curses or Dooms. When your Ward stops an enemy's status, your next hit Smites (20% of its Max HP, once per fight).");
  if (eb.faces?.some(f => f.cleanse)) lines.push("✨ Purify: strips every negative status from the enemy and deals 2× Damage for each one (ignores Armor). Nothing on them, no damage.");
  if (eb.shield) lines.push("🛡️ Shield: lets you Guard.");
  if (eb.heavy) lines.push("🔨 Heavy: every hit builds Stagger (2 on a Crit). Fill it and the enemy loses its next action and takes double from your next hit.");
  if (eb.barrierElement) lines.push(`🔮 Mage: lets you raise an Elemental Barrier (${(eb.barrierElements ?? [eb.barrierElement]).join(", ")}).`);
  if (itemDodge(item)) lines.push(`💨 ${itemDodge(item)}% Dodge`);
  if (item.bash) lines.push(`💥 ${item.bash}% Bash (Stuns and deals +50%)`);
  if (b.legendary && !item.revealed) lines.push("A Legendary, waiting to be revealed. Use a Scroll of Revelation.");
  else if (b.legendary) lines.push(`★ ${b.legendary.reveal}`);
  else if (eb.text) lines.push(eb.text);
  if (item.epic) lines.push(`★ ${getItem(item.epic).name}: ${getItem(item.epic).text}`);
  lines.push(...genLines(item, fillText, id => `${getItem(id).name}: ${getItem(id).text}`));
  for (const [id, n] of Object.entries(item.bonuses)) lines.push(`+ ${fillText(getItem(id).text, n)}`);
  return lines;
}

export const slotOfBase = (b: GearBase): Slot => b.slot;

/** Dodge % from a piece of Dodge gear: set by its rarity, +1 per level. */
export function itemDodge(it: GearItem): number {
  const d = effectiveBase(it).dodge?.[it.rarity];
  return d ? d + (it.level - 1) : 0;
}

/** You can Guard with a shield in your off-hand — or, as a Warrior, with a two-handed weapon. */
export function canGuard(h: Hero): boolean {
  const off = h.equip.off;
  if (off && effectiveBase(off).shield) return true;
  return h.origin === "warrior" && !!h.equip.main && !!effectiveBase(h.equip.main).twoHanded;
}

/** Rebuild the Fighter's stats and hook sources from everything the hero has. */
export function recompute(h: Hero) {
  // Older saves held the Crucible as a relic: it's an artefact now.
  if (h.relics["transmuter"]) { delete h.relics["transmuter"]; h.crucible = true; }
  const f = h.f;
  // Lost Titan's Grip or the War Harness (an event can take relics): put back what no longer fits.
  if (!hasGrip(h) && h.equip.off && effectiveBase(h.equip.off).twoHanded) { h.backpack.push(h.equip.off); delete h.equip.off; }
  if (!keepsOffHand(h) && h.equip.main && effectiveBase(h.equip.main).twoHanded && h.equip.off) { h.backpack.push(h.equip.off); delete h.equip.off; }
  const o = ORIGINS[h.origin];
  const items: Record<string, number> = { [o.passive]: 1 };
  const add = (id: string, n = 1) => (items[id] = (items[id] ?? 0) + n);
  for (const [id, n] of Object.entries(h.relics)) add(id, n);
  for (const [id, n] of Object.entries(h.talents)) add(id, n);
  for (const [id, n] of Object.entries(h.curses)) add(id, n);
  // Curse-fed gear reads how many curses you carry; once cursed, the cursed gear can start to drop.
  const curseCount = Object.values(h.curses).reduce((a, n) => a + n, 0);
  f.persist["curseCount"] = curseCount;
  if (curseCount > 0) f.persist["everCursed"] = 1;
  if (h.keepsake) add(h.keepsake);
  if (!hasThirdTrinket(h) && h.equip.trinket3) { h.backpack.push(h.equip.trinket3); delete h.equip.trinket3; }

  const s: StatBlock = { maxHp: o.hp, armor: 0, damage: 1, offDamage: 0, dodge: 0, bash: 0, spellAmp: 0, critChance: 0, critDmg: 0, dotAmp: 0, dmgDealt: 0, dmgTaken: 0 };
  f.barrierElement = undefined;
  f.heavy = false;
  f.barrierElements = undefined;
  f.twoHanded = false;
  f.offTwoHanded = false;
  f.mainType = undefined;
  f.offType = undefined;
  f.dualWield = false;
  f.offHoly = false;
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
    // Generated gear: its material, modules, signature and flaw.
    for (const [id, n] of genHooks(it)) add(id, n);
    // Infused at the Jeweller: the trinket's effects (and its Armor / Max HP) ride along.
    if (it.infused) { add(it.infused); const tb = baseOf(it.infused); s.armor += tb.armor ?? 0; s.maxHp += tb.maxHp ?? 0; }
    s.armor += (eb.armor ?? 0) + (eb.armor ? Math.floor((it.level - 1) / 2) : 0);
    s.maxHp += eb.maxHp ?? 0;
    s.dodge += itemDodge(it);
    if (slot === "main" && it.bash) s.bash += it.bash;
    if (slot === "main" && eb.twoHanded) f.twoHanded = true;
    if (slot === "main") f.mainType = eb.weaponType;
    if (slot === "off") f.offType = eb.weaponType;
    if (slot === "off" && eb.tags.includes("Holy")) f.offHoly = true;
    // Dual wielding: a weapon (not a grenade) in each hand.
    if (slot === "off" && eb.kind === "weapon" && eb.weaponType !== "grenade" && h.equip.main && effectiveBase(h.equip.main).kind === "weapon") f.dualWield = true;
    if (slot === "off" && eb.twoHanded) f.offTwoHanded = true;
    if (slot === "off" && eb.barrierElement) { f.barrierElement = eb.barrierElement; f.barrierElements = eb.barrierElements; }
    if (slot === "main" && eb.kind === "weapon") {
      f.heavy = !!eb.heavy;
      s.damage = weaponDamage(it);
      f.faces = eb.faces ?? PLAIN_FACES;
    }
    if (slot === "off" && eb.kind === "weapon" && eb.offDamage !== undefined) {
      s.offDamage = weaponDamage(it, true);
      f.offFaces = eb.faces;
    } else if (slot === "off" && eb.kind === "weapon" && eb.twoHanded) {
      // Titan's Grip: a two-hander in the off-hand rolls its own die at 60% of its damage.
      s.offDamage = Math.max(1, Math.round(weaponDamage(it) * 0.6));
      f.offFaces = eb.faces;
    }
  }
  // The Talisman: each sigil's passive, then the bonuses of any set with enough different pieces worn.
  const worn = new Set<string>();
  for (const sg of h.sigils ?? []) {
    const gm = GEN_MODULE_MAP.get(sg.id);
    if (gm) add(gm.id, modValue(gm, sg.tier ?? 2, 0, sg.level));
    else { add(sg.id, sg.level); worn.add(sg.id); }
  }
  for (const set of SIGIL_SETS) {
    const n = set.pieces.filter(p => worn.has(p)).length;
    for (const [need, id] of set.bonuses) if (n >= need) add(id);
  }
  if ((h.heat ?? 0) >= 3) add("heat_dim");
  f.items = items;
  s.maxHp += 3 * (h.level - 1); // every level-up: +3 Max HP
  s.maxHp -= f.persist["maxHpLoss"] ?? 0;
  // A revealed trinket with its own faces (Dice of the Damned) replaces your main die.
  for (const slot of ["trinket1", "trinket2", "trinket3"] as const) {
    const it = h.equip[slot];
    if (it?.revealed && baseOf(it.base).legendary && baseOf(it.base).faces) f.faces = baseOf(it.base).faces!;
  }
  eachHook(f, "stats", (hk, n) => hk(s, n, f));
  if (items["l_mountain"]) s.armor *= 2;
  // Unified with a Dragon Heart: every stat +50%.
  if (h.dragonHeart?.unified) {
    const up = (n: number) => (n > 0 ? Math.round(n * DRAGON_HEART_MULT) : n);
    s.maxHp = up(s.maxHp); s.armor = up(s.armor); s.damage = up(s.damage); s.offDamage = up(s.offDamage);
    s.dodge = up(s.dodge); s.bash = up(s.bash); s.spellAmp = up(s.spellAmp); s.critChance = up(s.critChance);
    s.critDmg = up(s.critDmg ?? 0); s.dotAmp = up(s.dotAmp ?? 0); s.dmgDealt = up(s.dmgDealt ?? 0);
  }
  // Vanadium Plates (Abyss runs only): Max HP, Armor and Damage grow with every plate.
  if (h.plates) {
    const m = 1 + PLATE_BONUS * h.plates;
    const up = (n: number) => (n > 0 ? Math.round(n * m) : n);
    s.maxHp = up(s.maxHp); s.armor = up(s.armor); s.damage = up(s.damage); s.offDamage = up(s.offDamage);
  }
  // Hollow Vessel: Max HP can't go above 20, but the off-hand's effects fire twice.
  const vessel = (items["ep_hollow_vessel"] ?? 0) > 0;
  if (vessel) s.maxHp = Math.min(20, s.maxHp);
  const offIt = h.equip.off;
  f.offEcho = vessel && offIt ? (baseOf(offIt.base).legendary && offIt.revealed ? offIt.base : effectiveBase(offIt).id) : undefined;
  f.maxHp = Math.max(1, s.maxHp);
  f.hp = Math.min(f.hp, f.maxHp);
  f.armor = Math.max(0, s.armor);
  f.damage = Math.max(0, s.damage);
  f.offDamage = f.offFaces ? Math.max(0, s.offDamage) : undefined;
  if (f.dualWield && items["r_cross_guard"]) s.dodge += 5 + 3 * (items["r_cross_guard"] - 1);
  f.dodge = Math.min(60, Math.max(0, s.dodge));
  f.bash = Math.min(30, Math.max(0, s.bash));
  f.spellAmp = Math.max(0, s.spellAmp);
  f.dotAmp = Math.max(0, s.dotAmp ?? 0);
  f.dmgDealt = s.dmgDealt ?? 0;
  f.dmgTaken = s.dmgTaken ?? 0;
  // Thrower's Bandolier: +5% Crit chance with a throwing weapon in the off-hand. Mirage Sabre: + half your Dodge.
  if (items["t_bandolier"] && f.offType && ["throwing", "kunai", "shuriken"].includes(f.offType)) s.critChance += 5;
  if (items["w_mirage_sabre"]) s.critChance += Math.floor((f.dodge ?? 0) / 2);
  if (f.dualWield && items["t_duellist_ring"]) s.critChance += 6;
  f.critChance = Math.min(50, Math.max(0, s.critChance));
  f.critDmg = Math.max(-50, s.critDmg ?? 0);
  // Twin Souls: a second die with your main weapon's faces at 60% damage.
  if (items["lr_twin_souls"]) {
    f.offFaces = f.faces;
    f.offDamage = Math.max(1, Math.floor(f.damage * 0.6));
  }
  if (!items["l_hollow_crown"] && !items["l_bastion_ages"]) delete f.persist["keepBarrier"];
}

export function newHero(origin: OriginId): Hero {
  const o = ORIGINS[origin];
  const f: Fighter = { id: "player", name: o.name, hp: o.hp, maxHp: o.hp, armor: 0, damage: 1, faces: PLAIN_FACES, statuses: {}, flags: {}, persist: {}, items: {}, gold: 0 };
  const h: Hero = { origin, f, equip: {}, backpack: [], relics: {}, talents: {}, curses: {}, potions: 1, scrolls: 0, scrap: 0, starmetal: 0, crimsonKeys: 0, manaPotions: 0, xp: 0, level: 1, nextUid: 1 };
  const [main, off, arm] = o.kit;
  h.equip.main = { uid: h.nextUid++, base: main, rarity: "common", level: 1, bonuses: {}, revealed: true };
  h.equip.off = { uid: h.nextUid++, base: off, rarity: "common", level: 1, bonuses: {}, revealed: true };
  h.equip.armour = { uid: h.nextUid++, base: arm, rarity: "common", level: 1, bonuses: {}, revealed: true };
  recompute(h);
  f.hp = f.maxHp;
  return h;
}

/** Which equip slots an item can go into. */
/** Titan's Grip: two-handed weapons can go in either hand. */
export const hasGrip = (h?: Hero) => !!h && (h.relics["r_titans_grip"] ?? 0) > 0;
/** Titan's Grip or the War Harness: a two-handed weapon doesn't take your off-hand. */
export const keepsOffHand = (h?: Hero) => !!h && (hasGrip(h) || (h.relics["r_war_harness"] ?? 0) > 0);

export function slotsFor(item: GearItem, h?: Hero): EquipSlot[] {
  const eb = effectiveBase(item);
  if (eb.weaponType === "grenade") return ["off"];
  if (eb.slot === "main" && eb.twoHanded) return hasGrip(h) ? ["main", "off"] : ["main"];
  if (eb.slot === "main") return eb.offDamage !== undefined ? ["main", "off"] : ["main"];
  if (eb.slot === "off") return ["off"];
  if (eb.slot === "armour") return ["armour"];
  return h && hasThirdTrinket(h) ? ["trinket1", "trinket2", "trinket3"] : ["trinket1", "trinket2"];
}

/** Find an item anywhere the hero holds it. */
export function findItem(h: Hero, uid: number): { item: GearItem; where: EquipSlot | "backpack" } | null {
  for (const s of EQUIP_SLOTS) if (h.equip[s]?.uid === uid) return { item: h.equip[s]!, where: s };
  const it = h.backpack.find(i => i.uid === uid);
  return it ? { item: it, where: "backpack" } : null;
}

export function removeItem(h: Hero, uid: number) {
  for (const s of EQUIP_SLOTS) if (h.equip[s]?.uid === uid) delete h.equip[s];
  h.backpack = h.backpack.filter(i => i.uid !== uid);
}

/** Equip an item from the backpack (or a new find). Displaced items go to the backpack. Returns an error message or null. */
export function equipItem(h: Hero, item: GearItem, slot?: EquipSlot): string | null {
  const allowed = slotsFor(item, h);
  const keep = keepsOffHand(h);
  const target = slot && allowed.includes(slot) ? slot : allowed.find(s => !h.equip[s]) ?? allowed[0];
  const displaced: GearItem[] = [];
  if (h.equip[target]) displaced.push(h.equip[target]!);
  const twoHanded = effectiveBase(item).twoHanded;
  if (!keep && target === "main" && twoHanded && h.equip.off) displaced.push(h.equip.off);
  if (!keep && target === "off" && h.equip.main && effectiveBase(h.equip.main).twoHanded) displaced.push(h.equip.main);
  const inPack = h.backpack.some(i => i.uid === item.uid);
  const free = BACKPACK_SIZE - h.backpack.length + (inPack ? 1 : 0);
  if (displaced.length > free) return "Your backpack is full. Salvage something first.";
  removeItem(h, item.uid);
  for (const d of displaced) removeItem(h, d.uid);
  h.equip[target] = item;
  if (!keep && target === "main" && twoHanded) delete h.equip.off;
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
  if ((h.curses["c_overburdened"] ?? 0) > 0) return "🎒 Overburdened: your backpack won't take anything new. Equip it instead.";
  if (h.backpack.length >= BACKPACK_SIZE) return "Your backpack is full. Salvage something first.";
  h.backpack.push(item);
  return null;
}

export const SCRAP_VALUE: Record<Rarity, number> = { common: 1, uncommon: 2, rare: 4, epic: 7, legendary: 12, crimson: 20, epic_crimson: 60, legendary_crimson: 150 };

/** What an item scraps for (rarity + level, plus Scrap relics). */
export function scrapValue(h: Hero, item: GearItem): number {
  const n = SCRAP_VALUE[item.rarity] + (item.level - 1) + relicBonus(h.relics, "scrap");
  return (h.curses["c_scrap_rot"] ?? 0) > 0 ? Math.ceil(n / 2) : n;
}

/** Salvage into Scrap. Legendaries also give 2 Starmetal. */
export function salvage(h: Hero, uid: number): number {
  const found = findItem(h, uid);
  if (!found) return 0;
  const n = scrapValue(h, found.item);
  removeItem(h, uid);
  h.scrap += n;
  if (found.item.rarity === "legendary") h.starmetal += 2;
  if (["legendary", "crimson", "epic_crimson", "legendary_crimson"].includes(found.item.rarity)) h.f.persist["ach_salvage_leg"] = 1;
  if (found.item.rarity === "crimson") h.starmetal += 4;
  if (found.item.rarity === "epic_crimson") h.starmetal += 10;
  if (found.item.rarity === "legendary_crimson") h.starmetal += 25;
  recompute(h);
  return n;
}

export const removeGear = (h: Hero, uid: number) => removeItem(h, uid);

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

/** Price Gouged (curse): purchases, upgrades and rerolls cost 25% more. */
export const gouge = (h?: Hero) => ((h?.curses["c_gouged"] ?? 0) > 0 ? 1.25 : 1);
export const upgradeCost = (item: GearItem, h?: Hero) => Math.ceil(3 * item.level * gouge(h));
export const REROLL_COST = 4;
/** Each Forge reroll on the same item costs double the last, up to 5 rerolls per item. Deeper items start dearer. */
export const MAX_REROLLS = 5;
export const rerollCost = (item: GearItem, h?: Hero) => Math.ceil((REROLL_COST + Math.floor((item.level - 1) / 2)) * 2 ** (item.rerolls ?? 0) * gouge(h));
export const rerollsLeft = (item: GearItem) => Math.max(0, MAX_REROLLS - (item.rerolls ?? 0));

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
