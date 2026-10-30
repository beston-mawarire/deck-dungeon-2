// Status effects (both sides), their reactions, and their per-round ticks.
import { eachHook, fx, log } from "./registry";
import type { Battle, Fighter, StatusId } from "./types";
import { NEGATIVE_STATUSES } from "./types";

export const isNegative = (s: StatusId) => (NEGATIVE_STATUSES as readonly string[]).includes(s);
export const st = (f: Fighter, s: StatusId) => f.statuses[s] ?? 0;
export const other = (b: Battle, f: Fighter) => (f === b.player ? b.enemy : b.player);

/** Statuses that never stack above 1 (Shock can go to 2 with Conductor, set by the item). */
const SINGLE: StatusId[] = ["stun", "evade", "haste", "focus", "ward"];

export const STATUS_INFO: Record<StatusId, { name: string; icon: string; text: string }> = {
  bleed: { name: "Bleed", icon: "🩸", text: "Lose 1 HP per stack at end of round; stacks fall by 1" },
  burn: { name: "Burn", icon: "🔥", text: "Take damage equal to stacks at start of turn; stacks halve" },
  poison: { name: "Poison", icon: "☠️", text: "Lose 1 HP per stack each round; doesn't fade during the fight" },
  chill: { name: "Chill", icon: "❄️", text: "Rolls −1 (a 1 stays a 1); lasts its stacks in rounds" },
  shock: { name: "Shock", icon: "⚡", text: "The next hit taken deals +50%" },
  weak: { name: "Weak", icon: "🥀", text: "Deals 25% less damage; lasts its stacks in rounds" },
  exposed: { name: "Exposed", icon: "🎯", text: "Takes +2 from every hit; lasts its stacks in rounds" },
  blind: { name: "Blind", icon: "🌫️", text: "Faces 1 and 2 miss completely; lasts its stacks in rounds" },
  stun: { name: "Stun", icon: "💫", text: "Skips its next action" },
  doom: { name: "Doom", icon: "💀", text: "Dies when Doom stacks reach its current HP" },
  regen: { name: "Regen", icon: "💚", text: "Heal 1 per stack at end of round; stacks fall by 1" },
  barrier: { name: "Barrier", icon: "🛡️", text: "Absorbs damage before HP; gone at end of fight" },
  might: { name: "Might", icon: "💪", text: "+1 Damage per stack this fight" },
  haste: { name: "Haste", icon: "💨", text: "An extra action next round, then it's used up" },
  focus: { name: "Focus", icon: "🎲", text: "Next roll: roll twice, keep the better" },
  evade: { name: "Evade", icon: "🌀", text: "The next hit misses" },
  spikes: { name: "Spikes", icon: "🌵", text: "When hit, deal stacks back; stacks fall by 1 each round" },
  ward: { name: "Ward", icon: "✨", text: "Blocks the next negative status" }
};

export const REACTIONS = [
  { id: "combustion", name: "Combustion", a: "burn", b: "poison", text: "Deals Burn + Poison stacks as damage at once; both clear" },
  { id: "steam", name: "Steam", a: "burn", b: "chill", text: "Both clear; the target gets Blind 2 and Exposed 2" },
  { id: "shatter", name: "Shatter", a: "chill", b: "shock", text: "The next hit deals triple and Stuns" },
  { id: "rupture", name: "Rupture", a: "bleed", b: "exposed", text: "Bleed ticks twice each round" },
  { id: "sepsis", name: "Sepsis", a: "bleed", b: "poison", text: "Each Bleed tick adds 1 Poison" },
  { id: "overload", name: "Overload", a: "shock", b: "burn", text: "Shock is used up and Burn stacks double" },
  { id: "despair", name: "Despair", a: "weak", b: "doom", text: "Doom grows by 1 each round" },
  { id: "bastion", name: "Bastion", a: "barrier", b: "regen", text: "Regen also refills Barrier" },
  { id: "frenzy", name: "Frenzy", a: "might", b: "haste", text: "Your 5s count as crits for the rest of the fight" },
  { id: "clarity", name: "Clarity", a: "focus", b: "ward", text: "On your next roll, choose the face" }
] as const;
export type ReactionId = (typeof REACTIONS)[number]["id"];

/** Take HP from a fighter; Barrier absorbs first. Returns HP actually lost. */
export function loseHp(b: Battle, f: Fighter, amount: number): number {
  amount = Math.max(0, Math.round(amount));
  const bar = st(f, "barrier");
  if (bar > 0 && amount > 0) {
    const used = Math.min(bar, amount);
    f.statuses.barrier = bar - used;
    amount -= used;
  }
  f.hp -= amount;
  if (amount > 0) fx(b, { who: f.id, kind: "dmg", value: amount });
  else if (bar > 0) fx(b, { who: f.id, kind: "block", text: "Barrier", icon: "🛡️" });
  return amount;
}

export function heal(b: Battle, f: Fighter, amount: number, why = "") {
  if (amount <= 0 || f.hp <= 0) return 0;
  eachHook(f, "healMult", (h, s) => (amount = Math.floor(amount * h(s))));
  const before = f.hp;
  f.hp = Math.min(f.maxHp, f.hp + amount);
  const got = f.hp - before;
  if (got > 0) {
    log(b, `${f.name} heals ${got}${why ? ` (${why})` : ""}.`);
    fx(b, { who: f.id, kind: "heal", value: got });
  }
  return got;
}

function reactionMult(b: Battle, source: Fighter | null) {
  let m = 1;
  if (source) eachHook(source, "reactionMult", (h, s) => (m *= h(b, source, s)));
  return m;
}

/**
 * Put a status on a fighter. Handles Ward, item negation, stacking, reactions and
 * "on status applied" hooks. `depth` stops reactions from chaining forever.
 */
export function applyStatus(b: Battle, source: Fighter | null, target: Fighter, id: StatusId, amount: number, depth = 0) {
  if (amount <= 0 || target.hp <= 0) return;
  if (isNegative(id) && st(target, "ward") > 0) {
    target.statuses.ward = st(target, "ward") - 1;
    log(b, `${target.name}'s Ward blocks ${STATUS_INFO[id].name}.`);
    fx(b, { who: target.id, kind: "block", text: "Warded", icon: "✨" });
    return;
  }
  eachHook(target, "incomingStatus", (h, s) => (amount = h(b, target, id, amount, s)));
  if (amount <= 0) return;

  const had = (x: StatusId) => st(target, x) > 0;
  if (SINGLE.includes(id)) target.statuses[id] = Math.max(st(target, id), 1);
  else if (id === "shock") target.statuses.shock = Math.max(st(target, "shock"), amount);
  else target.statuses[id] = st(target, id) + amount;
  log(b, `${target.name} gains ${STATUS_INFO[id].icon} ${STATUS_INFO[id].name}${SINGLE.includes(id) || id === "shock" ? "" : ` ${amount}`}.`);
  fx(b, { who: target.id, kind: "status", icon: STATUS_INFO[id].icon, text: `${STATUS_INFO[id].name}${SINGLE.includes(id) || id === "shock" ? "" : ` +${amount}`}`, value: isNegative(id) ? -1 : 1 });

  if (depth === 0) {
    for (const r of REACTIONS) {
      const partner = r.a === id ? r.b : r.b === id ? r.a : null;
      if (partner && had(partner as StatusId)) react(b, source, target, r.id, depth);
      if (target.hp <= 0) break;
    }
  }
  if (source) eachHook(source, "onStatusApplied", (h, s) => h(b, source, target, id, amount, s));
}

function react(b: Battle, source: Fighter | null, t: Fighter, id: ReactionId, depth: number) {
  const name = REACTIONS.find(r => r.id === id)!.name;
  fx(b, { who: t.id, kind: "reaction", text: `${name}!` });
  if (source && source !== t && (source.items["l_ouroboros"] ?? 0) > 0) heal(b, source, 3, "Ouroboros");
  const m = reactionMult(b, source);
  switch (id) {
    case "combustion": {
      const dmg = Math.round((st(t, "burn") + st(t, "poison")) * m);
      t.statuses.burn = 0;
      if (!(source && (source.items["kindling_oil"] ?? 0) > 0)) t.statuses.poison = 0;
      const lost = loseHp(b, t, dmg);
      log(b, `💥 ${name}! ${t.name} takes ${lost}.`);
      break;
    }
    case "steam":
      t.statuses.burn = 0;
      t.statuses.chill = 0;
      log(b, `💨 ${name}!`);
      applyStatus(b, source, t, "blind", Math.round(2 * m), depth + 1);
      applyStatus(b, source, t, "exposed", Math.round(2 * m), depth + 1);
      break;
    case "overload":
      t.statuses.shock = 0;
      t.statuses.burn = Math.round(st(t, "burn") * 2 * m);
      log(b, `⚡🔥 ${name}! Burn doubles to ${t.statuses.burn}.`);
      if (source && (source.items["t_pyrotechnics"] ?? 0) > 0) {
        applyStatus(b, source, t, "stun", 1, depth + 1);
        if ((source.items["t_pyrotechnics"] ?? 0) >= 2) applyStatus(b, source, t, "exposed", 2, depth + 1);
      }
      break;
    default:
      // Lasting reactions: a flag for the rest of the fight.
      t.flags[id] = Math.max(t.flags[id] ?? 0, m);
      if (id === "clarity") {
        t.statuses.focus = 0;
        t.statuses.ward = 0;
      }
      log(b, `✴️ ${name} on ${t.name}: ${REACTIONS.find(r => r.id === id)!.text}.`);
  }
}

/** Burn ticks at the start of the holder's turn. */
export function startOfTurn(b: Battle, f: Fighter) {
  const burn = st(f, "burn");
  if (burn > 0) {
    const lost = loseHp(b, f, burn);
    log(b, `🔥 ${f.name} burns for ${lost}.`);
    const skip = f.flags["burnNoHalve"] ?? 0;
    f.statuses.burn = skip ? burn : Math.floor(burn / 2);
  }
}

/** End-of-round ticks for one fighter. */
export function endOfRound(b: Battle, f: Fighter) {
  const opp = other(b, f);
  let bleed = st(f, "bleed");
  if (bleed > 0) {
    let ticks = f.flags["rupture"] ? 2 : 1;
    if (st(f, "chill") > 0 && (opp.items["frostbite_needle"] ?? 0) > 0) ticks *= 2;
    for (let i = 0; i < ticks; i++) {
      const lost = loseHp(b, f, bleed);
      log(b, `🩸 ${f.name} bleeds for ${lost}.`);
      if (f.flags["sepsis"]) f.statuses.poison = st(f, "poison") + 1;
    }
    if (!f.flags["bleedNoFade"]) f.statuses.bleed = bleed - 1;
  }
  const poison = st(f, "poison");
  if (poison > 0) {
    const lost = loseHp(b, f, poison);
    log(b, `☠️ ${f.name} takes ${lost} from Poison.`);
  }
  const regen = st(f, "regen");
  if (regen > 0) {
    heal(b, f, regen, "Regen");
    if (f.flags["bastion"]) f.statuses.barrier = st(f, "barrier") + regen;
    f.statuses.regen = regen - 1;
  }
  for (const s of ["spikes", "chill", "weak", "exposed", "blind"] as StatusId[]) {
    if (st(f, s) > 0) f.statuses[s] = st(f, s) - 1;
  }
  if (st(f, "doom") > 0) {
    if (f.flags["despair"]) f.statuses.doom = st(f, "doom") + 1;
    if (st(f, "doom") >= f.hp && f.hp > 0) {
      log(b, `💀 Doom claims ${f.name}.`);
      fx(b, { who: f.id, kind: "text", text: "Doomed", icon: "💀" });
      f.hp = 0;
    }
  }
}
