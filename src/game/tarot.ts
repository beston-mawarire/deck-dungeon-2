/** Tarot: the Abyss's reward. Each clear of the Abyss gives one card (you choose 1 of 3 you don't own; once you own them
 *  all, a card levels up instead). Up to two cards go with you into a normal run.
 *
 *  The rules the deck keeps (so no card is a must-pick):
 *  - Every card is a bargain: what it gives comes with what it takes. A few that bend the rules ("Edicts") also add Heat.
 *  - No card switches off a class's tools (mana, skills, dice): they bend them, never remove them.
 *  - Levels stop at III: II strengthens the boon by a quarter and opens the card's Reversed side; III is a gold frame, no more power.
 *  - Reversed: twice the boon, twice the bane (and twice the Heat).
 *  - Every effect is written out in full on the card. */
import type { Hero } from "./hero";

export interface TarotDef {
  id: string;
  /** Its number, I to XX (the Fool is 0). */
  num: string;
  name: string;
  icon: string;
  /** "edict" cards bend a rule and add Heat on top of their bane. */
  kind: "bargain" | "edict";
  /** What it gives, at this strength (1 at level I; 1.25 at II; doubled Reversed). */
  boon: (m: number) => string;
  /** What it takes, at this strength (1, or 2 Reversed). */
  bane: (m: number) => string;
  heat?: number;
  /** Some cards can't be turned over (there's nothing to double). */
  noReverse?: boolean;
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const n1 = (x: number) => Math.max(1, Math.round(x));

export const TAROT: TarotDef[] = [
  { id: "fool", num: "0", name: "The Fool", icon: "🃏", kind: "bargain",
    boon: m => (m > 1 ? "Set out with a random Epic weapon and a random Epic armour" : "Set out with a random Epic weapon"),
    bane: m => (m >= 2 ? "Your starting kit (weapon, off-hand and armour) is gone, and so are 10% of your Max HP" : "Your starting kit (weapon, off-hand and armour) is gone") },
  { id: "magician", num: "I", name: "The Magician", icon: "🪄", kind: "bargain",
    boon: m => (m >= 2 ? "Two plain hit faces on your weapon become spells (Fire Bolt and Frost Lance)" : `A plain hit face on your weapon becomes a Fire Bolt (Burn ${m > 1 ? 4 : 3})`),
    bane: m => (m >= 2 ? "Two other hit faces become grazes" : "Another hit face becomes a graze") },
  { id: "priestess", num: "II", name: "The High Priestess", icon: "🌙", kind: "edict", heat: 1,
    boon: () => "Every floor is laid bare the moment you land: halls, foes, chests and the way down",
    bane: m => `Gold found −${pct(0.25 * m)}` },
  { id: "empress", num: "III", name: "The Empress", icon: "🌾", kind: "bargain",
    boon: m => `Foes leave Camp materials ${pct(0.6 * m)} more often, and a little more of them`,
    bane: m => `Every foe has ${pct(0.15 * m)} more HP` },
  { id: "emperor", num: "IV", name: "The Emperor", icon: "👑", kind: "bargain",
    boon: m => `${n1(m)} more Elite${n1(m) > 1 ? "s" : ""} on every floor (from a layer's second), and every Elite drops gear${m > 1 ? ", one rarity better" : ""}`,
    bane: m => `Elites have ${pct(0.25 * m)} more HP and hit ${pct(0.15 * m)} harder` },
  { id: "hierophant", num: "V", name: "The Hierophant", icon: "⛪", kind: "bargain",
    boon: m => `A curse-lifting altar on every floor${m > 1 ? ", and each lift also heals 25%" : ""}`,
    bane: m => `Set out with ${n1(m)} random curse${n1(m) > 1 ? "s" : ""}` },
  { id: "lovers", num: "VI", name: "The Lovers", icon: "💞", kind: "bargain",
    boon: m => `Healing Potions heal ${pct(0.5 * m)} more`,
    bane: m => `You can carry ${n1(m)} fewer Healing Potion${n1(m) > 1 ? "s" : ""}` },
  { id: "chariot", num: "VII", name: "The Chariot", icon: "🏇", kind: "bargain",
    boon: m => `The way down is shown on every floor, and you gain ${pct(0.15 * m)} more XP`,
    bane: m => `${n1(m)} fewer chest${n1(m) > 1 ? "s" : ""} on every floor` },
  { id: "strength", num: "VIII", name: "Strength", icon: "🦁", kind: "bargain",
    boon: m => `${n1(m)} more Champion${n1(m) > 1 ? "s" : ""} on every floor (from a layer's second), and every Champion drops gear${m > 1 ? ", often Epic" : ""}`,
    bane: m => `Champions hit ${pct(0.2 * m)} harder` },
  { id: "hermit", num: "IX", name: "The Hermit", icon: "🏮", kind: "bargain",
    boon: m => `Go down a floor without drinking a Healing Potion on it: +${n1(m)} Mana${m > 1 ? " and heal 5%" : ""}`,
    bane: m => `Merchants charge ${pct(0.4 * m)} more` },
  { id: "wheel", num: "X", name: "Wheel of Fortune", icon: "🎡", kind: "bargain",
    boon: m => `Epic and Legendary finds ${pct(0.6 * m)} likelier`,
    bane: m => `Rare and Uncommon finds ${pct(1 - Math.pow(0.7, m))} rarer (more Commons): feast or famine` },
  { id: "justice", num: "XI", name: "Justice", icon: "⚖️", kind: "bargain", noReverse: true,
    boon: m => `Your misses become grazes${m > 1 ? ", and you deal 10% more damage" : ""}`,
    bane: () => "Your crits become plain hits" },
  { id: "hanged", num: "XII", name: "The Hanged Man", icon: "🙃", kind: "bargain",
    boon: m => `A Blood Oath on every layer, and every Oath gives one rarity better${m > 1 ? " (and a second, lesser item)" : ""}`,
    bane: m => `Set out with ${pct(0.15 * m)} less Max HP` },
  { id: "death", num: "XIII", name: "Death", icon: "💀", kind: "bargain",
    boon: m => `Beat a foe within 3 rounds: +1 Reaping (each: +3% Rare-or-better finds, up to ${n1(10 * m)})`,
    bane: m => `Every foe hits ${pct(0.12 * m)} harder` },
  { id: "temperance", num: "XIV", name: "Temperance", icon: "⚗️", kind: "bargain",
    boon: m => `Reactions deal ${pct(0.5 * m)} more`,
    bane: m => `Status damage (Burn, Poison, Bleed…) −${pct(0.25 * m)}` },
  { id: "devil", num: "XV", name: "The Devil", icon: "😈", kind: "bargain",
    boon: m => `Each curse you carry makes Rare-or-better finds ${pct(0.12 * m)} likelier`,
    bane: m => `Set out with ${n1(2 * m)} random curses` },
  { id: "tower", num: "XVI", name: "The Tower", icon: "🗼", kind: "bargain",
    boon: m => `A layer boss's hoard offers a choice of two items, with Epics and Legendaries far likelier (×${(1 + 0.5 * m).toFixed(1)})`,
    bane: m => `Layer bosses have ${pct(0.3 * m)} more HP and hit ${pct(0.15 * m)} harder` },
  { id: "star", num: "XVII", name: "The Star", icon: "⭐", kind: "bargain",
    boon: m => `A Sacred Spring on every floor${m > 1 ? ", and your Max HP +5" : ""}`,
    bane: m => `Healing Potions heal ${pct(0.2 * m)} less` },
  { id: "moon", num: "XVIII", name: "The Moon", icon: "🌕", kind: "bargain",
    boon: m => `Iron chests are Mimics ${m >= 2 ? "half" : m > 1 ? "two-fifths" : "a third"} of the time, and a Mimic's hoard holds a second, better item`,
    bane: m => `Mimics are Elites even on a layer's first floor, with ${pct(0.25 * m)} more HP` },
  { id: "sun", num: "XIX", name: "The Sun", icon: "☀️", kind: "bargain",
    boon: m => `Each new layer begins with full HP and Mana${m > 1 ? ", and a Healing Potion" : ""}`,
    bane: m => (m >= 2 ? "Crimson foes and dragons stir from the very first layer, and more often" : "Crimson foes and dragons stir from the very first layer") },
  { id: "judgement", num: "XX", name: "Judgement", icon: "📯", kind: "edict", heat: 2,
    boon: m => `Once a run, when you fall, rise again with ${pct(Math.min(1, 0.5 * m))} HP`,
    bane: () => "Rising costs every coin you carry" }
];
export const TAROT_MAP = new Map(TAROT.map(t => [t.id, t]));
export const TAROT_SLOTS = 2;
/** Cards that work through hidden hook items (see data/tarotHooks). */
export const TAROT_HOOKED = new Set(["temperance", "justice"]);
export const TAROT_MAX_LEVEL = 3;
/** Level at which a card's Reversed side opens. */
export const REVERSE_LEVEL = 2;

/** A card as carried into a run. */
export interface TarotSlot { id: string; lvl: number; rev?: boolean }

/** How hard a carried card pulls: 0 if it isn't carried. */
export function tarotOf(h: Pick<Hero, "tarot">, id: string): { on: boolean; boon: number; bane: number } {
  const s = h.tarot?.find(t => t.id === id);
  if (!s) return { on: false, boon: 0, bane: 0 };
  return { on: true, boon: (s.lvl >= 2 ? 1.25 : 1) * (s.rev ? 2 : 1), bane: s.rev ? 2 : 1 };
}
export const boonOf = (s: TarotSlot) => (s.lvl >= 2 ? 1.25 : 1) * (s.rev ? 2 : 1);
export const baneOf = (s: TarotSlot) => (s.rev ? 2 : 1);
/** The Heat a carried card adds (Edicts only). */
export const tarotHeat = (slots: TarotSlot[] | undefined) => (slots ?? []).reduce((a, s) => a + (TAROT_MAP.get(s.id)?.heat ?? 0) * (s.rev ? 2 : 1), 0);

/** What an Abyss clear offers: three cards you don't own (fewer if you own nearly all), topped up with level-ups. */
export function tarotOffer(owned: Partial<Record<string, number>>, rng: () => number, n = 3): string[] {
  const shuffle = <T>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const fresh = shuffle(TAROT.filter(t => !owned[t.id]).map(t => t.id));
  const ups = shuffle(TAROT.filter(t => (owned[t.id] ?? 0) > 0 && (owned[t.id] ?? 0) < TAROT_MAX_LEVEL).map(t => t.id));
  return [...fresh, ...ups].slice(0, n);
}
