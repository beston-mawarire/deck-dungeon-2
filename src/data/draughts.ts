// The Brewery's draughts, while they last: hidden hook items (the hero carries one while its draught is active).
import type { HookDef } from "../engine/types";
import { applyStatus } from "./helpers";

const trait = (d: Omit<HookDef, "kind">): HookDef => ({ kind: "trait", ...d });
export const DRAUGHT_HOOKS: HookDef[] = [
  trait({ id: "draught_iron", name: "Ironbark Draught", tags: [], text: "+2 Armor", hooks: { stats: s => { s.armor += 2; } } }),
  trait({ id: "draught_swift", name: "Fleetfoot Tonic", tags: [], text: "+5% Dodge", hooks: { stats: s => { s.dodge += 5; } } }),
  trait({ id: "draught_ember", name: "Firebrand Oil", tags: [], text: "Your hits apply 1 Burn", hooks: { onHit: (b, c) => { if (c.defender.hp > 0) applyStatus(b, c.attacker, c.defender, "burn", 1); } } })
];
