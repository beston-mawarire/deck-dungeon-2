import { applyStatus, heal } from "../engine/statuses";
import { log } from "../engine/registry";
import type { AttackCtx, Battle, FaceGroup, StatusId } from "../engine/types";

/** "On a <face>: ..." entry. */
export const on = (group: FaceGroup, run: (b: Battle, ctx: AttackCtx, stacks: number) => void) => ({ group, run });

/** Scale: base value at 1 stack, +per for each extra stack. */
export const scale = (stacks: number, base: number, per: number) => base + per * (stacks - 1);

/** Apply a status from the attacker to the defender, scaling with stacks. */
export const inflict = (status: StatusId, base: number, per: number) => (b: Battle, ctx: AttackCtx, s: number) =>
  applyStatus(b, ctx.attacker, ctx.defender, status, scale(s, base, per));

/** Give the attacker a (positive) status, scaling with stacks. */
export const gain = (status: StatusId, base: number, per: number) => (b: Battle, ctx: AttackCtx, s: number) =>
  applyStatus(b, ctx.attacker, ctx.attacker, status, scale(s, base, per));

export const gold = (b: Battle, who: { name: string; gold?: number }, n: number) => {
  who.gold = (who.gold ?? 0) + n;
  log(b, `${who.name} gains ${n} Gold.`);
};

export { applyStatus, heal, log };
