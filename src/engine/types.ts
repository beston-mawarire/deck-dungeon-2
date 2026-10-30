// Core types for Deck Dungeon 2. Everything the library describes is built from these.

export const TAGS = [
  "Strike", "Crit", "Bleed", "Burn", "Poison", "Frost", "Storm", "Hex",
  "Guard", "Thorns", "Blood", "Gold", "Luck", "Kill", "Tempo"
] as const;
export type Tag = (typeof TAGS)[number];

export const NEGATIVE_STATUSES = ["bleed", "burn", "poison", "chill", "shock", "weak", "exposed", "blind", "stun", "doom"] as const;
export const POSITIVE_STATUSES = ["regen", "barrier", "might", "haste", "focus", "evade", "spikes", "ward"] as const;
export type NegativeStatus = (typeof NEGATIVE_STATUSES)[number];
export type PositiveStatus = (typeof POSITIVE_STATUSES)[number];
export type StatusId = NegativeStatus | PositiveStatus;

export type Rarity = "common" | "uncommon" | "rare" | "cursed" | "boss" | "legendary";
export type ClassId = "king" | "jack" | "queen" | "ace";
export type Suit = "S" | "C" | "H" | "D";

/** Which faces an effect listens to. A number means that exact face. */
export type FaceGroup = number | "low" | "mid" | "high" | "odd" | "even" | "doubles" | "any";

/** Base outcome of a face before items change it. */
export type FaceKind = "graze" | "hit" | "crit" | "jackpot";

export type Statuses = Partial<Record<StatusId, number>>;

export interface Fighter {
  id: "player" | "enemy";
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  /** Flat damage for heroes; Power for enemies. The Queen ignores this (see damageOf). */
  damage: number;
  statuses: Statuses;
  /** Run-long or fight-long flags set by reactions and items. */
  flags: Record<string, number>;
  /** Items this fighter holds: item id -> stacks. Enemies hold affixes here. */
  items: Record<string, number>;
  cls?: ClassId;
  suit?: Suit;
  gold?: number;
  elite?: boolean;
  boss?: boolean;
  /** The Ace's deck (all cards) and draw pile. */
  deck?: Card[];
  pile?: Card[];
}

export type TarotSuit = "wands" | "cups" | "swords" | "pentacles";
export interface Card {
  v: number;
  suit: TarotSuit;
}

/** Everything an item can see and change while an attack resolves. */
export interface AttackCtx {
  attacker: Fighter;
  defender: Fighter;
  face: number;
  kind: FaceKind;
  /** Damage multiplier from the face kind (graze 0.5, hit 1, crit 2, jackpot 3). */
  mult: number;
  ignoreArmor: boolean;
  bonus: number;
  /** Set to true to make the attack deal no damage (e.g. a utility face). */
  noDamage: boolean;
  /** Set when the Jack's two dice match. */
  doubles: boolean;
  /** Final damage dealt to HP after Armor and Barrier (filled in after the hit). */
  dealt: number;
  /** True for the Ace: one card of a hand firing its face. */
  fromCard?: boolean;
}

export interface Battle {
  player: Fighter;
  enemy: Fighter;
  round: number;
  rng: () => number;
  log: string[];
  over: null | "won" | "lost" | "fled";
  /** Overkill damage the King carries into the next fight. */
  carnage: number;
}

export interface Hooks {
  /** Fired when this fighter's attack lands on a matching face. */
  face?: { group: FaceGroup; run: (b: Battle, ctx: AttackCtx, stacks: number) => void }[];
  /** Change the rolled number before the face is read (nudges, rerolls). */
  modifyRoll?: (b: Battle, self: Fighter, roll: number, stacks: number) => number;
  /** Change the face kind (e.g. "your 1s count as 6s"). */
  modifyKind?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onHit?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onCrit?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onKill?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  /** This fighter was attacked (after damage). */
  whenHit?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onGuard?: (b: Battle, self: Fighter, stacks: number) => void;
  onFightStart?: (b: Battle, self: Fighter, stacks: number) => void;
  onFightEnd?: (b: Battle, self: Fighter, stacks: number) => void;
  onRoundStart?: (b: Battle, self: Fighter, stacks: number) => void;
  onRoundEnd?: (b: Battle, self: Fighter, stacks: number) => void;
  /** A status is about to land on this fighter; return the amount that should land (0 blocks it). */
  incomingStatus?: (b: Battle, self: Fighter, status: StatusId, amount: number, stacks: number) => number;
  /** This fighter applied a status to someone. */
  onStatusApplied?: (b: Battle, self: Fighter, target: Fighter, status: StatusId, amount: number, stacks: number) => void;
  /** Change how much a reaction deals (multiplier). */
  reactionMult?: (b: Battle, self: Fighter, stacks: number) => number;
  /** Extra faces on the die (Seventh Face). */
  dieSides?: (stacks: number) => number;
}

export interface ItemDef {
  id: string;
  name: string;
  kind: "relic" | "talent" | "affix";
  rarity: Rarity;
  tags: Tag[];
  text: string;
  /** Talents only: class lock. */
  cls?: ClassId;
  hooks: Hooks;
}
