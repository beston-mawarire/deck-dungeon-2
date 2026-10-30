// Fusions: own both relics of a recipe, visit a Forge, and fuse them into something that breaks the rules.
// Recipes stay hidden until you've made them once (the Codex remembers).
import { other, st } from "../engine/statuses";
import type { HookDef } from "../engine/types";
import { applyStatus, heal, log, on, ping } from "./helpers";

const fused = (d: Omit<HookDef, "kind" | "rarity">): HookDef => ({ kind: "relic", rarity: "legendary", ...d });

export const FUSION_RELICS: HookDef[] = [
  fused({ id: "f_thousand_cuts", name: "Thousand Cuts", tags: ["Bleed", "Crit"], text: "Every hit applies Bleed equal to your roll; crits double all Bleed on the enemy",
    hooks: { onHit: (b, c) => { applyStatus(b, c.attacker, c.defender, "bleed", Math.min(c.face, 12)); if (c.kind === "crit") c.defender.statuses.bleed = st(c.defender, "bleed") * 2; } } }),
  fused({ id: "f_dragons_breath", name: "Dragon's Breath", tags: ["Burn"], text: "Burn on enemies never halves; every fight starts with 5 Burn on the enemy",
    hooks: { onFightStart: (b, f) => { const e = other(b, f); e.flags["burnNoHalve"] = 1; applyStatus(b, f, e, "burn", 5); } } }),
  fused({ id: "f_iron_maiden", name: "Iron Maiden", tags: ["Thorns", "Guard"], text: "When hit, deal twice your Armor back",
    hooks: { whenHit: (b, c) => ping(b, c.attacker, c.defender.armor * 2, "Iron Maiden") } }),
  fused({ id: "f_golden_fist", name: "Golden Fist", tags: ["Gold", "Strike"], text: "+1 Damage per 25 Gold you hold; every hit gives 1 Gold",
    hooks: { modifyAttack: (_b, c) => { c.bonus += Math.floor(c.attacker.gold / 25); }, onHit: (_b, c) => { c.attacker.gold += 1; } } }),
  fused({ id: "f_sanguine_storm", name: "Sanguine Storm", tags: ["Blood", "Bleed"], text: "At the end of each round, heal for all the Bleed on the enemy",
    hooks: { onRoundEnd: (b, f) => { const n = st(other(b, f), "bleed"); if (n) heal(b, f, n, "Sanguine Storm"); } } }),
  fused({ id: "f_headsmans_oath", name: "Headsman's Oath", tags: ["Kill", "Strike"], text: "Non-boss enemies under 35% HP die when you hit them; bosses under 35% take double",
    hooks: {
      modifyAttack: (_b, c) => { if (c.defender.boss && c.defender.hp < c.defender.maxHp * 0.35) c.mult *= 2; },
      onHit: (b, c) => { if (!c.defender.boss && c.defender.hp > 0 && c.defender.hp < c.defender.maxHp * 0.35) { c.defender.hp = 0; log(b, "Headsman's Oath: executed."); } }
    } }),
  fused({ id: "f_pandemic", name: "Pandemic", tags: ["Poison"], text: "Poison on the enemy doubles at the end of each round (up to 99)",
    hooks: { onRoundEnd: (b, f) => { const e = other(b, f); const n = st(e, "poison"); if (n) { e.statuses.poison = Math.min(99, n * 2); log(b, `Pandemic: Poison grows to ${e.statuses.poison}.`); } } } }),
  fused({ id: "f_tempest_core", name: "Tempest Core", tags: ["Frost", "Storm"], text: "Your 2s apply Chill and Shock together (Shatter)",
    hooks: { face: [on(2, (b, c) => { applyStatus(b, c.attacker, c.defender, "chill", 1); applyStatus(b, c.attacker, c.defender, "shock", 1); })] } })
];

export const FUSION_RECIPES: { a: string; b: string; out: string }[] = [
  { a: "serrated_edge", b: "keen_eye", out: "f_thousand_cuts" },
  { a: "tinderbox", b: "bellows", out: "f_dragons_breath" },
  { a: "spiked_bracer", b: "iron_plate", out: "f_iron_maiden" },
  { a: "coin_purse", b: "lucky_penny", out: "f_golden_fist" },
  { a: "vampire_cloak", b: "bloodletter", out: "f_sanguine_storm" },
  { a: "executioners_axe", b: "whetstone", out: "f_headsmans_oath" },
  { a: "hydra_fang", b: "viper_fang", out: "f_pandemic" },
  { a: "frost_shard", b: "static_charm", out: "f_tempest_core" }
];
