// Balance probe: a reasonable bot plays many runs and prints win rates and where runs end.
import { it } from "vitest";
import { loadLibrary } from "../src/data";
import { RARITIES, type GearItem } from "../src/engine/types";
import { effectiveBase, equipItem, type Hero, reveal, slotsFor, upgradeCost, weaponDamage } from "../src/game/hero";
import {
  advance, availableActions, availableFusions, buy, chooseEvent, chooseRoom, chooseTalent, combatAction, drinkPotion, eventOptionAvailable, finishLoot,
  forgeUpgrade, fuse, newRun, rest, type Run, STEPS_PER_FLOOR, takeItem
} from "../src/game/run";

const score = (it: GearItem) => {
  const b = effectiveBase(it);
  return RARITIES.indexOf(it.rarity) * 3 + it.level * 2 + (b.damage !== undefined ? weaponDamage(it) : 0) + (b.armor ?? 0) * 2;
};

function better(h: Hero, it: GearItem) {
  const slot = slotsFor(it)[0];
  const cur = h.equip[slot];
  return !cur || score(it) > score(cur);
}

export function botStep(run: Run) {
  const h = run.hero;
  const f = h.f;
  const s = run.scene;
  const hpPct = f.hp / f.maxHp;
  for (const it of [h.equip.main, h.equip.off, h.equip.armour, h.equip.trinket1, h.equip.trinket2, ...h.backpack]) if (it && h.scrolls > 0) reveal(h, it.uid);
  if (s.t === "map") {
    const c = run.choices;
    const prefer = hpPct < 0.5 ? ["rest", "event", "wooden", "iron", "shop", "fight"] : hpPct > 0.75 ? ["iron", "elite", "vault", "event", "wooden", "forge", "fight", "shop"] : ["iron", "wooden", "event", "forge", "fight", "shop", "rest"];
    const pick = prefer.find(p => c.includes(p as never)) ?? c[0];
    chooseRoom(run, pick as never);
  } else if (s.t === "confirm") {
    if (s.room === "vault" && hpPct > 0.75) chooseRoom(run, "vault"), run.scene.t === "confirm" && advance(run);
    else advance(run);
    if (run.scene.t === "confirm") advance(run);
  } else if (s.t === "combat") {
    const e = s.battle.enemy;
    const intent = e.moves?.[e.intent ?? 0]?.name ?? "";
    if (h.potions > 0 && hpPct < 0.35) drinkPotion(run);
    const can = availableActions(run);
    if (can.includes("warcry") && (e.boss || e.elite)) combatAction(run, "warcry");
    else combatAction(run, /Cataclysm|Heavy/.test(intent) && hpPct < 0.7 && can.includes("guard") ? "guard" : "attack");
  } else if (s.t === "loot" || s.t === "pick") {
    for (const it of [...s.items]) {
      if (better(h, it)) takeItem(run, it.uid, "equip");
      else takeItem(run, it.uid, "pack");
      if (run.scene.t !== s.t) break;
    }
    if (run.scene.t === "loot" || run.scene.t === "pick") finishLoot(run);
  } else if (s.t === "resplendent") {
    s.picked = Math.floor(run.rng() * s.cards.length);
    const card = s.cards[s.picked];
    if (card.kind === "scroll") { h.scrolls++; advance(run); }
    else { run.scene = { t: "pick", title: "", items: [card.item] }; }
  } else if (s.t === "talent") chooseTalent(run, s.options[0]);
  else if (s.t === "rest") { if (!s.done) rest(run, "heal"); advance(run); }
  else if (s.t === "shop") {
    s.stock.forEach((e, i) => {
      if (e.kind === "potion" && h.potions < 2) buy(run, i);
      if (e.kind === "item" && e.item && better(h, e.item) && buy(run, i) === null) equipItem(h, e.item);
    });
    advance(run);
  } else if (s.t === "forge") {
    for (const x of availableFusions(run)) fuse(run, x.out);
    for (let i = 0; i < 5 && h.equip.main && h.scrap >= upgradeCost(h.equip.main); i++) forgeUpgrade(run, h.equip.main.uid);
    advance(run);
  } else if (s.t === "event") {
    if (s.result) advance(run);
    else {
      const ok = s.ev.options.map((_, i) => i).filter(i => eventOptionAvailable(run, i));
      chooseEvent(run, ok[0] ?? 0);
      if (run.scene.t === "event" && !run.scene.result) advance(run);
    }
  } else advance(run);
}

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
