// Epic gear built around HP: grow mid-fight, pay HP for power, trade Max HP for doubled off-hands.
import type { GearBase } from "../engine/types";
import { applyStatus, CRIT, GRAZE, heal, HIT, log } from "./helpers";

const ep = (d: Omit<GearBase, "onlyRarity">): GearBase => ({ ...d, onlyRarity: "epic" });

export const HP_EPICS: GearBase[] = [
  ep({ id: "ep_swelling_heart", kind: "trinket", slot: "trinket", name: "Swelling Heart", tags: ["Blood", "Strike"],
    text: "Every hit you land gives you +2 Max HP (and heals 2) until the fight ends.",
    hooks: {
      onHit: (b, c) => { const a = c.attacker; a.maxHp += 2; a.hp += 2; a.flags["swell"] = (a.flags["swell"] ?? 0) + 2; },
      onFightEnd: (_b, f) => { const n = f.flags["swell"] ?? 0; if (n) { f.maxHp -= n; f.hp = Math.min(f.hp, f.maxHp); f.flags["swell"] = 0; } }
    } }),
  ep({ id: "ep_bloodprice", kind: "weapon", slot: "main", name: "Bloodprice Blade", tags: ["Blood", "Strike"], damage: 7, faces: [GRAZE, HIT, HIT, HIT, HIT, CRIT],
    text: "Every hit costs you 5% of your Max HP (it can't kill you), and makes this blade's base damage 20% higher for the rest of the fight.",
    hooks: {
      onHit: (b, c) => {
        if (c.offhand) return;
        const a = c.attacker;
        const cost = Math.max(1, Math.ceil(a.maxHp * 0.05));
        a.hp = Math.max(1, a.hp - cost);
        a.flags["bloodprice"] = (a.flags["bloodprice"] ?? 0) + 1;
        log(b, `🩸 Bloodprice: you pay ${cost} HP; the blade grows hungrier (+${20 * a.flags["bloodprice"]}%).`);
      },
      modifyAttack: (_b, c) => { if (!c.offhand && c.attacker.flags["bloodprice"]) c.bonus += Math.round(c.attacker.damage * 0.2 * c.attacker.flags["bloodprice"]); }
    } }),
  ep({ id: "ep_hollow_vessel", kind: "trinket", slot: "trinket", name: "Hollow Vessel", tags: ["Arcane", "Hex"],
    text: "Your Max HP can't go above 20. Your off-hand's effects happen twice.", hooks: {} }),
  ep({ id: "ep_martyr_shroud", kind: "armour", slot: "armour", name: "Martyr's Shroud", tags: ["Blood", "Strike", "Guard"], armor: 3,
    text: "Medium: +3 Armor. Your hits deal +1 for every 10% of your Max HP you're missing.",
    hooks: { modifyAttack: (_b, c) => { const a = c.attacker; c.bonus += Math.floor(((a.maxHp - a.hp) / a.maxHp) * 10); } } }),
  ep({ id: "ep_ironblood_totem", kind: "off", slot: "off", name: "Ironblood Totem", tags: ["Blood", "Guard"],
    text: "Start every fight with Barrier equal to 25% of your Max HP. While you're above 75% HP, your hits deal +3.",
    hooks: { onFightStart: (b, f) => applyStatus(b, f, f, "barrier", Math.ceil(f.maxHp * 0.25)),
      modifyAttack: (_b, c) => { if (c.attacker.hp > c.attacker.maxHp * 0.75) c.bonus += 3; } } }),
  ep({ id: "ep_colossus_hide", kind: "armour", slot: "armour", name: "Colossus Hide", tags: ["Blood", "Guard"], armor: 4,
    text: "Heavy: +4 Armor. +40% Max HP, but you deal 15% less damage. Heal 3% of your Max HP at the end of every round.",
    hooks: { stats: s => { s.maxHp = Math.round(s.maxHp * 1.4); s.dmgDealt = (s.dmgDealt ?? 0) - 15; },
      onRoundEnd: (b, f) => { if (f.hp > 0) heal(b, f, Math.max(1, Math.ceil(f.maxHp * 0.03)), "Colossus Hide"); } } })
];
