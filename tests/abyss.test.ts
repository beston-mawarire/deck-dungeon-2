import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { recompute } from "../src/game/hero";
import { ABYSS_LAYER, advance, beginAtLayer, chooseOmen, chooseRoom, descend, makeGrid, newRun, offerOmens, omensTaken, pactRank, settleCombat, setOut, startCrawl, STEPS_PER_FLOOR, type Run } from "../src/game/run";
import { carriedTarot, flipTarot, type Meta, payBounties, recordRun, takeTarot, toggleTarot } from "../src/game/meta";
import { layerFloors, LAYER_FLOORS } from "../src/game/grid";
import { TAROT, tarotHeat, tarotOffer } from "../src/game/tarot";
import { BOUNTY_CAP, PACT, PACT_MAX, pactHeat } from "../src/game/pact";
import { OMENS_FOR_FOUR } from "../src/game/omens";

beforeAll(() => loadLibrary());

const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };
const fresh = (): Meta => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] });
const fightIn = (run: Run, room: Parameters<typeof chooseRoom>[1], step = 1) => {
  run.step = step; run.scene = { t: "map" } as Run["scene"]; run.choices = [room];
  chooseRoom(run, room);
  const sc = run.scene as { t: string; rank?: string; uber?: boolean; battle?: { enemy: { hp: number; maxHp: number; damage: number; armor: number }; over?: string } };
  if (sc.t !== "combat" || !sc.battle) throw new Error(`no fight: ${sc.t}`);
  return sc as typeof sc & { battle: NonNullable<typeof sc.battle> };
};

describe("the Abyss: one dark layer below the last", () => {
  const abyssRun = (seed = 3) => { const r = newRun("warrior", seed, "abyss"); startCrawl(r); beginAtLayer(r, ABYSS_LAYER); setOut(r, {}, []); return r; };
  it("is a single layer, set out on as the 6th, at a deep level with good gear", () => {
    const r = abyssRun();
    expect(r.floor).toBe(ABYSS_LAYER);
    expect(layerFloors(r)).toBe(LAYER_FLOORS);
    expect(r.hero.level).toBeGreaterThan(10);
    // Five good pieces: what beats your kit goes straight on, the rest in your pack.
    const good = (i?: { rarity: string }) => !!i && ["epic", "legendary", "rare"].includes(i.rarity);
    expect(r.hero.backpack.filter(good).length + Object.values(r.hero.equip).filter(good).length).toBeGreaterThanOrEqual(5);
    expect(Object.values(r.hero.equip).filter(good).length).toBeGreaterThan(0);
  });
  it("its warden at the bottom is an Uber boss; beating it wins the run", () => {
    const r = abyssRun(4);
    const sc = fightIn(r, "boss", STEPS_PER_FLOOR);
    expect(sc.uber).toBe(true);
    sc.battle.enemy.hp = 0; sc.battle.over = "won"; settleCombat(r);
    for (let k = 0; k < 5 && r.scene.t !== "over"; k++) { r.scene = { t: "map" }; r.step = STEPS_PER_FLOOR; r.gridDescend = true; advance(r); }
    expect(r.scene).toEqual({ t: "over", won: true });
  });
  it("offers three Omens on every floor; each accepted is a boon and a bane for the rest of the run", () => {
    const r = abyssRun(5);
    r.grid = makeGrid(r, 1);
    descend(r);
    expect(r.scene.t).toBe("omen");
    const opts = (r.scene as { options: string[] }).options;
    expect(opts.length).toBe(3);
    const hp0 = r.hero.f.maxHp, arm0 = r.hero.f.armor;
    r.scene = { t: "omen", options: ["ironwill", "gilded", "sight"] };
    chooseOmen(r, "ironwill");
    expect(r.hero.f.armor).toBe(arm0 + 3);
    expect(r.hero.f.maxHp).toBe(hp0);
    expect(omensTaken(r.hero)).toBe(1);
    // Refusing them all is allowed.
    offerOmens(r);
    chooseOmen(r, null);
    expect(omensTaken(r.hero)).toBe(1);
    expect(r.scene.t).toBe("map");
  });
  it("a clear offers a Tarot card: three you don't own, four if you accepted four Omens", () => {
    const m = fresh();
    const r = abyssRun(6);
    r.scene = { t: "over", won: true };
    recordRun(m, r);
    expect(m.tarotOffer?.length).toBe(3);
    expect(m.abyssWins).toBe(1);
    expect(takeTarot(m, m.tarotOffer![0])).toBe(true);
    expect(Object.keys(m.tarot!).length).toBe(1);
    const r2 = abyssRun(7);
    r2.hero.omens = { gilded: OMENS_FOR_FOUR };
    r2.scene = { t: "over", won: true };
    recordRun(m, r2);
    expect(m.tarotOffer?.length).toBe(4);
    expect(m.tarotOffer!.some(id => m.tarot![id])).toBe(false);
  });
});

describe("Tarot", () => {
  it("every card is written out, and the deck has the Major Arcana from the Fool to Judgement", () => {
    expect(TAROT.length).toBe(21);
    for (const t of TAROT) { expect(t.boon(1).length).toBeGreaterThan(10); expect(t.bane(1).length).toBeGreaterThan(10); expect(t.boon(2)).not.toBe(""); }
  });
  it("offers fresh cards first, then level-ups; levels stop at III", () => {
    const rng = () => 0.5;
    const all = Object.fromEntries(TAROT.map(t => [t.id, 1]));
    expect(tarotOffer({}, rng).length).toBe(3);
    const off = tarotOffer({ ...all, fool: undefined }, rng);
    expect(off[0]).toBe("fool");
    expect(tarotOffer(Object.fromEntries(TAROT.map(t => [t.id, 3])), rng)).toEqual([]);
  });
  it("two can be carried; from level II one can be Reversed", () => {
    const m = fresh();
    m.tarot = { devil: 1, emperor: 2, moon: 1 };
    expect(toggleTarot(m, "devil")).toBeNull();
    expect(toggleTarot(m, "emperor")).toBeNull();
    expect(toggleTarot(m, "moon")).toMatch(/carry 2/);
    expect(flipTarot(m, "devil")).toBe(false);
    expect(flipTarot(m, "emperor")).toBe(true);
    expect(carriedTarot(m)).toEqual([{ id: "devil", lvl: 1, rev: undefined }, { id: "emperor", lvl: 2, rev: true }]);
  });
  it("the Devil curses you as you set out; the Fool takes your kit for an Epic weapon; the Hanged Man takes Max HP", () => {
    const a = newRun("warrior", 11); startCrawl(a);
    setOut(a, {}, [{ id: "devil", lvl: 1 }]);
    expect(Object.values(a.hero.curses).reduce((x, y) => x + y, 0)).toBe(2);
    const b = newRun("warrior", 12); startCrawl(b);
    setOut(b, {}, [{ id: "fool", lvl: 1 }]);
    expect(b.hero.equip.main?.rarity).toBe("epic");
    expect(b.hero.equip.off).toBeUndefined();
    const c = newRun("cleric", 13); startCrawl(c);
    const hp = c.hero.f.maxHp;
    setOut(c, {}, [{ id: "hanged", lvl: 1 }]);
    expect(c.hero.f.maxHp).toBe(hp - Math.round(hp * 0.15));
  });
  it("the Emperor adds Elites to the floors (and makes them hit harder)", () => {
    const count = (cards: { id: string; lvl: number }[]) => {
      let n = 0;
      for (let seed = 1; seed <= 20; seed++) { const r = newRun("rogue", seed); startCrawl(r); setOut(r, {}, cards); for (let d = 2; d <= 4; d++) n += makeGrid(r, d).things.filter(t => t.room === "elite").length; }
      return n;
    };
    expect(count([{ id: "emperor", lvl: 1 }])).toBeGreaterThan(count([]) + 40);
  });
  it("Justice turns misses to grazes and crits to hits; the Magician turns a hit into a Fire Bolt", () => {
    const r = newRun("warrior", 14); startCrawl(r);
    setOut(r, {}, [{ id: "justice", lvl: 1 }]);
    expect(r.hero.f.faces!.some(f => f.kind === "miss" || f.kind === "crit")).toBe(false);
    const s = newRun("warrior", 15); startCrawl(s);
    setOut(s, {}, [{ id: "magician", lvl: 1 }]);
    expect(s.hero.f.faces!.some(f => f.name === "Fire Bolt")).toBe(true);
  });
  it("Edicts add Heat", () => {
    expect(tarotHeat([{ id: "priestess", lvl: 1 }, { id: "judgement", lvl: 2, rev: true }])).toBe(1 + 4);
  });
});

describe("Heat: a pact you make", () => {
  it("each condition is worth Heat; the total sets the run's Heat", () => {
    expect(PACT.length).toBeGreaterThanOrEqual(10);
    expect(pactHeat({ hardened: 2, swarm: 1, nonsense: 5 })).toBe(2 + 2);
    expect(PACT_MAX).toBeGreaterThan(20);
    const r = newRun("warrior", 21); startCrawl(r);
    setOut(r, { hardened: 3, lean: 1 }, [{ id: "priestess", lvl: 1 }]);
    expect(r.heat).toBe(3 + 1 + 1);
    expect(pactRank(r, "hardened")).toBe(3);
  });
  it("Hardened Foes: +12% HP a rank", () => {
    const a = newRun("rogue", 22), b = newRun("rogue", 22);
    setOut(b, { hardened: 2 }, []);
    const ea = fightIn(a, "fight").battle.enemy, eb = fightIn(b, "fight").battle.enemy;
    expect(eb.maxHp).toBe(Math.round(ea.maxHp * 1.24));
  });
  it("Dim Fires cuts healing; Short Supply takes a potion slot", async () => {
    const { restore } = await import("../src/game/run");
    const { potionCap } = await import("../src/game/hero");
    const r = newRun("cleric", 23);
    const cap = potionCap(r.hero);
    setOut(r, { dim: 2, supply: 1 }, []);
    recompute(r.hero);
    r.hero.f.hp = 1; restore(r.hero, 20);
    expect(r.hero.f.hp).toBe(13);
    expect(potionCap(r.hero)).toBe(cap - 1);
  });
  it("no pact in the Abyss or a Daily", () => {
    const r = newRun("warrior", 24, "abyss");
    setOut(r, { hardened: 3 }, [{ id: "devil", lvl: 1 }]);
    expect(pactRank(r, "hardened")).toBe(0);
    expect(r.hero.tarot).toBeUndefined();
  });
  it("bounties: each new Heat level beaten, per class, up to the cap, paid once", () => {
    const m = fresh();
    expect(payBounties(m, "mage", 3).map(b => b.heat)).toEqual([1, 2, 3]);
    expect(m.camp!.crowns).toBe(2 + 4 + 6);
    expect(payBounties(m, "mage", 2)).toEqual([]);
    expect(payBounties(m, "mage", 99).length).toBe(BOUNTY_CAP - 3);
    expect(payBounties(m, "rogue", 1).length).toBe(1);
  });
});

describe("class paths", () => {
  it("each class has two paths, each with a gain, a loss and two level-5 skills", async () => {
    const { PATHS, pathsOf } = await import("../src/data/classpaths");
    expect(PATHS.length).toBe(8);
    for (const o of ["warrior", "rogue", "mage", "cleric"] as const) expect(pathsOf(o).length).toBe(2);
    for (const p of PATHS) { expect(p.gain.length).toBeGreaterThan(0); expect(p.lose.length).toBeGreaterThan(0); expect(p.skills.length).toBe(2); }
  });
  it("the path's skill is chosen at level 5, and then it's a button in every fight", async () => {
    const { availableActions, chooseSkill } = await import("../src/game/run");
    const r = newRun("warrior", 61); startCrawl(r);
    r.hero.path = "berserker"; recompute(r.hero);
    expect(chooseSkill(r, "rampage")).toMatch(/level 5/);
    r.hero.level = 5;
    expect(chooseSkill(r, "bastion")).toMatch(/isn't one/);
    expect(chooseSkill(r, "rampage")).toBeNull();
    fightIn(r, "fight");
    expect(availableActions(r)).toContain("rampage");
  });
  it("the Berserker halves Armor; the Bulwark deals less", () => {
    const a = newRun("warrior", 62); startCrawl(a); recompute(a.hero);
    const arm = a.hero.f.armor;
    a.hero.path = "berserker"; recompute(a.hero);
    expect(a.hero.f.armor).toBe(Math.floor(arm / 2));
    a.hero.path = "bulwark"; recompute(a.hero);
    expect(a.hero.f.dmgDealt ?? 0).toBeLessThan(0);
  });
  it("a Legendary can grant one of the old class skills", async () => {
    const { availableActions } = await import("../src/game/run");
    const r = newRun("warrior", 63); startCrawl(r);
    r.hero.equip.off = { uid: 9999, base: "lg_warlords_banner", rarity: "legendary", level: 1, bonuses: {}, revealed: true } as never; recompute(r.hero);
    fightIn(r, "fight");
    expect(availableActions(r)).toContain("warcry");
  });
  it("the tree's Deep Well gives Mana back at the start of each fight (Mana carries over otherwise)", () => {
    const r = newRun("mage", 64); startCrawl(r);
    r.hero.talents["t_deep_well"] = 2; recompute(r.hero);
    r.hero.f.persist["manaSeen"] = 1; r.hero.f.mana = 0;
    const b = (fightIn(r, "fight"), (r.scene as unknown as { battle: { player: { mana: number } } }).battle);
    expect(b.player.mana).toBe(2);
  });
});

describe("the 1st Layer and the Ledger (1.98)", () => {
  it("the Tavern's parting gift: one of a Healing Potion, a Mana Potion or a Skeleton Key, at random", async () => {
    const { tavernGift, GIFTS } = await import("../src/game/run");
    expect(Object.keys(GIFTS).sort()).toEqual(["key", "mana", "potion"]);
    const got = new Set<string>();
    for (let k = 0; k < 30; k++) {
      const r = newRun("rogue", 80 + k); startCrawl(r);
      const p0 = r.hero.potions, m0 = r.hero.manaPotions, k0 = r.hero.f.persist["skelKeys"] ?? 0;
      tavernGift(r);
      expect(r.scene.t).toBe("map"); expect(r.step).toBe(0);
      const gained = (r.hero.potions - p0) + (r.hero.manaPotions - m0) + ((r.hero.f.persist["skelKeys"] ?? 0) - k0);
      expect(gained).toBe(1);
      got.add(r.hero.potions > p0 ? "potion" : r.hero.manaPotions > m0 ? "mana" : "key");
    }
    expect(got.size).toBe(3);
  });
  it("every 1st Layer holds one of its own named foes on a middle floor", () => {
    for (let seed = 1; seed < 20; seed++) {
      const r = newRun("warrior", 700 + seed); startCrawl(r);
      const at = r.gridPlan?.unique ?? 0;
      expect(at).toBeGreaterThanOrEqual(2); expect(at).toBeLessThanOrEqual(4);
      expect(makeGrid(r, at).things.some(t => t.room === "unique")).toBe(true);
    }
  });
  it("Ledger marks go to the path walked", async () => {
    const { ledgerMarks } = await import("../src/game/meta");
    const r = newRun("mage", 72); startCrawl(r);
    r.hero.path = "arcanist"; r.hero.f.persist["layersWon"] = 3; r.heat = 5;
    expect(ledgerMarks(r)).toEqual(["l1", "l3"]);
    r.scene = { t: "over", won: true };
    expect(ledgerMarks(r)).toEqual(["l1", "l3", "win", "h4"]);
    const m = fresh(); recordRun(m, r);
    expect(m.ledger?.arcanist).toContain("win");
  });
});

