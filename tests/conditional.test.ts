import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { CONDITIONAL_LEGENDARIES } from "../src/data/conditional";
import { makeRng } from "../src/engine/rng";
import { newHero, recompute } from "../src/game/hero";
import { earlyCap, resetDropped, rollItem, SNAKE_ONES, unlocked } from "../src/game/loot";
import { newRun, skipTalent } from "../src/game/run";
beforeAll(() => loadLibrary());

const ids = (f: string) => CONDITIONAL_LEGENDARIES.filter(l => l.unlock === f).map(l => l.id);
const seen = (h: ReturnType<typeof newHero>, floor = 3) => { const s = new Set<string>(); const rng = makeRng(5); for (let i = 0; i < 4000; i++) { resetDropped(); s.add(rollItem(h, "legendary", floor, rng).base); } return s; };

it("Snake Eyes Legendaries only turn up after enough 1s", () => {
  const h = newHero("rogue"); h.f.persist["floor"] = 3;
  expect(ids("snake").some(id => seen(h).has(id))).toBe(false);
  h.f.persist["onesRolled"] = SNAKE_ONES;
  expect(ids("snake").some(id => seen(h).has(id))).toBe(true);
});

it("the Talentless turn up only after turning a talent down, while holding none", () => {
  const h = newHero("warrior"); h.f.persist["floor"] = 3;
  const t = CONDITIONAL_LEGENDARIES.find(l => l.unlock === "talentless")!;
  expect(unlocked(h, t)).toBe(false);
  h.f.persist["talentsSkipped"] = 1;
  expect(unlocked(h, t)).toBe(true);
  expect(ids("talentless").some(id => seen(h).has(id))).toBe(true);
  h.talents["x"] = 1; recompute(h);
  expect(unlocked(h, t)).toBe(false);
});

it("you can take no talent", () => {
  const run = newRun("mage", 3);
  run.pendingTalents = 1;
  run.scene = { t: "talent", options: [] } as never;
  skipTalent(run);
  expect(run.hero.f.persist["talentsSkipped"]).toBe(1);
  expect(run.pendingTalents).toBe(0);
});

it("Legendaries can turn up on floor 1", () => {
  const h = newHero("cleric"); h.f.persist["floor"] = 1;
  const rng = makeRng(1);
  let n = 0;
  for (let i = 0; i < 400; i++) if (earlyCap(h, "legendary", rng, 1) === "legendary") n++;
  expect(n).toBeGreaterThan(50);
  expect(seen(h, 1).size).toBeGreaterThan(20);
});
