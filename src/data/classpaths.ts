// Class paths (1.97): two ways to play each class, chosen at the Camp before a run. A path is passive — something
// gained and something given up — and it decides which skills you can choose from when you reach level 5.
//   Warrior: the Bulwark and the Berserker.   Rogue: the Duelist and the Assassin.
//   Mage: the Elementalist and the Arcanist.  Cleric: the Penitent and the Zealot.
import type { HookDef, OriginId } from "../engine/types";
import { applyStatus } from "./helpers";
import { isUnholy } from "../engine/combat";

export interface PathDef {
  id: string; origin: OriginId; name: string; icon: string;
  /** One line on how it plays. */
  pitch: string;
  gain: string[];
  lose: string[];
  /** The skills it offers at level 5 (choose one). */
  skills: string[];
  hooks: HookDef["hooks"];
}

export const PATHS: PathDef[] = [
  { id: "bulwark", origin: "warrior", name: "Bulwark", icon: "🛡️", pitch: "Plant your shield and let them break on it.",
    gain: ["Guarding gives 2 Reinforced and 2 more Armor", "Your Hits and Crits deal +1 Damage for every 4 Armor (not 5)"],
    lose: ["You deal 15% less damage"],
    skills: ["bastion", "shieldslam"],
    hooks: { onGuard: (b, f) => { applyStatus(b, f, f, "reinforced", 2); f.flags["guardArmor"] = (f.flags["guardArmor"] ?? 0) + 2; },
      modifyAttack: (_b, c) => { if (c.kind === "hit" || c.kind === "crit") c.bonus += Math.floor(c.attacker.armor / 4) - Math.floor(c.attacker.armor / 5); },
      stats: s => { s.dmgDealt = (s.dmgDealt ?? 0) - 15; } } },
  { id: "berserker", origin: "warrior", name: "Berserker", icon: "🪓", pitch: "Two blades or one huge one, and never a step back.",
    gain: ["You deal 20% more damage", "Every hit you land gives 1 Might (up to 6 a fight)"],
    lose: ["Your Armor is halved", "Guarding gives you no extra Armor"],
    skills: ["rampage", "bloodlust"],
    hooks: { stats: s => { s.dmgDealt = (s.dmgDealt ?? 0) + 20; s.armor = Math.floor(s.armor / 2); },
      onGuard: (_b, f) => { f.flags["guardArmor"] = Math.max(0, (f.flags["guardArmor"] ?? 0) - 2); },
      onHit: (b, c) => { const f = c.attacker; if ((f.flags["zerk"] ?? 0) < 6) { f.flags["zerk"] = (f.flags["zerk"] ?? 0) + 1; applyStatus(b, f, f, "might", 1); } } } },
  { id: "duelist", origin: "rogue", name: "Duelist", icon: "🤺", pitch: "Untouchable, and every miss they make is your opening.",
    gain: ["+10% Dodge", "Every dodge makes your next attack deal 50% more"],
    lose: ["Your Poison, Bleed and other status damage −40%"],
    skills: ["feint", "flurry"],
    hooks: { stats: s => { s.dodge += 10; s.dotAmp = (s.dotAmp ?? 0) - 40; },
      onDodge: (_b, c) => { c.defender.flags["duelOpen"] = 1; },
      modifyAttack: (_b, c) => { if (c.attacker.flags["duelOpen"] && !c.offhand && !c.noDamage) { c.attacker.flags["duelOpen"] = 0; c.mult *= 1.5; } } } },
  { id: "assassin", origin: "rogue", name: "Assassin", icon: "🗡️", pitch: "One cut, and they're already dying.",
    gain: ["Your first attack in every fight deals double", "Poison and Bleed you apply land 1 stronger"],
    lose: ["−10% Max HP", "−8% Dodge"],
    skills: ["ambush", "toxicburst"],
    hooks: { stats: s => { s.maxHp = Math.round(s.maxHp * 0.9); s.dodge -= 8; },
      modifyAttack: (_b, c) => { if (!c.attacker.flags["assassinFirst"] && !c.offhand && !c.noDamage) { c.attacker.flags["assassinFirst"] = 1; c.mult *= 2; } },
      onStatusApplied: (b, f, t, status) => { if (t !== f && (status === "poison" || status === "bleed") && !f.flags["assBusy"]) { f.flags["assBusy"] = 1; applyStatus(b, f, t, status, 1); f.flags["assBusy"] = 0; } } } },
  { id: "elementalist", origin: "mage", name: "Elementalist", icon: "🔥", pitch: "Pile the elements on until they tear each other apart.",
    gain: ["Every status you put on a foe lands 1 stronger", "Reactions deal 30% more"],
    lose: ["Your plain (non-spell) attacks deal 35% less"],
    skills: ["cataclysm", "prismbolt"],
    hooks: { reactionMult: () => 1.3,
      onStatusApplied: (b, f, t, status) => { if (t !== f && !f.flags["elemBusy"] && status !== "stun") { f.flags["elemBusy"] = 1; applyStatus(b, f, t, status, 1); f.flags["elemBusy"] = 0; } },
      modifyAttack: (_b, c) => { if (!c.spec.magic && !c.noDamage) c.mult *= 0.65; } } },
  { id: "arcanist", origin: "mage", name: "Arcanist", icon: "🔮", pitch: "Raw power, measured in Mana.",
    gain: ["+2 Max Mana", "Your spells deal +1 Damage for every Mana you hold"],
    lose: ["Your status damage −30%", "Reactions deal 30% less"],
    skills: ["manalance", "arcaneaegis"],
    hooks: { onFightStart: (_b, f) => { f.maxMana = (f.maxMana ?? 3) + 2; }, reactionMult: () => 0.7,
      stats: s => { s.dotAmp = (s.dotAmp ?? 0) - 30; },
      modifyAttack: (_b, c) => { if (c.spec.magic && !c.noDamage) c.bonus += c.attacker.mana ?? 0; } } },
  { id: "penitent", origin: "cleric", name: "Penitent", icon: "⛓️", pitch: "Suffer it all, and give every drop of it back.",
    gain: ["A quarter of the damage you take is stored; your next hit adds it all"],
    lose: ["All your healing −30%"],
    skills: ["atonement", "martyrdom"],
    hooks: { whenHit: (_b, c) => { if (c.dealt > 0) c.defender.flags["penStore"] = (c.defender.flags["penStore"] ?? 0) + Math.ceil(c.dealt / 4); },
      modifyAttack: (_b, c) => { const f = c.attacker; if ((f.flags["penStore"] ?? 0) > 0 && !c.offhand && !c.noDamage) { c.bonus += f.flags["penStore"]; f.flags["penStore"] = 0; } },
      healMult: () => 0.7 } },
  { id: "zealot", origin: "cleric", name: "Zealot", icon: "☀️", pitch: "Burn bright, mend fast, and hate the dead.",
    gain: ["Start every fight with 3 Regen", "Regen you gain is half again stronger", "You deal 30% more to Unholy foes"],
    lose: ["You take 10% more damage"],
    skills: ["consecrate", "judgment"],
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "regen", 3),
      incomingStatus: (_b, _f, status, n) => (status === "regen" ? Math.ceil(n * 1.5) : n),
      stats: s => { s.dmgTaken = (s.dmgTaken ?? 0) + 10; },
      modifyAttack: (_b, c) => { if (isUnholy(c.defender)) c.mult *= 1.3; } } }
];
export const PATH_MAP = new Map(PATHS.map(p => [p.id, p]));
export const pathsOf = (o: OriginId) => PATHS.filter(p => p.origin === o);
/** The level at which you choose your path's skill. */
export const SKILL_LEVEL = 5;

/** The paths as hook items (hidden: the path itself says what it does). */
export const PATH_HOOKS: HookDef[] = PATHS.map(p => ({ id: `path_${p.id}`, name: p.name, kind: "trait", tags: [], text: `${p.gain.join("; ")}. But: ${p.lose.join("; ")}`, hooks: p.hooks }));
