// Balance probe: a reasonable bot plays many runs and prints win rates and where runs end.
import { it } from "vitest";
import { loadLibrary } from "../src/data";
import { newRun, STEPS_PER_FLOOR } from "../src/game/run";

import { botStep } from "./bot";

it("balance probe", () => {
  loadLibrary();
  const deaths: Record<string, number> = {};
  const res: Record<string, { w: number; n: number; floors: number }> = {};
  for (let seed = 1; seed <= 400; seed++) {
    const o = (["warrior", "rogue", "mage", "cleric"] as const)[seed % 4];
    const run = newRun(o, seed);
    for (let g = 0; g < 20000 && run.scene.t !== "over"; g++) botStep(run);
    if (run.scene.t === "over" && !run.scene.won) {
      const k = `F${run.floor}${run.step >= STEPS_PER_FLOOR ? "boss" : ""}`;
      deaths[k] = (deaths[k] ?? 0) + 1;
    }
    const r = (res[o] ??= { w: 0, n: 0, floors: 0 });
    r.n++;
    r.floors += Math.min(run.floor, 10);
    if (run.scene.t === "over" && run.scene.won) r.w++;
  }
  console.log("DEATHS", JSON.stringify(deaths));
  console.log("BALANCE", JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { win: Math.round((100 * v.w) / v.n) + "%", avgFloor: (v.floors / v.n).toFixed(2) }]))));
});

// "Lucky runs": no odds are changed. We play many real runs and look at the luckiest 10% of them
// (the ones that got furthest), to see whether a lucky run can win and how often.
declare const process: { env: Record<string, string | undefined> };
it("lucky run probe", () => {
  loadLibrary();
  if (!process.env.LUCKY) return;
  const per = Number(process.env.LUCKY) || 1500;
  const out: Record<string, unknown> = {};
  for (const o of ["warrior", "rogue", "mage", "cleric"] as const) {
    const runs: { floor: number; won: boolean; level: number; bosses: number; seed: number }[] = [];
    for (let i = 0; i < per; i++) {
      const seed = 100000 + i * 7 + o.length;
      const run = newRun(o, seed);
      for (let g = 0; g < 20000 && run.scene.t !== "over"; g++) botStep(run);
      const won = run.scene.t === "over" && run.scene.won;
      runs.push({ floor: won ? 6 : run.floor + (run.step >= STEPS_PER_FLOOR ? 0.5 : run.step / (STEPS_PER_FLOOR * 2)), won, level: run.hero.level, bosses: run.stats.bosses, seed });
    }
    runs.sort((a, b) => b.floor - a.floor);
    const top = runs.slice(0, Math.ceil(per / 10));
    const wins = runs.filter(r => r.won).length;
    out[o] = {
      runs: per,
      wins,
      winRate: `${((100 * wins) / per).toFixed(1)}%`,
      luckiest10pct: { winRate: `${((100 * top.filter(r => r.won).length) / top.length).toFixed(0)}%`, avgBosses: (top.reduce((s, r) => s + r.bosses, 0) / top.length).toFixed(1), avgLevel: (top.reduce((s, r) => s + r.level, 0) / top.length).toFixed(1) },
      reachedFloor5: `${((100 * runs.filter(r => r.floor >= 5).length) / per).toFixed(1)}%`
    };
  }
  console.log("LUCKY", JSON.stringify(out, null, 1));
}, 600000);

// Abyss probe: how deep the bot gets with 0, 5, 10 and 20 Vanadium Plates (set ABYSS=1 to run).
it("abyss probe", async () => {
  loadLibrary();
  if (!process.env.ABYSS) return;
  const { recompute } = await import("../src/game/hero");
  const out: Record<string, unknown> = {};
  for (const plates of [0, 5, 10, 20]) {
    const depths: number[] = [];
    let wins = 0;
    for (let i = 0; i < 200; i++) {
      const o = (["warrior", "rogue", "mage", "cleric"] as const)[i % 4];
      const run = newRun(o, 5000 + i, "abyss");
      run.hero.plates = plates; recompute(run.hero); run.hero.f.hp = run.hero.f.maxHp;
      for (let g = 0; g < 20000 && run.scene.t !== "over"; g++) botStep(run);
      if (run.scene.t === "over" && run.scene.won) wins++;
      depths.push(Math.min(run.floor, 10));
    }
    const hist: Record<number, number> = {};
    for (const d of depths) hist[d] = (hist[d] ?? 0) + 1;
    out[`plates${plates}`] = { avgDepth: (depths.reduce((a, b) => a + b, 0) / depths.length).toFixed(2), wins, hist };
  }
  console.log("ABYSS", JSON.stringify(out));
}, 600000);
