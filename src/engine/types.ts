// Core types for Deck Dungeon 2: an item-driven dungeon crawler where your weapon is your die.

export const TAGS = [
  "Strike", "Crit", "Bleed", "Burn", "Poison", "Frost", "Storm", "Hex",
  "Guard", "Thorns", "Blood", "Gold", "Luck", "Kill", "Tempo", "Arcane", "Holy"
] as const;
export type Tag = (typeof TAGS)[number];

export const NEGATIVE_STATUSES = ["bleed", "burn", "poison", "chill", "shock", "weak", "exposed", "blind", "stun", "doom", "static", "soaked", "smoulder", "dazzled"] as const;
export const POSITIVE_STATUSES = ["regen", "barrier", "might", "haste", "focus", "evade", "spikes", "ward", "charged", "kindled", "grounded", "smoulder_soul"] as const;
export type NegativeStatus = (typeof NEGATIVE_STATUSES)[number];
export type PositiveStatus = (typeof POSITIVE_STATUSES)[number];
export type StatusId = NegativeStatus | PositiveStatus;
export type Statuses = Partial<Record<StatusId, number>>;

/** Crimson sits above Legendary: it only drops from Crimson bosses (Endless, after the fifth boss). */
export const RARITIES = ["common", "uncommon", "rare", "epic", "legendary", "crimson"] as const;
export type Rarity = (typeof RARITIES)[number];

export type OriginId = "warrior" | "rogue" | "mage" | "cleric";
export type Slot = "main" | "off" | "armour" | "trinket";

/** Which faces an effect listens to. A number means that exact face. */
export type FaceGroup = number | "low" | "mid" | "high" | "odd" | "even" | "any";

/** How a face resolves before items change it. */
export type FaceKind = "miss" | "graze" | "hit" | "crit";

/** One face of a weapon's die. */
export interface FaceSpec {
  kind: FaceKind;
  /** Shown on the die, e.g. "Fire Bolt". Defaults to the kind's name. */
  name?: string;
  /** Extra effect when this face comes up (spells, bleeds, stuns...). */
  run?: (b: Battle, ctx: AttackCtx) => void;
  /** Overkill from this face carries into the next fight (Cleave). */
  cleave?: boolean;
  /** Spells cast by Arcane weapons ignore Armor. */
  magic?: boolean;
  /** Purify (Holy cleansing weapons): no normal damage; strips the enemy's negative statuses and deals 2× Damage per status removed. */
  cleanse?: boolean;
}

export interface Fighter {
  id: "player" | "enemy";
  name: string;
  hp: number;
  maxHp: number;
  armor: number;
  /** Flat damage before the face multiplier (weapon damage for the hero, Power for monsters). */
  damage: number;
  /** The die this fighter attacks with. */
  faces: FaceSpec[];
  /** A second, weaker die from an off-hand weapon. */
  offFaces?: FaceSpec[];
  offDamage?: number;
  statuses: Statuses;
  /** Fight-only flags, cleared at the start of each fight. */
  flags: Record<string, number>;
  /** Run-long counters that survive between fights (Kingsbane kills, Hollow Crown barrier...). */
  persist: Record<string, number>;
  /** Every active hook source: def id -> stacks (gear, bonuses, relics, talents, traits). */
  items: Record<string, number>;
  gold: number;
  elite?: boolean;
  champion?: boolean;
  boss?: boolean;
  /** Mage: the element the off-hand's Elemental Barrier throws back. */
  barrierElement?: StatusId;
  /** Dodge chance in % (capped at 60). Separate from Evade: neither triggers the other's bonuses. */
  dodge?: number;
  /** Extra % chance that a Hit becomes a Crit (capped at 50%). */
  critChance?: number;
  /** Hero: the weapon type in each hand (dagger, throwing, kunai, shuriken, grenade). */
  mainType?: string;
  offType?: string;
  /** Hero: the off-hand item is Holy. */
  offHoly?: boolean;
  /** Hero: a weapon in each hand. */
  dualWield?: boolean;
  /** Hero: the main (and off-hand) weapon is two-handed. */
  twoHanded?: boolean;
  offTwoHanded?: boolean;
  /** Spell Amp in %: spells (magic faces) deal this much more. */
  spellAmp?: number;
  /** Bash chance in % for the main weapon (capped at 30): a bash Stuns and deals +50%. */
  bash?: number;
  /** Crimson Elites and bosses: rare, much harder, and the only source of Crimson keys and items. */
  crimson?: boolean;
  family?: string;
  /** Bosses: their move cycle and which move comes next. */
  moves?: Move[];
  intent?: number;
  title?: string;
}

/** Everything an item can see and change while an attack resolves. */
export interface AttackCtx {
  attacker: Fighter;
  defender: Fighter;
  face: number;
  spec: FaceSpec;
  kind: FaceKind;
  mult: number;
  ignoreArmor: boolean;
  bonus: number;
  noDamage: boolean;
  /** True for the off-hand die's attack. */
  offhand: boolean;
  /** Final damage dealt to HP after Armor and Barrier. */
  dealt: number;
  /** Damage before Armor (set when the hit lands). */
  raw?: number;
}

/** A visual beat for the UI: rolls, damage numbers, misses, crits, statuses. */
export interface Fx {
  who: "player" | "enemy";
  kind: "roll" | "dmg" | "heal" | "miss" | "crit" | "block" | "status" | "reaction" | "text";
  value?: number;
  text?: string;
  icon?: string;
  face?: number;
  faceName?: string;
  faceKind?: FaceKind;
  sides?: number;
  offhand?: boolean;
}

/** A boss move. Bosses show their next move (intent) before they act. */
export interface Move {
  name: string;
  icon: string;
  text: string;
  act: (b: Battle, self: Fighter, foe: Fighter) => void;
}

export interface Battle {
  player: Fighter;
  enemy: Fighter;
  round: number;
  rng: () => number;
  log: string[];
  fx: Fx[];
  /** "escaped": a thief got away with your Gold. */
  over: null | "won" | "lost" | "fled" | "escaped";
  /** Overkill from Cleave faces, carried into the next fight. */
  carry: number;
}

export interface Hooks {
  face?: { group: FaceGroup; run: (b: Battle, ctx: AttackCtx, stacks: number) => void }[];
  modifyRoll?: (b: Battle, self: Fighter, roll: number, stacks: number) => number;
  /** Runs once the face is known, before damage. Use for bonuses and face rewrites. */
  modifyAttack?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onHit?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onCrit?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onKill?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  whenHit?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  onGuard?: (b: Battle, self: Fighter, stacks: number) => void;
  onFightStart?: (b: Battle, self: Fighter, stacks: number) => void;
  onFightEnd?: (b: Battle, self: Fighter, stacks: number) => void;
  onRoundStart?: (b: Battle, self: Fighter, stacks: number) => void;
  onRoundEnd?: (b: Battle, self: Fighter, stacks: number) => void;
  incomingStatus?: (b: Battle, self: Fighter, status: StatusId, amount: number, stacks: number) => number;
  onStatusApplied?: (b: Battle, self: Fighter, target: Fighter, status: StatusId, amount: number, stacks: number) => void;
  reactionMult?: (b: Battle, self: Fighter, stacks: number) => number;
  /** Change the hero's stats when gear is recalculated (Max HP, Armor, damage). */
  stats?: (s: StatBlock, stacks: number) => void;
  /** Your Ward just blocked a negative status (the enemy's, or a curse's). */
  onWard?: (b: Battle, self: Fighter, status: StatusId, amount: number, stacks: number) => void;
  /** You dodged a hit (Dodge, not Evade). */
  onDodge?: (b: Battle, ctx: AttackCtx, stacks: number) => void;
  /** Change healing received (multiplier). */
  healMult?: (stacks: number) => number;
}

export interface StatBlock {
  maxHp: number;
  armor: number;
  damage: number;
  offDamage: number;
  /** Dodge %, and Bash % (Bash only from the weapon and rare relics). */
  dodge: number;
  bash: number;
  spellAmp: number;
  critChance: number;
}

/** Anything with hooks: gear bases, bonuses, Epic powers, relics, talents, monster traits, origin passives, curses. */
export interface HookDef {
  id: string;
  name: string;
  kind: "weapon" | "off" | "armour" | "trinket" | "bonus" | "epic" | "relic" | "talent" | "trait" | "origin" | "curse" | "consumable" | "keepsake";
  tags: Tag[];
  text: string;
  hooks: Hooks;
  rarity?: Rarity;
  /** Rolled bonuses only: the lowest rarity that can roll it (twists borrowed from the old classes are Rare+). */
  minRarity?: Rarity;
  /** Rolled bonuses: the "of ..." suffix in the item name. Epic powers: the prefix. */
  affix?: string;
}

/** A base item type the loot system can roll (Iron Sword, Leather Jerkin...). */
export interface GearBase extends HookDef {
  kind: "weapon" | "off" | "armour" | "trinket";
  slot: Slot;
  /** Weapons: base damage at item level 1, and the faces. */
  damage?: number;
  faces?: FaceSpec[];
  twoHanded?: boolean;
  /** Off-hand weapons give a second die at this damage. */
  offDamage?: number;
  armor?: number;
  maxHp?: number;
  /** Legendaries only: earliest floor and the effect hidden until revealed. */
  legendary?: { minFloor: number; reveal: string; asBase: string };

  /** Weapon family: daggers, throwing knives, kunai, shuriken, grenades (some items care which you hold). */
  weaponType?: "dagger" | "throwing" | "kunai" | "shuriken" | "grenade";
  /** Shields let you Guard. */
  shield?: boolean;
  /** Mage off-hands: the element an Elemental Barrier throws back at attackers. */
  barrierElement?: StatusId;
  /** Dodge % this item gives at each rarity (new Dodge gear only). */
  dodge?: Partial<Record<Rarity, number>>;
  /** Never rolls below this rarity (anything that grants Barrier is Uncommon or better). */
  minItemRarity?: Rarity;
  /** Only ever rolls at this rarity (the greater starter-kit items). */
  onlyRarity?: Rarity;
  /** Drop weight (default 1). Electric gear is a little rarer. */
  weight?: number;
  /** Bases never rolled as loot (starting kits). */
  starter?: boolean;
}

/** A rolled piece of gear in the hero's inventory. */
export interface GearItem {
  uid: number;
  base: string;
  rarity: Rarity;
  level: number;
  /** Rolled bonus def id -> magnitude. */
  bonuses: Record<string, number>;
  epic?: string;
  /** Legendaries start unrevealed and act as a Common of their base type. */
  revealed: boolean;
  /** How many times the Forge has rerolled this item (each reroll costs more). */
  rerolls?: number;
  /** Weapons, Rare and up: % chance to Bash (Stun and +50% damage). */
  bash?: number;
}
