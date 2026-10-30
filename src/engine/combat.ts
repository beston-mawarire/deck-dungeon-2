// Combat: the die-face attack, Guard, the four class rules, and the round loop.
import { eachHook, log, stacksOf } from "./registry";
import { makeRng, rollDie, shuffle } from "./rng";
import { applyStatus, endOfRound, heal, loseHp, other, st, startOfTurn } from "./statuses";
import type { AttackCtx, Battle, Card, FaceGroup, FaceKind, Fighter } from "./types";

export const KIND_MULT: Record<FaceKind, number> = { graze: 0.5, hit: 1, crit: 2, jackpot: 3 };

export function faceMatches(g: FaceGroup, face: number, doubles = false): boolean {
  if (typeof g === "number") return g === face;
  switch (g) {
    case "any": return true;
    case "low": return face <= 2;
    case "mid": return face === 3 || face === 4;
    case "high": return face >= 5;
    case "odd": return face % 2 === 1;
    case "even": return face % 2 === 0;
    case "doubles": return doubles;
  }
}

export const baseKind = (face: number): FaceKind => (face >= 7 ? "jackpot" : face === 6 ? "crit" : face === 1 ? "graze" : "hit");

/** Flat damage before the face multiplier. The Queen's comes from her HP. */
export function damageOf(f: Fighter): number {
  const might = st(f, "might");
  if (f.cls === "queen") return Math.floor((Math.max(0, f.hp) + st(f, "barrier")) / 4) + f.damage + might;
  return f.damage + might;
}

const dieSides = (f: Fighter) => {
  let sides = 6;
  eachHook(f, "dieSides", (h, s) => (sides = Math.max(sides, h(s))));
  return sides;
};

/** Roll one die for a fighter, with Focus, Clarity, Chill and roll-changing items. */
export function rollFor(b: Battle, f: Fighter): number {
  const sides = dieSides(f);
  let r: number;
  if (f.flags["clarity"]) {
    r = sides; // choose the face: the engine picks the best one
    f.flags["clarity"] = 0;
  } else {
    r = rollDie(b.rng, sides);
    if (st(f, "focus") > 0) {
      r = Math.max(r, rollDie(b.rng, sides));
      f.statuses.focus = 0;
    }
  }
  if (st(f, "chill") > 0 && r > 1 && r <= 6) r -= 1;
  eachHook(f, "modifyRoll", (h, s) => (r = h(b, f, r, s)));
  return Math.max(1, Math.min(sides, r));
}

function newCtx(attacker: Fighter, defender: Fighter, face: number, doubles = false): AttackCtx {
  let kind = baseKind(face);
  if (face === 5 && attacker.flags["frenzy"]) kind = "crit";
  return { attacker, defender, face, kind, mult: KIND_MULT[kind], ignoreArmor: kind === "crit" || kind === "jackpot", bonus: 0, noDamage: false, doubles, dealt: 0 };
}

/** Fire face effects on the attacker's items. `all` fires every face effect (Jackpot, Crown of Sixes). */
export function runFaces(b: Battle, ctx: AttackCtx, all = false) {
  eachHook(ctx.attacker, "face", (entries, s) => {
    for (const e of entries) if (all || faceMatches(e.group, ctx.face, ctx.doubles)) e.run(b, ctx, s);
  });
}

/** Resolve the damage part of an attack once the face is settled. */
function strike(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  if (!ctx.noDamage && d.hp > 0) {
    let raw = (damageOf(a) + ctx.bonus) * ctx.mult;
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
    raw = Math.round(raw);
    if (st(d, "evade") > 0) {
      d.statuses.evade = 0;
      log(b, `${d.name} evades!`);
      return;
    }
    const armor = ctx.ignoreArmor ? 0 : armorOf(d);
    const afterArmor = Math.max(0, raw - armor);
    ctx.dealt = loseHp(b, d, afterArmor);
    const label = ctx.kind === "jackpot" ? "JACKPOT! " : ctx.kind === "crit" ? "Crit! " : ctx.kind === "graze" ? "Graze. " : "";
    log(b, `${label}${a.name} hits ${d.name} for ${ctx.dealt}${armor && raw > 0 ? ` (${raw} − ${armor} Armor)` : ""}.`);
    if (shatter) applyStatus(b, a, d, "stun", 1);
    if (raw > 0 && afterArmor === 0) {
      d.flags["blockedThisRound"] = 1;
      log(b, `${d.name} blocks it all.`);
    }
  }
  if (ctx.dealt > 0) {
    eachHook(a, "onHit", (h, s) => h(b, ctx, s));
    if (ctx.kind === "crit" || ctx.kind === "jackpot") eachHook(a, "onCrit", (h, s) => h(b, ctx, s));
  }
  eachHook(d, "whenHit", (h, s) => h(b, ctx, s));
  const spikes = st(d, "spikes");
  if (spikes > 0 && !ctx.noDamage && a.hp > 0) {
    const lost = loseHp(b, a, spikes);
    log(b, `🌵 Spikes deal ${lost} back to ${a.name}.`);
  }
  if (d.hp <= 0) {
    eachHook(a, "onKill", (h, s) => h(b, ctx, s));
    if (a.cls === "king" && d.hp < 0) b.carnage += -d.hp;
  }
}

export function armorOf(f: Fighter): number {
  let a = f.armor + (f.flags["guardDie"] ?? 0);
  if (f.flags["guarding"]) a *= stacksOf(f, "fortress_heart") > 0 ? 3 : 2;
  return Math.max(0, a);
}

/** One attack with a single die (King, Queen, enemies). */
export function attackWithDie(b: Battle, a: Fighter, d: Fighter) {
  const face = rollFor(b, a);
  resolveFace(b, a, d, face, false);
}

export function resolveFace(b: Battle, a: Fighter, d: Fighter, face: number, doubles: boolean) {
  log(b, `${a.name} rolls ${face}.`);
  if (st(a, "blind") > 0 && face <= 2) {
    log(b, `${a.name} is Blind and misses.`);
    return;
  }
  const ctx = newCtx(a, d, face, doubles);
  eachHook(a, "modifyKind", (h, s) => h(b, ctx, s));
  const all = ctx.kind === "jackpot" || (ctx.face === 6 && stacksOf(a, "crown_of_sixes") > 0);
  runFaces(b, ctx, all);
  strike(b, ctx);
}

/** The Jack: two dice. The higher attacks; the lower adds to Armor this round. */
export function attackJack(b: Battle, a: Fighter, d: Fighter) {
  const r1 = rollFor(b, a);
  const r2 = rollFor(b, a);
  const atk = Math.max(r1, r2);
  const grd = Math.min(r1, r2);
  a.flags["guardDie"] = grd;
  log(b, `${a.name} rolls ${r1} and ${r2}: attacks with ${atk}, guards with ${grd} (+${grd} Armor this round).`);
  resolveFace(b, a, d, atk, r1 === r2);
}

// ---------- The Ace's tarot hand ----------

export function starterDeck(rng: () => number): Card[] {
  const suits = shuffle(rng, ["wands", "cups", "swords", "pentacles"] as const as unknown as Card["suit"][]).slice(0, 2);
  const deck: Card[] = [];
  for (const suit of suits) for (let v = 1; v <= 6; v++) deck.push({ v, suit });
  return deck;
}

function draw(b: Battle, f: Fighter, n: number): Card[] {
  const hand: Card[] = [];
  for (let i = 0; i < n; i++) {
    if (!f.pile || f.pile.length === 0) f.pile = shuffle(b.rng, [...(f.deck ?? [])]);
    const c = f.pile.pop();
    if (c) hand.push(c);
  }
  return hand;
}

export function handMultiplier(hand: Card[]): { mult: number; name: string; flush: boolean } {
  const vs = hand.map(c => c.v).sort((x, y) => x - y);
  const counts = new Map<number, number>();
  for (const v of vs) counts.set(v, (counts.get(v) ?? 0) + 1);
  const most = Math.max(...counts.values());
  const run = vs.length === 3 && vs[1] === vs[0] + 1 && vs[2] === vs[1] + 1;
  const flush = hand.length === 3 && hand.every(c => c.suit === hand[0].suit);
  if (most === 3) return { mult: 3, name: "Three of a kind", flush };
  if (run) return { mult: 2, name: "Run", flush };
  if (most === 2) return { mult: 2, name: "Pair", flush };
  return { mult: 1, name: "High card", flush };
}

const SUIT_ICON: Record<Card["suit"], string> = { wands: "🪄", cups: "🏆", swords: "🗡️", pentacles: "🪙" };
export const cardLabel = (c: Card) => `${c.v}${SUIT_ICON[c.suit]}`;

/** The Ace: play 3 cards. Each card fires its number's face effects; a 6 makes it a crit. */
export function attackAce(b: Battle, a: Fighter, d: Fighter) {
  const hand = draw(b, a, 3);
  const { mult, name, flush } = handMultiplier(hand);
  log(b, `${a.name} plays ${hand.map(cardLabel).join(" ")}: ${name}${flush ? " + flush" : ""}.`);
  let crit = false;
  // Each card fires its own face effects (no damage from these, the hand deals it once).
  for (const c of hand) {
    const fctx = newCtx(a, d, c.v);
    fctx.noDamage = true;
    fctx.fromCard = true;
    runFaces(b, fctx, c.v === 6 && stacksOf(a, "crown_of_sixes") > 0);
    if (c.v === 6) crit = true;
  }
  const ctx = newCtx(a, d, Math.max(...hand.map(c => c.v)));
  ctx.kind = crit ? "crit" : "hit";
  ctx.mult = mult * (crit ? 2 : 1);
  ctx.ignoreArmor = crit;
  eachHook(a, "modifyKind", (h, s) => h(b, ctx, s));
  strike(b, ctx);
  if (flush && d.hp > 0) {
    const total = hand.reduce((s, c) => s + c.v, 0) + damageOf(a);
    const suit = hand[0].suit;
    if (suit === "wands") applyStatus(b, a, d, "burn", total);
    if (suit === "cups") heal(b, a, Math.floor(total / 2), "Cups flush");
    if (suit === "swords") applyStatus(b, a, d, "bleed", Math.floor(total / 2));
    if (suit === "pentacles") {
      a.gold = (a.gold ?? 0) + total;
      log(b, `${a.name} gains ${total} Gold.`);
    }
  }
}

// ---------- Turn and round flow ----------

export function heroAttack(b: Battle) {
  const p = b.player;
  if (p.cls === "jack") attackJack(b, p, b.enemy);
  else if (p.cls === "ace") attackAce(b, p, b.enemy);
  else attackWithDie(b, p, b.enemy);
}

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

function checkOver(b: Battle) {
  if (b.over) return true;
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

/** Play one full round: the hero's action, then the enemy's, then end-of-round ticks. */
export function playRound(b: Battle, action: Action) {
  if (b.over) return;
  const p = b.player;
  const e = b.enemy;
  b.round++;
  log(b, `— Round ${b.round} —`);
  for (const f of [p, e]) eachHook(f, "onRoundStart", (h, s) => h(b, f, s));

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

  startOfTurn(b, e);
  if (checkOver(b)) return;
  act(b, e, () => attackWithDie(b, e, p));
  if (checkOver(b)) return;

  for (const f of [p, e]) {
    endOfRound(b, f);
    eachHook(f, "onRoundEnd", (h, s) => h(b, f, s));
    f.flags["guarding"] = 0;
    f.flags["guardDie"] = 0;
    f.flags["blockedThisRound"] = 0;
  }
  checkOver(b);
}

/** Start a fight. Fight-only statuses and flags reset; the King's Carnage lands first. */
export function startBattle(player: Fighter, enemy: Fighter, seed: number, carnage = 0): Battle {
  const b: Battle = { player, enemy, round: 0, rng: makeRng(seed), log: [], over: null, carnage: 0 };
  player.statuses = {};
  player.flags = {};
  if (player.cls === "ace") player.pile = [];
  log(b, `${enemy.name} appears: ${enemy.hp} HP, Power ${enemy.damage}${enemy.armor ? `, Armor ${enemy.armor}` : ""}.`);
  if (carnage > 0) {
    const lost = loseHp(b, enemy, carnage);
    log(b, `👑 Carnage: ${lost} damage carries into ${enemy.name}.`);
  }
  for (const f of [player, enemy]) eachHook(f, "onFightStart", (h, s) => h(b, f, s));
  checkOver(b);
  return b;
}
