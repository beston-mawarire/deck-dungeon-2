// Attributes: what a level-up buys in the Crawl (instead of talents). Six of them, two points a level, spent in the
// inventory. Each one feeds two or three passives; a class's favoured attributes give half as much again.
import { isUnholy } from "../engine/combat";
import type { HookDef, OriginId } from "../engine/types";

export type Attr = "str" | "agi" | "int" | "fai" | "vit" | "for";
export const ATTRS: Attr[] = ["str", "agi", "int", "fai", "vit", "for"];
/** Points each level-up gives. */
export const ATTR_PER_LEVEL = 2;
/** The most points one attribute can hold in a run. */
export const ATTR_MAX = 20;

/** A class leans toward some attributes: their passives are stronger. */
export const FAVOURED: Record<OriginId | "hero", Attr[]> = {
  warrior: ["str", "vit"], mage: ["int"], rogue: ["agi"], cleric: ["fai"], hero: []
};
/** How strong an attribute's passives are at this many points (favoured: half as much again). */
export const attrPower = (points: number, fav: boolean) => (fav ? points + Math.floor(points / 2) : points);

/** What n points of power give, line by line (shown before you spend, so a build is a plan you can see). */
export const ATTR_INFO: Record<Attr, { name: string; icon: string; blurb: string; lines: (n: number) => string[] }> = {
  str: { name: "Strength", icon: "💪", blurb: "Hit harder, and hit harder still with heavy weapons.",
    lines: n => [`+${n} Damage`, `Heavy weapons deal +${3 * n}% damage`, `+${n}% Bash`] },
  agi: { name: "Agility", icon: "🏹", blurb: "Slip hits and find the gaps.",
    lines: n => [`+${2 * n}% Dodge`, `+${Math.round(1.5 * n)}% Crit chance`, `+${Math.floor(n / 2)} off-hand Damage`] },
  int: { name: "Intellect", icon: "📘", blurb: "Statuses bite deeper, and your mana runs further.",
    lines: n => [`Statuses you inflict deal +${6 * n}% damage`, `+${Math.floor(n / 3)} Mana in every fight`] },
  fai: { name: "Faith", icon: "✝️", blurb: "Holy wrath, and what little healing there is goes further.",
    lines: n => [`Healing in a fight +${8 * n}%`, `Unholy foes take +${4 * n}% damage`] },
  vit: { name: "Vitality", icon: "❤️", blurb: "More to give, and the floor bites less.",
    lines: n => [`+${4 * n} Max HP`, `+${Math.floor(n / 2)} Armor`, `Spikes and burning pools hurt ${Math.floor(n / 3)} less`] },
  for: { name: "Fortune", icon: "🍀", blurb: "Gold, better finds and kinder prices.",
    lines: n => [`+${6 * n}% Gold`, `Better gear from chests and drops`, `Merchants charge ${Math.min(20, 2 * n)}% less`] }
};

const attr = (id: Attr, hooks: HookDef["hooks"]): HookDef => ({ id: `attr_${id}`, kind: "talent", name: ATTR_INFO[id].name, tags: [], text: ATTR_INFO[id].blurb, hooks });

/** The attributes as hook items (stacks = their power). Fortune and Vitality's floor passive are read by the run itself. */
export const ATTR_HOOKS: HookDef[] = [
  attr("str", {
    stats: (s, n) => { s.damage += n; s.bash += n; },
    modifyAttack: (_b, c, n) => { if (!c.offhand && c.attacker.heavy) c.mult *= 1 + 0.03 * n; }
  }),
  attr("agi", { stats: (s, n) => { s.dodge += 2 * n; s.critChance += Math.round(1.5 * n); s.offDamage += Math.floor(n / 2); } }),
  attr("int", {
    stats: (s, n) => { s.dotAmp = (s.dotAmp ?? 0) + 6 * n; },
    onFightStart: (_b, f, n) => { if (f.id === "player" && n >= 3) f.flags["manaMax"] = (f.flags["manaMax"] ?? 0) + Math.floor(n / 3); }
  }),
  attr("fai", {
    healMult: n => 1 + 0.08 * n,
    modifyAttack: (_b, c, n) => { if (isUnholy(c.defender)) c.mult *= 1 + 0.04 * n; }
  }),
  attr("vit", { stats: (s, n) => { s.maxHp += 4 * n; s.armor += Math.floor(n / 2); } }),
  attr("for", {})
];
