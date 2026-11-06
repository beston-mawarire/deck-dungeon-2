import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { ATTR_PER_LEVEL } from "../src/data/attributes";
import { attrOf, newHero, recompute, spendAttr } from "../src/game/hero";
import { startBattle } from "../src/engine/combat";
import { gainXp, goldMult, newRun, startCrawl } from "../src/game/run";
import { xpToLevel } from "../src/game/hero";

beforeAll(() => loadLibrary());

describe("attributes", () => {
  it("a level-up in the Crawl gives two points and no talent", () => {
    const r = newRun("mage", 5); startCrawl(r);
    gainXp(r, xpToLevel(1));
    expect(r.hero.level).toBe(2);
    expect(r.hero.attrPoints).toBe(ATTR_PER_LEVEL);
    expect(r.pendingTalents).toBe(0);
    expect(r.popup?.title).toMatch(/Level 2/);
  });
  it("a level-up changes nothing by itself: no Max HP, no healing, only points", () => {
    const r = newRun("warrior", 5); startCrawl(r);
    r.hero.f.hp = 5;
    const max = r.hero.f.maxHp;
    gainXp(r, xpToLevel(1));
    expect(r.hero.f.hp).toBe(5);
    expect(r.hero.f.maxHp).toBe(max);
    expect(r.hero.attrPoints).toBe(ATTR_PER_LEVEL);
  });
  it("points only go where you have them, and each one shows in your stats", () => {
    const r = newRun("mage", 7); startCrawl(r);
    const h = r.hero;
    expect(spendAttr(h, "str")).toMatch(/No points/);
    h.attrPoints = 4;
    const dmg = h.f.damage, hp = h.f.maxHp, gold = goldMult(r), crit = h.f.critChance ?? 0;
    spendAttr(h, "str"); spendAttr(h, "agi"); spendAttr(h, "for");
    expect(h.f.maxHp).toBe(hp + 2);
    expect(h.f.hp).toBe(h.f.maxHp);
    expect(h.f.damage).toBe(dmg);
    expect(h.f.critChance ?? 0).toBeGreaterThan(crit);
    expect(goldMult(r)).toBeGreaterThan(gold);
    expect(h.attrPoints).toBe(1);
  });
  it("a class's base attribute raises its base Damage", () => {
    const r = newRun("mage", 8); startCrawl(r);
    const dmg = r.hero.f.damage;
    r.hero.attrs = { int: 3, str: 3 };
    recompute(r.hero);
    // +1 base Damage for every 3 points.
    expect(r.hero.f.damage).toBe(dmg + 1);
    r.hero.attrs = { int: 5, str: 3 };
    recompute(r.hero);
    expect(r.hero.f.damage).toBe(dmg + 1);
    expect(attrOf(r.hero, "int")).toBe(5);
  });
  it("Intellect: +1 Max Mana for every 3 points, and mana carries over between fights", () => {
    const r = newRun("mage", 9); startCrawl(r);
    r.hero.attrs = { int: 6 }; recompute(r.hero);
    const b1 = startBattle(r.hero.f, newHero("warrior").f, 1);
    expect(b1.player.maxMana).toBe(4);
    r.hero.f.mana = 1;
    startBattle(r.hero.f, newHero("warrior").f, 2);
    expect(r.hero.f.mana).toBe(1);
  });
  it(`each level is worth ${ATTR_PER_LEVEL} point`, () => expect(ATTR_PER_LEVEL).toBe(1));
});
