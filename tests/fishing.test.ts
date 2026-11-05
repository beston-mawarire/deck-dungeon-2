import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { makeRng } from "../src/engine/rng";
import { CAMP_CASTS, FISH, planCast, POND_CASTS, rollCatch } from "../src/game/fishing";
import { bankLongRoad, type Meta } from "../src/game/meta";
import { eatFish, fishCast, newRun, sellFish, startCrawl } from "../src/game/run";

beforeAll(() => loadLibrary());
const meta = () => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0 }) as unknown as Meta;
const atPool = (seed = 7) => {
  const r = newRun("warrior", seed); startCrawl(r);
  r.scene = { t: "fishing", casts: POND_CASTS, log: [] };
  return r;
};

describe("fishing", () => {
  it("a cast plans twitches before the bite, and about half get no bite at all", () => {
    const rng = makeRng(3);
    let none = 0;
    for (let k = 0; k < 400; k++) {
      const p = planCast(rng);
      if (p.bite === null) none++;
      else for (const t of p.twitches) expect(t).toBeLessThan(p.bite);
      expect(p.twitches.length).toBeLessThanOrEqual(2);
    }
    expect(none).toBeGreaterThan(140);
    expect(none).toBeLessThan(260);
  });
  it("deeper water gives finer fish", () => {
    const rare = (deep: number) => { const rng = makeRng(9); let n = 0; for (let k = 0; k < 4000; k++) { const c = rollCatch(rng, deep); if (c.kind === "fish" && (c.fish.rarity === "rare" || c.fish.rarity === "legendary")) n++; } return n; };
    expect(rare(5)).toBeGreaterThan(rare(1));
  });
  it("striking too soon costs the cast; a pool runs dry", () => {
    const r = atPool();
    expect(fishCast(r, false).fish).toBeUndefined();
    fishCast(r, true); fishCast(r, true);
    expect(fishCast(r, true).text).toBe("");
    expect(r.scene.t === "fishing" && r.scene.casts).toBe(0);
  });
  it("a fish can be eaten for healing, or carried home to the Trophy Room's tank", () => {
    const r = atPool(11);
    const p = r.hero.f.persist;
    p["fishk_frostfin"] = 1; p["fishk_koi"] = 1; p["fishk_angler"] = 1;
    r.hero.f.hp = 10;
    const max = r.hero.f.maxHp;
    expect(eatFish(r, "frostfin")).toMatch(/Frostfin/);
    expect(r.hero.f.maxHp).toBe(max + 2);
    expect(r.hero.f.hp).toBeGreaterThan(10);
    expect(eatFish(r, "angler")).toBeNull();
    const g = r.hero.f.gold;
    expect(sellFish(r, "koi")).toBeTruthy();
    expect(r.hero.f.gold).toBe(g + FISH.find(f => f.id === "koi")!.gold!);
    const m = meta();
    m.fishCasts = 0;
    bankLongRoad(m, r);
    expect(m.fish).toEqual({ angler: 1 });
    expect(m.fishCasts).toBe(CAMP_CASTS);
  });
});
