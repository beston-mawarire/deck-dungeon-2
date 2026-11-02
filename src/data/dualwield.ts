// Dual wielding, part two: one-handed weapons that work in either hand (Common to Legendary),
// and talents and relics that reward holding a weapon in each hand. Everything joins the pool at normal odds.
import type { GearBase, HookDef } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, log, ping, spell, hex } from "./helpers";

const weapon = (d: Omit<GearBase, "kind" | "slot">): GearBase => ({ kind: "weapon", slot: "main", ...d });
const legendary = (d: Omit<GearBase, "rarity">): GearBase => ({ ...d, rarity: "legendary" });
const talent = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "talent", ...d });
const relic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "relic", ...d });
const rank = (s: number, ...vals: number[]) => vals[Math.min(s, vals.length) - 1];

// ---------- Weapons that work in either hand ----------
export const DUAL_WEAPONS: GearBase[] = [
  // Any rarity
  weapon({ id: "w_shortsword", name: "Shortsword", tags: ["Strike", "Tempo"], damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "Light and quick. Works in the off-hand.", hooks: {} }),
  weapon({ id: "w_hatchet", name: "Hatchet", tags: ["Strike", "Bleed"], damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Hack", "crit", hex("bleed", 2))], text: "A 6 Hacks (2 Bleed). Works in the off-hand.", hooks: {} }),
  weapon({ id: "w_sai", name: "Sai", tags: ["Guard", "Tempo"], damage: 3, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "Catches blades: while dual wielding, +1 Armor. Works in the off-hand.",
    hooks: { stats: (s, _n, f) => { if (f.dualWield) s.armor += 1; } } }),
  // Uncommon and up
  weapon({ id: "w_moon_sickle", name: "Moon Sickle", minItemRarity: "uncommon", tags: ["Bleed", "Tempo"], damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "While dual wielding, your off-hand hits apply 1 Bleed. Works in the off-hand.",
    hooks: { onHit: (b, c) => { if (c.offhand && c.attacker.dualWield) applyStatus(b, c.attacker, c.defender, "bleed", 1); } } }),
  weapon({ id: "d_parrying_dagger", weaponType: "dagger", name: "Parrying Dagger", minItemRarity: "uncommon", tags: ["Tempo", "Guard"], damage: 3, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. Crits on 5 and 6. While dual wielding, +5% Dodge. Works in the off-hand.",
    hooks: { stats: (s, _n, f) => { if (f.dualWield) s.dodge += 5; } } }),
  // Rare and up
  weapon({ id: "w_duellist_rapier", name: "Duellist's Rapier", minItemRarity: "rare", tags: ["Crit", "Tempo"], damage: 4, offDamage: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "While dual wielding, a 5 on your main die is a Crit. Works in the off-hand.",
    hooks: { modifyAttack: (_b, c) => { if (!c.offhand && c.attacker.dualWield && c.face === 5 && c.kind === "hit") { c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; } } } }),
  weapon({ id: "w_flicker_blade", name: "Flicker Blade", minItemRarity: "rare", tags: ["Strike", "Tempo"], damage: 4, offDamage: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "While dual wielding, when your off-hand hits, your next main-hand attack deals +3. Works in the off-hand.",
    hooks: {
      onHit: (_b, c) => { if (c.offhand && c.attacker.dualWield) c.attacker.flags["flicker"] = 1; },
      modifyAttack: (_b, c) => { if (!c.offhand && c.attacker.flags["flicker"]) { c.attacker.flags["flicker"] = 0; c.bonus += 3; } }
    } }),
  // Epic and up
  weapon({ id: "w_wyrmtooth_scimitar", name: "Wyrmtooth Scimitar", minItemRarity: "epic", tags: ["Burn", "Crit"], damage: 5, offDamage: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "While dual wielding, every hit applies 1 Burn and your crits 3 more. Works in the off-hand.",
    hooks: {
      onHit: (b, c) => { if (c.attacker.dualWield) applyStatus(b, c.attacker, c.defender, "burn", 1); },
      onCrit: (b, c) => { if (c.attacker.dualWield) applyStatus(b, c.attacker, c.defender, "burn", 3); }
    } }),
  weapon({ id: "w_tempest_twinblade", name: "Tempest Twinblade", minItemRarity: "epic", tags: ["Storm", "Tempo"], damage: 5, offDamage: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "While dual wielding, when both dice hit in the same turn, the enemy gains 3 Static; if either crit, it's Shocked. Works in the off-hand.",
    hooks: {
      onHit: (b, c) => {
        const a = c.attacker;
        if (!a.dualWield) return;
        if (!c.offhand) { a.flags["tempestMain"] = b.round; a.flags["tempestCrit"] = c.kind === "crit" ? b.round : 0; return; }
        if (a.flags["tempestMain"] !== b.round) return;
        a.flags["tempestMain"] = 0;
        applyStatus(b, a, c.defender, "static", 3);
        if (c.kind === "crit" || a.flags["tempestCrit"] === b.round) applyStatus(b, a, c.defender, "shock", 1);
      }
    } })
];

// ---------- Legendaries ----------
export const DUAL_LEGENDARIES: GearBase[] = [
  legendary({ id: "l_twinfang", weaponType: "dagger", kind: "weapon", slot: "main", name: "Twinfang", tags: ["Tempo", "Crit"], damage: 5, offDamage: 5,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    legendary: { minFloor: 3, asBase: "w_dagger", reveal: "While dual wielding, your off-hand die strikes twice every turn. Crits on 5 and 6. Works in the off-hand." },
    text: "Two bites for every one.",
    hooks: { onRoundStart: (b, f) => { if (f.dualWield) f.flags["flurry"] = b.round; } } }),
  legendary({ id: "l_eclipse_pair", kind: "weapon", slot: "main", name: "Eclipse Pair", tags: ["Strike", "Tempo"], damage: 6, offDamage: 5,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 4, asBase: "w_shortsword", reveal: "While dual wielding, every hit makes both your dice deal +1 for the rest of the fight (up to +10). Works in the off-hand." },
    text: "Sun and moon, never apart.",
    hooks: {
      onHit: (_b, c) => { if (c.attacker.dualWield) c.attacker.flags["eclipse"] = Math.min(10, (c.attacker.flags["eclipse"] ?? 0) + 1); },
      modifyAttack: (_b, c) => { if (c.attacker.dualWield) c.bonus += c.attacker.flags["eclipse"] ?? 0; }
    } })
];

// ---------- Talents ----------
export const DUAL_TALENTS: HookDef[] = [
  talent({ id: "t_crossed_blades", name: "Crossed Blades", tags: ["Crit", "Tempo"], text: "While dual wielding, +3% / +6% / +10% Crit chance",
    hooks: { stats: (s, n, f) => { if (f.dualWield) s.critChance += rank(n, 3, 6, 10); } } }),
  talent({ id: "t_ambidextrous", name: "Ambidextrous", tags: ["Crit", "Strike"], text: "While dual wielding, your off-hand crits deal +25% / +50% / +80%",
    hooks: { modifyAttack: (_b, c, s) => { if (c.offhand && c.attacker.dualWield && c.kind === "crit") c.mult *= 1 + rank(s, 0.25, 0.5, 0.8); } } }),
  talent({ id: "t_whirlwind", name: "Whirlwind", tags: ["Strike", "Tempo"], text: "While dual wielding, when both dice hit in the same turn, deal 2 / 4 / 6 more damage (ignores Armor)",
    hooks: { onHit: (b, c, s) => {
      const a = c.attacker;
      if (!a.dualWield) return;
      if (!c.offhand) a.flags["whirl"] = b.round;
      else if (a.flags["whirl"] === b.round) { a.flags["whirl"] = 0; ping(b, c.defender, rank(s, 2, 4, 6), "Whirlwind"); }
    } } }),
  talent({ id: "t_parrying_blades", name: "Parrying Blades", tags: ["Guard", "Tempo"], text: "While dual wielding, +1 / +2 / +3 Armor and +3% / +5% / +8% Dodge",
    hooks: { stats: (s, n, f) => { if (f.dualWield) { s.armor += rank(n, 1, 2, 3); s.dodge += rank(n, 3, 5, 8); } } } })
];

// ---------- Relics ----------
export const DUAL_RELICS_2: HookDef[] = [
  relic({ id: "r_whetstone_pair", name: "Whetstone Pair", rarity: "common", tags: ["Strike"], text: "While dual wielding, your main die deals +2 (+1)",
    hooks: { modifyAttack: (_b, c, n) => { if (!c.offhand && c.attacker.dualWield) c.bonus += 1 + n; } } }),
  relic({ id: "r_paired_scabbards", name: "Paired Scabbards", rarity: "uncommon", tags: ["Tempo"], text: "While dual wielding, start each fight with 1 Haste (+1)",
    hooks: { onFightStart: (b, f, n) => { if (f.dualWield) applyStatus(b, f, f, "haste", n); } } }),
  relic({ id: "r_scissor_strike", name: "Scissor Strike", rarity: "rare", tags: ["Crit", "Bleed"], text: "While dual wielding, when both dice crit in the same turn, apply 4 Bleed (+2) and 2 Exposed, and heal 3",
    hooks: { onCrit: (b, c, n) => {
      const a = c.attacker;
      if (!a.dualWield) return;
      if (!c.offhand) { a.flags["scissor"] = b.round; return; }
      if (a.flags["scissor"] !== b.round) return;
      a.flags["scissor"] = 0;
      log(b, "✂️ Scissor Strike!");
      applyStatus(b, a, c.defender, "bleed", 2 + 2 * n);
      applyStatus(b, a, c.defender, "exposed", 2);
      heal(b, a, 3, "Scissor Strike");
    } } }),
  relic({ id: "r_tempo_blades", name: "Tempo Blades", rarity: "rare", tags: ["Tempo", "Strike"], text: "While dual wielding, every 3rd round you gain 1 Haste (+1)",
    hooks: { onRoundStart: (b, f, n) => { if (f.dualWield && b.round % 3 === 0) applyStatus(b, f, f, "haste", n); } } })
];
