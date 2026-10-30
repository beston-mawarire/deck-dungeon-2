import { it } from "vitest";
import { loadLibrary } from "../src/data";
import { RARITIES } from "../src/engine/types";
import { effectiveBase } from "../src/game/hero";
import { advance, chooseRoom, chooseTalent, combatAction, finishLoot, newRun, takeItem } from "../src/game/run";

it("balance probe", () => {
  loadLibrary();
  const deaths: Record<string, number> = {};
  const res: Record<string, { w: number; n: number; floors: number }> = {};
  for (let seed = 1; seed <= 400; seed++) {
    const o = (["warrior", "rogue", "mage", "cleric"] as const)[seed % 4];
    const run = newRun(o, seed);
    for (let g = 0; g < 5000 && run.scene.t !== "over"; g++) {
      const s = run.scene;
      if (s.t === "map") chooseRoom(run, run.choices.includes("rest") && run.hero.f.hp < run.hero.f.maxHp * 0.5 ? "rest" : run.choices.find(c => c !== "champion" && c !== "vault" && c !== "altar") ?? run.choices[0]);
      else if (s.t === "confirm") advance(run);
      else if (s.t === "combat") { if (run.hero.f.hp < 8 && run.hero.potions > 0) { run.hero.potions--; run.hero.f.hp += 12; } combatAction(run, "attack"); }
      else if (s.t === "loot" || s.t === "pick") {
        for (const it of [...s.items]) {
          const slot = effectiveBase(it).slot;
          const cur = slot === "main" ? run.hero.equip.main : slot === "off" ? run.hero.equip.off : slot === "armour" ? run.hero.equip.armour : run.hero.equip.trinket1;
          const better = !cur || RARITIES.indexOf(it.rarity) > RARITIES.indexOf(cur.rarity);
          takeItem(run, it.uid, better ? "equip" : "pack");
          if (run.scene.t !== s.t) break;
        }
        if (run.scene.t === "loot" || run.scene.t === "pick") finishLoot(run);
      }
      else if (s.t === "talent") chooseTalent(run, s.options[0]);
      else if (s.t === "rest") { s.done = true; run.hero.f.hp = Math.min(run.hero.f.maxHp, run.hero.f.hp + Math.round(run.hero.f.maxHp * 0.35)); advance(run); }
      else advance(run);
    }
    if (run.scene.t === "over" && !run.scene.won) { const k = `F${run.floor}${run.step >= 8 ? "boss" : ""}`; deaths[k] = (deaths[k] ?? 0) + 1; }
    const r = (res[o] ??= { w: 0, n: 0, floors: 0 });
    r.n++; r.floors += run.floor;
    if (run.scene.t === "over" && run.scene.won) r.w++;
  }
  console.log("DEATHS", JSON.stringify(deaths));
  console.log("BALANCE", JSON.stringify(Object.fromEntries(Object.entries(res).map(([k, v]) => [k, { win: Math.round(100 * v.w / v.n) + "%", avgFloor: (v.floors / v.n).toFixed(2) }]))));
});
