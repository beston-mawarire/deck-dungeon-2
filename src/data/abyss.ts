// The Abyss: Epic Crimson items (only from the bosses of floors 30, 40, 50, 60 and 70),
// and the Legendary Crimson rewards for the impossible: Abaddon (beat DEATH) and the Cookie (beat the End).
import type { GearBase } from "../engine/types";
import { applyStatus, CRIT, heal, HIT, log, other } from "./helpers";

const ec = (d: Omit<GearBase, "rarity">): GearBase => ({ ...d, rarity: "epic_crimson" });

export const EPIC_CRIMSON: GearBase[] = [
  ec({ id: "ec_worldrender", kind: "weapon", slot: "main", name: "Worldrender", tags: ["Strike", "Bleed", "Crit", "Hex"], damage: 40, twoHanded: true,
    faces: [HIT, HIT, CRIT, CRIT, CRIT, CRIT],
    text: "Two-handed. Crits on 3–6. Every hit applies 6 Bleed and 4 Fracture. Crits heal 20% of your Max HP. Each kill gives you 5 Might.",
    hooks: { onHit: (b, c) => { applyStatus(b, c.attacker, c.defender, "bleed", 6); applyStatus(b, c.attacker, c.defender, "fracture", 4); },
      onCrit: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.2), "Worldrender"); },
      onKill: (b, c) => applyStatus(b, c.attacker, c.attacker, "might", 5) } }),
  ec({ id: "ec_abyss_aegis", kind: "off", slot: "off", shield: true, name: "Aegis of the Abyss", tags: ["Guard", "Thorns", "Hex"], armor: 30, maxHp: 60,
    text: "Shield. +30 Armor, +60 Max HP. Guarding gives Barrier equal to your Max HP. Anything that hits you takes 25. You can't be Doomed.",
    hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", f.maxHp),
      whenHit: (b, c) => { if (!c.noDamage && c.attacker.hp > 0) { c.attacker.hp -= 25; log(b, `Aegis of the Abyss: 25 back.`); } },
      incomingStatus: (_b, _f, s, n) => (s === "doom" ? 0 : n) } }),
  ec({ id: "ec_old_night", kind: "armour", slot: "armour", name: "Carapace of the Old Night", tags: ["Guard", "Blood"], armor: 35, maxHp: 80,
    text: "Heavy: +35 Armor, +80 Max HP. 5 Regen every round. Once a fight, dropping below 30% HP heals you to full.",
    hooks: { onRoundStart: (b, f) => applyStatus(b, f, f, "regen", 5),
      onRoundEnd: (b, f) => { if (f.hp > 0 && f.hp < f.maxHp * 0.3 && !f.flags["oldNight"]) { f.flags["oldNight"] = 1; heal(b, f, f.maxHp, "The Old Night"); } } } }),
  ec({ id: "ec_deep_choir", kind: "trinket", slot: "trinket", name: "Eye of the Deep Choir", tags: ["Arcane", "Burn", "Frost", "Storm", "Poison"],
    text: "Spell Amp +100%. +25% Crit chance. Status damage +100%. Reactions you cause deal triple. Every fight, the enemy starts with 5 Burn, 5 Chill, 5 Static and 5 Poison.",
    hooks: { stats: s => { s.spellAmp += 100; s.critChance += 25; s.dotAmp = (s.dotAmp ?? 0) + 100; }, reactionMult: () => 3,
      onFightStart: (b, f) => { const e = other(b, f); for (const x of ["burn", "chill", "static", "poison"] as const) applyStatus(b, f, e, x, 5); } } }),
  ec({ id: "ec_ten_thousand_teeth", kind: "trinket", slot: "trinket", name: "Crown of Ten Thousand Teeth", tags: ["Strike", "Blood", "Kill"], maxHp: 50,
    text: "+20 Damage, +50 Max HP. You deal 50% more damage. Every hit you land gives 1 Might. Kills heal you to full.",
    hooks: { stats: s => { s.damage += 20; s.dmgDealt = (s.dmgDealt ?? 0) + 50; },
      onHit: (b, c) => applyStatus(b, c.attacker, c.attacker, "might", 1), onKill: (b, c) => { heal(b, c.attacker, c.attacker.maxHp, "Crown of Ten Thousand Teeth"); } } })
];

export const ABADDON: GearBase = {
  id: "lc_abaddon", rarity: "legendary_crimson", kind: "weapon", slot: "main", name: "Abaddon", tags: ["Kill", "Crit", "Hex"], damage: 99, twoHanded: true,
  faces: [CRIT, CRIT, CRIT, CRIT, CRIT, CRIT],
  text: "The scythe DEATH carried. Two-handed. Every face is a Crit, and whatever it touches dies.",
  hooks: { onHit: (b, c) => { if (c.defender.hp > 0) { c.defender.hp = 0; log(b, `☠️ Abaddon reaps ${c.defender.name}.`); } } }
};

export const COOKIE: GearBase = {
  id: "lc_cookie", rarity: "legendary_crimson", kind: "trinket", slot: "trinket", name: "A Cookie", tags: ["Blood"], maxHp: 1,
  text: "+1 Max HP. It's a cookie. You earned it.", hooks: {}
};

export const ABYSS_ITEMS: GearBase[] = [...EPIC_CRIMSON, ABADDON, COOKIE];
