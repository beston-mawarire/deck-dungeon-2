import { describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { CLASS_SKILLS, masteryFor, masteryLevel, MASTERY_XP } from "../src/game/progress";
import { availableActions, combatAction, descend, makeGrid, newRun, startCrawl } from "../src/game/run";
import type { OriginId } from "../src/engine/types";

loadLibrary();

describe("Skills and Mastery", () => {
  it("every class has its own ability and two more, opening at Mastery 3 and 6", () => {
    for (const o of ["warrior", "rogue", "mage", "cleric"]) {
      expect(CLASS_SKILLS[o].map(k => k.level)).toEqual([1, 3, 6]);
    }
  });

  it("the picked ability replaces the class's own in a fight, costs mana, and works", () => {
    for (const o of ["warrior", "rogue", "mage", "cleric"] as OriginId[]) for (const k of CLASS_SKILLS[o].slice(1)) {
      const r = newRun(o, 5); startCrawl(r); r.grid = makeGrid(r, 1);
      r.hero.skill = k.id;
      for (let d = 2; d <= 6; d++) descend(r);
      expect(r.scene.t).toBe("combat");
      const acts = availableActions(r);
      expect(acts).toContain(k.id);
      expect(acts).not.toContain(CLASS_SKILLS[o][0].id);
      if (r.scene.t !== "combat") continue;
      const b = r.scene.battle, mana = b.player.mana ?? 0, hp = b.enemy.hp;
      combatAction(r, k.id as never);
      expect(b.player.mana).toBe(mana - 1);
      expect(b.log.join(" ").length).toBeGreaterThan(0);
      if (["crush", "envenom", "arcanebolt", "smite"].includes(k.id)) expect(b.enemy.hp < hp || b.over).toBeTruthy();
    }
  });

  it("Mastery comes slowly: a full layer is worth a handful, Mastery 3 takes several", () => {
    const r = newRun("warrior", 1); startCrawl(r);
    r.grid = makeGrid(r, 6); r.stats.bosses = 1; r.floor = 1;
    const layer = masteryFor(r);
    expect(layer).toBeGreaterThanOrEqual(4);
    expect(layer).toBeLessThanOrEqual(7);
    expect(MASTERY_XP[3] / layer).toBeGreaterThan(4);
    expect(masteryLevel(MASTERY_XP[6])).toBe(6);
  });
});
