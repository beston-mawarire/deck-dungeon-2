// One-handed staffs: spell-casting weapons that leave the off-hand free for an orb, a tome or a shield.
// Two at every rarity, Common to Crimson. Everything joins the pool at normal odds.
import type { GearBase, StatusId } from "../engine/types";
import { applyStatus, cast, CRIT, GRAZE, heal, hex, HIT, log, st } from "./helpers";

const only = (rarity: "common" | "uncommon" | "rare" | "epic", d: Omit<GearBase, "kind" | "slot" | "onlyRarity">): GearBase => ({ kind: "weapon", slot: "main", onlyRarity: rarity, ...d });
const legendary = (d: Omit<GearBase, "kind" | "slot" | "rarity">): GearBase => ({ kind: "weapon", slot: "main", rarity: "legendary", ...d });
const crimson = (d: Omit<GearBase, "kind" | "slot" | "rarity">): GearBase => ({ kind: "weapon", slot: "main", rarity: "crimson", ...d });
const ELEMENTS: StatusId[] = ["burn", "chill", "static", "poison"];

export const ONE_HANDED_STAFFS: GearBase[] = [
  // Common
  only("common", { id: "s1_ashwood_wand", name: "Ashwood Wand", tags: ["Arcane", "Burn"], damage: 3,
    faces: [GRAZE, cast("Cinder", "hit", hex("burn", 2)), HIT, HIT, cast("Cinder", "hit", hex("burn", 2)), CRIT],
    text: "One-handed staff. A 2 or a 5 flings a Cinder (2 Burn).", hooks: {} }),
  only("common", { id: "s1_rimewood_rod", name: "Rimewood Rod", tags: ["Arcane", "Frost"], damage: 3,
    faces: [GRAZE, HIT, cast("Rime", "hit", hex("chill", 1)), HIT, HIT, cast("Frostbite", "crit", hex("chill", 2))],
    text: "One-handed staff. A 3 casts Rime (1 Chill); a 6 Frostbites (2 Chill).", hooks: {} }),
  // Uncommon
  only("uncommon", { id: "s1_stormcaller_rod", name: "Stormcaller Rod", tags: ["Arcane", "Storm"], damage: 4,
    faces: [GRAZE, cast("Crackle", "hit", hex("static", 2)), HIT, cast("Crackle", "hit", hex("static", 2)), HIT, cast("Bolt", "crit", hex("shock", 1))],
    text: "One-handed staff. A 2 or 4 Crackles (2 Static); a 6 calls a Bolt (Shock).", hooks: {} }),
  only("uncommon", { id: "s1_bogwood_staff", name: "Bogwood Staff", tags: ["Arcane", "Poison"], damage: 4,
    faces: [cast("Miasma", "graze", hex("poison", 2)), HIT, HIT, cast("Spit", "hit", hex("poison", 2)), HIT, CRIT],
    text: "One-handed staff. A 1 still lands a Miasma (2 Poison); a 4 Spits venom (2 Poison).", hooks: {} }),
  // Rare
  only("rare", { id: "s1_prism_scepter", name: "Prism Scepter", tags: ["Arcane", "Burn", "Frost", "Storm"], damage: 4,
    faces: [GRAZE, cast("Fire Bolt", "hit", hex("burn", 3)), cast("Frost Lance", "hit", hex("chill", 2)), HIT, cast("Spark", "hit", hex("static", 3)), CRIT],
    text: "One-handed staff. Fire on a 2, frost on a 3, sparks on a 5. Your spells deal +10%.",
    hooks: { stats: s => { s.spellAmp += 10; } } }),
  only("rare", { id: "s1_bloodwood_cane", name: "Bloodwood Cane", tags: ["Arcane", "Blood"], damage: 5,
    faces: [GRAZE, HIT, cast("Leech", "hit", (b, c) => heal(b, c.attacker, 3, "Leech")), HIT, cast("Leech", "hit", (b, c) => heal(b, c.attacker, 3, "Leech")), CRIT],
    text: "One-handed staff. A 3 or 5 casts Leech: the hit also heals you 3.", hooks: {} }),
  // Epic
  only("epic", { id: "s1_magisters_rod", name: "Magister's Rod", tags: ["Arcane", "Burn", "Frost", "Storm"], damage: 5,
    faces: [cast("Ember", "graze", hex("burn", 2)), cast("Fire Bolt", "hit", hex("burn", 4)), HIT, cast("Frost Lance", "hit", hex("chill", 3)), cast("Arc", "hit", hex("static", 4)), cast("Chain Lightning", "crit", hex("shock", 2))],
    text: "One-handed staff. Five spell faces. Your spells deal +15%.", hooks: { stats: s => { s.spellAmp += 15; } } }),
  only("epic", { id: "s1_hexwood_scepter", name: "Hexwood Scepter", tags: ["Arcane", "Hex"], damage: 5,
    faces: [GRAZE, cast("Wither", "hit", hex("weak", 1)), HIT, cast("Expose", "hit", hex("exposed", 2)), HIT, cast("Doom Bolt", "crit", hex("doom", 3))],
    text: "One-handed staff. Wither on a 2, Expose on a 4, a Doom Bolt on a 6. Your hits deal +1 for every different negative status on the enemy.",
    hooks: { modifyAttack: (_b, c) => { if (c.offhand) return; c.bonus += ["burn", "poison", "chill", "bleed", "weak", "exposed", "doom", "static", "soaked", "blind"].filter(x => st(c.defender, x as StatusId) > 0).length; } } })
];

export const STAFF_LEGENDARIES: GearBase[] = [
  legendary({ id: "l_wand_of_echoes", name: "Wand of Echoes", tags: ["Arcane", "Burn", "Frost", "Storm"], damage: 5,
    faces: [GRAZE, cast("Fire Bolt", "hit", hex("burn", 3)), cast("Frost Lance", "hit", hex("chill", 2)), HIT, cast("Arc", "hit", hex("static", 3)), CRIT],
    legendary: { minFloor: 2, asBase: "w_staff", reveal: "One-handed staff. Every spell you cast echoes: it applies its status a second time." },
    text: "It repeats everything. Twice.",
    hooks: { onStatusApplied: (_b, self, t, status, n) => { if (self.flags["casting"] && t !== self && !self.flags["echoing"] && status !== "stun" && status !== "shock") { self.flags["echoing"] = 1; t.statuses[status] = st(t, status) + n; self.flags["echoing"] = 0; } } } }),
  legendary({ id: "l_conduit_scepter", name: "Conduit Scepter", tags: ["Arcane", "Storm", "Kill"], damage: 5,
    faces: [GRAZE, HIT, cast("Spark", "hit", hex("static", 3)), HIT, cast("Spark", "hit", hex("static", 3)), cast("Overload", "crit", hex("shock", 1))],
    legendary: { minFloor: 3, asBase: "w_staff", reveal: "One-handed staff. Each of your spells adds +1 Damage to all your hits for the rest of the fight (up to +12)." },
    text: "The more it channels, the less it can hold back.",
    hooks: {
      onStatusApplied: (_b, self, t) => { if (self.flags["casting"] && t !== self) self.flags["conduit"] = Math.min(12, (self.flags["conduit"] ?? 0) + 1); },
      modifyAttack: (_b, c) => { if (!c.offhand) c.bonus += c.attacker.flags["conduit"] ?? 0; }
    } })
];

export const STAFF_CRIMSON: GearBase[] = [
  crimson({ id: "cx_scepter_red_tide", name: "Scepter of the Red Tide", tags: ["Arcane", "Blood", "Burn"], damage: 8,
    faces: [cast("Red Ember", "graze", hex("burn", 3)), cast("Blood Bolt", "hit", hex("bleed", 3)), cast("Fire Bolt", "hit", hex("burn", 5)), HIT, cast("Blood Bolt", "hit", hex("bleed", 3)), cast("Red Tide", "crit", hex("burn", 6))],
    text: "One-handed staff. Five spell faces of fire and blood. Your spells heal you for 1 per 3 stacks they apply.",
    hooks: { onStatusApplied: (b, self, t, _s, n) => { if (self.flags["casting"] && t !== self && n >= 3) heal(b, self, Math.floor(n / 3), "Red Tide"); } } }),
  crimson({ id: "cx_rod_of_ruin", name: "Rod of Ruin", tags: ["Arcane", "Burn", "Frost", "Storm", "Poison"], damage: 8,
    faces: [1, 2, 3, 4, 5, 6].map(n => cast(n === 6 ? "Ruin" : "Unmake", n === 6 ? "crit" : n === 1 ? "graze" : "hit", (b, c) => {
      const pick = ELEMENTS[Math.floor(b.rng() * ELEMENTS.length)];
      applyStatus(b, c.attacker, c.defender, pick, n === 6 ? 6 : 3);
      if (n === 6) { for (const e of ELEMENTS) if (e !== pick) applyStatus(b, c.attacker, c.defender, e, 2); log(b, "💥 Ruin: every element at once."); }
    })),
    text: "One-handed staff. Every face is a spell of a random element (3 stacks); a 6 is Ruin: 6 of one and 2 of every other.", hooks: {} })
];
