import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { applyHall, bankCamp, buyHall, campOf, HALL, hallRank } from "../src/game/camp";
import { packSize } from "../src/game/hero";
import type { Meta } from "../src/game/meta";
import { campGain, combatAction, descend, makeGrid, newRun, startCrawl } from "../src/game/run";

loadLibrary();
const meta = (): Meta => ({ renown: 0, runs: 0, wins: 0 } as never);

describe("the Camp: Crown Shards, materials and the Hall", () => {
  it("banks what a run finds as it's found, once", () => {
    const m = meta(), r = newRun("warrior", 3); startCrawl(r);
    campGain(r, "bone", 2); campGain(r, null, 0, 1);
    expect(bankCamp(m, r)).toBe(true);
    expect(bankCamp(m, r)).toBe(false);
    campGain(r, "bone", 1);
    bankCamp(m, r);
    expect(campOf(m).mats.bone).toBe(3);
    expect(campOf(m).crowns).toBe(1);
  });

  it("buys Hall ranks for Crown Shards and materials, and a run sets out with them", () => {
    const m = meta();
    expect(buyHall(m, "straps")).toMatch(/Crown Shard/);
    const c = campOf(m); c.crowns = 40; c.mats = { bone: 40, hide: 40, cog: 40, sigil: 40 };
    for (const u of HALL) for (let k = 0; k < u.ranks; k++) expect(buyHall(m, u.id)).toBeNull();
    expect(buyHall(m, "straps")).toMatch(/complete/);
    expect(hallRank(m, "hardy")).toBe(5);
    const r = newRun("warrior", 4); startCrawl(r);
    const hp = r.hero.f.maxHp;
    applyHall(m, r);
    expect(r.hero.f.gold).toBe(20 + 100);
    expect(r.hero.potions).toBe(2);
    expect(packSize(r.hero)).toBe(12);
    expect(r.hero.f.maxHp).toBe(hp + 20);
    expect(r.hero.f.hp).toBe(r.hero.f.maxHp);
    expect(r.hero.f.persist["secondLife"]).toBe(1);
  });

  it("Second Life gets you back up once, at half your Max HP", () => {
    const r = newRun("rogue", 9); startCrawl(r); r.grid = makeGrid(r, 1);
    r.hero.f.persist["secondLife"] = 1;
    for (let d = 2; d <= 6; d++) descend(r);
    expect(r.scene.t === "combat" && r.scene.rank).toBe("boss");
    if (r.scene.t !== "combat") return;
    r.scene.battle.player.hp = 1;
    r.scene.battle.enemy.damage = 999;
    for (let k = 0; k < 40 && r.scene.t === "combat" && r.hero.f.persist["secondLife"]; k++) combatAction(r, "attack");
    // Back on its feet, facing the boss again.
    expect(r.scene.t).toBe("combat");
    expect(r.hero.f.persist["secondLife"]).toBe(0);
    expect(r.popup?.title).toBe("Second Life");
    expect(r.hero.f.hp).toBe(Math.ceil(r.hero.f.maxHp / 2));
  });
});
