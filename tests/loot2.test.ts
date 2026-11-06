import { beforeAll, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { CLASS_LEGENDARIES, STYLE_EPICS } from "../src/data/legends2";
import { crawlTables, resetDropped, rollItem } from "../src/game/loot";
import { newHero } from "../src/game/hero";
import { makeRng } from "../src/engine/rng";
import { LEGENDARY_LORE as LORE } from "../src/data/lore";

beforeAll(() => loadLibrary());

it("the dungeon's loot gets richer layer by layer, and a guardian never leaves less than a Rare", () => {
  const share = (L: number, t: "wooden" | "iron" | "elite" | "champion" | "boss") => { const o = crawlTables(L)[t] as Record<string, number>; const s = Object.values(o).reduce((a, b) => a + b, 0); return ((o.epic ?? 0) + (o.legendary ?? 0)) / s; };
  for (const t of ["wooden", "iron", "elite", "champion", "boss"] as const) for (let L = 1; L < 5; L++) expect(share(L + 1, t)).toBeGreaterThanOrEqual(share(L, t));
  for (let L = 1; L <= 6; L++) { const b = crawlTables(L).boss as Record<string, number>; expect(b.common ?? 0).toBe(0); expect(b.uncommon ?? 0).toBe(0); }
  expect(share(3, "boss")).toBe(1);
});

it("six Legendaries for each class (three for each way to play), all with lore, only ever dropping for their class", () => {
  for (const c of ["warrior", "rogue", "mage", "cleric"]) expect(CLASS_LEGENDARIES.filter(l => l.forClass === c).length).toBe(6);
  for (const l of CLASS_LEGENDARIES) expect((LORE as Record<string, string>)[l.id], l.id).toBeTruthy();
  expect(STYLE_EPICS.length).toBe(12);
  const h = newHero("mage"); h.f.persist["classLoot"] = 1;
  const rng = makeRng(5);
  const ids = new Set<string>();
  for (let i = 0; i < 400; i++) { resetDropped(); ids.add(rollItem(h, "legendary", 4, rng).base); }
  expect([...ids].some(id => id.startsWith("lm_"))).toBe(true);
  expect([...ids].some(id => /^l[wrc]_/.test(id))).toBe(false);
});
