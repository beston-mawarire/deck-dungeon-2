import { log } from "../engine/registry";
import { applyStatus, heal, loseHp, other, st } from "../engine/statuses";
import type { AttackCtx, Battle, FaceGroup, FaceSpec, Fighter, StatusId } from "../engine/types";

/** "On a <face>: ..." entry. */
export const on = (group: FaceGroup, run: (b: Battle, ctx: AttackCtx, stacks: number) => void) => ({ group, run });

/** Scale: base value at 1 stack, +per for each extra stack. */
export const scale = (stacks: number, base: number, per: number) => base + per * (stacks - 1);

/** Apply a status from the attacker to the defender, scaling with stacks. */
export const inflict = (status: StatusId, base: number, per: number) => (b: Battle, ctx: AttackCtx, s: number) =>
  applyStatus(b, ctx.attacker, ctx.defender, status, scale(s, base, per));

/** Give the attacker a status, scaling with stacks. */
export const gain = (status: StatusId, base: number, per: number) => (b: Battle, ctx: AttackCtx, s: number) =>
  applyStatus(b, ctx.attacker, ctx.attacker, status, scale(s, base, per));

export const gold = (b: Battle, who: Fighter, n: number) => {
  who.gold += n;
  log(b, `${who.name} gains ${n} Gold.`);
};

/** Damage that skips Armor (thorns, retaliation, item procs). */
export const ping = (b: Battle, target: Fighter, n: number, why: string) => {
  if (n <= 0 || target.hp <= 0) return;
  const lost = loseHp(b, target, n);
  log(b, `${why}: ${target.name} takes ${lost}.`);
};

// Face builders for weapon dice.
export const MISS: FaceSpec = { kind: "miss" };
export const GRAZE: FaceSpec = { kind: "graze" };
export const HIT: FaceSpec = { kind: "hit" };
export const CRIT: FaceSpec = { kind: "crit" };
export const spell = (name: string, kind: FaceSpec["kind"], run: FaceSpec["run"]): FaceSpec => ({ kind, name, run });
/** A spell from an Arcane weapon: ignores Armor. */
export const cast = (name: string, kind: FaceSpec["kind"], run: FaceSpec["run"]): FaceSpec => ({ kind, name, run, magic: true });
export const hex = (status: StatusId, n: number) => (b: Battle, ctx: AttackCtx) => applyStatus(b, ctx.attacker, ctx.defender, status, n);
export const self = (status: StatusId, n: number) => (b: Battle, ctx: AttackCtx) => applyStatus(b, ctx.attacker, ctx.attacker, status, n);

/** How deep the run is (set by the run each fight). Early-game defensive effects scale with it. */
export const depth = (f: Fighter) => f.persist["floor"] ?? 1;

export { applyStatus, heal, log, loseHp, other, st };
