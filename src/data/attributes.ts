// Attributes: what a level-up buys in the Crawl (instead of talents). Six of them, two points a level, spent in the
// inventory. Each one feeds two or three passives. Every class has a base attribute: each point in it also adds
// +1 to the class's base Damage.
import type { HookDef, OriginId } from "../engine/types";

export type Attr = "str" | "agi" | "int" | "fai" | "vit" | "for";
export const ATTRS: Attr[] = ["str", "agi", "int", "fai", "vit", "for"];
/** Points each level-up gives. */
export const ATTR_PER_LEVEL = 2;
/** The most points one attribute can hold in a run. */
export const ATTR_MAX = 20;

/** Each class's base attribute (its points also raise the class's base Damage). */
export const BASE_ATTR: Record<OriginId | "hero", Attr | null> = { warrior: "str", mage: "int", rogue: "agi", cleric: "fai", hero: null };
/** An attribute's power is simply its points. */
export const attrPower = (points: number, _base = false) => points;

/** Caps on the "less damage taken" passives. */
export const RESIST_CAP = 40;
const pct = (n: number, per: number, cap = 100) => Math.min(cap, +(per * n).toFixed(1));
/** Base-attribute points per +1 base Damage. */
export const BASE_DMG_PER = 3;
/** Intellect points per +1 Max Mana. */
export const INT_MANA_PER = 3;
/** Per point (kept small: a level is two points, and a run is many levels). */
export const PER = { strHp: 2, strBash: 0.5, agiDodge: 1, agiCrit: 0.5, faiRes: 2, vitHeal: 0.03, vitRegen: 0.04, forGold: 0.03, forLuck: 0.02, forShop: 0.01 };

/** What n points give, line by line (shown before you spend, so a build is a plan you can see). */
export const ATTR_INFO: Record<Attr, { name: string; icon: string; blurb: string; lines: (n: number) => string[] }> = {
  str: { name: "Strength", icon: "💪", blurb: "A bigger frame, and blows that stagger.",
    lines: n => [`+${PER.strHp * n} Max HP`, `+${pct(n, PER.strBash)}% Bash`] },
  agi: { name: "Agility", icon: "🏹", blurb: "Slip hits, and find the gaps.",
    lines: n => [`+${pct(n, PER.agiDodge)}% Dodge`, `+${pct(n, PER.agiCrit)}% Crit chance`] },
  int: { name: "Intellect", icon: "📘", blurb: "A deeper well of mana.",
    lines: n => [`+${Math.floor(n / INT_MANA_PER)} Max Mana (1 for every ${INT_MANA_PER} points)`] },
  fai: { name: "Faith", icon: "✝️", blurb: "Bear what the dark throws at you, and find your curses lifted sooner.",
    lines: n => [`Reactions hit you for ${pct(n, PER.faiRes, RESIST_CAP)}% less`, `Status damage on you −${pct(n, PER.faiRes, RESIST_CAP)}%`, `Altars that lift curses turn up more often`] },
  vit: { name: "Vitality", icon: "❤️", blurb: "Every bit of healing goes further.",
    lines: n => [`All healing +${pct(n, PER.vitHeal * 100)}%`, `Regen heals +${pct(n, PER.vitRegen * 100)}%`] },
  for: { name: "Fortune", icon: "🍀", blurb: "Gold, better finds and kinder prices.",
    lines: n => [`+${pct(n, PER.forGold * 100)}% Gold`, `Slightly better gear from chests and drops`, `Merchants charge ${pct(n, PER.forShop * 100, 15)}% less`] }
};

const attr = (id: Attr, hooks: HookDef["hooks"]): HookDef => ({ id: `attr_${id}`, kind: "talent", name: ATTR_INFO[id].name, tags: [], text: ATTR_INFO[id].blurb, hooks });

/** The attributes as hook items (stacks = their points). Faith's resistances, Vitality's Regen, Intellect's mana,
 *  Fortune and the base-attribute Damage are read where they apply (the statuses, the fight, the run and the hero's stats). */
export const ATTR_HOOKS: HookDef[] = [
  attr("str", { stats: (s, n) => { s.maxHp += PER.strHp * n; s.bash += PER.strBash * n; } }),
  attr("agi", { stats: (s, n) => { s.dodge += PER.agiDodge * n; s.critChance += PER.agiCrit * n; } }),
  attr("int", {}),
  attr("fai", {}),
  attr("vit", { healMult: n => 1 + PER.vitHeal * n }),
  attr("for", {})
];

/** The passive tree's attribute nodes: each one taken is +1 to that attribute, on top of what you spend in a run. */
export const TREE_ATTRS: HookDef[] = ATTRS.map(a => ({ kind: "talent", id: `ta_${a}`, name: ATTR_INFO[a].name, tags: [], text: `+1 ${ATTR_INFO[a].name}`, hooks: {} }) as HookDef);
