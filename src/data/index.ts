// Registers the whole library with the engine. Import this once at startup.
import { register } from "../engine/registry";
import { BONUSES, EPIC_POWERS, LEGENDARIES } from "./affixes";
import { GEAR_BASES } from "./gear";
import { TRAITS } from "./monsters";
import { CURSES, ORIGIN_PASSIVES } from "./origins";
import { RELICS } from "./relics";
import { TALENTS } from "./talents";

let done = false;
export function loadLibrary() {
  if (done) return;
  done = true;
  register([...GEAR_BASES, ...LEGENDARIES, ...BONUSES, ...EPIC_POWERS, ...RELICS, ...TALENTS, ...TRAITS, ...ORIGIN_PASSIVES, ...CURSES]);
}

export { BONUSES, CURSES, EPIC_POWERS, GEAR_BASES, LEGENDARIES, ORIGIN_PASSIVES, RELICS, TALENTS, TRAITS };
