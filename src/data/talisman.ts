// The Talisman: sigils that sit outside your gear slots. Plain sigils carry one small passive;
// Set sigils carry their own passive and, worn together, unlock their set's bonuses (2, 3 and 4 pieces).
// A sigil's strength ("stacks") is the floor it was found on, so deeper sigils are stronger.
import type { HookDef, Tag } from "../engine/types";
import { applyStatus, heal, other, st } from "../engine/statuses";
import { on, ping } from "./helpers";

export interface SigilSet { id: string; name: string; icon: string; tags: Tag[]; pieces: string[]; bonuses: [number, string][] }

const piece = (id: string, name: string, tags: Tag[], text: string, hooks: HookDef["hooks"]): HookDef => ({ id, name, kind: "relic", tags, text, hooks });
const bonus = (id: string, name: string, tags: Tag[], text: string, hooks: HookDef["hooks"]): HookDef => ({ id, name, kind: "relic", tags, text, hooks });
const third = (n: number) => Math.max(1, Math.ceil(n / 3));

export const SET_PIECES: HookDef[] = [
  // ---- The Ember Court (Burn) ----
  piece("sc_ember_signet", "Ember Court Signet", ["Burn"], "Your hits apply {n/3} Burn", { onHit: (b, c, n) => { if (!c.offhand) applyStatus(b, c.attacker, c.defender, "burn", third(n)); } }),
  piece("sc_cinder_crown", "Cinder Crown", ["Burn"], "Start each fight: the enemy gets {n} Burn", { onFightStart: (b, f, n) => applyStatus(b, f, other(b, f), "burn", n) }),
  piece("sc_ash_sigil", "Ash Sigil", ["Burn", "Guard"], "When you're hit, the attacker gets {n/3} Burn", { whenHit: (b, c, n) => { if (c.dealt > 0) applyStatus(b, c.defender, c.attacker, "burn", third(n)); } }),
  piece("sc_flame_locket", "Flame Locket", ["Burn"], "Status damage +15%", { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 15; } }),
  // ---- The Frozen Saint (Frost, Holy) ----
  piece("sc_rime_rosary", "Rime Rosary", ["Frost"], "On a 2: apply {n} Chill", { face: [on(2, (b, c, n) => applyStatus(b, c.attacker, c.defender, "chill", n))] }),
  piece("sc_saints_veil", "Saint's Frozen Veil", ["Frost", "Holy"], "Start each fight with Ward", { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1) }),
  piece("sc_glacier_heart", "Glacier Heart", ["Frost", "Guard"], "+{n/3} Armor", { stats: (s, n) => { s.armor += third(n); } }),
  piece("sc_snow_censer", "Snow Censer", ["Frost", "Blood"], "Every round, heal {n/3}", { onRoundEnd: (b, f, n) => { if (f.hp > 0) heal(b, f, third(n), "Snow Censer"); } }),
  // ---- The Storm Choir (Storm) ----
  piece("sc_choir_bell", "Choir Bell", ["Storm"], "Your hits apply {n/3} Static", { onHit: (b, c, n) => { if (!c.offhand) applyStatus(b, c.attacker, c.defender, "static", third(n)); } }),
  piece("sc_thunder_psalm", "Thunder Psalm", ["Storm", "Crit"], "Your crits Shock", { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "shock", 1) }),
  piece("sc_conductor_ring", "Conductor's Ring", ["Storm", "Tempo"], "+5% Dodge", { stats: s => { s.dodge += 5; } }),
  piece("sc_storm_score", "Storm Score", ["Storm", "Arcane"], "Reactions deal +20%", { reactionMult: () => 1.2 }),
  // ---- The Red Tithe (Blood, Bleed) ----
  piece("sc_tithe_fang", "Tithe Fang", ["Bleed"], "Your crits apply {n} Bleed", { onCrit: (b, c, n) => applyStatus(b, c.attacker, c.defender, "bleed", n) }),
  piece("sc_tithe_chalice", "Tithe Chalice", ["Blood"], "Kills heal {n}", { onKill: (b, c, n) => { heal(b, c.attacker, n, "Tithe Chalice"); } }),
  piece("sc_tithe_ledger", "Tithe Ledger", ["Blood", "Gold"], "+{n} Max HP", { stats: (s, n) => { s.maxHp += n; } }),
  piece("sc_tithe_brand", "Tithe Brand", ["Bleed", "Strike"], "+{n/3} Damage", { stats: (s, n) => { s.damage += third(n); } }),
  // ---- The Iron Vigil (Guard) ----
  piece("sc_vigil_buckle", "Vigil Buckle", ["Guard"], "+{n/3} Armor", { stats: (s, n) => { s.armor += third(n); } }),
  piece("sc_vigil_oath", "Vigil Oath", ["Guard", "Blood"], "When you Guard, heal {n/3}", { onGuard: (b, f, n) => { heal(b, f, third(n), "Vigil Oath"); } }),
  piece("sc_vigil_horn", "Vigil Horn", ["Guard", "Strike"], "When you Guard, gain 1 Might", { onGuard: (b, f) => applyStatus(b, f, f, "might", 1) }),
  piece("sc_vigil_banner", "Vigil Banner", ["Guard"], "Start each fight with {n} Barrier", { onFightStart: (b, f, n) => applyStatus(b, f, f, "barrier", n) }),
  // ---- The Gambler's Hand (Luck, Crit, Gold) ----
  piece("sc_loaded_die", "Loaded Die", ["Luck", "Crit"], "+5% Crit chance", { stats: s => { s.critChance += 5; } }),
  piece("sc_lucky_coin", "Gambler's Coin", ["Gold", "Luck"], "+{n} Gold per fight won", { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.gold += n; } }),
  piece("sc_marked_card", "Marked Card", ["Luck", "Hex"], "On a 1: apply {n/3} Exposed", { face: [on(1, (b, c, n) => applyStatus(b, c.attacker, c.defender, "exposed", third(n)))] }),
  piece("sc_rabbit_paw", "Rabbit's Paw", ["Luck", "Tempo"], "Start each fight with Evade", { onFightStart: (b, f) => applyStatus(b, f, f, "evade", 1) })
];

export const SET_BONUSES: HookDef[] = [
  bonus("sb_ember_2", "Ember Court (2)", ["Burn"], "Status damage +25%", { stats: s => { s.dotAmp = (s.dotAmp ?? 0) + 25; } }),
  bonus("sb_ember_3", "Ember Court (3)", ["Burn"], "Your crits apply Burn equal to your Damage", { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "burn", Math.max(1, c.attacker.damage)) }),
  bonus("sb_ember_4", "Ember Court (4)", ["Burn"], "You deal 30% more to Burning enemies", { modifyAttack: (_b, c) => { if (st(c.defender, "burn") > 0) c.mult *= 1.3; } }),
  bonus("sb_frost_2", "Frozen Saint (2)", ["Frost"], "+15% Max HP", { stats: s => { s.maxHp = Math.round(s.maxHp * 1.15); } }),
  bonus("sb_frost_3", "Frozen Saint (3)", ["Frost", "Holy"], "Every 3rd round, gain Ward", { onRoundStart: (b, f) => { if (b.round % 3 === 0) applyStatus(b, f, f, "ward", 1); } }),
  bonus("sb_frost_4", "Frozen Saint (4)", ["Frost"], "Every round, an enemy with 5+ Chill is Stunned (once a fight)", { onRoundStart: (b, f) => { const e = other(b, f); if (!f.flags["sb_frost"] && st(e, "chill") >= 5) { f.flags["sb_frost"] = 1; applyStatus(b, f, e, "stun", 1); } } }),
  bonus("sb_storm_2", "Storm Choir (2)", ["Storm"], "Spell Amp +30%", { stats: s => { s.spellAmp += 30; } }),
  bonus("sb_storm_3", "Storm Choir (3)", ["Storm"], "On a 6: Shock", { face: [on(6, (b, c) => applyStatus(b, c.attacker, c.defender, "shock", 1))] }),
  bonus("sb_storm_4", "Storm Choir (4)", ["Storm"], "Reactions you cause deal double", { reactionMult: () => 2 }),
  bonus("sb_tithe_2", "Red Tithe (2)", ["Blood"], "Healing +30%", { healMult: () => 1.3 }),
  bonus("sb_tithe_3", "Red Tithe (3)", ["Bleed"], "Your hits apply 2 Bleed", { onHit: (b, c) => { if (!c.offhand) applyStatus(b, c.attacker, c.defender, "bleed", 2); } }),
  bonus("sb_tithe_4", "Red Tithe (4)", ["Blood"], "Your crits heal 10% of your Max HP", { onCrit: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.1), "Red Tithe"); } }),
  bonus("sb_vigil_2", "Iron Vigil (2)", ["Guard"], "You take 10% less damage", { stats: s => { s.dmgTaken = (s.dmgTaken ?? 0) - 10; } }),
  bonus("sb_vigil_3", "Iron Vigil (3)", ["Guard"], "Guarding gives Barrier equal to your Armor", { onGuard: (b, f) => applyStatus(b, f, f, "barrier", Math.max(1, f.armor)) }),
  bonus("sb_vigil_4", "Iron Vigil (4)", ["Guard", "Thorns"], "When you're hit while Guarding, the attacker takes the hit back", { whenHit: (b, c) => { if (c.defender.flags["guarding"] && (c.raw ?? 0) > 0) ping(b, c.attacker, c.raw ?? 0, "Iron Vigil"); } }),
  bonus("sb_gamble_2", "Gambler's Hand (2)", ["Luck"], "+8% Crit chance", { stats: s => { s.critChance += 8; } }),
  bonus("sb_gamble_3", "Gambler's Hand (3)", ["Luck"], "Your first 1 each fight becomes a 6", { modifyRoll: (_b, f, r) => { if (r === 1 && !f.flags["sb_gamble"]) { f.flags["sb_gamble"] = 1; return 6; } return r; } }),
  bonus("sb_gamble_4", "Gambler's Hand (4)", ["Luck", "Crit"], "Crits deal +60% damage", { stats: s => { s.critDmg = (s.critDmg ?? 0) + 60; } })
];

export const SIGIL_SETS: SigilSet[] = [
  { id: "ember", name: "The Ember Court", icon: "🔥", tags: ["Burn"], pieces: ["sc_ember_signet", "sc_cinder_crown", "sc_ash_sigil", "sc_flame_locket"], bonuses: [[2, "sb_ember_2"], [3, "sb_ember_3"], [4, "sb_ember_4"]] },
  { id: "frost", name: "The Frozen Saint", icon: "❄️", tags: ["Frost", "Holy"], pieces: ["sc_rime_rosary", "sc_saints_veil", "sc_glacier_heart", "sc_snow_censer"], bonuses: [[2, "sb_frost_2"], [3, "sb_frost_3"], [4, "sb_frost_4"]] },
  { id: "storm", name: "The Storm Choir", icon: "⚡", tags: ["Storm"], pieces: ["sc_choir_bell", "sc_thunder_psalm", "sc_conductor_ring", "sc_storm_score"], bonuses: [[2, "sb_storm_2"], [3, "sb_storm_3"], [4, "sb_storm_4"]] },
  { id: "tithe", name: "The Red Tithe", icon: "🩸", tags: ["Blood", "Bleed"], pieces: ["sc_tithe_fang", "sc_tithe_chalice", "sc_tithe_ledger", "sc_tithe_brand"], bonuses: [[2, "sb_tithe_2"], [3, "sb_tithe_3"], [4, "sb_tithe_4"]] },
  { id: "vigil", name: "The Iron Vigil", icon: "🛡️", tags: ["Guard"], pieces: ["sc_vigil_buckle", "sc_vigil_oath", "sc_vigil_horn", "sc_vigil_banner"], bonuses: [[2, "sb_vigil_2"], [3, "sb_vigil_3"], [4, "sb_vigil_4"]] },
  { id: "gamble", name: "The Gambler's Hand", icon: "🎲", tags: ["Luck", "Crit"], pieces: ["sc_loaded_die", "sc_lucky_coin", "sc_marked_card", "sc_rabbit_paw"], bonuses: [[2, "sb_gamble_2"], [3, "sb_gamble_3"], [4, "sb_gamble_4"]] }
];
export const setOfPiece = (id: string) => SIGIL_SETS.find(s => s.pieces.includes(id));
