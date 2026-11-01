// Reinforced (full blocks pay off), Blessed (patience pays off), Holy Forgiveness and Guardian gear.
import { isNegative } from "../engine/statuses";
import { NEGATIVE_STATUSES } from "../engine/types";
import type { Fighter, GearBase, StatusId } from "../engine/types";
import { applyStatus, heal, log, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const O = { kind: "off" as const, slot: "off" as const };
const A = { kind: "armour" as const, slot: "armour" as const };
const T = { kind: "trinket" as const, slot: "trinket" as const };

/** Reinforcing: full blocks grant Reinforced. */
const reinforce = (n: number) => ({ whenHit: (b: Parameters<NonNullable<GearBase["hooks"]["whenHit"]>>[0], c: Parameters<NonNullable<GearBase["hooks"]["whenHit"]>>[1]) => { if (c.defender.flags["fullBlockNow"]) applyStatus(b, c.defender, c.defender, "reinforced", n); } });
/** Blessing: each round without dealing damage adds n Blessed. */
const bless = (n: number) => (_b: unknown, f: Fighter) => { f.flags["blessGain"] = (f.flags["blessGain"] ?? 0) + n; };
/** Holy Forgiveness: heal per stack of a negative status that lands on you from someone else. */
const forgive = (per: number, name: string) => (b: Parameters<typeof heal>[0], self: Fighter, source: Fighter | null, s: StatusId, n: number) => {
  if (isNegative(s) && source !== self && self.hp > 0) heal(b, self, per * n, name);
};
/** Guardian: when a negative status lands on you, gain Barrier: k per different negative status you have. */
const guardian = (k: number, name: string) => (b: Parameters<typeof heal>[0], self: Fighter, _src: Fighter | null, s: StatusId) => {
  if (!isNegative(s) || self.hp <= 0) return;
  const kinds = (NEGATIVE_STATUSES as readonly StatusId[]).filter(x => st(self, x) > 0).length;
  if (kinds > 0) { applyStatus(b, self, self, "barrier", k * kinds); log(b, `🛡️ ${name}: Guardian.`); }
};

export const BLESSING_GEAR: GearBase[] = [
  // ---------- Reinforcing shields ----------
  only("uncommon", { ...O, shield: true, id: "rf_rampart", name: "Rampart Shield", tags: ["Guard", "Strike"], armor: 3, text: "Shield. +3 Armor. Reinforcing: a full block gives 1 Reinforced (+2 to your next attack).", hooks: reinforce(1) }),
  only("rare", { ...O, shield: true, id: "rf_bastion_kite", name: "Bastion Kite", tags: ["Guard", "Strike"], armor: 4, text: "Shield. +4 Armor. Reinforcing: a full block gives 2 Reinforced.", hooks: reinforce(2) }),
  only("epic", { ...O, shield: true, id: "rf_unyielding", name: "The Unyielding Wall", tags: ["Guard", "Strike"], armor: 6, text: "Shield. +6 Armor, +3 more while Guarding. Reinforcing: a full block gives 3 Reinforced.",
    hooks: { ...reinforce(3), onGuard: (_b, f) => { f.flags["guardArmor"] = (f.flags["guardArmor"] ?? 0) + 3; } } }),
  // ---------- Reinforcing barrier off-hands (Mage) ----------
  only("rare", { ...O, id: "rf_wardstone", barrierElement: "chill", name: "Ward-Stone Focus", tags: ["Arcane", "Frost", "Guard"], text: "Elemental Barrier (Chill). Reinforcing: a barrier that stops a whole hit gives 2 Reinforced.", hooks: reinforce(2) }),
  only("epic", { ...O, id: "rf_aegis_codex", barrierElement: "static", name: "Aegis Codex", tags: ["Arcane", "Storm", "Guard"], text: "Elemental Barrier (Static). Spell Amp +10%. Reinforcing: a barrier that stops a whole hit gives 3 Reinforced.",
    hooks: { ...reinforce(3), stats: s => { s.spellAmp += 10; } } }),

  // ---------- Blessing armours and trinkets ----------
  only("uncommon", { ...A, id: "bl_novice_habit", name: "Novice's Habit", tags: ["Holy", "Guard"], armor: 1, text: "Light: +1 Armor. Blessing: each round you deal no damage, gain 1 Blessed.", hooks: { onFightStart: bless(1) } }),
  only("rare", { ...A, id: "bl_hermit_mantle", name: "Hermit's Mantle", tags: ["Holy", "Guard"], armor: 3, text: "Medium: +3 Armor. Blessing: each round you deal no damage, gain 1 Blessed. Start every fight with 1 Blessed.",
    hooks: { onFightStart: (b, f) => { bless(1)(b, f); applyStatus(b, f, f, "blessed", 1); } } }),
  only("epic", { ...A, id: "bl_patience_vest", name: "Vestments of Patience", tags: ["Holy", "Guard"], armor: 5, text: "Heavy: +5 Armor. Blessing: each round you deal no damage, gain 2 Blessed.", hooks: { onFightStart: bless(2) } }),
  only("uncommon", { ...T, id: "bl_prayer_rope", name: "Prayer Rope", tags: ["Holy"], text: "Blessing: each round you deal no damage, gain 1 Blessed.", hooks: { onFightStart: bless(1) } }),
  only("rare", { ...T, id: "bl_saint_hourglass", name: "Saint's Hourglass", tags: ["Holy", "Blood"], maxHp: 5, text: "+5 Max HP. Blessing: each round you deal no damage, gain 1 Blessed.", hooks: { onFightStart: bless(1) } }),
  only("epic", { ...T, id: "bl_patient_eye", name: "Eye of the Patient Saint", tags: ["Holy"], text: "Blessing: each round you deal no damage, gain 2 Blessed.", hooks: { onFightStart: bless(2) } }),

  // ---------- Holy Forgiveness (Rare and up) ----------
  only("rare", { ...A, id: "hf_penitent_robe", name: "Penitent's Robe", tags: ["Holy", "Blood"], armor: 1, text: "Light: +1 Armor. Holy Forgiveness: when an enemy puts a negative status on you, heal 1 per stack.", hooks: { onStatusReceived: forgive(1, "Holy Forgiveness") } }),
  only("epic", { ...A, id: "hf_absolution_plate", name: "Plate of Absolution", tags: ["Holy", "Blood", "Guard"], armor: 6, maxHp: 10, text: "Heavy: +6 Armor, +10 Max HP. Holy Forgiveness: when an enemy puts a negative status on you, heal 1 per stack.", hooks: { onStatusReceived: forgive(1, "Holy Forgiveness") } }),
  only("rare", { ...T, id: "hf_mercy_rosary", name: "Rosary of Mercy", tags: ["Holy", "Blood"], text: "Holy Forgiveness: when an enemy puts a negative status on you, heal 1 per stack.", hooks: { onStatusReceived: forgive(1, "Holy Forgiveness") } }),
  only("epic", { ...T, id: "hf_forgiving_tear", name: "Tear of the Forgiving", tags: ["Holy", "Blood"], text: "Holy Forgiveness: when an enemy puts a negative status on you, heal 1 per stack. Start every fight with 2 Regen.",
    hooks: { onStatusReceived: forgive(1, "Holy Forgiveness"), onFightStart: (b, f) => applyStatus(b, f, f, "regen", 2) } }),

  // ---------- Guardian (Holy) ----------
  only("uncommon", { ...A, id: "gd_warden_hauberk", name: "Warden's Hauberk", tags: ["Holy", "Guard"], armor: 2, text: "Medium: +2 Armor. Guardian: when a negative status lands on you, gain 1 Barrier for each different negative status you have.", hooks: { onStatusReceived: guardian(1, "Warden's Hauberk") } }),
  only("rare", { ...A, id: "gd_templar_plate", name: "Templar Plate", tags: ["Holy", "Guard"], armor: 4, text: "Heavy: +4 Armor. Guardian: when a negative status lands on you, gain 2 Barrier for each different negative status you have.", hooks: { onStatusReceived: guardian(2, "Templar Plate") } }),
  only("uncommon", { ...T, id: "gd_guardian_medal", name: "Guardian's Medal", tags: ["Holy", "Guard"], text: "Guardian: when a negative status lands on you, gain 1 Barrier for each different negative status you have.", hooks: { onStatusReceived: guardian(1, "Guardian's Medal") } }),
  only("epic", { ...T, id: "gd_angel_seal", name: "Seal of the Guardian Angel", tags: ["Holy", "Guard"], text: "Guardian: when a negative status lands on you, gain 3 Barrier for each different negative status you have.", hooks: { onStatusReceived: guardian(3, "Seal of the Guardian Angel") } }),
  only("rare", { ...O, id: "gd_guardian_icon", name: "Guardian Icon", tags: ["Holy", "Guard"], text: "Holy. Start every fight with Ward. Guardian: when a negative status lands on you, gain 2 Barrier for each different negative status you have.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "ward", 1), onStatusReceived: guardian(2, "Guardian Icon") } }),
  only("epic", { ...O, shield: true, id: "gd_guardian_aegis", name: "Aegis of the Guardian", tags: ["Holy", "Guard"], armor: 4, text: "Holy shield. +4 Armor. Guardian: when a negative status lands on you, gain 3 Barrier for each different negative status you have.", hooks: { onStatusReceived: guardian(3, "Aegis of the Guardian") } })
];

/** A Legendary for Holy Forgiveness. */
export const BLESSING_LEGENDARIES: GearBase[] = [
  { ...T, id: "lx_forgiving_saint", rarity: "legendary", name: "Heart of the Forgiving Saint", tags: ["Holy", "Blood"],
    legendary: { minFloor: 3, asBase: "t_band_vigor", reveal: "Holy Forgiveness, twice over: when an enemy puts a negative status on you, heal 2 per stack." },
    text: "It forgives everything. It forgets nothing.", hooks: { onStatusReceived: forgive(2, "Holy Forgiveness") } }
];
