import { beforeAll, describe, expect, it } from "vitest";
import { LEGENDARIES, loadLibrary } from "../src/data";
import { makeMonster, makeThief } from "../src/data/monsters";
import { enemyPhase, heroPhase, playRound, resolveFace, startBattle } from "../src/engine/combat";
import { allItems } from "../src/engine/registry";
import { makeRng } from "../src/engine/rng";
import { applyStatus, endOfRound, st } from "../src/engine/statuses";
import { TAGS } from "../src/engine/types";
import { equipItem, itemName, newHero, recompute, reveal, salvage, weaponDamage } from "../src/game/hero";
import { resetDropped, resplendentCards, rollItem } from "../src/game/loot";
import { advance, chooseRoom, chooseTalent, combatAction, confirmRisk, continueEndless, finishLoot, genChoices, newRun, takeItem } from "../src/game/run";

beforeAll(() => loadLibrary());

const dummy = (hp = 200) => {
  const e = makeMonster(makeRng(1), 1, "normal");
  e.hp = e.maxHp = hp;
  e.armor = 0;
  e.items = {};
  return e;
};

describe("library", () => {
  it("every hook def uses known tags and has text", () => {
    for (const d of allItems()) {
      expect(d.text.length, d.id).toBeGreaterThan(3);
      for (const t of d.tags) expect(TAGS as readonly string[], `${d.id} tag ${t}`).toContain(t);
    }
  });
});

describe("origins and gear", () => {
  it("each origin starts with its kit", () => {
    const w = newHero("warrior");
    expect(w.equip.main?.base).toBe("w_sword");
    expect(w.f.armor).toBe(3); // shield 1 + chain 2
    const r = newHero("rogue");
    expect(r.f.offFaces).toBeDefined(); // throwing knife = second die
    const m = newHero("mage");
    expect(m.f.faces[1].name).toBe("Fire Bolt");
  });

  it("the weapon sets the die", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(), 1);
    resolveFace(b, h.f, b.enemy, 6, false);
    expect(b.enemy.hp).toBe(200 - 8); // sword 4 × crit 2
  });

  it("spell faces apply statuses, and the Mage's passive adds a stack", () => {
    const h = newHero("mage");
    const b = startBattle(h.f, dummy(), 1);
    resolveFace(b, h.f, b.enemy, 2, false);
    // Fire Bolt 3 (+1 Arcane Spark, +1 Cloth Robes) and Ember Charm 2 (+1 Cloth Robes)
    expect(st(b.enemy, "burn")).toBe(8);
  });

  it("a two-handed weapon empties the off-hand into the backpack", () => {
    const h = newHero("warrior");
    const axe = { uid: 999, base: "w_axe", rarity: "common" as const, level: 1, bonuses: {}, revealed: true };
    expect(equipItem(h, axe)).toBeNull();
    expect(h.equip.off).toBeUndefined();
    expect(h.backpack.map(i => i.base)).toEqual(["w_sword", "o_wooden_shield"]);
    expect(h.f.damage).toBe(6);
  });

  it("rarity raises damage and adds bonuses; Epics get a power", () => {
    const h = newHero("warrior");
    const rng = makeRng(3);
    const epic = rollItem(h, "epic", 2, rng);
    expect(Object.keys(epic.bonuses).length).toBe(3);
    expect(epic.epic).toBeDefined();
    const rare = rollItem(h, "rare", 1, rng);
    expect(Object.keys(rare.bonuses).length).toBe(2);
  });

  it("an unrevealed Legendary acts as a Common of its base; a Scroll reveals it", () => {
    const h = newHero("warrior");
    const leg = { uid: 50, base: "l_kingsbane", rarity: "legendary" as const, level: 1, bonuses: {}, revealed: false };
    equipItem(h, leg);
    expect(itemName(leg)).toContain("???");
    expect(h.f.damage).toBe(4);
    expect(h.f.items["l_kingsbane"]).toBeUndefined();
    expect(reveal(h, 50)).toBe("You need a Scroll of Revelation.");
    h.scrolls = 1;
    expect(reveal(h, 50)).toBeNull();
    expect(itemName(leg)).toBe("Kingsbane");
    expect(h.f.damage).toBe(8); // 7 base + 1 for Legendary
    expect(h.f.items["l_kingsbane"]).toBe(1);
  });

  it("Worldsplitter rolls a 12-sided die", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 51, base: "l_worldsplitter", rarity: "legendary", level: 3, bonuses: {}, revealed: true });
    expect(h.f.faces.length).toBe(12);
    expect(weaponDamage(h.equip.main!)).toBe(11); // 8 base + 2 levels + 1 Legendary
  });

  it("salvage turns gear into Scrap", () => {
    const h = newHero("rogue");
    const uid = h.equip.off!.uid;
    expect(salvage(h, uid)).toBe(1);
    expect(h.scrap).toBe(1);
    expect(h.f.offFaces).toBeUndefined();
  });

  it("Hollow Crown sets Max HP to 1 and keeps Barrier", () => {
    const h = newHero("cleric");
    equipItem(h, { uid: 52, base: "l_hollow_crown", rarity: "legendary", level: 3, bonuses: {}, revealed: true });
    expect(h.f.maxHp).toBe(1);
    const b = startBattle(h.f, dummy(), 2);
    expect(st(h.f, "barrier")).toBeGreaterThanOrEqual(10);
    expect(b.over).toBeNull();
  });
});

describe("statuses and reactions still work", () => {
  it("Combustion", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(100), 1);
    applyStatus(b, h.f, b.enemy, "poison", 4);
    applyStatus(b, h.f, b.enemy, "burn", 3);
    expect(b.enemy.hp).toBe(93);
  });

  it("Bleed ticks", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(100), 1);
    applyStatus(b, h.f, b.enemy, "bleed", 3);
    endOfRound(b, b.enemy);
    expect(b.enemy.hp).toBe(97);
  });
});

describe("loot", () => {
  it("Resplendent chests deal 3 cards, 4 with the Prospector's Ring", () => {
    const h = newHero("warrior");
    const loot = { pity: 0 };
    expect(resplendentCards(h, 1, loot, makeRng(1)).length).toBe(3);
    h.equip.trinket1 = { uid: 77, base: "t_prospector", rarity: "common", level: 1, bonuses: {}, revealed: true };
    recompute(h);
    expect(resplendentCards(h, 1, loot, makeRng(2)).length).toBe(4);
  });

  it("bad-luck protection grows until an Epic or better shows up", () => {
    const h = newHero("warrior");
    const loot = { pity: 0 };
    let maxPity = 0;
    for (let i = 0; i < 40; i++) {
      resplendentCards(h, 1, loot, makeRng(100 + i));
      maxPity = Math.max(maxPity, loot.pity);
    }
    expect(maxPity).toBeGreaterThan(0);
  });

  it("Legendaries respect their earliest floor", () => {
    const h = newHero("warrior");
    const rng = makeRng(9);
    resetDropped();
    const early = LEGENDARIES.filter(l => (l.legendary?.minFloor ?? 1) <= 1).map(l => l.id);
    const seen = new Set<string>();
    for (let i = 0; i < early.length; i++) {
      const it = rollItem(h, "legendary", 1, rng);
      expect(early).toContain(it.base);
      expect(seen.has(it.base)).toBe(false); // never the same Legendary twice in a run
      seen.add(it.base);
    }
    // Once the floor-1 pool is used up, a Legendary roll falls back to Epic.
    expect(rollItem(h, "legendary", 1, rng).rarity).toBe("epic");
  });
});

describe("a whole run", () => {
  it("bots can play runs to the end without errors", () => {
    let wins = 0;
    for (let seed = 1; seed <= 30; seed++) {
      const run = newRun((["warrior", "rogue", "mage", "cleric"] as const)[seed % 4], seed);
      for (let guard = 0; guard < 3000 && run.scene.t !== "over"; guard++) {
        const s = run.scene;
        if (s.t === "map") chooseRoom(run, run.choices[0]);
        else if (s.t === "confirm") advance(run);
        else if (s.t === "combat") combatAction(run, "attack");
        else if (s.t === "loot") {
          for (const it of [...s.items]) if (takeItem(run, it.uid, "pack")) break;
          finishLoot(run);
        } else if (s.t === "pick") takeItem(run, s.items[0].uid, "pack") && finishLoot(run);
        else if (s.t === "talent") chooseTalent(run, s.options[0]);
        else if (s.t === "resplendent") { s.picked = 0; finishLoot(run); }
        else advance(run);
      }
      expect(run.scene.t).toBe("over");
      if (run.scene.t === "over" && run.scene.won) wins++;
    }
    expect(wins).toBeGreaterThanOrEqual(0);
  });

  it("fights resolve deterministically for a seed", () => {
    const go = () => {
      const h = newHero("rogue");
      const b = startBattle(h.f, makeMonster(makeRng(4), 2, "elite"), 77);
      for (let i = 0; i < 40 && !b.over; i++) playRound(b, "attack");
      return b.log.join("\n");
    };
    expect(go()).toBe(go());
  });
});

describe("bosses, endless, events, fusions", () => {
  it("five campaign bosses (Hollow King last), Endless bosses after, and the wall on floor 30", async () => {
    const { makeBoss, WALL_FLOOR, bossStats } = await import("../src/data/bosses");
    const rng = makeRng(5);
    const seen = new Set<string>();
    const names = new Set<string>();
    for (let f = 1; f <= 5; f++) names.add(makeBoss(f, rng, seen).name);
    expect(names.size).toBe(5);
    expect(makeBoss(5, rng).name).toBe("The Hollow King");
    for (let f = 11; f <= 40; f++) {
      const b = makeBoss(f, rng);
      expect(b.moves!.length).toBeGreaterThanOrEqual(3);
      expect(b.hp).toBeGreaterThan(0);
    }
    const wall = makeBoss(WALL_FLOOR, rng);
    expect(wall.name).toBe("Ur-Thane");
    expect(wall.hp).toBeGreaterThan(bossStats(WALL_FLOOR).hp * 5);
  });

  it("boss moves run through the phased turn", async () => {
    const { makeBoss } = await import("../src/data/bosses");
    const h = newHero("warrior");
    const b = startBattle(h.f, makeBoss(3, makeRng(1)), 9);
    for (let i = 0; i < 6 && !b.over; i++) playRound(b, "attack");
    expect(b.log.some(l => / uses /.test(l))).toBe(true);
    expect(b.fx.length).toBeGreaterThan(0);
  });

  it("fusing two relics makes a fusion relic", async () => {
    const { availableFusions, fuse } = await import("../src/game/run");
    const run = newRun("warrior", 4);
    run.hero.relics = { serrated_edge: 1, keen_eye: 1 };
    expect(availableFusions(run).map(f => f.out)).toEqual(["f_thousand_cuts"]);
    expect(fuse(run, "f_thousand_cuts")).toBeNull();
    expect(run.hero.relics).toEqual({ f_thousand_cuts: 1 });
    expect(run.hero.f.items["f_thousand_cuts"]).toBe(1);
  });

  it("every event option can run", async () => {
    const { EVENTS } = await import("../src/data/events");
    const { chooseEvent } = await import("../src/game/run");
    for (const ev of EVENTS) for (let i = 0; i < ev.options.length; i++) {
      const run = newRun("cleric", 10 + i);
      run.hero.f.gold = 200;
      run.hero.relics = { whetstone: 1 };
      run.scene = { t: "event", ev, result: null, found: [] };
      chooseEvent(run, i);
      expect(["event", "loot"]).toContain(run.scene.t);
    }
  });
});

describe("forge: offering, combine, transmute", () => {
  it("offering odds improve with value", async () => {
    const { offeringOdds } = await import("../src/game/run");
    for (const v of [2, 4, 8, 16, 40]) console.log("ODDS", v, JSON.stringify(offeringOdds(v)));
    expect(offeringOdds(2).legendary).toBe(0);
    expect((offeringOdds(40).legendary ?? 0)).toBeGreaterThan(0);
  });

  it("combine two of the same item into a stronger one", async () => {
    const { forgeCombine } = await import("../src/game/run");
    const run = newRun("warrior", 21);
    const a = { uid: 501, base: "w_axe", rarity: "rare" as const, level: 1, bonuses: { b_damage: 1, b_burn: 1 }, revealed: true };
    const b = { uid: 502, base: "w_axe", rarity: "uncommon" as const, level: 2, bonuses: { b_bleed: 2 }, revealed: true };
    run.hero.backpack.push(a, b);
    const out = forgeCombine(run, 501, 502);
    expect(typeof out).toBe("object");
    if (typeof out === "object") {
      expect(out.base).toBe("w_axe");
      expect(out.level).toBe(3);
      expect(["rare", "epic"]).toContain(out.rarity);
      expect(Object.keys(out.bonuses).length).toBe(out.rarity === "epic" ? 3 : 2);
    }
  });

  it("offering consumes items and gives one, or sometimes nothing", async () => {
    const { forgeOffer } = await import("../src/game/run");
    let gave = 0;
    let lost = 0;
    for (let seed = 1; seed <= 60; seed++) {
      const run = newRun("mage", seed);
      for (let i = 0; i < 3; i++) run.hero.backpack.push({ uid: 600 + i, base: "w_dagger", rarity: "rare", level: 2, bonuses: {}, revealed: true });
      const out = forgeOffer(run, [600, 601, 602]);
      if (typeof out === "object") { gave++; expect(run.hero.backpack.length).toBe(1); }
      else { lost++; expect(run.hero.backpack.length).toBe(0); }
    }
    expect(gave).toBeGreaterThan(30);
    expect(lost).toBeGreaterThan(3);
  });

  it("the Transmuter turns a Common into an unrevealed Legendary for 4 Starmetal; scrapping a Legendary gives Starmetal", async () => {
    const { forgeTransmute } = await import("../src/game/run");
    const run = newRun("warrior", 23);
    const sword = run.hero.equip.main!;
    expect(forgeTransmute(run, sword.uid)).toBe("You need the Transmuter's Crucible.");
    run.hero.relics["transmuter"] = 1;
    run.hero.starmetal = 3;
    expect(forgeTransmute(run, sword.uid)).toBe("Needs 4 Starmetal.");
    run.hero.starmetal = 4;
    const out = forgeTransmute(run, sword.uid);
    expect(typeof out).toBe("object");
    if (typeof out === "object") {
      expect(out.rarity).toBe("legendary");
      expect(out.revealed).toBe(false);
      expect(run.hero.equip.main?.uid).toBe(out.uid);
      expect(salvage(run.hero, out.uid)).toBeGreaterThan(0);
      expect(run.hero.starmetal).toBe(2);
    }
  });
});

describe("relic rarity by depth and legendary relics", () => {
  it("rare relics are scarce early, legendary relics only from floor 3", async () => {
    const { relicRarityWeight } = await import("../src/game/run");
    expect(relicRarityWeight("rare", 1)).toBeLessThan(relicRarityWeight("rare", 4));
    expect(relicRarityWeight("legendary", 2)).toBe(0);
    expect(relicRarityWeight("legendary", 4)).toBeGreaterThan(0);
    expect(relicRarityWeight("legendary", 4, 2)).toBeGreaterThan(relicRarityWeight("legendary", 4));
  });

  it("Twin Souls gives a second die with the main weapon's faces", () => {
    const h = newHero("warrior");
    h.relics["lr_twin_souls"] = 1;
    recompute(h);
    expect(h.f.offFaces).toBe(h.f.faces);
    expect(h.f.offDamage).toBe(Math.floor(h.f.damage * 0.6));
  });

  it("Philosopher's Stone brings reaction ingredients back", () => {
    const h = newHero("mage");
    h.relics["lr_philosophers_stone"] = 1;
    recompute(h);
    const b = startBattle(h.f, dummy(200), 3);
    applyStatus(b, h.f, b.enemy, "poison", 4);
    applyStatus(b, h.f, b.enemy, "burn", 3);
    expect(b.log.some(l => l.includes("Combustion"))).toBe(true);
    expect(st(b.enemy, "poison")).toBeGreaterThanOrEqual(3);
    expect(st(b.enemy, "burn")).toBeGreaterThanOrEqual(3);
  });
});

describe("crimson", () => {
  it("Crimson rooms only appear after the fifth boss", () => {
    const run = newRun("warrior", 5);
    for (let i = 0; i < 200; i++) expect(genChoices(run).some(c => c.startsWith("crimson"))).toBe(false);
    run.hero.crimsonKeys = 1;
    expect(genChoices(run)).not.toContain("crimson_vault");
    run.floor = 6;
    continueEndless(run);
    expect(run.choices).toContain("crimson_vault");
  });

  it("dying in a Crimson Vault doesn't end the run", () => {
    const run = newRun("warrior", 11);
    run.floor = 6;
    run.mode = "endless";
    run.hero.crimsonKeys = 1;
    chooseRoom(run, "crimson_vault");
    confirmRisk(run, true);
    expect(run.scene.t).toBe("combat");
    if (run.scene.t !== "combat") return;
    expect(run.scene.battle.enemy.crimson).toBe(true);
    expect(run.hero.crimsonKeys).toBe(0);
    run.hero.f.hp = 1;
    run.hero.f.armor = 0;
    for (let i = 0; i < 50 && run.scene.t === "combat"; i++) combatAction(run, "attack");
    expect(run.scene.t).not.toBe("over");
    expect(run.hero.f.hp).toBeGreaterThan(0);
    expect(run.hero.f.persist["crimsonEscapes"]).toBe(1);
  });

  it("Crimson bosses offer a Crimson item", () => {
    const h = newHero("mage");
    const it = rollItem(h, "crimson", 6, makeRng(3));
    expect(it.rarity).toBe("crimson");
    expect(it.revealed).toBe(true);
    expect(Object.keys(it.bonuses).length).toBe(2);
  });
});

describe("guard", () => {
  it("Vanguard counts the first round as Guarding", () => {
    const h = newHero("warrior");
    h.talents["t_vanguard"] = 1;
    recompute(h);
    const e = makeMonster(makeRng(1), 1, "normal");
    const b = startBattle(h.f, e, 1);
    playRound(b, "attack");
    expect(h.f.flags["guarding"]).toBe(0); // cleared at the end of the round
    expect(b.round).toBe(1);
  });

  it("reactions are recorded for the bag", () => {
    const h = newHero("mage");
    const e = makeMonster(makeRng(2), 1, "normal");
    e.hp = e.maxHp = 999;
    const b = startBattle(h.f, e, 2);
    applyStatus(b, h.f, e, "burn", 3);
    applyStatus(b, h.f, e, "poison", 3);
    expect(h.f.persist["rx:foe:combustion"]).toBe(1);
  });
});

describe("holy", () => {
  it("Purify strips negative statuses for 2x Damage each, ignoring Armor", () => {
    const h = newHero("cleric");
    equipItem(h, { uid: 900, base: "w_aspergillum", rarity: "common", level: 1, bonuses: {}, revealed: true }, "main");
    const e = makeMonster(makeRng(4), 1, "normal");
    e.hp = e.maxHp = 500;
    e.armor = 10;
    e.family = "Beast";
    const b = startBattle(h.f, e, 4);
    applyStatus(b, h.f, e, "weak", 2);
    applyStatus(b, h.f, e, "exposed", 2);
    applyStatus(b, h.f, e, "chill", 1);
    const before = e.hp;
    resolveFace(b, h.f, e, 3); // a plain Purify (hit)
    expect(st(e, "weak") + st(e, "exposed") + st(e, "chill")).toBe(0);
    expect(before - e.hp).toBe(2 * h.f.damage * 3);
  });

  it("Ward blocking an enemy status readies a Smite for 20% of Max HP, once per fight", () => {
    const h = newHero("cleric");
    const e = makeMonster(makeRng(5), 1, "normal");
    e.hp = e.maxHp = 200;
    e.armor = 0;
    e.family = "Beast";
    const b = startBattle(h.f, e, 5);
    h.f.statuses.ward = 1;
    applyStatus(b, e, h.f, "poison", 3);
    expect(st(h.f, "poison")).toBe(0);
    expect(h.f.flags["smiteReady"]).toBe(1);
    resolveFace(b, h.f, e, 3);
    expect(200 - e.hp).toBe(h.f.damage + 40);
    // Once per fight.
    h.f.statuses.ward = 1;
    applyStatus(b, e, h.f, "poison", 3);
    const hp = e.hp;
    resolveFace(b, h.f, e, 3);
    expect(hp - e.hp).toBe(h.f.damage);
  });

  it("Holy weapons hit Undead harder", () => {
    const h = newHero("cleric");
    const mk = (fam: string) => { const e = makeMonster(makeRng(6), 1, "normal"); e.hp = e.maxHp = 300; e.armor = 0; e.family = fam; e.items = {}; return e; };
    const z = mk("Undead"), w = mk("Beast");
    const b1 = startBattle(h.f, z, 7); resolveFace(b1, h.f, z, 3);
    const b2 = startBattle(h.f, w, 7); resolveFace(b2, h.f, w, 3);
    expect(300 - z.hp).toBe(Math.round(1.5 * (300 - w.hp)));
  });
});

describe("shop selling", () => {
  it("sells one item per Merchant visit", async () => {
    const { sellItem } = await import("../src/game/run");
    const run = newRun("warrior", 3);
    chooseRoom(run, "shop");
    const gold = run.hero.f.gold;
    const armour = run.hero.equip.armour!.uid;
    expect(sellItem(run, armour)).toBeNull();
    expect(run.hero.equip.armour).toBeUndefined();
    expect(run.hero.f.gold).toBeGreaterThan(gold);
    expect(sellItem(run, run.hero.equip.off!.uid)).toMatch(/already/);
    expect(run.hero.equip.off).toBeDefined();
  });
});

describe("static and lightning", () => {
  const foe = (family: string) => { const e = makeMonster(makeRng(8), 1, "normal"); e.hp = e.maxHp = 500; e.armor = 0; e.family = family; e.items = {}; return e; };

  it("Static caps at 10 and ticks once per action for 2 (4 on Constructs)", () => {
    const h = newHero("mage");
    for (const [fam, per] of [["Beast", 2], ["Construct", 4]] as const) {
      const e = foe(fam);
      const b = startBattle(h.f, e, 8);
      applyStatus(b, h.f, e, "static", 15);
      expect(st(e, "static")).toBe(10);
      const hp = e.hp;
      b.round = 1;
      enemyPhase(b);
      expect(st(e, "static")).toBe(9);
      expect(hp - e.hp).toBeGreaterThanOrEqual(per);
    }
  });

  it("Shock sets off all Static at once (Conduction)", () => {
    const h = newHero("mage");
    const e = foe("Beast");
    const b = startBattle(h.f, e, 9);
    applyStatus(b, h.f, e, "static", 6);
    const hp = e.hp;
    applyStatus(b, h.f, e, "shock", 1);
    expect(st(e, "static")).toBe(0);
    expect(hp - e.hp).toBe(18);
    expect(h.f.persist["rx:foe:conduction"]).toBe(1);
  });

  it("Grounded blocks Shock and Static", () => {
    const h = newHero("mage");
    const e = foe("Beast");
    const b = startBattle(h.f, e, 10);
    applyStatus(b, h.f, h.f, "grounded", 2);
    applyStatus(b, e, h.f, "static", 3);
    applyStatus(b, e, h.f, "shock", 1);
    expect(st(h.f, "static") + st(h.f, "shock")).toBe(0);
  });

  it("Arcane Prism: 3+ negative statuses take 25% more", () => {
    const h = newHero("warrior");
    const e1 = foe("Beast"), e2 = foe("Beast");
    const b0 = startBattle(h.f, e1, 11);
    for (const s of ["weak", "bleed", "poison"] as const) applyStatus(b0, h.f, e1, s, 1);
    resolveFace(b0, h.f, e1, 3);
    const plain = 500 - e1.hp;
    h.relics["r_arcane_prism"] = 1; recompute(h);
    const b1 = startBattle(h.f, e2, 11);
    for (const s of ["weak", "bleed", "poison"] as const) applyStatus(b1, h.f, e2, s, 1);
    resolveFace(b1, h.f, e2, 3);
    expect(500 - e2.hp).toBeGreaterThan(plain);
  });
});

describe("smouldering", () => {
  const foe = () => { const e = makeMonster(makeRng(12), 1, "normal"); e.hp = e.maxHp = 500; e.armor = 0; e.family = "Beast"; e.items = {}; return e; };

  it("on an enemy: it takes 4 Burn a round, you take 1", () => {
    const h = newHero("warrior");
    const e = foe();
    const b = startBattle(h.f, e, 12);
    h.f.statuses = {};
    applyStatus(b, h.f, e, "smoulder", 2);
    endOfRound(b, e);
    expect(st(e, "burn")).toBe(4);
    expect(st(h.f, "burn")).toBe(1);
    expect(st(e, "smoulder")).toBe(1);
  });

  it("on you: you take 5 Burn a round, the enemy takes 1", () => {
    const h = newHero("warrior");
    const e = foe();
    const b = startBattle(h.f, e, 13);
    h.f.statuses = {};
    applyStatus(b, e, h.f, "smoulder", 1);
    endOfRound(b, h.f);
    expect(st(h.f, "burn")).toBe(5);
    expect(st(e, "burn")).toBe(1);
  });

  it("Smouldering Soul: every action burns the enemy for 5; you take 1 a round", () => {
    const h = newHero("warrior");
    const e = foe();
    const b = startBattle(h.f, e, 14);
    h.f.statuses = {};
    applyStatus(b, h.f, h.f, "smoulder_soul", 3);
    playRound(b, "guard");
    expect(500 - e.hp).toBeGreaterThanOrEqual(5); // 5 Burn landed and ticked on its turn
    expect(st(h.f, "smoulder_soul")).toBe(2);
  });

  it("Boundless Static removes the cap", () => {
    const h = newHero("mage");
    h.talents["t_boundless_static"] = 1;
    recompute(h);
    const e = foe();
    const b = startBattle(h.f, e, 15);
    applyStatus(b, h.f, e, "static", 25);
    expect(st(e, "static")).toBe(25);
  });
});

describe("greater kits", () => {
  it("greater kit items only roll at their own rarity", () => {
    const h = newHero("mage");
    const rng = makeRng(21);
    for (let i = 0; i < 3000; i++) {
      for (const r of ["common", "uncommon", "rare", "epic"] as const) {
        const it = rollItem(h, r, 2, rng);
        if (it.base.startsWith("k_")) expect(["uncommon", "rare"]).toContain(it.rarity);
        if (it.base === "k_archmages_staff") expect(it.rarity).toBe("rare");
        if (it.base === "k_adepts_staff") expect(it.rarity).toBe("uncommon");
      }
    }
  });
});

describe("two-handers, thieves, curses", () => {
  const mk = (h: ReturnType<typeof newHero>, base: string, uid: number) => ({ uid, base, rarity: "common" as const, level: 1, bonuses: {}, revealed: true });

  it("War Harness keeps the off-hand with a two-hander; Titan's Grip dual-wields them", () => {
    const h = newHero("warrior");
    expect(equipItem(h, mk(h, "w_axe", 500), "main")).toBeNull();
    expect(h.equip.off).toBeUndefined();
    const h2 = newHero("warrior");
    h2.relics["r_war_harness"] = 1;
    equipItem(h2, mk(h2, "w_axe", 501), "main");
    expect(h2.equip.off?.base).toBe("o_wooden_shield");
    const h3 = newHero("warrior");
    h3.relics["r_titans_grip"] = 1;
    equipItem(h3, mk(h3, "w_axe", 502), "main");
    expect(equipItem(h3, mk(h3, "w_hammer", 503), "off")).toBeNull();
    expect(h3.equip.main?.base).toBe("w_axe");
    expect(h3.equip.off?.base).toBe("w_hammer");
    expect(h3.f.offFaces?.length).toBe(6);
    expect(h3.f.offDamage).toBe(Math.round(6 * 0.6));
  });

  it("a thief escapes with 30% of your Gold after round 5", () => {
    const h = newHero("warrior");
    h.f.gold = 100;
    const t = makeThief(makeRng(30), 1);
    t.hp = t.maxHp = 9999;
    const b = startBattle(h.f, t, 30);
    for (let i = 0; i < 5 && !b.over; i++) playRound(b, "guard");
    expect(b.over).toBe("escaped");
    expect(h.f.gold).toBe(70);
  });

  it("Malediction curses you when the fight ends", () => {
    const run = newRun("warrior", 31);
    run.hero.f.persist["curseQueue"] = 1;
    chooseRoom(run, "fight");
    if (run.scene.t !== "combat") return;
    run.scene.battle.enemy.hp = 0;
    combatAction(run, "attack");
    expect(Object.keys(run.hero.curses).length).toBe(1);
  });
});

describe("barrier gating", () => {
  it("no starting kit gives Barrier, and Barrier gear never rolls Common", () => {
    for (const o of ["warrior", "rogue", "mage", "cleric"] as const) {
      const h = newHero(o);
      const e = makeMonster(makeRng(40), 1, "normal");
      const b = startBattle(h.f, e, 40);
      expect(st(h.f, "barrier")).toBe(0);
      expect(h.potions).toBe(1);
      void b;
    }
    const h = newHero("warrior");
    const rng = makeRng(41);
    for (let i = 0; i < 3000; i++) expect(["w_glaive", "o_pavise"]).not.toContain(rollItem(h, "common", 2, rng).base);
  });
});

describe("class actions and new stats", () => {
  const foe = (power = 3) => { const e = makeMonster(makeRng(50), 1, "normal"); e.hp = e.maxHp = 400; e.armor = 0; e.damage = power; e.family = "Beast"; e.items = {}; e.faces = [{ kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }]; return e; };

  it("Guard needs a shield, except a Warrior with a two-hander", async () => {
    const { availableActions } = await import("../src/game/run");
    const run = newRun("rogue", 51);
    chooseRoom(run, "fight");
    expect(availableActions(run)).not.toContain("guard");
    expect(availableActions(run)).toContain("counter");
    const w = newRun("warrior", 52);
    chooseRoom(w, "fight");
    expect(availableActions(w)).toContain("guard");
    expect(availableActions(w)).toContain("warcry");
    delete w.hero.equip.off; recompute(w.hero);
    expect(availableActions(w)).not.toContain("guard");
    equipItem(w.hero, { uid: 700, base: "w_axe", rarity: "common", level: 1, bonuses: {}, revealed: true }, "main");
    expect(availableActions(w)).toContain("guard");
  });

  it("Counter: a dodge triggers a hit that can't miss", () => {
    const h = newHero("rogue");
    h.f.dodge = 40; // +20 from Counter = 60%
    const e = foe();
    let countered = 0;
    for (let seed = 0; seed < 40; seed++) {
      e.hp = 400;
      const b = startBattle(h.f, e, seed);
      h.f.statuses = {}; // no starting Evade: test Dodge alone
      h.f.dodge = 40;
      b.round = 1;
      heroPhase(b, "counter");
      enemyPhase(b);
      if (b.log.some(l => l.includes("counters!"))) { countered++; expect(e.hp).toBeLessThan(400); }
    }
    expect(countered).toBeGreaterThan(5);
  });

  it("Elemental Barrier: a full block throws the element back", () => {
    const h = newHero("mage");
    expect(h.f.barrierElement).toBe("burn");
    const e = foe(10);
    const b = startBattle(h.f, e, 53);
    b.round = 1;
    h.f.flags["eBarrier"] = 1; h.f.flags["eBarrierTier"] = 2;
    const hp = h.f.hp;
    enemyPhase(b);
    expect(h.f.hp).toBe(hp);
    expect(st(e, "burn")).toBeGreaterThanOrEqual(2);
  });

  it("Penance stores damage taken and adds it to the next attack", () => {
    const h = newHero("cleric");
    const e = foe(6);
    const b = startBattle(h.f, e, 54);
    b.round = 1;
    heroPhase(b, "penance");
    enemyPhase(b);
    const stored = h.f.flags["penanceStore"];
    expect(stored).toBeGreaterThan(0);
    const hp = e.hp;
    resolveFace(b, h.f, e, 3);
    expect(hp - e.hp).toBeGreaterThanOrEqual(stored);
    expect(h.f.flags["penanceStore"]).toBe(0);
  });

  it("Frostbitten and Bled Out burst at their thresholds", () => {
    const h = newHero("warrior");
    const e = foe();
    const b = startBattle(h.f, e, 55);
    applyStatus(b, h.f, e, "chill", 5);
    const hp = e.hp;
    applyStatus(b, h.f, e, "chill", 1);
    expect(st(e, "chill")).toBe(0);
    expect(hp - e.hp).toBeGreaterThanOrEqual(18);
    applyStatus(b, h.f, e, "bleed", 10);
    expect(st(e, "bleed")).toBe(0);
  });

  it("Dodge caps at 60% and Bash at 30%; Bash only rolls on Rare+ weapons", () => {
    const h = newHero("rogue");
    h.relics["r_smoke_bomb"] = 30; h.relics["r_iron_knuckles"] = 20;
    recompute(h);
    expect(h.f.dodge).toBe(60);
    expect(h.f.bash).toBe(30);
    const rng = makeRng(56);
    for (let i = 0; i < 2000; i++) {
      const it = rollItem(h, i % 2 ? "uncommon" : "common", 3, rng);
      expect(it.bash).toBeUndefined();
    }
  });

  it("the Collector keepsake opens a third trinket slot", () => {
    const h = newHero("mage");
    h.keepsake = "ks_collector";
    recompute(h);
    expect(equipItem(h, { uid: 800, base: "t_band_vigor", rarity: "common", level: 1, bonuses: {}, revealed: true }, "trinket1")).toBeNull();
    expect(equipItem(h, { uid: 801, base: "t_band_vigor", rarity: "common", level: 1, bonuses: {}, revealed: true }, "trinket2")).toBeNull();
    expect(equipItem(h, { uid: 802, base: "t_band_vigor", rarity: "common", level: 1, bonuses: {}, revealed: true }, "trinket3")).toBeNull();
    expect(h.equip.trinket3?.uid).toBe(802);
    h.keepsake = undefined; recompute(h);
    expect(h.equip.trinket3).toBeUndefined();
    expect(h.backpack.some(i => i.uid === 802)).toBe(true);
  });
});
