import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { makeRng } from "../src/engine/rng";
import { baseOf, newHero, recompute } from "../src/game/hero";
import { rollItem } from "../src/game/loot";
import { classify } from "../src/game/families";
import { applyRework, capacity, empower, extract, refine, rework, scrapScroll } from "../src/game/masterwork";
import { AFFIX_COUNT } from "../src/game/affixpool";
beforeAll(() => loadLibrary());

const hero = () => { const h = newHero("warrior"); h.scrap = 999; h.f.gold = 9999; h.azure = 20; h.orilium = 20; h.starmetal = 20; return h; };

it("Rework: two new options of the same grade; only one line per item; costs climb", () => {
  const h = hero(); const rng = makeRng(4);
  const it = rollItem(h, "rare", 3, rng); h.backpack.push(it);
  const [a, b] = Object.keys(it.bonuses);
  const out = rework(h, it.uid, a, rng);
  if (typeof out === "string") throw new Error(out);
  expect(out.options.length).toBeGreaterThan(0);
  applyRework(h, it.uid, a, out.options[0]);
  expect(Object.keys(it.bonuses).length).toBe(2);
  expect(typeof rework(h, it.uid, b, rng)).toBe("string"); // locked to the first line
  const scrapBefore = h.scrap, az = h.azure!;
  rework(h, it.uid, it.reworkLine!, rng);
  expect(h.scrap < scrapBefore || h.azure! < az).toBe(true);
});

it("Extract turns an item plain and makes a family scroll; Empower is one-way and bound by capacity", () => {
  const h = hero(); const rng = makeRng(9);
  let src = rollItem(h, "epic", 3, rng);
  while (baseOf(src.base).kind !== "weapon") src = rollItem(h, "epic", 3, rng);
  h.backpack.push(src);
  const s = extract(h, src.uid);
  if (typeof s === "string") throw new Error(s);
  expect(src.rarity).toBe("common");
  expect(Object.keys(src.bonuses).length).toBe(0);
  expect(Object.keys(s.lines).length).toBe(AFFIX_COUNT.epic);
  // A Common of the same family.
  let tgt = rollItem(h, "common", 3, rng);
  while (baseOf(tgt.base).kind !== s.kind || classify(baseOf(tgt.base)).family !== s.family) tgt = rollItem(h, "common", 3, rng);
  h.backpack.push(tgt);
  const lines = Object.keys(s.lines);
  expect(empower(h, s.uid, tgt.uid, lines)).toMatch(/room/); // 3 lines, room for 1
  expect(refine(h, tgt.uid)).toBeNull();
  expect(refine(h, tgt.uid)).toBeNull();
  expect(capacity(tgt)).toBe(3);
  expect(empower(h, s.uid, tgt.uid, lines)).toBeNull();
  expect(tgt.bound).toBe(true);
  expect(typeof extract(h, tgt.uid)).toBe("string"); // bound
  expect(h.powerScrolls?.length ?? 0).toBe(0);
  recompute(h);
});

it("Legendaries can't be extracted or refined; scrolls scrap for materials", () => {
  const h = hero(); const rng = makeRng(2);
  const leg = rollItem(h, "legendary", 3, rng); h.backpack.push(leg);
  expect(typeof extract(h, leg.uid)).toBe("string");
  expect(refine(h, leg.uid)).toMatch(/Common/);
  const r = rollItem(h, "rare", 3, rng); h.backpack.push(r);
  const s = extract(h, r.uid);
  if (typeof s === "string") throw new Error(s);
  const az = h.azure!;
  scrapScroll(h, s.uid);
  expect(h.azure).toBe(az + 1);
});
