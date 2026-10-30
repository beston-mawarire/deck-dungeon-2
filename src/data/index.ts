// Registers the whole library with the engine. Import this once at startup.
import { register } from "../engine/registry";
import { ENEMY_ITEMS } from "./enemies";
import { RELICS } from "./relics";
import { TALENTS } from "./talents";

let done = false;
export function loadLibrary() {
  if (done) return;
  done = true;
  register([...RELICS, ...TALENTS, ...ENEMY_ITEMS]);
}

export { ENEMY_ITEMS, RELICS, TALENTS };
