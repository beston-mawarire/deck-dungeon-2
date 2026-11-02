// The parts of generated gear: minor stat modules, major (trigger → payload) modules, flaws (drawbacks) and materials.
// Each module is an ordinary hook definition whose strength is its "stacks" (worked out from tier, grade and item level),
// so generated items run on exactly the same combat code as everything else.
import type { AttackCtx, Battle, Fighter, FaceGroup, HookDef, Hooks, Slot, StatusId, Tag } from "../engine/types";
import { applyStatus, heal, loseHp, other } from "../engine/statuses";
import { log } from "../engine/registry";
import { on, ping } from "./helpers";

/** A generated-gear module: a hook definition plus how to roll and price it. */
export interface GenModule extends HookDef {
  /** minor: a stat line · major: a trigger → payload effect · flaw: a drawback that buys budget back. */
  gen: "minor" | "major" | "flaw";
  /** Budget cost per tier (tier 1..7). */
  cost: number;
  /** Strength at tier 3, item level 1 (grows with tier, item level and Greater grades). */
  unit: number;
  /** % effects don't grow with item level (caps keep them in check). */
  flat?: boolean;
  /** Only on these slots (default: any). */
  slots?: Slot[];
  /** Only one module per group on an item. */
  group: string;
  /** How often it's picked compared with others (default 1). */
  weight?: number;
}

const gm = (d: Omit<GenModule, "kind" | "tags"> & { tags?: Tag[] }): GenModule => ({ kind: "bonus", tags: [], ...d });

// ===================== MINOR: stat lines =====================
export const GEN_MINORS: GenModule[] = [
  gm({ id: "gm_damage", gen: "minor", group: "damage", name: "Keen", affix: "of Might", tags: ["Strike"], cost: 1.2, unit: 1, text: "+{n} Damage", hooks: { stats: (s, n) => { s.damage += n; } } }),
  gm({ id: "gm_offdamage", gen: "minor", group: "offdamage", name: "Balanced", affix: "of Both Hands", tags: ["Tempo"], cost: 0.8, unit: 1, slots: ["off", "main"], text: "+{n} off-hand Damage", hooks: { stats: (s, n) => { s.offDamage += n; } } }),
  gm({ id: "gm_armor", gen: "minor", group: "armor", name: "Plated", affix: "of the Bulwark", tags: ["Guard"], cost: 1, unit: 1, text: "+{n} Armor", hooks: { stats: (s, n) => { s.armor += n; } } }),
  gm({ id: "gm_hp", gen: "minor", group: "hp", name: "Hale", affix: "of Vigor", tags: ["Blood"], cost: 1, unit: 4, text: "+{n} Max HP", hooks: { stats: (s, n) => { s.maxHp += n; } } }),
  gm({ id: "gm_crit", gen: "minor", group: "crit", name: "Precise", affix: "of Precision", tags: ["Crit"], cost: 1.1, unit: 3, flat: true, text: "+{n}% Crit chance", hooks: { stats: (s, n) => { s.critChance += n; } } }),
  gm({ id: "gm_critdmg", gen: "minor", group: "critdmg", name: "Brutal", affix: "of Brutality", tags: ["Crit"], cost: 0.9, unit: 15, flat: true, text: "Crits deal +{n}% damage", hooks: { stats: (s, n) => { s.critDmg = (s.critDmg ?? 0) + n; } } }),
  gm({ id: "gm_dodge", gen: "minor", group: "dodge", name: "Nimble", affix: "of the Fox", tags: ["Tempo"], cost: 1.1, unit: 3, flat: true, text: "+{n}% Dodge", hooks: { stats: (s, n) => { s.dodge += n; } } }),
  gm({ id: "gm_bash", gen: "minor", group: "bash", name: "Crushing", affix: "of Crushing", tags: ["Strike"], cost: 1.1, unit: 3, flat: true, slots: ["main"], text: "+{n}% Bash", hooks: { stats: (s, n) => { s.bash += n; } } }),
  gm({ id: "gm_spell", gen: "minor", group: "spell", name: "Arcane", affix: "of Sorcery", tags: ["Arcane"], cost: 1, unit: 10, flat: true, text: "Spell Amp +{n}%", hooks: { stats: (s, n) => { s.spellAmp += n; } } }),
  gm({ id: "gm_dot", gen: "minor", group: "dot", name: "Festering", affix: "of Festering", tags: ["Poison", "Burn", "Bleed"], cost: 1, unit: 12, flat: true, text: "Status damage +{n}%", hooks: { stats: (s, n) => { s.dotAmp = (s.dotAmp ?? 0) + n; } } }),
  gm({ id: "gm_dealt", gen: "minor", group: "dealt", name: "Savage", affix: "of Savagery", tags: ["Strike"], cost: 1.4, unit: 6, flat: true, text: "You deal +{n}% damage", hooks: { stats: (s, n) => { s.dmgDealt = (s.dmgDealt ?? 0) + n; } } }),
  gm({ id: "gm_taken", gen: "minor", group: "taken", name: "Stalwart", affix: "of Endurance", tags: ["Guard"], cost: 1.4, unit: 5, flat: true, text: "You take {n}% less damage", hooks: { stats: (s, n) => { s.dmgTaken = (s.dmgTaken ?? 0) - Math.min(40, n); } } }),
  gm({ id: "gm_healing", gen: "minor", group: "healing", name: "Mending", affix: "of Mending", tags: ["Blood"], cost: 0.8, unit: 12, flat: true, text: "Healing +{n}%", hooks: { healMult: n => 1 + n / 100 } }),
  gm({ id: "gm_reaction", gen: "minor", group: "reaction", name: "Volatile", affix: "of Volatility", tags: ["Arcane", "Hex"], cost: 0.9, unit: 15, flat: true, text: "Reactions deal +{n}%", hooks: { reactionMult: (_b, _f, n) => 1 + n / 100 } }),
  gm({ id: "gm_gold", gen: "minor", group: "gold", name: "Lucky", affix: "of Plenty", tags: ["Gold"], cost: 0.5, unit: 2, text: "+{n} Gold per fight won", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.gold += n; } } }),
  gm({ id: "gm_thorns", gen: "minor", group: "thorns", name: "Barbed", affix: "of Barbs", tags: ["Thorns"], cost: 0.9, unit: 1, text: "When hit, deal {n} back", hooks: { whenHit: (b, c, n) => ping(b, c.attacker, n, "Barbs") } })
];

// ===================== MAJOR: trigger → payload =====================
type Payload = { id: string; name: string; affix: string; tags: Tag[]; unit: number; cost: number; foe: boolean; text: (n: string) => string; run: (b: Battle, self: Fighter, foe: Fighter, n: number, why: string) => void; flatAmount?: number };
const st = (s: StatusId, name: string, affix: string, tags: Tag[], unit: number, cost: number, foe = true, flatAmount?: number): Payload => ({
  id: s, name, affix, tags, unit, cost, foe, flatAmount,
  text: n => (foe ? `apply ${flatAmount ?? n} ${name}` : `gain ${flatAmount ?? n} ${name}`),
  run: (b, self, enemy, n) => applyStatus(b, self, foe ? enemy : self, s, flatAmount ?? n)
});
const PAYLOADS: Payload[] = [
  st("bleed", "Bleed", "of Rending", ["Bleed"], 1, 1),
  st("burn", "Burn", "of Embers", ["Burn"], 1, 1),
  st("poison", "Poison", "of Venom", ["Poison"], 1, 1),
  st("chill", "Chill", "of Frost", ["Frost"], 1, 1),
  st("static", "Static", "of Static", ["Storm"], 2, 1),
  st("shock", "Shock", "of Sparks", ["Storm"], 1, 1.3, true, 1),
  st("weak", "Weak", "of Withering", ["Hex"], 1, 1.1),
  st("exposed", "Exposed", "of Exposure", ["Hex"], 1, 1.1),
  st("fracture", "Fracture", "of Breaking", ["Strike", "Hex"], 1, 1.2),
  st("soaked", "Soaked", "of the Tide", ["Frost", "Storm"], 1, 0.9),
  st("smoulder", "Smoulder", "of Smouldering", ["Burn"], 1, 1),
  st("doom", "Doom", "of Doom", ["Hex"], 1, 1.6),
  st("might", "Might", "of Fury", ["Strike"], 1, 1.2, false),
  st("haste", "Haste", "of Haste", ["Tempo"], 1, 1.4, false),
  st("barrier", "Barrier", "of Warding", ["Guard"], 2, 0.9, false),
  st("regen", "Regen", "of Renewal", ["Blood"], 1, 0.9, false),
  st("evade", "Evade", "of Mist", ["Tempo"], 1, 1.3, false, 1),
  st("spikes", "Spikes", "of Thorns", ["Thorns"], 1, 0.9, false),
  st("ward", "Ward", "of the Ward", ["Holy", "Guard"], 1, 1.2, false, 1),
  st("focus", "Focus", "of Insight", ["Luck"], 1, 1, false, 1),
  { id: "heal", name: "heal", affix: "of the Leech", tags: ["Blood"], unit: 1, cost: 1, foe: false, text: n => `heal ${n}`, run: (b, self, _e, n, why) => { heal(b, self, n, why); } },
  { id: "ping", name: "damage", affix: "of Retribution", tags: ["Thorns", "Strike"], unit: 1.5, cost: 1, foe: true, text: n => `deal ${n} damage (ignores Armor)`, run: (b, _self, enemy, n, why) => ping(b, enemy, n, why) }
];

type Trigger = { id: string; text: string; amp: number; kinds: "both" | "foe" | "self"; hooks: (p: Payload, id: string, name: string) => Hooks };
const fire = (p: Payload, b: Battle, self: Fighter, foe: Fighter, n: number, name: string) => { if (self.hp > 0) p.run(b, self, foe, n, name); };
const face = (k: FaceGroup, label: string, amp: number): Trigger => ({
  id: `f${k}`, text: label, amp, kinds: "both",
  hooks: (p, _id, name) => ({ face: [on(k, (b: Battle, c: AttackCtx, n: number) => fire(p, b, c.attacker, c.defender, n, name))] })
});
const TRIGGERS: Trigger[] = [
  { id: "hit", text: "Your hits", amp: 1, kinds: "foe", hooks: (p, _id, name) => ({ onHit: (b, c, n) => { if (!c.offhand) fire(p, b, c.attacker, c.defender, n, name); } }) },
  { id: "crit", text: "Your crits", amp: 1.3, kinds: "both", hooks: (p, _id, name) => ({ onCrit: (b, c, n) => fire(p, b, c.attacker, c.defender, n, name) }) },
  face(1, "On a 1", 1.3), face(2, "On a 2", 1.3), face(3, "On a 3", 1.3), face(4, "On a 4", 1.3), face(5, "On a 5", 1.3), face(6, "On a 6", 1.3),
  face("low", "On a 1–2", 1), face("high", "On a 5–6", 1), face("odd", "On an odd roll", 0.7), face("even", "On an even roll", 0.7),
  { id: "kill", text: "Kills", amp: 1.5, kinds: "self", hooks: (p, _id, name) => ({ onKill: (b, c, n) => fire(p, b, c.attacker, c.defender, n, name) }) },
  { id: "hurt", text: "When you're hit", amp: 0.8, kinds: "both", hooks: (p, _id, name) => ({ whenHit: (b, c, n) => { if ((c.dealt ?? 0) > 0) fire(p, b, c.defender, c.attacker, n, name); } }) },
  { id: "guard", text: "When you Guard", amp: 1.5, kinds: "both", hooks: (p, _id, name) => ({ onGuard: (b, f, n) => fire(p, b, f, other(b, f), n, name) }) },
  { id: "dodge", text: "When you Dodge", amp: 1.5, kinds: "both", hooks: (p, _id, name) => ({ onDodge: (b, c, n) => fire(p, b, c.defender, c.attacker, n, name) }) },
  { id: "start", text: "Start each fight", amp: 1.5, kinds: "both", hooks: (p, _id, name) => ({ onFightStart: (b, f, n) => fire(p, b, f, other(b, f), n, name) }) },
  { id: "r3", text: "Every 3rd round", amp: 1.2, kinds: "both", hooks: (p, _id, name) => ({ onRoundStart: (b, f, n) => { if (b.round % 3 === 0) fire(p, b, f, other(b, f), n, name); } }) },
  { id: "round", text: "Every round", amp: 0.4, kinds: "both", hooks: (p, _id, name) => ({ onRoundEnd: (b, f, n) => fire(p, b, f, other(b, f), n, name) }) },
  { id: "low", text: "Once a fight, below half HP", amp: 2, kinds: "self", hooks: (p, id, name) => ({ onRoundEnd: (b, f, n) => { if (!f.flags[id] && f.hp > 0 && f.hp < f.maxHp / 2) { f.flags[id] = 1; fire(p, b, f, other(b, f), n, name); } } }) },
  { id: "first", text: "Your first hit each fight", amp: 2, kinds: "foe", hooks: (p, id, name) => ({ onHit: (b, c, n) => { if (!c.offhand && !c.attacker.flags[id]) { c.attacker.flags[id] = 1; fire(p, b, c.attacker, c.defender, n, name); } } }) }
];

/** The pairs that make sense ("Kills: apply Burn" doesn't: the foe is dead). */
const allowed = (t: Trigger, p: Payload) => {
  // Your hits may also heal you or ward you (small amounts, every hit).
  if (t.id === "hit" && (p.id === "heal" || p.id === "barrier")) return true;
  if (t.kinds === "foe" && !p.foe) return false;
  if (t.kinds === "self" && p.foe) return false;
  if (p.id === "doom" && !["crit", "f6", "high", "r3", "guard", "first"].includes(t.id)) return false;
  // Statuses that burst at a threshold would end fights before they start.
  if (["fracture", "doom", "static"].includes(p.id) && t.id === "start") return false;
  if (p.id === "ping" && ["round", "start"].includes(t.id)) return false;
  if (["ward", "focus", "evade"].includes(p.id) && ["round", "hurt"].includes(t.id)) return false;
  return true;
};

export const GEN_MAJORS: GenModule[] = TRIGGERS.flatMap(t => PAYLOADS.filter(p => allowed(t, p)).map(p => {
  const id = `gj_${t.id}_${p.id}`;
  const name = `${t.text}: ${p.name}`;
  return gm({
    id, gen: "major", group: `${t.id.startsWith("f") ? "face" : t.id}_${p.id}`, name, affix: p.affix, tags: p.tags,
    cost: p.cost, unit: p.unit * t.amp, flat: p.flatAmount !== undefined,
    weight: t.id.startsWith("f") && t.id.length === 2 ? 0.35 : 1,
    text: `${t.text}: ${p.text("{n}")}${p.id === "ping" || p.id === "heal" ? "" : ""}`,
    hooks: t.hooks(p, id, name)
  });
}));

// ===================== FLAWS: drawbacks that buy budget back =====================
export const GEN_FLAWS: GenModule[] = [
  gm({ id: "gf_frail", gen: "flaw", group: "f_hp", name: "Frail", affix: "", cost: 1.2, unit: 4, text: "−{n} Max HP", hooks: { stats: (s, n) => { s.maxHp -= n; } } }),
  gm({ id: "gf_brittle", gen: "flaw", group: "f_armor", name: "Brittle", affix: "", cost: 1.1, unit: 1, text: "−{n} Armor", hooks: { stats: (s, n) => { s.armor -= n; } } }),
  gm({ id: "gf_dull", gen: "flaw", group: "f_dmg", name: "Dull", affix: "", cost: 1.2, unit: 1, text: "−{n} Damage", hooks: { stats: (s, n) => { s.damage = Math.max(1, s.damage - n); } } }),
  gm({ id: "gf_fragile", gen: "flaw", group: "f_taken", name: "Fragile", affix: "", cost: 1.4, unit: 5, flat: true, text: "You take {n}% more damage", hooks: { stats: (s, n) => { s.dmgTaken = (s.dmgTaken ?? 0) + n; } } }),
  gm({ id: "gf_clumsy", gen: "flaw", group: "f_crit", name: "Clumsy", affix: "", cost: 1, unit: 3, flat: true, text: "−{n}% Crit chance", hooks: { stats: (s, n) => { s.critChance -= n; } } }),
  gm({ id: "gf_exposed", gen: "flaw", group: "f_start", name: "Exposed", affix: "", cost: 1.1, unit: 1, text: "Start each fight with {n} Exposed", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "exposed", n) } }),
  gm({ id: "gf_weakened", gen: "flaw", group: "f_start", name: "Sapping", affix: "", cost: 1.1, unit: 1, text: "Start each fight with {n} Weak", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, f, "weak", n) } }),
  gm({ id: "gf_bleeding", gen: "flaw", group: "f_drain", name: "Thirsty", affix: "", cost: 1.3, unit: 1, text: "Lose {n} HP every round", hooks: { onRoundEnd: (b, f, n) => { if (f.hp > 1) { loseHp(b, f, Math.min(n, f.hp - 1)); log(b, `${f.name} bleeds for the item's thirst.`); } } } }),
  gm({ id: "gf_rousing", gen: "flaw", group: "f_foe", name: "Rousing", affix: "", cost: 1.2, unit: 1, text: "Enemies start each fight with {n} Might", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, other(b, f), "might", n) } }),
  gm({ id: "gf_warding", gen: "flaw", group: "f_foe", name: "Shielding", affix: "", cost: 1, unit: 3, text: "Enemies start each fight with {n} Barrier", hooks: { onFightStart: (b, f, n) => applyStatus(b, f, other(b, f), "barrier", n) } }),
  gm({ id: "gf_backlash", gen: "flaw", group: "f_face", name: "Backlashing", affix: "", cost: 1, unit: 2, text: "On a 1: you take {n} damage", hooks: { face: [on(1, (b, c, n) => ping(b, c.attacker, n, "Backlash"))] } }),
  gm({ id: "gf_greedy", gen: "flaw", group: "f_gold", name: "Greedy", affix: "", cost: 0.6, unit: 3, text: "Lose {n} Gold per fight won", hooks: { onFightEnd: (b, f, n) => { if (b.over === "won" && f.id === "player") f.gold = Math.max(0, f.gold - n); } } }),
  gm({ id: "gf_slow", gen: "flaw", group: "f_tempo", name: "Sluggish", affix: "", cost: 1.2, unit: 1, flat: true, text: "Enemies start each fight with Haste", hooks: { onFightStart: (b, f) => applyStatus(b, f, other(b, f), "haste", 1) } }),
  gm({ id: "gf_unhealing", gen: "flaw", group: "f_heal", name: "Withered", affix: "", cost: 1, unit: 10, flat: true, text: "Healing −{n}%", hooks: { healMult: n => Math.max(0.2, 1 - n / 100) } })
];

// ===================== MATERIALS =====================
/** A material (like a manufacturer): its name leads the item's, it leans toward some tags, and it carries one small innate effect. */
export interface GenMaterial { id: string; name: string; tags: Tag[]; innate: string; minDepth: number; weight?: number; slots?: Slot[] }
const mat = (id: string, name: string, tags: Tag[], innate: string, minDepth = 1, weight = 1, slots?: Slot[]): GenMaterial => ({ id, name, tags, innate, minDepth, weight, slots });
export const GEN_MATERIALS: GenMaterial[] = [
  // Everyday (from the first floor)
  mat("iron", "Iron", ["Strike", "Guard"], "gm_armor", 1, 1.4),
  mat("bronze", "Bronze", ["Guard"], "gm_hp", 1, 1.3),
  mat("copper", "Copper", ["Storm"], "gj_f4_static", 1, 1.1),
  mat("steel", "Steel", ["Strike"], "gm_damage", 1, 1.3),
  mat("bone", "Bone", ["Kill", "Bleed"], "gj_kill_heal", 1, 1.1),
  mat("ashwood", "Ashwood", ["Burn", "Tempo"], "gj_f5_burn", 1, 1.1),
  mat("oak", "Oaken", ["Guard", "Blood"], "gm_hp", 1, 1.1),
  mat("yew", "Yew", ["Crit", "Tempo"], "gm_crit", 1, 1),
  mat("leather", "Leather", ["Tempo"], "gm_dodge", 1, 1.2, ["armour", "off", "trinket"]),
  mat("hide", "Hide", ["Blood", "Guard"], "gj_start_regen", 1, 1.1),
  mat("silk", "Silken", ["Arcane", "Tempo"], "gm_spell", 1, 1, ["armour", "trinket", "off"]),
  mat("tin", "Tin", ["Gold"], "gm_gold", 1, 0.9),
  mat("thorn", "Thornwood", ["Thorns"], "gm_thorns", 1, 1),
  mat("rusted", "Rusted", ["Bleed"], "gj_hit_bleed", 1, 0.8),
  // Elemental (a little deeper)
  mat("frost", "Frost-forged", ["Frost"], "gj_f2_chill", 2),
  mat("rime", "Rimeglass", ["Frost", "Arcane"], "gj_crit_chill", 3),
  mat("storm", "Stormglass", ["Storm"], "gj_crit_static", 2),
  mat("thunder", "Thunder-forged", ["Storm", "Strike"], "gj_f6_shock", 3),
  mat("ember", "Emberforged", ["Burn"], "gj_hit_burn", 2),
  mat("cinder", "Cinder", ["Burn"], "gj_r3_smoulder", 3),
  mat("venom", "Venomwood", ["Poison"], "gj_f3_poison", 2),
  mat("plague", "Plagued", ["Poison", "Hex"], "gj_start_poison", 3),
  mat("tide", "Drowned", ["Frost", "Storm"], "gj_f2_soaked", 3),
  mat("coral", "Coral", ["Frost", "Blood"], "gj_round_regen", 3),
  mat("glacial", "Glacial", ["Frost", "Guard"], "gj_hurt_chill", 4),
  mat("volcanic", "Volcanic", ["Burn", "Guard"], "gj_hurt_burn", 4),
  // Holy and unholy
  mat("sunsteel", "Sunsteel", ["Holy", "Burn"], "gj_crit_burn", 3),
  mat("moonsilver", "Moonsilver", ["Holy", "Tempo"], "gj_start_ward", 3),
  mat("saintsilver", "Saint's Silver", ["Holy", "Blood"], "gm_healing", 4),
  mat("blessed", "Blessed", ["Holy", "Guard"], "gj_guard_ward", 4),
  mat("bloodsteel", "Bloodsteel", ["Blood", "Bleed"], "gj_crit_heal", 3),
  mat("graveiron", "Grave-iron", ["Hex", "Kill"], "gj_first_weak", 4),
  mat("ghoulbone", "Ghoulbone", ["Kill", "Blood"], "gj_kill_regen", 4),
  mat("hexed", "Hexed", ["Hex"], "gj_f1_exposed", 3),
  mat("witchwood", "Witchwood", ["Hex", "Arcane"], "gm_reaction", 4),
  mat("runed", "Runed", ["Arcane"], "gm_spell", 3),
  // Precious
  mat("gilded", "Gilded", ["Gold", "Luck"], "gm_gold", 2, 0.8),
  mat("jade", "Jade", ["Luck", "Blood"], "gj_low_heal", 3),
  mat("amber", "Amber", ["Luck", "Guard"], "gj_start_barrier", 3),
  mat("crystal", "Crystal", ["Arcane", "Crit"], "gm_critdmg", 4),
  mat("obsidian", "Obsidian", ["Crit", "Strike"], "gm_critdmg", 5),
  // Deep (rarer, stronger innates)
  mat("shadowsteel", "Shadowsteel", ["Crit", "Tempo"], "gj_dodge_might", 6),
  mat("duskforged", "Duskforged", ["Hex", "Crit"], "gj_crit_exposed", 6),
  mat("dawnforged", "Dawnforged", ["Holy", "Strike"], "gj_first_ping", 6),
  mat("meteoric", "Meteoric", ["Strike", "Burn"], "gj_f6_ping", 8),
  mat("starmetal", "Starmetal", ["Arcane", "Strike"], "gm_dealt", 10, 0.7),
  mat("wyrmbone", "Wyrmbone", ["Blood", "Kill"], "gj_kill_might", 10, 0.7),
  mat("dragonscale", "Dragonscale", ["Guard", "Burn"], "gm_taken", 12, 0.6),
  mat("voidtouched", "Voidtouched", ["Hex", "Arcane"], "gj_r3_doom", 14, 0.5),
  mat("abyssal", "Abyssal", ["Hex", "Kill"], "gj_crit_fracture", 16, 0.5),
  mat("titanic", "Titan-forged", ["Strike", "Guard"], "gm_hp", 14, 0.5)
];

/** Crimson-veined items wear this, whatever their make. */
export const VEINED: GenMaterial = mat("veined", "Crimson-veined", ["Blood", "Kill"], "gj_hit_heal", 1);

export const GEN_MODULES: GenModule[] = [...GEN_MINORS, ...GEN_MAJORS, ...GEN_FLAWS];
