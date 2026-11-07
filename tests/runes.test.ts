import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
loadLibrary();
import { newRun, rollRuneOffer, startCrawl, takeRune } from "../src/game/run";

describe("Face Runes", () => {
  it("offer three different runes, each on a face 1–6", () => {
    const r = newRun("warrior", 3); startCrawl(r);
    const o = rollRuneOffer(r);
    expect(o).toHaveLength(3);
    expect(new Set(o.map(x => x.id)).size).toBe(3);
    for (const x of o) { expect(x.face).toBeGreaterThanOrEqual(1); expect(x.face).toBeLessThanOrEqual(6); }
  });
  it("carve into a face, rank up when taken again (to III), and are replaced by a different rune", () => {
    const r = newRun("mage", 4); startCrawl(r);
    r.runeOffer = [{ id: "ember", face: 6 }];
    takeRune(r, 0);
    expect(r.hero.runes?.["6"]).toEqual({ id: "ember", rank: 1 });
    expect(r.hero.f.items["rune_ember_6"]).toBe(1);
    for (let k = 0; k < 3; k++) { r.runeOffer = [{ id: "ember", face: 6 }]; takeRune(r, 0); }
    expect(r.hero.runes?.["6"].rank).toBe(3);
    expect(r.hero.f.items["rune_ember_6"]).toBe(3);
    r.runeOffer = [{ id: "ward", face: 6 }];
    takeRune(r, 0);
    expect(r.hero.runes?.["6"]).toEqual({ id: "ward", rank: 1 });
    expect(r.hero.f.items["rune_ember_6"]).toBeUndefined();
  });
  it("can be left", () => {
    const r = newRun("rogue", 5); startCrawl(r);
    r.runeOffer = rollRuneOffer(r);
    takeRune(r, null);
    expect(r.runeOffer).toBeUndefined();
    expect(Object.keys(r.hero.runes ?? {})).toHaveLength(0);
  });
});

import { playRound, startBattle } from "../src/engine/combat";
import { recompute } from "../src/game/hero";
import { makeMonster } from "../src/data/monsters";
import { makeRng } from "../src/engine/rng";

describe("a Face Rune in a fight", () => {
  it("fires on its face, with a banner", () => {
    const r = newRun("warrior", 6); startCrawl(r);
    const h = r.hero;
    h.runes = Object.fromEntries([1, 2, 3, 4, 5, 6].map(f => [String(f), { id: "ember", rank: 1 }]));
    recompute(h);
    const e = makeMonster(makeRng(8), 1, "normal");
    e.hp = e.maxHp = 999; e.armor = 0; e.items = {}; e.damage = 1;
    const b = startBattle(h.f, e, 77);
    playRound(b, "attack");
    expect(b.fx.some(x => x.kind === "text" && /Ember Rune/.test(x.text ?? ""))).toBe(true);
  });
});

import { rollShuffleOffer, takeShuffle } from "../src/game/run";

describe("Shufflers", () => {
  it("rewrite a six-sided die: Low Roller makes 1s Crit and 6s Hit", () => {
    const r = newRun("warrior", 7); startCrawl(r);
    expect(r.hero.f.faces).toHaveLength(6);
    r.shuffleOffer = ["low_roller", "twin_crowns"];
    r.hero.shuffleDeal = { low_roller: { 1: 1, 6: 6 } };
    takeShuffle(r, "low_roller");
    expect(r.hero.f.faces[0].kind).toBe("crit");
    expect(r.hero.f.faces[5].kind).toBe("hit");
    expect(r.runeOffer).toBeUndefined();
  });
  it("Twin Crowns: 2s and 6s Crit, Crits deal 50% less; a new Shuffler replaces the old", () => {
    const r = newRun("rogue", 8); startCrawl(r);
    r.shuffleOffer = ["twin_crowns"];
    r.hero.shuffleDeal = { twin_crowns: { 2: 2, 6: 6 } };
    takeShuffle(r, "twin_crowns");
    expect(r.hero.f.faces[1].kind).toBe("crit");
    expect(r.hero.f.critDmg).toBe(-50);
    r.shuffleOffer = ["sure_hand"];
    takeShuffle(r, "sure_hand");
    expect(r.hero.shuffle).toBe("sure_hand");
    expect(r.hero.f.critDmg ?? 0).toBe(0);
  });
  it("are offered two at a time, never the one you have", () => {
    const r = newRun("mage", 9); startCrawl(r);
    r.hero.shuffle = "all_in";
    for (let k = 0; k < 20; k++) { const o = rollShuffleOffer(r); expect(o).toHaveLength(2); expect(o).not.toContain("all_in"); }
  });
});

import { rollDescentGift, SHUFFLE_GIFT_CHANCE } from "../src/game/run";
describe("the gift on a drop", () => {
  it("is one Face Rune or one Shuffler, never both, and a Shuffler comes now and then", () => {
    const r = newRun("warrior", 91); startCrawl(r);
    let shuf = 0;
    for (let k = 0; k < 400; k++) {
      rollDescentGift(r);
      const runes = r.runeOffer?.length ?? 0, shufs = r.shuffleOffer?.length ?? 0;
      expect(runes + shufs).toBe(1);
      if (shufs) shuf++;
    }
    expect(shuf / 400).toBeGreaterThan(SHUFFLE_GIFT_CHANCE - 0.1);
    expect(shuf / 400).toBeLessThan(SHUFFLE_GIFT_CHANCE + 0.1);
  });
  it("leaving it clears it, whether it was a rune or a Shuffler", () => {
    const r = newRun("warrior", 92); startCrawl(r);
    r.runeOffer = undefined; r.shuffleOffer = ["low_roller"];
    expect(takeRune(r, null)).toBeNull();
    expect(r.shuffleOffer).toBeUndefined();
    expect(r.hero.shuffle).toBeUndefined();
  });
  it("never offers a rune already at its highest rank on that face", () => {
    const r = newRun("warrior", 93); startCrawl(r);
    r.hero.runes = Object.fromEntries([1, 2, 3, 4, 5, 6].map(f => [f, { id: "ember", rank: 3 }]));
    for (let k = 0; k < 200; k++) { rollDescentGift(r); const o = r.runeOffer?.[0]; if (o) expect(o.id).not.toBe("ember"); }
  });
});

import { dealShuffler, shufflerFaces, shufflerText, SHUFFLERS } from "../src/data/runes";
describe("each run deals a Shuffler its own numbers", () => {
  const REF = ["miss", "graze", "hit", "hit", "hit", "crit"];
  it("its rule can land on any faces, and the text follows", () => {
    const seen = new Set<string>(), faces = new Set<number>();
    for (let k = 0; k < 200; k++) {
      const d = dealShuffler("twin_crowns", makeRng(k));
      seen.add(shufflerText("twin_crowns", d)); Object.values(d).forEach(f => faces.add(f));
    }
    expect(faces.size).toBe(6);
    expect(seen.size).toBeGreaterThan(8);
    for (const t of seen) expect(t).toMatch(/^Your \ds and \ds both Crit, but Crits deal 50% less\.$/);
  });
  it("every Shuffler moves around, keeps its own faces, and always changes something", () => {
    for (const sh of SHUFFLERS) {
      const where = new Set<string>();
      for (let k = 0; k < 60; k++) {
        const d = dealShuffler(sh.id, makeRng(1000 + k)), faces = shufflerFaces(sh.id, d);
        expect(Object.values(faces).sort()).toEqual(Object.values(sh.faces).sort());
        expect(Object.entries(faces).some(([f, kind]) => REF[Number(f) - 1] !== kind)).toBe(true);
        where.add(JSON.stringify(faces));
      }
      if (sh.id !== "even_keel") expect(where.size).toBeGreaterThan(3);
    }
  });
  it("a run keeps the numbers it was dealt, and the die uses them", () => {
    const r = newRun("warrior", 31); startCrawl(r);
    const o = rollShuffleOffer(r), id = o[0], deal = r.hero.shuffleDeal![id];
    rollShuffleOffer(r);
    expect(r.hero.shuffleDeal![id]).toEqual(deal);
    r.shuffleOffer = [id];
    takeShuffle(r, id);
    for (const [f, kind] of Object.entries(shufflerFaces(id, deal))) expect(r.hero.f.faces[Number(f) - 1].kind).toBe(kind);
  });
});

describe("Face Runes land on any face", () => {
  it("over many offers, every face turns up", () => {
    const r = newRun("warrior", 41); startCrawl(r);
    const faces = new Set<number>();
    for (let k = 0; k < 60; k++) for (const o of rollRuneOffer(r)) faces.add(o.face);
    expect(faces.size).toBe(6);
  });
});
