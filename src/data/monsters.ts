// Monsters: four families, Elite affixes, and the three floor bosses.
import { PLAIN_FACES } from "../engine/combat";
import type { FaceSpec, Fighter, HookDef } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, hex, HIT, log, MISS, other, ping, spell, st } from "./helpers";

const trait = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "trait", ...d });

export const TRAITS: HookDef[] = [
  trait({ id: "m_ambush", name: "Ambush", tags: ["Tempo"], text: "Strikes first", hooks: { onFightStart: (_b, f) => { f.flags["ambush"] = 1; } } }),
  trait({ id: "m_venom_bite", name: "Venom Bite", tags: ["Poison"], text: "Its hits apply 2 Poison", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 2) } }),
  trait({ id: "m_rot_claws", name: "Rot Claws", tags: ["Bleed"], text: "Its hits apply 1 Bleed", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 1) } }),
  trait({ id: "m_grave_chill", name: "Grave Chill", tags: ["Frost"], text: "Its hits apply 1 Chill", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "chill", 1) } }),
  trait({ id: "m_incorporeal", name: "Incorporeal", tags: ["Tempo"], text: "Starts each fight with Evade", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "evade", 1) } }),
  trait({ id: "m_curse_touch", name: "Curse Touch", tags: ["Hex"], text: "Its hits apply 1 Weak", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "weak", 1) } }),
  trait({ id: "m_zeal", name: "Zeal", tags: ["Strike"], text: "Gains 1 Might every round", hooks: { onRoundEnd: (b, f) => applyStatus(b, f, f, "might", 1) } }),
  trait({ id: "m_static", name: "Static", tags: ["Storm"], text: "Its hits apply Shock", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "shock", 1) } }),
  trait({ id: "m_brittle", name: "Brittle", tags: ["Guard"], text: "Takes +3 from crits", hooks: { whenHit: (b, c) => { if (c.kind === "crit" && c.dealt > 0) ping(b, c.defender, 3, "Brittle"); } } }),
  // Elite affixes
  trait({ id: "x_blazing", name: "Blazing", tags: ["Burn"], text: "Its hits apply 2 Burn", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2) } }),
  trait({ id: "x_venomous", name: "Venomous", tags: ["Poison"], text: "Its hits apply 3 Poison", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 3) } }),
  trait({ id: "x_armored", name: "Armored", tags: ["Guard"], text: "+3 Armor; can't be Exposed", hooks: { onFightStart: (_b, f) => { f.armor += 3; }, incomingStatus: (_b, _f, s, n) => (s === "exposed" ? 0 : n) } }),
  trait({ id: "x_vampiric", name: "Vampiric", tags: ["Blood"], text: "Heals half the damage it deals", hooks: { onHit: (b, c) => { heal(b, c.attacker, Math.floor(c.dealt / 2), "Vampiric"); } } }),
  trait({ id: "x_swift", name: "Swift", tags: ["Tempo"], text: "Starts with Haste and strikes first", hooks: { onFightStart: (b, f) => { f.flags["ambush"] = 1; applyStatus(b, f, f, "haste", 1); } } }),
  trait({ id: "x_spiteful", name: "Spiteful", tags: ["Thorns"], text: "When it dies, you take 5",
    hooks: { onFightEnd: (b, f) => { if (b.over === "won" && f.id === "enemy") { other(b, f).hp -= 5; log(b, "Spiteful: you take 5 as it dies."); } } } }),
  trait({ id: "x_warded", name: "Warded", tags: ["Guard"], text: "Immune to statuses for the first 2 rounds", hooks: { incomingStatus: (b, _f, _s, n) => (b.round <= 2 ? 0 : n) } }),
  trait({ id: "x_regenerating", name: "Regenerating", tags: ["Blood"], text: "Heals 2 at the end of every round", hooks: { onRoundEnd: (b, f) => { heal(b, f, 2, "Regenerating"); } } }),
  // Boss traits
  trait({ id: "k_pack_lord", name: "Pack Lord", tags: ["Tempo"], text: "Every 3rd round it attacks twice", hooks: { onRoundStart: (b, f) => { if (b.round % 3 === 0) applyStatus(b, f, f, "haste", 1); } } }),
  trait({ id: "k_rot_mother", name: "Mother of Rot", tags: ["Poison"], text: "Its hits apply 1 Poison; each round it heals 1 for every 3 Poison on you",
    hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 1), onRoundEnd: (b, f) => { const n = Math.floor(st(other(b, f), "poison") / 3); if (n) heal(b, f, n, "feeds on Poison"); } } }),
  trait({ id: "k_hollow_king", name: "The Hollow King", tags: ["Guard", "Hex"], text: "Every 3rd round gains 10 Barrier; its 6s apply 3 Doom",
    hooks: { onRoundStart: (b, f) => { if (b.round % 3 === 0) applyStatus(b, f, f, "barrier", 10); } } })
];

export const ELITE_AFFIX_IDS = ["x_blazing", "x_venomous", "x_armored", "x_vampiric", "x_swift", "x_spiteful", "x_warded", "x_regenerating"];

interface MonsterDef { name: string; family: string; hp: number; power: number; armor?: number; traits: string[]; faces?: FaceSpec[] }

export const MONSTERS: MonsterDef[] = [
  { name: "Wolf", family: "Beast", hp: 10, power: 3, traits: ["m_ambush"] },
  { name: "Boar", family: "Beast", hp: 14, power: 3, armor: 1, traits: [], faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Gore", "crit", hex("bleed", 2))] },
  { name: "Giant Spider", family: "Beast", hp: 9, power: 2, traits: ["m_venom_bite"] },
  { name: "Skeleton", family: "Undead", hp: 11, power: 3, armor: 2, traits: ["m_brittle"] },
  { name: "Ghoul", family: "Undead", hp: 13, power: 3, traits: ["m_rot_claws"] },
  { name: "Wraith", family: "Undead", hp: 9, power: 3, traits: ["m_incorporeal", "m_grave_chill"] },
  { name: "Acolyte", family: "Cultist", hp: 10, power: 2, traits: [], faces: [MISS, spell("Cinder", "hit", hex("burn", 2)), HIT, spell("Cinder", "hit", hex("burn", 2)), HIT, CRIT] },
  { name: "Hexer", family: "Cultist", hp: 9, power: 2, traits: ["m_curse_touch"] },
  { name: "Zealot", family: "Cultist", hp: 13, power: 3, traits: ["m_zeal"] },
  { name: "Stone Golem", family: "Construct", hp: 18, power: 3, armor: 3, traits: [], faces: [MISS, MISS, HIT, HIT, HIT, CRIT] },
  { name: "Sentry", family: "Construct", hp: 12, power: 3, armor: 1, traits: ["m_static"] }
];

export const BOSSES: MonsterDef[] = [
  { name: "Gnasher, the Pack Lord", family: "Beast", hp: 36, power: 4, traits: ["k_pack_lord", "m_ambush"] },
  { name: "The Mother of Rot", family: "Undead", hp: 58, power: 5, armor: 1, traits: ["k_rot_mother"] },
  { name: "The Hollow King", family: "Construct", hp: 80, power: 7, armor: 2, traits: ["k_hollow_king"],
    faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Hollow Decree", "crit", hex("doom", 3))] }
];

export type MonsterRank = "normal" | "elite" | "champion" | "boss";

export function makeMonster(rng: () => number, floor: number, rank: MonsterRank): Fighter {
  const def = rank === "boss" ? BOSSES[Math.min(floor, BOSSES.length) - 1] : MONSTERS[Math.floor(rng() * MONSTERS.length)];
  let hp = rank === "boss" ? def.hp : Math.round(def.hp * (1 + 0.5 * (floor - 1)));
  let power = rank === "boss" ? def.power : def.power + Math.round(1.5 * (floor - 1));
  const items: Record<string, number> = {};
  for (const t of def.traits) items[t] = 1;
  let prefix = "";
  if (rank === "elite" || rank === "champion") {
    const n = rank === "champion" ? 2 : 1;
    const pool = [...ELITE_AFFIX_IDS];
    const names: string[] = [];
    for (let i = 0; i < n; i++) {
      const id = pool.splice(Math.floor(rng() * pool.length), 1)[0];
      items[id] = 1;
      names.push(TRAITS.find(t => t.id === id)!.name);
    }
    hp = Math.round(hp * (rank === "champion" ? 2 : 1.5));
    power += rank === "champion" ? 2 : 1;
    prefix = `${names.join(" ")} `;
  }
  const name = rank === "champion" ? `Champion ${prefix}${def.name}` : `${prefix}${def.name}`;
  return {
    id: "enemy", name, hp, maxHp: hp, armor: def.armor ?? 0, damage: power, faces: def.faces ?? PLAIN_FACES,
    statuses: {}, flags: {}, persist: {}, items, gold: 0,
    elite: rank === "elite" || rank === "champion", champion: rank === "champion", boss: rank === "boss", family: def.family
  };
}
