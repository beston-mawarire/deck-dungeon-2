// Combat: your weapon is your die. Roll it, read the face, fire every effect on that face, then deal damage.
import { eachHook, fx, getItem, log, stacksOf } from "./registry";
import { makeRng, rollDie } from "./rng";

/** Dodge is capped at 60%; Bash at 30%. */
export const DODGE_CAP = 60;
export const BASH_CAP = 30;
import { applyStatus, conductive, endOfRound, heal, loseHp, other, smoulderSoulAction, st, startOfTurn, staticTick } from "./statuses";
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
  return (offhand ? f.offDamage ?? 0 : f.damage) + st(f, "might");
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

/** Undead, vampires and Crimson things: Holy weapons deal +50% to them. */
export const isUnholy = (f: Fighter) => f.family === "Undead" || !!f.crimson || (f.items["x_vampiric"] ?? 0) > 0 || (f.items["m_lifedrink"] ?? 0) > 0;

/** How many times Smite can land per fight, and how hard (fraction of the enemy's Max HP). */
const smiteLimit = (a: Fighter) => (stacksOf(a, "l_dawnbringer") > 0 ? 99 : 1 + stacksOf(a, "r_halo_retribution"));
const smitePct = (a: Fighter) => (stacksOf(a, "r_halo_retribution") > 0 ? 0.3 : 0.2);

function trySmite(b: Battle, a: Fighter, d: Fighter) {
  if (!a.flags["smiteReady"] || d.hp <= 0 || !wieldsHoly(a) || (a.flags["smites"] ?? 0) >= smiteLimit(a)) return;
  a.flags["smiteReady"] = 0;
  a.flags["smites"] = (a.flags["smites"] ?? 0) + 1;
  const n = Math.ceil(d.maxHp * smitePct(a));
  fx(b, { who: d.id, kind: "reaction", text: "Smite!" });
  const lost = loseHp(b, d, n);
  log(b, `⚡✝️ SMITE! Your Ward turned their spite into judgement: ${d.name} takes ${lost}.`);
  if (a.id === "player") a.persist["rx:foe:smite"] = (a.persist["rx:foe:smite"] ?? 0) + 1;
}

/** Purify: strip every negative status from the enemy; each one removed deals 2× your Damage (ignores Armor). */
function purify(b: Battle, ctx: AttackCtx) {
  const { attacker: a, defender: d } = ctx;
  const removed = (NEGATIVE_STATUSES as readonly StatusId[]).filter(s => st(d, s) > 0);
  for (const s of removed) d.statuses[s] = 0;
  const perStatus = (stacksOf(a, "l_font_absolution") > 0 ? 3 : 2) * (damageOf(a, ctx.offhand) + ctx.bonus) + [0, 1, 2, 3][Math.min(3, stacksOf(a, "t_absolution"))];
  let raw = perStatus * removed.length * ctx.mult;
  if (st(a, "weak") > 0) raw *= 0.75;
  if (wieldsHoly(a) && isUnholy(d)) raw *= 1.5;
  raw = Math.max(0, Math.round(raw));
  ctx.raw = raw;
  if (!removed.length) {
    log(b, `${a.name} Purifies, but ${d.name} carries no sin to burn away.`);
    fx(b, { who: d.id, kind: "miss", text: "Nothing to purify" });
    return afterStrike(b, ctx);
  }
  if (st(d, "evade") > 0) {
    d.statuses.evade = 0;
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
 * How much of a hit Armor stops: Armor / (Armor + 10). Light armour barely dents a blow, heavy armour really counts:
 * 3 Armor stops 23%, 5 stops 33%, 10 stops 50%, 20 stops 67%. Tops out at 75%; while Guarding (which doubles Armor) 90%.
 */
export function armorReduction(armor: number, guarding: boolean): number {
  if (armor <= 0) return 0;
  return Math.min(guarding ? 0.9 : 0.75, armor / (armor + 10));
}

export function armorOf(f: Fighter): number {
  let a = f.armor;
  // Guarding doubles Armor (Fortress Heart: triples); "+Armor while Guarding" effects add on top.
  if (f.flags["guarding"]) a = a * (stacksOf(f, "r_fortress_heart") > 0 ? 3 : 2) + (f.flags["guardArmor"] ?? 0);
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
  if (st(a, "dazzled") > 0 && !a.flags["counterHit"]) {
    log(b, `${a.name} is Dazzled and misses.`);
    fx(b, { who: d.id, kind: "miss", text: "Dazzled — miss" });
    return;
  }
  if (st(a, "blind") > 0 && face <= 2) {
    log(b, `${a.name} is Blind and misses.`);
    fx(b, { who: d.id, kind: "miss", text: "Blind — miss" });
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
  if (ctx.spec.cleanse) return purify(b, ctx);
  let raw = (damageOf(a, ctx.offhand) + ctx.bonus) * ctx.mult;
  if (st(a, "weak") > 0) raw *= 0.75;
  if (wieldsHoly(a) && isUnholy(d)) raw *= 1.5;
  if (st(d, "exposed") > 0) raw += 2;
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
  // Mana Potion: spells hit 50% harder for the rest of the fight.
  if (a.flags["mana"] && ctx.spec.magic) raw *= 1.5;
  // Spell Amp (gear): spells deal more.
  if (ctx.spec.magic && (a.spellAmp ?? 0) > 0) raw *= 1 + (a.spellAmp ?? 0) / 100;
  // Keepsake of the Deadeye: crits deal 50% more.
  if (ctx.kind === "crit" && stacksOf(a, "ks_deadeye") > 0) raw *= 1.5;
  // A failed Counter leaves you off-balance for one attack.
  if (a.flags["frail"]) { raw *= 0.75; a.flags["frail"] = 0; }
  // Bash (main weapon only): Stun and +50%.
  let bashed = false;
  if (!ctx.offhand && (a.bash ?? 0) > 0 && (ctx.kind === "hit" || ctx.kind === "crit") && b.rng() * 100 < Math.min(BASH_CAP, a.bash ?? 0)) {
    raw *= 1.5;
    bashed = true;
  }
  // Penance: everything you suffered comes back in one blow.
  const penance = !ctx.offhand ? a.flags["penanceStore"] ?? 0 : 0;
  if (penance > 0) {
    raw += penance;
    a.flags["penanceStore"] = 0;
    log(b, `✝️ Penance: ${penance} suffered, returned in full.`);
  }
  let shatter = false;
  if (d.flags["shatter"]) {
    raw *= 3;
    d.flags["shatter"] = 0;
    shatter = true;
  }
  raw = Math.max(0, Math.round(raw));
  // Unbreakable Vow: a Guard (not two rounds running) takes no damage from hits at all.
  if (d.flags["vow"] === b.round && d.flags["guarding"]) {
    log(b, `${d.name}'s Vow holds: no damage.`);
    fx(b, { who: d.id, kind: "block", text: "Vow", icon: "🛡️" });
    raw = 0;
  }
  ctx.raw = raw;
  if (st(d, "evade") > 0) {
    d.statuses.evade = 0;
    log(b, `${d.name} evades!`);
    fx(b, { who: d.id, kind: "miss", text: "Evaded" });
    return afterStrike(b, ctx);
  }
  // Dodge (a % chance; Countering adds 20%). It's not Evade: Evade bonuses don't fire, Dodge ones do.
  const countering = d.flags["counter"] === b.round;
  const dodgeChance = Math.min(DODGE_CAP, (d.dodge ?? 0) + (countering ? 20 : 0));
  if (dodgeChance > 0 && b.rng() * 100 < dodgeChance) {
    log(b, `${d.name} dodges!`);
    fx(b, { who: d.id, kind: "miss", text: "Dodged" });
    eachHook(d, "onDodge", (h, s) => h(b, ctx, s));
    if (countering && a.hp > 0 && d.hp > 0) {
      log(b, `${d.name} counters!`);
      fx(b, { who: d.id, kind: "text", text: "Counter!", icon: "🗡️" });
      d.flags["counterHit"] = 1;
      attack(b, d, a);
      d.flags["counterHit"] = 0;
    }
    return afterStrike(b, ctx);
  }
  if (countering) {
    d.flags["frail"] = 1;
    log(b, `${d.name}'s Counter fails: off-balance for the next attack.`);
    fx(b, { who: d.id, kind: "text", text: "Off-balance", icon: "🥀" });
  }
  // Elemental Barrier (Mage): 5–6 blocks it all, 3–4 halves it; either way the attacker gets a taste of the element.
  const tier = d.flags["eBarrier"] === b.round ? d.flags["eBarrierTier"] ?? 0 : 0;
  if (tier > 0 && raw > 0) {
    raw = tier >= 2 ? 0 : Math.ceil(raw / 2);
    ctx.raw = raw;
    fx(b, { who: d.id, kind: "block", text: tier >= 2 ? "Barrier holds" : "Barrier bends", icon: "🔮" });
    log(b, `${d.name}'s Elemental Barrier ${tier >= 2 ? "blocks the whole hit" : "takes half of it"}.`);
    if (d.barrierElement && a.hp > 0) applyStatus(b, d, a, d.barrierElement, tier >= 2 ? 2 : 1);
  }
  const armor = ctx.ignoreArmor ? 0 : armorOf(d);
  // Armor stops a percentage of each hit (see armorReduction); Guarding doubles Armor and lifts the cap.
  const cut = armorReduction(armor, !!d.flags["guarding"] || stacksOf(d, "lr_anvil_heart") > 0);
  // Without Guarding, a hit that lands always does at least 1.
  const after = d.flags["guarding"] ? Math.max(0, Math.floor(raw * (1 - cut))) : raw > 0 ? Math.max(1, Math.round(raw * (1 - cut))) : 0;
  if (ctx.kind === "crit") fx(b, { who: d.id, kind: "crit", text: "Crit!" });
  if (ctx.kind === "graze") fx(b, { who: d.id, kind: "text", text: "Graze" });
  ctx.dealt = loseHp(b, d, after);
  const label = ctx.kind === "crit" ? "Crit! " : ctx.kind === "graze" ? "Graze. " : "";
  log(b, `${label}${a.name} hits ${d.name} for ${ctx.dealt}${armor && raw > 0 ? ` (${raw}, ${Math.round(cut * 100)}% stopped by Armor)` : ""}.`);
  if (shatter) applyStatus(b, a, d, "stun", 1);
  if (bashed && ctx.dealt > 0) {
    log(b, "💥 Bash!");
    fx(b, { who: d.id, kind: "text", text: "Bash!", icon: "💥" });
    applyStatus(b, a, d, "stun", 1);
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
    const spikes = st(d, "spikes");
    if (spikes > 0 && a.hp > 0) {
      const lost = loseHp(b, a, spikes);
      log(b, `🌵 Spikes deal ${lost} back to ${a.name}.`);
      if (lost > 0 && stacksOf(d, "c_carapace") > 0) heal(b, d, lost, "Crimson Carapace");
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
    f.statuses.haste = 0;
    log(b, `💨 ${f.name} acts again (Haste).`);
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

/** Attack, Guard (needs a shield), Flee, and one action per class. */
export type Action = "attack" | "guard" | "flee" | "counter" | "barrier" | "penance" | "warcry";

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
    p.flags["guardArmor"] = 0;
    p.flags["guards"] = (p.flags["guards"] ?? 0) + 1;
    actionToll(b, p);
    smoulderSoulAction(b, p);
    eachHook(p, "onGuard", (h, s) => h(b, p, s));
    log(b, `${p.name} Guards (Armor ${armorOf(p)}).`);
    fx(b, { who: "player", kind: "text", text: `Guard · Armor ${armorOf(p)}`, icon: "🛡️" });
  } else if (action === "counter") {
    act(b, p, () => {
      p.flags["counter"] = b.round;
      log(b, `${p.name} takes a Counter stance.`);
      fx(b, { who: "player", kind: "text", text: "Counter stance", icon: "🗡️" });
    });
  } else if (action === "barrier") {
    act(b, p, () => {
      const r = rollDie(b.rng, 6);
      const tier = r >= 5 ? 2 : r >= 3 ? 1 : 0;
      p.flags["eBarrier"] = b.round;
      p.flags["eBarrierTier"] = tier;
      fx(b, { who: "player", kind: "roll", face: r, faceName: tier === 2 ? "Full barrier" : tier === 1 ? "Partial barrier" : "Fizzled", faceKind: tier === 2 ? "crit" : tier === 1 ? "hit" : "miss", sides: 6 });
      log(b, `${p.name} raises an Elemental Barrier: rolls ${r} — ${tier === 2 ? "a full block" : tier === 1 ? "it will take half" : "it fizzles"}.`);
    });
  } else if (action === "penance") {
    act(b, p, () => {
      p.flags["penanceRound"] = b.round;
      log(b, `${p.name} kneels in Penance. What you suffer this round is stored (${p.flags["penanceStore"] ?? 0} so far).`);
      fx(b, { who: "player", kind: "text", text: "Penance", icon: "✝️" });
    });
  } else if (action === "warcry") {
    act(b, p, () => {
      if (p.flags["warcry"]) return;
      p.flags["warcry"] = 1;
      applyStatus(b, p, p, "might", 2 + Math.floor((p.persist["floor"] ?? 1) / 2));
      applyStatus(b, p, e, "weak", 2);
      log(b, `${p.name} lets out a War Cry!`);
      fx(b, { who: "player", kind: "text", text: "War Cry!", icon: "📯" });
    });
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
  // Kept Barrier (Hollow Crown, Bastion of Ages) is capped by depth so it can't snowball forever.
  const keptBarrier = player.persist["keepBarrier"] ? Math.min(st(player, "barrier"), 10 + 8 * (player.persist["floor"] ?? 1)) : 0;
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
