import { HEAT_HOOKS, SET_BONUSES, SET_PIECES } from "./talisman";
import { GEN_MODULES } from "./genparts";
// Registers the whole library with the engine. Import this once at startup.
import { register } from "../engine/registry";
import { BONUSES, EPIC_POWERS, LEGENDARIES } from "./affixes";
import { KEEPSAKES } from "./arsenal";
import { CRIMSON } from "./crimson";
import { FUSION_RELICS } from "./fusions";
import { GEAR_BASES } from "./gear";
import { TRAITS } from "./monsters";
import { CURSES, ORIGIN_PASSIVES } from "./origins";
import { OLD_TRANSMUTER, RELICS } from "./relics";
import { TALENTS } from "./talents";
import { ABYSS_ITEMS } from "./abyss";

let done = false;
export function loadLibrary() {
  if (done) return;
  done = true;
  register([...ABYSS_ITEMS, ...GEAR_BASES, ...LEGENDARIES, ...CRIMSON, ...BONUSES, ...EPIC_POWERS, ...RELICS, ...FUSION_RELICS, ...TALENTS, ...TRAITS, ...ORIGIN_PASSIVES, ...CURSES, ...KEEPSAKES, OLD_TRANSMUTER, ...GEN_MODULES, ...SET_PIECES, ...SET_BONUSES, ...HEAT_HOOKS]);
}

export { BONUSES, CRIMSON, KEEPSAKES, CURSES, FUSION_RELICS, EPIC_POWERS, GEAR_BASES, LEGENDARIES, ORIGIN_PASSIVES, RELICS, TALENTS, TRAITS };
