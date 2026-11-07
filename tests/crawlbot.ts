// A bot that walks the Crawl: it explores, meets what it finds (skipping risky rooms), and heads for the boss once it's ready.
import { idx, inside, isFloor, isSeenTile, pathTo, type FloorMap } from "../src/game/grid";
import { confirmRisk, dropDeeper, gridStep, takeRune, type Run } from "../src/game/run";
import { botStep } from "./bot";
import { spendAttr } from "../src/game/hero";

const RISKY = ["vault", "altar", "shrine", "crimson_vault"];
const FIGHTS = ["fight", "elite", "champion", "unique", "nemesis", "goblin", "doppelganger", "crimson_elite"];

/** Seen floor tiles next to tiles not yet seen. */
function frontier(m: FloorMap): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    if (!isFloor(m, x, y) || !isSeenTile(m, x, y) || m.things.some(t => !t.done && t.x === x && t.y === y)) continue;
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
    // A locked door is only worth walking to with a key.
    if (t.room === "locked" && (run.hero.f.persist["skelKeys"] ?? 0) <= 0) return;
    // A Merchant stays put: one visit is enough for the bot.
    if (t.room === "shop" && t.stock) return;
    const p = pathTo(m, t.x, t.y) ?? pathTo(m, t.x, t.y, true);
    if (!p) return;
    // Never walk through a Merchant to get somewhere (it sends you straight back).
    if (p.slice(0, -1).some(([x, y]) => m.things.some(o => !o.done && o.room === "shop" && o.x === x && o.y === y))) return;
    let cost = p.length;
    // Guards are fought for what they guard; foes you can walk round only when healthy.
    if (FIGHTS.includes(t.room)) cost += hp < 0.5 ? 30 : t.guard ? 3 : hp > 0.8 ? 6 : 25;
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
  // Spend attribute points as they come: Vitality and Strength, turn about.
  while ((run.hero.attrPoints ?? 0) > 0) spendAttr(run.hero, (run.hero.attrs?.vit ?? 0) > (run.hero.attrs?.str ?? 0) ? "str" : "vit");
  run.popup = undefined;
  if (run.runeOffer) takeRune(run, 0);
  if (run.scene.t === "map") {
    const p = crawlTarget(run, rushAfter);
    for (const [x, y] of p) {
      const res = gridStep(run, x, y);
      if (!res.ok || res.entered || run.scene.t !== "map") return;
    }
    return;
  }
  if (run.scene.t === "confirm") return confirmRisk(run, true);
  // The trapdoor's choice: the bot always goes deeper. Face Runes: it takes the first.
  if (run.scene.t === "extract") return dropDeeper(run);
  botStep(run);
}
