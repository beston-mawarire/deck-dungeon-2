import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { damageOf, faceMatches, handMultiplier, playRound, resolveFace, startBattle } from "../src/engine/combat";
import { makeEnemy, makeHero } from "../src/engine/fighters";
import { makeRng } from "../src/engine/rng";
import { allItems } from "../src/engine/registry";
import { applyStatus, endOfRound, st } from "../src/engine/statuses";
import { TAGS } from "../src/engine/types";

beforeAll(() => loadLibrary());

const setup = (cls: "king" | "jack" | "queen" | "ace" = "king", items: Record<string, number> = {}) => {
  const p = makeHero(cls, makeRng(1));
  Object.assign(p.items, items);
  const e = makeEnemy(10, "S", 1);
  e.hp = e.maxHp = 100;
  return startBattle(p, e, 42);
};

describe("library", () => {
  it("every item uses known tags and has text", () => {
    for (const d of allItems()) {
      expect(d.text.length, d.id).toBeGreaterThan(3);
      for (const t of d.tags) expect(TAGS as readonly string[], `${d.id} tag ${t}`).toContain(t);
    }
  });
});

describe("faces", () => {
  it("matches groups", () => {
    expect(faceMatches("odd", 3)).toBe(true);
    expect(faceMatches("high", 5)).toBe(true);
    expect(faceMatches("low", 3)).toBe(false);
    expect(faceMatches(4, 4)).toBe(true);
  });

  it("default faces: 1 grazes, 6 crits", () => {
    const b = setup();
    resolveFace(b, b.player, b.enemy, 1, false);
    expect(b.enemy.hp).toBe(98); // 4 Damage halved
    resolveFace(b, b.player, b.enemy, 6, false);
    expect(b.enemy.hp).toBe(98 - 8 - 3); // crit doubles, Signet Ring +3
  });

  it("face relics fire on their number", () => {
    const b = setup("king", { viper_fang: 1 });
    resolveFace(b, b.player, b.enemy, 3, false);
    expect(st(b.enemy, "poison")).toBe(3);
    resolveFace(b, b.player, b.enemy, 4, false);
    expect(st(b.enemy, "poison")).toBe(3);
  });

  it("stacks scale face relics", () => {
    const b = setup("king", { viper_fang: 2 });
    resolveFace(b, b.player, b.enemy, 3, false);
    expect(st(b.enemy, "poison")).toBe(5);
  });

  it("Lucky Penny turns a 1 into Gold instead of damage", () => {
    const b = setup("king", { lucky_penny: 1 });
    resolveFace(b, b.player, b.enemy, 1, false);
    expect(b.enemy.hp).toBe(100);
    expect(b.player.gold).toBe(3);
  });

  it("Seventh Face's jackpot fires every face effect and triples", () => {
    const b = setup("king", { seventh_face: 1, viper_fang: 1, frost_shard: 1 });
    resolveFace(b, b.player, b.enemy, 7, false);
    expect(st(b.enemy, "poison")).toBe(3);
    expect(st(b.enemy, "chill")).toBe(2);
    expect(b.enemy.hp).toBeLessThanOrEqual(100 - 12);
  });
});

describe("classes", () => {
  it("the Queen's damage is a quarter of her HP plus Barrier", () => {
    const q = makeHero("queen", makeRng(1));
    expect(damageOf(q)).toBe(6);
    q.statuses.barrier = 8;
    expect(damageOf(q)).toBe(8);
  });

  it("the Ace scores hands", () => {
    expect(handMultiplier([{ v: 2, suit: "cups" }, { v: 2, suit: "wands" }, { v: 5, suit: "cups" }]).mult).toBe(2);
    expect(handMultiplier([{ v: 3, suit: "cups" }, { v: 4, suit: "cups" }, { v: 5, suit: "cups" }])).toMatchObject({ mult: 2, flush: true });
    expect(handMultiplier([{ v: 6, suit: "cups" }, { v: 6, suit: "wands" }, { v: 6, suit: "swords" }]).mult).toBe(3);
  });

  it("the King carries overkill into the next fight", () => {
    const p = makeHero("king", makeRng(1));
    const e = makeEnemy(2, "H", 1);
    e.hp = 1;
    const b = startBattle(p, e, 7);
    resolveFace(b, p, e, 4, false);
    expect(b.carnage).toBe(3);
    const e2 = makeEnemy(9, "H", 1);
    const before = e2.hp;
    startBattle(p, e2, 8, b.carnage);
    expect(e2.hp).toBe(before - 3);
  });
});

describe("statuses and reactions", () => {
  it("Combustion: Burn + Poison deal their stacks at once and clear", () => {
    const b = setup();
    applyStatus(b, b.player, b.enemy, "poison", 4);
    applyStatus(b, b.player, b.enemy, "burn", 3);
    expect(b.enemy.hp).toBe(93);
    expect(st(b.enemy, "burn") + st(b.enemy, "poison")).toBe(0);
  });

  it("Kindling Oil keeps Poison after Combustion", () => {
    const b = setup("king", { kindling_oil: 1 });
    applyStatus(b, b.player, b.enemy, "poison", 4);
    applyStatus(b, b.player, b.enemy, "burn", 3);
    expect(st(b.enemy, "poison")).toBe(4);
  });

  it("Viper Fang + Flint on a jackpot set off Combustion", () => {
    const b = setup("king", { seventh_face: 1, viper_fang: 1, flint: 1 });
    resolveFace(b, b.player, b.enemy, 7, false);
    expect(b.log.some(l => l.includes("Combustion"))).toBe(true);
  });

  it("Catalyst makes reactions stronger", () => {
    const b = setup("king", { alchemists_catalyst: 1 });
    applyStatus(b, b.player, b.enemy, "poison", 4);
    applyStatus(b, b.player, b.enemy, "burn", 4);
    expect(b.enemy.hp).toBe(88); // 8 × 1.5
  });

  it("Shatter triples the next hit and stuns", () => {
    const b = setup();
    applyStatus(b, b.player, b.enemy, "chill", 2);
    applyStatus(b, b.player, b.enemy, "shock", 1);
    resolveFace(b, b.player, b.enemy, 4, false);
    // 4 Damage × 1.5 Shock = 6, × 3 Shatter = 18
    expect(b.enemy.hp).toBe(82);
    expect(st(b.enemy, "stun")).toBe(1);
  });

  it("Ward blocks the next negative status", () => {
    const b = setup();
    applyStatus(b, b.enemy, b.player, "ward", 1);
    applyStatus(b, b.enemy, b.player, "poison", 5);
    expect(st(b.player, "poison")).toBe(0);
    expect(st(b.player, "ward")).toBe(0);
  });

  it("negators stop their status", () => {
    const b = setup("king", { thermal_coat: 1 });
    applyStatus(b, b.enemy, b.player, "chill", 3);
    expect(st(b.player, "chill")).toBe(0);
  });

  it("Bleed ticks and fades; Rupture doubles it", () => {
    const b = setup();
    applyStatus(b, b.player, b.enemy, "bleed", 3);
    endOfRound(b, b.enemy);
    expect(b.enemy.hp).toBe(97);
    applyStatus(b, b.player, b.enemy, "exposed", 1);
    endOfRound(b, b.enemy);
    expect(b.enemy.hp).toBe(97 - 2 - 2);
  });

  it("Doom kills once it reaches current HP", () => {
    const b = setup();
    b.enemy.hp = 4;
    applyStatus(b, b.player, b.enemy, "doom", 4);
    endOfRound(b, b.enemy);
    expect(b.enemy.hp).toBe(0);
  });
});

describe("full fights", () => {
  it("is deterministic for a seed", () => {
    const run = () => {
      const p = makeHero("jack", makeRng(3));
      const b = startBattle(p, makeEnemy(8, "C", 1, { elite: true, affixes: ["blazing"] }), 99);
      for (let i = 0; i < 30 && !b.over; i++) playRound(b, "attack");
      return b.log.join("\n");
    };
    expect(run()).toBe(run());
  });

  it("every class can finish a fight", () => {
    for (const cls of ["king", "jack", "queen", "ace"] as const) {
      const p = makeHero(cls, makeRng(5));
      const b = startBattle(p, makeEnemy(6, "D", 1), 11);
      for (let i = 0; i < 40 && !b.over; i++) playRound(b, "attack");
      expect(b.over, cls).not.toBeNull();
    }
  });
});
