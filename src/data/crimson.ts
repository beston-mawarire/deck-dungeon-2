// Crimson items: the tier above Legendary. They drop only from Crimson bosses (Endless, after the fifth boss),
// come revealed, carry two rolled bonuses, and each one is a wild combo engine on its own.
import { attack } from "../engine/combat";
import { REACTIONS } from "../engine/statuses";
import type { AttackCtx, Battle, GearBase, StatusId } from "../engine/types";
import { NEGATIVE_STATUSES } from "../engine/types";
import { CRIMSON_ITEMS } from "./treasury";
import { CHARM_CRIMSON, SINGLE_CHARM_CRIMSON } from "./charms";
import { SHIELD_CRIMSON } from "./shields";
import { ROBE_CRIMSON } from "./robes";
import { STREAK_GEAR_2 } from "./streak";
import { BRUTE_CRIMSON } from "./brutes";
import { WAR_HAMMER_CRIMSON } from "./hammers";
import { applyStatus, cast, CRIT, GRAZE, heal, HIT, log, loseHp, other, ping, purify, st } from "./helpers";

const crimson = (d: Omit<GearBase, "rarity">): GearBase => ({ ...d, rarity: "crimson" });

const HEXES: StatusId[] = ["burn", "poison", "chill", "shock", "bleed", "exposed", "weak"];

/** Two different random negative statuses, two stacks each. */
const litany = (b: Battle, c: AttackCtx) => {
  const pool = [...HEXES];
  for (let i = 0; i < 2; i++) {
    const s = pool.splice(Math.floor(b.rng() * pool.length), 1)[0];
    applyStatus(b, c.attacker, c.defender, s, 2);
  }
};

const heartstrike = { kind: "crit" as const, name: "Heartstrike", run: (b: Battle, c: AttackCtx) => { const n = Math.floor(Math.max(0, c.defender.hp) * 0.2); c.bonus += n; if (n) log(b, `💘 Heartstrike: +${n} (a fifth of its HP).`); } };

export const CRIMSON: GearBase[] = [
  // ---------- Weapons ----------
  crimson({ id: "c_bloodtide", kind: "weapon", slot: "main", name: "Bloodtide Glaive", tags: ["Bleed", "Strike"], damage: 9, twoHanded: true,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, { kind: "crit", name: "Red Tide", run: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 3 + st(c.attacker, "might")) }],
    text: "Every hit applies Bleed equal to 1 + your Might. At the end of each round the enemy is Bleeding, gain 1 Might. On a 6, a Red Tide applies 3 + your Might in Bleed.",
    hooks: {
      onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 1 + st(c.attacker, "might")),
      onRoundEnd: (b, f) => { if (st(other(b, f), "bleed") > 0) applyStatus(b, f, f, "might", 1); }
    } }),
  crimson({ id: "c_red_litany", kind: "weapon", slot: "main", name: "The Red Litany", tags: ["Arcane", "Hex"], damage: 6,
    faces: [cast("Verse", "graze", litany), cast("Verse", "hit", litany), cast("Verse", "hit", litany), cast("Verse", "hit", litany), cast("Verse", "hit", litany), cast("Amen", "crit", litany)],
    text: "Every face is a spell that applies two different random negative statuses (2 each). The first reaction you cause each round gives you Haste.",
    hooks: {} }), // Haste on reaction: statuses.ts
  crimson({ id: "c_heartseeker", weaponType: "dagger", kind: "weapon", slot: "main", name: "Heartseeker", tags: ["Crit", "Kill"], damage: 6, offDamage: 5,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT, heartstrike, heartstrike],
    text: "A d8. Faces 7 and 8 are Heartstrikes: crits that add a fifth of the enemy's current HP. Works in the off-hand.",
    hooks: {} }),

  crimson({ id: "c_red_sacrament", kind: "weapon", slot: "main", name: "The Red Sacrament", tags: ["Holy", "Bleed", "Burn"], damage: 7,
    faces: [GRAZE, purify(), purify(), purify(), purify(), purify("crit", "Last Rite")],
    text: "Holy. Before every Purify, it anoints the enemy with 2 Bleed, 2 Burn and 2 Exposed — then strips them all away for 2× Damage each.",
    hooks: { modifyAttack: (b, c) => { if (c.spec.cleanse) { for (const s of ["bleed", "burn", "exposed"] as const) applyStatus(b, c.attacker, c.defender, s, 2); } } } }),

  // ---------- Off-hands ----------
  crimson({ id: "c_crimson_aegis", shield: true, kind: "off", slot: "off", name: "Crimson Aegis", tags: ["Guard", "Thorns"], armor: 5,
    text: "While Guarding, every hit you take is thrown back in full (before Armor), and you gain that much Barrier.",
    hooks: { whenHit: (b, c) => { const n = c.raw ?? 0; if (c.defender.flags["guarding"] && n > 0) { ping(b, c.attacker, n, "🩸 Crimson Aegis"); applyStatus(b, c.defender, c.defender, "barrier", n); } } } }),
  crimson({ id: "c_red_grimoire", barrierElement: "burn", kind: "off", slot: "off", name: "Grimoire of Red Pages", tags: ["Arcane", "Hex"],
    text: "Every negative status you apply also applies 1 stack of a status it reacts with, so reactions fire constantly. Reactions you cause deal +50%.",
    hooks: {
      reactionMult: () => 1.5,
      onStatusApplied: (b, self, t, status) => {
        if (t === self || self.flags["redpage"] || !(NEGATIVE_STATUSES as readonly string[]).includes(status)) return;
        const partners = REACTIONS.flatMap(r => (r.a === status ? [r.b] : r.b === status ? [r.a] : [])).filter(x => (NEGATIVE_STATUSES as readonly string[]).includes(x)) as StatusId[];
        if (!partners.length) return;
        self.flags["redpage"] = 1;
        applyStatus(b, self, t, partners[Math.floor(b.rng() * partners.length)], 1);
        self.flags["redpage"] = 0;
      }
    } }),
  crimson({ id: "c_last_rites", kind: "off", slot: "off", name: "Lantern of Last Rites", tags: ["Hex", "Kill"],
    text: "At the end of each round, the enemy loses HP equal to every negative status stack on it.",
    hooks: { onRoundEnd: (b, f) => { const e = other(b, f); const n = NEGATIVE_STATUSES.filter(s => s !== "stun" && s !== "shock").reduce((s, id) => s + st(e, id), 0); if (n > 0) ping(b, e, n, "🏮 Last Rites"); } } }),

  // ---------- Armour ----------
  crimson({ id: "c_carapace", kind: "armour", slot: "armour", name: "Crimson Carapace", tags: ["Thorns", "Guard"], armor: 5,
    text: "When hit, gain 2 Spikes and 2 Barrier. Your Spikes heal you for the damage they deal.",
    hooks: { whenHit: (b, c) => { applyStatus(b, c.defender, c.defender, "spikes", 2); applyStatus(b, c.defender, c.defender, "barrier", 2); } } }), // Spikes healing: combat.ts
  crimson({ id: "c_red_moon", kind: "armour", slot: "armour", name: "Robe of the Red Moon", tags: ["Blood", "Arcane"], armor: 2, maxHp: 10,
    text: "+10 Max HP. Healing you receive is doubled, and every heal also hits the enemy for the same amount.",
    hooks: { healMult: () => 2 } }), // heal echo: statuses.ts
  crimson({ id: "c_sanguine_bulwark", kind: "armour", slot: "armour", name: "Sanguine Bulwark", tags: ["Guard", "Blood"], armor: 4, maxHp: 15,
    text: "+15 Max HP. Guarding heals 20% of your missing HP and gives twice that as Barrier.",
    hooks: { onGuard: (b, f) => { const n = Math.ceil((f.maxHp - f.hp) * 0.2); if (n > 0) { heal(b, f, n, "Sanguine Bulwark"); applyStatus(b, f, f, "barrier", 2 * n); } } } }),

  // ---------- Trinkets ----------
  crimson({ id: "c_crimson_die", kind: "trinket", slot: "trinket", name: "The Crimson Die", tags: ["Luck", "Crit"],
    text: "Every roll gets +1. Rolling your die's highest face deals 2.5× more.",
    hooks: {
      modifyRoll: (_b, _f, r) => r + 1,
      modifyAttack: (b, c) => { const sides = (c.offhand ? c.attacker.offFaces : c.attacker.faces)?.length ?? 6; if (c.face >= sides) { c.mult *= 2.5; log(b, "🎲 The Crimson Die burns red."); } }
    } }),
  crimson({ id: "c_red_kings_heart", kind: "trinket", slot: "trinket", name: "Heart of the Red King", tags: ["Strike", "Hex"],
    text: "+2 Damage for every different status in the fight, yours and the enemy's.",
    hooks: { modifyAttack: (b, c) => { const ids = new Set<string>(); for (const f of [b.player, b.enemy]) for (const [k, n] of Object.entries(f.statuses)) if ((n ?? 0) > 0) ids.add(k); c.bonus += 2 * ids.size; } } }),
  crimson({ id: "c_eye_of_ruin", kind: "trinket", slot: "trinket", name: "Eye of Ruin", tags: ["Arcane", "Hex"],
    text: "Every reaction you cause sets off a second, random reaction on the enemy.",
    hooks: {} }), // statuses.ts
  crimson({ id: "c_blood_pact", kind: "trinket", slot: "trinket", name: "Blood Pact Ring", tags: ["Blood", "Tempo"],
    text: "At the start of every round, lose 2 HP and gain Haste and 2 Might.",
    hooks: { onRoundStart: (b, f) => { if (f.hp > 2) { loseHp(b, f, 2); log(b, "🩸 The Blood Pact takes its due."); } applyStatus(b, f, f, "haste", 1); applyStatus(b, f, f, "might", 2); } } }),
  crimson({ id: "c_warlords_brand", kind: "trinket", slot: "trinket", name: "Warlord's Crimson Brand", tags: ["Guard", "Strike"],
    text: "Guarding also attacks with your main die. Your Armor is added to every hit you land.",
    hooks: {
      onGuard: (b, f) => { const e = other(b, f); if (e.hp > 0) attack(b, f, e); },
      modifyAttack: (_b, c) => { c.bonus += c.attacker.armor; }
    } })
];

// The Treasury's Crimson items join the pool.
CRIMSON.push(...CRIMSON_ITEMS, ...CHARM_CRIMSON, ...SINGLE_CHARM_CRIMSON, ...SHIELD_CRIMSON, ...ROBE_CRIMSON, ...STREAK_GEAR_2.filter(g => g.rarity === "crimson"), ...BRUTE_CRIMSON, ...WAR_HAMMER_CRIMSON);
