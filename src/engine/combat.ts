// Combat: your weapon is your die. Roll it, read the face, fire every effect on that face, then deal damage.
import { eachHook, fx, log, stacksOf } from "./registry";
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
  fx(b, { who: a.id, kind: "roll", face, faceName: faceName(spec), faceKind: spec.kind, sides: faces.length, offhand });
  if (st(a, "blind") > 0 && face <= 2) {
    log(b, `${a.name} is Blind and misses.`);
    fx(b, { who: d.id, kind: "miss", text: "Blind — miss" });
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
  eachHook(a, "modifyAttack", (h, s) => h(b, ctx, s));
  strike(b, ctx);
}

function strike(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  if (ctx.noDamage || d.hp <= 0) {
    if (ctx.kind === "miss") {
      log(b, `${a.name} misses.`);
      fx(b, { who: d.id, kind: "miss", text: "Miss" });
    }
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
    fx(b, { who: d.id, kind: "miss", text: "Evaded" });
    return afterStrike(b, ctx);
  }
  const armor = ctx.ignoreArmor ? 0 : armorOf(d);
  // Armor can't soak a whole hit unless you're Guarding: at least a third always gets through.
  const floorDmg = d.flags["guarding"] ? 0 : Math.floor(raw / 3);
  const after = Math.max(floorDmg, raw - armor);
  if (ctx.kind === "crit") fx(b, { who: d.id, kind: "crit", text: "Crit!" });
  if (ctx.kind === "graze") fx(b, { who: d.id, kind: "text", text: "Graze" });
  ctx.dealt = loseHp(b, d, after);
  const label = ctx.kind === "crit" ? "Crit! " : ctx.kind === "graze" ? "Graze. " : "";
  log(b, `${label}${a.name} hits ${d.name} for ${ctx.dealt}${armor && raw > 0 ? ` (${raw} − ${armor} Armor)` : ""}.`);
  if (shatter) applyStatus(b, a, d, "stun", 1);
  if (armor > 0 && raw > after) d.flags["absorbed"] = (d.flags["absorbed"] ?? 0) + (raw - after);
  if (raw > 0 && after === 0 && armor > 0) {
    d.flags["blocked"] = (d.flags["blocked"] ?? 0) + raw;
    d.flags["blockedNow"] = 1;
    log(b, `${d.name} blocks it all.`);
    fx(b, { who: d.id, kind: "block", text: "Blocked" });
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
    fx(b, { who: f.id, kind: "text", text: "Stunned", icon: "💫" });
    return;
  }
  doIt();
  if (st(f, "haste") > 0 && other(b, f).hp > 0) {
    f.statuses.haste = 0;
    log(b, `💨 ${f.name} acts again (Haste).`);
    fx(b, { who: f.id, kind: "text", text: "Haste!", icon: "💨" });
    doIt();
  }
}

function heroAttack(b: Battle) {
  const swings = stacksOf(b.player, "l_thousand_hands") > 0 ? 3 : 1;
  for (let i = 0; i < swings && b.enemy.hp > 0; i++) attack(b, b.player, b.enemy);
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
  fx(b, { who: "player", kind: "text", text: "Rewound!", icon: "⏳" });
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

/** Begin a round. Returns true if the enemy acts first this round (Ambush). */
export function beginRound(b: Battle): boolean {
  const p = b.player;
  const e = b.enemy;
  b.round++;
  log(b, `— Round ${b.round} —`);
  roundStart.set(b, { p: snap(p), e: snap(e) });
  for (const f of [p, e]) eachHook(f, "onRoundStart", (h, s) => h(b, f, s));
  const first = b.round === 1 && !!e.flags["ambush"];
  if (first) {
    log(b, `${e.name} strikes first!`);
    fx(b, { who: "enemy", kind: "text", text: "Ambush!" });
  }
  return first;
}

/** The hero's turn. */
export function heroPhase(b: Battle, action: Action) {
  if (b.over) return;
  const p = b.player;
  const e = b.enemy;
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
    fx(b, { who: "player", kind: "text", text: `Guard · Armor ${armorOf(p)}`, icon: "🛡️" });
    eachHook(p, "onGuard", (h, s) => h(b, p, s));
  } else act(b, p, () => heroAttack(b));
  checkOver(b);
}

/** The enemy's turn: a boss with a move set performs its shown intent; others attack. */
export function enemyPhase(b: Battle) {
  if (b.over) return;
  const p = b.player;
  const e = b.enemy;
  startOfTurn(b, e);
  if (checkOver(b)) return;
  act(b, e, () => {
    const move = e.moves?.[e.intent ?? 0];
    if (move) {
      log(b, `${e.name} uses ${move.name}.`);
      fx(b, { who: "enemy", kind: "text", text: move.name, icon: move.icon });
      move.act(b, e, p);
    } else attack(b, e, p);
  });
  if (e.moves?.length) e.intent = ((e.intent ?? 0) + 1) % e.moves.length;
  checkOver(b);
}

/** End-of-round ticks for both sides. */
export function endRound(b: Battle) {
  if (b.over) return;
  for (const f of [b.player, b.enemy]) {
    endOfRound(b, f);
    eachHook(f, "onRoundEnd", (h, s) => h(b, f, s));
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
