// The Treasury: 5 new items per rarity (Rare, Epic, Legendary, Crimson) for each item type
// (weapons, off-hands, armour, trinkets). 80 items, all at normal drop odds for their rarity.
import type { AttackCtx, Battle, Fighter, GearBase, StatusId } from "../engine/types";
import { NEGATIVE_STATUSES } from "../engine/types";
import { applyStatus, cast, CRIT, GRAZE, heal, hex, HIT, log, MISS, on, other, ping, spell, st } from "./helpers";

const rare = (d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity: "rare" });
const epic = (d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity: "epic" });
const legendary = (d: Omit<GearBase, "rarity">): GearBase => ({ ...d, rarity: "legendary" });
const crimson = (d: Omit<GearBase, "rarity">): GearBase => ({ ...d, rarity: "crimson" });

const PLAIN = [GRAZE, HIT, HIT, HIT, HIT, CRIT];
const NEG = NEGATIVE_STATUSES as readonly StatusId[];
const negKinds = (f: Fighter) => NEG.filter(s => st(f, s) > 0).length;
const mainHit = (fn: (b: Battle, c: AttackCtx) => void) => (b: Battle, c: AttackCtx) => { if (!c.offhand) fn(b, c); };

// ===================== RARE =====================
export const RARE_ITEMS: GearBase[] = [
  // Weapons
  rare({ id: "rr_sunsteel", kind: "weapon", slot: "main", name: "Sunsteel Sword", tags: ["Strike", "Burn"], damage: 6, faces: PLAIN, text: "Your crits apply 2 Burn.", hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2) } }),
  rare({ id: "rr_frostbite_axe", kind: "weapon", slot: "main", name: "Frostbite Axe", tags: ["Strike", "Frost"], damage: 6, faces: [MISS, HIT, HIT, HIT, HIT, CRIT], text: "Hits from this axe apply 1 Chill.", hooks: { onHit: mainHit((b, c) => applyStatus(b, c.attacker, c.defender, "chill", 1)) } }),
  rare({ id: "rr_ironwood_staff", kind: "weapon", slot: "main", name: "Ironwood Staff", tags: ["Arcane", "Burn", "Frost", "Storm"], damage: 7, twoHanded: true,
    faces: [cast("Spark", "graze", hex("burn", 2)), HIT, cast("Frost", "hit", hex("chill", 2)), HIT, cast("Crackle", "hit", hex("static", 3)), CRIT], text: "Two-handed. Sparks, frost and static.", hooks: {} }),
  rare({ id: "rr_reaver", kind: "weapon", slot: "main", name: "Reaver", tags: ["Kill", "Blood"], damage: 5, faces: PLAIN, text: "Kills heal 4.", hooks: { onKill: (b, c) => { heal(b, c.attacker, 4, "Reaver"); } } }),
  rare({ id: "rr_bonebreaker", kind: "weapon", slot: "main", name: "Bonebreaker", tags: ["Strike", "Guard"], damage: 6, faces: [MISS, HIT, HIT, HIT, HIT, spell("Break", "crit", (b, c) => { applyStatus(b, c.attacker, c.defender, "stun", 1); applyStatus(b, c.attacker, c.defender, "exposed", 2); })], text: "A 6 Breaks bones: Stun and Exposed 2.", hooks: {} }),
  // Off-hands
  rare({ id: "rr_gilded_kite", kind: "off", slot: "off", name: "Gilded Kite Shield", shield: true, tags: ["Guard", "Holy"], armor: 3, text: "+3 Armor. Guarding gives Ward.", hooks: { onGuard: (b, f) => applyStatus(b, f, f, "ward", 1) } }),
  rare({ id: "rr_battle_spellbook", kind: "off", slot: "off", name: "Battle Spellbook", barrierElement: "burn", tags: ["Arcane", "Burn"], text: "Spell Amp +10%. On a 6: apply 2 Burn.", hooks: { stats: s => { s.spellAmp += 10; }, face: [on(6, (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2))] } }),
  rare({ id: "rr_skinning_knife", kind: "weapon", slot: "main", weaponType: "dagger", name: "Skinning Knife", tags: ["Bleed", "Crit"], damage: 3, offDamage: 4, faces: PLAIN, text: "Dagger. Its hits apply 1 Bleed. Best in the off-hand.", hooks: { onHit: (b, c) => { if (c.offhand) applyStatus(b, c.attacker, c.defender, "bleed", 1); } } }),
  rare({ id: "rr_warding_lantern", kind: "off", slot: "off", name: "Warding Lantern", tags: ["Guard", "Blood"], text: "Start each fight with Ward. When your Ward blocks a status, gain 2 Regen.", hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1), onWard: (b, f) => applyStatus(b, f, f, "regen", 2) } }),
  rare({ id: "rr_war_horn", kind: "off", slot: "off", name: "War Horn", tags: ["Strike", "Tempo"], text: "Every 3rd round, gain 2 Might.", hooks: { onRoundStart: (b, f) => { if (b.round % 3 === 0) applyStatus(b, f, f, "might", 2); } } }),
  // Armour
  rare({ id: "rr_ranger_mail", kind: "armour", slot: "armour", name: "Ranger's Mail", tags: ["Tempo", "Guard"], armor: 3, dodge: { rare: 5 }, text: "Medium: +3 Armor and a little Dodge.", hooks: {} }),
  rare({ id: "rr_ember_plate", kind: "armour", slot: "armour", name: "Ember-Forged Plate", tags: ["Guard", "Burn"], armor: 5, text: "Heavy: +5 Armor. Attackers that hit you take 1 Burn.", hooks: { whenHit: (b, c) => { if (c.dealt > 0) applyStatus(b, c.defender, c.attacker, "burn", 1); } } }),
  rare({ id: "rr_sage_robe", kind: "armour", slot: "armour", name: "Sage's Robe", tags: ["Arcane", "Guard"], armor: 1, text: "Light: +1 Armor, Spell Amp +12%. Start each fight with Ward.", hooks: { stats: s => { s.spellAmp += 12; }, onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1) } }),
  rare({ id: "rr_bloodmail", kind: "armour", slot: "armour", name: "Bloodmail", tags: ["Blood", "Guard"], armor: 3, text: "Medium: +3 Armor. Heal 1 whenever you land a hit.", hooks: { onHit: (b, c) => { heal(b, c.attacker, 1, "Bloodmail"); } } }),
  rare({ id: "rr_bulwark_coat", kind: "armour", slot: "armour", name: "Bulwark Coat", tags: ["Guard", "Blood"], armor: 4, maxHp: 5, text: "Heavy: +4 Armor, +5 Max HP. Guarding gives 3 Barrier.", hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", 3) } }),
  // Trinkets
  rare({ id: "rr_sharpshooter_lens", kind: "trinket", slot: "trinket", name: "Sharpshooter's Lens", tags: ["Crit"], text: "+6% Crit chance.", hooks: { stats: s => { s.critChance += 6; } } }),
  rare({ id: "rr_iron_heart", kind: "trinket", slot: "trinket", name: "Iron Heart", tags: ["Guard", "Blood"], armor: 2, maxHp: 4, text: "+2 Armor and +4 Max HP.", hooks: {} }),
  rare({ id: "rr_vampire_tooth", kind: "trinket", slot: "trinket", name: "Vampire's Tooth", tags: ["Blood", "Crit"], text: "Your crits heal 3.", hooks: { onCrit: (b, c) => { heal(b, c.attacker, 3, "Vampire's Tooth"); } } }),
  rare({ id: "rr_cinder_ring", kind: "trinket", slot: "trinket", name: "Ring of Cinders", tags: ["Burn"], text: "Each fight, the enemy starts with 2 Burn. Burn you apply gets +1.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, other(b, f), "burn", 2), onStatusApplied: (_b, self, t, s) => { if (s === "burn" && t !== self) t.statuses.burn = st(t, "burn") + 1; } } }),
  rare({ id: "rr_runic_band", kind: "trinket", slot: "trinket", name: "Runic Band", tags: ["Arcane", "Hex"], text: "Spell Amp +8%. Reactions you cause deal +20%.", hooks: { stats: s => { s.spellAmp += 8; }, reactionMult: () => 1.2 } })
];

// ===================== EPIC =====================
export const EPIC_ITEMS: GearBase[] = [
  // Weapons
  epic({ id: "ee_dawnspear", kind: "weapon", slot: "main", name: "Dawnspear", tags: ["Holy", "Burn"], damage: 9, twoHanded: true, faces: PLAIN, text: "Holy. Two-handed. Every hit applies 2 Burn; crits heal 4.",
    hooks: { onHit: mainHit((b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2)), onCrit: (b, c) => { heal(b, c.attacker, 4, "Dawnspear"); } } }),
  epic({ id: "ee_glacier_edge", kind: "weapon", slot: "main", name: "Glacier's Edge", tags: ["Frost", "Strike"], damage: 7, faces: PLAIN, text: "Every hit applies 1 Chill. Chilled enemies take +3.",
    hooks: { onHit: mainHit((b, c) => applyStatus(b, c.attacker, c.defender, "chill", 1)), modifyAttack: (_b, c) => { if (!c.offhand && st(c.defender, "chill") > 0) c.bonus += 3; } } }),
  epic({ id: "ee_tempest_blade", kind: "weapon", slot: "main", name: "Tempest Blade", tags: ["Storm", "Strike"], damage: 6,
    faces: [GRAZE, HIT, HIT, HIT, HIT, spell("Thunder", "crit", hex("shock", 1))], text: "Every hit applies 2 Static; a 6 Shocks it all off.", hooks: { onHit: mainHit((b, c) => applyStatus(b, c.attacker, c.defender, "static", 2)) } }),
  epic({ id: "ee_soulreaver", kind: "weapon", slot: "main", name: "Soulreaver", tags: ["Kill", "Blood"], damage: 7, faces: PLAIN, text: "Kills restore 15% of your Max HP.", hooks: { onKill: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.15), "Soulreaver"); } } }),
  epic({ id: "ee_archon_staff", kind: "weapon", slot: "main", name: "Archon's Staff", tags: ["Arcane", "Burn", "Frost", "Storm"], damage: 7, twoHanded: true,
    faces: [cast("Venom", "graze", hex("poison", 3)), cast("Fire", "hit", hex("burn", 3)), cast("Frost", "hit", hex("chill", 2)), cast("Static", "hit", hex("static", 3)), cast("Hex", "hit", hex("exposed", 2)), cast("Storm", "crit", hex("shock", 1))],
    text: "Two-handed. Every face is a spell.", hooks: {} }),
  // Off-hands
  epic({ id: "ee_dragonscale_shield", kind: "off", slot: "off", name: "Dragonscale Shield", shield: true, tags: ["Guard", "Burn"], armor: 5, text: "+5 Armor. You can't be Burned. While Guarding, attackers take 4 Burn.",
    hooks: { incomingStatus: (_b, _f, s, n) => (s === "burn" ? 0 : n), whenHit: (b, c) => { if (c.defender.flags["guarding"]) applyStatus(b, c.defender, c.attacker, "burn", 4); } } }),
  epic({ id: "ee_tome_tempest", kind: "off", slot: "off", name: "Tome of the Tempest", barrierElement: "static", tags: ["Arcane", "Storm"], text: "Spell Amp +15%. Your hits apply 1 Static.", hooks: { stats: s => { s.spellAmp += 15; }, onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "static", 1) } }),
  epic({ id: "ee_twin_kris", kind: "weapon", slot: "main", weaponType: "dagger", name: "Twin Kris", tags: ["Crit", "Bleed"], damage: 4, offDamage: 5, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT], text: "Dagger. Crits on 5 and 6; its crits apply 2 Bleed. Best in the off-hand.",
    hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 2) } }),
  epic({ id: "ee_saints_censer", kind: "off", slot: "off", name: "Saint's Censer", tags: ["Holy", "Burn", "Blood"], text: "Holy. Each round, heal 2 and apply 2 Burn.", hooks: { onRoundStart: (b, f) => { heal(b, f, 2, "Saint's Censer"); applyStatus(b, f, other(b, f), "burn", 2); } } }),
  epic({ id: "ee_mirror_aegis", kind: "off", slot: "off", name: "Mirror Aegis", shield: true, tags: ["Guard", "Hex"], armor: 4, text: "+4 Armor. While Guarding, negative statuses aimed at you bounce back.",
    hooks: { incomingStatus: (b, self, s, n) => { if (!self.flags["guarding"] || !NEG.includes(s) || self.flags["aegisBounce"]) return n; self.flags["aegisBounce"] = 1; applyStatus(b, self, other(b, self), s, n); self.flags["aegisBounce"] = 0; return 0; } } }),
  // Armour
  epic({ id: "ee_stormplate", kind: "armour", slot: "armour", name: "Stormplate", tags: ["Guard", "Storm"], armor: 6, text: "Heavy: +6 Armor. Attackers gain 2 Static. You can't be Shocked.",
    hooks: { whenHit: (b, c) => applyStatus(b, c.defender, c.attacker, "static", 2), incomingStatus: (_b, _f, s, n) => (s === "shock" ? 0 : n) } }),
  epic({ id: "ee_shadowweave", kind: "armour", slot: "armour", name: "Shadowweave", tags: ["Tempo", "Crit"], armor: 1, dodge: { epic: 15 }, text: "Light: +1 Armor, 15% Dodge. Your first Dodge each fight gives Haste.",
    hooks: { onDodge: (b, c) => { if (!c.defender.flags["weave"]) { c.defender.flags["weave"] = 1; applyStatus(b, c.defender, c.defender, "haste", 1); } } } }),
  epic({ id: "ee_archmage_vest", kind: "armour", slot: "armour", name: "Vestments of the Archmage", tags: ["Arcane"], armor: 2, text: "Light: +2 Armor, Spell Amp +25%. Statuses your spells apply get +1.",
    hooks: { stats: s => { s.spellAmp += 25; }, onStatusApplied: (_b, self, t, s) => { if (self.flags["casting"] && t !== self && s !== "stun" && s !== "shock") t.statuses[s] = st(t, s) + 1; } } }),
  epic({ id: "ee_juggernaut_shell", kind: "armour", slot: "armour", name: "Juggernaut's Shell", tags: ["Guard", "Strike"], armor: 8, maxHp: 10, text: "Heavy: +8 Armor, +10 Max HP, −1 Damage. Guarding gives 2 Might.",
    hooks: { stats: s => { s.damage -= 1; s.offDamage -= 1; }, onGuard: (b, f) => applyStatus(b, f, f, "might", 2) } }),
  epic({ id: "ee_lifeweave", kind: "armour", slot: "armour", name: "Lifeweave Robe", tags: ["Blood"], armor: 2, text: "Light: +2 Armor. Start each fight with 5 Regen. Healing you receive +25%.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 5), healMult: () => 1.25 } }),
  // Trinkets
  epic({ id: "ee_hawk_eye", kind: "trinket", slot: "trinket", name: "Eye of the Hawk", tags: ["Crit"], text: "+10% Crit chance.", hooks: { stats: s => { s.critChance += 10; } } }),
  epic({ id: "ee_phoenix_feather", kind: "trinket", slot: "trinket", name: "Phoenix Feather", tags: ["Blood", "Burn"], text: "Once per fight, when you fall below a quarter of your HP, heal 25% and Burn the enemy for 6.",
    hooks: { onRoundEnd: (b, f) => { if (!f.flags["feather"] && f.hp > 0 && f.hp < f.maxHp / 4) { f.flags["feather"] = 1; heal(b, f, Math.ceil(f.maxHp / 4), "Phoenix Feather"); applyStatus(b, f, other(b, f), "burn", 6); } } } }),
  epic({ id: "ee_stormheart_pendant", kind: "trinket", slot: "trinket", name: "Stormcaller's Pendant", tags: ["Storm"], text: "On a 6: apply 4 Static. Static on enemies deals +2 per tick.", hooks: { face: [on(6, (b, c) => applyStatus(b, c.attacker, c.defender, "static", 4))] } }), // tick bonus: statuses.ts
  epic({ id: "ee_titan_ring", kind: "trinket", slot: "trinket", name: "Titan's Ring", tags: ["Guard", "Blood"], armor: 3, maxHp: 8, text: "+3 Armor and +8 Max HP.", hooks: {} }),
  epic({ id: "ee_alchemist_eye", kind: "trinket", slot: "trinket", name: "Alchemist's Eye", tags: ["Arcane", "Hex"], text: "Reactions you cause deal +50%.", hooks: { reactionMult: () => 1.5 } })
];

// ===================== LEGENDARY =====================
export const LEGENDARY_ITEMS: GearBase[] = [
  // Weapons
  legendary({ id: "lx_sunblade", kind: "weapon", slot: "main", name: "Sunblade", tags: ["Holy", "Burn"], damage: 8, faces: PLAIN,
    legendary: { minFloor: 2, asBase: "w_sword", reveal: "Holy. Every hit applies 2 Burn. Against Undead, Vampires and Crimson foes, every crit Stuns." },
    text: "It was forged at noon and never learned dusk.", hooks: { onHit: mainHit((b, c) => applyStatus(b, c.attacker, c.defender, "burn", 2)), onCrit: (b, c) => { const d = c.defender; if (d.family === "Undead" || d.crimson || d.items["x_vampiric"] || d.items["m_lifedrink"]) applyStatus(b, c.attacker, d, "stun", 1); } } }),
  legendary({ id: "lx_winters_grasp", kind: "weapon", slot: "main", name: "Winter's Grasp", tags: ["Frost", "Strike"], damage: 10, twoHanded: true, faces: [MISS, HIT, HIT, HIT, HIT, CRIT],
    legendary: { minFloor: 3, asBase: "w_axe", reveal: "Two-handed. Every hit applies 2 Chill. Chilled enemies take +5." },
    text: "The cold remembers every hand that held it.", hooks: { onHit: mainHit((b, c) => applyStatus(b, c.attacker, c.defender, "chill", 2)), modifyAttack: (_b, c) => { if (!c.offhand && st(c.defender, "chill") > 0) c.bonus += 5; } } }),
  legendary({ id: "lx_void_staff", kind: "weapon", slot: "main", name: "Staff of the Void", tags: ["Arcane", "Hex", "Kill"], damage: 5,
    faces: [1, 2, 3, 4, 5, 6].map(n => cast(n === 6 ? "Oblivion" : "Void", n === 6 ? "crit" : n === 1 ? "graze" : "hit", (b, c) => { applyStatus(b, c.attacker, c.defender, "doom", 2); const pool: StatusId[] = ["burn", "poison", "chill", "weak", "exposed"]; applyStatus(b, c.attacker, c.defender, pool[Math.floor(b.rng() * pool.length)], 2); })),
    legendary: { minFloor: 3, asBase: "w_staff", reveal: "Every face is a spell that applies 2 Doom and 2 of a random status." },
    text: "Look into it long enough and it looks back.", hooks: {} }),
  legendary({ id: "lx_regicide", kind: "weapon", slot: "main", weaponType: "dagger", name: "Regicide", tags: ["Crit", "Kill"], damage: 6, offDamage: 5, faces: [GRAZE, HIT, HIT, CRIT, CRIT, CRIT],
    legendary: { minFloor: 2, asBase: "w_dagger", reveal: "Dagger. Crits on 4, 5 and 6. Crits against bosses and Elites deal triple." },
    text: "Every crown has a seam.", hooks: { modifyAttack: (_b, c) => { if (c.kind === "crit" && (c.defender.boss || c.defender.elite)) c.mult *= 1.5; } } }),
  legendary({ id: "lx_hammer_judgement", kind: "weapon", slot: "main", name: "Hammer of Judgement", tags: ["Holy", "Strike"], damage: 7, faces: PLAIN,
    legendary: { minFloor: 3, asBase: "w_mace", reveal: "Holy. Every 3rd hit you land also deals 10% of the enemy's Max HP." },
    text: "It doesn't ask what you did. It already knows.", hooks: { onHit: mainHit((b, c) => { const n = (c.attacker.flags["judged"] ?? 0) + 1; c.attacker.flags["judged"] = n; if (n % 3 === 0) ping(b, c.defender, Math.ceil(c.defender.maxHp * 0.1), "⚖️ Judgement"); }) } }),
  // Off-hands
  legendary({ id: "lx_bulwark_kings", kind: "off", slot: "off", shield: true, name: "Bulwark of Kings", tags: ["Guard"], armor: 6,
    legendary: { minFloor: 3, asBase: "o_wooden_shield", reveal: "Shield. +6 Armor. Guarding gives Barrier equal to three times your Armor." },
    text: "Seven kings sheltered behind it. None of them fell.", hooks: { onGuard: (b, f) => applyStatus(b, f, f, "barrier", 3 * f.armor) } }),
  legendary({ id: "lx_inferno_heart", kind: "off", slot: "off", barrierElement: "burn", name: "Heart of the Inferno", tags: ["Burn", "Arcane"],
    legendary: { minFloor: 2, asBase: "o_ember_charm", reveal: "Every hit you land applies 3 Burn, and Burn on the enemy never halves." },
    text: "Still beating. Still burning.", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "burn", 3), onRoundStart: (b, f) => { other(b, f).flags["burnNoHalve"] = 1; } } }),
  legendary({ id: "lx_seraph_wing", kind: "off", slot: "off", name: "Seraph's Wing", tags: ["Holy", "Guard"],
    legendary: { minFloor: 3, asBase: "o_holy_symbol", reveal: "Holy. Your Ward returns at the start of every round." },
    text: "A single feather, and it's enough.", hooks: { onRoundStart: (b, f) => applyStatus(b, f, f, "ward", 1) } }),
  legendary({ id: "lx_book_dead", kind: "off", slot: "off", barrierElement: "doom", name: "Book of the Dead", tags: ["Hex", "Kill"],
    legendary: { minFloor: 4, asBase: "o_tome", reveal: "On a 1, 2 or 3: apply 3 Doom. Doom kills once it reaches 60% of the enemy's HP." },
    text: "The names inside are still being written.",
    hooks: { face: [on("any", (b, c) => { if (c.face <= 3) applyStatus(b, c.attacker, c.defender, "doom", 3); })],
      onRoundEnd: (b, f) => { const e = other(b, f); if (e.hp > 0 && st(e, "doom") > 0 && st(e, "doom") >= e.hp * 0.6) { e.hp = 0; log(b, "📕 The Book of the Dead closes on its name."); } } } }),
  legendary({ id: "lx_windwall", kind: "off", slot: "off", shield: true, name: "Windwall Buckler", tags: ["Tempo", "Guard"], armor: 2, dodge: { legendary: 20 },
    legendary: { minFloor: 3, asBase: "o_buckler", reveal: "Shield. +2 Armor and 20% Dodge. Every Dodge throws 5 damage back." },
    text: "Blows slide off it like rain off glass.", hooks: { onDodge: (b, c) => ping(b, c.attacker, 5, "Windwall") } }),
  // Armour
  legendary({ id: "lx_dragonlord_plate", kind: "armour", slot: "armour", name: "Dragonlord Plate", tags: ["Guard", "Strike"], armor: 8,
    legendary: { minFloor: 3, asBase: "a_plate", reveal: "Heavy: +8 Armor. You can't be Burned or Poisoned. Start every fight with 2 Might." },
    text: "Scales hammered into steel, and steel hammered into legend.",
    hooks: { incomingStatus: (_b, _f, s, n) => (s === "burn" || s === "poison" ? 0 : n), onFightStart: (b, f) => applyStatus(b, f, f, "might", 2) } }),
  legendary({ id: "lx_shadow_mantle", kind: "armour", slot: "armour", name: "Mantle of Shadows", tags: ["Tempo", "Crit"], dodge: { legendary: 25 },
    legendary: { minFloor: 3, asBase: "a_leather", reveal: "25% Dodge. Every Dodge gives 2 Might, and your next attack is a crit." },
    text: "You were never quite where they swung.",
    hooks: { onDodge: (b, c) => { applyStatus(b, c.defender, c.defender, "might", 2); c.defender.flags["mantleCrit"] = 1; },
      modifyAttack: (_b, c) => { if (c.attacker.flags["mantleCrit"] && (c.kind === "hit" || c.kind === "graze")) { c.attacker.flags["mantleCrit"] = 0; c.kind = "crit"; c.mult = 2; c.ignoreArmor = true; } } } }),
  legendary({ id: "lx_archmage_regalia", kind: "armour", slot: "armour", name: "Archmage's Regalia", tags: ["Arcane", "Hex"], armor: 1,
    legendary: { minFloor: 3, asBase: "a_cloth", reveal: "Spell Amp +40%. Reactions you cause deal +50%." },
    text: "It hums with every spell ever cast in it.", hooks: { stats: s => { s.spellAmp += 40; }, reactionMult: () => 1.5 } }),
  legendary({ id: "lx_titan_hide", kind: "armour", slot: "armour", name: "Hide of the Titan", tags: ["Blood", "Guard"], armor: 5, maxHp: 20,
    legendary: { minFloor: 2, asBase: "a_chain", reveal: "+5 Armor and +20 Max HP. Heal 3 at the end of every round." },
    text: "Whatever wore it first was the size of a hill.", hooks: { onRoundEnd: (b, f) => { heal(b, f, 3, "Titan's Hide"); } } }),
  legendary({ id: "lx_saint_shroud", kind: "armour", slot: "armour", name: "Shroud of the Saint", tags: ["Holy", "Blood"], armor: 2,
    legendary: { minFloor: 3, asBase: "a_padded", reveal: "Holy. Healing you receive +50%, and you gain 3 Regen every round." },
    text: "It still smells of incense and old prayers.", hooks: { healMult: () => 1.5, onRoundStart: (b, f) => applyStatus(b, f, f, "regen", 3) } }),
  // Trinkets
  legendary({ id: "lx_tempest_eye", kind: "trinket", slot: "trinket", name: "Eye of the Tempest", tags: ["Storm", "Crit"],
    legendary: { minFloor: 3, asBase: "t_brass_amulet", reveal: "Every hit you land applies 2 Static, and your crits Shock." },
    text: "The calm in the centre of everything.", hooks: { onHit: (b, c) => applyStatus(b, c.attacker, c.defender, "static", 2), onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "shock", 1) } }),
  legendary({ id: "lx_ring_titans", kind: "trinket", slot: "trinket", name: "Ring of Titans", tags: ["Strike", "Guard"], armor: 4,
    legendary: { minFloor: 2, asBase: "t_ring_might", reveal: "+4 Damage and +4 Armor." },
    text: "Too big for any finger. It fits anyway.", hooks: { stats: s => { s.damage += 4; s.offDamage += 4; } } }),
  legendary({ id: "lx_coin_fate", kind: "trinket", slot: "trinket", name: "Coin of Fate", tags: ["Luck", "Crit"], dodge: { legendary: 10 },
    legendary: { minFloor: 2, asBase: "t_lucky_coin", reveal: "+15% Crit chance and 10% Dodge." },
    text: "It has never landed on its edge. Yet.", hooks: { stats: s => { s.critChance += 15; } } }),
  legendary({ id: "lx_heart_world", kind: "trinket", slot: "trinket", name: "Heart of the World", tags: ["Blood"], maxHp: 30,
    legendary: { minFloor: 4, asBase: "t_band_vigor", reveal: "+30 Max HP. Heal 2 at the end of every round." },
    text: "Older than the dungeon. Older than the kingdom.", hooks: { onRoundEnd: (b, f) => { heal(b, f, 2, "Heart of the World"); } } }),
  legendary({ id: "lx_thorn_king", kind: "trinket", slot: "trinket", name: "Crown of the Thorn King", tags: ["Thorns", "Guard"],
    legendary: { minFloor: 3, asBase: "t_thorn_ring", reveal: "When you're hit, the attacker takes half the hit back (before Armor)." },
    text: "He ruled by bleeding everyone who touched him.", hooks: { whenHit: (b, c) => { const n = Math.ceil((c.raw ?? 0) / 2); if (n > 0) ping(b, c.attacker, n, "Thorn King"); } } })
];

// ===================== CRIMSON =====================
export const CRIMSON_ITEMS: GearBase[] = [
  // Weapons
  crimson({ id: "cx_blood_moon_blade", kind: "weapon", slot: "main", name: "Blood Moon Blade", tags: ["Bleed", "Strike"], damage: 10, faces: PLAIN,
    text: "Every hit applies 3 Bleed. Your hits deal +1 for each Bleed stack on the enemy.", hooks: { onHit: mainHit((b, c) => applyStatus(b, c.attacker, c.defender, "bleed", 3)), modifyAttack: (_b, c) => { if (!c.offhand) c.bonus += st(c.defender, "bleed"); } } }),
  crimson({ id: "cx_cataclysm", kind: "weapon", slot: "main", name: "Cataclysm", tags: ["Strike", "Storm"], damage: 13, twoHanded: true, faces: [MISS, HIT, HIT, HIT, HIT, CRIT],
    text: "Two-handed. Every 3rd attack is a Cataclysm: quadruple damage, and it Stuns.",
    hooks: { modifyAttack: (b, c) => { if (c.offhand) return; const n = (c.attacker.flags["cata"] ?? 0) + 1; c.attacker.flags["cata"] = n; if (n % 3 === 0) { c.mult *= 4; applyStatus(b, c.attacker, c.defender, "stun", 1); log(b, "☄️ CATACLYSM!"); } } } }),
  crimson({ id: "cx_hexblade", kind: "weapon", slot: "main", name: "Hexblade of Ruin", tags: ["Hex", "Kill"], damage: 8, faces: PLAIN,
    text: "Every hit applies Weak, Exposed and 2 Doom. +2 Damage for every different negative status on the enemy.",
    hooks: { onHit: mainHit((b, c) => { applyStatus(b, c.attacker, c.defender, "weak", 1); applyStatus(b, c.attacker, c.defender, "exposed", 1); applyStatus(b, c.attacker, c.defender, "doom", 2); }), modifyAttack: (_b, c) => { if (!c.offhand) c.bonus += 2 * negKinds(c.defender); } } }),
  crimson({ id: "cx_starcaller", kind: "weapon", slot: "main", name: "Starcaller", tags: ["Arcane", "Burn", "Frost", "Storm"], damage: 9, twoHanded: true,
    faces: [cast("Comet", "graze", hex("burn", 3)), cast("Nova", "hit", hex("burn", 4)), cast("Rime Star", "hit", hex("chill", 3)), cast("Pulsar", "hit", hex("static", 4)), cast("Eclipse", "hit", hex("blind", 1)), cast("Supernova", "crit", hex("shock", 1))],
    text: "Two-handed. Every face is a spell. Spells deal double to enemies carrying 3 or more different negative statuses.",
    hooks: { modifyAttack: (_b, c) => { if (c.spec.magic && negKinds(c.defender) >= 3) c.mult *= 2; } } }),
  crimson({ id: "cx_last_reaper", kind: "weapon", slot: "main", name: "The Last Reaper", tags: ["Hex", "Kill"], damage: 11, twoHanded: true, faces: [MISS, HIT, HIT, HIT, CRIT, CRIT],
    text: "Two-handed. Crits on 5 and 6 and apply 5 Doom. Doom kills once it reaches half the enemy's HP.",
    hooks: { onCrit: (b, c) => applyStatus(b, c.attacker, c.defender, "doom", 5), onRoundEnd: (b, f) => { const e = other(b, f); if (e.hp > 0 && st(e, "doom") > 0 && st(e, "doom") * 2 >= e.hp) { e.hp = 0; log(b, "💀 The Last Reaper collects."); } } } }),
  // Off-hands
  crimson({ id: "cx_red_sun_aegis", kind: "off", slot: "off", shield: true, name: "Aegis of the Red Sun", tags: ["Guard", "Burn"], armor: 7,
    text: "+7 Armor. While Guarding, every hit you take gives you Barrier equal to it and Burns the attacker for half of it.",
    hooks: { whenHit: (b, c) => { const n = c.raw ?? 0; if (c.defender.flags["guarding"] && n > 0) { applyStatus(b, c.defender, c.defender, "barrier", n); applyStatus(b, c.defender, c.attacker, "burn", Math.ceil(n / 2)); } } } }),
  crimson({ id: "cx_soul_lantern", kind: "off", slot: "off", barrierElement: "doom", name: "Soul Lantern", tags: ["Hex", "Blood"],
    text: "Each round, apply 2 Doom; Doom you apply is doubled. Kills restore 20% of your HP.",
    hooks: { onRoundStart: (b, f) => applyStatus(b, f, other(b, f), "doom", 2), onStatusApplied: (_b, self, t, s, n) => { if (s === "doom" && t !== self) t.statuses.doom = st(t, "doom") + n; }, onKill: (b, c) => { heal(b, c.attacker, Math.ceil(c.attacker.maxHp * 0.2), "Soul Lantern"); } } }),
  crimson({ id: "cx_crimson_twin", kind: "weapon", slot: "main", weaponType: "dagger", name: "The Crimson Twin", tags: ["Crit", "Tempo"], damage: 6, offDamage: 7, faces: [GRAZE, HIT, HIT, CRIT, CRIT, CRIT],
    text: "Dagger. Crits on 4–6. Its off-hand hits make your next main attack deal +5. Best in the off-hand.",
    hooks: { onHit: (_b, c) => { if (c.offhand) c.attacker.flags["twinNext"] = 1; }, modifyAttack: (_b, c) => { if (!c.offhand && c.attacker.flags["twinNext"]) { c.attacker.flags["twinNext"] = 0; c.bonus += 5; } } } }),
  crimson({ id: "cx_grimoire_endings", kind: "off", slot: "off", barrierElement: "burn", name: "Grimoire of Endings", tags: ["Arcane", "Hex"],
    text: "Spell Amp +20%. Reactions you cause deal triple.", hooks: { stats: s => { s.spellAmp += 20; }, reactionMult: () => 3 } }),
  crimson({ id: "cx_chalice_blood", kind: "off", slot: "off", name: "Chalice of Blood", tags: ["Blood", "Strike"],
    text: "Your hits heal 15% of the damage they deal. Healing past your Max HP becomes Might.",
    hooks: { onHit: (b, c) => { const a = c.attacker; const n = Math.ceil(c.dealt * 0.15); const over = Math.max(0, a.hp + n - a.maxHp); heal(b, a, n, "Chalice"); if (over > 0) applyStatus(b, a, a, "might", over); } } }),
  // Armour
  crimson({ id: "cx_dreadplate", kind: "armour", slot: "armour", name: "Dreadplate", tags: ["Guard", "Hex"], armor: 9, maxHp: 15,
    text: "Heavy: +9 Armor and +15 Max HP. Each round, the enemy is Weakened and Exposed.", hooks: { onRoundStart: (b, f) => { const e = other(b, f); applyStatus(b, f, e, "weak", 1); applyStatus(b, f, e, "exposed", 1); } } }),
  crimson({ id: "cx_wraith_shroud", kind: "armour", slot: "armour", name: "Wraith Shroud", tags: ["Tempo", "Blood"], dodge: { crimson: 30 },
    text: "30% Dodge. Every Dodge deals 8 to the attacker and heals you 4.", hooks: { onDodge: (b, c) => { ping(b, c.attacker, 8, "Wraith Shroud"); heal(b, c.defender, 4, "Wraith Shroud"); } } }),
  crimson({ id: "cx_phoenix_robes", kind: "armour", slot: "armour", name: "Robes of the Phoenix", tags: ["Burn", "Blood"], armor: 2,
    text: "Below half HP: gain 4 Regen every round, and your hits apply 4 Burn.",
    hooks: { onRoundStart: (b, f) => { if (f.hp < f.maxHp / 2) applyStatus(b, f, f, "regen", 4); }, onHit: (b, c) => { if (c.attacker.hp < c.attacker.maxHp / 2) applyStatus(b, c.attacker, c.defender, "burn", 4); } } }),
  crimson({ id: "cx_eternal_bastion", kind: "armour", slot: "armour", name: "The Eternal Bastion", tags: ["Guard", "Strike"], armor: 8,
    text: "Heavy: +8 Armor. Guarding gives Barrier equal to four times your Armor, and 3 Might.", hooks: { onGuard: (b, f) => { applyStatus(b, f, f, "barrier", 4 * f.armor); applyStatus(b, f, f, "might", 3); } } }),
  crimson({ id: "cx_storm_skin", kind: "armour", slot: "armour", name: "Storm-Skin", tags: ["Storm", "Guard"], armor: 4,
    text: "+4 Armor. When hit, the attacker gains 4 Static. Static on enemies deals +4 per tick.", hooks: { whenHit: (b, c) => applyStatus(b, c.defender, c.attacker, "static", 4) } }), // tick bonus: statuses.ts
  // Trinkets
  crimson({ id: "cx_crimson_heart", kind: "trinket", slot: "trinket", name: "The Crimson Heart", tags: ["Blood"], maxHp: 25,
    text: "+25 Max HP. Heal 4 at the end of every round, and 1 with every hit you land.", hooks: { onRoundEnd: (b, f) => { heal(b, f, 4, "Crimson Heart"); }, onHit: (b, c) => { heal(b, c.attacker, 1, "Crimson Heart"); } } }),
  crimson({ id: "cx_executioner_eye", kind: "trinket", slot: "trinket", name: "The Executioner's Eye", tags: ["Crit", "Kill"],
    text: "+20% Crit chance, and your crits deal double their usual damage.", hooks: { stats: s => { s.critChance += 20; }, modifyAttack: (_b, c) => { if (c.kind === "crit") c.mult *= 2; } } }),
  crimson({ id: "cx_chaos_die", kind: "trinket", slot: "trinket", name: "The Chaos Die", tags: ["Luck", "Arcane"],
    text: "Every roll unleashes something: 1 Burn 4 · 2 Poison 4 · 3 Chill 3 · 4 Static 4 · 5 Might 2 · 6 Haste.",
    hooks: { face: [on("any", (b, c) => { const a = c.attacker, d = c.defender;
      switch (c.face) { case 1: applyStatus(b, a, d, "burn", 4); break; case 2: applyStatus(b, a, d, "poison", 4); break; case 3: applyStatus(b, a, d, "chill", 3); break;
        case 4: applyStatus(b, a, d, "static", 4); break; case 5: applyStatus(b, a, a, "might", 2); break; default: applyStatus(b, a, a, "haste", 1); } })] } }),
  crimson({ id: "cx_endless_war", kind: "trinket", slot: "trinket", name: "Ring of Endless War", tags: ["Strike", "Guard"],
    text: "Every round of a fight, gain 1 Might and 1 Barrier per floor.", hooks: { onRoundStart: (b, f) => { applyStatus(b, f, f, "might", 1); applyStatus(b, f, f, "barrier", f.persist["floor"] ?? 1); } } }),
  crimson({ id: "cx_crown_avarice", kind: "trinket", slot: "trinket", name: "Crown of Avarice", tags: ["Gold", "Strike"],
    text: "+1 Damage for every 20 Gold you hold. Every hit you land gives 2 Gold.", hooks: { modifyAttack: (_b, c) => { c.bonus += Math.floor(c.attacker.gold / 20); }, onHit: (_b, c) => { c.attacker.gold += 2; } } })
];
