// Combat: your weapon is your die. Roll it, read the face, fire every effect on that face, then deal damage.
import { eachHook, fx, getItem, log, stacksOf } from "./registry";
import { makeRng, rollDie } from "./rng";

/** Dodge is capped at 60%; Bash at 30%. */
export const DODGE_CAP = 60;
/** Counter (Rogue): extra Dodge this round. Penance (Cleric): what you suffered comes back this much. */
export const COUNTER_DODGE = 35;
/** Class abilities cost mana; every class starts each fight with this much. */
export const MANA_COST = 1;
export const MANA_MAX = 2;
export const SKILLS = ["counter", "barrier", "penance", "warcry", "crush", "shieldwall", "envenom", "smokebomb", "frostnova", "arcanebolt", "smite", "sanctuary",
  // The path skills (chosen at level 5).
  "bastion", "shieldslam", "rampage", "bloodlust", "feint", "flurry", "ambush", "toxicburst", "cataclysm", "prismbolt", "manalance", "arcaneaegis", "atonement", "martyrdom", "consecrate", "judgment"] as const;
export const PENANCE_RETURN = 1.5;
export const BASH_CAP = 30;
import { applyStatus, conductive, endOfRound, heal, loseHp, other, statusLoss, smoulderSoulAction, st, startOfTurn, staticTick } from "./statuses";
import { INT_MANA_PER } from "../data/attributes";
import type { AttackCtx, Battle, FaceGroup, FaceKind, FaceSpec, Fighter, StatusId, Statuses } from "./types";
import { NEGATIVE_STATUSES } from "./types";

export const KIND_MULT: Record<FaceKind, number> = { miss: 0, graze: 0.5, hit: 1, crit: 2 };
export const KIND_NAME: Record<FaceKind, string> = { miss: "Miss", graze: "Graze", hit: "Hit", crit: "Crit" };

/** The plain die: 1 Graze, 2–5 Hit, 6 Crit. */
export const PLAIN_FACES: FaceSpec[] = [{ kind: "graze" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "hit" }, { kind: "crit" }];

export function faceMatches(g: FaceGroup, face: number): boolean {
  if (typeof g === "number") return g === face;
  switch (g) {
    case "any": return true;
    case "low": return face <= 2;
    case "mid": return face === 3 || face === 4;
    case "high": return face >= 5;
    case "odd": return face % 2 === 1;
    case "even": return face % 2 === 0;
  }
}

export const faceName = (s: FaceSpec) => s.name ?? KIND_NAME[s.kind];

export function damageOf(f: Fighter, offhand = false): number {
  // Might: +1 Damage per stack (some gear makes each stack count for more).
  return (offhand ? f.offDamage ?? 0 : f.damage) + Math.round(st(f, "might") * (1 + (f.flags["mightPlus"] ?? 0)));
}

/** Holding a Holy weapon (either hand) or a Holy Legendary/Crimson weapon. */
export function wieldsHoly(f: Fighter): boolean {
  for (const id of Object.keys(f.items)) {
    try {
      const d = getItem(id);
      if (d.kind === "weapon" && d.tags.includes("Holy")) return true;
    } catch { /* not a registered def */ }
  }
  return false;
}

/** Holding a weapon with this tag. */
export function wieldsTag(f: Fighter, tag: string): boolean {
  for (const id of Object.keys(f.items)) {
    try {
      const d = getItem(id);
      if (d.kind === "weapon" && (d.tags as string[]).includes(tag)) return true;
    } catch { /* not a registered def */ }
  }
  return false;
}

/** Moves and faces that curse you or Doom you: whoever uses them is Unholy too. */
const DARK_MOVES = ["Malediction", "Doombringer", "Reap", "Withering Breath"];
const DARK_FACES = ["Collect", "Hollow Decree"];
const DARK_TRAITS = ["x_accursed", "m_death", "m_parching", "x_parching"];
/** Undead, vampires, Crimson things, and anything that curses or Dooms: Holy weapons deal +50% to them. */
export const isUnholy = (f: Fighter) =>
  f.family === "Undead" || !!f.crimson || (f.items["x_vampiric"] ?? 0) > 0 || (f.items["m_lifedrink"] ?? 0) > 0 ||
  DARK_TRAITS.some(t => (f.items[t] ?? 0) > 0) ||
  !!f.moves?.some(m => DARK_MOVES.includes(m.name)) ||
  !!f.faces?.some(x => !!x.name && DARK_FACES.includes(x.name));

/** How many times Smite can land per fight, and how hard (fraction of the enemy's Max HP). */
const smiteLimit = (a: Fighter) => (stacksOf(a, "l_dawnbringer") > 0 ? 99 : 1 + stacksOf(a, "r_halo_retribution"));
const smitePct = (a: Fighter) => (stacksOf(a, "r_halo_retribution") > 0 ? 0.18 : 0.12);
/** Holy weapons against Unholy foes (Undead, vampires, Crimson things, cursers): a real edge, not a wipe. */
export const HOLY_VS_UNHOLY = 1.15;
/** Rare foe weaknesses: some take more from blunt, sharp or two-handed weapons, or from spells. */
export const WEAKNESS_MULT = 1.35;
export function weaknessMult(a: Fighter, d: Fighter, ctx: AttackCtx): number {
  if (a.id !== "player") return 1;
  const kind = ctx.offhand ? a.arms?.off : a.arms?.main;
  let m = 1;
  if ((d.items["x_wk_blunt"] ?? 0) > 0 && kind === "blunt") m *= WEAKNESS_MULT;
  if ((d.items["x_wk_sharp"] ?? 0) > 0 && kind === "sharp") m *= WEAKNESS_MULT;
  if ((d.items["x_wk_twohand"] ?? 0) > 0 && !ctx.offhand && a.arms?.twoHanded) m *= WEAKNESS_MULT;
  if ((d.items["x_wk_spell"] ?? 0) > 0 && (ctx.spec.magic || ctx.spec.run)) m *= WEAKNESS_MULT;
  return m;
}

function trySmite(b: Battle, a: Fighter, d: Fighter) {
  if (!a.flags["smiteReady"] || d.hp <= 0 || !wieldsHoly(a) || (a.flags["smites"] ?? 0) >= smiteLimit(a)) return;
  a.flags["smiteReady"] = 0;
  a.flags["smites"] = (a.flags["smites"] ?? 0) + 1;
  const n = Math.ceil(d.maxHp * smitePct(a));
  fx(b, { who: d.id, kind: "reaction", text: "Smite!", status: "consecrated", src: d.id === "player" ? "enemy" : "player" });
  const lost = statusLoss(b, d, n);
  log(b, `⚡✝️ SMITE! Your Ward turned their spite into judgement: ${d.name} takes ${lost}.`);
  if (a.id === "player") a.persist["rx:foe:smite"] = (a.persist["rx:foe:smite"] ?? 0) + 1;
}

/** Purify: strip every negative status from the enemy; each one removed deals 2× your Damage (ignores Armor). */
function purify(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  const removed = (NEGATIVE_STATUSES as readonly StatusId[]).filter(s => st(d, s) > 0);
  for (const s of removed) d.statuses[s] = 0;
  const perStatus = (stacksOf(a, "l_font_absolution") > 0 ? 2 : 1.4) * (damageOf(a, ctx.offhand) + ctx.bonus) + [0, 1, 2, 3][Math.min(3, stacksOf(a, "t_absolution"))];
  let raw = perStatus * removed.length * ctx.mult;
  if (st(a, "weak") > 0) raw *= 0.75;
  if (wieldsHoly(a) && isUnholy(d)) raw *= HOLY_VS_UNHOLY;
  raw = Math.max(0, Math.round(raw));
  ctx.raw = raw;
  if (!removed.length) {
    log(b, `${a.name} Purifies, but ${d.name} carries no sin to burn away.`);
    fx(b, { who: d.id, kind: "miss", text: "Nothing to purify" });
    return afterStrike(b, ctx);
  }
  if (st(d, "evade") > 0) {
    d.statuses.evade = st(d, "evade") - 1;
    log(b, `${d.name} evades the Purify.`);
    fx(b, { who: d.id, kind: "miss", text: "Evaded" });
    return afterStrike(b, ctx);
  }
  fx(b, { who: d.id, kind: "text", text: `Purify ×${removed.length}`, icon: "✨" });
  ctx.dealt = loseHp(b, d, raw);
  log(b, `✨ ${a.name} Purifies ${removed.length} status${removed.length === 1 ? "" : "es"} from ${d.name} for ${ctx.dealt}.`);
  const healPer = (stacksOf(a, "l_font_absolution") > 0 ? 2 : 0) + (stacksOf(a, "t_sin_eater") > 0 ? 2 : 0);
  if (healPer) heal(b, a, healPer * removed.length, "Purify");
  if (stacksOf(a, "t_absolution") >= 2) {
    const mine = (NEGATIVE_STATUSES as readonly StatusId[]).find(s => st(a, s) > 0);
    if (mine) { a.statuses[mine] = 0; log(b, `Absolution lifts your ${mine}.`); }
  }
  if (ctx.dealt > 0) {
    trySmite(b, a, d);
    eachHook(a, "onHit", (h, s) => h(b, ctx, s));
    if (ctx.kind === "crit") eachHook(a, "onCrit", (h, s) => h(b, ctx, s));
  }
  afterStrike(b, ctx);
}

/**
 * How much of a hit Armor stops: 0.9 × Armor / (Armor + 10). No hard cap, but each extra point is worth a little less:
 * 3 Armor stops 21%, 10 stops 45%, 20 stops 60%, 30 stops 68%, 60 stops 77%. Guarding doubles your Armor.
 */
export const ARMOR_EFFICIENCY = 0.9;
/** A Guard: Armor doubled, plus this much. */
export const GUARD_FLAT = 2;
/** Riposte: the attack after a Guard deals this much more. */
export const RIPOSTE = 0.25;
export function armorReduction(armor: number, _guarding = false): number {
  if (armor <= 0) return 0;
  return ARMOR_EFFICIENCY * armor / (armor + 10);
}

/**
 * Hit streak (lasts the whole run): every Hit or Crit that gets through adds 1; a Miss, Graze,
 * or an attack that's evaded, dodged or fully blocked resets it. Streak gear reads it.
 */
export function streakOf(f: Fighter): number {
  return f.persist["streak"] ?? 0;
}
function breakStreak(b: Battle, a: Fighter) {
  if (a.id !== "player") return;
  const n = streakOf(a);
  // Hourglass of Momentum / The Unending Tally: a broken streak only drops to half.
  const keepHalf = stacksOf(a, "lx_hourglass") > 0 || stacksOf(a, "cx_unending_tally") > 0;
  const left = keepHalf ? Math.floor(n / 2) : 0;
  if (n >= 3) log(b, `🔗 Streak broken at ${n}${left ? `, holds at ${left}` : ""}.`);
  a.persist["streak"] = left;
}
/** Items, relics and talents that use the hit streak. Without one of them, there is no streak. */
export const STREAK_IDS = ["r_unbroken_chain", "t_relentless", "t_tally_beads", "sk_rapier", "sk_chainblade", "sk_metronome", "lx_hourglass", "sk_fencer_jacket", "sk_rhythm_plate", "sk_rosary", "cx_unending_tally"];
export const hasStreak = (f: Fighter) => STREAK_IDS.some(id => stacksOf(f, id) > 0 || stacksOf(f, `fx_${id}`) > 0);
function addStreak(a: Fighter) {
  if (a.id !== "player") return;
  if (!hasStreak(a)) { a.persist["streak"] = 0; return; }
  a.persist["streak"] = streakOf(a) + 1;
  a.persist["bestStreak"] = Math.max(a.persist["bestStreak"] ?? 0, a.persist["streak"]);
}

/** Dragon's Blessings: 1–3 hit Elites / Champions / bosses 30% harder; 4–6 take 30% less from bosses / Champions / Elites. */
export const BLESSINGS = [
  "",
  "You deal 30% more damage to Elites",
  "You deal 30% more damage to Champions",
  "You deal 30% more damage to bosses",
  "Bosses deal 30% less damage to you",
  "Champions deal 30% less damage to you",
  "Elites deal 30% less damage to you"
];
const rankOf = (f: Fighter) => (f.boss ? "boss" : f.champion ? "champion" : f.elite ? "elite" : "");
export function blessingMult(a: Fighter, d: Fighter): number {
  const mine = a.id === "player" ? a : d;
  const foe = a.id === "player" ? d : a;
  const k = mine.persist["blessKind"] ?? 0;
  if (!k || (mine.persist["blessFights"] ?? 0) <= 0) return 1;
  const r = rankOf(foe);
  if (a === mine) return (k === 1 && r === "elite") || (k === 2 && r === "champion") || (k === 3 && r === "boss") ? 1.3 : 1;
  return (k === 4 && r === "boss") || (k === 5 && r === "champion") || (k === 6 && r === "elite") ? 0.7 : 1;
}

/** Heavy weapons build Stagger; when it fills, the foe is Staggered (loses its next action, next hit ×2). */
export function buildStagger(b: Battle, a: Fighter, d: Fighter, crit: boolean) {
  if ((d.flags["staggerImmune"] ?? 0) >= b.round) return;
  let n = crit ? 2 : 1;
  n += stacksOf(a, "bk_anvil_pendant");
  if (crit) n += stacksOf(a, "bk_breaker_harness") + Math.min(3, stacksOf(a, "t_crushing_blows"));
  const need = Math.max(1, (d.boss ? 5 : d.elite || d.champion ? 4 : 3) - stacksOf(a, "r_unstoppable") - 2 * stacksOf(a, "lx_mountainbreaker"));
  const now = st(d, "stagger") + n;
  if (now < need) { d.statuses.stagger = now; return; }
  d.statuses.stagger = 0;
  d.statuses.broken = 1;
  d.statuses.stun = Math.max(st(d, "stun"), 1);
  d.flags["staggerImmune"] = b.round + 2;
  log(b, `🔨 ${d.name} is STAGGERED!`);
  fx(b, { who: d.id, kind: "reaction", text: "STAGGERED!", status: "stagger", src: d.id === "player" ? "enemy" : "player" });
  eachHook(a, "onStagger", (h, s) => h(b, a, d, s));
}

/** An enemy raises its guard for this round: Armor doubled plus `extra`. Crits, spells and statuses still get through. */
export function enemyGuard(b: Battle, e: Fighter, extra: number) {
  e.flags["guarding"] = 1;
  e.flags["guardArmor"] = extra;
  log(b, `🧱 ${e.name} raises its guard (Armor ${armorOf(e)}).`);
  fx(b, { who: e.id, kind: "text", text: "Guarding", icon: "🧱" });
}

export function armorOf(f: Fighter): number {
  let a = f.armor;
  // Guarding doubles Armor (Fortress Heart: triples); "+Armor while Guarding" effects add on top.
  if (f.flags["guarding"]) a = a * (stacksOf(f, "r_fortress_heart") > 0 ? 3 : 2) + (f.flags["guardArmor"] ?? 0);
  // The Abyss wears the hero's Armor down the deeper you go.
  // Titan's Plate: every 3 Might is 1 more Armor.
  if (f.flags["titan"]) a += Math.floor(st(f, "might") / 3);
  // Crushed (Fracture + Weak): half its Armor is gone for the rest of the fight.
  if (f.flags["crushed"]) a = Math.floor(a / 2);
  const decay = f.id === "player" ? f.persist["armorDecay"] ?? 0 : 0;
  if (decay > 0) a = Math.floor(a * (1 - decay / 100));
  return Math.max(0, a);
}

/** Roll a die for a fighter, with Focus, Chill and roll-changing items. */
export function rollFor(b: Battle, f: Fighter, sides: number): number {
  let r = rollDie(b.rng, sides);
  if (st(f, "focus") > 0) {
    r = Math.max(r, rollDie(b.rng, sides));
    f.statuses.focus = 0;
  }
  if (f.flags["clarity"]) {
    r = sides;
    f.flags["clarity"] = 0;
  }
  if (st(f, "chill") > 0 && r > 1) r -= 1;
  eachHook(f, "modifyRoll", (h, s) => (r = h(b, f, r, s)));
  // Roll caps (heavy weapons, shackles): this die can't roll above the cap.
  if (f.flags["rollCap"]) r = Math.min(r, f.flags["rollCap"]);
  r = Math.max(1, Math.min(sides, r));
  // Snake Eyes: the hero's 1s are counted over the run (some Legendaries only turn up after enough of them).
  if (r === 1 && sides === 6 && f === b.player) {
    f.persist["onesRolled"] = (f.persist["onesRolled"] ?? 0) + 1;
    eachHook(f, "onRollOne", (h, s) => h(b, f, s));
  }
  return r;
}

/** The Counter: the moment the blow misses, you strike back, and it's a Crit (your die's crit face, no roll). */
function counterStrike(b: Battle, d: Fighter, a: Fighter) {
  log(b, `${d.name} counters!`);
  fx(b, { who: d.id, kind: "text", text: "Counter!", icon: "🗡️" });
  d.flags["counterHit"] = 1;
  // Your main hand's crit face, no roll needed.
  const faces = d.faces ?? PLAIN_FACES;
  const critFace = faces.map(x => x.kind).lastIndexOf("crit") + 1 || faces.length;
  const hpBefore = a.hp;
  resolveFace(b, d, a, critFace, false);
  if (a.hp < hpBefore) { fx(b, { who: a.id, kind: "reaction", text: `Counter Crit! −${hpBefore - Math.max(0, a.hp)}`, src: d.id }); eachHook(d, "onSkill", (h, s) => h(b, d, "counter_hit", s)); }
  d.flags["counterHit"] = 0;
  // Quickstep Anklet: a Counter that lands is followed by a normal attack.
  if (d.flags["counterFollow"] && a.hp < hpBefore && a.hp > 0 && d.hp > 0) {
    log(b, `${d.name} follows the Counter with an attack.`);
    attack(b, d, a);
  }
}

/** Ambush: before you can act, the foe strikes (the game plays this the moment the fight opens). */
export function ambushPending(b: Battle) { return b.round === 0 && !b.over && !!b.enemy.flags["ambush"] && !b.enemy.flags["ambushDone"]; }
export function ambushStrike(b: Battle) {
  if (!ambushPending(b)) return;
  b.enemy.flags["ambushDone"] = 1;
  log(b, `${b.enemy.name} strikes first!`);
  fx(b, { who: "enemy", kind: "text", text: "Ambush!" });
  enemyPhase(b);
}

/** One attack with the main die (or the off-hand die). */
export function attack(b: Battle, a: Fighter, d: Fighter, offhand = false) {
  const faces = (offhand ? a.offFaces : a.faces) ?? PLAIN_FACES;
  const face = rollFor(b, a, faces.length);
  resolveFace(b, a, d, face, offhand);
}

export function resolveFace(b: Battle, a: Fighter, d: Fighter, face: number, offhand = false) {
  a.flags["tsNow"] = 0; // True Strike, once spent on this attack, covers all of it
  const prev = b.rollFrom;
  b.rollFrom = a.id;
  try { resolveRolledFace(b, a, d, face, offhand); } finally { b.rollFrom = prev; }
}

function resolveRolledFace(b: Battle, a: Fighter, d: Fighter, face: number, offhand: boolean) {
  const faces = (offhand ? a.offFaces : a.faces) ?? PLAIN_FACES;
  const spec = faces[Math.min(face, faces.length) - 1];
  log(b, `${a.name} rolls ${face}${offhand ? " (off-hand)" : ""}: ${faceName(spec)}.`);
  fx(b, { who: a.id, kind: "roll", face, faceName: faceName(spec), faceKind: spec.kind, sides: faces.length, offhand });
  // Achievements: misses and crits in a row (your main die).
  if (a.id === "player" && !offhand) {
    const p = a.persist;
    p["streakMiss"] = spec.kind === "miss" ? (p["streakMiss"] ?? 0) + 1 : 0;
    p["streakCrit"] = spec.kind === "crit" ? (p["streakCrit"] ?? 0) + 1 : 0;
    p["bestMissStreak"] = Math.max(p["bestMissStreak"] ?? 0, p["streakMiss"]);
    p["bestCritStreak"] = Math.max(p["bestCritStreak"] ?? 0, p["streakCrit"]);
  }
  if (st(a, "dazzled") > 0 && !a.flags["counterHit"] && !useTrueStrike(a)) {
    log(b, `${a.name} is Dazzled and misses.`);
    fx(b, { who: d.id, kind: "miss", text: "Dazzled — miss" });
    breakStreak(b, a);
    return;
  }
  if (st(a, "blind") > 0 && face <= 2 && !useTrueStrike(a)) {
    log(b, `${a.name} is Blind and misses.`);
    fx(b, { who: d.id, kind: "miss", text: "Blind — miss" });
    breakStreak(b, a);
    return;
  }
  const ctx: AttackCtx = {
    attacker: a, defender: d, face, spec, kind: spec.kind, mult: KIND_MULT[spec.kind],
    ignoreArmor: spec.kind === "crit" || !!spec.magic, bonus: 0, noDamage: spec.kind === "miss", offhand, dealt: 0
  };
  // Crit chance (gear, relics): a Hit may turn into a Crit.
  if (ctx.kind === "hit" && (a.critChance ?? 0) > 0 && b.rng() * 100 < Math.min(50, a.critChance ?? 0)) {
    ctx.kind = "crit";
    ctx.mult = 2;
    ctx.ignoreArmor = true;
  }
  // A Counter strike always lands: misses and grazes become hits.
  if (a.flags["counterHit"] && (ctx.kind === "miss" || ctx.kind === "graze")) {
    ctx.kind = "hit";
    ctx.mult = 1;
    ctx.noDamage = false;
  }
  if (spec.kind === "hit" && face === 5 && a.flags["frenzy"]) {
    ctx.kind = "crit";
    ctx.mult = 2;
    ctx.ignoreArmor = true;
  }
  // Echo Mask: every face effect fires twice.
  const times = stacksOf(a, "l_echo_mask") > 0 ? 2 : 1;
  for (let t = 0; t < times; t++) {
    if (spec.run) {
      a.flags["casting"] = 1;
      spec.run(b, ctx);
      a.flags["casting"] = 0;
    }
    eachHook(a, "face", (entries, s) => {
      for (const e of entries) if (faceMatches(e.group, face)) e.run(b, ctx, s);
    });
  }
  // Passive damage bonuses (class passives, relics, trinkets...) only count on a real Hit or Crit.
  // Anything that turns a Graze into a Hit or Crit (Counter, gear, relics) still lets them through,
  // because we check the final result after every hook has run.
  const bonusBefore = ctx.bonus;
  eachHook(a, "modifyAttack", (h, s) => h(b, ctx, s));
  if (ctx.kind === "graze" || ctx.kind === "miss") ctx.bonus = bonusBefore;
  strike(b, ctx);
}

function strike(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  if (ctx.noDamage || d.hp <= 0) {
    if (ctx.kind === "miss") {
      log(b, `${a.name} misses.`);
      fx(b, { who: d.id, kind: "miss", text: "Miss" });
      breakStreak(b, a);
    }
    return afterStrike(b, ctx);
  }
  if (ctx.spec.cleanse) return purify(b, ctx);
  let raw = (damageOf(a, ctx.offhand) + ctx.bonus) * ctx.mult;
  if (st(a, "weak") > 0) raw *= 0.75;
  if (wieldsHoly(a) && isUnholy(d)) raw *= HOLY_VS_UNHOLY;
  raw *= weaknessMult(a, d, ctx);
  // Consecrated: Holy weapons hit 30% harder against a Consecrated foe, and 30% harder while you're Consecrated.
  if (wieldsHoly(a)) {
    if (st(d, "consecrated") > 0) raw *= 1.2;
    if (st(a, "consecrated") > 0) raw *= 1.2;
  }
  if (st(d, "exposed") > 0) raw += 2;
  // Overpower (reaction): you have Might and the enemy is Weak — +2 per Might, and it shakes off 1 Weak.
  if (st(a, "might") > 0 && st(d, "weak") > 0 && raw > 0) {
    const extra = 2 * st(a, "might");
    raw += extra;
    d.statuses.weak = st(d, "weak") - 1;
    log(b, `💥 Overpower! +${extra}.`);
    fx(b, { who: d.id, kind: "reaction", text: "Overpower!", status: "might", src: d.id === "player" ? "enemy" : "player" });
    const key = `rx:${d.id === "player" ? "you" : "foe"}:overpower`;
    b.player.persist[key] = (b.player.persist[key] ?? 0) + 1;
  }
  // Staggered: the foe is reeling, so this hit lands double (Breaker's Seal and Exploit the Opening add more).
  if (st(d, "broken") > 0 && raw > 0) {
    const m = 2 + 0.5 * stacksOf(a, "bk_breaker_seal") + 0.25 * stacksOf(a, "t_exploit_opening");
    raw *= m;
    d.statuses.broken = 0;
    log(b, `💥 ${d.name} is Staggered: ×${m}!`);
  }
  // Alchemist's Tonic of Might: +4 on your next 3 attacks.
  if (!ctx.offhand && (a.flags["tonicMight"] ?? 0) > 0 && raw > 0) { raw += 4; a.flags["tonicMight"]--; }
  // Dragon's Blessing (lasts 5 fights): more damage to one kind of foe, or less damage from one.
  raw *= blessingMult(a, d);
  // Reinforced: a full block earlier pays off on your next attack (+2 per stack), then it's spent.
  if (!ctx.offhand && st(a, "reinforced") > 0) {
    const n = st(a, "reinforced");
    raw += 2 * n;
    a.statuses.reinforced = 0;
    log(b, `🧱 Reinforced: +${2 * n}.`);
  }
  // Lightning: Storm weapons hit Constructs 30% harder.
  if (d.family === "Construct" && wieldsTag(a, "Storm")) raw *= 1.3;
  // Charged: +2 per stack on this hit (spent when it lands).
  const charged = st(a, "charged");
  if (charged > 0) raw += 2 * charged * ctx.mult;
  // Thunderstrike: the next hit deals double and Shocks.
  const thunder = !!a.flags["thunderstrike"];
  if (thunder) raw *= 2;
  if (st(d, "shock") > 0) {
    // Shock conducts: double instead of +50% against Constructs and Soaked foes.
    raw *= conductive(d) ? 2 : 1.5;
    if (!stacksOf(a, "lr_eye_storm")) d.statuses.shock = st(d, "shock") - 1;
  }
  // Spell Amp (gear): spells deal more.
  if (ctx.spec.magic && (a.spellAmp ?? 0) > 0) raw *= 1 + (a.spellAmp ?? 0) / 100;
  // Keepsake of the Deadeye: crits deal 50% more.
  if (ctx.kind === "crit" && stacksOf(a, "ks_deadeye") > 0) raw *= 1.5;
  // Crit damage (gear): Crits hit this much harder.
  if (ctx.kind === "crit" && (a.critDmg ?? 0) !== 0) raw *= Math.max(0.5, 1 + (a.critDmg ?? 0) / 100);
  // A failed Counter leaves you off-balance for one attack (a little).
  if (a.flags["frail"]) { raw *= 0.85; a.flags["frail"] = 0; }
  // Riposte: the first attack after you Guard deals 25% more.
  if (a.id === "player" && a.flags["riposte"]) { raw *= 1 + RIPOSTE; a.flags["riposte"] = 0; }
  // Kneeling in Penance, you take the blows a little easier (some gear: much easier).
  if (d.flags["penanceRound"] === b.round) raw *= d.flags["penanceGuard"] ? 0.6 : 0.75;
  // Class gear: a Counter strike that hits harder; a "next hit" bonus waiting after an ability.
  if (a.flags["counterHit"] && a.flags["counterCritPct"]) raw *= 1 + a.flags["counterCritPct"] / 100;
  if (!ctx.offhand && a.flags["nextHitBonus"]) { raw += a.flags["nextHitBonus"] * ctx.mult; a.flags["nextHitBonus"] = 0; }
  if (!ctx.offhand && a.flags["nextHitMult"]) { raw *= 1 + a.flags["nextHitMult"] / 100; a.flags["nextHitMult"] = 0; }
  // Bash (main weapon only): Stun and +50%.
  let bashed = false;
  // Bash chance: gear, plus Might for some builds (mightBash: % per stack); a few pieces raise the cap.
  const bashChance = (a.bash ?? 0) + (a.flags["mightBash"] ? st(a, "might") * a.flags["mightBash"] : 0);
  if (!ctx.offhand && bashChance > 0 && (ctx.kind === "hit" || ctx.kind === "crit") && b.rng() * 100 < Math.min(BASH_CAP + (a.flags["bashCap"] ?? 0), bashChance)) {
    raw *= 1.5;
    bashed = true;
  }
  // Penance: everything you suffered comes back in one blow.
  const penance = !ctx.offhand ? a.flags["penanceStore"] ?? 0 : 0;
  if (penance > 0) {
    raw += Math.round(penance * (PENANCE_RETURN + (a.flags["penanceAmp"] ?? 0) / 100)) * (a.flags["penanceCrit"] ? 2 : 1);
    a.flags["penanceStore"] = 0;
    a.flags["lastPenance"] = penance;
    eachHook(a, "onSkill", (h, s2) => h(b, a, "penance_release", s2));
    log(b, `✝️ Penance: ${penance} suffered, returned half as much again.`);
  }
  let shatter = false;
  if (d.flags["shatter"]) {
    raw *= 3;
    d.flags["shatter"] = 0;
    shatter = true;
  }
  // Reckless effects: more damage dealt by the attacker, more taken by the defender.
  if (a.dmgDealt) raw *= 1 + a.dmgDealt / 100;
  if (d.dmgTaken) raw *= 1 + d.dmgTaken / 100;
  raw = Math.max(0, Math.round(raw));
  // Unbreakable Vow: a Guard (not two rounds running) takes no damage from hits at all.
  if (d.flags["vow"] === b.round && d.flags["guarding"]) {
    log(b, `${d.name}'s Vow holds: no damage.`);
    fx(b, { who: d.id, kind: "block", text: "Vow", icon: "🛡️" });
    raw = 0;
  }
  ctx.raw = raw;
  // Causality Mirror: the first hit it takes is stopped, and half of it comes straight back at the attacker. Evade and Dodge can't stop it.
  if (st(d, "causality") > 0 && raw > 0) {
    d.statuses.causality = 0;
    d.flags["mirrorBack"] = b.round + MIRROR_RECHARGE;
    // (Half of it comes back now; it used to be the whole blow.)
    const back = Math.max(1, Math.round(raw * MIRROR_REFLECT));
    log(b, `🪞 Causality Mirror! Half of ${a.name}'s blow comes back at them: ${back}.`);
    fx(b, { who: d.id, kind: "block", text: "Reflected", icon: "🪞" });
    loseHp(b, a, back);
    fx(b, { who: a.id, kind: "dmg", value: back });
    breakStreak(b, a);
    return afterStrike(b, ctx);
  }
  // True Strike: nothing can make its attacks miss (it's spent when it matters, and recharges).
  if (st(d, "evade") > 0 && !useTrueStrike(a)) {
    d.statuses.evade = st(d, "evade") - 1;
    log(b, `${d.name} evades!`);
    fx(b, { who: d.id, kind: "miss", text: "Evaded" });
    breakStreak(b, a);
    // Countering: an evaded blow is answered just like a dodged one.
    if (d.flags["counter"] === b.round) { d.flags["counter"] = -1; if (a.hp > 0 && d.hp > 0) counterStrike(b, d, a); }
    return afterStrike(b, ctx);
  }
  // Dodge (a % chance; Countering adds 20%). It's not Evade: Evade bonuses don't fire, Dodge ones do.
  const countering = d.flags["counter"] === b.round;
  // Heavy gear halves your Dodge (it used to stop it outright).
  const dodgeChance = Math.min(DODGE_CAP + (d.flags["dodgeCap"] ?? 0), (d.dodge ?? 0) + (countering ? COUNTER_DODGE + (d.flags["counterDodge"] ?? 0) : 0)) * (d.heavyGear ? 0.5 : 1);
  if (dodgeChance > 0 && b.rng() * 100 < dodgeChance && !useTrueStrike(a)) {
    log(b, `${d.name} dodges!`);
    fx(b, { who: d.id, kind: "miss", text: "Dodged" });
    breakStreak(b, a);
    eachHook(d, "onDodge", (h, s) => h(b, ctx, s));
    // The stance is spent the moment it's tested: one Counter per stance.
    if (countering) d.flags["counter"] = -1;
    if (countering && a.hp > 0 && d.hp > 0) {
      counterStrike(b, d, a);
    }
    return afterStrike(b, ctx);
  }
  if (countering) {
    d.flags["counter"] = -1;
    if (!d.flags["counterNoFrail"]) d.flags["frail"] = 1;
    log(b, `${d.name}'s Counter fails: off-balance for the next attack.`);
    fx(b, { who: d.id, kind: "text", text: "Off-balance", icon: "🥀" });
  }
  const rawIn = raw;
  // Elemental Barrier (Mage): 5–6 blocks it all, 3–4 halves it; the attacker takes 4 or 2 stacks of the element.
  const tier = d.flags["eBarrier"] === b.round ? d.flags["eBarrierTier"] ?? 0 : 0;
  // Tier 2 (5–6) blocks it all, tier 1 (3–4) halves it, tier 0.5 (1–2) blocks nothing but still throws the element back.
  if (tier > 0 && raw > 0) {
    raw = tier >= 2 ? 0 : tier >= 1 ? Math.ceil(raw / 2) : raw;
    ctx.raw = raw;
    fx(b, { who: d.id, kind: "block", text: tier >= 2 ? "Barrier holds" : tier >= 1 ? "Barrier bends" : "Barrier sparks", icon: "🔮" });
    log(b, `${d.name}'s Elemental Barrier ${tier >= 2 ? "blocks the whole hit" : tier >= 1 ? "takes half of it" : "can't stop the hit, but lashes back"}.`);
    if (d.barrierElement && a.hp > 0) for (const el of d.barrierElements ?? [d.barrierElement]) if (a.hp > 0) applyStatus(b, d, a, el, tier >= 2 ? 4 : 2);
    eachHook(d, "onSkill", (h, st2) => h(b, d, tier >= 2 ? "barrier_block" : "barrier_hit", st2));
    // Spellweaver's Loop: a full block strikes back with your main hand (once a round).
    if (tier >= 2 && d.flags["barrierRiposte"] && d.flags["ripostedAt"] !== b.round && a.hp > 0 && d.hp > 0) {
      d.flags["ripostedAt"] = b.round;
      log(b, `${d.name}'s Barrier flares and they strike back.`);
      fx(b, { who: d.id, kind: "text", text: "Riposte!", icon: "🔮" });
      attack(b, d, a);
    }
  }
  const armor = ctx.ignoreArmor ? 0 : armorOf(d);
  // Armor stops a percentage of each hit (see armorReduction); Guarding doubles Armor and lifts the cap.
  const cut = armorReduction(armor, !!d.flags["guarding"] || stacksOf(d, "lr_anvil_heart") > 0);
  // Without Guarding, a hit that lands always does at least 1.
  const after = d.flags["guarding"] ? Math.max(0, Math.floor(raw * (1 - cut))) : raw > 0 ? Math.max(1, Math.round(raw * (1 - cut))) : 0;
  // Full blocks (a Guard or a full Elemental Barrier that stops everything) feed Reinforcing gear;
  // a Guard or barrier that lets damage through loses any Reinforced you were holding.
  const shielded = !!d.flags["guarding"] || tier > 0;
  if (shielded && rawIn > 0 && after === 0) d.flags["fullBlockNow"] = 1;
  else if (shielded && after > 0 && st(d, "reinforced") > 0) { d.statuses.reinforced = 0; log(b, `${d.name}'s Reinforced crumbles.`); }
  // DEATH drinks the whole blow, even one your Armor stopped, and can heal past its Max HP.
  if ((a.items["m_death"] ?? 0) > 0 && raw > 0) {
    a.hp += raw;
    log(b, `☠️ DEATH drinks ${raw}.`);
  }
  if (ctx.kind === "crit") { fx(b, { who: d.id, kind: "crit", text: "Crit!" }); if (a.id === "player") a.persist["q_crits"] = (a.persist["q_crits"] ?? 0) + 1; }
  if (ctx.kind === "graze") fx(b, { who: d.id, kind: "text", text: "Graze" });
  // The hit streak: only a real Hit or Crit that gets through keeps it going.
  if ((ctx.kind === "hit" || ctx.kind === "crit") && after > 0) addStreak(a);
  else breakStreak(b, a);
  const barBefore = st(d, "barrier");
  ctx.dealt = loseHp(b, d, after);
  if (ctx.dealt > 0) a.flags["dealtRound"] = 1;
  // Elemental charms: while you hold Barrier (from anything), a hit on it throws the charm's elements back at the attacker:
  // 2 stacks of each, 4 if the Barrier soaked the whole hit (once a round, and not on top of the old Elemental Barrier skill).
  if (barBefore > 0 && after > 0 && d.barrierElement && !tier && a.hp > 0 && d.flags["charmLash"] !== b.round) {
    d.flags["charmLash"] = b.round;
    const full = ctx.dealt === 0;
    for (const el of d.barrierElements ?? [d.barrierElement]) if (a.hp > 0) applyStatus(b, d, a, el, full ? 4 : 2);
    fx(b, { who: d.id, kind: "block", text: full ? "Barrier lashes back" : "Barrier sparks", icon: "🔮" });
    log(b, `${d.name}'s Barrier ${full ? "soaks the whole hit and lashes back" : "sparks"}: the charm's elements hit ${a.name}.`);
  }
  // Martyrdom: this round, every blow you take comes back at the one who struck it.
  if (ctx.dealt > 0 && d.flags["martyr"] === b.round && a.hp > 0) { const back = loseHp(b, a, ctx.dealt); fx(b, { who: a.id, kind: "dmg", value: back }); log(b, `⛓️ Martyrdom: ${back} comes back at ${a.name}.`); }
  if (ctx.dealt > 0 && !ctx.offhand && a.heavy && d.hp > 0) buildStagger(b, a, d, ctx.kind === "crit");
  // Blessed: your patience pays out — 10% of the enemy's Max HP per stack, then it resets.
  if (ctx.dealt > 0 && st(a, "blessed") > 0 && d.hp > 0) {
    const n = st(a, "blessed");
    a.statuses.blessed = 0;
    const lost = statusLoss(b, d, Math.ceil(d.maxHp * 0.1 * n));
    log(b, `🌟 Blessed ×${n}: ${lost} more.`);
    fx(b, { who: d.id, kind: "reaction", text: `Blessed ×${n}`, status: "blessed", src: d.id === "player" ? "enemy" : "player" });
  }
  const label = ctx.kind === "crit" ? "Crit! " : ctx.kind === "graze" ? "Graze. " : "";
  log(b, `${label}${a.name} hits ${d.name} for ${ctx.dealt}${armor && raw > 0 ? ` (${raw}, ${Math.round(cut * 100)}% stopped by Armor)` : ""}.`);
  if (shatter) applyStatus(b, a, d, "stun", 1);
  if (bashed && ctx.dealt > 0) {
    log(b, "💥 Bash!");
    fx(b, { who: d.id, kind: "text", text: "Bash!", icon: "💥" });
    applyStatus(b, a, d, "stun", 1);
    eachHook(a, "onBash", (h, s) => h(b, ctx, s));
  }
  if (penance > 0 && d.hp <= 0) heal(b, a, Math.ceil(a.maxHp * 0.15), "Penance");
  if (ctx.dealt > 0 && charged > 0) {
    a.statuses.charged = 0;
    applyStatus(b, a, d, "static", charged);
  }
  if (thunder) {
    a.flags["thunderstrike"] = 0;
    log(b, "⚡ Thunderstrike!");
    applyStatus(b, a, d, "shock", 1);
  }
  if (ctx.dealt > 0 && st(a, "kindled") > 0) applyStatus(b, a, d, "burn", st(a, "kindled"));
  if (armor > 0 && raw > after) d.flags["absorbed"] = (d.flags["absorbed"] ?? 0) + (raw - after);
  if (raw > 0 && after === 0 && armor > 0) {
    d.flags["blocked"] = (d.flags["blocked"] ?? 0) + raw;
    d.flags["blockedNow"] = 1;
    log(b, `${d.name} blocks it all.`);
    fx(b, { who: d.id, kind: "block", text: "Blocked" });
  }
  if (ctx.dealt > 0) {
    trySmite(b, a, d);
    eachHook(a, "onHit", (h, s) => h(b, ctx, s));
    if (ctx.kind === "crit") eachHook(a, "onCrit", (h, s) => h(b, ctx, s));
  }
  afterStrike(b, ctx);
}

function afterStrike(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  if (!ctx.noDamage) {
    eachHook(d, "whenHit", (h, s) => h(b, ctx, s));
    // Spikes gear and relics make them hit harder (spikeAmp, % for the fight).
    const spikes = Math.round((st(d, "spikes") + (d.flags["bristle"] && st(d, "spikes") > 0 ? st(d, "might") : 0)) * (1 + (d.flags["spikeAmp"] ?? 0) / 100) * ((a.items["x_wk_fragile"] ?? 0) > 0 ? 1.6 : 1));
    if (spikes > 0 && a.hp > 0) {
      const lost = loseHp(b, a, spikes);
      log(b, `🌵 Spikes deal ${lost} back to ${a.name}.`);
      // The Mantle of the Briar King: every time Spikes strike back, they grow.
      if (lost > 0 && stacksOf(d, "lx_briar_king") > 0) d.statuses.spikes = st(d, "spikes") + 1;
      if (lost > 0 && stacksOf(d, "c_carapace") > 0) heal(b, d, lost, "Crimson Carapace");
    }
  }
  d.flags["blockedNow"] = 0;
  d.flags["fullBlockNow"] = 0;
  if (d.hp <= 0 && !d.flags["dead"]) {
    d.flags["dead"] = 1;
    if (ctx.spec.cleave && d.hp < 0) {
      b.carry += -d.hp;
      log(b, `🪓 Cleave: ${-d.hp} overkill carries into the next fight.`);
    }
    eachHook(a, "onKill", (h, s) => h(b, ctx, s));
  }
}

// ---------- Turn and round flow ----------

/** Toll (Tormentor foes): every action you take costs HP — attacks, Guards, potions, class actions. */
export function tollOf(enemy: Fighter, player: Fighter): number {
  const n = (enemy.items["m_toll"] ?? 0) + (enemy.items["x_tormenting"] ?? 0);
  return n > 0 ? n * (1 + Math.floor((player.persist["floor"] ?? 1) / 2)) : 0;
}
export function actionToll(b: Battle, f: Fighter) {
  if (f !== b.player || f.hp <= 0) return;
  const n = tollOf(b.enemy, f);
  if (n <= 0) return;
  const lost = loseHp(b, f, n);
  log(b, `⛓️ The Toll: acting costs you ${lost}.`);
}

function act(b: Battle, f: Fighter, doIt: () => void) {
  if (f.hp <= 0 || b.over) return;
  if (st(f, "stun") > 0) {
    f.statuses.stun = 0;
    // Reeling: it just lost a turn (Stun-build gear reads this). Bosses, Champions and Elites steady themselves for a while after.
    f.flags["stunnedAt"] = b.round;
    if (f.id === "enemy" && (f.boss || f.champion || f.elite || f.crimson)) f.flags["stunGuard"] = b.round + (f.boss ? 2 : 1);
    log(b, `${f.name} is Stunned and skips a turn.`);
    fx(b, { who: f.id, kind: "text", text: "Stunned", icon: "💫" });
    return;
  }
  staticTick(b, f);
  actionToll(b, f);
  if (f.hp <= 0) return;
  smoulderSoulAction(b, f);
  doIt();
  if (st(f, "haste") > 0 && other(b, f).hp > 0) {
    f.statuses.haste = st(f, "haste") - 1;
    log(b, `💨 ${f.name} acts again (Haste${st(f, "haste") ? `, ${st(f, "haste")} left` : ""}).`);
    fx(b, { who: f.id, kind: "text", text: "Haste!", icon: "💨" });
    staticTick(b, f);
    actionToll(b, f);
    smoulderSoulAction(b, f);
    if (f.hp > 0) doIt();
  }
}

function heroAttack(b: Battle) {
  const swings = stacksOf(b.player, "l_thousand_hands") > 0 ? 3 : 1;
  for (let i = 0; i < swings && b.enemy.hp > 0; i++) attack(b, b.player, b.enemy);
  // Grenades in the off-hand are thrown on round 1 and every 3rd round after; other off-hands attack every turn.
  const grenade = b.player.offType === "grenade";
  if (b.player.offFaces && b.enemy.hp > 0 && (!grenade || b.round % 3 === 1)) attack(b, b.player, b.enemy, true);
  // Flurry Charm: a 6 on your main die sends the off-hand in again.
  if (b.player.dualWield && b.player.flags["flurry"] === b.round && b.enemy.hp > 0) {
    b.player.flags["flurry"] = 0;
    log(b, "Flurry! The off-hand strikes again.");
    attack(b, b.player, b.enemy, true);
  }
}

interface Snapshot { hp: number; statuses: Statuses }
const snap = (f: Fighter): Snapshot => ({ hp: f.hp, statuses: { ...f.statuses } });
const roundStart = new WeakMap<Battle, { p: Snapshot; e: Snapshot }>();

/** Chronoglass: once per fight, a round that cost you HP (or your life) is rewound. */
function tryRewind(b: Battle): boolean {
  const p = b.player;
  const e = b.enemy;
  const before = roundStart.get(b);
  if (!before || stacksOf(p, "l_chronoglass") <= 0 || p.flags["rewound"] || p.hp >= before.p.hp) return false;
  p.flags["rewound"] = 1;
  p.hp = before.p.hp;
  p.statuses = before.p.statuses;
  e.hp = before.e.hp;
  e.statuses = before.e.statuses;
  e.flags["dead"] = 0;
  log(b, "⏳ Chronoglass rewinds the round. Play it again.");
  fx(b, { who: "player", kind: "text", text: "Rewound!", icon: "⏳" });
  return true;
}

export const MIRROR_RECHARGE = 4;
/** The share of a blow the Causality Mirror sends back. */
export const MIRROR_REFLECT = 0.5;
/** Regen a Penance gives (before Faith). */
export const PENANCE_REGEN = 3;
function useTrueStrike(a: Fighter): boolean {
  if (a.flags["tsNow"]) return true;
  if (!(st(a, "truestrike") > 0)) return false;
  a.flags["tsNow"] = 1;
  a.statuses.truestrike = 0;
  a.flags["trueUsed"] = 1;
  return true;
}

function checkOver(b: Battle) {
  if (b.over) return true;
  if (b.player.hp <= 0 && tryRewind(b)) return true;
  // Phoenix Plume: once per fight, rise from death.
  if (b.player.hp <= 0 && stacksOf(b.player, "l_phoenix") > 0 && !b.player.flags["phoenix"]) {
    b.player.flags["phoenix"] = 1;
    b.player.hp = Math.ceil(b.player.maxHp / 2);
    log(b, "🔥 The Phoenix Plume flares: you rise from the ashes!");
    fx(b, { who: "player", kind: "text", text: "Reborn!", icon: "🔥" });
    applyStatus(b, b.player, b.enemy, "burn", 15);
  }
  // Judgement (Tarot): once a run, rise again; it costs every coin you carry.
  if (b.player.hp <= 0 && (b.player.persist["tb_judgement"] ?? 0) > 0 && !b.player.persist["judged"]) {
    const p = b.player;
    p.persist["judged"] = 1;
    p.hp = Math.max(1, Math.round(p.maxHp * Math.min(1, 0.5 * (p.persist["tb_judgement"] ?? 100) / 100)));
    p.gold = 0;
    log(b, "📯 Judgement sounds: you rise again, and every coin you carried is gone.");
    fx(b, { who: "player", kind: "text", text: "Judgement", icon: "📯" });
  }
  // At 0 HP you're down, even if the enemy falls in the same moment: no healing or life steal from there.
  if (b.player.hp <= 0) {
    b.over = "lost";
    log(b, `${b.player.name} falls.`);
  } else if (b.enemy.hp <= 0) {
    b.over = "won";
    log(b, `${b.enemy.name} is defeated!`);
  }
  if (b.over) for (const f of [b.player, b.enemy]) eachHook(f, "onFightEnd", (h, s) => h(b, f, s));
  return !!b.over;
}

/** Attack, Guard (needs a shield), Flee, and one action per class. */
export type Action = "attack" | "guard" | "flee" | Throw | Skill;
/** Things you throw in a fight (carried in the hero's persist as c_bomb, c_brew, c_smoke). */
export const THROWS = ["t_bomb", "t_fire", "t_frost", "t_knives", "t_holy", "t_net", "t_smoke", "t_brew"] as const;
export type Throw = (typeof THROWS)[number];
export const isThrow = (a: string): a is Throw => (THROWS as readonly string[]).includes(a);
export const THROW_INFO: Record<Throw, { key: string; name: string; short: string; icon: string; text: string }> = {
  t_bomb: { key: "c_bomb", name: "Bomb", short: "Bomb", icon: "💣", text: "Blast the foe for damage that ignores Armor (more on deeper layers)" },
  t_fire: { key: "c_fire", name: "Fire Flask", short: "Fire", icon: "🔥", text: "Douse the foe in burning oil: heavy Burn" },
  t_frost: { key: "c_frost", name: "Frost Flask", short: "Frost", icon: "❄️", text: "Shatter it on the foe: Chill and Soaked" },
  t_knives: { key: "c_knives", name: "Throwing Knives", short: "Knives", icon: "🔪", text: "Three quick throws (Armor still counts against each)" },
  t_holy: { key: "c_holy", name: "Holy Water", short: "Holy", icon: "💧", text: "Burns the Unholy badly; anything else is left Weak" },
  t_net: { key: "c_net", name: "Weighted Net", short: "Net", icon: "🕸️", text: "Tangle the foe: it loses its next turn" },
  t_smoke: { key: "c_smoke", name: "Smoke Bomb", short: "Smoke", icon: "💨", text: "Blind the foe, and you can flee this fight without being hit (even from an Elite)" },
  t_brew: { key: "c_brew", name: "Blightcap Brew", short: "Brew", icon: "🍄", text: "Brewed at the Camp from Blightcap: Poison and Weak" }
};
/** Throws that are only ever brewed at the Camp (never bought or found). */
export const BREWED_THROWS: Throw[] = ["t_brew"];
/** How hard a Bomb hits on a layer. */
export const bombDamage = (floor: number) => 6 + 4 * Math.max(1, floor);

/** Ready a throwable: it costs no turn, and flies right after your action this turn. Tap again to put it back. */
export function readyThrow(b: Battle, t: Throw): boolean {
  if (b.over) return false;
  const p = b.player, key = THROW_INFO[t].key;
  if (p.flags[`q_${t}`]) { p.flags[`q_${t}`] = 0; p.persist[key] = (p.persist[key] ?? 0) + 1; return true; }
  if ((p.persist[key] ?? 0) <= 0) return false;
  p.persist[key]--;
  p.flags[`q_${t}`] = 1;
  return true;
}
export const readied = (p: Fighter) => THROWS.filter(t => p.flags[`q_${t}`]);
/** Readied throwables fly (or go back in the bag if the fight is already over). */
function loose(b: Battle) {
  const p = b.player;
  for (const t of readied(p)) {
    p.flags[`q_${t}`] = 0;
    if (b.enemy.hp > 0 && p.hp > 0 && !b.over) act(b, p, () => throwIt(b, t, true));
    else p.persist[THROW_INFO[t].key] = (p.persist[THROW_INFO[t].key] ?? 0) + 1;
  }
}

/** Throw something at the foe (as an action, it takes your turn; readied, it's already paid for). */
function throwIt(b: Battle, t: Throw, paid = false) {
  const p = b.player, e = b.enemy, info = THROW_INFO[t];
  if (!paid) {
    if ((p.persist[info.key] ?? 0) <= 0) return;
    p.persist[info.key]--;
  }
  const floor = p.persist["floor"] ?? 1;
  if (t === "t_bomb") {
    const lost = loseHp(b, e, bombDamage(floor));
    log(b, `${p.name} throws a Bomb! ${e.name} takes ${lost}.`);
    fx(b, { who: "player", kind: "text", text: "Bomb!", icon: "💣" });
    fx(b, { who: "enemy", kind: "dmg", value: lost });
  } else if (t === "t_brew") {
    applyStatus(b, p, e, "poison", 4 + floor);
    applyStatus(b, p, e, "weak", 2);
    log(b, `${p.name} hurls a Blightcap Brew. It splashes and hisses.`);
    fx(b, { who: "player", kind: "text", text: "Blightcap Brew", icon: "🍄" });
  } else if (t === "t_fire") {
    applyStatus(b, p, e, "burn", 3 + floor);
    log(b, `${p.name} throws a Fire Flask. Flames lick over ${e.name}.`);
    fx(b, { who: "player", kind: "text", text: "Fire Flask", icon: "🔥" });
  } else if (t === "t_frost") {
    applyStatus(b, p, e, "chill", 3);
    applyStatus(b, p, e, "soaked", 2);
    log(b, `${p.name} throws a Frost Flask. Ice crackles over ${e.name}.`);
    fx(b, { who: "player", kind: "text", text: "Frost Flask", icon: "❄️" });
  } else if (t === "t_knives") {
    let total = 0;
    for (let k = 0; k < 3 && e.hp > 0; k++) total += loseHp(b, e, Math.max(1, 2 + floor - armorOf(e)));
    log(b, `${p.name} throws three knives: ${e.name} takes ${total}.`);
    fx(b, { who: "player", kind: "text", text: "Throwing Knives", icon: "🔪" });
    fx(b, { who: "enemy", kind: "dmg", value: total });
  } else if (t === "t_holy") {
    if (isUnholy(e)) {
      const lost = loseHp(b, e, Math.round(bombDamage(floor) * 1.5));
      log(b, `${p.name} splashes Holy Water. ${e.name} shrieks and smokes: ${lost}.`);
      fx(b, { who: "enemy", kind: "dmg", value: lost });
    } else {
      applyStatus(b, p, e, "weak", 3);
      log(b, `${p.name} splashes Holy Water. ${e.name} flinches.`);
    }
    fx(b, { who: "player", kind: "text", text: "Holy Water", icon: "💧" });
  } else if (t === "t_net") {
    applyStatus(b, p, e, "stun", 1);
    log(b, `${p.name} throws a Weighted Net over ${e.name}.`);
    fx(b, { who: "player", kind: "text", text: "Net!", icon: "🕸️" });
  } else {
    applyStatus(b, p, e, "blind", 2);
    p.flags["smoke"] = 1;
    log(b, `${p.name} throws a Smoke Bomb! A thick cloud fills the passage.`);
    fx(b, { who: "player", kind: "text", text: "Smoke Bomb", icon: "💨" });
  }
}

/** Begin a round. Returns true if the enemy acts first this round (Ambush). */
export function beginRound(b: Battle): boolean {
  const p = b.player;
  const e = b.enemy;
  b.round++;
  log(b, `— Round ${b.round} —`);
  roundStart.set(b, { p: snap(p), e: snap(e) });
  for (const f of [p, e]) { f.flags["dealtRound"] = 0; eachHook(f, "onRoundStart", (h, s) => h(b, f, s)); }
  // Guarding foes: a boss whose shown move guards, or a foe that said last round it would.
  const mv = e.moves?.[e.intent ?? 0];
  if (mv?.guard) enemyGuard(b, e, mv.guard);
  if (e.flags["guardNext"]) {
    enemyGuard(b, e, e.flags["guardNext"]);
    e.flags["guardNext"] = 0;
    if (e.flags["guardHolds"]) e.flags["guardSkip"] = 1;
  }
  const first = b.round === 1 && !!e.flags["ambush"] && !e.flags["ambushDone"];
  if (first) {
    log(b, `${e.name} strikes first!`);
    fx(b, { who: "enemy", kind: "text", text: "Ambush!" });
  }
  return first;
}

export const isSkill = (a: string): a is Skill => (SKILLS as readonly string[]).includes(a);
export type Skill = (typeof SKILLS)[number];
const SKILL_NAME: Record<Skill, string> = { counter: "Counter", barrier: "Barrier", penance: "Penance", warcry: "War Cry", crush: "Crushing Blow", shieldwall: "Shield Wall", envenom: "Envenom", smokebomb: "Smoke Bomb", frostnova: "Frost Nova", arcanebolt: "Arcane Bolt", smite: "Smite", sanctuary: "Sanctuary",
  bastion: "Bastion", shieldslam: "Shield Slam", rampage: "Rampage", bloodlust: "Bloodlust", feint: "Feint", flurry: "Flurry", ambush: "Ambush", toxicburst: "Toxic Burst",
  cataclysm: "Cataclysm", prismbolt: "Prism Bolt", manalance: "Mana Lance", arcaneaegis: "Arcane Aegis", atonement: "Atonement", martyrdom: "Martyrdom", consecrate: "Consecrate", judgment: "Judgment" };


/** A class ability: costs 1 mana (out of mana, you attack instead). Gear can make it free of your turn, count as a Guard, or hit harder. */
function useSkill(b: Battle, skill: Skill) {
  const p = b.player;
  const e = b.enemy;
  if ((p.mana ?? 0) < MANA_COST) {
    log(b, `${p.name} is out of mana, and attacks instead.`);
    fx(b, { who: "player", kind: "text", text: "No mana", icon: "🔷" });
    heroAttack(b);
    return;
  }
  p.mana = (p.mana ?? 0) - MANA_COST;
  p.flags["skillsUsed"] = (p.flags["skillsUsed"] ?? 0) + 1;
  p.flags[`used_${skill}`] = (p.flags[`used_${skill}`] ?? 0) + 1;
  if (skill === "counter") {
    p.flags["counter"] = b.round;
    log(b, `${p.name} takes a Counter stance.`);
    fx(b, { who: "player", kind: "text", text: "Counter stance", icon: "🗡️" });
  } else if (skill === "barrier") {
    let r = rollDie(b.rng, 6);
    if (p.flags["barrierTwice"]) r = Math.max(r, rollDie(b.rng, 6));
    r = Math.min(6, r + (p.flags["barrierRoll"] ?? 0));
    const tier = r >= 5 ? 2 : r >= 3 ? 1 : 0.5;
    p.flags["eBarrier"] = b.round;
    p.flags["eBarrierTier"] = tier;
    fx(b, { who: "player", kind: "roll", face: r, faceName: tier === 2 ? "Full barrier" : tier === 1 ? "Partial barrier" : "Thin barrier", faceKind: tier === 2 ? "crit" : tier === 1 ? "hit" : "graze", sides: 6 });
    log(b, `${p.name} raises an Elemental Barrier: rolls ${r} — ${tier === 2 ? "a full block" : tier === 1 ? "it will take half" : "it won't stop a hit, but attackers still get the element"}.`);
  } else if (skill === "penance") {
    p.flags["penanceRound"] = b.round;
    // Penance also mends: Regen, more with Faith (+1 for every 2 points).
    applyStatus(b, p, p, "regen", PENANCE_REGEN + Math.floor((p.persist["faiPts"] ?? 0) / 2));
    log(b, `${p.name} kneels in Penance. What you suffer this round is stored (${p.flags["penanceStore"] ?? 0} so far).`);
    fx(b, { who: "player", kind: "text", text: "Penance", icon: "✝️" });
  } else if (skill === "crush") {
    // Crushing Blow: a heavy swing that cracks their guard.
    p.flags["crushBlow"] = 1;
    applyStatus(b, p, e, "fracture", 2);
    log(b, `${p.name} winds up a Crushing Blow!`);
    fx(b, { who: "player", kind: "text", text: "Crushing Blow", icon: "🔨" });
    p.dmgDealt = (p.dmgDealt ?? 0) + 60;
    heroAttack(b);
    p.dmgDealt = (p.dmgDealt ?? 0) - 60;
    p.flags["crushBlow"] = 0;
  } else if (skill === "shieldwall") {
    // Shield Wall: brace behind whatever you hold. Guard this round (no shield needed), and a Barrier as thick as your Armor twice over.
    p.flags["guarding"] = 1;
    p.flags["guardArmor"] = 0;
    p.flags["guards"] = (p.flags["guards"] ?? 0) + 1;
    eachHook(p, "onGuard", (h, s) => h(b, p, s));
    applyStatus(b, p, p, "barrier", Math.max(3, 2 * armorOf(p)));
    log(b, `${p.name} raises a Shield Wall (Armor ${armorOf(p)}).`);
    fx(b, { who: "player", kind: "text", text: "Shield Wall", icon: "🧱" });
  } else if (skill === "envenom") {
    // Envenom: coat the blade, then strike.
    applyStatus(b, p, e, "poison", 4 + (p.persist["floor"] ?? 1));
    log(b, `${p.name} envenoms the blade.`);
    fx(b, { who: "player", kind: "text", text: "Envenom", icon: "🧪" });
    heroAttack(b);
  } else if (skill === "smokebomb") {
    // Smoke Bomb: vanish in a cloud. Evade the next two hits, and leave the foe Blinded.
    applyStatus(b, p, p, "evade", 2);
    applyStatus(b, p, e, "blind", 2);
    // The smoke covers an escape, too.
    p.flags["smoke"] = 1;
    log(b, `${p.name} throws a Smoke Bomb!`);
    fx(b, { who: "player", kind: "text", text: "Smoke Bomb", icon: "💨" });
  } else if (skill === "frostnova") {
    // Frost Nova: a burst of cold. Chill deep and Stun it for a turn.
    applyStatus(b, p, e, "chill", 3);
    applyStatus(b, p, e, "stun", 1);
    log(b, `${p.name} looses a Frost Nova!`);
    fx(b, { who: "player", kind: "text", text: "Frost Nova", icon: "❄️" });
  } else if (skill === "arcanebolt") {
    // Arcane Bolt: raw force that ignores Armor (twice your Damage, more the deeper you go).
    const n = Math.max(1, 2 * p.damage + (p.persist["floor"] ?? 1));
    const got = loseHp(b, e, n);
    fx(b, { who: "enemy", kind: "dmg", value: got });
    log(b, `${p.name} hurls an Arcane Bolt: ${got} damage, straight through Armor.`);
  } else if (skill === "smite") {
    // Smite: a holy strike that burns, and mends you a little.
    applyStatus(b, p, e, "burn", 3);
    log(b, `${p.name} calls down a Smite!`);
    fx(b, { who: "player", kind: "text", text: "Smite", icon: "⚡" });
    heroAttack(b);
    heal(b, p, Math.ceil(p.maxHp * 0.08), "Smite");
  } else if (pathSkill(b, skill)) {
    // (A path skill: see pathSkill.)
  } else if (skill === "sanctuary") {
    // Sanctuary: a moment of grace. Heal a quarter of your Max HP and a Ward against the next status.
    heal(b, p, Math.ceil(p.maxHp * 0.25), "Sanctuary");
    applyStatus(b, p, p, "ward", 1);
    log(b, `${p.name} prays for Sanctuary.`);
    fx(b, { who: "player", kind: "text", text: "Sanctuary", icon: "🕊️" });
  } else {
    // War Cry: a big swell of Might (more the deeper you are; half as much for each cry after the first this fight), and the enemy is cowed.
    const n = p.flags["used_warcry"];
    // (Strength feeds it: +1 Might for every 2 points.)
    const base = 3 + Math.floor((2 * (p.persist["floor"] ?? 1)) / 3) + (p.flags["warcryMight"] ?? 0) + Math.floor((p.persist["strPts"] ?? 0) / 2);
    applyStatus(b, p, p, "might", n > 1 && !p.flags["warcryFull"] ? Math.max(1, Math.ceil(base / 2)) : base);
    applyStatus(b, p, e, "weak", 3);
    applyStatus(b, p, e, "exposed", 2);
    p.flags["warcry"] = 1;
    log(b, `${p.name} lets out a War Cry!`);
    fx(b, { who: "player", kind: "text", text: "War Cry!", icon: "📯" });
  }
  eachHook(p, "onSkill", (h, s) => h(b, p, skill, s));
  // Counts as a Guard (some relics).
  if (p.flags[`guard_${skill}`]) {
    p.flags["guarding"] = 1;
    p.flags["guardArmor"] = 0;
    p.flags["guards"] = (p.flags["guards"] ?? 0) + 1;
    eachHook(p, "onGuard", (h, s) => h(b, p, s));
    log(b, `…and ${p.name} Guards as well (Armor ${armorOf(p)}).`);
    fx(b, { who: "player", kind: "text", text: `Guard · Armor ${armorOf(p)}`, icon: "🛡️" });
  }
  // Doesn't take your turn (some relics): you attack too.
  if (p.flags[`free_${skill}`] && e.hp > 0 && p.hp > 0) {
    log(b, `${SKILL_NAME[skill]} costs no time: ${p.name} attacks too.`);
    heroAttack(b);
  }
}

/** The hero's turn. */
export function heroPhase(b: Battle, action: Action) {
  if (b.over) return;
  const p = b.player;
  const e = b.enemy;
  startOfTurn(b, p);
  if (checkOver(b)) { loose(b); return; }
  if (isSkill(action) && (p.mana ?? 0) >= MANA_COST) p.persist["q_skill"] = (p.persist["q_skill"] ?? 0) + 1;
  if (action === "flee") {
    const smoke = !!p.flags["smoke"];
    if (e.boss || (e.elite && !smoke)) log(b, "You can't flee from this fight.");
    else {
      // Running costs a hit, unless something covers your escape.
      if (!smoke && e.hp > 0) {
        log(b, `${p.name} turns to run, and ${e.name} gets a free swing.`);
        fx(b, { who: "player", kind: "text", text: "Fleeing…", icon: "🏃" });
        act(b, e, () => attack(b, e, p));
        if (p.hp <= 0) { checkOver(b); return; }
      }
      b.over = "fled";
      log(b, `${p.name} ${smoke ? "slips away in the smoke" : "flees"}.`);
      loose(b);
      return;
    }
  } else if (isThrow(action)) {
    act(b, p, () => throwIt(b, action));
  } else if (action === "guard") {
    p.flags["guarding"] = 1;
    // A Guard: Armor doubled, plus a little more (it matters most when your Armor is low).
    p.flags["guardArmor"] = GUARD_FLAT;
    // Riposte: your next attack after a Guard hits harder.
    p.flags["riposte"] = 1;
    p.flags["guards"] = (p.flags["guards"] ?? 0) + 1;
    actionToll(b, p);
    smoulderSoulAction(b, p);
    eachHook(p, "onGuard", (h, s) => h(b, p, s));
    log(b, `${p.name} Guards (Armor ${armorOf(p)}).`);
    fx(b, { who: "player", kind: "text", text: `Guard · Armor ${armorOf(p)}`, icon: "🛡️" });
  } else if (isSkill(action)) {
    act(b, p, () => useSkill(b, action));
  } else act(b, p, () => heroAttack(b));
  loose(b);
  checkOver(b);
}

/** The enemy's turn: a boss with a move set performs its shown intent; others attack. */
export function enemyPhase(b: Battle) {
  if (b.over) return;
  const p = b.player;
  const e = b.enemy;
  startOfTurn(b, e);
  if (checkOver(b)) return;
  // Shieldbearers spend their turn holding the guard.
  if (e.flags["guardSkip"]) {
    e.flags["guardSkip"] = 0;
    p.flags["counter"] = -1;
    log(b, `${e.name} holds its guard.`);
    fx(b, { who: "enemy", kind: "text", text: "Holds guard", icon: "🧱" });
    checkOver(b);
    return;
  }
  act(b, e, () => {
    const move = e.moves?.[e.intent ?? 0];
    if (move) {
      log(b, `${e.name} uses ${move.name}.`);
      fx(b, { who: "enemy", kind: "text", text: move.name, icon: move.icon });
      move.act(b, e, p);
    } else {
      attack(b, e, p);
      // A copy of you (the Changeling) swings its off-hand too.
      if (e.offFaces && p.hp > 0 && e.hp > 0) attack(b, e, p, true);
    }
  });
  // Your Counter stance lasts only until the foe has taken its turn (attack or not).
  p.flags["counter"] = -1;
  if (e.moves?.length) e.intent = ((e.intent ?? 0) + 1) % e.moves.length;
  checkOver(b);
}

/** End-of-round ticks for both sides. */
export function endRound(b: Battle) {
  if (b.over) return;
  for (const f of [b.player, b.enemy]) {
    endOfRound(b, f);
    eachHook(f, "onRoundEnd", (h, s) => h(b, f, s));
    // Blessing gear: a round without dealing damage adds Blessed.
    if (f.hp > 0 && (f.flags["blessGain"] ?? 0) > 0 && !f.flags["dealtRound"]) applyStatus(b, f, f, "blessed", f.flags["blessGain"]);
    f.flags["guarding"] = 0;
  }
  if (tryRewind(b)) return;
  checkOver(b);
}

/** One full round at once (used by tests and the balance bot). */
export function playRound(b: Battle, action: Action) {
  if (b.over) return;
  const first = beginRound(b);
  if (first) enemyPhase(b);
  heroPhase(b, action);
  if (!first) enemyPhase(b);
  endRound(b);
}

/** Start a fight: fight-only statuses and flags reset, carried Cleave damage lands first. */
export function startBattle(player: Fighter, enemy: Fighter, seed: number, carry = 0): Battle {
  const b: Battle = { player, enemy, round: 0, rng: makeRng(seed), log: [], fx: [], over: null, carry: 0 };
  // Kept Barrier (Hollow Crown, Bastion of Ages) is capped by depth so it can't snowball forever.
  const keptBarrier = player.persist["keepBarrier"] ? Math.min(st(player, "barrier"), 10 + 8 * (player.persist["floor"] ?? 1)) : 0;
  player.statuses = keptBarrier ? { barrier: keptBarrier } : {};
  player.flags = {};
  log(b, `${enemy.name} appears: ${enemy.hp} HP, Power ${enemy.damage}${enemy.armor ? `, Armor ${enemy.armor}` : ""}.`);
  if (carry > 0) {
    const lost = loseHp(b, enemy, carry);
    player.flags["carriedIn"] = lost;
    log(b, `🪓 ${lost} carried damage lands on ${enemy.name}.`);
  }
  for (const f of [player, enemy]) eachHook(f, "onFightStart", (h, s) => h(b, f, s));
  // Mana for class abilities: it carries over from fight to fight; only Mana Potions refill it. A new run starts
  // full. Some relics raise the most you can hold, and so does Intellect (1 for every 3 points).
  player.maxMana = MANA_MAX + (player.flags["manaMax"] ?? 0) + Math.floor((player.persist["intPts"] ?? 0) / INT_MANA_PER) + (player.persist["omenMana"] ?? 0);
  player.mana = player.persist["manaSeen"] ? Math.min(player.mana ?? 0, player.maxMana) : player.maxMana;
  player.persist["manaSeen"] = 1;
  // Some passives give a little Mana back at the start of each fight (Deep Well).
  if (player.flags["fightMana"]) player.mana = Math.min(player.maxMana, player.mana + player.flags["fightMana"]);
  checkOver(b);
  return b;
}

/** The path skills (one is chosen at level 5): each a different answer to the same fight. Returns false if it isn't one. */
function pathSkill(b: Battle, skill: Skill): boolean {
  const p = b.player, e = b.enemy;
  const say = (text: string, icon: string, line: string) => { log(b, line); fx(b, { who: "player", kind: "text", text, icon }); };
  const strike = (pct: number) => { p.dmgDealt = (p.dmgDealt ?? 0) + pct; heroAttack(b); p.dmgDealt = (p.dmgDealt ?? 0) - pct; };
  const direct = (n: number) => { const got = loseHp(b, e, Math.max(1, Math.round(n))); fx(b, { who: "enemy", kind: "dmg", value: got }); return got; };
  const guard = () => { p.flags["guarding"] = 1; p.flags["guards"] = (p.flags["guards"] ?? 0) + 1; eachHook(p, "onGuard", (h, s) => h(b, p, s)); };
  switch (skill) {
    // Warrior — the Bulwark
    case "bastion": guard(); applyStatus(b, p, p, "reinforced", 3); applyStatus(b, p, p, "spikes", Math.max(2, Math.floor(armorOf(p) / 2)));
      say("Bastion", "🏰", `${p.name} becomes a Bastion: Guarding, Reinforced and Spiked.`); return true;
    case "shieldslam": { const n = direct(p.damage + armorOf(p)); applyStatus(b, p, e, "stun", 1);
      say("Shield Slam", "🛡️", `${p.name} slams with the shield: ${n}, straight through Armor, and a Stun.`); return true; }
    // Warrior — the Berserker
    case "rampage": { const cost = Math.max(1, Math.ceil(p.hp * 0.1)); loseHp(b, p, cost); fx(b, { who: "player", kind: "dmg", value: cost });
      say("Rampage", "🪓", `${p.name} Rampages (−${cost} HP): two strikes!`); heroAttack(b); if (e.hp > 0) heroAttack(b); return true; }
    case "bloodlust": { const n = 2 + Math.floor((10 * (p.maxHp - p.hp)) / Math.max(1, p.maxHp)) * 2; applyStatus(b, p, p, "might", n); applyStatus(b, p, p, "haste", 1);
      say("Bloodlust", "🩸", `${p.name} is gripped by Bloodlust: ${n} Might, and Haste.`); return true; }
    // Rogue — the Duelist
    case "feint": applyStatus(b, p, p, "evade", 1); applyStatus(b, p, e, "exposed", 2); p.flags["duelOpen"] = 1;
      say("Feint", "🤺", `${p.name} Feints: the next blow will miss, the foe is Exposed, and your next attack hits half again harder.`); return true;
    case "flurry": say("Flurry", "💨", `${p.name} unleashes a Flurry: three quick strikes!`); for (let k = 0; k < 3 && e.hp > 0; k++) strike(-50); return true;
    // Rogue — the Assassin
    case "ambush": say("Ambush", "🗡️", `${p.name} strikes from the shadows${b.round <= 1 ? ", before it can react" : ""}!`); strike(b.round <= 1 ? 200 : 100); return true;
    case "toxicburst": { const n = st(e, "poison") + st(e, "bleed"); const got = n > 0 ? direct(n * 1.5) : 0; applyStatus(b, p, e, "poison", 2);
      say("Toxic Burst", "🧪", `${p.name}'s poisons boil over: ${got} damage at once, and the wound festers.`); return true; }
    // Mage — the Elementalist
    case "cataclysm": { const ids = ["burn", "poison", "bleed", "chill", "shock", "static"] as const; const n = ids.reduce((a, id) => a + st(e, id as never), 0);
      const got = n > 0 ? direct(n * 1.5) : 0; say("Cataclysm", "🌋", `${p.name} calls a Cataclysm: every status on the foe erupts for ${got}.`); return true; }
    case "prismbolt": applyStatus(b, p, e, "burn", 2); applyStatus(b, p, e, "chill", 2); applyStatus(b, p, e, "shock", 1);
      say("Prism Bolt", "🌈", `${p.name} looses a Prism Bolt: fire, frost and lightning at once.`); return true;
    // Mage — the Arcanist
    case "manalance": { const got = direct(p.damage + 4 * (p.mana ?? 0) + 2); say("Mana Lance", "🔮", `${p.name} hurls a Mana Lance: ${got}, straight through Armor (stronger with Mana left).`); return true; }
    case "arcaneaegis": { const n = 4 + 3 * (p.mana ?? 0); applyStatus(b, p, p, "barrier", n); say("Arcane Aegis", "🔷", `${p.name} raises an Arcane Aegis: ${n} Barrier.`); return true; }
    // Cleric — the Penitent
    case "atonement": { const cost = Math.max(1, Math.ceil(p.maxHp * 0.15)); loseHp(b, p, cost); fx(b, { who: "player", kind: "dmg", value: cost });
      const got = direct(2 * cost); say("Atonement", "⛓️", `${p.name} atones (−${cost} HP), and the foe pays double: ${got}.`); return true; }
    case "martyrdom": guard(); p.flags["martyr"] = b.round;
      say("Martyrdom", "✝️", `${p.name} offers up Martyrdom: Guarding, and every blow this round comes back at whoever struck it.`); return true;
    // Cleric — the Zealot
    case "consecrate": applyStatus(b, p, p, "regen", 5); applyStatus(b, p, e, "burn", isUnholy(e) ? 6 : 3);
      say("Consecrate", "☀️", `${p.name} Consecrates the ground: Regen for you, holy fire for the foe.`); return true;
    case "judgment": say("Judgment", "⚖️", `${p.name} brings down Judgment!`); strike(isUnholy(e) ? 100 : 60); heal(b, p, Math.ceil(p.maxHp * 0.1), "Judgment"); return true;
    default: return false;
  }
}
