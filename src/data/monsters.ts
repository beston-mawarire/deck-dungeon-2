// Monsters: four families, Elite affixes, and the three floor bosses.
import { PLAIN_FACES } from "../engine/combat";
import type { FaceSpec, Fighter, HookDef } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, hex, HIT, log, MISS, other, ping, spell } from "./helpers";

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
    hooks: { onFightEnd: (b, f) => { if (b.over === "won" && f.id === "enemy") { const p = other(b, f); p.hp -= 5; log(b, "Spiteful: you take 5 as it dies."); b.fx.push({ who: "player", kind: "dmg", value: 5 }); } } } }),
  trait({ id: "x_warded", name: "Warded", tags: ["Guard"], text: "Immune to statuses for the first 2 rounds", hooks: { incomingStatus: (b, _f, _s, n) => (b.round <= 2 ? 0 : n) } }),
  trait({ id: "x_nullifying", name: "Nullifying", tags: ["Hex"], text: "Rare: the first positive status you'd gain each round fizzles", hooks: {} }),
  trait({ id: "x_concussive", name: "Concussive", tags: ["Strike"], text: "Its 6s Stun you", hooks: { onHit: (b, c) => { if (c.face === 6) applyStatus(b, c.attacker, c.defender, "stun", 1); } } }),
  trait({ id: "x_crimson", name: "Crimson", tags: ["Blood", "Strike"], text: "Gains 1 Might and heals 2% of its Max HP every round",
    hooks: { onRoundEnd: (b, f) => { applyStatus(b, f, f, "might", 1); heal(b, f, Math.max(1, Math.round(f.maxHp * 0.02)), "Crimson"); } } }),
  trait({ id: "x_regenerating", name: "Regenerating", tags: ["Blood"], text: "Heals 2 at the end of every round", hooks: { onRoundEnd: (b, f) => { heal(b, f, 2, "Regenerating"); } } }),
];

export const ELITE_AFFIX_IDS = ["x_blazing", "x_venomous", "x_armored", "x_vampiric", "x_swift", "x_spiteful", "x_warded", "x_regenerating", "x_concussive", "x_nullifying"];
/** How often each affix rolls (Nullifying is rare). */
export const AFFIX_WEIGHT: Record<string, number> = { x_nullifying: 0.35, x_concussive: 0.8 };

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
  { name: "Stone Golem", family: "Construct", hp: 18, power: 3, armor: 3, traits: [], faces: [MISS, MISS, HIT, HIT, HIT, spell("Crush", "crit", hex("stun", 1))] },
  { name: "Sentry", family: "Construct", hp: 12, power: 3, armor: 1, traits: ["m_static"] }
];

export type MonsterRank = "normal" | "elite" | "champion" | "crimson" | "boss";

/** Regular monsters grow with the floor; past floor 5 (Endless) they grow faster, and past 30 much faster. */
export function monsterHpMult(floor: number) {
  let m = 1 + 0.55 * (floor - 1);
  if (floor > 5) m *= 1 + 0.06 * (floor - 5);
  if (floor > 30) m *= Math.pow(1.2, floor - 30);
  return m;
}
export const monsterPowerAdd = (floor: number) => Math.round(1.5 * (floor - 1) * (floor > 30 ? Math.pow(1.1, floor - 30) : 1));

export function makeMonster(rng: () => number, floor: number, rank: MonsterRank): Fighter {
  const def = MONSTERS[Math.floor(rng() * MONSTERS.length)];
  let hp = Math.round(def.hp * monsterHpMult(floor));
  let power = def.power + monsterPowerAdd(floor);
  const items: Record<string, number> = {};
  for (const t of def.traits) items[t] = 1;
  let prefix = "";
  if (rank === "elite" || rank === "champion" || rank === "crimson") {
    const n = rank === "crimson" ? 3 : rank === "champion" ? (floor >= 4 ? 3 : 2) : floor >= 4 ? 2 : 1;
    const pool = [...ELITE_AFFIX_IDS];
    const names: string[] = [];
    for (let i = 0; i < n; i++) {
      const total = pool.reduce((s, x) => s + (AFFIX_WEIGHT[x] ?? 1), 0);
      let roll = rng() * total;
      let k = 0;
      for (; k < pool.length - 1; k++) { roll -= AFFIX_WEIGHT[pool[k]] ?? 1; if (roll < 0) break; }
      const id = pool.splice(k, 1)[0];
      items[id] = 1;
      names.push(TRAITS.find(t => t.id === id)!.name);
    }
    // Tougher than before, and tougher the deeper you go.
    // Crimson Elites: rarer and harder than Champions, with the Crimson trait on top.
    hp = Math.round(hp * (rank === "crimson" ? 2.8 + 0.18 * floor : rank === "champion" ? 2.2 + 0.15 * floor : 1.5 + 0.08 * floor));
    power += rank === "crimson" ? 3 + Math.floor(floor / 2) : rank === "champion" ? 2 + Math.floor(floor / 2) : 1 + (floor >= 3 ? 1 : 0);
    if (rank === "crimson") items["x_crimson"] = 1;
    prefix = `${names.join(" ")} `;
  }
  const name = rank === "crimson" ? `Crimson ${prefix}${def.name}` : rank === "champion" ? `Champion ${prefix}${def.name}` : `${prefix}${def.name}`;
  return {
    id: "enemy", name, hp, maxHp: hp, armor: (def.armor ?? 0) + (rank === "crimson" ? 2 : 0), damage: power, faces: def.faces ?? PLAIN_FACES,
    statuses: {}, flags: {}, persist: {}, items, gold: 0,
    elite: rank === "elite" || rank === "champion" || rank === "crimson", champion: rank === "champion", crimson: rank === "crimson", boss: rank === "boss", family: def.family
  };
}
