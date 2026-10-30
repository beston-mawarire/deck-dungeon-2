// Balance probe: a reasonable bot plays many runs and prints win rates and where runs end.
import { it } from "vitest";
import { loadLibrary } from "../src/data";
import { RARITIES, type GearItem } from "../src/engine/types";
import { effectiveBase, equipItem, type Hero, reveal, slotsFor, upgradeCost, weaponDamage } from "../src/game/hero";
import {
  advance, availableFusions, buy, chooseEvent, chooseRoom, chooseTalent, combatAction, drinkPotion, eventOptionAvailable, finishLoot,
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
    combatAction(run, /Cataclysm|Heavy/.test(intent) && hpPct < 0.7 ? "guard" : "attack");
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
  else if (s.t === "rest") { if (!s.done) rest(run, Object.keys(h.curses).length && hpPct > 0.7 ? "cleanse" : "heal"); advance(run); }
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
