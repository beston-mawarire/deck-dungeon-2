import { beforeAll, describe, expect, it } from "vitest";
import { loadLibrary } from "../src/data";
import { abyssUnlocked, type Meta } from "../src/game/meta";
import { newDailyRun, newRun, startCrawl } from "../src/game/run";
import { layerFloors, LAYER_FLOORS } from "../src/game/grid";
import { crawlStep } from "./crawlbot";

beforeAll(() => loadLibrary());
const meta = () => ({ renown: 0, runs: 0, wins: 0, bestFloor: 0, found: [] }) as unknown as Meta;

describe("the Abyss and the Daily, walked", () => {
  it("the Abyss opens once any class beats the last layer", () => {
    const m = meta();
    expect(abyssUnlocked(m)).toBe(false);
    m.layersBeaten = { rogue: 5 };
    expect(abyssUnlocked(m)).toBe(true);
  });
  it("an Abyss run is a walkable dungeon that plays through", () => {
    for (const seed of [3, 9]) {
      const r = newRun("warrior", seed, "abyss"); r.abyssMod = undefined; startCrawl(r);
      expect(r.gridMode).toBe(true);
      for (let k = 0; k < 3000 && r.scene.t !== "over"; k++) crawlStep(r);
      expect(r.floor).toBeGreaterThanOrEqual(1);
    }
  }, 60000);
  it("the Abyss's depths are shorter than the dungeon's layers", () => {
    expect(layerFloors({ mode: "abyss" })).toBeLessThan(LAYER_FLOORS);
    expect(layerFloors({ mode: "campaign" })).toBe(LAYER_FLOORS);
  });
  it("a Daily run is a walkable dungeon too, the same for everyone that day", () => {
    const a = newDailyRun("2026-11-06"); startCrawl(a);
    const b = newDailyRun("2026-11-06"); startCrawl(b);
    expect(a.gridMode).toBe(true);
    expect(JSON.stringify(a.grid!.things)).toBe(JSON.stringify(b.grid!.things));
    for (let k = 0; k < 2000 && a.scene.t !== "over"; k++) crawlStep(a);
  }, 60000);
});
