// Face Runes and Shufflers together, alone, or not at all: across every weapon, armour, off-hand, trinket and skill.
// The point is that nothing breaks: dice keep their size, spells keep their spells, fights play out, and with
// neither on your die everything is exactly as it was.
import { describe, expect, it } from "vitest";
import { loadLibrary, GEAR_BASES, LEGENDARIES, CRIMSON } from "../src/data";
import { ABYSS_ITEMS } from "../src/data/abyss";
import { dealShuffler, RUNES, SHUFFLERS, RUNE_MAX_RANK } from "../src/data/runes";
import { resolveFace, rollFor, SKILLS, startBattle, PLAIN_FACES } from "../src/engine/combat";
import { makeRng } from "../src/engine/rng";
import type { FaceSpec, GearBase, GearItem } from "../src/engine/types";
import { recompute, slotsFor } from "../src/game/hero";
import { chooseRoom, combatAction, newRun, availableActions, type Run } from "../src/game/run";

loadLibrary();
const ALL: GearBase[] = [...GEAR_BASES, ...LEGENDARIES, ...CRIMSON, ...ABYSS_ITEMS];
const KINDS = new Set(["miss", "graze", "hit", "crit"]);
const SHUF_IDS: (string | undefined)[] = [undefined, ...SHUFFLERS.map(s => s.id)];
let uid = 500000;
const itemOf = (b: GearBase): GearItem => ({ uid: uid++, base: b.id, rarity: (b.onlyRarity ?? b.rarity ?? (b.legendary ? "legendary" : "rare")) as never, level: 1, bonuses: {}, revealed: true });
const fullRunes = (seed: number) => {
  const rng = makeRng(seed), out: Record<number, { id: string; rank: number }> = {};
  for (let f = 1; f <= 6; f++) out[f] = { id: RUNES[Math.floor(rng() * RUNES.length)].id, rank: 1 + Math.floor(rng() * RUNE_MAX_RANK) };
  return out;
};
/** A run wearing `b` (in its first slot), with these runes and this Shuffler. */
function setup(origin: "warrior" | "rogue" | "mage" | "cleric", b: GearBase | null, runes: boolean, shuf: string | undefined, seed: number): Run {
  const r = newRun(origin, seed);
  const h = r.hero;
  if (b) {
    const it = itemOf(b), slot = slotsFor(it, h)[0];
    if (b.twoHanded && slot === "main") delete h.equip.off;
    if (slot === "off" && h.equip.main && ALL.find(x => x.id === h.equip.main!.base)?.twoHanded) delete h.equip.main;
    h.equip[slot] = it;
  }
  if (runes) h.runes = fullRunes(seed);
  if (shuf) { h.shuffle = shuf; h.shuffleDeal = { [shuf]: dealShuffler(shuf, makeRng(seed + 7)) }; }
  recompute(h);
  return r;
}
/** A short fight: a few rounds of whatever's on offer, then plain attacks. Nothing may throw, and the numbers must stay sane. */
function fight(r: Run, rounds = 4) {
  chooseRoom(r, "fight");
  for (let k = 0; k < rounds && r.scene.t === "combat"; k++) {
    const acts = availableActions(r).filter(a => a !== "flee");
    combatAction(r, acts[k % acts.length]);
    const sc = r.scene as { t: string; battle?: { player: { hp: number }; enemy: { hp: number } } };
    if (sc.battle) { expect(Number.isFinite(sc.battle.player.hp)).toBe(true); expect(Number.isFinite(sc.battle.enemy.hp)).toBe(true); }
  }
  expect(Number.isFinite(r.hero.f.hp)).toBe(true);
}
const spells = (fs: FaceSpec[]) => fs.filter(f => f.run).length;

describe("with neither runes nor a Shuffler, every die is exactly as it was", () => {
  it("every main-hand weapon keeps its own faces", () => {
    for (const b of ALL.filter(x => x.kind === "weapon" && slotsFor(itemOf(x))[0] === "main")) {
      const r = setup("warrior", b, false, undefined, 1);
      expect(r.hero.f.faces, b.id).toEqual(b.faces ?? PLAIN_FACES);
      expect(r.hero.f.persist["shuffled"], b.id).toBeUndefined();
    }
  });
});

describe("every weapon, with every Shuffler (or none) and a full set of runes", () => {
  const weapons = ALL.filter(x => x.kind === "weapon");
  it(`${weapons.length} weapons × ${SHUF_IDS.length} Shuffler choices: dice keep their size, spells, and only six-siders change`, () => {
    let n = 0;
    for (const b of weapons) for (const sh of SHUF_IDS) {
      const r = setup("warrior", b, true, sh, 100 + n++);
      const f = r.hero.f, before = setup("warrior", b, false, undefined, 1).hero.f.faces;
      expect(f.faces.length, `${b.id}/${sh}`).toBe(before.length);
      for (const sp of f.faces) expect(KINDS.has(sp.kind), `${b.id}/${sh}`).toBe(true);
      expect(spells(f.faces), `${b.id}/${sh}: spells kept`).toBe(spells(before));
      if (before.length !== 6) expect(f.faces, `${b.id}/${sh}: a bigger die is left alone`).toEqual(before);
      for (let face = 1; face <= 6; face++) expect(f.items[`rune_${r.hero.runes![face].id}_${face}`], `${b.id} rune on ${face}`).toBeGreaterThan(0);
    }
  });
  it("and they all fight (a short fight each, with one Shuffler apiece)", () => {
    let n = 0;
    for (const b of weapons) { const sh = SHUF_IDS[n % SHUF_IDS.length]; fight(setup(n % 2 ? "rogue" : "mage", b, n % 3 !== 0, sh, 300 + n++)); }
  });
});

describe("every armour, off-hand and trinket, with runes only, a Shuffler only, both, or neither", () => {
  const gear = ALL.filter(x => x.kind !== "weapon");
  it(`${gear.length} pieces of gear × 4 setups`, () => {
    let n = 0;
    for (const b of gear) for (const [runes, shuf] of [[false, false], [true, false], [false, true], [true, true]] as const) {
      const sh = shuf ? SHUFFLERS[n % SHUFFLERS.length].id : undefined;
      const r = setup((["warrior", "rogue", "mage", "cleric"] as const)[n % 4], b, runes, sh, 900 + n++);
      for (const sp of r.hero.f.faces) expect(KINDS.has(sp.kind), b.id).toBe(true);
      if (n % 4 === 0) fight(r, 3);
    }
  });
});

describe("every skill, with every Shuffler and a full set of runes", () => {
  it(`${SKILLS.length} skills × ${SHUF_IDS.length} Shuffler choices`, () => {
    let n = 0;
    for (const sk of SKILLS) for (const sh of SHUF_IDS) {
      const r = setup((["warrior", "rogue", "mage", "cleric"] as const)[n % 4], null, true, sh, 2000 + n++);
      r.hero.skill = sk;
      r.hero.f.mana = r.hero.f.maxMana = 9;
      chooseRoom(r, "fight");
      expect(availableActions(r)).toContain(sk);
      combatAction(r, sk);
      for (let k = 0; k < 3 && r.scene.t === "combat"; k++) combatAction(r, "attack");
      expect(Number.isFinite(r.hero.f.hp)).toBe(true);
    }
  });
});

describe("runes stay on their numbers, whatever the Shuffler does to the faces", () => {
  it("every rune fires on its own face, with every Shuffler", () => {
    for (const sh of SHUF_IDS) for (const rn of RUNES) for (const face of [1, 3, 6]) {
      const r = setup("warrior", null, false, sh, 4000);
      r.hero.runes = { [face]: { id: rn.id, rank: 1 } };
      recompute(r.hero);
      const e = { ...r.hero.f, id: "enemy", name: "Dummy", hp: 999, maxHp: 999, armor: 0, items: {}, statuses: {}, flags: {}, persist: {} } as never;
      const b = startBattle(r.hero.f, e, 5);
      resolveFace(b, b.player, b.enemy, face, false);
      expect(b.fx.some(x => x.kind === "text" && (x.text ?? "").startsWith(`${rn.name} Rune`)), `${rn.id} on ${face} with ${sh}`).toBe(true);
    }
  });
});

describe("Legendary dice that aren't six-sided ignore Shufflers", () => {
  it("Dice of the Damned (d20), Worldsplitter (d12) and Heartseeker (d8)", () => {
    for (const id of ["l_d20", "l_worldsplitter", "c_heartseeker"]) {
      const b = ALL.find(x => x.id === id)!;
      const plain = setup("warrior", b, false, undefined, 1).hero.f.faces;
      for (const sh of SHUFFLERS) expect(setup("warrior", b, true, sh.id, 2).hero.f.faces, `${id}/${sh.id}`).toEqual(plain);
    }
  });
});

describe("the new Shufflers", () => {
  it("Upside Down runs the die backwards, spells and all", () => {
    const plain = setup("mage", null, false, undefined, 1).hero.f.faces;
    const r = setup("mage", null, false, "upside_down", 1);
    expect(r.hero.f.faces).toEqual([...plain].reverse());
  });
  it("Trade Places swaps two unlike faces; Honed steps every Miss and Graze up one", () => {
    const plain = setup("warrior", null, false, undefined, 1).hero.f.faces;
    for (let s = 0; s < 30; s++) {
      const r = setup("warrior", null, false, "trade_places", s), d = r.hero.shuffleDeal!.trade_places;
      expect(d[1]).not.toBe(d[2]);
      expect(r.hero.f.faces[d[1] - 1]).toEqual(plain[d[2] - 1]);
      expect(r.hero.f.faces[d[2] - 1]).toEqual(plain[d[1] - 1]);
    }
    const h = setup("warrior", null, false, "honed", 1).hero.f;
    expect(h.faces.some(x => x.kind === "miss")).toBe(false);
    expect(h.critDmg).toBe(-25);
  });
});

describe("Focus, Clarity and Chill go by the faces while a Shuffler is on", () => {
  // Upside Down on a warrior's sword: the Crit is on the 1 now, the Graze on the 6.
  const r = setup("warrior", null, false, "upside_down", 1), f = r.hero.f;
  const critAt = f.faces.findIndex(x => x.kind === "crit") + 1;
  const b = startBattle(f, { ...f, id: "enemy", name: "Dummy", hp: 999, maxHp: 999, items: {}, statuses: {}, flags: {}, persist: {} } as never, 3);
  it("Clarity lands on the best face, wherever it is", () => {
    b.player.flags["clarity"] = 1;
    expect(rollFor(b, b.player, 6, b.player.faces)).toBe(critAt);
  });
  const rolls = (...xs: number[]) => { const q = xs.map(x => (x - 0.5) / 6); return () => q.shift() ?? 0.5; };
  it("the die really is upside down: a Crit on the 1, the sword's Graze on the 6", () => {
    expect(critAt).toBe(1);
    expect(f.faces[5].kind).toBe("graze");
  });
  it("Focus keeps the better face, not the higher number", () => {
    b.player.statuses = { focus: 1 }; b.rng = rolls(6, 1);
    expect(rollFor(b, b.player, 6, b.player.faces)).toBe(1);
    b.player.statuses = { focus: 1 }; b.rng = rolls(1, 6);
    expect(rollFor(b, b.player, 6, b.player.faces)).toBe(1);
  });
  it("Chill never moves you onto a better face", () => {
    // A 2 rolled while Chilled would drop onto the Crit at 1: it stays a 2.
    b.player.statuses = { chill: 3 }; b.rng = rolls(2);
    expect(rollFor(b, b.player, 6, b.player.faces)).toBe(2);
    // A 6 (the Graze) drops to a 5 only if that's no better: the 5 is a Hit, so it stays a Graze.
    b.rng = rolls(6);
    expect(rollFor(b, b.player, 6, b.player.faces)).toBe(6);
  });
  it("with no Shuffler, Focus, Clarity and Chill are exactly as before", () => {
    const p = setup("warrior", null, false, undefined, 1).hero.f;
    const b2 = startBattle(p, { ...p, id: "enemy", name: "Dummy", hp: 999, maxHp: 999, items: {}, statuses: {}, flags: {}, persist: {} } as never, 3);
    b2.player.flags["clarity"] = 1;
    expect(rollFor(b2, b2.player, 6, b2.player.faces)).toBe(6);
    b2.player.statuses = { chill: 2 }; b2.rng = () => 1.5 / 6;
    expect(rollFor(b2, b2.player, 6, b2.player.faces)).toBe(1);
    b2.player.statuses = { focus: 1 }; let q = [5.5 / 6, 0.5 / 6]; b2.rng = () => q.shift() ?? 0.5;
    expect(rollFor(b2, b2.player, 6, b2.player.faces)).toBe(6);
  });
});
