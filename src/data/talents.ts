// Talents. Stacks = rank (I, II, III); taking one again ranks it up.
import { isUnholy, wieldsHoly } from "../engine/combat";
import { other, st } from "../engine/statuses";
import type { HookDef } from "../engine/types";
import { applyStatus, heal, log, ping } from "./helpers";

import { STREAK_TALENTS } from "./streak";
import { BRUTE_TALENTS } from "./brutes";

const talent = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "talent", ...d });
const rank = (s: number, ...vals: number[]) => vals[Math.min(s, vals.length) - 1];

export const SHARED_TALENTS: HookDef[] = [
  talent({ id: "t_momentum", name: "Momentum", tags: ["Strike", "Tempo"], text: "+1 Damage per hit in a row without being hit, max 3 / 5 / 8",
    hooks: {
      onHit: (_b, ctx, s) => { ctx.attacker.flags["momentum"] = Math.min(rank(s, 3, 5, 8), (ctx.attacker.flags["momentum"] ?? 0) + 1); },
      modifyAttack: (_b, ctx) => { ctx.bonus += ctx.attacker.flags["momentum"] ?? 0; },
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
    hooks: { whenHit: (b, ctx, s) => { ping(b, ctx.attacker, rank(s, 1, 2, 4), "Retaliate"); } } }),
  talent({ id: "t_reaper", name: "Reaper", tags: ["Kill"], text: "Enemies at 2 / 3 / 5 HP or less die instantly",
    hooks: { onHit: (b, ctx, s) => { const t = rank(s, 2, 3, 5); if (ctx.defender.hp > 0 && ctx.defender.hp <= t && !ctx.defender.boss) { ctx.defender.hp = 0; log(b, "Reaper cuts it down."); } } } })
];

export const STATUS_TALENTS: HookDef[] = [
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
      if (["regen", "barrier", "might", "haste", "focus", "evade", "spikes", "ward", "charged", "kindled", "grounded", "smoulder_soul"].includes(status)) return amount;
      const used = self.flags["immune"] ?? 0;
      if (used < s) { self.flags["immune"] = used + 1; log(b, `Immunologist ignores ${status}.`); return 0; }
      return amount;
    } } })
];

export const GEAR_TALENTS: HookDef[] = [
  talent({ id: "t_spellweaver", name: "Spellweaver", tags: ["Arcane"], text: "Statuses your spell faces apply get +1 / +2 / +3 stacks",
    hooks: { onStatusApplied: (_b, self, t, status, _n, s) => { if (self.flags["casting"] && t !== self && !["stun", "shock"].includes(status)) t.statuses[status] = st(t, status) + s; } } }),
  talent({ id: "t_duelist", name: "Dual Wielder", tags: ["Tempo", "Strike"], text: "Your off-hand die deals +2 / +3 / +5",
    hooks: { modifyAttack: (_b, c, s) => { if (c.offhand) c.bonus += rank(s, 2, 3, 5); } } }),
  talent({ id: "t_juggernaut", name: "Juggernaut", tags: ["Guard"], text: "+1 / +2 / +3 Armor", hooks: { stats: (st_, s) => { st_.armor += s; } } }),
  talent({ id: "t_last_stand", name: "Last Stand", tags: ["Strike", "Blood"], text: "Below 30% HP, your hits deal +3 / +5 / +8",
    hooks: { modifyAttack: (_b, c, s) => { if (c.attacker.hp < c.attacker.maxHp * 0.3) c.bonus += rank(s, 3, 5, 8); } } }),
  talent({ id: "t_executioner", name: "Executioner", tags: ["Kill", "Crit"], text: "Crits against enemies under half HP deal +3 / +5 / +8",
    hooks: { modifyAttack: (_b, c, s) => { if (c.kind === "crit" && c.defender.hp < c.defender.maxHp / 2) c.bonus += rank(s, 3, 5, 8); } } }),
  talent({ id: "t_vigor", name: "Vigor", tags: ["Blood"], text: "+6 / +12 / +20 Max HP", hooks: { stats: (st_, s) => { st_.maxHp += rank(s, 6, 12, 20); } } })
];

export const MORE_TALENTS: HookDef[] = [
  talent({ id: "t_bloodrage", name: "Bloodrage", tags: ["Strike", "Blood"], text: "+1 Damage for every 20% / 15% / 10% of your HP that's missing",
    hooks: { modifyAttack: (_b, c, s) => { const step = rank(s, 0.2, 0.15, 0.1); c.bonus += Math.floor((1 - c.attacker.hp / c.attacker.maxHp) / step); } } }),
  talent({ id: "t_shield_wall", name: "Shield Wall", tags: ["Guard"], text: "Guarding also gives 2 / 3 / 5 Barrier",
    hooks: { onGuard: (b, f, s) => applyStatus(b, f, f, "barrier", rank(s, 2, 3, 5)) } }),
  talent({ id: "t_quick_hands", name: "Quick Hands", tags: ["Tempo"], text: "Start every fight with Haste (II: and Focus; III: and 2 Might)",
    hooks: { onFightStart: (b, f, s) => { applyStatus(b, f, f, "haste", 1); if (s >= 2) applyStatus(b, f, f, "focus", 1); if (s >= 3) applyStatus(b, f, f, "might", 2); } } }),
  talent({ id: "t_envenomed", name: "Envenomed Blades", tags: ["Poison"], text: "Your hits apply 1 / 2 / 3 Poison",
    hooks: { onHit: (b, c, s) => applyStatus(b, c.attacker, c.defender, "poison", s) } }),
  talent({ id: "t_kindler", name: "Kindler", tags: ["Burn", "Crit"], text: "Your crits apply 3 / 5 / 8 Burn",
    hooks: { onCrit: (b, c, s) => applyStatus(b, c.attacker, c.defender, "burn", rank(s, 3, 5, 8)) } }),
  talent({ id: "t_frostbite", name: "Frostbite", tags: ["Frost"], text: "On a 1 or 2: apply 1 / 2 / 3 Chill",
    hooks: { face: [{ group: "low", run: (b, c, s) => applyStatus(b, c.attacker, c.defender, "chill", s) }] } }),
  talent({ id: "t_static_charge", name: "Static Charge", tags: ["Storm"], text: "On a 5: apply Shock (II: on 4–5; III: on 3–5)",
    hooks: { face: [{ group: "any", run: (b, c, s) => { if (c.face <= 5 && c.face >= 6 - s) applyStatus(b, c.attacker, c.defender, "shock", 1); } }] } }),
  talent({ id: "t_malediction", name: "Malediction", tags: ["Hex"], text: "Each fight, the enemy starts with 1 / 2 / 3 Weak and Exposed",
    hooks: { onFightStart: (b, f, s) => { const e = other(b, f); applyStatus(b, f, e, "weak", s); applyStatus(b, f, e, "exposed", s); } } }),
  talent({ id: "t_gold_digger", name: "Gold Digger", tags: ["Gold"], text: "+3 / +6 / +10 Gold for every fight you win",
    hooks: { onFightEnd: (b, f, s) => { if (b.over === "won" && f.id === "player") f.gold += rank(s, 3, 6, 10); } } }),
  talent({ id: "t_thick_skin", name: "Thick Skin", tags: ["Guard", "Blood"], text: "Start every fight with 2 / 4 / 7 Barrier",
    hooks: { onFightStart: (b, f, s) => applyStatus(b, f, f, "barrier", rank(s, 2, 4, 7)) } }),
  talent({ id: "t_lucky_streak", name: "Lucky Streak", tags: ["Luck"], text: "Reroll your first 1 each fight (II: 1s and 2s; III: twice)",
    hooks: { modifyRoll: (b, f, r, s) => { const used = f.flags["streak"] ?? 0; if (used < (s >= 3 ? 2 : 1) && (r === 1 || (s >= 2 && r === 2))) { f.flags["streak"] = used + 1; const n = 1 + Math.floor(b.rng() * 6); log(b, `Lucky Streak rerolls ${r} → ${n}.`); return n; } return r; } } }),
  talent({ id: "t_hunters_mark", name: "Hunter's Mark", tags: ["Crit", "Hex"], text: "Your first hit each fight applies 2 / 3 / 4 Exposed",
    hooks: { onHit: (b, c, s) => { if (!c.attacker.flags["marked"]) { c.attacker.flags["marked"] = 1; applyStatus(b, c.attacker, c.defender, "exposed", rank(s, 2, 3, 4)); } } } }),
  talent({ id: "t_troll_blood", name: "Troll Blood", tags: ["Blood"], text: "Heal 1 / 2 / 3 at the end of every round",
    hooks: { onRoundEnd: (b, f, s) => { heal(b, f, s, "Troll Blood"); } } }),
  talent({ id: "t_overkill", name: "Overkill", tags: ["Kill", "Strike"], text: "Overkill carries into the next fight at 50% / 100% / 150%",
    hooks: { onKill: (b, c, s) => { if (c.defender.hp < 0 && !c.spec.cleave) b.carry += Math.round(-c.defender.hp * rank(s, 0.5, 1, 1.5)); } } }),
  talent({ id: "t_catalyst", name: "Catalyst", tags: ["Arcane", "Hex"], text: "Reactions you cause deal +25% / +50% / +100%",
    hooks: { reactionMult: (_b, _f, s) => 1 + rank(s, 0.25, 0.5, 1) } })
];

// ---------- Guard & shield talents ----------
const NEG = ["bleed", "burn", "poison", "chill", "shock", "weak", "exposed", "blind", "stun", "doom", "static", "soaked", "smoulder", "dazzled"] as const;
export const GUARD_TALENTS: HookDef[] = [
  talent({ id: "t_riposte", name: "Riposte", tags: ["Guard", "Strike"], text: "After you Guard, your next attack deals +3 / +5 / +8",
    hooks: {
      onGuard: (_b, f) => { f.flags["riposte"] = 1; },
      modifyAttack: (b, c, s) => { if (c.attacker.flags["riposte"] && !c.offhand) { c.attacker.flags["riposte"] = 0; c.bonus += rank(s, 3, 5, 8); log(b, "Riposte!"); } }
    } }),
  talent({ id: "t_shield_bash", name: "Shield Bash", tags: ["Guard", "Strike"], text: "Guarding deals 2 / 4 / 7 to the enemy (III: and Weakens it)",
    hooks: { onGuard: (b, f, s) => { const e = other(b, f); ping(b, e, rank(s, 2, 4, 7), "Shield Bash"); if (s >= 3) applyStatus(b, f, e, "weak", 1); } } }),
  talent({ id: "t_iron_will", name: "Iron Will", tags: ["Guard", "Hex"], text: "While Guarding, negative statuses can't land on you (II: Guarding also removes 1 of yours; III: 2)",
    hooks: {
      incomingStatus: (_b, self, status, n) => (self.flags["guarding"] && (NEG as readonly string[]).includes(status) ? 0 : n),
      onGuard: (b, f, s) => { let k = s - 1; for (const x of NEG) { if (k <= 0) break; if (st(f, x) > 0) { f.statuses[x] = 0; k--; log(b, `Iron Will shrugs off ${x}.`); } } }
    } }),
  talent({ id: "t_tortoise", name: "Tortoise", tags: ["Guard"], text: "+2 / +3 / +5 Armor while Guarding",
    hooks: { onGuard: (_b, f, s) => { f.flags["guardArmor"] = (f.flags["guardArmor"] ?? 0) + rank(s, 2, 3, 5); } } }),
  talent({ id: "t_vanguard", name: "Vanguard", tags: ["Guard", "Tempo"], text: "You count as Guarding in round 1 / rounds 1–2 / rounds 1–3 of every fight, even while attacking",
    hooks: { onRoundStart: (b, f, s) => { if (b.round <= s) f.flags["guarding"] = 1; } } }),
  talent({ id: "t_counter_stance", name: "Counter Stance", tags: ["Guard", "Strike"], text: "When you're hit while Guarding, gain 1 / 2 / 3 Might",
    hooks: { whenHit: (b, c, s) => { if (c.defender.flags["guarding"]) applyStatus(b, c.defender, c.defender, "might", s); } } })
];

// ---------- Holy talents ----------
export const HOLY_TALENTS: HookDef[] = [
  talent({ id: "t_absolution", name: "Absolution", tags: ["Holy", "Hex"], text: "Purify deals +1 / +2 / +3 per status stripped (II+: and lifts one negative status from you)", hooks: {} }), // combat.ts
  talent({ id: "t_zealotry", name: "Zealotry", tags: ["Holy", "Burn", "Hex"], text: "Each round, apply 1 Burn (II: and 1 Weak; III: and 1 Exposed)",
    hooks: { onRoundStart: (b, f, s) => { const e = other(b, f); applyStatus(b, f, e, "burn", 1); if (s >= 2) applyStatus(b, f, e, "weak", 1); if (s >= 3) applyStatus(b, f, e, "exposed", 1); } } }),
  talent({ id: "t_divine_favor", name: "Divine Favor", tags: ["Holy", "Guard"], text: "Start every fight with Ward (II: Ward returns every 4th round; III: every 3rd)",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1), onRoundStart: (b, f, s) => { const every = s >= 3 ? 3 : s >= 2 ? 4 : 0; if (every && b.round % every === 0) applyStatus(b, f, f, "ward", 1); } } }),
  talent({ id: "t_righteous", name: "Righteous Fury", tags: ["Holy", "Strike"], text: "Holy hits deal +2 / +3 / +5 more to Undead, vampires, Crimson foes and anything that curses or Dooms",
    hooks: { modifyAttack: (_b, c, s) => { if (wieldsHoly(c.attacker) && isUnholy(c.defender)) c.bonus += rank(s, 2, 3, 5); } } })
];

// ---------- Storm & arcane talents ----------
export const STORM_TALENTS: HookDef[] = [
  talent({ id: "t_live_wire", name: "Live Wire", tags: ["Storm", "Strike"], text: "Your hits apply 1 / 2 / 3 Static", hooks: { onHit: (b, c, s) => applyStatus(b, c.attacker, c.defender, "static", s) } }),
  talent({ id: "t_static_field", name: "Static Field", tags: ["Storm", "Thorns"], text: "When hit, the attacker gains 1 / 2 / 4 Static", hooks: { whenHit: (b, c, s) => applyStatus(b, c.defender, c.attacker, "static", rank(s, 1, 2, 4)) } }),
  talent({ id: "t_conductor", name: "Conductor", tags: ["Storm"], text: "Conduction deals +50% / +100% / +150%", hooks: {} }), // statuses.ts
  talent({ id: "t_boundless_static", name: "Boundless Static", rarity: "rare", tags: ["Storm"], text: "Rare. Static you apply has no cap", hooks: {} }), // statuses.ts
  talent({ id: "t_fire_within", name: "Fire Within", tags: ["Burn"], text: "Start every fight with 1 / 2 / 3 Smouldering Soul (you take 1 Burn a round; every action deals 5 Burn to the enemy)",
    hooks: { onFightStart: (b, f, s) => applyStatus(b, f, f, "smoulder_soul", s) } }),
  talent({ id: "t_light_feet", name: "Light Feet", tags: ["Tempo"], text: "+3% / +6% / +10% Dodge", hooks: { stats: (st_, s) => { st_.dodge += rank(s, 3, 6, 10); } } }),
  talent({ id: "t_slippery", name: "Slippery", tags: ["Tempo", "Strike"], text: "When you Dodge, gain 1 / 2 / 3 Might", hooks: { onDodge: (b, c, s) => applyStatus(b, c.defender, c.defender, "might", s) } }),
  talent({ id: "t_heavy_hitter", name: "Heavy Hitter", tags: ["Strike"], text: "Two-handed weapons deal +2 / +3 / +5",
    hooks: { modifyAttack: (_b, c, s) => { if (c.offhand ? c.attacker.offTwoHanded : c.attacker.twoHanded) c.bonus += rank(s, 2, 3, 5); } } }),
  talent({ id: "t_twin_strikes", name: "Twin Strikes", tags: ["Tempo", "Strike"], text: "While dual wielding, both dice deal +1 / +2 / +3",
    hooks: { modifyAttack: (_b, c, s) => { if (c.attacker.dualWield) c.bonus += s; } } }),
  talent({ id: "t_rhythm", name: "Blade Rhythm", tags: ["Tempo", "Strike"], text: "While dual wielding, when both dice hit in the same turn, gain 1 / 2 / 3 Might",
    hooks: { onHit: (b, c, s) => { const a = c.attacker; if (!a.dualWield) return; if (!c.offhand) a.flags["rhythm"] = b.round; else if (a.flags["rhythm"] === b.round) { a.flags["rhythm"] = 0; applyStatus(b, a, a, "might", s); } } } }),
  talent({ id: "t_overwhelm", name: "Overwhelm", tags: ["Arcane", "Hex"], text: "Your hits deal +1 / +2 / +3 for every different negative status on the enemy",
    hooks: { modifyAttack: (_b, c, s) => { c.bonus += s * NEG.filter(x => st(c.defender, x) > 0).length; } } })
];

export const TALENTS: HookDef[] = [...SHARED_TALENTS, ...STATUS_TALENTS, ...GEAR_TALENTS, ...MORE_TALENTS, ...GUARD_TALENTS, ...HOLY_TALENTS, ...STORM_TALENTS, ...STREAK_TALENTS, ...BRUTE_TALENTS];
