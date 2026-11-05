import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { makeMonster } from "../src/data/monsters";
import { bombDamage, heroPhase, startBattle } from "../src/engine/combat";
import { getItem } from "../src/engine/registry";
import { makeRng } from "../src/engine/rng";
import { newHero, recompute } from "../src/game/hero";
import { availableActions, chooseRoom, combatAction, makeGrid, newRun, startCrawl } from "../src/game/run";
import { isFloor } from "../src/game/grid";

beforeAll(() => loadLibrary());

const battle = (seed = 3) => {
  const h = newHero("warrior");
  recompute(h);
  h.f.persist["floor"] = 1;
  const e = makeMonster(makeRng(seed), 1, "normal");
  e.hp = e.maxHp = 200;
  return { h, b: startBattle(h.f, e, seed) };
};

describe("things to throw", () => {
  it("a Bomb blasts the foe through Armor and is used up", () => {
    const { h, b } = battle();
    h.f.persist["c_bomb"] = 2;
    b.enemy.armor = 10;
    const hp = b.enemy.hp;
    heroPhase(b, "t_bomb");
    expect(hp - b.enemy.hp).toBe(bombDamage(1));
    expect(h.f.persist["c_bomb"]).toBe(1);
  });
  it("a Vile Brew Poisons and Weakens", () => {
    const { h, b } = battle();
    h.f.persist["c_brew"] = 1;
    heroPhase(b, "t_brew");
    expect(b.enemy.statuses.poison ?? 0).toBeGreaterThan(0);
    expect(b.enemy.statuses.weak ?? 0).toBeGreaterThan(0);
  });
});

describe("fleeing", () => {
  it("costs a hit, unless smoke covers you", () => {
    let hitOnce = false;
    for (let seed = 1; seed < 30 && !hitOnce; seed++) {
      const { h, b } = battle(seed);
      b.enemy.damage = 6;
      const hp = h.f.hp;
      heroPhase(b, "flee");
      expect(b.over).toBe("fled");
      if (h.f.hp < hp) hitOnce = true;
    }
    expect(hitOnce).toBe(true);
    for (let seed = 1; seed < 15; seed++) {
      const { h, b } = battle(seed);
      h.f.persist["c_smoke"] = 1;
      b.enemy.damage = 6;
      heroPhase(b, "t_smoke");
      const hp = h.f.hp;
      heroPhase(b, "flee");
      expect(b.over).toBe("fled");
      expect(h.f.hp).toBe(hp);
    }
  });
  it("in the Crawl, the foe stays on the map and you step back", () => {
    const r = newRun("warrior", 41); startCrawl(r); r.grid = makeGrid(r, 2);
    const m = r.grid;
    const ti = m.things.findIndex(t => t.room === "fight" && !t.guard);
    const t = m.things[ti];
    const nb = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => [t.x + dx, t.y + dy]).find(([x, y]) => isFloor(m, x, y) && !m.things.some(o => o.x === x && o.y === y))!;
    m.px = nb[0]; m.py = nb[1];
    m.pending = ti; m.bx = nb[0]; m.by = nb[1]; m.px = t.x; m.py = t.y;
    r.nextFoe = t.foe;
    // Enter it as the map would.
    chooseRoom(r, "fight");
    expect(r.scene.t).toBe("combat");
    expect(availableActions(r)).toContain("flee");
    r.hero.f.hp = 999; r.hero.f.maxHp = 999;
    combatAction(r, "flee");
    expect(r.scene.t).toBe("map");
    expect(m.things[ti].done).toBeFalsy();
    expect([m.px, m.py]).toEqual(nb);
  });
});

describe("weapons that don't need crits", () => {
  it("the rules are real lines", () => {
    for (const id of ["gr_fours", "gr_steady", "gr_twice", "gr_charge"]) expect(getItem(id).text.length).toBeGreaterThan(5);
  });
  const ctx = (b: ReturnType<typeof battle>["b"], face: number, kind: string) => ({ attacker: b.player, defender: b.enemy, face, kind, spec: { kind }, mult: 1, ignoreArmor: false, bonus: 0, noDamage: false, offhand: false, dealt: 0 }) as never as { bonus: number };
  const hit = (id: string, b: ReturnType<typeof battle>["b"], face: number, kind = "hit") => { const c = ctx(b, face, kind); getItem(id).hooks.modifyAttack!(b, c as never, 2); return c.bonus; };
  it("Steady builds while you don't crit, and a crit resets it", () => {
    const { b } = battle();
    expect(hit("gr_steady", b, 3)).toBe(0);
    expect(hit("gr_steady", b, 4)).toBe(2);
    expect(hit("gr_steady", b, 5)).toBe(4);
    hit("gr_steady", b, 6, "crit");
    expect(hit("gr_steady", b, 3)).toBe(0);
  });
  it("Fours count up; echoes reward a repeat; low rolls charge the next big one", () => {
    const { b } = battle();
    expect(hit("gr_fours", b, 4)).toBe(2);
    expect(hit("gr_fours", b, 2)).toBe(2);
    expect(hit("gr_fours", b, 4)).toBe(4);
    expect(hit("gr_twice", b, 3)).toBe(0);
    expect(hit("gr_twice", b, 3)).toBe(2);
    hit("gr_charge", b, 1); hit("gr_charge", b, 2);
    expect(hit("gr_charge", b, 5)).toBe(4);
    expect(hit("gr_charge", b, 5)).toBe(0);
  });
});
