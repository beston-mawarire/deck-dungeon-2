import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { ATTR_PER_LEVEL } from "../src/data/attributes";
import { attrOf, recompute, spendAttr } from "../src/game/hero";
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
  it("points only go where you have them, and each one shows in your stats", () => {
    const r = newRun("mage", 7); startCrawl(r);
    const h = r.hero;
    expect(spendAttr(h, "str")).toMatch(/No points/);
    h.attrPoints = 4;
    const dmg = h.f.damage, hp = h.f.maxHp, gold = goldMult(r);
    spendAttr(h, "str"); spendAttr(h, "vit"); spendAttr(h, "for");
    expect(h.f.damage).toBe(dmg + 1);
    expect(h.f.maxHp).toBe(hp + 4);
    expect(h.f.hp).toBe(h.f.maxHp);
    expect(goldMult(r)).toBeGreaterThan(gold);
    expect(h.attrPoints).toBe(1);
  });
  it("a class's favoured attribute is half as strong again", () => {
    const r = newRun("mage", 8); startCrawl(r);
    r.hero.attrs = { int: 4, str: 4 };
    recompute(r.hero);
    expect(attrOf(r.hero, "int")).toBe(6);
    expect(attrOf(r.hero, "str")).toBe(4);
  });
  it(`each level is worth ${ATTR_PER_LEVEL} points`, () => expect(ATTR_PER_LEVEL).toBe(2));
});
