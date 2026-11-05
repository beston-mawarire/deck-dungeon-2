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
/** Kept for older callers: the attributes a class leans toward (just its base attribute now). */
export const FAVOURED: Record<OriginId | "hero", Attr[]> = { warrior: ["str"], mage: ["int"], rogue: ["agi"], cleric: ["fai"], hero: [] };
/** An attribute's power is simply its points. */
export const attrPower = (points: number, _base = false) => points;

/** Caps on the "less damage taken" passives. */
export const RESIST_CAP = 60;
const pct = (n: number, per: number, cap = 100) => Math.min(cap, per * n);

/** What n points give, line by line (shown before you spend, so a build is a plan you can see). */
export const ATTR_INFO: Record<Attr, { name: string; icon: string; blurb: string; lines: (n: number) => string[] }> = {
  str: { name: "Strength", icon: "💪", blurb: "A bigger frame, and blows that stagger.",
    lines: n => [`+${4 * n} Max HP`, `+${n}% Bash`] },
  agi: { name: "Agility", icon: "🏹", blurb: "Slip hits, and find the gaps.",
    lines: n => [`+${2 * n}% Dodge`, `+${Math.round(1.5 * n)}% Crit chance`, `Crits deal +${5 * n}% damage`] },
  int: { name: "Intellect", icon: "📘", blurb: "Elements and statuses bite deeper; staves and wands strike harder.",
    lines: n => [`Status damage +${6 * n}%`, `Reactions deal +${6 * n}%`, `Staves and wands deal +${4 * n}% damage`] },
  fai: { name: "Faith", icon: "✝️", blurb: "Bear what the dark throws at you, and find your curses lifted sooner.",
    lines: n => [`Reactions hit you for ${pct(n, 4, RESIST_CAP)}% less`, `Status damage on you −${pct(n, 4, RESIST_CAP)}%`, `Altars that lift curses turn up more often`] },
  vit: { name: "Vitality", icon: "❤️", blurb: "Every bit of healing goes further.",
    lines: n => [`All healing +${8 * n}%`, `Regen heals +${10 * n}%`] },
  for: { name: "Fortune", icon: "🍀", blurb: "Gold, better finds and kinder prices.",
    lines: n => [`+${6 * n}% Gold`, `Better gear from chests and drops`, `Merchants charge ${Math.min(20, 2 * n)}% less`] }
};

const attr = (id: Attr, hooks: HookDef["hooks"]): HookDef => ({ id: `attr_${id}`, kind: "talent", name: ATTR_INFO[id].name, tags: [], text: ATTR_INFO[id].blurb, hooks });

/** The attributes as hook items (stacks = their points). Faith's resistances, Vitality's Regen, Fortune and the
 *  base-attribute Damage are read where they apply (the statuses, the run and the hero's stats). */
export const ATTR_HOOKS: HookDef[] = [
  attr("str", { stats: (s, n) => { s.maxHp += 4 * n; s.bash += n; } }),
  attr("agi", { stats: (s, n) => { s.dodge += 2 * n; s.critChance += Math.round(1.5 * n); s.critDmg = (s.critDmg ?? 0) + 5 * n; } }),
  attr("int", {
    stats: (s, n) => { s.dotAmp = (s.dotAmp ?? 0) + 6 * n; },
    reactionMult: (_b, _f, n) => 1 + 0.06 * n,
    modifyAttack: (_b, c, n) => { if (!c.offhand && c.attacker.persist["mainArcane"]) c.mult *= 1 + 0.04 * n; }
  }),
  attr("fai", {}),
  attr("vit", { healMult: n => 1 + 0.08 * n }),
  attr("for", {})
];
