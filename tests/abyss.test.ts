import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { newHero, recompute } from "../src/game/hero";
import { ABYSS_FLOORS, advance, chooseRoom, depth, newRun, settleCombat, STEPS_PER_FLOOR, type Run } from "../src/game/run";
import { abyssUnlocked, applyPlate, bankRuin, type Meta, spendShard } from "../src/game/meta";

beforeAll(() => loadLibrary());

const mem: Record<string, string> = {};
(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => { mem[k] = v; }, removeItem: (k: string) => { delete mem[k]; } };

const enter = (run: Run, room: Parameters<typeof chooseRoom>[1], step = 1) => {
  run.step = step; run.scene = { t: "map" } as Run["scene"]; run.choices = [room];
  chooseRoom(run, room);
  const sc = run.scene as { t: string; rank?: string; uber?: boolean; battle?: { enemy: { hp: number; name: string; elite?: boolean; boss?: boolean; maxHp: number }; over?: string } };
  if (sc.t !== "combat" || !sc.battle) throw new Error(`no fight: ${sc.t}`);
  return sc as Required<Pick<typeof sc, "battle">> & typeof sc;
};
const win = (run: Run, sc: ReturnType<typeof enter>) => { sc.battle.enemy.hp = 0; sc.battle.over = "won"; settleCombat(run); };

describe("the Abyss", () => {
  it("every plain fight is a rank tougher; the floor boss is an Uber boss", () => {
    const run = newRun("warrior", 5, "abyss");
    expect(enter(run, "fight").rank).toBe("elite");
    expect(enter(run, "elite").rank).toBe("champion");
    const roaming = enter(run, "champion");
    expect(roaming.rank).toBe("boss");
    expect(roaming.uber).toBeFalsy();
    const uber = enter(run, "boss", STEPS_PER_FLOOR);
    expect(uber.uber).toBe(true);
    expect(uber.battle.enemy.name.startsWith("Uber ")).toBe(true);
    // The same floor-boss room in the campaign is a plain boss.
    const c = newRun("warrior", 5);
    const plain = enter(c, "boss", STEPS_PER_FLOOR);
    expect(plain.battle.enemy.name.startsWith("Uber ")).toBe(false);
    expect(uber.battle.enemy.maxHp).toBeGreaterThan(plain.battle.enemy.maxHp * 2);
  });

  it("each Abyss floor counts double for depth, and the run is won after floor 10", () => {
    const run = newRun("rogue", 9, "abyss");
    run.floor = 4;
    expect(depth(run)).toBe(7);
    run.floor = ABYSS_FLOORS; run.step = STEPS_PER_FLOOR; run.clearedFloor = ABYSS_FLOORS;
    advance(run);
    expect(run.scene.t).toBe("over");
    expect((run.scene as { won?: boolean }).won).toBe(true);
  });

  it("Uber bosses offer Epic or Legendary picks", () => {
    const run = newRun("mage", 11, "abyss");
    const sc = enter(run, "boss", STEPS_PER_FLOOR);
    win(run, sc);
    const pk = run.scene as { t: string; items?: { rarity: string }[] };
    expect(pk.t).toBe("pick");
    for (const it of pk.items!) expect(["epic", "legendary"]).toContain(it.rarity);
  });

  it("campaign bosses from floor 20 drop Ruin Shards (not in the Abyss), and they bank once", () => {
    const run = newRun("warrior", 3);
    run.mode = "endless"; run.floor = 21;
    win(run, enter(run, "boss", STEPS_PER_FLOOR));
    expect(run.ruin?.shards).toBe(1);
    const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 21, found: [] };
    expect(bankRuin(m, run)).toBe(true);
    expect(bankRuin(m, run)).toBe(false);
    expect(m.ruinShards).toBe(1);
    expect(abyssUnlocked(m)).toBe(true);
    expect(spendShard(m)).toBe(false); // one shard isn't enough: the Abyss costs five
    m.ruinShards = 6;
    expect(spendShard(m)).toBe(true);
    expect(m.ruinShards).toBe(1);
    // Floor 19 boss: nothing.
    const early = newRun("warrior", 4); early.mode = "endless"; early.floor = 19;
    win(early, enter(early, "boss", STEPS_PER_FLOOR));
    expect(early.ruin).toBeUndefined();
    const ab = newRun("warrior", 4, "abyss"); ab.floor = 10;
    win(ab, enter(ab, "boss", STEPS_PER_FLOOR));
    expect(ab.ruin?.shards ?? 0).toBe(0); // no Shards or Plates in the Abyss (its Uber boss drops a Ruin Gem instead)
    expect(ab.ruin?.plates ?? 0).toBe(0);
  });

  it("Vanadium Plates go to a class for good and make it stronger", () => {
    const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [], plates: 2 };
    expect(abyssUnlocked(m)).toBe(false);
    expect(applyPlate(m, "cleric")).toBe(true);
    expect(m.plates).toBe(1);
    expect(m.classPlates?.cleric).toBe(1);
    const plain = newHero("cleric");
    const plated = newHero("cleric");
    plated.plates = 5;
    recompute(plated);
    expect(plated.f.maxHp).toBeGreaterThan(plain.f.maxHp);
    expect(plated.f.damage).toBeGreaterThanOrEqual(plain.f.damage);
  });
});

it("the 7th Elite fight in a row in the Abyss is a boss", async () => {
  const { chooseRoom } = await import("../src/game/run");
  const run = newRun("warrior", 55, "abyss");
  run.popup = undefined; run.step = 1; run.normalStreak = 5;
  chooseRoom(run, "fight");
  expect((run.scene as { rank?: string }).rank).toBe("elite");
  run.scene = { t: "map" }; run.normalStreak = 6;
  chooseRoom(run, "fight");
  expect((run.scene as { rank?: string }).rank).toBe("boss");
  expect(run.normalStreak).toBe(0);
});

it("Uber bosses drop Ruin Gems; gems bank, move between classes, and add 10% base stats in any mode", async () => {
  const { addGem, removeGem } = await import("../src/game/meta");
  const run = newRun("mage", 66, "abyss");
  run.popup = undefined; run.step = STEPS_PER_FLOOR;
  chooseRoom(run, "boss");
  if (run.scene.t !== "combat" || !run.scene.uber) throw new Error("no uber");
  run.scene.battle.enemy.hp = 0; run.scene.battle.over = "won"; settleCombat(run);
  expect(run.ruin?.gems).toBe(1);
  const m: Meta = { renown: 0, runs: 0, wins: 0, bestFloor: 21, found: [] };
  expect(bankRuin(m, run)).toBe(true);
  expect(m.ruinGems).toBe(1);
  expect(addGem(m, "warrior")).toBe(true);
  expect(removeGem(m, "warrior")).toBe(true);
  expect(addGem(m, "rogue")).toBe(true);
  expect(m.classGems).toEqual({ warrior: 0, rogue: 1 });
  const h = newHero("rogue"); const hp0 = h.f.maxHp;
  h.gems = 2; recompute(h);
  expect(h.f.maxHp).toBe(Math.round(hp0 * 1.2));
});
