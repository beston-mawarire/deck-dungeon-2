// Heroes and enemies.
import { starterDeck } from "./combat";
import type { ClassId, Fighter, Suit } from "./types";

export const CLASSES: Record<ClassId, { name: string; title: string; rule: string; hp: number; damage: number; armor: number; start: string; tags: string[] }> = {
  king: { name: "King", title: "Conqueror", rule: "Carnage: damage past an enemy's HP carries into the next fight's enemy.", hp: 30, damage: 4, armor: 0, start: "signet_ring", tags: ["Strike", "Crit"] },
  jack: { name: "Jack", title: "Duelist", rule: "Two dice: the higher attacks, the lower adds to Armor this round.", hp: 28, damage: 3, armor: 1, start: "parrying_dagger", tags: ["Guard", "Thorns"] },
  queen: { name: "Queen", title: "Sovereign", rule: "Sovereign Blood: Damage is a quarter of current HP (Barrier included).", hp: 24, damage: 0, armor: 0, start: "chalice", tags: ["Blood", "Guard"] },
  ace: { name: "Ace", title: "Gambler", rule: "Tarot hand: attacks with 3 cards; each card fires its number's face effects.", hp: 26, damage: 2, armor: 0, start: "marked_deck", tags: ["Luck", "Gold"] }
};

export function makeHero(cls: ClassId, rng: () => number): Fighter {
  const c = CLASSES[cls];
  const f: Fighter = {
    id: "player", name: c.name, hp: c.hp, maxHp: c.hp, armor: c.armor, damage: c.damage,
    statuses: {}, flags: {}, items: { [c.start]: 1 }, cls, gold: 0
  };
  if (cls === "ace") f.deck = starterDeck(rng);
  return f;
}

const SUIT_NAME: Record<Suit, string> = { S: "Spades", C: "Clubs", H: "Hearts", D: "Diamonds" };
export const SUIT_ICON: Record<Suit, string> = { S: "♠", C: "♣", H: "♥", D: "♦" };

export interface EnemyOpts {
  elite?: boolean;
  affixes?: string[];
  boss?: "J" | "Q" | "K";
}

/** A number-card enemy (or a face-card boss) for the given Act. */
export function makeEnemy(value: number, suit: Suit, act: number, opts: EnemyOpts = {}): Fighter {
  const boss = opts.boss;
  let hp = boss ? 22 * act : value + 4 + 4 * (act - 1);
  let power = 2 + 2 * (act - 1) + (boss ? 2 : 0);
  let armor = 0;
  if (opts.elite) {
    hp += 5;
    power += 1;
  }
  if (suit === "S") power += 1;
  if (suit === "C") armor += 1;
  const items: Record<string, number> = { [`trait_${suit}`]: 1 };
  for (const a of opts.affixes ?? []) items[a] = 1;
  const name = boss ? `${{ J: "Jack", Q: "Queen", K: "King" }[boss]} of ${SUIT_NAME[suit]}` : `${value}${SUIT_ICON[suit]}${opts.elite ? " Elite" : ""}`;
  return { id: "enemy", name, hp, maxHp: hp, armor, damage: power, statuses: {}, flags: {}, items, suit, elite: !!opts.elite, boss: !!boss };
}
