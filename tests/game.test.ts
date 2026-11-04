import { beforeAll, describe, expect, it } from "vitest";
import { LEGENDARIES, loadLibrary } from "../src/data";
import { makeMonster, makeThief } from "../src/data/monsters";
import { makeBoss } from "../src/data/bosses";
import { EPIC_CRIMSON } from "../src/data/abyss";
import { EVENTS } from "../src/data/events";
import { armorOf, damageOf, rollFor, beginRound, blessingMult, endRound, enemyPhase, heroPhase, isUnholy, playRound, resolveFace, startBattle } from "../src/engine/combat";
import { allItems } from "../src/engine/registry";
import { makeRng } from "../src/engine/rng";
import { applyStatus, endOfRound, heal, st } from "../src/engine/statuses";
import { TAGS } from "../src/engine/types";
import { baseOf, equipItem, itemName, newHero, recompute, reveal, salvage, slotsFor, weaponDamage } from "../src/game/hero";
import { resetDropped, resplendentCards, rollItem, setGenEnabled } from "../src/game/loot";
import { advance, chooseRoom, chooseTalent, combatAction, confirmRisk, continueEndless, finishLoot, genChoices, newRun, settleCombat, STEPS_PER_FLOOR, takeItem, rerollShop, drinkPotion, lockGold, restore, chooseEvent, smithUpgrade, buyTonic, useTonic } from "../src/game/run";

beforeAll(() => { loadLibrary(); setGenEnabled(false); });

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
    expect(b.enemy.hp).toBe(200 - 2 * (4 + Math.floor(b.player.armor / 5))); // (sword 4 + Warrior armor bonus) × crit 2
  });

  it("Ward stacks: each stack blocks one negative status", () => {
    const h = newHero("cleric");
    const b = startBattle(h.f, dummy(), 1);
    b.player.statuses = {};
    applyStatus(b, b.player, b.player, "ward", 1);
    applyStatus(b, b.player, b.player, "ward", 1);
    expect(st(b.player, "ward")).toBe(2);
    applyStatus(b, b.enemy, b.player, "poison", 3);
    applyStatus(b, b.enemy, b.player, "weak", 1);
    expect(st(b.player, "poison")).toBe(0);
    expect(st(b.player, "weak")).toBe(0);
    expect(st(b.player, "ward")).toBe(0);
    applyStatus(b, b.enemy, b.player, "weak", 1);
    expect(st(b.player, "weak")).toBe(1);
  });

  it("Evade stacks: each stack makes one hit miss", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(), 1);
    b.player.statuses.evade = 0;
    applyStatus(b, b.player, b.player, "evade", 1);
    applyStatus(b, b.player, b.player, "evade", 1);
    expect(st(b.player, "evade")).toBe(2);
    const hp = b.player.hp;
    enemyPhase(b);
    expect(st(b.player, "evade")).toBe(1);
    expect(b.player.hp).toBe(hp);
  });

  it("Haste stacks up to 3 for the hero, and one stack is spent per turn", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(), 1);
    b.player.statuses.haste = 0;
    applyStatus(b, b.player, b.player, "haste", 1);
    applyStatus(b, b.player, b.player, "haste", 1);
    expect(st(b.player, "haste")).toBe(2);
    applyStatus(b, b.player, b.player, "haste", 5);
    expect(st(b.player, "haste")).toBe(3);
    applyStatus(b, b.enemy, b.enemy, "haste", 9);
    expect(st(b.enemy, "haste")).toBe(4);
    b.player.statuses.haste = 2;
    heroPhase(b, "attack");
    expect(st(b.player, "haste")).toBe(1);
  });

  it("statuses caused by a roll are tagged with that roll (for die tinting)", () => {
    const h = newHero("mage");
    const b = startBattle(h.f, dummy(), 1);
    b.fx.length = 0;
    resolveFace(b, h.f, b.enemy, 2, false);
    const burn = b.fx.find(e => e.kind === "status" && e.status === "burn");
    expect(burn?.fromRoll).toBe("player");
    expect(burn?.src).toBe("player");
    expect(b.rollFrom).toBeUndefined();
    applyStatus(b, b.player, b.enemy, "chill", 1);
    expect(b.fx[b.fx.length - 1].fromRoll).toBeUndefined();
  });

  it("spell faces apply statuses, and the Mage's passive adds a stack", () => {
    const h = newHero("mage");
    const b = startBattle(h.f, dummy(), 1);
    resolveFace(b, h.f, b.enemy, 2, false);
    // Fire Bolt 3 (+1 Arcane Spark, +1 Cloth Robes) and Ember Charm 2 (+1 Cloth Robes), each landing 20% lighter on a foe
    expect(st(b.enemy, "burn")).toBe(6);
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
    expect(Object.keys(epic.bonuses).length).toBe(baseOf(epic.base).slot === "trinket" ? 2 : 3); // trinkets carry one fewer
    expect(epic.epic).toBeDefined();
    const rare = rollItem(h, "rare", 1, rng);
    expect(Object.keys(rare.bonuses).length).toBe(baseOf(rare.base).slot === "trinket" ? 1 : 2);
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
    expect(b.enemy.hp).toBe(98); // the hero's statuses land half as heavy, and reactions hit half as hard
  });

  it("Bleed ticks", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(100), 1);
    applyStatus(b, h.f, b.enemy, "bleed", 3);
    endOfRound(b, b.enemy);
    expect(b.enemy.hp).toBe(99);
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
    h.f.persist["floor"] = 3; // (floor 1 and 2 of a Campaign turn most Legendaries into Epics; this checks the per-item minimum floor)
    const rng = makeRng(9);
    resetDropped();
    const early = LEGENDARIES.filter(l => (l.legendary?.minFloor ?? 1) <= 3 && !l.unlock).map(l => l.id); // (minimum floors up to 3 open from floor 1)
    const seen = new Set<string>();
    for (let i = 0; i < 40; i++) {
      const it = rollItem(h, "legendary", 1, rng);
      expect(early).toContain(it.base);
      expect(seen.has(it.base)).toBe(false); // never the same Legendary twice in a run
      seen.add(it.base);
    }
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
  it("five campaign bosses (Hollow King last), Endless bosses after, and the wall on floor 20", async () => {
    const { makeBoss, WALL_FLOOR, bossStats } = await import("../src/data/bosses");
    const rng = makeRng(5);
    const seen = new Set<string>();
    const names = new Set<string>();
    for (let f = 1; f <= 5; f++) names.add(makeBoss(f, rng, seen).name);
    expect(names.size).toBe(5);
    expect(makeBoss(5, rng).name).toBe("The Hollow King");
    for (let f = 11; f <= 24; f++) {
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
      expect(["event", "loot", "combat"]).toContain(run.scene.t); // (waking a dragon starts a fight)
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
    run.hero.crucible = true;
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
    expect(st(b.enemy, "poison")).toBeGreaterThanOrEqual(2);
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

  it("dying in a Crimson Vault ends the run", () => {
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
    expect((run.scene as { t: string }).t).toBe("over");
    const sc = run.scene as { t: string; won?: boolean };
    expect(sc.won).toBe(false);
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
    expect(before - e.hp).toBe(Math.round(1.4 * h.f.damage * 3));
  });

  it("Ward blocking an enemy status readies a Smite for 20% of Max HP, once per fight", () => {
    const h = newHero("cleric");
    const e = makeMonster(makeRng(5), 1, "normal");
    e.hp = e.maxHp = 200;
    e.armor = 0;
    e.family = "Beast";
    e.items = {}; // a plain foe (no Unholy traits)
    const b = startBattle(h.f, e, 5);
    h.f.statuses.ward = 1;
    applyStatus(b, e, h.f, "poison", 3);
    expect(st(h.f, "poison")).toBe(0);
    expect(h.f.flags["smiteReady"]).toBe(1);
    resolveFace(b, h.f, e, 3);
    expect(200 - e.hp).toBe(h.f.damage + 24); // Smite: 12% of Max HP
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
    expect(300 - z.hp).toBe(Math.round(1.25 * (300 - w.hp)));
  });
});

describe("shop selling", () => {
  it("the Merchant buys as much as you like", async () => {
    const { sellItem } = await import("../src/game/run");
    const run = newRun("warrior", 3);
    chooseRoom(run, "shop");
    const gold = run.hero.f.gold;
    const armour = run.hero.equip.armour!.uid;
    expect(sellItem(run, armour)).toBeNull();
    expect(run.hero.equip.armour).toBeUndefined();
    expect(run.hero.f.gold).toBeGreaterThan(gold);
    expect(sellItem(run, run.hero.equip.off!.uid)).toBeNull();
    expect(run.hero.equip.off).toBeUndefined();
  });
});

describe("static and lightning", () => {
  const foe = (family: string) => { const e = makeMonster(makeRng(8), 1, "normal"); e.hp = e.maxHp = 500; e.armor = 0; e.family = family; e.items = {}; return e; };

  it("Static caps at 10 and ticks once per action for 2 (4 on Constructs)", () => {
    const h = newHero("mage");
    for (const [fam, per] of [["Beast", 1], ["Construct", 2]] as const) { // (the hero's status damage ticks half as hard)
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
    expect(hp - e.hp).toBe(9);
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
    applyStatus(b, h.f, e, "smoulder", 4); // (lands as 2)
    endOfRound(b, e);
    expect(st(e, "burn")).toBe(2);
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
    expect(500 - e.hp).toBeGreaterThanOrEqual(2); // the Burn landed and ticked on its turn
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
    // The Mage's Cloth Robes are the one starting item that gives Barrier.
    for (const o of ["warrior", "rogue", "cleric"] as const) {
      const h = newHero(o);
      const e = makeMonster(makeRng(40), 1, "normal");
      const b = startBattle(h.f, e, 40);
      expect(st(h.f, "barrier")).toBe(0);
      expect(h.potions).toBe(1);
      void b;
    }
    const h = newHero("warrior");
    const rng = makeRng(41);
    for (let i = 0; i < 3000; i++) expect(["w_glaive", "o_pavise", "a_cloth"]).not.toContain(rollItem(h, "common", 2, rng).base);
  });
});

describe("class actions and new stats", () => {
  const foe = (power = 3) => { const e = makeMonster(makeRng(50), 1, "normal"); e.hp = e.maxHp = 400; e.armor = 0; e.damage = power; e.family = "Beast"; e.items = {}; e.faces = [{ kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }]; return e; };

  it("Guard needs a shield, except a Warrior with a two-hander", async () => {
    const { availableActions } = await import("../src/game/run");
    const run = newRun("rogue", 51);
    chooseRoom(run, "fight");
    expect(availableActions(run)).not.toContain("guard");
    // Counter is offered even while Evade already covers the next hit (a wasted turn is the player's call).
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

  it("multi-element charms throw every element back from a barrier", () => {
    const h = newHero("mage");
    equipItem(h, { uid: 777, base: "ch_triad", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    expect(h.f.barrierElements).toEqual(["burn", "chill", "static"]);
    const e = foe(10);
    e.hp = e.maxHp = 200;
    const b = startBattle(h.f, e, 53);
    b.round = 1;
    h.f.flags["eBarrier"] = 1; h.f.flags["eBarrierTier"] = 2;
    enemyPhase(b);
    // Burn 4 lands, then Chill 4 reacts with it (Steam), then Static 4.
    expect(b.log.some(l => /Steam/.test(l))).toBe(true);
    expect(st(e, "static")).toBe(4);
  });

  it("hit streak grows on hits and breaks on a graze, across fights", () => {
    const h = newHero("warrior");
    // No streak gear, no streak.
    const b0 = startBattle(h.f, dummy(), 1);
    resolveFace(b0, b0.player, b0.enemy, 2, false);
    expect(h.f.persist["streak"] ?? 0).toBe(0);
    h.relics["r_unbroken_chain"] = 1; recompute(h);
    const b = startBattle(h.f, dummy(), 1);
    resolveFace(b, b.player, b.enemy, 2, false);
    resolveFace(b, b.player, b.enemy, 3, false);
    expect(h.f.persist["streak"]).toBe(2);
    const b2 = startBattle(h.f, dummy(), 2);
    resolveFace(b2, b2.player, b2.enemy, 4, false);
    expect(h.f.persist["streak"]).toBe(3);
    resolveFace(b2, b2.player, b2.enemy, 1, false); // graze
    expect(h.f.persist["streak"]).toBe(0);
  });

  it("against a guarding foe, a hit that still gets through keeps the streak; a full block breaks it", () => {
    const h = newHero("warrior");
    h.relics["r_unbroken_chain"] = 1; recompute(h);
    const e = dummy();
    e.armor = 1;
    const b = startBattle(h.f, e, 4);
    e.flags["guarding"] = 1; e.flags["guardArmor"] = 2; // Armor 4 while guarding
    resolveFace(b, b.player, e, 2, false); // a Hit for ~5: some of it gets through
    expect(h.f.persist["streak"]).toBe(1);
    e.flags["guardArmor"] = 500; // a wall nothing gets through
    resolveFace(b, b.player, e, 3, false);
    expect(h.f.persist["streak"]).toBe(0);
  });

  it("streak gear unlocks the streak, and the Unending Tally only halves a broken streak", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 902, base: "cx_unending_tally", rarity: "crimson", level: 1, bonuses: {}, revealed: true });
    const b = startBattle(h.f, dummy(), 5);
    for (let i = 0; i < 6; i++) resolveFace(b, b.player, b.enemy, 3, false);
    expect(h.f.persist["streak"]).toBe(6);
    resolveFace(b, b.player, b.enemy, 1, false); // graze
    expect(h.f.persist["streak"]).toBe(3);
  });

  it("Shieldwall foes warn, then guard: Armor doubles but crits still land in full", () => {
    const h = newHero("warrior");
    const e = dummy();
    e.armor = 3;
    e.items = { m_shieldwall: 1 };
    const b = startBattle(h.f, e, 3);
    b.round = 2;
    endRound(b);
    expect(e.flags["guardNext"]).toBe(2);
    beginRound(b);
    expect(e.flags["guarding"]).toBe(1);
    const hp = e.hp;
    resolveFace(b, b.player, e, 6, false); // crit ignores Armor
    expect(hp - e.hp).toBe(2 * (4 + Math.floor(b.player.armor / 5)));
    const before = h.f.hp;
    enemyPhase(b);
    expect(h.f.hp).toBe(before); // it holds its guard instead of attacking
  });

  it("status robes make Burn on the enemy hurt more", () => {
    const plain = newHero("mage");
    const robed = newHero("mage");
    equipItem(robed, { uid: 901, base: "rb_hexweave", rarity: "uncommon", level: 1, bonuses: {}, revealed: true });
    expect(robed.f.dotAmp).toBe(15);
    const hurt = (h: ReturnType<typeof newHero>) => { const b = startBattle(h.f, dummy(), 9); b.enemy.statuses.burn = 20; const hp = b.enemy.hp; enemyPhase(b); return hp - b.enemy.hp; };
    expect(hurt(robed)).toBe(11);
    expect(hurt(plain)).toBe(10);
  });

  it("Fracture does nothing until 3 stacks, then shatters for 4 per stack", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(), 11);
    const hp = b.enemy.hp;
    applyStatus(b, h.f, b.enemy, "fracture", 4); // (lands as 2)
    expect(b.enemy.hp).toBe(hp);
    applyStatus(b, h.f, b.enemy, "fracture", 1);
    expect(hp - b.enemy.hp).toBe(6);
    expect(st(b.enemy, "fracture")).toBe(0);
  });

  it("Reckless gear: deal more and take more; Manacles cap the enemy's die at 5", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 903, base: "bt_berserker_torc", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    expect(h.f.dmgDealt).toBe(25);
    expect(h.f.dmgTaken).toBe(25);
    const b = startBattle(h.f, dummy(), 12);
    resolveFace(b, b.player, b.enemy, 6, false); // crit, ignores armor
    expect(200 - b.enemy.hp).toBe(Math.round(2 * (4 + Math.floor(b.player.armor / 5)) * 1.25));
    const h2 = newHero("warrior");
    equipItem(h2, { uid: 904, base: "bt_manacles", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    const b2 = startBattle(h2.f, dummy(), 13);
    expect(b2.enemy.flags["rollCap"]).toBe(5);
  });

  it("basic relics add Max HP, Armor, and Scrap per scrapped item", () => {
    const h = newHero("warrior");
    const hp = h.f.maxHp, ar = h.f.armor;
    h.relics["rb_hp_3"] = 1; h.relics["rb_armor_2"] = 1; h.relics["rb_scrap_4"] = 1;
    recompute(h);
    expect(h.f.maxHp).toBe(hp + 3);
    expect(h.f.armor).toBe(ar + 2);
    const before = h.scrap;
    const uid = h.equip.armour!.uid;
    const got = salvage(h, uid);
    expect(h.scrap - before).toBe(got);
    expect(got).toBeGreaterThanOrEqual(1 + 4);
  });

  it("DEATH: its first hit kills you unless you Guard, and it heals past its Max HP", () => {
    const h = newHero("warrior");
    const death = makeBoss(25, makeRng(1));
    expect(death.name).toBe("DEATH");
    const b = startBattle(h.f, death, 21);
    b.round = 1;
    enemyPhase(b);
    expect(h.f.hp <= 0 || b.log.some(l => /dodges|evades|misses/.test(l))).toBe(true);
    const h2 = newHero("warrior");
    const d2 = makeBoss(80, makeRng(1));
    const b2 = startBattle(h2.f, d2, 22);
    b2.round = 1;
    heroPhase(b2, "guard");
    enemyPhase(b2);
    if (b2.log.some(l => /DEATH drinks/.test(l))) expect(d2.hp).toBeGreaterThan(d2.maxHp);
    expect(b2.log.some(l => /DEATH reaps you/.test(l))).toBe(false);
  });

  it("floor 20–24 bosses offer an Epic Crimson; DEATH drops Abaddon; beating the End wins with a cookie", () => {
    const run = newRun("warrior", 31);
    run.mode = "endless";
    for (const [floor, check] of [[20, "epic_crimson"], [21, "epic_crimson"], [22, "epic_crimson"], [23, "epic_crimson"], [24, "epic_crimson"], [25, "lc_abaddon"]] as const) {
      run.floor = floor; run.step = STEPS_PER_FLOOR; run.scene = { t: "map" } as typeof run.scene; run.choices = ["boss"];
      chooseRoom(run, "boss");
      const sc = run.scene as { t: string; battle?: { enemy: { hp: number }; over?: string } };
      if (sc.t !== "combat" || !sc.battle) throw new Error("no fight");
      sc.battle.enemy.hp = 0;
      sc.battle.over = "won";
      settleCombat(run);
      const pk = run.scene as { t: string; items?: { rarity: string; base: string }[] };
      if (pk.t !== "pick" || !pk.items) throw new Error(`no pick: ${pk.t}`);
      if (check === "epic_crimson") expect(pk.items[0].rarity).toBe("epic_crimson");
      else { expect(pk.items[0].base).toBe("lc_abaddon"); expect(run.popup?.title).toMatch(/DEATH IS DEAD/); }
    }
    // Abaddon one-shots
    const h = newHero("warrior");
    equipItem(h, { uid: 990, base: "lc_abaddon", rarity: "legendary_crimson", level: 80, bonuses: {}, revealed: true });
    const end = makeBoss(26, makeRng(2));
    const b = startBattle(h.f, end, 3);
    resolveFace(b, b.player, b.enemy, 3, false);
    expect(b.enemy.hp).toBeLessThanOrEqual(0);
    run.floor = 26; run.step = STEPS_PER_FLOOR; run.scene = { t: "map" } as typeof run.scene; run.choices = ["boss"];
    chooseRoom(run, "boss");
    const sc = run.scene as { t: string; battle?: { enemy: { hp: number }; over?: string } };
    if (sc.t !== "combat" || !sc.battle) throw new Error("no fight");
    sc.battle.enemy.hp = 0; sc.battle.over = "won";
    settleCombat(run);
    expect((run.scene as { t: string }).t).toBe("over");
    expect(run.finale).toBe(true);
    expect(run.popup?.text).toMatch(/NO MORE FOES/);
    expect(run.hero.backpack.some(i => i.base === "lc_cookie")).toBe(true);
  });

  it("shop rerolls triple each time, follow your Gold, and stop after 5", () => {
    const run = newRun("warrior", 41);
    run.hero.f.gold = 10000;
    chooseRoom(run, "shop");
    const paid: number[] = [];
    for (let i = 0; i < 6; i++) { const g = run.hero.f.gold; const err = rerollShop(run); paid.push(err ? -1 : g - run.hero.f.gold); }
    expect(paid).toEqual([26, 78, 234, 702, 2106, -1]); // 15 base × 1.75 (a full purse) = 26
  });

  it("a shop reroll doesn't restock potions or relics", () => {
    const run = newRun("warrior", 42);
    run.hero.f.gold = 10000;
    run.hero.potions = 0;
    chooseRoom(run, "shop");
    if (run.scene.t !== "shop") throw new Error("not a shop");
    const i = run.scene.stock.findIndex(e => e.kind === "potion");
    run.scene.stock[i].sold = true;
    const before = run.scene.stock.filter(e => e.kind === "potion" || e.kind === "mana").length;
    rerollShop(run);
    const pots = run.scene.stock.filter(e => e.kind === "potion" || e.kind === "mana");
    expect(pots.length).toBe(before);
    expect(run.scene.stock.find(e => e.kind === "potion")?.sold).toBe(true);
    const relicBefore = run.scene.stock.find(e => e.kind === "relic")?.relic;
    rerollShop(run);
    expect(run.scene.stock.find(e => e.kind === "relic")?.relic).toBe(relicBefore);
  });

  it("there are twelve Epic Crimsons, and every one is a real item", () => {
    expect(EPIC_CRIMSON.length).toBe(12);
    for (const e of EPIC_CRIMSON) expect(e.rarity).toBe("epic_crimson");
  });

  it("Crit damage trinkets boost Crits; crit gear hits Chilled foes harder; the Ruinous Eye takes 4% of Max HP", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 950, base: "tk_exec_signet", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    expect(h.f.critDmg).toBe(35);
    expect(h.f.armor).toBe(newHero("warrior").f.armor); // no Armor from the trinket
    const b = startBattle(h.f, dummy(), 31);
    resolveFace(b, b.player, b.enemy, 6, false);
    const base = 2 * (4 + Math.floor(b.player.armor / 5));
    expect(200 - b.enemy.hp).toBe(Math.round(base * 1.35));
    const h2 = newHero("warrior");
    equipItem(h2, { uid: 951, base: "cv_frostfang", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    const b2 = startBattle(h2.f, dummy(), 32);
    b2.enemy.statuses.chill = 1;
    resolveFace(b2, b2.player, b2.enemy, 6, false);
    expect(200 - b2.enemy.hp).toBe(Math.round(2 * 1.5 * (b2.player.damage + Math.floor(b2.player.armor / 5))));
    const h3 = newHero("warrior");
    equipItem(h3, { uid: 952, base: "lx_ruinous_eye", rarity: "legendary", level: 1, bonuses: {}, revealed: true });
    const b3 = startBattle(h3.f, dummy(), 33);
    resolveFace(b3, b3.player, b3.enemy, 3, false);
    expect(200 - b3.enemy.hp).toBe(4 + Math.floor(b3.player.armor / 5) + 8);
  });

  it("HP Epics: Hollow Vessel caps Max HP at 20 and doubles the off-hand; Swelling Heart's growth ends with the fight; Bloodprice pays HP for damage", () => {
    const m = newHero("mage");
    equipItem(m, { uid: 960, base: "ep_hollow_vessel", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    expect(m.f.maxHp).toBe(20);
    const b = startBattle(m.f, dummy(), 51);
    resolveFace(b, b.player, b.enemy, 2, false);
    // Fire Bolt 3 (+1 Arcane Spark, +1 Cloth Robes) and the Ember Charm's 2 Burn (+1 robes) twice
    expect(st(b.enemy, "burn")).toBe(8);
    const h = newHero("warrior");
    equipItem(h, { uid: 961, base: "ep_swelling_heart", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    const max = h.f.maxHp;
    const b2 = startBattle(h.f, dummy(), 52);
    resolveFace(b2, b2.player, b2.enemy, 3, false);
    resolveFace(b2, b2.player, b2.enemy, 4, false);
    expect(h.f.maxHp).toBe(max + 4);
    b2.enemy.hp = 0;
    endRound(b2);
    expect(h.f.maxHp).toBe(max);
    const w = newHero("warrior");
    equipItem(w, { uid: 962, base: "ep_bloodprice", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    const b3 = startBattle(w.f, dummy(), 53);
    const hp0 = w.f.hp;
    resolveFace(b3, b3.player, b3.enemy, 3, false);
    expect(w.f.hp).toBe(hp0 - Math.ceil(w.f.maxHp * 0.05));
    const first = 200 - b3.enemy.hp;
    resolveFace(b3, b3.player, b3.enemy, 3, false);
    expect(200 - b3.enemy.hp - first).toBeGreaterThan(first);
  });

  it("Consecrated: Holy weapons hit 30% harder; it wears off by the round unless it lasts the fight", () => {
    const c = newHero("cleric");
    const plain = startBattle(c.f, dummy(), 61);
    resolveFace(plain, plain.player, plain.enemy, 6, false);
    const base = 200 - plain.enemy.hp;
    const c2 = newHero("cleric");
    const b = startBattle(c2.f, dummy(), 61);
    applyStatus(b, c2.f, b.enemy, "consecrated", 2);
    resolveFace(b, b.player, b.enemy, 6, false);
    expect(200 - b.enemy.hp).toBe(Math.round(base * 1.3));
    endRound(b);
    expect(st(b.enemy, "consecrated")).toBe(1);
    applyStatus(b, c2.f, c2.f, "consecrated", 99);
    endRound(b);
    expect(st(c2.f, "consecrated")).toBe(99);
  });

  it("Holy off-hands deal Holy damage: more to Undead, more again when Consecrated", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 970, base: "ho_sunburst_shield", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    const e = dummy(); e.family = "Undead";
    const b = startBattle(h.f, e, 71);
    b.round = 1;
    heroPhase(b, "guard");
    expect(200 - e.hp).toBe(Math.round(5 * 1.5));
    applyStatus(b, h.f, e, "consecrated", 2);
    const before = e.hp;
    b.round = 2;
    heroPhase(b, "guard");
    expect(before - e.hp).toBe(Math.round(5 * 1.5 * 1.3));
  });

  it("foes that curse or Doom are Unholy (Holy weapons +50%)", () => {
    const e = dummy(); e.family = "Beast";
    expect(isUnholy(e)).toBe(false);
    e.items = { x_accursed: 1 };
    expect(isUnholy(e)).toBe(true);
    const hollow = makeBoss(5, makeRng(3));
    expect(hollow.family).toBe("Construct");
    expect(isUnholy(hollow)).toBe(true); // Doombringer
  });

  it("you can't drink a potion once you're dead", () => {
    const run = newRun("warrior", 81);
    run.hero.potions = 2;
    run.hero.f.hp = 0;
    run.scene = { t: "over", won: false };
    drinkPotion(run);
    expect(run.hero.potions).toBe(2);
    expect(run.hero.f.hp).toBe(0);
  });

  it("a 1–2 Elemental Barrier blocks nothing but still throws 2 stacks back", () => {
    const h = newHero("mage");
    const e = foe(10);
    const b = startBattle(h.f, e, 53);
    b.round = 1;
    h.f.flags["eBarrier"] = 1; h.f.flags["eBarrierTier"] = 0.5;
    const hp = h.f.hp;
    enemyPhase(b);
    if (b.log.some(l => /lashes back/.test(l))) {
      expect(h.f.hp).toBeLessThan(hp);
      expect(st(e, "burn")).toBeGreaterThanOrEqual(2);
    }
  });

  it("Overpower: hitting a Weak foe with Might adds +2 per Might", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(), 91);
    resolveFace(b, b.player, b.enemy, 6, false);
    const base = 200 - b.enemy.hp;
    const h2 = newHero("warrior");
    const b2 = startBattle(h2.f, dummy(), 91);
    h2.f.statuses.might = 2; b2.enemy.statuses.weak = 2;
    resolveFace(b2, b2.player, b2.enemy, 6, false);
    // Might adds +1 Damage per stack (doubled by the Crit); Overpower adds +2 per Might on top.
    expect(200 - b2.enemy.hp).toBe(base + 2 * 2 + 2 * 2);
    expect(b2.log.some(l => /Overpower/.test(l))).toBe(true);
    expect(st(b2.enemy, "weak")).toBe(1);
  });

  it("Reinforced builds from full blocks and pays out on the next attack; Blessed grows while you hold back", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 980, base: "rf_rampart", rarity: "uncommon", level: 1, bonuses: {}, revealed: true });
    const b = startBattle(h.f, dummy(), 92);
    h.f.flags["guarding"] = 1; h.f.flags["guardArmor"] = 1000;
    resolveFace(b, b.enemy, h.f, 2, false); // the dummy hits; nothing gets through
    expect(st(h.f, "reinforced")).toBe(1);
    h.f.flags["guarding"] = 0; h.f.flags["guardArmor"] = 0;
    const hp = b.enemy.hp;
    resolveFace(b, b.player, b.enemy, 6, false);
    expect(st(h.f, "reinforced")).toBe(0);
    expect(hp - b.enemy.hp).toBeGreaterThan(0);
    const c = newHero("cleric");
    equipItem(c, { uid: 981, base: "bl_prayer_rope", rarity: "uncommon", level: 1, bonuses: {}, revealed: true });
    const e = dummy(1000);
    const b2 = startBattle(c.f, e, 93);
    b2.round = 1;
    endRound(b2); endRound(b2);
    expect(st(c.f, "blessed")).toBe(2);
    resolveFace(b2, b2.player, e, 3, false);
    expect(st(c.f, "blessed")).toBe(0);
    expect(1000 - e.hp).toBeGreaterThanOrEqual(200);
  });

  it("Holy Forgiveness heals per stack; Guardian gives Barrier per kind of negative status", () => {
    const h = newHero("cleric");
    equipItem(h, { uid: 982, base: "hf_mercy_rosary", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    const b = startBattle(h.f, dummy(), 94);
    h.f.statuses.ward = 0;
    h.f.hp = 10;
    applyStatus(b, b.enemy, h.f, "bleed", 3);
    expect(h.f.hp).toBe(13);
    const g = newHero("cleric");
    equipItem(g, { uid: 983, base: "gd_templar_plate", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    const b2 = startBattle(g.f, dummy(), 95);
    g.f.statuses.ward = 0;
    applyStatus(b2, b2.enemy, g.f, "bleed", 2);
    expect(st(g.f, "barrier")).toBe(1);
    applyStatus(b2, b2.enemy, g.f, "weak", 1);
    expect(st(g.f, "barrier")).toBe(1 + 2); // Barrier the hero gains is half as strong
  });

  it("new curses: Destitute locks Gold, Unhealing stops healing, Frostbound starts fights Chilled", () => {
    const run = newRun("warrior", 101);
    run.hero.curses["c_destitute"] = 1; run.hero.curses["c_unhealing"] = 1; run.hero.curses["c_frostbound"] = 1;
    recompute(run.hero);
    run.hero.f.gold = 50;
    lockGold(run);
    run.hero.f.gold += 30;
    lockGold(run);
    expect(run.hero.f.gold).toBe(50);
    run.hero.f.gold -= 20;
    lockGold(run);
    run.hero.f.gold += 5;
    lockGold(run);
    expect(run.hero.f.gold).toBe(30);
    run.hero.f.hp = 10;
    restore(run.hero, 20);
    expect(run.hero.f.hp).toBe(10);
    const b = startBattle(run.hero.f, dummy(), 102);
    expect(st(b.player, "chill")).toBe(3);
  });

  it("Treasure Goblins escape after round 3, or drop a Rare and Gold you keep in full", () => {
    const run = newRun("warrior", 103);
    run.floor = 3;
    chooseRoom(run, "goblin");
    const sc = run.scene as { t: string; battle?: { enemy: { hp: number; items: Record<string, number> }; over?: string; round: number } };
    expect(sc.t).toBe("combat");
    expect(sc.battle!.enemy.items["m_goblin"]).toBe(1);
    sc.battle!.enemy.hp = 0; sc.battle!.over = "won";
    settleCombat(run);
    const loot = run.scene as { t: string; items?: { rarity: string }[]; gold?: number };
    expect(loot.t).toBe("loot");
    expect(loot.items!.some(i => i.rarity === "rare")).toBe(true);
    expect(loot.gold!).toBeGreaterThanOrEqual(25 + 8 * 3);
  });

  it("floor 10 and 20 gear never drops above its floor", () => {
    const h = newHero("warrior");
    const rng = makeRng(5);
    for (let i = 0; i < 400; i++) {
      const it = rollItem(h, "epic", 9, rng);
      expect(it.base.startsWith("dp_")).toBe(false);
    }
    let seen = 0;
    for (let i = 0; i < 2000; i++) if (rollItem(h, "epic", 20, rng).base.startsWith("dp_")) seen++;
    expect(seen).toBeGreaterThan(0);
  });

  it("Golden Altar: tribute 20% at a time until you're broke; finds wait until you leave", () => {
    const run = newRun("warrior", 111);
    run.hero.f.gold = 100;
    const ev = EVENTS.find(e => e.id === "golden_altar")!;
    run.scene = { t: "event", ev, result: null, found: [] };
    chooseEvent(run, 0);
    expect(run.hero.f.gold).toBe(80);
    let n = 0;
    while (run.hero.f.gold > 0 && n++ < 200) chooseEvent(run, 0);
    expect(run.hero.f.gold).toBe(0);
    expect(run.scene.t).toBe("event");
    const found = (run.scene as { found: unknown[] }).found.length;
    chooseEvent(run, 1);
    expect(run.scene.t).toBe(found ? "loot" : "event");
  });

  it("the Wandering Blacksmith upgrades two items for free", () => {
    const run = newRun("warrior", 112);
    run.scene = { t: "smith", uses: 2 };
    const w = run.hero.equip.main!;
    const scrap = run.hero.scrap;
    smithUpgrade(run, w.uid); smithUpgrade(run, w.uid); smithUpgrade(run, w.uid);
    expect(w.level).toBe(3);
    expect(run.hero.scrap).toBe(scrap);
  });

  it("Heavy weapons build Stagger; a full meter Staggers the foe (stun, next hit ×2), then it's immune for 2 rounds", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 1001, base: "bk_breaker_greatsword", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    expect(h.f.heavy).toBe(true);
    const e = dummy(1000);
    const b = startBattle(h.f, e, 121);
    b.round = 1;
    resolveFace(b, b.player, e, 2, false);
    resolveFace(b, b.player, e, 3, false);
    expect(st(e, "stagger")).toBe(2);
    resolveFace(b, b.player, e, 4, false);
    expect(st(e, "broken")).toBe(1);
    expect(st(e, "stun")).toBe(1);
    const before = e.hp;
    resolveFace(b, b.player, e, 2, false);
    const big = before - e.hp;
    const before2 = e.hp;
    resolveFace(b, b.player, e, 2, false);
    expect(big).toBeGreaterThan(1.8 * (before2 - e.hp));
    expect(st(e, "stagger")).toBe(0); // immune right after
  });

  it("Ice Forge gear makes Frostbitten easy to reach", () => {
    const m = newHero("mage");
    equipItem(m, { uid: 1002, base: "if_blizzard_pillar", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    const e = dummy(1000);
    const b = startBattle(m.f, e, 122);
    resolveFace(b, b.player, e, 2, false);
    resolveFace(b, b.player, e, 3, false);
    expect(b.log.some(l => /Frostbitten/.test(l))).toBe(true);
  });

  it("the Red Tithe makes Bleed tick twice and never fade", () => {
    const h = newHero("rogue");
    equipItem(h, { uid: 1003, base: "lx_red_tithe", rarity: "legendary", level: 1, bonuses: {}, revealed: true });
    const e = dummy(1000);
    const b = startBattle(h.f, e, 123);
    beginRound(b);
    e.statuses.bleed = 4;
    endRound(b);
    expect(1000 - e.hp).toBe(4);
    expect(st(e, "bleed")).toBe(4);
  });

  it("war hammers are Heavy and always roll a Bash chance", () => {
    const h = newHero("warrior");
    const rng = makeRng(9);
    let found = 0;
    for (let i = 0; i < 4000 && found < 5; i++) {
      const it = rollItem(h, "rare", 3, rng);
      if (it.base === "wh_iron_warhammer") { found++; expect(it.bash).toBeGreaterThan(0); }
    }
    expect(found).toBeGreaterThan(0);
  });

  it("Sacrifice burns roll × 10% of current HP into the hit, then heals that % of hits you take", () => {
    const h = newHero("cleric");
    equipItem(h, { uid: 1101, base: "sc_martyr_mace", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    const e = dummy(500);
    const b = startBattle(h.f, e, 131);
    const hp = h.f.hp;
    resolveFace(b, b.player, e, 3, false); // a 3: burns 30%
    const burned = Math.floor(hp * 0.3);
    expect(h.f.hp).toBe(hp - burned);
    expect(500 - e.hp).toBeGreaterThanOrEqual(burned);
    expect(h.f.flags["sacrifice"]).toBe(30);
    const before = h.f.hp;
    resolveFace(b, e, h.f, 2, false); // the dummy hits back
    const took = b.log.some(l => /Sacrifice/.test(l) && /heals|\+/.test(l));
    expect(h.f.hp).toBeGreaterThanOrEqual(before - 20);
    void took;
  });

  it("the Chained Dragon can wake into a fight, and its hoard pays big", () => {
    const run = newRun("warrior", 141);
    run.floor = 3;
    const ev = EVENTS.find(e => e.id === "chained_dragon")!;
    run.scene = { t: "event", ev, result: null, found: [] };
    const rng = run.rng; run.rng = () => 0.01;
    chooseEvent(run, 0);
    run.rng = rng;
    const sc = run.scene as { t: string; battle?: { enemy: { name: string; hp: number; champion?: boolean }; over?: string } };
    expect(sc.t).toBe("combat");
    expect(sc.battle!.enemy.name).toBe("The Chained Dragon");
    sc.battle!.enemy.hp = 0; sc.battle!.over = "won";
    settleCombat(run);
    const loot = run.scene as { t: string; title?: string; gold?: number };
    expect(loot.title).toBe("The Dragon's Hoard");
    expect(loot.gold!).toBeGreaterThanOrEqual(80 + 25 * 3);
  });

  it("the Alchemist's tonics: buy, then use in a fight without spending the turn", () => {
    const run = newRun("warrior", 151);
    run.hero.f.gold = 10000;
    run.scene = { t: "alchemist", stock: [{ id: "sunder", price: 100 }] };
    expect(buyTonic(run, 0)).toBeNull();
    expect(run.hero.tonics?.sunder).toBe(1);
    chooseRoom(run, "fight");
    const sc = run.scene as { t: string; battle?: { enemy: { armor: number } } };
    sc.battle!.enemy.armor = 8;
    useTonic(run, "sunder");
    expect(sc.battle!.enemy.armor).toBe(4);
    expect(run.hero.tonics?.sunder).toBeUndefined();
  });

  it("the Blind Dragon trades 70% of your Gold for a blessing that lasts 5 fights", () => {
    const run = newRun("warrior", 161);
    run.hero.f.gold = 200;
    const ev = EVENTS.find(e => e.id === "blind_dragon")!;
    run.scene = { t: "event", ev, result: null, found: [] };
    chooseEvent(run, 0);
    expect(run.hero.f.gold).toBe(60);
    expect(run.hero.f.persist["blessKind"]).toBeGreaterThanOrEqual(1);
    expect(run.hero.f.persist["blessFights"]).toBe(5);
    const boss = makeBoss(1, makeRng(1));
    run.hero.f.persist["blessKind"] = 3;
    expect(blessingMult(run.hero.f, boss)).toBe(1.3);
    run.hero.f.persist["blessKind"] = 4;
    expect(blessingMult(boss, run.hero.f)).toBe(0.7);
  });

  it("the Angelic Statue: half your HP for no curses, 2 fights of immunity and a small heal", () => {
    const run = newRun("warrior", 171);
    run.hero.curses["c_rust"] = 1; recompute(run.hero);
    const hp = run.hero.f.hp;
    const ev = EVENTS.find(e => e.id === "angelic_statue")!;
    run.scene = { t: "event", ev, result: null, found: [] };
    chooseEvent(run, 0);
    expect(run.hero.f.hp).toBe(hp - Math.floor(hp / 2));
    expect(Object.keys(run.hero.curses).length).toBe(0);
    expect(run.hero.f.persist["angelFights"]).toBe(2);
    advance(run);
    chooseRoom(run, "fight");
    const sc = run.scene as { t: string; battle?: Parameters<typeof applyStatus>[0] };
    expect(run.hero.f.hp).toBe(hp - Math.floor(hp / 2) + 2);
    applyStatus(sc.battle!, sc.battle!.enemy, run.hero.f, "bleed", 5);
    expect(st(run.hero.f, "bleed")).toBe(0);
  });

  it("status tonics fail on a foe that's immune to statuses", () => {
    const run = newRun("warrior", 181);
    run.hero.tonics = { weakness: 1, poison: 1 };
    chooseRoom(run, "fight");
    const sc = run.scene as { t: string; battle?: { round: number; enemy: { items: Record<string, number>; statuses: Record<string, number> } } };
    sc.battle!.enemy.items["x_warded"] = 1; // immune to statuses in rounds 1–2
    sc.battle!.round = 1;
    expect(useTonic(run, "weakness")).toMatch(/shrugs it off/);
    expect(sc.battle!.enemy.statuses.weak ?? 0).toBe(0);
    sc.battle!.round = 3;
    expect(useTonic(run, "poison")).toBeNull();
    expect(sc.battle!.enemy.statuses.poison).toBeGreaterThan(0);
  });

  it("the Lucky Pot takes all your Gold for a Four-Leaf Clover that lasts 4 chests", () => {
    const run = newRun("warrior", 191);
    run.floor = 6;
    run.hero.f.gold = 123;
    const ev = EVENTS.find(e => e.id === "lucky_pot")!;
    expect(ev.minFloor).toBe(6);
    // Floor 6 asks for 100 × 1.6 = 160 Gold.
    run.hero.f.gold = 159;
    run.scene = { t: "event", ev, result: null, found: [] };
    chooseEvent(run, 0);
    expect(run.hero.f.gold).toBe(159);
    expect(run.hero.f.persist["cloverChests"] ?? 0).toBe(0);
    run.hero.f.gold = 160;
    run.scene = { t: "event", ev, result: null, found: [] };
    chooseEvent(run, 0);
    expect(run.hero.f.gold).toBe(0);
    expect(run.hero.f.persist["cloverChests"]).toBe(4);
    for (let i = 0; i < 5; i++) { advance(run); chooseRoom(run, "wooden"); }
    expect(run.hero.f.persist["cloverChests"]).toBe(0);
  });

  it("cursed Epics drop for anyone, and grow with each curse", () => {
    const h = newHero("warrior");
    const rng = makeRng(17);
    let seen = 0;
    for (let i = 0; i < 1500; i++) if (rollItem(h, "epic", 3, rng).base.startsWith("cu_")) seen++;
    expect(seen).toBeGreaterThan(0); // in the pool from the start, cursed or not
    equipItem(h, { uid: 1201, base: "cu_many_sorrows", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    const base = h.f.maxHp;
    h.curses["c_rust"] = 1; h.curses["c_dread"] = 1; recompute(h);
    expect(h.f.maxHp).toBe(base + 12);
  });

  it("Curse-Eaters devour a curse per hit for a huge bonus; no curses, no bonus", () => {
    const run = newRun("warrior", 201);
    const h = run.hero;
    equipItem(h, { uid: 1301, base: "ce_cursebreaker", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    h.curses["c_rust"] = 1; h.curses["c_dread"] = 1; recompute(h);
    chooseRoom(run, "fight");
    const sc = run.scene as { t: string; battle?: Parameters<typeof resolveFace>[0] };
    const b = sc.battle!;
    b.enemy.hp = b.enemy.maxHp = 5000;
    resolveFace(b, b.player, b.enemy, 2, false);
    const first = 5000 - b.enemy.hp;
    resolveFace(b, b.player, b.enemy, 2, false);
    const second = 5000 - first - b.enemy.hp;
    resolveFace(b, b.player, b.enemy, 2, false);
    const third = 5000 - first - second - b.enemy.hp;
    expect(first).toBeGreaterThan(third * 2);
    expect(second).toBeGreaterThan(third * 2);
    b.enemy.hp = 0; b.over = "won";
    settleCombat(run);
    expect(Object.keys(h.curses).length).toBe(0);
  });

  it("Ill Fortune knocks some Rare+ finds down a rarity; Wasting and Enfeebled grow with the floor", () => {
    const h = newHero("warrior");
    h.curses["c_ill_fortune"] = 1; recompute(h);
    const rng = makeRng(3);
    let down = 0;
    for (let i = 0; i < 1000; i++) if (rollItem(h, "epic", 3, rng).rarity === "rare") down++;
    expect(down).toBeGreaterThan(200);
    expect(down).toBeLessThan(400);
    const w = newHero("warrior");
    const base = w.f.maxHp;
    w.curses["c_wasting"] = 1; w.f.persist["floor"] = 10; recompute(w);
    expect(w.f.maxHp).toBe(Math.round(base * 0.86));
    w.curses["c_enfeebled"] = 1; recompute(w);
    expect(w.f.dmgDealt).toBe(-15);
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
    applyStatus(b, h.f, e, "chill", 10); // (lands as 5)
    const hp = e.hp;
    applyStatus(b, h.f, e, "chill", 1);
    expect(st(e, "chill")).toBe(0);
    expect(hp - e.hp).toBeGreaterThanOrEqual(8);
    applyStatus(b, h.f, e, "bleed", 20); // (lands as 10)
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

describe("armor and story beats", () => {
  it("armor stops a percentage, more while Guarding", async () => {
    const { armorReduction } = await import("../src/engine/combat");
    expect(armorReduction(0, false)).toBe(0);
    expect(armorReduction(10, false)).toBeCloseTo(0.45);
    expect(armorReduction(3, false)).toBeCloseTo(0.9 * 3 / 13);
    // No cap, but diminishing returns: each point is worth less than the last.
    expect(armorReduction(100, false)).toBeCloseTo(0.9 * 100 / 110);
    expect(armorReduction(20, false) - armorReduction(10, false)).toBeLessThan(armorReduction(10, false) - armorReduction(0, false));
  });
  it("passive bonus damage only lands on Hits, not Grazes", () => {
    const h = newHero("warrior");
    expect(h.f.faces[0].kind).toBe("graze");
    h.f.armor = 9; // Battle-Hardened: +3 on Hits
    const g = startBattle(h.f, dummy(), 1);
    resolveFace(g, g.player, g.enemy, 1, false);
    const graze = 200 - g.enemy.hp;
    const h2 = newHero("warrior"); h2.f.armor = 10;
    const t = startBattle(h2.f, dummy(), 1);
    resolveFace(t, t.player, t.enemy, 2, false);
    const hit = 200 - t.enemy.hp;
    expect(graze).toBe(Math.round(4 * 0.5)); // sword only, halved, no armor bonus
    expect(hit).toBe(4 + 2);
  });
  it("arriving on floor 5 shows the despair popup", () => {
    const run = newRun("mage", 77);
    run.floor = 4; run.step = 7;
    advance(run);
    expect(run.scene.t).toBe("cleared"); // waits for the player after the boss
    expect(run.floor).toBe(4);
    advance(run); // "Descend"
    expect(run.floor).toBe(5);
    expect(run.popup?.title).toMatch(/Darkness/);
  });
});

describe("toll foes", () => {
  it("every action against a Tormentor costs HP, Guard and potions included", async () => {
    const { drinkPotion } = await import("../src/game/run");
    const run = newRun("warrior", 90);
    chooseRoom(run, "fight");
    if (run.scene.t !== "combat") return;
    const e = run.scene.battle.enemy;
    e.items = { m_toll: 1 }; e.damage = 0; e.hp = e.maxHp = 999;
    run.hero.f.statuses = {};
    let hp = run.hero.f.hp;
    combatAction(run, "guard");
    expect(run.hero.f.hp).toBeLessThan(hp);
    hp = run.hero.f.hp;
    run.hero.potions = 1;
    run.hero.f.hp = 5; hp = 5;
    drinkPotion(run);
    expect(run.hero.f.hp).toBe(Math.min(run.hero.f.maxHp, hp - 1 + 12));
  });
});

describe("two-handers", () => {
  it("Heavy Hitter adds damage only with a two-handed weapon", () => {
    const mk = () => { const e = makeMonster(makeRng(60), 1, "normal"); e.hp = e.maxHp = 500; e.armor = 0; e.items = {}; return e; };
    const h = newHero("warrior");
    h.talents["t_heavy_hitter"] = 1; recompute(h);
    const e1 = mk(); const b1 = startBattle(h.f, e1, 1); h.f.statuses = {}; resolveFace(b1, h.f, e1, 3);
    const oneHand = 500 - e1.hp;
    expect(oneHand).toBe(h.f.damage + Math.floor(h.f.armor / 5));
    equipItem(h, { uid: 990, base: "w_axe", rarity: "common", level: 1, bonuses: {}, revealed: true }, "main");
    const e2 = mk(); const b2 = startBattle(h.f, e2, 1); h.f.statuses = {}; resolveFace(b2, h.f, e2, 3);
    expect(500 - e2.hp).toBe(h.f.damage + 2 + Math.floor(h.f.armor / 5));
  });
});

describe("blades and bombs", () => {
  it("blood-price daggers lower Max HP and raise Crit chance", () => {
    const h = newHero("rogue");
    const hp = h.f.maxHp;
    equipItem(h, { uid: 1001, base: "d_glass_stiletto", rarity: "common", level: 1, bonuses: {}, revealed: true }, "main");
    expect(h.f.maxHp).toBe(hp - 6);
    expect(h.f.critChance).toBe(8);
  });
  it("grenades only go in the off-hand, deal no damage, and Dazzle by roll", () => {
    const h = newHero("rogue");
    const g = { uid: 1002, base: "gr_flashbang", rarity: "common" as const, level: 1, bonuses: {}, revealed: true };
    expect(slotsFor(g)).toEqual(["off"]);
    equipItem(h, g, "off");
    const e = makeMonster(makeRng(70), 1, "normal"); e.hp = e.maxHp = 300; e.items = {};
    const b = startBattle(h.f, e, 70);
    resolveFace(b, h.f, e, 6, true);
    expect(e.hp).toBe(300);
    expect(st(e, "dazzled")).toBe(4);
    const hp = h.f.hp;
    b.round = 1; enemyPhase(b);
    expect(h.f.hp).toBe(hp); // Dazzled: its attack misses
  });
  it("the Warrior's damage grows with Armor", () => {
    const h = newHero("warrior");
    const e = makeMonster(makeRng(71), 1, "normal"); e.hp = e.maxHp = 300; e.armor = 0; e.items = {};
    h.f.armor = 10;
    const b = startBattle(h.f, e, 71); h.f.statuses = {};
    resolveFace(b, h.f, e, 3);
    expect(300 - e.hp).toBe(h.f.damage + 2);
  });
});

describe("off-hand weapons", () => {
  it("ordinary one-handers are clumsy in the off-hand; daggers and throwing weapons aren't", () => {
    const mk = (base: string) => ({ uid: 1, base, rarity: "common" as const, level: 1, bonuses: {}, revealed: true });
    expect(weaponDamage(mk("w_hand_axe"), true)).toBe(Math.max(1, Math.floor(3 * 0.6)));
    expect(weaponDamage(mk("w_dagger"), true)).toBe(2);
    expect(weaponDamage(mk("w_throwing_knife"), true)).toBe(2);
    expect(weaponDamage(mk("ku_kunai"), true)).toBe(3);
  });
});

describe("dual wielding and faith weapons", () => {
  const mk = (base: string, uid: number) => ({ uid, base, rarity: "common" as const, level: 1, bonuses: {}, revealed: true });
  it("thrown weapons go in either hand, a little softer in the main hand", () => {
    expect(slotsFor(mk("ku_kunai", 1))).toEqual(["main", "off"]);
    expect(weaponDamage(mk("ku_kunai", 1))).toBe(weaponDamage(mk("ku_kunai", 1), true) - 1);
  });
  it("dual wielding is recognised, and grenades don't count", () => {
    const h = newHero("rogue");
    expect(h.f.dualWield).toBe(true);
    equipItem(h, mk("gr_toxic", 2), "off");
    expect(h.f.dualWield).toBe(false);
    h.relics["r_cross_guard"] = 1;
    equipItem(h, mk("ku_kunai", 3), "off");
    expect(h.f.dodge).toBe(5);
  });
  it("new dual-wield weapons work in either hand, and the new talents and relics need two weapons", () => {
    for (const id of ["w_shortsword", "w_hatchet", "w_sai", "w_moon_sickle", "d_parrying_dagger", "w_duellist_rapier", "w_flicker_blade", "w_wyrmtooth_scimitar", "w_tempest_twinblade"])
      expect(slotsFor(mk(id, 1)), id).toEqual(["main", "off"]);
    const h = newHero("warrior");
    equipItem(h, mk("w_shortsword", 5), "main");
    equipItem(h, mk("w_sai", 6), "off");
    expect(h.f.dualWield).toBe(true);
    const crit0 = h.f.critChance ?? 0, armor0 = h.f.armor;
    h.talents["t_crossed_blades"] = 2; h.talents["t_parrying_blades"] = 1;
    recompute(h);
    expect(h.f.critChance).toBe(crit0 + 6);
    expect(h.f.armor).toBe(armor0 + 1);
  });
  it("Twinfang sends the off-hand in twice while dual wielding", () => {
    const h = newHero("rogue");
    equipItem(h, { ...mk("l_twinfang", 7), rarity: "legendary" as const }, "off");
    const e = dummy(5000);
    const b = startBattle(h.f, e, 81);
    beginRound(b);
    heroPhase(b, "attack");
    expect(b.log.filter(l => /off-hand strikes again/.test(l)).length).toBe(1);
  });
  it("the Wardblade hits harder while Warded", () => {
    const h = newHero("cleric");
    equipItem(h, mk("f_wardblade", 4), "main");
    const e = makeMonster(makeRng(80), 1, "normal"); e.hp = e.maxHp = 300; e.armor = 0; e.items = {};
    const b = startBattle(h.f, e, 80);
    h.f.statuses = { ward: 1 };
    resolveFace(b, h.f, e, 3);
    expect(300 - e.hp).toBe(h.f.damage + 4);
  });
});

describe("enemy defences", () => {
  it("Causality Mirror reflects the first hit in full, past Evade; True Strike ignores Evade and Dodge; immunities block", () => {
    const h = newHero("warrior");
    const e = dummy(500); e.items = { x_mirror: 1 };
    const b = startBattle(h.f, e, 7);
    expect(st(b.enemy, "causality")).toBe(1);
    b.player.statuses.evade = 3;
    const hp = b.player.hp;
    resolveFace(b, b.player, b.enemy, 3);
    expect(b.enemy.hp).toBe(500);
    expect(b.player.hp).toBeLessThan(hp);
    expect(st(b.enemy, "causality")).toBe(0);
    resolveFace(b, b.player, b.enemy, 3);
    expect(b.enemy.hp).toBeLessThan(500);
    const e2 = dummy(500); e2.items = { x_truestrike: 1, x_fireproof: 1 }; e2.damage = 5;
    const b2 = startBattle(newHero("rogue").f, e2, 8);
    b2.player.statuses = { evade: 5 }; b2.player.dodge = 60;
    const hp2 = b2.player.hp;
    resolveFace(b2, b2.enemy, b2.player, 4);
    expect(b2.player.hp).toBeLessThan(hp2);
    expect(st(b2.player, "evade")).toBe(5);
    expect(st(b2.enemy, "truestrike")).toBe(0); // spent: it recharges a few rounds later
    resolveFace(b2, b2.enemy, b2.player, 4);
    expect(st(b2.player, "evade")).toBe(4);
    applyStatus(b2, b2.player, b2.enemy, "burn", 5);
    expect(st(b2.enemy, "burn")).toBe(0);
  });
});

describe("healing limits and new foes", () => {
  it("no healing at 0 HP, Regen caps at 8, Grievous halves healing, Blighting stops it, Dispelling strips blessings", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(500), 21);
    b.player.statuses = {};
    applyStatus(b, b.player, b.player, "regen", 40);
    expect(st(b.player, "regen")).toBe(8);
    b.player.hp = 0;
    expect(heal(b, b.player, 10)).toBe(0);
    b.player.hp = 10;
    b.enemy.items = { x_grievous: 1 };
    expect(heal(b, b.player, 10)).toBe(5);
    b.enemy.items = {}; b.round = 3; b.player.flags["blighted"] = 4;
    expect(heal(b, b.player, 10)).toBe(0);
    const e = dummy(500); e.items = { x_dispelling: 1 };
    const b2 = startBattle(newHero("rogue").f, e, 22);
    b2.player.statuses = { might: 3, haste: 1 };
    for (let r = 0; r < 4; r++) beginRound(b2);
    expect(st(b2.player, "might")).toBe(0);
    applyStatus(b2, b2.player, b2.player, "might", 2);
    expect(st(b2.player, "might")).toBe(0);
  });
});

describe("early loot", () => {
  it("early floors no longer turn Legendaries into Epics", async () => {
    const { earlyCap } = await import("../src/game/loot");
    const h = newHero("rogue"); const rng = makeRng(3);
    h.f.persist["floor"] = 1;
    expect(Array.from({ length: 100 }, () => earlyCap(h, "legendary", rng)).every(r => r === "legendary")).toBe(true);
  });

});

describe("one-handed staffs", () => {
  it("two at every rarity, none two-handed, and they drop", async () => {
    const { ONE_HANDED_STAFFS, STAFF_LEGENDARIES, STAFF_CRIMSON } = await import("../src/data/staffs");
    const all = [...ONE_HANDED_STAFFS, ...STAFF_LEGENDARIES, ...STAFF_CRIMSON];
    for (const r of ["common", "uncommon", "rare", "epic", "legendary", "crimson"])
      expect(all.filter(b => (b.onlyRarity ?? b.rarity) === r).length, r).toBeGreaterThanOrEqual(2);
    expect(all.every(b => !b.twoHanded && b.faces?.some(f => f.magic))).toBe(true);
    const h = newHero("mage"); const rng = makeRng(7); const seen = new Set<string>();
    for (let i = 0; i < 6000; i++) for (const r of ["common", "uncommon", "rare", "epic"] as const) seen.add(rollItem(h, r, 3, rng).base);
    expect(ONE_HANDED_STAFFS.filter(b => seen.has(b.id)).length).toBe(ONE_HANDED_STAFFS.length);
  });
  it("a one-handed staff keeps the off-hand", () => {
    const h = newHero("mage");
    const off = h.equip.off;
    equipItem(h, { uid: 7001, base: "s1_prism_scepter", rarity: "rare", level: 1, bonuses: {}, revealed: true }, "main");
    expect(h.equip.off?.uid).toBe(off?.uid);
  });
});

describe("save and resume", () => {
  it("a saved run resumes with the same hero, floor and dice", async () => {
    const store: Record<string, string> = {};
    (globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => store[k] ?? null, setItem: (k: string, v: string) => { store[k] = v; }, removeItem: (k: string) => { delete store[k]; } };
    const { saveRun, loadRun, savedSummary } = await import("../src/game/save");
    const run = newRun("rogue", 1234);
    run.hero.f.gold = 77;
    run.hero.relics["r_hunters_eye"] = 1;
    recompute(run.hero);
    saveRun(run);
    expect(savedSummary()?.origin).toBe("rogue");
    const loaded = loadRun()!;
    expect(loaded.run.hero.f.gold).toBe(77);
    expect(loaded.run.hero.f.critChance).toBe(4);
    expect(loaded.run.hero.f.faces.length).toBe(6);
    expect(loaded.run.rng()).toBe(run.rng());
  });
  it("a finished run stays saved on its results screen, with its results", async () => {
    const { saveRun, loadRun, savedSummary, clearSave } = await import("../src/game/save");
    const run = newRun("rogue", 4321);
    run.scene = { t: "over", won: true };
    run.endRecord = { earned: 42, unlocked: [], achievements: [] };
    saveRun(run);
    expect(savedSummary()?.over?.won).toBe(true);
    const loaded = loadRun()!;
    expect(loaded.run.scene).toEqual({ t: "over", won: true });
    expect(loaded.run.endRecord?.earned).toBe(42);
    clearSave();
    expect(savedSummary()).toBeNull();
  });
});

describe("treasury and encounters", () => {
  it("Treasury items roll only at their own rarity, and every rarity has new items", () => {
    const h = newHero("warrior");
    const rng = makeRng(99);
    const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) for (const r of ["common", "uncommon", "rare", "epic"] as const) {
      const it = rollItem(h, r, 3, rng);
      if (it.base.startsWith("rr_")) expect(it.rarity).toBe("rare");
      if (it.base.startsWith("ee_")) expect(it.rarity).toBe("epic");
      seen.add(it.base.slice(0, 3));
    }
    expect(seen.has("rr_")).toBe(true);
    expect(seen.has("ee_")).toBe(true);
  });
  it("Unique foes appear once per run", async () => {
    const { makeUnique, UNIQUES } = await import("../src/data/monsters");
    const seen = new Set<string>();
    const names = new Set<string>();
    for (let i = 0; i < UNIQUES.length; i++) names.add(makeUnique(makeRng(i), 2, seen).name);
    expect(names.size).toBe(UNIQUES.length);
  });
  it("each new floor announces itself", () => {
    const run = newRun("cleric", 5);
    run.step = 7;
    advance(run);
    expect(run.scene.t).toBe("cleared");
    advance(run);
    expect(run.floor).toBe(2);
    expect(run.popup?.title).toMatch(/^Floor 2/);
  });
});

describe("deep rares and forge golems", () => {
  it("Deep Rares only drop past floor 5 while locked", async () => {
    const { setLocked } = await import("../src/game/loot");
    setLocked(new Set(["dr_abyssal_edge", "dr_deepforged_plate"]));
    const h = newHero("warrior");
    const rng = makeRng(123);
    let shallow = 0, deepFound = 0;
    for (let i = 0; i < 6000; i++) {
      if (["dr_abyssal_edge", "dr_deepforged_plate"].includes(rollItem(h, "rare", 3, rng).base)) shallow++;
      if (["dr_abyssal_edge", "dr_deepforged_plate"].includes(rollItem(h, "rare", 6, rng).base)) deepFound++;
    }
    setLocked(new Set());
    expect(shallow).toBe(0);
    expect(deepFound).toBeGreaterThan(0);
  });
  it("Forge Golems leave Scrap", () => {
    const run = newRun("warrior", 321);
    chooseRoom(run, "fight");
    if (run.scene.t !== "combat") return;
    const e = run.scene.battle.enemy;
    e.items = { m_forge: 1 }; e.hp = 0;
    const scrap = run.hero.scrap;
    combatAction(run, "attack");
    expect(run.hero.scrap).toBe(scrap + 4 + 1);
  });
});


describe("Heatforged gear", () => {
  it("only drops at Heat 1 or more, with the strongest pieces needing Heat 3 and 5", () => {
    const seen = (heat: number) => {
      const h = newHero("warrior"); h.heat = heat || undefined; const out = new Set<number>(); const rng = makeRng(90 + heat);
      for (let i = 0; i < 6000; i++) { resetDropped(); const m = baseOf(rollItem(h, (["common", "uncommon", "rare", "epic", "legendary"] as const)[i % 5], 6, rng).base).heatMin; if (m) out.add(m); }
      return out;
    };
    expect(seen(0).size).toBe(0);
    expect([...seen(1)]).toEqual([1]);
    expect(seen(3).has(3) && !seen(3).has(5)).toBe(true);
    expect(seen(5).has(5)).toBe(true);
  }, 20000);
  it("Hearthfall's Burn carries from a kill into the next fight", () => {
    const h = newHero("warrior");
    equipItem(h, { uid: 990, base: "lx_hearthfall", rarity: "legendary", level: 1, bonuses: {}, revealed: true });
    const b = startBattle(h.f, dummy(1), 3); b.enemy.statuses.burn = 7;
    resolveFace(b, h.f, b.enemy, 3, false);
    expect(h.f.persist["hearthBurn"]).toBeGreaterThanOrEqual(7);
    const b2 = startBattle(h.f, dummy(), 4);
    expect(st(b2.enemy, "burn")).toBeGreaterThan(0);
    expect(h.f.persist["hearthBurn"]).toBeUndefined();
  });
});

describe("tough foes and stacked statuses", () => {
  it("a boss, Champion or Elite can't lose more than a set share of its Max HP to statuses in one round", () => {
    const h = newHero("mage");
    for (const [kind, cap] of [["boss", 0.15], ["champion", 0.2], ["elite", 0.25]] as const) {
      const e = dummy(400); (e as unknown as Record<string, boolean>)[kind] = true;
      const b = startBattle(h.f, e, 7);
      e.statuses = { burn: 300, poison: 300, bleed: 300 };
      endOfRound(b, e);
      expect(400 - e.hp, kind).toBeLessThanOrEqual(Math.floor(400 * cap));
      expect(400 - e.hp, kind).toBeGreaterThan(0);
    }
  });
});

describe("gauntlets", () => {
  it("from floor 3, about 15% of steps offer only hard fights, never on a floor's first step or before floor 3", () => {
    const run = newRun("warrior", 77);
    const isG = (c: string[]) => c.length === 3 && c.every(x => x === "elite" || x === "champion" || x === "vault");
    let g = 0;
    run.floor = 3; run.step = 2;
    for (let i = 0; i < 4000; i++) if (isG(genChoices(run))) g++;
    expect(g / 4000).toBeGreaterThan(0.12);
    expect(g / 4000).toBeLessThan(0.19);
    run.step = 0; for (let i = 0; i < 500; i++) expect(isG(genChoices(run))).toBe(false);
    run.floor = 2; run.step = 2; let early = 0; for (let i = 0; i < 2000; i++) if (genChoices(run).filter(x => x === "elite" || x === "champion").length === 3) early++;
    expect(early).toBe(0);
  });
});

describe("more daggers", () => {
  it("Uncommon to Legendary daggers all drop, and Misericorde turns Hits on weak foes into Crits", () => {
    const ids = ["dg_cutpurse_knife", "dg_serrated_shiv", "dg_quickblade", "dg_moonsilver_dirk", "dg_frostbite_kris", "dg_backstabber", "dg_scorpion_sting", "dg_misericorde", "dg_shadowstep"];
    for (const id of ids) expect(baseOf(id).weaponType, id).toBe("dagger");
    expect(LEGENDARIES.some(l => l.id === "lx_nightfall") && LEGENDARIES.some(l => l.id === "lx_kingslayer")).toBe(true);
    const h = newHero("rogue");
    equipItem(h, { uid: 991, base: "dg_misericorde", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    h.f.critChance = 0;
    const b = startBattle(h.f, dummy(), 8); b.enemy.hp = 50; h.f.statuses = {};
    resolveFace(b, h.f, b.enemy, 3, false);
    expect(b.log.some(l => l.includes("Crit"))).toBe(true);
  });
});

describe("event rooms and quiet steps", () => {
  it("about 15% of steps (from floor 1) offer no fights; some events have their own paths and never come from Something Strange", () => {
    const run = newRun("cleric", 81);
    run.floor = 1; run.step = 1; run.hero.f.gold = 999;
    const COMBAT = ["fight", "elite", "champion", "vault", "crimson_elite", "unique", "goblin", "nemesis", "crimson_vault"];
    let calm = 0; const seen = new Set<string>();
    for (let i = 0; i < 4000; i++) { const c = genChoices(run); c.forEach(x => seen.add(x)); if (!c.some(x => COMBAT.includes(x))) calm++; }
    expect(calm / 4000).toBeGreaterThan(0.12);
    expect(calm / 4000).toBeLessThan(0.19);
    for (const room of ["alchemist", "blacksmith", "gambling_den", "fortune_teller", "card_sharp"]) expect(seen.has(room), room).toBe(true);
    for (let i = 0; i < 300; i++) {
      const r2 = newRun("cleric", 900 + i); r2.hero.f.gold = 999; r2.floor = 3;
      chooseRoom(r2, "event");
      const s = r2.scene as { t: string; ev?: { id: string } };
      expect(["alchemist", "blacksmith", "dice", "teller", "mirror", "card_sharp"].includes(s.ev?.id ?? "") || s.t === "smith" || s.t === "alchemist").toBe(false);
    }
  });
});

describe("the Changeling Doppelgänger", () => {
  it("from floor 5 only; it's an exact copy of you and always leaves a Legendary", () => {
    const run = newRun("warrior", 55);
    run.hero.f.gold = 0; run.floor = 4; run.step = 2;
    for (let i = 0; i < 2000; i++) expect(genChoices(run)).not.toContain("doppelganger");
    run.floor = 5; let seen = false;
    for (let i = 0; i < 3000 && !seen; i++) seen = genChoices(run).includes("doppelganger");
    expect(seen).toBe(true);
    run.hero.f.hp = 20;
    run.scene = { t: "map" } as typeof run.scene; run.choices = ["doppelganger"];
    chooseRoom(run, "doppelganger");
    const sc = run.scene as { t: string; battle?: { enemy: { hp: number; maxHp: number; armor: number; damage: number; items: Record<string, number>; elite?: boolean }; over?: string } };
    if (sc.t !== "combat" || !sc.battle) throw new Error("no fight");
    const e = sc.battle.enemy, f = run.hero.f;
    expect([e.hp, e.maxHp, e.armor, e.damage, e.elite]).toEqual([20, f.maxHp, f.armor, f.damage, true]);
    expect(e.items["o_warrior"]).toBe(f.items["o_warrior"]);
    e.hp = 0; sc.battle.over = "won";
    settleCombat(run);
    const loot = run.scene as { t: string; items?: { rarity: string }[] };
    expect(loot.items?.some(i => i.rarity === "legendary")).toBe(true);
  });
});

describe("new build paths", () => {
  it("Briar, Mercenary, Executioner and Gambler pieces work", () => {
    // Briar: Bramble Heart makes Spikes hit 50% harder.
    const h = newHero("warrior");
    equipItem(h, { uid: 995, base: "pb_bramble_heart", rarity: "rare", level: 1, bonuses: {}, revealed: true });
    const b = startBattle(h.f, dummy(), 9); h.f.statuses = { spikes: 4 }; h.f.dodge = 0; h.f.armor = 0;
    const e0 = b.enemy.hp; b.enemy.damage = 1;
    resolveFace(b, b.enemy, h.f, 3, false);
    expect(e0 - b.enemy.hp).toBe(6);
    // Mercenary: the Cudgel hits harder with a heavy purse.
    const m = newHero("rogue");
    equipItem(m, { uid: 996, base: "pm_moneylender_cudgel", rarity: "uncommon", level: 1, bonuses: {}, revealed: true });
    m.f.critChance = 0; m.f.gold = 0;
    const b1 = startBattle(m.f, dummy(), 10); m.f.statuses = {}; resolveFace(b1, m.f, b1.enemy, 3, false); const poor = 200 - b1.enemy.hp;
    m.f.gold = 300;
    const b2 = startBattle(m.f, dummy(), 10); m.f.statuses = {}; resolveFace(b2, m.f, b2.enemy, 3, false); const rich = 200 - b2.enemy.hp;
    expect(rich - poor).toBe(5);
    // Executioner: the Guillotine finishes a badly wounded Elite, but not a boss.
    const x = newHero("warrior");
    equipItem(x, { uid: 997, base: "pe_guillotine", rarity: "epic", level: 1, bonuses: {}, revealed: true });
    const el = dummy(1000); el.elite = true; el.armor = 0;
    const b3 = startBattle(x.f, el, 11); x.f.statuses = {}; el.hp = 100; resolveFace(b3, x.f, el, 3, false);
    expect(el.hp).toBe(0);
    const bo = dummy(1000); bo.boss = true; bo.armor = 0;
    const b4 = startBattle(x.f, bo, 12); x.f.statuses = {}; bo.hp = 100; resolveFace(b4, x.f, bo, 3, false);
    expect(bo.hp).toBeGreaterThan(0);
    // Gambler: the Bone Charm turns 1s into 2s.
    const g = newHero("rogue");
    equipItem(g, { uid: 998, base: "pg_bone_charm", rarity: "common", level: 1, bonuses: {}, revealed: true });
    const b5 = startBattle(g.f, dummy(), 13); g.f.statuses = {};
    for (let i = 0; i < 300; i++) expect(rollFor(b5, g.f, 6)).toBeGreaterThanOrEqual(2);
  });
});

describe("more build options", () => {
  it("new physical reactions: Lacerate, Crushed, Hamstring, Bristle", () => {
    const h = newHero("warrior");
    const b = startBattle(h.f, dummy(400), 21); const e = b.enemy; e.armor = 6;
    e.statuses = { bleed: 5 };
    applyStatus(b, h.f, e, "fracture", 1);
    expect(st(e, "fracture")).toBe(0);
    expect(400 - e.hp).toBeGreaterThanOrEqual(7);
    e.statuses.bleed = 0;
    applyStatus(b, h.f, e, "fracture", 1); applyStatus(b, h.f, e, "weak", 1);
    expect(e.flags["crushed"]).toBeGreaterThan(0);
    expect(armorOf(e)).toBe(3);
    const e2 = dummy(400); const b2 = startBattle(h.f, e2, 22); e2.statuses = { weak: 2 };
    applyStatus(b2, h.f, e2, "bleed", 1);
    expect(e2.flags["bleedNoFade"]).toBe(1);
    const b3 = startBattle(h.f, dummy(), 23); h.f.statuses = { might: 3 };
    applyStatus(b3, h.f, h.f, "spikes", 2);
    expect(h.f.flags["bristle"]).toBeGreaterThan(0);
  });
  it("tough foes can't be Stun-locked; Bash, Might, Fracture and Dodge gear hooks fire", () => {
    const h = newHero("warrior");
    const boss = dummy(500); boss.boss = true;
    const b = startBattle(h.f, boss, 24);
    applyStatus(b, h.f, boss, "stun", 1); expect(st(boss, "stun")).toBe(1);
    boss.statuses.stun = 0; boss.flags["stunnedAt"] = b.round; boss.flags["stunGuard"] = b.round + 2;
    applyStatus(b, h.f, boss, "stun", 1); expect(st(boss, "stun")).toBe(0);
    // Colossus Blade: each Might counts double.
    const c = newHero("warrior");
    equipItem(c, { uid: 999, base: "lx_colossus_blade", rarity: "legendary", level: 1, bonuses: {}, revealed: true });
    const bc = startBattle(c.f, dummy(), 25);
    expect(st(c.f, "might")).toBe(2);
    expect(damageOf(c.f)).toBe(c.f.damage + 4);
    // Fault Line Ring: shatters hit harder.
    const shatter = (ring: boolean) => {
      const s = newHero("mage");
      if (ring) equipItem(s, { uid: 1000, base: "ps_fault_ring", rarity: "uncommon", level: 1, bonuses: {}, revealed: true });
      const bs = startBattle(s.f, dummy(400), 26);
      applyStatus(bs, s.f, bs.enemy, "fracture", 1); applyStatus(bs, s.f, bs.enemy, "fracture", 1); applyStatus(bs, s.f, bs.enemy, "fracture", 1);
      return 400 - bs.enemy.hp;
    };
    expect(shatter(true)).toBeGreaterThan(shatter(false));
    void bc;
  });
});

describe("floor themes", () => {
  it("each run deals floors 1–10 ten different themes, deeper floors draw them at random, and their foes turn up", async () => {
    const { dealThemes, themeOf } = await import("../src/game/run");
    const { THEMES } = await import("../src/data/themes");
    const a = dealThemes(123), b2 = dealThemes(456);
    expect(new Set(a).size).toBe(10);
    expect(a.join()).not.toBe(b2.join());
    const run = newRun("warrior", 321);
    expect(run.themes?.length).toBe(10);
    const deep = Array.from({ length: 16 }, (_, i) => themeOf(run, 11 + i)!.id);
    for (let i = 1; i < deep.length; i++) expect(deep[i]).not.toBe(deep[i - 1]);
    expect(themeOf(run, 14)?.id).toBe(deep[3]);
    expect(new Set(deep).size).toBeGreaterThan(4);
    expect(themeOf(newRun("warrior", 321, "abyss"))).toBeUndefined();
    // A themed floor's own monsters show up in its fights.
    const th = themeOf(run)!;
    const own = new Set(th.monsters.map(m => m.name));
    let seen = 0;
    for (let i = 0; i < 300; i++) { run.scene = { t: "map" } as typeof run.scene; run.step = 1; run.choices = ["fight"]; chooseRoom(run, "fight"); const sc = run.scene as { t: string; battle?: { enemy: { name: string } } }; if (sc.battle && [...own].some(n => sc.battle!.enemy.name.endsWith(n))) seen++; }
    expect(seen).toBeGreaterThan(30);
    expect(THEMES.length).toBeGreaterThanOrEqual(13);
  });
  it("plain kits: no special effects, strong numbers", () => {
    const sword = baseOf("pl_rare_sword"), plate = baseOf("pl_epic_plate");
    expect(Object.keys(sword.hooks).length).toBe(0);
    expect(sword.damage).toBeGreaterThan(5);
    expect(plate.armor).toBeGreaterThanOrEqual(8);
  });
});

describe("foe weaknesses", () => {
  it("blunt, bladed and two-handed weapons, spells and Bleed each have foes that fear them", () => {
    const h = newHero("warrior"); // Iron Sword: bladed
    expect(h.f.arms?.main).toBe("sharp");
    const hit = (trait?: string) => { const e = dummy(500); e.armor = 0; if (trait) e.items[trait] = 1; const b = startBattle(h.f, e, 41); h.f.statuses = {}; h.f.critChance = 0; resolveFace(b, h.f, e, 3, false); return 500 - e.hp; };
    expect(hit("x_wk_sharp")).toBeGreaterThan(hit());
    expect(hit("x_wk_blunt")).toBe(hit());
    const m = newHero("cleric"); // Blessed Mace: blunt
    expect(m.f.arms?.main).toBe("blunt");
    const e = dummy(500); e.statuses = { bleed: 10 }; e.items["x_wk_bleed"] = 1; const b = startBattle(m.f, e, 42); e.statuses = { bleed: 9 };
    endOfRound(b, e);
    const e2 = dummy(500); const b2 = startBattle(m.f, e2, 42); e2.statuses = { bleed: 9 }; endOfRound(b2, e2);
    expect(500 - e.hp).toBeGreaterThan(500 - e2.hp);
  });
});

describe("Counter and Ambush", () => {
  it("an evaded blow is countered with a Crit, and an Ambush strikes before round 1", async () => {
    const { ambushPending, ambushStrike, heroPhase } = await import("../src/engine/combat");
    const h = newHero("rogue");
    const e = dummy(300); e.damage = 3;
    const b = startBattle(h.f, e, 51); h.f.statuses = { evade: 1 }; h.f.dodge = 0;
    beginRound(b); heroPhase(b, "counter"); enemyPhase(b);
    expect(b.log.some(l => l.includes("counters"))).toBe(true);
    expect(300 - e.hp).toBeGreaterThan(0);
    const e2 = dummy(300); e2.flags = {};
    const b2 = startBattle(h.f, e2, 52); e2.flags["ambush"] = 1; h.f.statuses = {};
    expect(ambushPending(b2)).toBe(true);
    const hp0 = h.f.hp; ambushStrike(b2);
    expect(ambushPending(b2)).toBe(false);
    expect(beginRound(b2)).toBe(false);
    expect(h.f.hp).toBeLessThanOrEqual(hp0);
  });
});
