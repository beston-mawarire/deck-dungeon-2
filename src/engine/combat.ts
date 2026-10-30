// Combat: your weapon is your die. Roll it, read the face, fire every effect on that face, then deal damage.
import { eachHook, log, stacksOf } from "./registry";
import { makeRng, rollDie } from "./rng";
import { applyStatus, endOfRound, loseHp, other, st, startOfTurn } from "./statuses";
import type { AttackCtx, Battle, FaceGroup, FaceKind, FaceSpec, Fighter, Statuses } from "./types";

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
  return (offhand ? f.offDamage ?? 0 : f.damage) + st(f, "might");
}

export function armorOf(f: Fighter): number {
  let a = f.armor;
  if (f.flags["guarding"]) a *= stacksOf(f, "r_fortress_heart") > 0 ? 3 : 2;
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
  return Math.max(1, Math.min(sides, r));
}

/** One attack with the main die (or the off-hand die). */
export function attack(b: Battle, a: Fighter, d: Fighter, offhand = false) {
  const faces = (offhand ? a.offFaces : a.faces) ?? PLAIN_FACES;
  const face = rollFor(b, a, faces.length);
  resolveFace(b, a, d, face, offhand);
}

export function resolveFace(b: Battle, a: Fighter, d: Fighter, face: number, offhand = false) {
  const faces = (offhand ? a.offFaces : a.faces) ?? PLAIN_FACES;
  const spec = faces[Math.min(face, faces.length) - 1];
  log(b, `${a.name} rolls ${face}${offhand ? " (off-hand)" : ""}: ${faceName(spec)}.`);
  if (st(a, "blind") > 0 && face <= 2) {
    log(b, `${a.name} is Blind and misses.`);
    return;
  }
  const ctx: AttackCtx = {
    attacker: a, defender: d, face, spec, kind: spec.kind, mult: KIND_MULT[spec.kind],
    ignoreArmor: spec.kind === "crit" || !!spec.magic, bonus: 0, noDamage: spec.kind === "miss", offhand, dealt: 0
  };
  if (spec.kind === "hit" && face === 5 && a.flags["frenzy"]) {
    ctx.kind = "crit";
    ctx.mult = 2;
    ctx.ignoreArmor = true;
  }
  if (spec.run) {
    a.flags["casting"] = 1;
    spec.run(b, ctx);
    a.flags["casting"] = 0;
  }
  eachHook(a, "face", (entries, s) => {
    for (const e of entries) if (faceMatches(e.group, face)) e.run(b, ctx, s);
  });
  eachHook(a, "modifyAttack", (h, s) => h(b, ctx, s));
  strike(b, ctx);
}

function strike(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  if (ctx.noDamage || d.hp <= 0) {
    if (ctx.kind === "miss") log(b, `${a.name} misses.`);
    return afterStrike(b, ctx);
  }
  let raw = (damageOf(a, ctx.offhand) + ctx.bonus) * ctx.mult;
  if (st(a, "weak") > 0) raw *= 0.75;
  if (st(d, "exposed") > 0) raw += 2;
  if (st(d, "shock") > 0) {
    raw *= 1.5;
    d.statuses.shock = st(d, "shock") - 1;
  }
  let shatter = false;
  if (d.flags["shatter"]) {
    raw *= 3;
    d.flags["shatter"] = 0;
    shatter = true;
  }
  raw = Math.max(0, Math.round(raw));
  if (st(d, "evade") > 0) {
    d.statuses.evade = 0;
    log(b, `${d.name} evades!`);
    return afterStrike(b, ctx);
  }
  const armor = ctx.ignoreArmor ? 0 : armorOf(d);
  const after = Math.max(0, raw - armor);
  ctx.dealt = loseHp(b, d, after);
  const label = ctx.kind === "crit" ? "Crit! " : ctx.kind === "graze" ? "Graze. " : "";
  log(b, `${label}${a.name} hits ${d.name} for ${ctx.dealt}${armor && raw > 0 ? ` (${raw} − ${armor} Armor)` : ""}.`);
  if (shatter) applyStatus(b, a, d, "stun", 1);
  if (raw > 0 && after === 0) {
    d.flags["blocked"] = (d.flags["blocked"] ?? 0) + raw;
    d.flags["blockedNow"] = 1;
    log(b, `${d.name} blocks it all.`);
  }
  if (ctx.dealt > 0) {
    eachHook(a, "onHit", (h, s) => h(b, ctx, s));
    if (ctx.kind === "crit") eachHook(a, "onCrit", (h, s) => h(b, ctx, s));
  }
  afterStrike(b, ctx);
}

function afterStrike(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  if (!ctx.noDamage) {
    eachHook(d, "whenHit", (h, s) => h(b, ctx, s));
    const spikes = st(d, "spikes");
    if (spikes > 0 && a.hp > 0) {
      const lost = loseHp(b, a, spikes);
      log(b, `🌵 Spikes deal ${lost} back to ${a.name}.`);
    }
  }
  d.flags["blockedNow"] = 0;
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

function act(b: Battle, f: Fighter, doIt: () => void) {
  if (f.hp <= 0 || b.over) return;
  if (st(f, "stun") > 0) {
    f.statuses.stun = 0;
    log(b, `${f.name} is Stunned and skips a turn.`);
    return;
  }
  doIt();
  if (st(f, "haste") > 0 && other(b, f).hp > 0) {
    f.statuses.haste = 0;
    log(b, `💨 ${f.name} acts again (Haste).`);
    doIt();
  }
}

function heroAttack(b: Battle) {
  attack(b, b.player, b.enemy);
  if (b.player.offFaces && b.enemy.hp > 0) attack(b, b.player, b.enemy, true);
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
  return true;
}

function checkOver(b: Battle) {
  if (b.over) return true;
  if (b.player.hp <= 0 && tryRewind(b)) return true;
  if (b.enemy.hp <= 0) {
    b.over = "won";
    log(b, `${b.enemy.name} is defeated!`);
  } else if (b.player.hp <= 0) {
    b.over = "lost";
    log(b, `${b.player.name} falls.`);
  }
  if (b.over) for (const f of [b.player, b.enemy]) eachHook(f, "onFightEnd", (h, s) => h(b, f, s));
  return !!b.over;
}

export type Action = "attack" | "guard" | "flee";

/** One full round: the hero's action, the enemy's, then end-of-round ticks. */
export function playRound(b: Battle, action: Action) {
  if (b.over) return;
  const p = b.player;
  const e = b.enemy;
  b.round++;
  log(b, `— Round ${b.round} —`);
  roundStart.set(b, { p: snap(p), e: snap(e) });
  for (const f of [p, e]) eachHook(f, "onRoundStart", (h, s) => h(b, f, s));

  const enemyFirst = b.round === 1 && e.flags["ambush"];
  const enemyTurn = () => {
    startOfTurn(b, e);
    if (!checkOver(b)) act(b, e, () => attack(b, e, p));
  };
  if (enemyFirst) {
    log(b, `${e.name} strikes first!`);
    enemyTurn();
    if (checkOver(b)) return;
  }

  startOfTurn(b, p);
  if (checkOver(b)) return;
  if (action === "flee") {
    if (e.boss || e.elite) log(b, "You can't flee from this fight.");
    else {
      b.over = "fled";
      log(b, `${p.name} flees.`);
      return;
    }
  } else if (action === "guard") {
    p.flags["guarding"] = 1;
    log(b, `${p.name} Guards (Armor ${armorOf(p)}).`);
    eachHook(p, "onGuard", (h, s) => h(b, p, s));
  } else act(b, p, () => heroAttack(b));
  if (checkOver(b)) return;

  if (!enemyFirst) {
    enemyTurn();
    if (checkOver(b)) return;
  }

  for (const f of [p, e]) {
    endOfRound(b, f);
    eachHook(f, "onRoundEnd", (h, s) => h(b, f, s));
    f.flags["guarding"] = 0;
  }

  if (tryRewind(b)) return;
  checkOver(b);
}

/** Start a fight: fight-only statuses and flags reset, carried Cleave damage lands first. */
export function startBattle(player: Fighter, enemy: Fighter, seed: number, carry = 0): Battle {
  const b: Battle = { player, enemy, round: 0, rng: makeRng(seed), log: [], over: null, carry: 0 };
  const keptBarrier = player.persist["keepBarrier"] ? st(player, "barrier") : 0;
  player.statuses = keptBarrier ? { barrier: keptBarrier } : {};
  player.flags = {};
  log(b, `${enemy.name} appears: ${enemy.hp} HP, Power ${enemy.damage}${enemy.armor ? `, Armor ${enemy.armor}` : ""}.`);
  if (carry > 0) {
    const lost = loseHp(b, enemy, carry);
    log(b, `🪓 ${lost} carried damage lands on ${enemy.name}.`);
  }
  for (const f of [player, enemy]) eachHook(f, "onFightStart", (h, s) => h(b, f, s));
  checkOver(b);
  return b;
}
