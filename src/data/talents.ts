// Talents. Stacks = rank (I, II, III); taking one again ranks it up.
import { other, st } from "../engine/statuses";
import type { ItemDef } from "../engine/types";
import { applyStatus, heal, log, on } from "./helpers";

const talent = (d: Omit<ItemDef, "kind" | "rarity"> & { rarity?: ItemDef["rarity"] }): ItemDef => ({ kind: "talent", rarity: "common", ...d });
const rank = (s: number, ...vals: number[]) => vals[Math.min(s, vals.length) - 1];

export const SHARED_TALENTS: ItemDef[] = [
  talent({ id: "t_momentum", name: "Momentum", tags: ["Strike", "Tempo"], text: "+1 Damage per hit in a row without being hit, max 3 / 5 / 8",
    hooks: {
      onHit: (_b, ctx, s) => { ctx.attacker.flags["momentum"] = Math.min(rank(s, 3, 5, 8), (ctx.attacker.flags["momentum"] ?? 0) + 1); },
      modifyKind: (_b, ctx) => { ctx.bonus += ctx.attacker.flags["momentum"] ?? 0; },
      whenHit: (_b, ctx) => { if (ctx.dealt > 0) ctx.defender.flags["momentum"] = 0; }
    } }),
  talent({ id: "t_hemophile", name: "Hemophile", tags: ["Bleed"], text: "Bleed you apply +1 / +2 / +3",
    hooks: { onStatusApplied: (_b, _self, t, status, _n, s) => { if (status === "bleed") t.statuses.bleed = st(t, "bleed") + s; } } }),
  talent({ id: "t_pyromaniac", name: "Pyromaniac", tags: ["Burn"], text: "Burn on enemies skips its first halving / two halvings / never halves",
    hooks: { onRoundStart: (b, f, s) => { const e = other(b, f); e.flags["burnNoHalve"] = s >= 3 || b.round <= s ? 1 : 0; } } }),
  talent({ id: "t_toxicologist", name: "Toxicologist", tags: ["Poison"], text: "Poison you apply +1 / +2 / +3 (III: crits apply Poison too)",
    hooks: {
      onStatusApplied: (_b, _self, t, status, _n, s) => { if (status === "poison") t.statuses.poison = st(t, "poison") + s; },
      onCrit: (b, ctx, s) => { if (s >= 3) applyStatus(b, ctx.attacker, ctx.defender, "poison", 2); }
    } }),
  talent({ id: "t_stalwart", name: "Stalwart", tags: ["Guard"], text: "Guarding heals 1 / 2 / 3 (III: and applies Weak)",
    hooks: { onGuard: (b, self, s) => { heal(b, self, s, "Stalwart"); if (s >= 3) applyStatus(b, self, other(b, self), "weak", 1); } } }),
  talent({ id: "t_retaliate", name: "Retaliate", tags: ["Thorns"], text: "When hit, deal 1 / 2 / 4 back",
    hooks: { whenHit: (b, ctx, s) => { const n = rank(s, 1, 2, 4); if (ctx.attacker.hp > 0) { ctx.attacker.hp -= n; log(b, `Retaliate: ${n} back.`); } } } }),
  talent({ id: "t_reaper", name: "Reaper", tags: ["Kill"], text: "Enemies at 2 / 3 / 5 HP or less die instantly",
    hooks: { onHit: (b, ctx, s) => { const t = rank(s, 2, 3, 5); if (ctx.defender.hp > 0 && ctx.defender.hp <= t && !ctx.defender.boss) { ctx.defender.hp = 0; log(b, "Reaper cuts it down."); } } } })
];

export const STATUS_TALENTS: ItemDef[] = [
  talent({ id: "t_pyrotechnics", name: "Pyrotechnics", tags: ["Burn", "Storm"], text: "Overload also Stuns (II: also 2 Exposed)",
    hooks: {} }), // handled inside the Overload reaction (statuses.ts)
  talent({ id: "t_cold_blooded", name: "Cold-Blooded", tags: ["Frost", "Guard"], text: "+2 / +3 / +4 Armor while the enemy is Chilled",
    hooks: { onRoundStart: (b, f, s) => { const bonus = st(other(b, f), "chill") > 0 ? s + 1 : 0; f.armor += bonus - (f.flags["coldBonus"] ?? 0); f.flags["coldBonus"] = bonus; },
             onFightEnd: (_b, f) => { f.armor -= f.flags["coldBonus"] ?? 0; f.flags["coldBonus"] = 0; } } }),
  talent({ id: "t_hexer", name: "Hexer", tags: ["Hex"], text: "Weak, Exposed and Blind you apply last 1 / 2 / 3 more rounds",
    hooks: { onStatusApplied: (_b, _self, t, status, _n, s) => { if (status === "weak" || status === "exposed" || status === "blind") t.statuses[status] = st(t, status) + s; } } }),
  talent({ id: "t_battle_trance", name: "Battle Trance", tags: ["Strike", "Tempo"], text: "Gaining Haste also gives 2 / 3 / 5 Might",
    hooks: { onStatusApplied: (b, self, t, status, _n, s) => { if (status === "haste" && t === self) applyStatus(b, self, self, "might", rank(s, 2, 3, 5), 1); } } }),
  talent({ id: "t_immunologist", name: "Immunologist", tags: ["Guard"], text: "Ignore the first 1 / 2 / 3 negative statuses each fight",
    hooks: { incomingStatus: (b, self, status, amount, s) => {
      if (["regen", "barrier", "might", "haste", "focus", "evade", "spikes", "ward"].includes(status)) return amount;
      const used = self.flags["immune"] ?? 0;
      if (used < s) { self.flags["immune"] = used + 1; log(b, `Immunologist ignores ${status}.`); return 0; }
      return amount;
    } } })
];

export const CLASS_TALENTS: ItemDef[] = [
  talent({ id: "t_overrun", name: "Overrun", cls: "king", tags: ["Strike"], text: "Carnage carried into the next fight +50% / +100% / +200%",
    hooks: { onKill: (b, ctx, s) => { if (ctx.defender.hp < 0) b.carnage += Math.round(-ctx.defender.hp * rank(s, 0.5, 1, 2)); } } }),
  talent({ id: "t_wrathful", name: "Wrathful", cls: "king", tags: ["Crit"], text: "Each crit gives +1 Damage for the fight, max 3 / 5 / no max",
    hooks: { onCrit: (b, ctx, s) => { const cap = rank(s, 3, 5, 999); if (st(ctx.attacker, "might") < cap) applyStatus(b, ctx.attacker, ctx.attacker, "might", 1, 1); } } }),
  talent({ id: "t_counterstroke", name: "Counterstroke", cls: "jack", tags: ["Thorns", "Bleed"], text: "A full block applies 2 / 3 / 5 Bleed",
    hooks: { whenHit: (b, ctx, s) => { if (ctx.defender.flags["blockedThisRound"]) applyStatus(b, ctx.defender, ctx.attacker, "bleed", rank(s, 2, 3, 5)); } } }),
  talent({ id: "t_lifeblood", name: "Lifeblood", cls: "queen", tags: ["Blood"], text: "Heal 1 / 2 / 3 on every Hit face (2–5)",
    hooks: { face: [on("any", (b, ctx, s) => { if (ctx.face >= 2 && ctx.face <= 5) heal(b, ctx.attacker, s, "Lifeblood"); })] } }),
  talent({ id: "t_regal_vigour", name: "Regal Vigour", cls: "queen", tags: ["Blood"], text: "Start each fight with 2 / 3 / 5 Regen",
    hooks: { onFightStart: (b, f, s) => applyStatus(b, f, f, "regen", rank(s, 2, 3, 5)) } }),
  talent({ id: "t_transfusion", name: "Transfusion", cls: "queen", tags: ["Blood", "Kill"], text: "Kills heal half the killing blow / all of it",
    hooks: { onKill: (b, ctx, s) => { heal(b, ctx.attacker, Math.ceil(ctx.dealt * (s >= 2 ? 1 : 0.5)), "Transfusion"); } } })
];

export const TALENTS: ItemDef[] = [...SHARED_TALENTS, ...STATUS_TALENTS, ...CLASS_TALENTS];
