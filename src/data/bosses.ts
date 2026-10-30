// Bosses: a move library, the ten campaign bosses, and generated bosses for Endless mode
// (names, titles and moves mixed from libraries, with a wall on floor 30).
import { attack, PLAIN_FACES } from "../engine/combat";
import type { Battle, FaceSpec, Fighter, Move } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, hex, HIT, log } from "./helpers";
import { ELITE_AFFIX_IDS, TRAITS } from "./monsters";

/** Attack with the boss's die at a damage multiplier for this one attack. */
const hit = (b: Battle, self: Fighter, foe: Fighter, mult = 1) => {
  const base = self.damage;
  self.damage = Math.round(base * mult);
  attack(b, self, foe);
  self.damage = base;
};

/** Move factories: `p` is the boss's power level (grows with the floor). */
export const MOVE_LIBRARY: Record<string, (p: number) => Move> = {
  strike: () => ({ name: "Strike", icon: "⚔️", text: "Attacks", act: (b, s, f) => hit(b, s, f) }),
  heavy: () => ({ name: "Heavy Blow", icon: "🔨", text: "Attacks for 1.6× damage", act: (b, s, f) => hit(b, s, f, 1.6) }),
  flurry: () => ({ name: "Flurry", icon: "🌪️", text: "Attacks twice at 70%", act: (b, s, f) => { hit(b, s, f, 0.7); if (f.hp > 0) hit(b, s, f, 0.7); } }),
  rend: p => ({ name: "Rend", icon: "🩸", text: `Attacks and applies ${2 + p} Bleed`, act: (b, s, f) => { hit(b, s, f); applyStatus(b, s, f, "bleed", 2 + p); } }),
  venom: p => ({ name: "Venom Spit", icon: "☠️", text: `Applies ${1 + p} Poison`, act: (b, s, f) => applyStatus(b, s, f, "poison", 1 + p) }),
  fire: p => ({ name: "Fire Breath", icon: "🔥", text: `Applies ${3 + 2 * p} Burn`, act: (b, s, f) => applyStatus(b, s, f, "burn", 3 + 2 * p) }),
  frost: p => ({ name: "Frost Nova", icon: "❄️", text: `Attacks and applies ${1 + Math.ceil(p / 2)} Chill`, act: (b, s, f) => { hit(b, s, f); applyStatus(b, s, f, "chill", 1 + Math.ceil(p / 2)); } }),
  hex: () => ({ name: "Hex", icon: "🥀", text: "Applies 2 Weak and 2 Exposed", act: (b, s, f) => { applyStatus(b, s, f, "weak", 2); applyStatus(b, s, f, "exposed", 2); } }),
  bulwark: p => ({ name: "Bulwark", icon: "🛡️", text: `Gains ${4 + 3 * p} Barrier`, act: (b, s) => applyStatus(b, s, s, "barrier", 4 + 3 * p) }),
  regrow: () => ({ name: "Regrow", icon: "💚", text: "Heals 12% of its Max HP", act: (b, s) => { heal(b, s, Math.round(s.maxHp * 0.12), "Regrow"); } }),
  enrage: p => ({ name: "Enrage", icon: "💢", text: `Gains ${1 + Math.ceil(p / 2)} Might`, act: (b, s) => applyStatus(b, s, s, "might", 1 + Math.ceil(p / 2)) }),
  doom: p => ({ name: "Doombringer", icon: "💀", text: `Applies ${3 + p} Doom`, act: (b, s, f) => applyStatus(b, s, f, "doom", 3 + p) }),
  gaze: () => ({ name: "Blinding Gaze", icon: "👁️", text: "Applies 2 Blind", act: (b, s, f) => applyStatus(b, s, f, "blind", 2) }),
  thunder: () => ({ name: "Thunderclap", icon: "⚡", text: "Shocks, then attacks", act: (b, s, f) => { applyStatus(b, s, f, "shock", 1); hit(b, s, f); } }),
  thorns: p => ({ name: "Bristle", icon: "🌵", text: `Gains Ward and ${2 + p} Spikes`, act: (b, s) => { applyStatus(b, s, s, "ward", 1); applyStatus(b, s, s, "spikes", 2 + p); } }),
  charge: () => ({ name: "Gather Power", icon: "🌀", text: "Does nothing now; its next Cataclysm deals triple", act: (b, s) => { s.flags["charged"] = 1; log(b, `${s.name} gathers power…`); } }),
  smash: () => ({ name: "Cataclysm", icon: "☄️", text: "Attacks for 2× damage (3× if charged)", act: (b, s, f) => { const m = s.flags["charged"] ? 3 : 2; s.flags["charged"] = 0; hit(b, s, f, m); } }),
  drain: () => ({ name: "Life Drain", icon: "🦇", text: "Attacks and heals what it deals", act: (b, s, f) => { const before = f.hp; hit(b, s, f); const n = Math.max(0, before - f.hp); if (n) heal(b, s, n, "Life Drain"); } })
};

interface BossDef { name: string; title: string; family: string; moves: string[]; traits?: string[]; armor?: number; faces?: FaceSpec[]; hpMult?: number }

/** The ten campaign bosses, one per floor. */
export const CAMPAIGN_BOSSES: BossDef[] = [
  { name: "Gnasher", title: "the Pack Lord", family: "Beast", moves: ["strike", "flurry", "rend"], traits: ["m_ambush"] },
  { name: "The Mother of Rot", title: "Queen of the Sewers", family: "Undead", moves: ["venom", "strike", "regrow"] },
  { name: "Brother Cinder", title: "the Ashen Zealot", family: "Cultist", moves: ["fire", "strike", "enrage"] },
  { name: "Varkas", title: "the Iron Warden", family: "Construct", moves: ["bulwark", "heavy", "strike"], armor: 2, hpMult: 0.85 },
  { name: "The Pale Widow", title: "Spinner of Graves", family: "Beast", moves: ["hex", "rend", "venom", "strike"] },
  { name: "Skarn", title: "the Storm Herald", family: "Cultist", moves: ["thunder", "charge", "smash"] },
  { name: "Morwen", title: "the Frost Queen", family: "Undead", moves: ["frost", "gaze", "strike", "bulwark"] },
  { name: "The Gilded Glutton", title: "Hoarder of the Deep", family: "Beast", moves: ["drain", "flurry", "regrow", "heavy"], traits: ["x_regenerating"] },
  { name: "Oathbreaker", title: "the Fallen Paladin", family: "Undead", moves: ["thorns", "heavy", "hex", "drain"], armor: 4 },
  { name: "The Hollow King", title: "Who Waits Below", family: "Construct", moves: ["doom", "strike", "bulwark", "charge", "smash"], armor: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, { ...CRIT, name: "Hollow Decree", run: hex("doom", 3) }] }
];

export const BOSS_NAMES = [
  "Azhul", "Vexmora", "Kragg", "Seraphine", "Mordrake", "Ylva", "Thessaly", "Grummoch", "Nhal", "Ishtavar", "Corvane", "Belgrith",
  "Ossira", "Draketh", "Umbriel", "Malgor", "Zephrine", "Hask", "Velkyr", "Orrumon", "Sablethorn", "Quill", "Ravenna", "Xol",
  "The Weeping Bell", "The Ninefold Mouth", "The Glass Saint", "The Choir Below", "The Last Lantern", "The Ashen Twins"
];
export const BOSS_TITLES = [
  "the Devourer of Stars", "Keeper of Broken Oaths", "the Unblinking", "the Rot Monarch", "Who Drinks the Light", "the Thousand Teeth",
  "Lord of Cinders", "the Hollow Choir", "Breaker of Shields", "the Gilded Maw", "Herald of the Storm", "the Frozen Widow",
  "Warden of the Ninth Gate", "the Bone Architect", "Mother of Hounds", "the Smiling Plague", "Collector of Names", "the Sunken Crown",
  "Eater of Gods", "the Iron Psalm", "Shepherd of the Drowned", "the Ember Tyrant", "Voice of the Abyss", "the Clockwork Saint"
];
const FAMILIES = ["Beast", "Undead", "Cultist", "Construct"];

const pick = <T>(rng: () => number, arr: T[]) => arr[Math.floor(rng() * arr.length)];

/** Floor 30: the wall. Only a truly broken build gets through. */
export const WALL_FLOOR = 30;
const WALL: BossDef = { name: "Ur-Thane", title: "the Unbroken Gate", family: "Construct", moves: ["bulwark", "heavy", "thorns", "charge", "smash", "regrow"], armor: 20, hpMult: 6 };

/** HP and Power for a boss on a floor. Past the wall, everything grows much faster. */
export function bossStats(floor: number) {
  let hp = 28 + 18 * (floor - 1);
  let power = 3.5 + 1.4 * (floor - 1);
  if (floor > 10) {
    hp *= 1 + 0.08 * (floor - 10);
    power *= 1 + 0.04 * (floor - 10);
  }
  if (floor > WALL_FLOOR) {
    hp *= Math.pow(1.25, floor - WALL_FLOOR);
    power *= Math.pow(1.12, floor - WALL_FLOOR);
  }
  return { hp: Math.round(hp), power: Math.round(power) };
}

function build(def: BossDef, floor: number): Fighter {
  const { hp: baseHp, power } = bossStats(floor);
  const hp = Math.round(baseHp * (def.hpMult ?? 1));
  const p = Math.ceil(floor / 2);
  const items: Record<string, number> = {};
  for (const t of def.traits ?? []) items[t] = 1;
  return {
    id: "enemy", name: def.name, title: def.title, hp, maxHp: hp, armor: (def.armor ?? 0) + Math.floor(floor / 6), damage: power,
    faces: def.faces ?? PLAIN_FACES, statuses: {}, flags: {}, persist: {}, items, gold: 0, boss: true, family: def.family,
    moves: def.moves.map(m => MOVE_LIBRARY[m](p)), intent: 0
  };
}

export function makeBoss(floor: number, rng: () => number): Fighter {
  if (floor <= CAMPAIGN_BOSSES.length) return build(CAMPAIGN_BOSSES[floor - 1], floor);
  if (floor === WALL_FLOOR) return build(WALL, floor);
  // Endless: a generated boss from the name, title, move and trait libraries.
  const moves = Object.keys(MOVE_LIBRARY);
  const n = 3 + Math.min(3, Math.floor((floor - 10) / 6));
  const chosen = new Set<string>(["strike"]);
  while (chosen.size < n) chosen.add(pick(rng, moves));
  if (chosen.has("charge")) chosen.add("smash");
  const traits = [pick(rng, ELITE_AFFIX_IDS)];
  if (floor >= 20) traits.push(pick(rng, ELITE_AFFIX_IDS.filter(t => !traits.includes(t))));
  const def: BossDef = { name: pick(rng, BOSS_NAMES), title: pick(rng, BOSS_TITLES), family: pick(rng, FAMILIES), moves: [...chosen].sort(() => rng() - 0.5), traits, armor: Math.floor(rng() * 4) };
  const f = build(def, floor);
  f.title = `${f.title} · ${traits.map(t => TRAITS.find(x => x.id === t)!.name).join(", ")}`;
  return f;
}
