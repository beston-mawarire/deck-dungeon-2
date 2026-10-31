// Daggers, throwing weapons (throwing knives, kunai, shuriken), grenades, crit relics, thrower gear,
// Dodge-scaling weapons and heavy armour. Everything joins the pool at normal odds.
import type { AttackCtx, Battle, FaceSpec, GearBase, HookDef, StatusId } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, hex, HIT, MISS, spell, st } from "./helpers";

const THROWN = ["throwing", "kunai", "shuriken"];
/** Holding a throwing knife, kunai or shuriken in the off-hand. */
const throwerOff = (f: { offType?: string }) => !!f.offType && THROWN.includes(f.offType);

// ---------- Daggers: crit tricks, and blood-price daggers that trade Max HP for Crit chance ----------
export const DAGGERS: GearBase[] = [
  { id: "d_assassins_dirk", kind: "weapon", slot: "main", weaponType: "dagger", name: "Assassin's Dirk", tags: ["Crit", "Kill"], damage: 3, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. Crits on 5 and 6, and its crits deal 50% more. Works in the off-hand.",
    hooks: { modifyAttack: (_b, c) => { if (c.kind === "crit") c.mult *= 1.5; } } },
  { id: "d_bloodthirst_kris", kind: "weapon", slot: "main", weaponType: "dagger", name: "Bloodthirst Kris", tags: ["Crit", "Blood"], damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. Your crits heal 3. Works in the off-hand.", hooks: { onCrit: (b, c) => { heal(b, c.attacker, 3, "Bloodthirst Kris"); } } },
  { id: "d_widows_fang", kind: "weapon", slot: "main", weaponType: "dagger", name: "Widow's Fang", tags: ["Crit", "Poison"], damage: 3, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "Dagger. Your crits apply 3 Poison and 1 Blind. Works in the off-hand.",
    hooks: { onCrit: (b, c) => { applyStatus(b, c.attacker, c.defender, "poison", 3); applyStatus(b, c.attacker, c.defender, "blind", 1); } } },
  { id: "d_glass_stiletto", kind: "weapon", slot: "main", weaponType: "dagger", name: "Glass Stiletto", tags: ["Crit"], damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "Dagger. −6 Max HP, +8% Crit chance. Works in the off-hand.", hooks: { stats: s => { s.maxHp -= 6; s.critChance += 8; } } },
  { id: "d_shadow_dagger", kind: "weapon", slot: "main", weaponType: "dagger", name: "Shadow Dagger", tags: ["Crit", "Tempo"], damage: 3, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "Dagger. −4 Max HP, +5% Crit chance. Works in the off-hand.", hooks: { stats: s => { s.maxHp -= 4; s.critChance += 5; } } },
  { id: "d_cursed_athame", kind: "weapon", slot: "main", weaponType: "dagger", name: "Cursed Athame", minItemRarity: "rare", tags: ["Crit", "Hex"], damage: 5, offDamage: 4,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. −10 Max HP, +12% Crit chance; crits on 5 and 6. Works in the off-hand.", hooks: { stats: s => { s.maxHp -= 10; s.critChance += 12; } } }
];

// ---------- Throwing weapons: off-hand dice that punish poisoned, burning or blinded foes ----------
const bonusVs = (status: StatusId, n: number) => ({ modifyAttack: (_b: Battle, c: AttackCtx) => { if (c.offhand && st(c.defender, status) > 0) c.bonus += n; } });
const KNIFE: FaceSpec[] = [MISS, HIT, HIT, HIT, CRIT, CRIT];
const STAR: FaceSpec[] = [GRAZE, HIT, HIT, CRIT, CRIT, CRIT];
const KUNAI: FaceSpec[] = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
export const THROWN_WEAPONS: GearBase[] = [
  // Throwing knives
  { id: "tk_venom_knives", kind: "weapon", slot: "main", weaponType: "throwing", name: "Venom-Tipped Knives", tags: ["Crit", "Poison"], damage: 2, offDamage: 2,
    faces: KNIFE, text: "Throwing knives. Off-hand throws deal +3 to Poisoned enemies.", hooks: bonusVs("poison", 3) },
  { id: "tk_ember_knives", kind: "weapon", slot: "main", weaponType: "throwing", name: "Ember Knives", tags: ["Crit", "Burn"], damage: 2, offDamage: 2,
    faces: KNIFE, text: "Throwing knives. Off-hand throws deal +3 to Burning enemies.", hooks: bonusVs("burn", 3) },
  { id: "tk_hunters_knives", kind: "weapon", slot: "main", weaponType: "throwing", name: "Hunter's Knives", tags: ["Crit", "Hex"], damage: 2, offDamage: 3,
    faces: KNIFE, text: "Throwing knives. Off-hand throws deal +3 to Blinded enemies.", hooks: bonusVs("blind", 3) },
  // Kunai
  { id: "ku_kunai", kind: "weapon", slot: "main", weaponType: "kunai", name: "Kunai", tags: ["Tempo"], damage: 2, offDamage: 3,
    faces: KUNAI, text: "Kunai. A sturdy throwing blade. Best in the off-hand.", hooks: {} },
  { id: "ku_fire_kunai", kind: "weapon", slot: "main", weaponType: "kunai", name: "Fire Kunai", tags: ["Tempo", "Burn"], damage: 2, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Ignite", "crit", hex("burn", 2))], text: "Kunai. A 6 Ignites (2 Burn); off-hand throws deal +3 to Burning enemies.", hooks: bonusVs("burn", 3) },
  { id: "ku_smoke_kunai", kind: "weapon", slot: "main", weaponType: "kunai", name: "Smoke Kunai", tags: ["Tempo", "Hex"], damage: 2, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Smoke", "crit", hex("blind", 1))], text: "Kunai. A 6 bursts into Smoke (Blind); off-hand throws deal +4 to Blinded enemies.", hooks: bonusVs("blind", 4) },
  { id: "ku_venom_kunai", kind: "weapon", slot: "main", weaponType: "kunai", name: "Venom Kunai", minItemRarity: "uncommon", tags: ["Tempo", "Poison"], damage: 2, offDamage: 3,
    faces: [GRAZE, spell("Venom", "hit", hex("poison", 2)), HIT, HIT, HIT, CRIT], text: "Kunai. A 2 envenoms (2 Poison); off-hand throws deal +3 to Poisoned enemies.", hooks: bonusVs("poison", 3) },
  // Shuriken
  { id: "sh_shuriken", kind: "weapon", slot: "main", weaponType: "shuriken", name: "Shuriken", tags: ["Crit"], damage: 1, offDamage: 2,
    faces: STAR, text: "Shuriken. Light, but crits on 4, 5 and 6. Best in the off-hand.", hooks: {} },
  { id: "sh_poison_stars", kind: "weapon", slot: "main", weaponType: "shuriken", name: "Poison Stars", tags: ["Crit", "Poison"], damage: 1, offDamage: 2,
    faces: STAR, text: "Shuriken. Crits on 4–6; off-hand throws deal +3 to Poisoned enemies.", hooks: bonusVs("poison", 3) },
  { id: "sh_flash_stars", kind: "weapon", slot: "main", weaponType: "shuriken", name: "Flash Stars", tags: ["Crit", "Hex"], damage: 1, offDamage: 2,
    faces: STAR, text: "Shuriken. Crits on 4–6; off-hand throws deal +3 to Blinded enemies.", hooks: bonusVs("blind", 3) },
  { id: "sh_cinder_stars", kind: "weapon", slot: "main", weaponType: "shuriken", name: "Cinder Stars", minItemRarity: "uncommon", tags: ["Crit", "Burn"], damage: 1, offDamage: 3,
    faces: STAR, text: "Shuriken. Crits on 4–6; off-hand throws deal +3 to Burning enemies.", hooks: bonusVs("burn", 3) }
];

// ---------- Grenades: off-hand only, no damage, just a status. Thrown on round 1 and every 3rd round after. ----------
/** 1–2: 1 round, 3–4: 2, 5: 3, 6: 4. */
const byRoll = (face: number) => (face <= 2 ? 1 : face <= 4 ? 2 : face === 5 ? 3 : 4);
const lob = (name: string, fx: (b: Battle, c: AttackCtx) => void): FaceSpec => ({ kind: "hit", name, run: (b, c) => { c.noDamage = true; fx(b, c); } });
const grenade = (id: string, name: string, tags: GearBase["tags"], text: string, face: (n: number) => FaceSpec, minItemRarity?: GearBase["minItemRarity"]): GearBase => ({
  id, kind: "weapon", slot: "main", weaponType: "grenade", name, tags, damage: 0, offDamage: 0, minItemRarity,
  faces: [1, 2, 3, 4, 5, 6].map(face), text: `Grenade (off-hand only): thrown on round 1 and every 3rd round after. No damage — ${text}`, hooks: {}
});
export const GRENADES: GearBase[] = [
  grenade("gr_flashbang", "Flashbang", ["Hex", "Tempo"], "it Dazzles: the enemy's attacks miss for 1–4 rounds (higher roll, longer).",
    n => lob("Flash", (b, c) => applyStatus(b, c.attacker, c.defender, "dazzled", byRoll(n)))),
  grenade("gr_toxic", "Toxic Grenade", ["Poison"], "it applies 2 + your roll in Poison.", n => lob("Gas", (b, c) => applyStatus(b, c.attacker, c.defender, "poison", 2 + n))),
  grenade("gr_firebomb", "Fire Bomb", ["Burn"], "it applies 2 + your roll in Burn; a 6 also leaves them Smouldering.",
    n => lob("Blaze", (b, c) => { applyStatus(b, c.attacker, c.defender, "burn", 2 + n); if (n === 6) applyStatus(b, c.attacker, c.defender, "smoulder", 1); })),
  grenade("gr_frost_bomb", "Frost Bomb", ["Frost"], "it applies Chill by roll (1–4), plus Soaked on a 5 or 6.",
    n => lob("Rime", (b, c) => { applyStatus(b, c.attacker, c.defender, "chill", byRoll(n)); if (n >= 5) applyStatus(b, c.attacker, c.defender, "soaked", 2); })),
  grenade("gr_hex_bomb", "Hex Bomb", ["Hex"], "it applies Weak and Exposed, each lasting 1–4 rounds by roll.",
    n => lob("Curse", (b, c) => { applyStatus(b, c.attacker, c.defender, "weak", byRoll(n)); applyStatus(b, c.attacker, c.defender, "exposed", byRoll(n)); }), "uncommon")
];

// ---------- Thrower gear: buffs while a throwing knife, kunai or shuriken is in your off-hand ----------
export const THROWER_GEAR: GearBase[] = [
  { id: "t_bandolier", kind: "trinket", slot: "trinket", name: "Thrower's Bandolier", tags: ["Crit", "Tempo"],
    text: "With throwing knives, kunai or shuriken in your off-hand: off-hand throws deal +2, and +5% Crit chance.",
    hooks: { modifyAttack: (_b, c) => { if (c.offhand && throwerOff(c.attacker)) c.bonus += 2; } } }, // +5% Crit chance: hero.ts
  { id: "t_ninja_sash", kind: "trinket", slot: "trinket", name: "Shinobi Sash", tags: ["Tempo", "Crit"], minItemRarity: "uncommon",
    text: "With kunai or shuriken in your off-hand: your off-hand die also crits on a 5.",
    hooks: { modifyAttack: (_b, c) => { if (c.offhand && (c.attacker.offType === "kunai" || c.attacker.offType === "shuriken") && c.face === 5 && c.kind === "hit") { c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; } } } },
  { id: "w_ninjato", kind: "weapon", slot: "main", name: "Ninjato", tags: ["Strike", "Tempo"], damage: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "With throwing knives, kunai or shuriken in your off-hand: +2 Damage on this blade.",
    hooks: { modifyAttack: (_b, c) => { if (!c.offhand && throwerOff(c.attacker)) c.bonus += 2; } } },
  { id: "w_knifefighter", kind: "weapon", slot: "main", weaponType: "dagger", name: "Knife-Fighter's Blade", tags: ["Crit", "Tempo"], damage: 4,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. Crits on 5 and 6. With throwing knives in your off-hand, your crits make the next throw deal +4.",
    hooks: { onCrit: (_b, c) => { if (!c.offhand && c.attacker.offType === "throwing") c.attacker.flags["kfNext"] = 1; },
      modifyAttack: (_b, c) => { if (c.offhand && c.attacker.flags["kfNext"]) { c.attacker.flags["kfNext"] = 0; c.bonus += 4; } } } }
];

// ---------- Dodge-scaling weapons ----------
export const DODGE_WEAPONS: GearBase[] = [
  { id: "w_windblade", kind: "weapon", slot: "main", name: "Windblade", minItemRarity: "uncommon", tags: ["Tempo", "Strike"], damage: 4,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "+1 Damage for every 5% Dodge you have.", hooks: { modifyAttack: (_b, c) => { if (!c.offhand) c.bonus += Math.floor((c.attacker.dodge ?? 0) / 5); } } },
  { id: "w_mirage_sabre", kind: "weapon", slot: "main", name: "Mirage Sabre", minItemRarity: "uncommon", tags: ["Tempo", "Crit"], damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: "Your Crit chance rises by half your Dodge. Works in the off-hand.", hooks: {} }, // hero.ts
  { id: "w_phantom_kris", kind: "weapon", slot: "main", weaponType: "dagger", name: "Phantom Kris", minItemRarity: "rare", tags: ["Tempo", "Crit"], damage: 4, offDamage: 3,
    faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. When you Dodge, your next attack is a guaranteed Crit. Works in the off-hand.",
    hooks: { onDodge: (_b, c) => { c.defender.flags["phantomCrit"] = 1; },
      modifyAttack: (_b, c) => { if (c.attacker.flags["phantomCrit"] && (c.kind === "hit" || c.kind === "graze")) { c.attacker.flags["phantomCrit"] = 0; c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; } } } }
];

// ---------- Heavy armour, at every rarity ----------
export const HEAVY_ARMOURS: GearBase[] = [
  { id: "h_iron_plate", kind: "armour", slot: "armour", name: "Iron Plate Armour", onlyRarity: "common", tags: ["Guard"], armor: 4, text: "Heavy: +4 Armor.", hooks: {} },
  { id: "h_banded_plate", kind: "armour", slot: "armour", name: "Banded Plate", onlyRarity: "uncommon", tags: ["Guard", "Blood"], armor: 5, maxHp: 3, text: "Heavy: +5 Armor and +3 Max HP.", hooks: {} },
  { id: "h_knights_panoply", kind: "armour", slot: "armour", name: "Knight's Panoply", minItemRarity: "rare", tags: ["Guard", "Strike"], armor: 7, maxHp: 6,
    text: "Heavy: +7 Armor and +6 Max HP, −1 Damage.", hooks: { stats: s => { s.damage -= 1; s.offDamage -= 1; } } },
  { id: "h_titanforged", kind: "armour", slot: "armour", name: "Titanforged Plate", minItemRarity: "epic", tags: ["Guard", "Strike"], armor: 9, maxHp: 8,
    text: "Heavy: +9 Armor and +8 Max HP. Guarding gives 3 Might.", hooks: { onGuard: (b, f) => applyStatus(b, f, f, "might", 3) } }
];

// ---------- Crit relics ----------
const relic = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "relic", ...d });
export const CRIT_RELICS: HookDef[] = [
  relic({ id: "r_hunters_eye", name: "Hunter's Eye", rarity: "uncommon", tags: ["Crit"], text: "+4% Crit chance (+3%)", hooks: { stats: (s, n) => { s.critChance += 4 + 3 * (n - 1); } } }),
  relic({ id: "r_lethal_focus", name: "Lethal Focus", rarity: "common", tags: ["Crit", "Hex"], text: "Your crits apply 1 Exposed (+1)", hooks: { onCrit: (b, c, n) => applyStatus(b, c.attacker, c.defender, "exposed", n) } }),
  relic({ id: "r_bleeding_edge", name: "Bleeding Edge", rarity: "common", tags: ["Crit", "Bleed"], text: "Your crits apply 2 Bleed (+1)", hooks: { onCrit: (b, c, n) => applyStatus(b, c.attacker, c.defender, "bleed", 1 + n) } }),
  relic({ id: "r_glass_cannon", name: "Glass Cannon Charm", rarity: "rare", tags: ["Crit"], text: "−8 Max HP, +10% Crit chance (+5%)", hooks: { stats: (s, n) => { s.maxHp -= 8; s.critChance += 10 + 5 * (n - 1); } } }),
  relic({ id: "r_critical_mass", name: "Critical Mass", rarity: "rare", tags: ["Crit", "Kill"], text: "Every 3rd crit in a fight deals triple damage",
    hooks: { modifyAttack: (b, c) => { if (c.kind !== "crit") return; const n = (c.attacker.flags["critCount"] ?? 0) + 1; c.attacker.flags["critCount"] = n; if (n % 3 === 0) { c.mult *= 1.5; b.log.push("💥 Critical Mass!"); } } } })
];
