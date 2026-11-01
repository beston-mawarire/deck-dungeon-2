// Status effects (both sides), their reactions, and their per-round ticks.
import { eachHook, fx, log } from "./registry";
import type { Battle, Fighter, StatusId } from "./types";
import { NEGATIVE_STATUSES } from "./types";

export const isNegative = (s: StatusId) => (NEGATIVE_STATUSES as readonly string[]).includes(s);
export const st = (f: Fighter, s: StatusId) => f.statuses[s] ?? 0;
export const other = (b: Battle, f: Fighter) => (f === b.player ? b.enemy : b.player);

/** Statuses that never stack above 1 (Shock can go to 2 with Conductor, set by the item). */
const SINGLE: StatusId[] = ["stun", "evade", "focus", "ward"];
/** The hero's Haste stacks without limit; enemies can bank at most this many. */
export const ENEMY_HASTE_CAP = 4;

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
  barrier: { name: "Barrier", icon: "🛡️", text: "Absorbs damage before HP; half of it fades at the end of each round" },
  might: { name: "Might", icon: "💪", text: "+1 Damage per stack this fight" },
  haste: { name: "Haste", icon: "💨", text: "An extra action on your turn. Stacks: one is used each turn" },
  focus: { name: "Focus", icon: "🎲", text: "Next roll: roll twice, keep the better" },
  evade: { name: "Evade", icon: "🌀", text: "The next hit misses" },
  spikes: { name: "Spikes", icon: "🌵", text: "When hit, deal stacks back; stacks fall by 1 each round" },
  ward: { name: "Ward", icon: "✨", text: "Blocks the next negative status" },
  static: { name: "Static", icon: "🔋", text: "Each action it takes (attack, spell, buff) costs a stack and 2 damage; caps at 10. Shock sets it all off at once" },
  soaked: { name: "Soaked", icon: "💧", text: "Lightning (Shock, Static) hits it twice as hard; Burn on it is halved; lasts its stacks in rounds" },
  charged: { name: "Charged", icon: "⚡", text: "Your next hit deals +2 per stack and leaves that much Static" },
  kindled: { name: "Kindled", icon: "🕯️", text: "Your hits apply Burn equal to stacks; falls by 1 each round" },
  grounded: { name: "Grounded", icon: "🪨", text: "Shock and Static can't land on you; lasts its stacks in rounds" },
  smoulder: { name: "Smouldering", icon: "🌋", text: "Each round it burns from within: an enemy takes 4 Burn (you'd take 5), and its foe takes 1 Burn; lasts its stacks in rounds" },
  fracture: { name: "Fracture", icon: "🪨", text: "Does nothing at first. At 3 stacks it shatters: 4 damage per stack (ignores Armor), then clears" },
  stagger: { name: "Stagger", icon: "🔨", text: "Built up by Heavy weapons (1 per hit, 2 per Crit). At 3 (Elites 4, bosses 5) the foe is Staggered: it loses its next action and your next hit deals double. It can't build again for 2 rounds after" },
  broken: { name: "Staggered", icon: "💥", text: "Reeling: your next hit on it deals double" },
  dazzled: { name: "Dazzled", icon: "😵", text: "Its attacks miss completely; lasts its stacks in rounds (at most 4)" },
  reinforced: { name: "Reinforced", icon: "🧱", text: "From full blocks (Guard or a full Elemental Barrier) with Reinforcing gear: your next attack deals +2 per stack. Lost if your next Guard or barrier lets damage through" },
  blessed: { name: "Blessed", icon: "🌟", text: "Grows each round you deal no damage (with Blessing gear). Your next hit that lands deals 10% of the enemy's Max HP per stack, then it resets" },
  consecrated: { name: "Consecrated", icon: "🕊️", text: "Holy ground. On an enemy: it takes 30% more from Holy weapons. On you: your Holy weapons deal 30% more. Lasts its stacks in rounds (∞ = the whole fight)" },
  smoulder_soul: { name: "Smouldering Soul", icon: "♨️", text: "A fire you carry: you take 1 Burn each round, but every action you take deals 5 Burn to the enemy; lasts its stacks in rounds" }
};

/** Lightning (Shock, Static, electric reactions) deals double to Constructs (golems, sentries) and to Soaked targets. */
export const conductive = (f: Fighter) => f.family === "Construct" || st(f, "soaked") > 0;
/** Static caps at 10 (20 with the Rod of the Storm Choir or Stormheart). */
export const staticCap = (source: Fighter | null) =>
  source && (source.items["t_boundless_static"] ?? 0) > 0 ? Infinity
  : source && ((source.items["l_storm_rod"] ?? 0) > 0 || (source.items["lr_stormheart"] ?? 0) > 0) ? 20 : 10;

/** Static: each action its holder takes costs a stack and deals 2 (more against conductive targets). */
export function staticTick(b: Battle, f: Fighter) {
  const n = st(f, "static");
  if (n <= 0 || f.hp <= 0) return;
  f.statuses.static = n - 1;
  const foe = other(b, f);
  const extra = 2 * (foe.items["r_overcharged_cell"] ?? 0) + ((foe.items["ee_stormheart_pendant"] ?? 0) > 0 ? 2 : 0) + ((foe.items["cx_storm_skin"] ?? 0) > 0 ? 4 : 0);
  const dmg = (2 + extra) * (conductive(f) ? 2 : 1) * ((foe.items["lr_stormheart"] ?? 0) > 0 ? 3 : 1);
  const lost = loseHp(b, f, Math.round(dmg * dotMult(b, f)));
  log(b, `🔋 Static crackles through ${f.name} as it acts: ${lost}.`);
}

/** Smouldering Soul: every action its holder takes sends 5 Burn at the enemy. */
export function smoulderSoulAction(b: Battle, f: Fighter) {
  if (st(f, "smoulder_soul") <= 0 || f.hp <= 0) return;
  const foe = other(b, f);
  if (foe.hp > 0) applyStatus(b, f, foe, "burn", 5 + ((f.items["l_furnace_heart"] ?? 0) > 0 ? 3 : 0));
}

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
  { id: "clarity", name: "Clarity", a: "focus", b: "ward", text: "Your next roll lands on your die's highest face" },
  { id: "conduction", name: "Conduction", a: "static", b: "shock", text: "Every Static stack goes off at once: 3 damage each (double on Constructs or Soaked foes)" },
  { id: "electrocute", name: "Electrocute", a: "soaked", b: "shock", text: "Soaked clears; takes 4 + 2 per floor and is Stunned" },
  { id: "freeze", name: "Freeze", a: "soaked", b: "chill", text: "Both clear; Frozen solid: Stunned and Exposed 2" },
  { id: "thunderstrike", name: "Thunderstrike", a: "charged", b: "might", text: "Your next hit deals double and Shocks" }
] as const;
export type ReactionId = (typeof REACTIONS)[number]["id"];

/** Elemental statuses (for the Keepsake of the Elements). */
export const ELEMENTAL: StatusId[] = ["burn", "chill", "shock", "static", "soaked"];

/** Status thresholds: pile up enough and it bursts. */
export const THRESHOLDS = [
  { id: "frostbitten", name: "Frostbitten", icon: "🧊", status: "chill" as StatusId, at: 6, per: 3, text: "6+ Chill bursts: 3 damage per stack, and the Chill clears" },
  { id: "bledout", name: "Bled Out", icon: "🩸", status: "bleed" as StatusId, at: 10, per: 2, text: "10+ Bleed bursts: 2 damage per stack, and the Bleed clears" },
  { id: "shatter_fx", name: "Shattered", icon: "🪨", status: "fracture" as StatusId, at: 3, per: 4, text: "3+ Fracture shatters: 4 damage per stack, and the Fracture clears" },
  { id: "overdose", name: "Overdose", icon: "☠️", status: "poison" as StatusId, at: 12, per: 2, text: "12+ Poison bursts: 2 damage per stack, and the Poison clears" }
];

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
  if (amount > 0) f.flags["hurt"] = 1; // (Bounty Board: "win without losing HP")
  // Leaderboards: damage you deal over the whole run, and your single biggest hit.
  if (amount > 0 && f.id === "enemy") {
    const p = b.player.persist;
    p["t_dmg"] = (p["t_dmg"] ?? 0) + amount;
    if (amount > (p["t_best"] ?? 0)) p["t_best"] = amount;
  }
  if (amount > 0 && f.flags["penanceRound"] === b.round) f.flags["penanceStore"] = (f.flags["penanceStore"] ?? 0) + amount;
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
  // Saint's Last Breath: healing past Max HP becomes Barrier.
  if ((f.items["lr_saints_breath"] ?? 0) > 0 && amount > got) f.statuses.barrier = st(f, "barrier") + (amount - got);
  if (got > 0) {
    log(b, `${f.name} heals ${got}${why ? ` (${why})` : ""}.`);
    fx(b, { who: f.id, kind: "heal", value: got });
    // Robe of the Red Moon: every heal also hits the enemy.
    const foe = other(b, f);
    if ((f.items["c_red_moon"] ?? 0) > 0 && foe.hp > 0) {
      const lost = loseHp(b, foe, got);
      log(b, `🌕 The Red Moon turns ${got} healing into ${lost} damage.`);
    }
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
  // Angelic Blessing: no negative status can touch you.
  if (isNegative(id) && (target.persist["angelFights"] ?? 0) > 0) {
    log(b, `👼 The Angelic Blessing turns ${STATUS_INFO[id].name} aside.`);
    return;
  }
  if (isNegative(id) && st(target, "ward") > 0) {
    target.statuses.ward = st(target, "ward") - 1;
    log(b, `${target.name}'s Ward blocks ${STATUS_INFO[id].name}.`);
    fx(b, { who: target.id, kind: "block", text: "Warded", icon: "✨" });
    // Smite: the enemy's own spite, turned back. Your next Holy hit will Smite.
    if (source && source !== target) target.flags["smiteReady"] = 1;
    eachHook(target, "onWard", (h, s) => h(b, target, id, amount, s));
    return;
  }
  // Nullifying (a rare Elite/boss trait): the first positive status you'd gain each round fizzles.
  if (!isNegative(id) && (other(b, target).items["x_nullifying"] ?? 0) > 0 && target.flags["nulled"] !== b.round) {
    target.flags["nulled"] = b.round;
    log(b, `${other(b, target).name} nullifies ${target.name}'s ${STATUS_INFO[id].name}.`);
    fx(b, { who: target.id, kind: "block", text: `Nullified ${STATUS_INFO[id].name}`, icon: "🚫" });
    return;
  }
  if ((id === "shock" || id === "static") && st(target, "grounded") > 0) {
    log(b, `${target.name} is Grounded: the ${STATUS_INFO[id].name} goes to earth.`);
    fx(b, { who: target.id, kind: "block", text: "Grounded", icon: "🪨" });
    return;
  }
  eachHook(target, "incomingStatus", (h, s) => (amount = h(b, target, id, amount, s)));
  if (id === "burn" && st(target, "soaked") > 0) amount = Math.ceil(amount / 2);
  // Keepsake of the Elements: elemental statuses you apply are 50% stronger.
  if (source && source !== target && (source.items["ks_elements"] ?? 0) > 0 && ELEMENTAL.includes(id)) amount = Math.ceil(amount * 1.5);
  // Mana Potion: statuses your spells apply get +1.
  if (source && source !== target && source.flags["casting"] && source.flags["mana"]) amount += 1;
  if (amount <= 0) return;
  if (isNegative(id) && target.flags["penanceRound"] === b.round) target.flags["penanceStore"] = (target.flags["penanceStore"] ?? 0) + amount;

  const had = (x: StatusId) => st(target, x) > 0;
  if (SINGLE.includes(id)) target.statuses[id] = Math.max(st(target, id), 1);
  else if (id === "shock") target.statuses.shock = Math.max(st(target, "shock"), amount);
  else if (id === "static") target.statuses.static = Math.min(staticCap(source), st(target, "static") + amount);
  else if (id === "dazzled") target.statuses.dazzled = Math.min(4, Math.max(st(target, "dazzled"), amount));
  else if (id === "haste" && target !== b.player) target.statuses.haste = Math.min(ENEMY_HASTE_CAP, st(target, "haste") + amount);
  else if (id === "consecrated") target.statuses.consecrated = Math.max(st(target, "consecrated"), amount);
  else target.statuses[id] = st(target, id) + amount;
  // Bounty Board counters: statuses the hero lands on foes.
  if (source?.id === "player" && target.id === "enemy") source.persist[`q_st_${id}`] = (source.persist[`q_st_${id}`] ?? 0) + 1;
  log(b, `${target.name} gains ${STATUS_INFO[id].icon} ${STATUS_INFO[id].name}${SINGLE.includes(id) || id === "shock" ? "" : ` ${amount}`}.`);
  fx(b, { who: target.id, kind: "status", icon: STATUS_INFO[id].icon, text: `${STATUS_INFO[id].name}${SINGLE.includes(id) || id === "shock" ? "" : ` +${amount}`}`, value: isNegative(id) ? -1 : 1, status: id, src: source?.id });

  // Thresholds: some statuses burst when they pile up too high.
  for (const t of THRESHOLDS) {
    if (id !== t.status || st(target, t.status) < t.at) continue;
    const n = st(target, t.status);
    target.statuses[t.status] = 0;
    fx(b, { who: target.id, kind: "reaction", text: `${t.name}!`, status: t.status, src: source?.id });
    const lost = loseHp(b, target, Math.round(n * t.per * reactionMult(b, source)));
    log(b, `${t.icon} ${t.name}! ${n} ${STATUS_INFO[t.status].name} bursts: ${target.name} takes ${lost}.`);
    const key = `rx:${target.id === "player" ? "you" : "foe"}:${t.id}`;
    b.player.persist[key] = (b.player.persist[key] ?? 0) + 1;
    if (target.hp <= 0) return;
  }

  if (depth === 0) {
    for (const r of REACTIONS) {
      const partner = r.a === id ? r.b : r.b === id ? r.a : null;
      if (partner && had(partner as StatusId)) react(b, source, target, r.id, depth);
      if (target.hp <= 0) break;
    }
  }
  if (source) eachHook(source, "onStatusApplied", (h, s) => h(b, source, target, id, amount, s));
  if (target.hp > 0) eachHook(target, "onStatusReceived", (h, s) => h(b, target, source, id, amount, s));
}

/** Reactions that hurt whoever has them: the ones a "random extra reaction" may pick. */
const HARMFUL_REACTIONS: ReactionId[] = ["combustion", "steam", "shatter", "rupture", "sepsis", "overload", "despair", "conduction", "electrocute", "freeze"];

function react(b: Battle, source: Fighter | null, t: Fighter, id: ReactionId, depth: number) {
  const rx = REACTIONS.find(r => r.id === id)!;
  if (source?.id === "player") source.persist["q_reactions"] = (source.persist["q_reactions"] ?? 0) + 1;
  const name = rx.name;
  fx(b, { who: t.id, kind: "reaction", text: `${name}!`, status: `rx:${id}`, src: source?.id });
  // Run-long record (shown in the bag): which reactions happened on you, and on your enemies.
  const key = `rx:${t.id === "player" ? "you" : "foe"}:${id}`;
  b.player.persist[key] = (b.player.persist[key] ?? 0) + 1;
  // The Red Litany: the first reaction you cause each round gives you Haste.
  if (source && source !== t && (source.items["c_red_litany"] ?? 0) > 0 && source.flags["litany"] !== b.round) {
    source.flags["litany"] = b.round;
    applyStatus(b, source, source, "haste", 1, depth + 1);
  }
  if (source && source !== t && (source.items["l_ouroboros"] ?? 0) > 0) heal(b, source, 5, "Ouroboros");
  if (source && source !== t && (source.items["dr_echo_charm"] ?? 0) > 0) heal(b, source, 3, "Echoing Charm");
  if (source && source !== t && (source.items["l_codex_ruin"] ?? 0) > 0) applyStatus(b, source, t, "doom", 3, depth + 1);

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
    case "conduction": {
      const n = st(t, "static");
      t.statuses.static = 0;
      let mult = 1 + 0.5 * (source?.items["t_conductor"] ?? 0);
      if (conductive(t)) mult *= 2;
      const lost = loseHp(b, t, Math.round(3 * n * m * mult));
      log(b, `⚡🔋 ${name}! ${n} Static goes off at once: ${t.name} takes ${lost}.`);
      // Heart of the Thunderhead: a bolt for every 2 Static set off.
      if (source && source !== t && (source.items["l_thunderhead"] ?? 0) > 0) {
        for (let i = 0; i < Math.floor(n / 2) && t.hp > 0; i++) {
          const bolt = loseHp(b, t, 4 * (conductive(t) ? 2 : 1));
          log(b, `🌩️ A bolt from the Thunderhead: ${bolt}.`);
        }
      }
      break;
    }
    case "electrocute": {
      t.statuses.soaked = 0;
      const dmg = Math.round((4 + 2 * (b.player.persist["floor"] ?? 1)) * m * (t.family === "Construct" ? 2 : 1));
      const lost = loseHp(b, t, dmg);
      log(b, `⚡💧 ${name}! ${t.name} takes ${lost}.`);
      applyStatus(b, source, t, "stun", 1, depth + 1);
      break;
    }
    case "freeze":
      t.statuses.soaked = 0;
      t.statuses.chill = 0;
      log(b, `🧊 ${name}! ${t.name} is frozen solid.`);
      applyStatus(b, source, t, "stun", 1, depth + 1);
      applyStatus(b, source, t, "exposed", Math.round(2 * m), depth + 1);
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
  // Eye of Ruin: a second, random reaction on the enemy.
  if (depth === 0 && source && source !== t && (source.items["c_eye_of_ruin"] ?? 0) > 0 && t.hp > 0) {
    const pool = HARMFUL_REACTIONS.filter(x => x !== id);
    const extra = pool[Math.floor(b.rng() * pool.length)];
    log(b, "👁️ The Eye of Ruin opens.");
    react(b, source, t, extra, depth + 1);
  }
  // Philosopher's Stone: the ingredients come back, ready to react again next time.
  if (source && source !== t && (source.items["lr_philosophers_stone"] ?? 0) > 0) {
    const r = REACTIONS.find(x => x.id === id)!;
    applyStatus(b, source, t, r.a as StatusId, 3, depth + 1);
    applyStatus(b, source, t, r.b as StatusId, 3, depth + 1);
  }
}

/** Status damage on `f` is boosted by its foe's Status damage (robes and the like). */
export function dotMult(b: Battle, f: Fighter) {
  return 1 + (other(b, f).dotAmp ?? 0) / 100;
}

/** Consecrated for the whole fight (it never wears off). */
export const CONSECRATE_FIGHT = 99;

/** Burn ticks at the start of the holder's turn. */
export function startOfTurn(b: Battle, f: Fighter) {
  const burn = st(f, "burn");
  if (burn > 0) {
    const lost = loseHp(b, f, Math.round(burn * dotMult(b, f)));
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
      const lost = loseHp(b, f, Math.round(bleed * dotMult(b, f)));
      log(b, `🩸 ${f.name} bleeds for ${lost}.`);
      if (f.flags["sepsis"]) f.statuses.poison = st(f, "poison") + 1;
    }
    if (!f.flags["bleedNoFade"]) f.statuses.bleed = bleed - 1;
  }
  const poison = st(f, "poison");
  if (poison > 0) {
    const lost = loseHp(b, f, Math.round(poison * dotMult(b, f)));
    log(b, `☠️ ${f.name} takes ${lost} from Poison.`);
  }
  const regen = st(f, "regen");
  if (regen > 0) {
    heal(b, f, regen, "Regen");
    if (f.flags["bastion"]) f.statuses.barrier = Math.min(st(f, "barrier") + regen, 4 + 4 * (f.persist["floor"] ?? 1));
    f.statuses.regen = regen - 1;
  }
  // Smouldering (a curse of fire): the holder burns hard, and splashes a little onto its foe.
  const sm = st(f, "smoulder");
  if (sm > 0 && f.hp > 0) {
    applyStatus(b, opp, f, "burn", f.id === "player" ? 5 : 4 + (opp.items["r_coal_bellows"] ?? 0) * 2);
    if (opp.hp > 0) applyStatus(b, f, opp, "burn", 1);
    f.statuses.smoulder = sm - 1;
  }
  // Smouldering Soul (a fire you chose): it costs you 1 Burn a round.
  const soul = st(f, "smoulder_soul");
  if (soul > 0 && f.hp > 0) {
    if ((f.items["l_furnace_heart"] ?? 0) === 0) applyStatus(b, null, f, "burn", 1);
    else f.statuses.smoulder_soul = soul + 1; // the Furnace Heart never lets it go out
    f.statuses.smoulder_soul = st(f, "smoulder_soul") - 1;
  }
  // Barrier is a shield of the moment, not a wall: half of it fades at the end of every round
  // (Hollow Crown and Bastion of Ages keep theirs). Guarding is how you hold the line.
  const bar = st(f, "barrier");
  if (bar > 0 && !f.persist["keepBarrier"]) f.statuses.barrier = Math.floor(bar / 2);
  // Consecrated wears off a round at a time, unless it lasts the whole fight.
  if (st(f, "consecrated") > 0 && st(f, "consecrated") < CONSECRATE_FIGHT) f.statuses.consecrated = st(f, "consecrated") - 1;
  for (const s of ["spikes", "chill", "weak", "exposed", "blind", "soaked", "kindled", "grounded", "dazzled"] as StatusId[]) {
    if (s === "spikes" && (f.items["lr_crown_thorns"] ?? 0) > 0) continue;
    if (s === "chill" && f.flags["chillNoFade"]) continue;
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
