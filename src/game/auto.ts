// Auto-battle: when a fight is already won on plain attacks alone, let the player skip it.
// We play the fight out in private copies first: the real dice (same random state) and a spread of
// other dice. Only if every one of them is a win, attacking only, is the button offered.
import { playRound } from "../engine/combat";
import { makeRng, type Rng } from "../engine/rng";
import type { Battle, Fighter } from "../engine/types";

const SIMS = 24;
const MAX_ROUNDS = 80;

const cloneFighter = (f: Fighter): Fighter => ({ ...f, statuses: { ...f.statuses }, flags: { ...f.flags }, persist: { ...f.persist }, items: { ...f.items } });

function simulate(b: Battle, seed: number): { won: boolean; hpLeft: number } {
  const c: Battle = { ...b, player: cloneFighter(b.player), enemy: cloneFighter(b.enemy), log: [], fx: [], rng: makeRng(seed) };
  let n = 0;
  while (!c.over && n++ < MAX_ROUNDS) playRound(c, "attack");
  return { won: c.over === "won", hpLeft: c.player.hp };
}

const cache = new WeakMap<Battle, { key: string; ok: boolean }>();

/** True if attacking every turn beats this foe: with the dice as they will fall, and with almost any others. */
export function autoBattleWins(b: Battle): boolean {
  if (b.over) return false;
  const key = `${b.round}:${b.player.hp}:${b.enemy.hp}`;
  const hit = cache.get(b);
  if (hit && hit.key === key) return hit.ok;
  let ok = false;
  try {
    const state = (b.rng as Rng).state?.() ?? 1;
    ok = simulate(b, state).won;
    for (let i = 1; ok && i <= SIMS; i++) {
      const r = simulate(b, (state ^ Math.imul(i, 0x9e3779b1)) >>> 0);
      // A safe margin, too: never offered for a fight you'd only scrape through.
      if (!r.won || r.hpLeft < Math.ceil(b.player.maxHp * 0.15)) ok = false;
    }
  } catch {
    ok = false;
  }
  cache.set(b, { key, ok });
  return ok;
}
