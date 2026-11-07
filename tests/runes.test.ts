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
