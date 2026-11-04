// A bot that walks the Crawl: it explores, meets what it finds (skipping risky rooms), and heads for the boss once it's ready.
import { idx, inside, isFloor, isSeenTile, pathTo, type FloorMap } from "../src/game/grid";
import { confirmRisk, gridStep, type Run } from "../src/game/run";
import { botStep } from "./bot";

const RISKY = ["vault", "altar", "shrine", "crimson_vault"];
const FIGHTS = ["fight", "elite", "champion", "unique", "nemesis", "goblin", "doppelganger", "crimson_elite"];

/** Seen floor tiles next to tiles not yet seen. */
function frontier(m: FloorMap): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!isFloor(m, x, y) || !isSeenTile(m, x, y)) continue;
    if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inside(m, x + dx, y + dy) && !m.seen[idx(m, x + dx, y + dy)])) out.push([x, y]);
  }
  return out;
}

/** Where the bot wants to go next, as a path (empty when it has nowhere to go). */
export function crawlTarget(run: Run, rushAfter = 2): [number, number][] {
  const m = run.grid!;
  const hp = run.hero.f.hp / run.hero.f.maxHp;
  const options: { p: [number, number][]; cost: number }[] = [];
  m.things.forEach(t => {
    if (t.done || !isSeenTile(m, t.x, t.y) || RISKY.includes(t.room)) return;
    const p = pathTo(m, t.x, t.y) ?? pathTo(m, t.x, t.y, true);
    if (!p) return;
    let cost = p.length;
    if (FIGHTS.includes(t.room)) cost += hp < 0.5 ? 30 : 3;
    if (t.room === "rest" && hp < 0.6) cost -= 20;
    if (t.room === "trapdoor") cost += m.explored >= m.depth * (2 + rushAfter) ? -50 : 25;
    options.push({ p, cost });
  });
  for (const f of frontier(m)) { const p = pathTo(m, f[0], f[1]); if (p && p.length) options.push({ p, cost: p.length + 6 }); }
  options.sort((a, b) => a.cost - b.cost);
  return options[0]?.p ?? [];
}

/** One bot action. */
export function crawlStep(run: Run, rushAfter = 2) {
  if (run.scene.t === "map") {
    const p = crawlTarget(run, rushAfter);
    for (const [x, y] of p) {
      const res = gridStep(run, x, y);
      if (!res.ok || res.entered || run.scene.t !== "map") return;
    }
    return;
  }
  if (run.scene.t === "confirm") return confirmRisk(run, true);
  botStep(run);
}
