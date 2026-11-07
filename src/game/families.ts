// Item families, weights and damage classes. Every base belongs to a family (which affixes and Scrolls of Power fit it),
// a load (light, medium or heavy: heavy gear halves Dodge and stops Evade and Haste) and, for weapons, a damage class.
import type { GearBase } from "../engine/types";
import { baseOf } from "./hero";

export type WeaponFamily = "knife" | "shortblade" | "greatblade" | "blunt" | "breaker" | "arcane" | "polearm" | "ranged";
export type Family = WeaponFamily | "throwable" | "shield" | "focus" | "armour" | "ring" | "amulet" | "charm";
export type Load = "light" | "medium" | "heavy";
export type Strike = "blade" | "blunt" | "breaking" | "spell";
export interface FamilyInfo { family: Family; load: Load; strike?: Strike }

export const FAMILY_NAME: Record<Family, string> = {
  knife: "Knife Edge", shortblade: "Short Blade", greatblade: "Great Blade", blunt: "Blunt Force", breaker: "Breaker",
  arcane: "Arcane", polearm: "Polearm", ranged: "Ranged", throwable: "Throwable", shield: "Shield", focus: "Focus",
  armour: "Armour", ring: "Ring", amulet: "Amulet", charm: "Charm"
};
export const LOAD_NAME: Record<Load, string> = { light: "Light", medium: "Medium", heavy: "Heavy" };
export const STRIKE_NAME: Record<Strike, string> = { blade: "Blade", blunt: "Blunt", breaking: "Breaking", spell: "Spell" };

const KNIFE = /dagger|dirk|knife|knives|stiletto|kris|shiv|athame|misericorde|\bsai\b|kunai|shuriken|stars\b|backstabber|sting\b/i;
const ARCANE = /wand|\brod\b|scepter|sceptre|greatstaff|staff|stave|\bcane\b|conduit/i;
const BREAKER = /mace|\bpick\b|morning ?star/i;
const BLUNT = /hammer|maul|club|flail|cudgel|sledge|lute|aspergillum|censer|bell\b|knuckle|bonebreaker|whip|lash|quarterstaff|thunderclap|worldbell/i;
const POLE = /spear|trident|glaive|halberd|lance|javelin|pike|scythe|reaper/i;
const RANGED = /\bbow\b|crossbow|sling|blowgun/i;
const HEAVY_BLUNT = /maul|war ?hammer|sledge|siege|earthshaker|mountain|worldbreaker|titanfall/i;
const LIGHT_SHIELD = /buckler|targe|parry|gauche|pot lid/i;
const HEAVY_SHIELD = /tower|pavise|wall\b|bulwark|bastion|great shield|rampart|unyielding|oathkeeper|unbroken/i;
const RING = /\bring\b|band\b|signet|\bloop\b|knuckle/i;
const AMULET = /amulet|pendant|necklace|locket|talisman|medallion|choker|torc|collar|chain\b|brooch/i;

const cache = new Map<string, FamilyInfo>();

function weaponFamily(b: GearBase): WeaponFamily {
  if (b.weaponType && b.weaponType !== "grenade") return "knife";
  const n = `${b.id} ${b.name}`;
  if (b.tags.includes("Arcane") && ARCANE.test(n)) return "arcane";
  if (KNIFE.test(n)) return "knife";
  if (RANGED.test(n)) return "ranged";
  if (POLE.test(n)) return "polearm";
  if (BREAKER.test(n)) return "breaker";
  if (ARCANE.test(n)) return b.tags.includes("Arcane") || !/quarterstaff/i.test(n) ? "arcane" : "blunt";
  if (BLUNT.test(n)) return "blunt";
  return b.twoHanded ? "greatblade" : "shortblade";
}

function armourLoad(b: GearBase): Load {
  const m = b.text.match(/^(Light|Medium|Heavy)\b/);
  if (m) return m[1].toLowerCase() as Load;
  const n = `${b.id} ${b.name}`;
  if (/plate|panoply|scale\b|bulwark|bastion|juggernaut|laminar|banded/i.test(n)) return "heavy";
  if (/robe|vestment|cloak|silk|habit|wraps|mantle|garb|shroud|coat|jerkin|leather|motley|apron/i.test(n)) return "light";
  const a = b.armor ?? 0;
  return a >= 5 ? "heavy" : a <= 1 ? "light" : "medium";
}

/** Work out a base's family, load and damage class (Legendaries use the base they're disguised as, then their own name). */
export function classify(b: GearBase): FamilyInfo {
  const hit = cache.get(b.id);
  if (hit) return hit;
  let out: FamilyInfo;
  if (b.kind === "weapon" && b.weaponType === "grenade") out = { family: "throwable", load: "light" };
  else if (b.kind === "weapon") {
    let fam = weaponFamily(b);
    // A Legendary's poetic name says little: trust the base it hides as, unless its own name is clear.
    if (b.legendary?.asBase) { try { const asB = baseOf(b.legendary.asBase); if (fam === "shortblade" || fam === "greatblade") fam = weaponFamily({ ...asB, twoHanded: b.twoHanded }); } catch { /* keep */ } }
    const n = `${b.id} ${b.name}`;
    const load: Load = b.heavy || fam === "greatblade" ? "heavy"
      : fam === "knife" || fam === "ranged" ? "light"
      : fam === "arcane" ? (b.twoHanded ? "medium" : "light")
      : fam === "polearm" ? (/halberd|glaive|lance|scythe|reaper/i.test(n) ? "heavy" : "medium")
      : (fam === "blunt" || fam === "breaker") && !/quarterstaff/i.test(n) && (b.twoHanded || HEAVY_BLUNT.test(n)) ? "heavy" : "medium";
    const strike: Strike = fam === "blunt" ? "blunt" : fam === "breaker" ? "breaking" : fam === "arcane" ? "spell" : "blade";
    out = { family: fam, load, strike };
  } else if (b.kind === "off") {
    if (b.shield) {
      const n = `${b.id} ${b.name}`;
      out = { family: "shield", load: LIGHT_SHIELD.test(n) ? "light" : HEAVY_SHIELD.test(n) ? "heavy" : "medium" };
    } else out = { family: "focus", load: "light" };
  } else if (b.kind === "armour") out = { family: "armour", load: armourLoad(b) };
  else {
    const n = `${b.id} ${b.name}`;
    out = { family: RING.test(n) ? "ring" : AMULET.test(n) ? "amulet" : "charm", load: "light" };
  }
  cache.set(b.id, out);
  return out;
}

/** "Short Blade · Medium · Blade", "Shield · Heavy", "Armour · Light", "Ring". */
export function familyLine(b: GearBase): string {
  const c = classify(b);
  if (c.family === "ring" || c.family === "amulet" || c.family === "charm" || c.family === "throwable" || c.family === "focus") return FAMILY_NAME[c.family];
  const shieldName = c.family === "shield" ? (c.load === "light" ? "Light Shield" : c.load === "heavy" ? "Heavy Shield" : "Shield") : null;
  if (shieldName) return shieldName;
  if (c.family === "armour") return `${LOAD_NAME[c.load]} Armour`;
  return [FAMILY_NAME[c.family], LOAD_NAME[c.load], c.strike ? STRIKE_NAME[c.strike] : null].filter(Boolean).join(" · ");
}

/** Heavy armour and shields: half Dodge and no Evade or Haste while worn, for 30% more Armor. (Weapons don't carry this any more.) */
export const isHeavy = (b: GearBase) => b.kind !== "weapon" && classify(b).load === "heavy" && classify(b).family !== "focus";
