import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { heroPhase, readied, readyThrow, startBattle, THROW_INFO } from "../src/engine/combat";
import { newHero } from "../src/game/hero";
beforeAll(() => loadLibrary());

it("a readied throwable costs no turn: it flies right after your action, and can be put back", () => {
  const h = newHero("warrior"), e = newHero("rogue").f;
  e.hp = e.maxHp = 400; e.name = "Dummy";
  h.f.persist[THROW_INFO.t_bomb.key] = 2;
  const b = startBattle(h.f, e, 3);
  b.round = 1;
  expect(readyThrow(b, "t_bomb")).toBe(true);
  expect(h.f.persist[THROW_INFO.t_bomb.key]).toBe(1);
  readyThrow(b, "t_bomb");
  expect(h.f.persist[THROW_INFO.t_bomb.key]).toBe(2);
  expect(readied(h.f)).toEqual([]);
  readyThrow(b, "t_bomb");
  heroPhase(b, "attack");
  const i = b.log.findIndex(l => l.includes("throws a Bomb"));
  expect(i).toBeGreaterThan(0);
  // The attack came first, then the bomb.
  expect(b.log.slice(0, i).some(l => /rolls|attacks|Hit|Miss|Crit|Graze/.test(l))).toBe(true);
  expect(h.f.persist[THROW_INFO.t_bomb.key]).toBe(1);
  expect(readied(h.f)).toEqual([]);
});
