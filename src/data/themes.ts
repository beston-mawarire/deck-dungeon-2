// Floor themes: every run deals floors 1–7 a theme each from this pool (no repeats), and floors after 7 reuse them in turn.
// A theme sets the look of the floor (its colours), which foes live there (its own monsters, Elites and a boss, plus a lean
// towards some families), a trait some of its foes carry, and a small twist to their attributes.
import type { Fighter, HookDef } from "../engine/types";
import { applyStatus, GRAZE, hex, HIT, log, MISS, spell } from "./helpers";
import type { MonsterDef } from "./monsters";
import type { BossDef } from "./bosses";

export interface FloorTheme {
  id: string; name: string; icon: string;
  /** The floor's opening line. */
  text: string;
  /** What you can expect down here, in words (shown with the floor's name). */
  hint: string;
  /** Families that turn up more often here. */
  families: string[];
  /** Its own monsters (normal fights), Elite/Champion-only foes, and its boss. */
  monsters: MonsterDef[];
  elites: MonsterDef[];
  boss: BossDef;
  /** A trait some of its foes carry, and how often. */
  trait: string; traitChance: number;
  /** A small twist to every foe's attributes here. */
  tweak?: (f: Fighter) => void;
}

const trait = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "trait", ...d });
const onFoeHit = (status: Parameters<typeof applyStatus>[3], n: number) => ({ onHit: (b: Parameters<typeof applyStatus>[0], c: { attacker: Fighter; defender: Fighter; offhand?: boolean }) => { if (c.attacker !== b.player) applyStatus(b, c.attacker, c.defender, status, n); } });

export const THEME_TRAITS: HookDef[] = [
  trait({ id: "x_th_cinder", name: "Cinder-touched", tags: ["Burn"], text: "Its hits apply 1 Burn", hooks: onFoeHit("burn", 1) }),
  trait({ id: "x_th_rime", name: "Rime-touched", tags: ["Frost"], text: "Its hits apply 1 Chill", hooks: onFoeHit("chill", 1) }),
  trait({ id: "x_th_doomed", name: "Doom-bearer", tags: ["Hex"], text: "Its hits apply 1 Doom", hooks: onFoeHit("doom", 1) }),
  trait({ id: "x_th_drenched", name: "Drenched", tags: ["Storm"], text: "Its hits leave you Soaked", hooks: onFoeHit("soaked", 1) }),
  trait({ id: "x_th_jailer", name: "Jailer", tags: ["Hex"], text: "Its crits apply 2 Weak", hooks: { onCrit: (b, c) => { if (c.attacker !== b.player) applyStatus(b, c.attacker, c.defender, "weak", 2); } } }),
  trait({ id: "x_th_thornhide", name: "Thornhide", tags: ["Thorns"], text: "Starts each fight with 3 Spikes", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "spikes", 3) } }),
  trait({ id: "x_th_plated", name: "Plated", tags: ["Guard"], text: "+2 Armor", hooks: { onFightStart: (_b, f) => { f.armor += 2; } } }),
  trait({ id: "x_th_lurker", name: "Lurker", tags: ["Tempo"], text: "Strikes first", hooks: { onFightStart: (_b, f) => { f.flags["ambush"] = 1; } } }),
  trait({ id: "x_th_garrison", name: "Garrisoned", tags: ["Guard"], text: "Starts each fight with Barrier worth 15% of its Max HP", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "barrier", Math.ceil(f.maxHp * 0.15)) } }),
  trait({ id: "x_th_deathless", name: "Deathless", tags: ["Blood"], text: "The first time it would die, it rises again with a quarter of its HP",
    hooks: { whenHit: (b, c) => { const d = c.defender; if (d.hp <= 0 && !d.flags["dead"] && !d.flags["risen"]) { d.flags["risen"] = 1; d.hp = Math.ceil(d.maxHp * 0.25); log(b, `💀 ${d.name} rises again!`); b.fx.push({ who: d.id, kind: "text", text: "Rises again", icon: "💀" }); } } } })
];

export const THEMES: FloorTheme[] = [
  { id: "smoulder", name: "The Smouldering Depths", icon: "🌋", families: ["Cultist", "Construct"], trait: "x_th_cinder", traitChance: 0.3,
    text: "The rock is warm underfoot, then hot. Rivers of slag light the tunnels a sullen red.", hint: "Fire-touched foes and things that don't burn",
    monsters: [
      { name: "Magma Imp", family: "Cultist", hp: 9, power: 3, traits: [], faces: [MISS, HIT, HIT, HIT, HIT, spell("Spit Fire", "crit", hex("burn", 3))] },
      { name: "Cinder Hound", family: "Beast", hp: 11, power: 3, traits: ["m_ambush", "x_th_cinder"] }
    ],
    elites: [{ name: "Molten Brute", family: "Construct", hp: 17, power: 3, armor: 3, traits: ["x_fireproof"], faces: [MISS, HIT, HIT, HIT, HIT, spell("Magma Fist", "crit", hex("burn", 3))] }],
    boss: { name: "Pyrrhus", title: "the Kiln Tyrant", family: "Construct", moves: ["fire", "heavy", "brand", "strike"], traits: ["x_fireproof"], armor: 2 } },

  { id: "catacombs", name: "The Dark Catacombs", icon: "⚰️", families: ["Undead"], trait: "x_th_deathless", traitChance: 0.15,
    text: "Niches of bones line every wall, and every skull has turned to watch you pass.", hint: "The dead, and some that won't stay down",
    monsters: [
      { name: "Bone Archer", family: "Undead", hp: 9, power: 3, traits: ["m_brittle"], faces: [MISS, HIT, HIT, HIT, HIT, spell("Grave Arrow", "crit", hex("blind", 1))] },
      { name: "Crypt Rat Swarm", family: "Beast", hp: 10, power: 2, traits: ["m_venom_bite"] }
    ],
    elites: [{ name: "Bone Colossus", family: "Undead", hp: 18, power: 3, armor: 3, traits: ["x_th_deathless"] }],
    boss: { name: "The Ossuary Warden", title: "Keeper of the Bone Halls", family: "Undead", moves: ["strike", "doom", "bulwark", "heavy"], traits: ["x_th_deathless"] } },

  { id: "overgrown", name: "The Overgrown Pathways", icon: "🌿", families: ["Beast"], trait: "x_th_thornhide", traitChance: 0.3,
    text: "Roots have split the old stonework open. Something green and patient is digesting the dungeon.", hint: "Thorny, venomous, hard-to-kill growth",
    tweak: f => { f.maxHp = f.hp = Math.round(f.hp * 1.1); },
    monsters: [
      { name: "Vine Strangler", family: "Beast", hp: 12, power: 2, traits: ["x_th_thornhide"], faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Constrict", "crit", hex("weak", 2))] },
      { name: "Spore Shambler", family: "Beast", hp: 13, power: 2, traits: ["m_venom_bite"] }
    ],
    elites: [{ name: "Elder Treant", family: "Beast", hp: 20, power: 3, armor: 2, traits: ["x_regenerating", "x_th_thornhide"] }],
    boss: { name: "Mother Briarroot", title: "the Strangling Grove", family: "Beast", moves: ["thorns", "regrow", "venom", "strike"], traits: ["x_regenerating"] } },

  { id: "icy", name: "The Icy Labyrinth", icon: "❄️", families: ["Undead", "Beast"], trait: "x_th_rime", traitChance: 0.3,
    text: "Frost furs every wall, and the corridors twist back on themselves. Your breath hangs in the air.", hint: "Frost-bitten foes that slow you down",
    monsters: [
      { name: "Frost Wolf", family: "Beast", hp: 11, power: 3, traits: ["m_ambush", "x_th_rime"] },
      { name: "Ice Wraith", family: "Undead", hp: 9, power: 3, traits: ["m_incorporeal", "m_grave_chill"] }
    ],
    elites: [{ name: "Glacial Golem", family: "Construct", hp: 19, power: 3, armor: 3, traits: ["x_frostproof"], faces: [MISS, HIT, HIT, HIT, HIT, spell("Avalanche", "crit", hex("chill", 3))] }],
    boss: { name: "Rhimeheart", title: "the Glacier's Mind", family: "Construct", moves: ["frost", "bulwark", "heavy", "gaze"], traits: ["x_frostproof"], armor: 2 } },

  { id: "constructs", name: "The Corridor of Constructs", icon: "⚙️", families: ["Construct"], trait: "x_th_plated", traitChance: 0.3,
    text: "Gears the size of houses turn in the walls. Somewhere, a great machine is still keeping time.", hint: "Armoured machines (lightning loves them)",
    tweak: f => { f.armor += 1; },
    monsters: [
      { name: "Clockwork Soldier", family: "Construct", hp: 13, power: 3, armor: 2, traits: ["m_shieldwall"] },
      { name: "Arc Drone", family: "Construct", hp: 9, power: 3, traits: ["m_static"] }
    ],
    elites: [{ name: "Siege Automaton", family: "Construct", hp: 20, power: 4, armor: 4, traits: ["x_insulated"], faces: [MISS, HIT, HIT, HIT, HIT, spell("Battering Ram", "crit", hex("stun", 1))] }],
    boss: { name: "The Clockwork Abbot", title: "Who Winds the Halls", family: "Construct", moves: ["guardstrike", "thunder", "charge", "smash"], traits: ["x_insulated"], armor: 3 } },

  { id: "underkeep", name: "The Underkeep Prison", icon: "⛓️", families: ["Cultist"], trait: "x_th_jailer", traitChance: 0.3,
    text: "Cell after cell, most of them empty. The ones that aren't have been waiting a long time for the doors to open.", hint: "Jailers and the desperate things they kept",
    monsters: [
      { name: "Jailer", family: "Cultist", hp: 13, power: 3, armor: 1, traits: ["x_th_jailer"] },
      { name: "Escaped Convict", family: "Cultist", hp: 10, power: 3, traits: ["m_ambush"], faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Shiv", "crit", hex("bleed", 2))] }
    ],
    elites: [{ name: "The Torturer", family: "Cultist", hp: 15, power: 3, traits: ["m_toll", "x_th_jailer"] }],
    boss: { name: "Warden Grisk", title: "Master of the Underkeep", family: "Cultist", moves: ["concuss", "rend", "shieldwall", "strike"], armor: 2 } },

  { id: "necropolis", name: "The Necropolis", icon: "🏚️", families: ["Undead"], trait: "x_th_doomed", traitChance: 0.25,
    text: "Streets, houses, a market square. All of it silent, all of it built for the dead.", hint: "A city of the dead, and the Doom it carries",
    monsters: [
      { name: "Doom Herald", family: "Undead", hp: 10, power: 2, traits: ["x_th_doomed"] },
      { name: "Grave Knight", family: "Undead", hp: 14, power: 3, armor: 2, traits: ["m_lifedrink"] }
    ],
    elites: [{ name: "Lich Adept", family: "Undead", hp: 13, power: 3, traits: ["m_curse_touch", "x_th_doomed"] }],
    boss: { name: "The Pale Archon", title: "Lord of the Silent City", family: "Undead", moves: ["doom", "drain", "malediction", "strike"], traits: ["x_dispelling"] } },

  { id: "chasm", name: "The Endless Chasm", icon: "🕳️", families: ["Beast"], trait: "x_th_lurker", traitChance: 0.3,
    text: "Narrow ledges over a drop with no bottom. Things climb up out of it, and they are always hungry.", hint: "Things that strike from the dark, and hit harder",
    tweak: f => { f.damage = Math.round(f.damage * 1.1); },
    monsters: [
      { name: "Cave Stalker", family: "Beast", hp: 11, power: 3, traits: ["x_th_lurker"] },
      { name: "Gloom Bat Swarm", family: "Beast", hp: 8, power: 2, traits: [], faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Screech", "crit", hex("blind", 2))] }
    ],
    elites: [{ name: "Abyssal Maw", family: "Beast", hp: 18, power: 4, traits: ["x_th_lurker", "m_lifedrink"] }],
    boss: { name: "The Thing in the Chasm", title: "Older than the Dark", family: "Beast", moves: ["gaze", "flurry", "charge", "smash"], traits: ["m_ambush"] } },

  { id: "drowned", name: "The Drowned Ruins", icon: "🌊", families: ["Undead", "Beast"], trait: "x_th_drenched", traitChance: 0.3,
    text: "Black water to the knees, and the broken halls of a city that sank long ago.", hint: "Waterlogged ruins (lightning bites twice as hard here)",
    monsters: [
      { name: "Drowned Sailor", family: "Undead", hp: 12, power: 3, traits: ["x_th_drenched"] },
      { name: "Eel Swarm", family: "Beast", hp: 9, power: 3, traits: ["m_crackle"] }
    ],
    elites: [{ name: "Siren", family: "Undead", hp: 13, power: 3, traits: ["x_th_drenched", "m_curse_touch"] }],
    boss: { name: "Queen Mirelle", title: "of the Drowned Halls", family: "Undead", moves: ["drain", "frost", "hex", "strike"] } },

  { id: "stronghold", name: "The Sunken Stronghold", icon: "🏰", families: ["Cultist", "Construct"], trait: "x_th_garrison", traitChance: 0.3,
    text: "Walls within walls, murder-holes and barricades. Someone still holds this fortress, and they don't want guests.", hint: "Garrisoned, armoured defenders",
    tweak: f => { f.armor += 1; },
    monsters: [
      { name: "Garrison Pikeman", family: "Cultist", hp: 13, power: 3, armor: 2, traits: ["x_th_garrison"] },
      { name: "Crossbowman", family: "Cultist", hp: 10, power: 3, traits: [], faces: [MISS, HIT, HIT, HIT, HIT, spell("Bolt", "crit", hex("exposed", 2))] }
    ],
    elites: [{ name: "Iron Captain", family: "Cultist", hp: 16, power: 4, armor: 3, traits: ["m_shieldwall", "x_th_garrison"] }],
    boss: { name: "Castellan Vorn", title: "the Last Defender", family: "Cultist", moves: ["shieldwall", "guardstrike", "heavy", "enrage"], armor: 3 } }
];

/** How many floors get their own theme before they repeat. */
export const THEMED_FLOORS = 7;
export const themeById = (id: string | undefined) => THEMES.find(t => t.id === id);
