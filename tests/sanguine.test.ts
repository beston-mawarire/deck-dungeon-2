import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { EVENTS } from "../src/data/events";
import { makeMonster, } from "../src/data/monsters";
import { makeBoss } from "../src/data/bosses";
import { startBattle, beginRound, endRound, resolveFace } from "../src/engine/combat";
import { makeRng } from "../src/engine/rng";
import { addToBackpack, newHero, recompute, scrapValue } from "../src/game/hero";
import { chooseEvent, eventOptionAvailable, newRun, restPct, sellPrice } from "../src/game/run";
beforeAll(() => loadLibrary());

const altar = () => EVENTS.find(e => e.id === "sanguine_altar")!;
const atAltar = (seed = 1) => { const run = newRun("warrior", seed); run.scene = { t: "event", ev: altar(), result: null, found: [] }; return run; };

it("the Sanguine Altar charges a share of Max HP, and you can't pay what would kill you", () => {
  const run = atAltar();
  const h = run.hero;
  h.f.hp = h.f.maxHp;
  expect(eventOptionAvailable(run, 8)).toBe(true); // 90%
  h.f.hp = Math.ceil(h.f.maxHp * 0.5);
  expect(eventOptionAvailable(run, 8)).toBe(false);
  expect(eventOptionAvailable(run, 0)).toBe(true);
  const g = h.f.gold;
  chooseEvent(run, 0);
  expect(h.f.gold).toBeGreaterThan(g);
  expect(h.f.hp).toBe(Math.ceil(h.f.maxHp * 0.5) - Math.ceil(h.f.maxHp * 0.1));
});

it("the altar's 80% and 90% sacrifices always give gear of at least Rare / Epic", () => {
  for (const [i, ok] of [[7, ["rare", "epic", "legendary", "crimson"]], [8, ["epic", "legendary", "crimson"]]] as const) {
    for (let seed = 1; seed < 15; seed++) {
      const run = atAltar(seed);
      run.hero.f.hp = run.hero.f.maxHp;
      chooseEvent(run, i);
      if (run.scene.t !== "loot") throw new Error("no loot");
      expect(run.scene.items.length).toBe(1);
      expect(ok).toContain(run.scene.items[0].rarity);
    }
  }
});

it("the altar can wash away curses, or lay one on you", () => {
  const run = atAltar();
  run.hero.curses = { c_rust: 1, c_dread: 1 }; recompute(run.hero);
  run.hero.f.hp = run.hero.f.maxHp;
  chooseEvent(run, 3);
  expect(Object.keys(run.hero.curses).length).toBe(0);
  const run2 = atAltar(2);
  run2.hero.f.hp = run2.hero.f.maxHp;
  chooseEvent(run2, 4);
  expect(Object.keys(run2.hero.curses).length).toBe(1);
});

it("Withering Breath stays off the campaign bosses", () => {
  for (let f = 1; f <= 5; f++) for (let s = 1; s < 6; s++) {
    const b = makeBoss(f, makeRng(s));
    expect(b.moves?.some(m => m.name === "Withering Breath")).toBe(false);
  }
});

it("new curses: Overburdened, Tarnished, Scrap Rot, Restless", () => {
  const h = newHero("warrior");
  const item = h.equip.main!;
  const sell = sellPrice(item, h), scrap = scrapValue(h, item), rest = restPct(h);
  h.curses = { c_overburdened: 1, c_tarnished: 1, c_scrap_rot: 1, c_restless: 1 }; recompute(h);
  expect(addToBackpack(h, { ...item, uid: 999 })).toMatch(/Overburdened/);
  expect(sellPrice(item, h)).toBeLessThan(sell + 1);
  expect(sellPrice(item, h)).toBe(Math.ceil(sell / 2));
  expect(scrapValue(h, item)).toBe(Math.ceil(scrap / 2));
  expect(restPct(h)).toBe(rest / 2);
});

it("Stripped hides your buffs for round 1, then gives them back; Leaky Purse drips Gold", () => {
  const h = newHero("warrior");
  h.curses = { c_stripped: 1, c_leaky_purse: 1 }; recompute(h);
  h.f.gold = 10;
  const e = makeMonster(makeRng(1), 1, "normal"); e.items = {}; e.hp = e.maxHp = 500;
  const b = startBattle(h.f, e, 1);
  h.f.statuses.might = 3;
  beginRound(b);
  expect(h.f.statuses.might ?? 0).toBe(0);
  endRound(b);
  expect(h.f.statuses.might ?? 0).toBeGreaterThanOrEqual(3);
  expect(h.f.gold).toBe(8);
});

it("Butterfingers: your first attack each fight does no damage", () => {
  const h = newHero("warrior");
  h.curses = { c_butterfingers: 1 }; recompute(h);
  const e = makeMonster(makeRng(1), 1, "normal"); e.items = {}; e.armor = 0; e.hp = e.maxHp = 500;
  const b = startBattle(h.f, e, 1);
  resolveFace(b, h.f, e, 4);
  expect(e.hp).toBe(500);
  resolveFace(b, h.f, e, 4);
  expect(e.hp).toBeLessThan(500);
});
