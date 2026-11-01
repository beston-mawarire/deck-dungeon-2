import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { BOUNTY_ROOMS, bountyProgress, makeOffers } from "../src/game/bounty";
import { heroTags, recompute } from "../src/game/hero";
import { type Run, advance, chooseEvent, chooseRoom, combatAction, finishLoot, genChoices, newRun, takeBounty, unifyHeart } from "../src/game/run";
beforeAll(() => loadLibrary());
// (Read the scene fresh: actions change it, and TypeScript would otherwise keep an old narrowing.)
const S = (r: Run): Run["scene"] => r.scene;

it("the Bounty Board offers three different contracts", () => {
  const run = newRun("warrior", 1);
  for (let s = 0; s < 20; s++) {
    const offers = makeOffers(run.hero, Math.random, 1, heroTags(run.hero));
    expect(offers.length).toBe(3);
    expect(new Set(offers.map(o => o.kind)).size).toBe(3);
    for (const o of offers) expect(o.roomsLeft).toBe(BOUNTY_ROOMS);
  }
});

it("a kill contract counts kills, then pays out back on the path", () => {
  const run = newRun("warrior", 2);
  run.scene = { t: "bounty", offers: [{ kind: "kills", target: 2, base: 0, roomsLeft: BOUNTY_ROOMS, reward: { kind: "gold", n: 77 } }] };
  takeBounty(run, 0);
  expect(run.bounty?.kind).toBe("kills");
  for (let k = 0; k < 2; k++) {
    chooseRoom(run, "fight");
    const sc = S(run);
    if (sc.t !== "combat") throw new Error("no fight");
    sc.battle.enemy.hp = 0;
    combatAction(run, "attack");
    finishLoot(run);
  }
  // The second kill's loot closes onto the bounty payout.
  const pay = S(run);
  expect(pay.t).toBe("loot");
  if (pay.t !== "loot") return;
  expect(pay.bounty).toBe(true);
  expect(pay.gold).toBe(77);
  expect(run.bounty).toBeUndefined();
  const step = run.step;
  finishLoot(run);
  expect(run.step).toBe(step); // collecting the payout doesn't use a step
});

it("a contract expires after 14 rooms", () => {
  const run = newRun("warrior", 3);
  run.scene = { t: "bounty", offers: [{ kind: "champions", target: 2, base: 0, roomsLeft: BOUNTY_ROOMS, reward: { kind: "scrap", n: 30 } }] };
  takeBounty(run, 0);
  for (let i = 0; i < BOUNTY_ROOMS; i++) { chooseRoom(run, "rest"); advance(run); if (S(run).t === "cleared") advance(run); }
  expect(run.bounty).toBeUndefined();
  expect(run.message).toMatch(/expired/);
});

it("flawless and crit counters tick", () => {
  const run = newRun("warrior", 4);
  run.scene = { t: "bounty", offers: [{ kind: "flawless", target: 1, base: 0, roomsLeft: BOUNTY_ROOMS, reward: { kind: "gold", n: 5 } }] };
  takeBounty(run, 0);
  chooseRoom(run, "fight");
  const sc = S(run);
  if (sc.t !== "combat") throw new Error("no fight");
  sc.battle.enemy.hp = 0;
  combatAction(run, "attack");
  expect(bountyProgress(run.hero, run.bounty!)).toBe(1);
});

it("Dragon Heart: unifying raises every stat by half", () => {
  const run = newRun("warrior", 5);
  const h = run.hero;
  const before = { hp: h.f.maxHp, dmg: h.f.damage, armor: h.f.armor };
  h.dragonHeart = { level: 1 };
  expect(genChoices(run).length).toBeGreaterThan(0);
  run.scene = { t: "sanctum" };
  unifyHeart(run);
  expect(h.dragonHeart.unified).toBe(true);
  expect(h.f.maxHp).toBe(Math.round(before.hp * 1.5));
  expect(h.f.damage).toBe(Math.round(before.dmg * 1.5));
  expect(h.f.armor).toBe(Math.round(before.armor * 1.5));
  recompute(h);
  expect(h.f.maxHp).toBe(Math.round(before.hp * 1.5));
});

it("beating a dragon tears out its heart (and a second one levels it)", () => {
  for (const lvl of [1, 2]) {
    const run = newRun("warrior", 6);
    if (lvl === 2) run.hero.dragonHeart = { level: 1 };
    const ev = { id: "x", title: "x", icon: "x", text: "", options: [{ label: "wake", run: (c: { wakeDragon: (s?: boolean) => void }) => { c.wakeDragon(true); return ""; } }] };
    run.scene = { t: "event", ev: ev as never, result: null, found: [] };
    chooseEvent(run, 0);
    const sc = S(run);
    if (sc.t !== "combat") throw new Error("no dragon");
    expect(sc.battle.enemy.name).toBe("The Sleeping Dragon");
    sc.battle.enemy.hp = 0;
    combatAction(run, "attack");
    expect(run.hero.dragonHeart?.level).toBe(lvl);
    const loot = S(run);
    if (loot.t === "loot") expect(loot.dragonHeart).toBe(lvl);
  }
});
