// Relics. Text matches the Library doc; "(+x)" is what each extra stack adds.
import { loseHp, other, st } from "../engine/statuses";
import type { HookDef } from "../engine/types";
import { applyStatus, gain, gold, heal, inflict, log, on, ping, scale } from "./helpers";

const relic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "relic", ...d });

// ---------- General relics ----------
export const GENERAL: HookDef[] = [
  relic({ id: "signet_ring", name: "Signet Ring", rarity: "common", tags: ["Crit"], text: "Crits deal +3", hooks: { onCrit: (b, ctx) => { loseHp(b, ctx.defender, 3); log(b, "Signet Ring: +3."); } } }),
  relic({ id: "parrying_dagger", name: "Parrying Dagger", rarity: "uncommon", tags: ["Guard", "Thorns"], text: "A full block hits back for your Armor",
    hooks: { whenHit: (b, ctx) => { if (ctx.defender.flags["blockedNow"]) { const n = ctx.defender.armor; loseHp(b, ctx.attacker, n); log(b, `Parrying Dagger: ${n} back.`); } } } }),
  relic({ id: "chalice", name: "Chalice", rarity: "common", tags: ["Blood", "Kill"], text: "Kills heal 2", hooks: { onKill: (b, ctx) => { heal(b, ctx.attacker, 2, "Chalice"); } } }),
  relic({ id: "gamblers_glove", name: "Gambler's Glove", rarity: "rare", tags: ["Luck"], text: "Once per Resplendent chest, after your pick flips you may give it up and take another card", hooks: {} }),
  relic({ id: "four_leaf_clover", name: "Four-Leaf Clover", rarity: "uncommon", tags: ["Luck"], text: "+3% Legendary odds on every Resplendent card (+3%)", hooks: {} }),
  relic({ id: "transmuter", name: "Transmuter's Crucible", rarity: "rare", tags: ["Luck", "Arcane"], text: "At a Forge, turn a Common item into a Legendary of the same kind for 3 Starmetal", hooks: {} }),
  relic({ id: "skeleton_key", name: "Skeleton Key", rarity: "uncommon", tags: ["Luck"], text: "Iron chests are never Mimics and give 1 of 2", hooks: {} })
];

// ---------- Batch 1 (implemented subset) ----------
export const BATCH1: HookDef[] = [
  relic({ id: "whetstone", name: "Whetstone", rarity: "common", tags: ["Strike"], text: "+1 Damage (+1)", hooks: { modifyAttack: (_b, ctx, s) => { ctx.bonus += s; } } }),
  relic({ id: "iron_plate", name: "Iron Plate", rarity: "common", tags: ["Guard"], text: "+1 Armor (+1)", hooks: { onFightStart: (_b, f, s) => { f.flags["plate"] = s; f.armor += s; }, onFightEnd: (_b, f) => { f.armor -= f.flags["plate"] ?? 0; f.flags["plate"] = 0; } } }),
  relic({ id: "serrated_edge", name: "Serrated Edge", rarity: "common", tags: ["Bleed"], text: "Your hits apply 1 Bleed (+1)", hooks: { onHit: inflict("bleed", 1, 1) } }),
  relic({ id: "tinderbox", name: "Tinderbox", rarity: "common", tags: ["Burn"], text: "Your first hit each fight applies 3 Burn (+2)",
    hooks: { onHit: (b, ctx, s) => { if (!ctx.attacker.flags["tinder"]) { ctx.attacker.flags["tinder"] = 1; applyStatus(b, ctx.attacker, ctx.defender, "burn", scale(s, 3, 2)); } } } }),
  relic({ id: "bellows", name: "Bellows", rarity: "common", tags: ["Burn"], text: "Burn you apply +1 (+1)",
    hooks: { onStatusApplied: (_b, _self, target, status, _n, s) => { if (status === "burn") target.statuses.burn = st(target, "burn") + s; } } }),
  relic({ id: "nightshade_vial", name: "Nightshade Vial", rarity: "common", tags: ["Poison"], text: "Start each fight by applying 2 Poison (+2)",
    hooks: { onFightStart: (b, f, s) => applyStatus(b, f, other(b, f), "poison", scale(s, 2, 2)) } }),
  relic({ id: "spiked_bracer", name: "Spiked Bracer", rarity: "common", tags: ["Thorns"], text: "When hit, deal 1 back (+1)",
    hooks: { whenHit: (b, ctx, s) => { ping(b, ctx.attacker, s, "Spiked Bracer"); } } }),
  relic({ id: "coin_purse", name: "Coin Purse", rarity: "common", tags: ["Gold"], text: "+3 Gold per fight (+3)", hooks: { onFightEnd: (b, f, s) => { if (b.over === "won" && f.id === "player") gold(b, f, 3 * s); } } }),
  relic({ id: "bandage_roll", name: "Bandage Roll", rarity: "common", tags: ["Blood"], text: "Heal 2 after each fight (+2)", hooks: { onFightEnd: (b, f, s) => { if (b.over === "won") heal(b, f, 2 * s, "Bandage Roll"); } } }),
  relic({ id: "keen_eye", name: "Keen Eye", rarity: "common", tags: ["Crit"], text: "Your first attack each fight crits on 5–6 (+1 attack)",
    hooks: { modifyAttack: (_b, ctx, s) => { const used = ctx.attacker.flags["keen"] ?? 0; if (used < s) { ctx.attacker.flags["keen"] = used + 1; if (ctx.face === 5) { ctx.kind = "crit"; ctx.mult = 2; ctx.ignoreArmor = true; } } } } }),
  relic({ id: "rabbits_foot", name: "Rabbit's Foot", rarity: "common", tags: ["Luck"], text: "Reroll your first 1 each fight (+1 reroll)",
    hooks: { modifyRoll: (b, f, r, s) => { const used = f.flags["rabbit"] ?? 0; if (r === 1 && used < s) { f.flags["rabbit"] = used + 1; const n = 1 + Math.floor(b.rng() * 6); log(b, `Rabbit's Foot rerolls the 1 → ${n}.`); return n; } return r; } } }),
  relic({ id: "leech_fang", name: "Leech Fang", rarity: "common", tags: ["Blood", "Bleed"], text: "Heal 1 whenever an enemy takes Bleed damage (+1)",
    hooks: { onRoundEnd: (b, f, s) => { if (st(other(b, f), "bleed") > 0) heal(b, f, s, "Leech Fang"); } } }),
  relic({ id: "executioners_axe", name: "Executioner's Axe", rarity: "uncommon", tags: ["Kill", "Strike"], text: "Double damage to enemies under 25% HP (+10% threshold)",
    hooks: { modifyAttack: (_b, ctx, s) => { if (ctx.defender.hp < ctx.defender.maxHp * (0.25 + 0.1 * (s - 1))) ctx.mult *= 2; } } }),
  relic({ id: "shock_coil", name: "Shock Coil", rarity: "uncommon", tags: ["Crit", "Storm"], text: "Crits apply Shock (2 stacks: also Weak)",
    hooks: { onCrit: (b, ctx, s) => { applyStatus(b, ctx.attacker, ctx.defender, "shock", 1); if (s >= 2) applyStatus(b, ctx.attacker, ctx.defender, "weak", 2); } } }),
  relic({ id: "bloodletter", name: "Bloodletter", rarity: "uncommon", tags: ["Bleed", "Crit"], text: "Crits apply Bleed equal to your Damage (+50%)",
    hooks: { onCrit: (b, ctx, s) => applyStatus(b, ctx.attacker, ctx.defender, "bleed", Math.round(ctx.attacker.damage * (1 + 0.5 * (s - 1))) || 1) } }),
  relic({ id: "vampire_cloak", name: "Vampire Cloak", rarity: "uncommon", tags: ["Blood"], text: "20% of damage you deal heals you (+10%)",
    hooks: { onHit: (b, ctx, s) => { heal(b, ctx.attacker, Math.floor(ctx.dealt * (0.2 + 0.1 * (s - 1))), "Vampire Cloak"); } } }),
  relic({ id: "hydra_fang", name: "Hydra Fang", rarity: "rare", tags: ["Poison", "Strike"], text: "Your hits deal +1 per 2 Poison on the enemy",
    hooks: { modifyAttack: (_b, ctx) => { ctx.bonus += Math.floor(st(ctx.defender, "poison") / 2); } } }),
  relic({ id: "cinder_crown", name: "Cinder Crown", rarity: "rare", tags: ["Burn", "Crit"], text: "Crits double the enemy's Burn",
    hooks: { onCrit: (b, ctx) => { const n = st(ctx.defender, "burn"); if (n) { ctx.defender.statuses.burn = n * 2; log(b, `Cinder Crown: Burn doubles to ${n * 2}.`); } } } }),
  relic({ id: "r_fortress_heart", name: "Fortress Heart", rarity: "rare", tags: ["Guard"], text: "No Armor cap; Guard triples Armor instead of doubling it", hooks: {} }),
  relic({ id: "hemorrhage", name: "Hemorrhage", rarity: "rare", tags: ["Bleed"], text: "Bleed on enemies never fades",
    hooks: { onFightStart: (b, f) => { other(b, f).flags["bleedNoFade"] = 1; } } }),
  relic({ id: "weighted_die", name: "Weighted Die", rarity: "rare", tags: ["Luck"], text: "Once per fight, choose your roll (+1 per fight)",
    hooks: { modifyRoll: (b, f, r, s) => { const used = f.flags["weighted"] ?? 0; if (used < s && r <= 2) { f.flags["weighted"] = used + 1; log(b, "Weighted Die: you choose a 6."); return 6; } return r; } } })
];

// ---------- Batch 2: face relics ----------
export const FACE_RELICS: HookDef[] = [
  relic({ id: "viper_fang", name: "Viper Fang", rarity: "common", tags: ["Poison"], text: "On a 3: apply 3 Poison (+2)", hooks: { face: [on(3, inflict("poison", 3, 2))] } }),
  relic({ id: "flint", name: "Flint", rarity: "common", tags: ["Burn"], text: "On a 5: apply 3 Burn (+2)", hooks: { face: [on(5, inflict("burn", 3, 2))] } }),
  relic({ id: "frost_shard", name: "Frost Shard", rarity: "common", tags: ["Frost"], text: "On a 2: apply 2 Chill (+1)", hooks: { face: [on(2, inflict("chill", 2, 1))] } }),
  relic({ id: "static_charm", name: "Static Charm", rarity: "common", tags: ["Storm"], text: "On a 4: apply Shock (also on a 3)",
    hooks: { face: [on("mid", (b, ctx, s) => { if (ctx.face === 4 || s >= 2) applyStatus(b, ctx.attacker, ctx.defender, "shock", 1); })] } }),
  relic({ id: "lucky_penny", name: "Lucky Penny", rarity: "common", tags: ["Gold", "Luck"], text: "On a 1: gain 3 Gold instead of grazing (+3)",
    hooks: { face: [on(1, (b, ctx, s) => { ctx.noDamage = true; gold(b, ctx.attacker, 3 * s); })] } }),
  relic({ id: "hand_mirror", name: "Hand Mirror", rarity: "common", tags: ["Hex"], text: "On a 2: apply 2 Exposed (+1)", hooks: { face: [on(2, inflict("exposed", 2, 1))] } }),
  relic({ id: "tonic_flask", name: "Tonic Flask", rarity: "common", tags: ["Blood"], text: "On a 4: gain 2 Regen (+1)", hooks: { face: [on(4, gain("regen", 2, 1))] } }),
  relic({ id: "buckler", name: "Buckler", rarity: "common", tags: ["Guard"], text: "On a 1: gain 3 Barrier (+3)", hooks: { face: [on(1, gain("barrier", 3, 3))] } }),
  relic({ id: "odd_charm", name: "Odd Charm", rarity: "uncommon", tags: ["Strike"], text: "Odd faces deal +2 Damage (+2)", hooks: { face: [on("odd", (_b, ctx, s) => { ctx.bonus += 2 * s; })] } }),
  relic({ id: "even_charm", name: "Even Charm", rarity: "uncommon", tags: ["Bleed"], text: "Even faces apply 2 Bleed (+1)", hooks: { face: [on("even", inflict("bleed", 2, 1))] } }),
  relic({ id: "nudging_stone", name: "Nudging Stone", rarity: "uncommon", tags: ["Luck"], text: "Once per round, turn your roll up or down by 1 (+1 per round)",
    hooks: {
      onRoundStart: (_b, f) => { f.flags["nudge"] = 0; },
      // Auto-play: nudge a 5 up to a crit, or a 1 up out of a graze.
      modifyRoll: (b, f, r, s) => { const used = f.flags["nudge"] ?? 0; if (used < s && (r === 5 || r === 1)) { f.flags["nudge"] = used + 1; log(b, `Nudging Stone: ${r} → ${r + 1}.`); return r + 1; } return r; }
    } }),
  relic({ id: "sixth_sense", name: "Sixth Sense", rarity: "uncommon", tags: ["Crit", "Hex"], text: "Your 6 no longer doubles; instead it Stuns and applies 3 Doom",
    hooks: { face: [on(6, (b, ctx) => { ctx.kind = "hit"; ctx.mult = 1; ctx.ignoreArmor = false; applyStatus(b, ctx.attacker, ctx.defender, "stun", 1); applyStatus(b, ctx.attacker, ctx.defender, "doom", 3); })] } }),
];

// ---------- Batch 2: status relics ----------
const negate = (status: string) => (_b: unknown, _self: unknown, s: string, amount: number) => (s === status ? 0 : amount);

export const STATUS_RELICS: HookDef[] = [
  relic({ id: "antidote_ring", name: "Antidote Ring", rarity: "common", tags: ["Poison", "Guard"], text: "Poison on you halves each round",
    hooks: { onRoundEnd: (_b, f) => { f.statuses.poison = Math.floor(st(f, "poison") / 2); } } }),
  relic({ id: "fire_ward", name: "Fire Ward", rarity: "common", tags: ["Burn", "Guard"], text: "Immune to Burn (stacked: Burn aimed at you hits the enemy instead)",
    hooks: { incomingStatus: (b, self, s, amount, stacks) => { if (s !== "burn") return amount; if (stacks >= 2) applyStatus(b, self, other(b, self), "burn", amount); return 0; } } }),
  relic({ id: "thermal_coat", name: "Thermal Coat", rarity: "common", tags: ["Frost", "Guard"], text: "Immune to Chill", hooks: { incomingStatus: negate("chill") } }),
  relic({ id: "grounding_rod", name: "Grounding Rod", rarity: "common", tags: ["Storm", "Guard"], text: "Shock on you becomes 2 Barrier",
    hooks: { incomingStatus: (b, self, s, amount) => { if (s !== "shock") return amount; self.statuses.barrier = st(self, "barrier") + 2; log(b, "Grounding Rod: Shock becomes 2 Barrier."); return 0; } } }),
  relic({ id: "alchemists_catalyst", name: "Alchemist's Catalyst", rarity: "uncommon", tags: ["Hex"], text: "Reactions deal +50% (+50%)", hooks: { reactionMult: (_b, _f, s) => 1 + 0.5 * s } }),
  relic({ id: "kindling_oil", name: "Kindling Oil", rarity: "uncommon", tags: ["Burn", "Poison"], text: "Combustion doesn't clear Poison", hooks: {} }),
  relic({ id: "frostbite_needle", name: "Frostbite Needle", rarity: "uncommon", tags: ["Frost", "Bleed"], text: "Bleed ticks twice on Chilled enemies", hooks: {} }),
  relic({ id: "conductor", name: "Conductor", rarity: "uncommon", tags: ["Storm"], text: "Shock lasts for two hits instead of one",
    hooks: { onStatusApplied: (_b, _self, target, status) => { if (status === "shock") target.statuses.shock = 2; } } }),
  relic({ id: "purifying_salt", name: "Purifying Salt", rarity: "uncommon", tags: ["Guard"], text: "At the start of each round, remove 1 negative status from yourself (+1)",
    hooks: { onRoundStart: (b, f, s) => {
      const bad = (["doom", "poison", "bleed", "burn", "chill", "shock", "weak", "exposed", "blind", "stun"] as const).filter(x => st(f, x) > 0).slice(0, s);
      for (const x of bad) { f.statuses[x] = 0; log(b, `Purifying Salt removes ${x}.`); }
    } } }),
  relic({ id: "mirror_of_spite", name: "Mirror of Spite", rarity: "rare", tags: ["Hex"], text: "Negative statuses put on you are copied onto the enemy",
    hooks: { incomingStatus: (b, self, s, amount) => {
      const neg = ["bleed", "burn", "poison", "chill", "shock", "weak", "exposed", "blind", "stun", "doom"].includes(s);
      if (neg && !self.flags["mirroring"]) { self.flags["mirroring"] = 1; applyStatus(b, self, other(b, self), s, amount); self.flags["mirroring"] = 0; }
      return amount;
    } } }),
  relic({ id: "plague_bearer", name: "Plague Bearer", rarity: "rare", tags: ["Poison", "Hex"], text: "Your hits deal +1 for each different negative status on the enemy",
    hooks: { modifyAttack: (_b, ctx) => { ctx.bonus += (["bleed", "burn", "poison", "chill", "shock", "weak", "exposed", "blind", "stun", "doom"] as const).filter(x => st(ctx.defender, x) > 0).length; } } }),
  relic({ id: "doomsayers_bell", name: "Doomsayer's Bell", rarity: "rare", tags: ["Hex", "Kill"], text: "Apply 1 Doom to the enemy every round (+1)",
    hooks: { onRoundEnd: (b, f, s) => applyStatus(b, f, other(b, f), "doom", s) } })
];

// ---------- Batch 3 ----------
export const BATCH3: HookDef[] = [
  relic({ id: "battle_standard", name: "Battle Standard", rarity: "common", tags: ["Strike"], text: "Start each fight with 1 Might (+1)", hooks: { onFightStart: (b, f, s) => applyStatus(b, f, f, "might", s) } }),
  relic({ id: "sulfur_pouch", name: "Sulfur Pouch", rarity: "uncommon", tags: ["Burn", "Poison"], text: "Burn you apply to a Poisoned enemy gets +2 (+2)",
    hooks: { onStatusApplied: (_b, _self, t, status, _n, s) => { if (status === "burn" && st(t, "poison") > 0) t.statuses.burn = st(t, "burn") + 2 * s; } } }),
  relic({ id: "glacier_heart", name: "Glacier Heart", rarity: "uncommon", tags: ["Frost", "Strike"], text: "Your hits deal +2 to Chilled enemies (+2)",
    hooks: { modifyAttack: (_b, c, s) => { if (st(c.defender, "chill") > 0) c.bonus += 2 * s; } } }),
  relic({ id: "lightning_rod", name: "Lightning Rod", rarity: "common", tags: ["Storm", "Hex"], text: "Shock you apply also applies 1 Exposed (+1)",
    hooks: { onStatusApplied: (_b, _self, t, status, _n, s) => { if (status === "shock") t.statuses.exposed = st(t, "exposed") + s; } } }),
  relic({ id: "war_drum", name: "War Drum", rarity: "uncommon", tags: ["Tempo"], text: "Every 3rd round, gain Haste (2 stacks: every 2nd)",
    hooks: { onRoundStart: (b, f, s) => { if (b.round % (s >= 2 ? 2 : 3) === 0) applyStatus(b, f, f, "haste", 1); } } }),
  relic({ id: "blood_moon", name: "Blood Moon", rarity: "rare", tags: ["Blood", "Kill"], text: "Kills heal 10% of your Max HP (+5%)",
    hooks: { onKill: (b, c, s) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * (0.05 + 0.05 * s)), "Blood Moon"); } } }),
  relic({ id: "trophy_belt", name: "Trophy Belt", rarity: "common", tags: ["Kill"], text: "+1 Gold per kill for every Elite you've slain this run",
    hooks: { onKill: (_b, c) => { if (c.defender.elite) c.attacker.persist["eliteKills"] = (c.attacker.persist["eliteKills"] ?? 0) + 1; c.attacker.gold += c.attacker.persist["eliteKills"] ?? 0; } } })
];

export const RELICS: HookDef[] = [...GENERAL, ...BATCH1, ...FACE_RELICS, ...STATUS_RELICS, ...BATCH3];
