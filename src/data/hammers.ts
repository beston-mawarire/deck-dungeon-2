// War hammers (Heavy, always Bash, Might) and Holy "Sacrifice" weapons that burn your HP for damage.
import type { AttackCtx, Battle, GearBase } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, log, loseHp, MISS, st } from "./helpers";

const only = (onlyRarity: GearBase["onlyRarity"], d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity });
const HAMMER = { kind: "weapon" as const, slot: "main" as const, twoHanded: true, heavy: true, alwaysBash: true };
const HAMMER_FACES = [MISS, HIT, HIT, HIT, CRIT, CRIT];
const might = (n: number) => (b: Battle, c: AttackCtx) => { if (!c.offhand) applyStatus(b, c.attacker, c.attacker, "might", n); };

export const WAR_HAMMERS: GearBase[] = [
  only("rare", { ...HAMMER, id: "wh_iron_warhammer", name: "Iron Warhammer", tags: ["Strike", "Guard"], damage: 11, faces: HAMMER_FACES,
    text: "War hammer: Heavy (builds Stagger), two-handed, always has a Bash chance. Its hits give 1 Might.", hooks: { onHit: might(1) } }),
  only("epic", { ...HAMMER, id: "wh_thunderhead", name: "Thunderhead Maul", tags: ["Strike", "Guard"], damage: 15, faces: HAMMER_FACES,
    text: "War hammer: Heavy, two-handed, always has a Bash chance. Hits give 1 Might; each Stagger gives 3 more.", hooks: { onHit: might(1), onStagger: (b, self) => applyStatus(b, self, self, "might", 3) } })
];

export const WAR_HAMMER_LEGENDARIES: GearBase[] = [
  { ...HAMMER, id: "lx_mountain_king", rarity: "legendary", name: "Hammer of the Mountain King", tags: ["Strike", "Guard"], damage: 18, faces: HAMMER_FACES,
    legendary: { minFloor: 3, asBase: "w_axe", reveal: "War hammer: Heavy, two-handed, always has a Bash chance. Every hit gives 2 Might; each Stagger gives 5 more." },
    text: "The mountain still has a dent in it.", hooks: { onHit: might(2), onStagger: (b, self) => applyStatus(b, self, self, "might", 5) } }
];

export const WAR_HAMMER_CRIMSON: GearBase[] = [
  { ...HAMMER, id: "cx_worldbell", rarity: "crimson", name: "The Worldbell", tags: ["Strike", "Guard", "Kill"], damage: 22, faces: HAMMER_FACES,
    text: "War hammer: Heavy, two-handed, always has a Bash chance. Every hit gives 2 Might. Each Stagger rings the bell: it deals 5 × your Might and Stuns.",
    hooks: { onHit: might(2), onStagger: (b, self, foe) => { const n = 5 * st(self, "might"); loseHp(b, foe, n); applyStatus(b, self, foe, "stun", 1); log(b, `🔔 The Worldbell tolls: ${n}.`); } } }
];

// ---------- Sacrifice (Holy) ----------
// Each roll burns (roll × 10%) of your current HP and adds it to the hit. Until your next roll,
// that same % of any hit you take comes back as healing (boosted by anything that boosts healing).
function sacrifice(healScale = 1) {
  return {
    modifyAttack: (b: Battle, c: AttackCtx) => {
      if (c.offhand) return;
      c.attacker.flags["sacrifice"] = 0;
      if (c.kind !== "hit" && c.kind !== "crit") return;
      const pct = Math.min(60, c.face * 10);
      const burn = Math.min(c.attacker.hp - 1, Math.floor(c.attacker.hp * pct / 100));
      if (burn <= 0) return;
      c.attacker.hp -= burn;
      c.bonus += burn;
      c.attacker.flags["sacrifice"] = Math.min(100, pct * healScale);
      log(b, `🔥 Sacrifice: you burn ${burn} HP (${pct}%) into the blow.`);
    },
    whenHit: (b: Battle, c: AttackCtx) => {
      const pct = c.defender.flags["sacrifice"] ?? 0;
      if (pct > 0 && c.dealt > 0) heal(b, c.defender, Math.ceil(c.dealt * pct / 100), "Sacrifice");
    }
  };
}
const SAC_TEXT = "Sacrifice: each roll burns that many tenths of your current HP (a 1 burns 10%, a 6 burns 60%) and adds it to the hit. Until your next roll, the same % of every hit you take heals you.";

export const SACRIFICE_WEAPONS: GearBase[] = [
  only("rare", { kind: "weapon", slot: "main", id: "sc_martyr_mace", name: "Martyr's Mace", tags: ["Holy", "Blood"], damage: 5, faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT], text: `Holy. ${SAC_TEXT}`, hooks: sacrifice() }),
  only("epic", { kind: "weapon", slot: "main", id: "sc_bleeding_saint", name: "Blade of the Bleeding Saint", tags: ["Holy", "Blood"], damage: 8, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    text: `Holy. Crits on 5 and 6. ${SAC_TEXT} Healing you receive is 25% stronger.`, hooks: { ...sacrifice(), healMult: () => 1.25 } })
];

export const SACRIFICE_LEGENDARIES: GearBase[] = [
  { kind: "weapon", slot: "main", id: "lx_self_given_pyre", rarity: "legendary", name: "Pyre of the Self-Given", tags: ["Holy", "Blood"], damage: 10, faces: [GRAZE, HIT, HIT, HIT, CRIT, CRIT],
    legendary: { minFloor: 3, asBase: "w_mace", reveal: "Holy. Sacrifice: each roll burns that many tenths of your current HP into the hit. Until your next roll, twice that % of every hit you take heals you (up to all of it)." },
    text: "It burns only what you offer it.", hooks: sacrifice(2) }
];
