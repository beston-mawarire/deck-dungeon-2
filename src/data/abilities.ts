// Abilities on items: a line that adds a button in a fight (it costs Mana, like your class's own ability).
// Each one only rolls on the kind of gear that suits it, and some wait until your class has beaten a layer.
import type { HookDef } from "../engine/types";
import type { Family, Load } from "../game/families";

export interface AbilityLine { skill: string; name: string; kinds: ("weapon" | "off" | "armour" | "trinket")[]; families?: Family[]; loads?: Load[]; layers?: number }
export const ABILITY_LINES: AbilityLine[] = [
  { skill: "shieldwall", name: "Shield Wall", kinds: ["off"], families: ["shield"] },
  { skill: "crush", name: "Crushing Blow", kinds: ["weapon"], families: ["blunt", "breaker", "greatblade"] },
  { skill: "counter", name: "Counter", kinds: ["weapon"], families: ["shortblade"] },
  { skill: "warcry", name: "War Cry", kinds: ["weapon"], families: ["polearm", "greatblade"] },
  { skill: "envenom", name: "Envenom", kinds: ["weapon"], families: ["knife"] },
  { skill: "smokebomb", name: "Smoke Bomb", kinds: ["armour"], loads: ["light"] },
  { skill: "arcanebolt", name: "Arcane Bolt", kinds: ["weapon"], families: ["arcane"] },
  { skill: "frostnova", name: "Frost Nova", kinds: ["off"], families: ["focus"], layers: 1 },
  { skill: "smite", name: "Smite", kinds: ["weapon"], families: ["blunt", "breaker"], layers: 1 },
  { skill: "sanctuary", name: "Sanctuary", kinds: ["trinket"], families: ["amulet"], layers: 1 }
];
/** The lines themselves (they do nothing on their own: the fight reads them to offer the ability). */
export const ABILITY_DEFS: HookDef[] = ABILITY_LINES.map(a => ({ id: `ab_${a.skill}`, name: a.name, kind: "bonus", tags: [], text: `Grants the ability ${a.name} (costs Mana)`, hooks: {} }));
