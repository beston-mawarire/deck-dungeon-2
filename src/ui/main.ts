// Deck Dungeon 2 — the playable game.
import { BONUSES, CRIMSON, CURSES, KEEPSAKES, TRAITS, EPIC_POWERS, FUSION_RELICS, GEAR_BASES, LEGENDARIES, RELICS, TALENTS, loadLibrary } from "../data";
import { FUSION_RECIPES } from "../data/fusions";
import { ORIGINS } from "../data/origins";
import { armorOf, armorReduction, beginRound, tollOf, enemyPhase, endRound, heroPhase, isUnholy, type Action, wieldsHoly, streakOf, hasStreak, BLESSINGS } from "../engine/combat";
import { eachHook, getItem } from "../engine/registry";
import { REACTIONS, STATUS_INFO, THRESHOLDS } from "../engine/statuses";
import type { Battle, Fighter, Fx, GearItem, OriginId, StatusId } from "../engine/types";
import { NEGATIVE_STATUSES, rarityLabel } from "../engine/types";
import {
  BACKPACK_SIZE, scrapValue, baseOf, effectiveBase, EQUIP_SLOTS, type EquipSlot, openSlots, canGuard, equipItem, fillText, type Hero, itemLines, itemName, rerollCost, rerollsLeft,
  keepsOffHand, reveal, salvage, slotsFor, unequip, upgradeCost, weaponDamage, xpToLevel
} from "../game/hero";
import { lockedIds, loadMeta, type Meta, recordRun, UNLOCK_TIERS } from "../game/meta";
import {
  advance, availableFusions, buy, chooseEvent, chooseRoom, chooseTalent, claimResplendent, confirmRisk, continueEndless, drinkPotion,
  eventOptionAvailable, finishLoot, FLOORS, forgeReroll, forgeUpgrade, fuse, type Mode, newRun, pickResplendent, rerollShop, rest,
  combinablePairs, sellItem, sellPrice, availableActions, drinkMana, takeKeepsake, forgeCombine, forgeOffer, forgeTransmute, OFFERING_FAIL, offeringOdds, offeringValue, shopRerollCost, MAX_SHOP_REROLLS, TRANSMUTE_COST,
  ROOM_INFO, type Run, floorName, scrapFound, settleCombat, STEPS_PER_FLOOR, takeItem, WALL_FLOOR, DEATH_FLOOR, END_FLOOR,
  abandonRun, smithUpgrade, TONICS, buyTonic, useTonic,
} from "../game/run";
import { fortunePips } from "../game/loot";
import { clearSave, loadRun, saveRun, savedSummary } from "../game/save";
import { applyUpdate, updateReady, watchForUpdates } from "./update";
import { isMusicOff, isMuted, musicBlocked, toggleMusic, musicVolume, onMusicBlockChange, playMusic, setMusicVolume, sfx, toggleMute, type Track } from "./sound";

loadLibrary();

const app = document.getElementById("app")!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
/** Combat speed (Options): 1 = normal, 0.5 = fast, 0.2 = very fast. */
/** Shown on the title screens. */
const VERSION = `v${__APP_VERSION__} · build ${__APP_BUILD__}`;
let speed = (() => { try { return Number(localStorage.getItem("dd2-speed") ?? "1") || 1; } catch { return 1; } })();
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms * speed));

let meta: Meta = loadMeta();
let run: Run | null = null;
let view: "splash" | "title" | "codex" = "splash";
/** The Options panel is open (from the splash screen). */
let optionsOpen = false;
/** Reset progress needs a second tap to confirm. */
let resetArmed = false;
let mode: Mode = "campaign";
let bagOpen = false;
/** The class the player tapped on the title screen (the popup before a run starts). */
let pendingOrigin: OriginId | null = null;
/** Which mode's story popup is open on the title screen. */
let storyOpen: Mode | null = null;
/** The How to play guide is open. */
let helpOpen = false;
/** The in-run menu (main menu / end run). */
let menuOpen = false;
/** Shown when the device loses its connection. */
let offlineOpen = false;
let endArmed = false;
/** The talent scene whose "You have levelled up!" popup has been seen. */
let ackedTalentScene: unknown = null;
let note = "";
let noteBad = false;
let recorded: { earned: number; unlocked: string[] } | null = null;
/** Renown already banked this run (a campaign win that continues into Endless). */
let banked = 0;

// Combat presentation state
let busy = false;
const dispHp: Record<"player" | "enemy", number | null> = { player: null, enemy: null };
const lastRoll: Record<"player" | "enemy", { face: number; name: string; kind: string; rolling?: boolean } | null> = { player: null, enemy: null };
let currentBattle: Battle | null = null;

const say = (msg: string | null, bad = true) => {
  note = msg ?? "";
  noteBad = bad;
};

// ---------- Small pieces ----------

/** Reactions that leave a lasting effect on whoever has them (stored as fight flags). */
const LASTING = ["rupture", "sepsis", "despair", "bastion", "frenzy", "clarity", "shatter", "thunderstrike"] as const;
const reactionInfo = (id: string) => REACTIONS.find(r => r.id === id)!;
const activeReactions = (f: Fighter) => LASTING.filter(id => (f.flags[id] ?? 0) > 0);

const statusChips = (f: Fighter) =>
  (Object.entries(f.statuses) as [StatusId, number][])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `<span class="chip" title="${esc(STATUS_INFO[s].text)}">${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} ${s === "consecrated" && n >= 99 ? "∞" : n}</span>`)
    .join("") +
  activeReactions(f).map(id => { const r = reactionInfo(id); return `<span class="chip rx" title="${esc(r.text)}">✴️ ${r.name}</span>`; }).join("") +
  (f.flags["smiteReady"] && wieldsHoly(f) ? `<span class="chip rx holy" title="Your Ward stopped an enemy status: your next Holy hit Smites for 20% of the enemy's Max HP">⚡ Smite ready</span>` : "");

/** Which of the hero's sources mention a status by name (gear, bonuses, relics, talents, origin, curses). */
function statusSources(h: Hero, status: StatusId): string[] {
  const word = new RegExp(`\\b${STATUS_INFO[status].name}\\b`, "i");
  const out: string[] = [];
  for (const id of Object.keys(h.f.items)) {
    let d;
    try { d = getItem(id); } catch { continue; }
    const text = `${d.text} ${(d as { legendary?: { reveal: string } }).legendary?.reveal ?? ""}`;
    if (word.test(text)) out.push(d.name);
  }
  // Spell faces on weapons: go by the weapon's tags (a Burn-tagged staff has fire spells, and so on).
  const TAG_OF: Partial<Record<StatusId, string>> = { burn: "Burn", poison: "Poison", bleed: "Bleed", chill: "Frost", shock: "Storm", static: "Storm" };
  for (const it of [h.equip.main, h.equip.off]) {
    if (!it) continue;
    const eb = effectiveBase(it);
    if (TAG_OF[status] && eb.faces?.some(f => f.run) && (eb.tags as string[]).includes(TAG_OF[status]!)) out.push(eb.name);
  }
  return [...new Set(out)];
}

/** The bag's Statuses & reactions panel: what's active now, what's happened this run, and what your build can set off. */
function reactionsPanel(r: Run) {
  const h = r.hero;
  const b = r.scene.t === "combat" ? r.scene.battle : null;
  const describe = (f: Fighter, who: string) => {
    const st = (Object.entries(f.statuses) as [StatusId, number][]).filter(([, n]) => n > 0);
    const rx = activeReactions(f);
    if (!st.length && !rx.length) return `<p class="sub">${who}: nothing active.</p>`;
    return `<p><b>${who}</b></p>${rx.map(id => { const x = reactionInfo(id); return `<p class="rxline">✴️ <b>${x.name}</b> — ${esc(x.text)} <span class="sub">(from ${STATUS_INFO[x.a].name} + ${STATUS_INFO[x.b].name} together)</span></p>`; }).join("")}
      ${st.map(([s, n]) => `<p>${STATUS_INFO[s].icon} <b>${STATUS_INFO[s].name}</b> ${n} — ${esc(STATUS_INFO[s].text)}</p>`).join("")}`;
  };
  const counts = (side: "you" | "foe") => REACTIONS.map(x => [x, h.f.persist[`rx:${side}:${x.id}`] ?? 0] as const).filter(([, n]) => n > 0);
  const smites = h.f.persist["rx:foe:smite"] ?? 0;
  const onFoe = [...counts("foe"), ...(smites ? [[{ name: "Smite" }, smites] as const] : [])];
  const onYou = counts("you");
  const history = onFoe.length || onYou.length
    ? `${onFoe.length ? `<p>On enemies: ${onFoe.map(([x, n]) => `<span class="chip">${x.name} ×${n}</span>`).join(" ")}</p>` : ""}${onYou.length ? `<p>On you: ${onYou.map(([x, n]) => `<span class="chip">${x.name} ×${n}</span>`).join(" ")}</p>` : ""}`
    : `<p class="sub">No reactions yet this run.</p>`;
  const guide = REACTIONS.map(x => {
    const a = statusSources(h, x.a as StatusId);
    const c = statusSources(h, x.b as StatusId);
    const yours = a.length > 0 && c.length > 0;
    const src = (s: StatusId, list: string[]) => `${STATUS_INFO[s].icon} ${STATUS_INFO[s].name}${list.length ? ` <span class="sub">(${list.map(esc).join(", ")})</span>` : ""}`;
    return `<div class="rxguide ${yours ? "yours" : ""}"><b>${x.name}</b>${yours ? ` <span class="chip rx">your build can set this off</span>` : ""}<br>
      ${src(x.a as StatusId, a)} + ${src(x.b as StatusId, c)}<br><span class="sub">${esc(x.text)}</span></div>`;
  }).join("");
  const wardSrc = statusSources(h, "ward");
  const holy = wieldsHoly(h.f);
  const smiteRow = `<div class="rxguide ${holy && wardSrc.length ? "yours" : ""}"><b>Smite</b>${holy && wardSrc.length ? ` <span class="chip rx">your build can set this off</span>` : ""}<br>
    ✨ Ward ${wardSrc.length ? `<span class="sub">(${wardSrc.map(esc).join(", ")})</span>` : ""} blocks an enemy's status + a ✝️ Holy weapon ${holy ? "" : `<span class="sub">(you have none)</span>`}<br>
    <span class="sub">Your next Holy hit deals 20% of the enemy's Max HP on top, once per fight.</span></div>`;
  return `<h2>Statuses & reactions</h2>
    <div class="panel">
      ${b ? `${describe(b.player, "On you")}${describe(b.enemy, `On ${b.enemy.name}`)}` : `<p class="sub">Statuses and reactions only last for a fight. Open this mid-fight to see what's active.</p>`}
      <p style="margin-top:10px"><b>This run</b></p>${history}
    </div>
    <details><summary>Reaction guide — two statuses on the same fighter react</summary><p class="sub">The names in brackets are things you own that mention that status.</p>${smiteRow}${guide}
      <p style="margin-top:8px"><b>Bursts</b> — pile one status high enough and it goes off on its own:</p>${THRESHOLDS.map(t => `<div class="rxguide"><b>${t.icon} ${t.name}</b><br><span class="sub">${esc(t.text)}</span></div>`).join("")}</details>
    <details><summary>All statuses</summary>${(Object.keys(STATUS_INFO) as StatusId[]).map(s => `<p>${STATUS_INFO[s].icon} <b>${STATUS_INFO[s].name}</b> — ${esc(STATUS_INFO[s].text)}</p>`).join("")}</details>`;
}

/** "Replaces X: Damage 4 → 6" for a found item against what's equipped in its slot. */
function compareHtml(h: Hero, it: GearItem): string {
  const slots = slotsFor(it, h);
  const target = slots.find(s => !h.equip[s]) ?? slots[0];
  const cur = h.equip[target];
  if (!cur) return `<div class="compare">Empty slot — equipping adds it.</div>`;
  const a = effectiveBase(it);
  const c = effectiveBase(cur);
  const rows: string[] = [];
  const diff = (label: string, from: number, to: number) => {
    if (from === to) return;
    rows.push(`${label} ${from} → <b class="${to > from ? "up" : "down"}">${to}</b>`);
  };
  if (a.damage !== undefined || c.damage !== undefined) diff("Damage", c.damage !== undefined ? weaponDamage(cur) : 0, a.damage !== undefined ? weaponDamage(it) : 0);
  diff("Armor", (c.armor ?? 0) + (c.armor ? Math.floor((cur.level - 1) / 2) : 0), (a.armor ?? 0) + (a.armor ? Math.floor((it.level - 1) / 2) : 0));
  diff("Max HP", c.maxHp ?? 0, a.maxHp ?? 0);
  diff("Bonuses", Object.keys(cur.bonuses).length + (cur.epic ? 1 : 0), Object.keys(it.bonuses).length + (it.epic ? 1 : 0));
  if (a.faces && c.faces && a.faces.length !== c.faces.length) diff("Die faces", c.faces.length, a.faces.length);
  if (a.twoHanded && h.equip.off && !keepsOffHand(h)) rows.push(`<span class="down">Two-handed: your off-hand goes to the bag</span>`);
  return `<div class="compare">Replaces <b>${esc(itemName(cur))}</b> (${rarityLabel(cur.rarity)}, lv ${cur.level})${rows.length ? `<br>${rows.join(" · ")}` : ""}</div>`;
}

function itemCard(it: GearItem, buttons = "", compare = false, equippedAs = "") {
  const b = baseOf(it.base);
  const hidden = b.legendary && !it.revealed;
  return `<div class="item r-${it.rarity} ${hidden ? "unrevealed" : ""} ${equippedAs ? "is-equipped" : ""}">
    ${equippedAs ? `<div class="eqbadge">⚔️ Equipped · ${esc(equippedAs)}</div>` : ""}
    <div class="meta">${rarityLabel(it.rarity)} · ${b.slot === "main" ? "weapon" : b.slot === "off" ? "off-hand" : b.slot} · level ${it.level}</div>
    <div class="nm">${esc(itemName(it))}</div>
    <ul>${itemLines(it).map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    ${compare && run ? compareHtml(run.hero, it) : ""}
    <div class="row">${buttons}</div>
  </div>`;
}

const nextMilestone = (f: number) => (f < WALL_FLOOR ? ` · a Horror at ${WALL_FLOOR}` : f < DEATH_FLOOR ? ` · DEATH at ${DEATH_FLOOR}` : f < END_FLOOR ? ` · the End at ${END_FLOOR}` : "");
const floorLabel = (r: Run) => (r.mode === "endless" ? `Floor <b>${r.floor}</b>${nextMilestone(r.floor)}` : `Floor <b>${Math.min(r.floor, FLOORS)}</b>/${FLOORS}`);

function hud(r: Run) {
  const h = r.hero;
  const f = h.f;
  const need = xpToLevel(h.level);
  // In a fight the HUD shrinks to one line: your HP lives in your panel at the bottom.
  if (r.scene.t === "combat") {
    const canDrink = h.potions > 0 && f.hp > 0 && f.hp < f.maxHp && !busy && !(r.scene.t === "combat" && r.scene.battle.over);
    return `<div class="hud compact"><div class="row"><b>${esc(ORIGINS[h.origin].name)}</b><span class="stat">${floorLabel(r)}</span><span class="grow"></span>
      <span class="stat">🪙 <b>${f.gold}</b></span>
      <button class="small" data-potion ${canDrink ? "" : "disabled"} title="Drink a potion (+12 HP)">🧪 ${h.potions}</button>${h.manaPotions ? `<button class="small" data-mana ${f.flags["mana"] || busy ? "disabled" : ""} title="Mana Potion: spells +50% and +1 stack for this fight">🔷 ${h.manaPotions}</button>` : ""}<button class="small" data-bag title="Inventory">🎒</button><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button><button class="small" data-menu title="Menu" ${busy ? "disabled" : ""}>☰</button></div></div>`;
  }
  return `<div class="hud">
    <div class="row"><b>${esc(ORIGINS[h.origin].name)}</b><span class="stat">Lv ${h.level}</span><span class="grow"></span><span class="stat">${floorLabel(r)}</span></div>
    <div class="bar"><i style="width:${Math.max(0, (f.hp / f.maxHp) * 100)}%"></i></div>
    <div class="row stat"><span><b>${Math.max(0, f.hp)}</b>/${f.maxHp} HP</span><span>⚔️ <b>${f.damage}</b>${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}</span><span>🛡️ <b>${f.armor}</b></span>
      <span>🪙 <b>${f.gold}</b></span><span>⚙️ <b>${h.scrap}</b></span><span>🧪 <b>${h.potions}</b></span><span>📜 <b>${h.scrolls}</b></span>${h.manaPotions ? `<span>🔷 <b>${h.manaPotions}</b></span>` : ""}${h.starmetal ? `<span>✴️ <b>${h.starmetal}</b></span>` : ""}${h.crimsonKeys ? `<span class="crimson-ink">🗝️ <b>${h.crimsonKeys}</b></span>` : ""}</div>
    <div class="bar xp"><i style="width:${(h.xp / need) * 100}%"></i></div>
    <div class="steps">${Array.from({ length: STEPS_PER_FLOOR + 1 }, (_, i) => `<i class="${i < r.step || (r.step === STEPS_PER_FLOOR && i < STEPS_PER_FLOOR) ? "done" : ""}"></i>`).join("")}</div>
    <div class="row" style="margin-top:6px"><button class="small" data-bag>🎒 Inventory</button>${h.potions && f.hp > 0 && f.hp < f.maxHp && !busy && r.scene.t !== "over" ? `<button class="small" data-potion>🧪 Potion (+12)</button>` : ""}<span class="grow"></span><button class="small" data-help title="How to play">❓</button><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button><button class="small" data-menu title="Menu">☰ Menu</button></div>
  </div>`;
}

// ---------- Title, Codex ----------

function titleScreen() {
  const locked = lockedIds(meta);
  const next = UNLOCK_TIERS.find(t => meta.renown < t.at);
  return `<div class="row"><button class="small" data-home aria-label="Back to title">←</button><h1 class="grow">Deck Dungeon <span>2</span></h1><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button></div>
  <p class="sub">You are what you wear and what you find. Your weapon is your die; gear, relics and talents bend it.</p>
  <div class="panel"><div class="row"><span>🏅 Renown <b>${meta.renown}</b></span><span class="sub">${meta.runs} runs · ${meta.wins} wins · best floor ${meta.bestFloor}</span><span class="grow"></span><button class="small" data-codex>📖 Codex</button><button class="small" data-help>❓ How to play</button></div>
    ${next ? `<p class="sub">Next unlock at ${next.at} Renown: <b>${esc(next.name)}</b> (${locked.size} items still locked)</p>` : `<p class="sub">Everything is unlocked.</p>`}</div>
  ${(() => { const sv = savedSummary(); return sv ? `<button class="primary continue" data-continue>▶ Continue your ${esc(ORIGINS[sv.origin as OriginId]?.name ?? sv.origin)} run · ${sv.mode === "endless" ? "Endless " : ""}floor ${sv.floor} · level ${sv.level}</button>` : ""; })()}
  <h2 class="bright">Mode</h2>
  <div class="modes">
    <div class="modebtn ${mode === "campaign" ? "active" : ""}" data-mode="campaign" role="button" tabindex="0"><span>🏰 Campaign · ${FLOORS} floors</span><span class="story-chip" data-story="campaign" role="button">📖 Story</span></div>
    <div class="modebtn ${mode === "endless" ? "active" : ""}" data-mode="endless" role="button" tabindex="0"><span>♾️ Endless · how deep?</span><span class="story-chip" data-story="endless" role="button">📖 Story</span></div>
  </div>
  <p class="sub">${mode === "campaign" ? `${FLOORS} floors, ${FLOORS} bosses — the Hollow King waits at the bottom.` : `Past floor ${FLOORS}, better rewards. The bosses you didn't meet return, and new ones are forged from the depths.`}</p>
  <h2 class="bright">Choose an origin</h2>
  <div class="cards">${(Object.keys(ORIGINS) as OriginId[]).map(o => {
    const og = ORIGINS[o];
    const p = getItem(og.passive);
    return `<button class="room" data-origin="${o}"><span class="ic">${{ warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨" }[o]}</span><b>${og.name}</b>
      <span class="sub">${esc(og.blurb)}</span><p>${og.hp} HP · ${og.kit.map(k => esc(baseOf(k).name)).join(", ")}</p><p><b style="display:inline">${esc(p.name)}:</b> ${esc(p.text)}.</p></button>`;
  }).join("")}</div>
  <p class="version">${VERSION}</p>`;
}

function codexScreen() {
  const found = new Set(meta.found);
  const locked = lockedIds(meta);
  const section = (title: string, defs: { id: string; name: string; text: string }[]) => {
    const n = defs.filter(d => found.has(d.id)).length;
    return `<h2>${title} · ${n}/${defs.length}</h2><div class="panel">${defs.map(d => found.has(d.id)
      ? `<p><b>${esc(d.name)}</b> — ${esc(fillText(d.text, 1))}</p>`
      : `<p class="sub">${locked.has(d.id) ? "🔒" : "???"}</p>`).join("")}</div>`;
  };
  return `<div class="row"><h1 class="grow">📖 Codex</h1><button data-back>Back</button></div>
    <p class="sub">Everything you've found across runs. Renown unlocks more of the dungeon:</p>
    <div class="panel">${UNLOCK_TIERS.map(t => `<p>${meta.renown >= t.at ? "✅" : "🔒"} <b>${esc(t.name)}</b> — ${t.at} Renown</p>`).join("")}</div>
    ${section("Weapons & gear", GEAR_BASES)}
    ${section("Legendaries", LEGENDARIES.map(l => ({ id: l.id, name: l.name, text: l.legendary!.reveal })))}
    ${section("Crimson", CRIMSON)}
    ${section("Keepsakes", KEEPSAKES)}
    ${section("Epic powers", EPIC_POWERS)}
    ${section("Bonuses", BONUSES)}
    ${section("Relics", RELICS)}
    ${section("Fusions", FUSION_RELICS.map(f => ({ ...f, text: `${f.text}. Recipe: ${FUSION_RECIPES.filter(r => r.out === f.id).map(r => `${getItem(r.a).name} + ${getItem(r.b).name}`).join("")}` })))}
    ${section("Talents", TALENTS)}
    ${section("Curses", CURSES)}`;
}

// ---------- Scenes ----------

function mapScene(r: Run) {
  const pips = fortunePips(r.floor);
  return `<div class="floorname">Floor ${r.floor} · ${esc(floorName(r.floor))}</div><div class="fortune" title="The deeper you delve, the better the odds of Rare, Epic and Legendary finds."><b>Fortune</b><span class="stars">${"✦".repeat(pips)}<span class="dim">${"✦".repeat(Math.max(0, 5 - pips))}</span></span><span class="hint">Deeper = better loot</span></div>
  <h2>${r.step >= STEPS_PER_FLOOR ? (r.floor === WALL_FLOOR ? "The Horror" : r.floor === DEATH_FLOOR ? "DEATH" : r.floor === END_FLOOR ? "The End" : "The boss awaits") : "Choose your path"}</h2>
  <div class="cards">${r.choices.map(c => `<button class="room ${c.startsWith("crimson") ? "crimson-room" : c === "goblin" ? "goblin-room" : ""}" data-room="${c}"><span class="ic">${c === "boss" && r.floor >= FLOORS ? "💀" : ROOM_INFO[c].icon}</span><b>${ROOM_INFO[c].name}</b><span class="sub">${esc(ROOM_INFO[c].text)}</span></button>`).join("")}</div>`;
}

function dieBox(who: "player" | "enemy", label: string) {
  const d = lastRoll[who];
  if (!d) return `<div class="diebox"><div class="who">${label}</div><div class="die ${who} empty">·</div><div class="facename">&nbsp;</div></div>`;
  return `<div class="diebox"><div class="who">${label}</div><div class="die ${who} ${d.kind} ${d.rolling ? "rolling" : ""}">${d.face}</div><div class="facename">${d.rolling ? "&nbsp;" : esc(d.name)}</div></div>`;
}

/** Guard warnings on foes, and the hero's hit streak. */
function guardChips(f: Fighter, who: "player" | "enemy") {
  if (who === "player") {
    const n = streakOf(f);
    const bk = f.persist["blessKind"] ?? 0;
    const bless = bk && (f.persist["blessFights"] ?? 0) > 0 ? `<span class="chip blessing" title="${esc(BLESSINGS[bk])}">🐲 ${esc(BLESSINGS[bk])} · ${f.persist["blessFights"]} fight${f.persist["blessFights"] === 1 ? "" : "s"}</span>` : "";
    const angel = (f.persist["angelFights"] ?? 0) > 0 ? `<span class="chip angel" title="Immune to negative statuses; heal 2 at the start of each fight">👼 Angelic Blessing · ${f.persist["angelFights"]} fight${f.persist["angelFights"] === 1 ? "" : "s"}</span>` : "";
    return angel + bless + (n >= 2 && hasStreak(f) ? `<span class="chip streak" title="Hits in a row this run. A Miss, Graze, or an attack that's evaded, dodged or fully blocked resets it">🔗 Streak ${n}</span>` : "");
  }
  if (f.flags["guarding"]) return `<span class="chip guardchip" title="Armor doubled this round. Crits, spells and statuses still get through">🧱 Guarding</span>`;
  if (f.flags["guardNext"]) return `<span class="chip guardchip" title="Next round its Armor doubles. Crits, spells and statuses still get through">🧱 Guards next round</span>`;
  return "";
}

/** Short numbers for the deep floors: 15926037312 → 15.9B. */
const big = (n: number) => (n < 1e5 ? String(n) : n < 1e6 ? `${(n / 1e3).toFixed(0)}K` : n < 1e9 ? `${(n / 1e6).toFixed(1)}M` : n < 1e12 ? `${(n / 1e9).toFixed(1)}B` : `${(n / 1e12).toFixed(1)}T`);

function fighterPanel(f: Fighter, who: "player" | "enemy") {
  const hp = dispHp[who] ?? f.hp;
  const intent = who === "enemy" && f.moves?.length ? f.moves[f.intent ?? 0] : null;
  const traits = who === "enemy" ? `${isUnholy(f) ? `<span class="chip holy" title="Holy weapons deal +50% to it">☠️ Unholy</span>` : ""}${currentBattle && tollOf(f, currentBattle.player) > 0 ? `<span class="chip toll" title="Attacking, Guarding, drinking a potion or using your class action each cost this much HP">⛓️ Each action costs ${tollOf(f, currentBattle.player)} HP</span>` : ""}${f.items["m_goblin"] ? `<span class="chip thief" title="Kill it before it escapes: everything it carries is yours">💨 Escapes after round 3 (${Math.max(0, 3 - (currentBattle?.round ?? 0))} left)</span>` : ""}${f.items["m_thief"] ? `<span class="chip thief" title="Kill it before it escapes: it takes 30% of your Gold, or drops 60% on top if you win">💰 Escapes after round 5 (${Math.max(0, 5 - (currentBattle?.round ?? 0))} left)</span>` : ""}${f.family === "Construct" ? `<span class="chip storm" title="Lightning hits it twice as hard: Shock doubles damage, Static and electric reactions deal double, Storm weapons +30%">⚡ Conductive</span>` : ""}${Object.keys(f.items).map(id => getItem(id)).map(d => `<span class="chip" title="${esc(d.text)}">${esc(d.name)}</span>`).join("")}` : "";
  return `<div class="panel fighter ${f.crimson ? "crimson-foe" : ""}" id="fp-${who}">
    <div class="row"><b>${esc(f.name)}</b>${f.title ? `<span class="sub">${esc(f.title)}</span>` : ""}<span class="grow"></span><span class="sub">${who === "enemy" ? `${f.family ?? ""}${f.crimson ? " · Crimson" : ""}${f.boss ? " · Boss" : f.champion ? " · Champion" : f.elite ? " · Elite" : ""}` : ""}</span></div>
    <div class="bar ${who === "enemy" ? "enemy" : ""}"><i style="width:${Math.min(100, Math.max(0, (hp / f.maxHp) * 100))}%"></i></div>
    <div class="sub">${big(Math.max(0, hp))}/${big(f.maxHp)} HP · ${who === "enemy" ? `Power ${f.items["m_death"] ? "☠️ most of your Max HP" : big(f.damage)}` : `Damage ${f.damage}${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}`} · Armor ${armorOf(f)}</div>
    <div class="chips">${guardChips(f, who)}${traits}${statusChips(f)}</div>
    ${intent ? `<div class="intent">Next: ${intent.icon} <b>${esc(intent.name)}</b> — ${esc(intent.text)}</div>` : ""}
  </div>`;
}

function combatScene(r: Run) {
  if (r.scene.t !== "combat") return "";
  const b = r.scene.battle;
  const e = b.enemy;
  return `<div class="combat">
    <div class="c-enemy">${fighterPanel(e, "enemy")}</div>
    <div class="c-dice dice-row">${dieBox("player", "You")}${dieBox("enemy", "Enemy")}</div>
    <div class="c-player">${fighterPanel(b.player, "player")}
    ${(b.player.statuses.stun ?? 0) > 0 ? `<div class="toast err">💫 You're Stunned: your next turn will be skipped.</div>` : ""}</div>
    <div class="c-actions"><div class="row actions ${busy ? "busy" : ""}">
      ${availableActions(r).map(a => `<button class="${a === "attack" ? "primary" : a === "flee" ? "" : a === "guard" ? "" : "classact"}" data-act="${a}" title="${esc(ACTION_INFO[a].tip)}">${ACTION_INFO[a].label(b.player)}</button>`).join("")}
    </div>
    ${Object.keys(r.hero.tonics ?? {}).length ? `<div class="row tonics">${Object.entries(r.hero.tonics!).map(([id, n]) => `<button class="small tonic" data-tonic="${id}" ${busy ? "disabled" : ""} title="${esc(TONICS[id].text)}">${TONICS[id].icon} ${esc(TONICS[id].name)}${n > 1 ? ` ×${n}` : ""}</button>`).join("")}</div><p class="center sub" style="margin:2px 0">Tonics don't use your turn.</p>` : ""}
    <p class="center sub diefaces">Your die: ${b.player.faces.map((f, i) => `${i + 1} ${f.name ?? f.kind}`).join(" · ")}</p></div>
    </div>
    <details><summary>Battle log</summary><div class="log">${b.log.slice().reverse().map(l => `<div class="${l.startsWith("—") ? "round" : ""}">${esc(l)}</div>`).join("")}</div></details>`;
}

/** Pick-one scenes (boss rewards, Iron chests with the Skeleton Key): every button is a choice that ends the pick. */
const pickButtons = (it: GearItem) =>
  `<button class="small primary" data-take="${it.uid}" data-how="equip">Choose · equip</button><button class="small" data-take="${it.uid}" data-how="pack">Choose · to bag</button><button class="small" data-scrapfound="${it.uid}">Choose · scrap (+${run ? scrapValue(run.hero, it) : 0} ⚙️)</button>`;

const takeButtons = (it: GearItem) =>
  `<button class="small primary" data-take="${it.uid}" data-how="equip">Equip</button><button class="small" data-take="${it.uid}" data-how="pack">To bag</button><button class="small" data-scrapfound="${it.uid}">Scrap</button>`;

function lootScene(r: Run) {
  if (r.scene.t !== "loot") return "";
  const s = r.scene;
  const extras = [s.gold ? `🪙 ${s.gold} Gold` : "", s.potions ? `🧪 Potion` : "", s.scrolls ? `📜 ${s.scrolls > 1 ? `${s.scrolls} Scrolls` : "Scroll"} of Revelation (yours)` : "", s.relic ? `💎 New relic: ${getItem(s.relic).name} — ${getItem(s.relic).text}` : ""].filter(Boolean);
  // After a won fight, the rewards sit in a framed Victory panel.
  const victory = s.title === "Victory" || s.title.startsWith("You caught") || s.title === "The Mimic's hoard";
  const key = s.crimsonKey ? `<div class="key-found">🗝️ CRIMSON KEY FOUND<span>A Crimson Vault will now be offered on your path.</span></div>` : "";
  const body = `${key}${extras.length ? `<div class="panel">${extras.map(x => `<p>${esc(x)}</p>`).join("")}</div>` : ""}
    <div class="cards" style="margin-top:10px">${s.items.map(it => itemCard(it, takeButtons(it), true)).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="primary" data-finish>${s.items.length ? "Leave the rest" : "Continue"}${s.then === "resplendent" ? " → open the Resplendent chest" : ""}</button></div>`;
  return victory ? `<div class="victory"><div class="victory-title">${esc(s.title === "Victory" ? "VICTORY" : s.title.toUpperCase())}</div>${body}</div>` : `<h2>${esc(s.title)}</h2>${body}`;
}

function pickScene(r: Run) {
  if (r.scene.t !== "pick") return "";
  const s = r.scene;
  const ks = s.keepsake ? getItem(s.keepsake) : null;
  return `<h2>${esc(s.title)}</h2>
    ${ks ? `<div class="item keepsake"><div class="meta">Keepsake · one at a time${r.hero.keepsake ? ` · replaces ${esc(getItem(r.hero.keepsake).name)}` : ""}</div><div class="nm">🕯️ ${esc(ks.name)}</div><p>${esc(ks.text)}.</p><div class="row"><button class="small primary" data-keepsake>Take the Keepsake</button></div><p class="sub">Free: it doesn't count as your pick.</p></div>` : ""}
    ${s.items.length > 1 ? `<div class="toast">Pick <b>one</b>. Equipping, bagging or scrapping an item is your choice — the others are lost.</div>` : ""}
    <div class="cards">${s.items.map(it => itemCard(it, s.items.length > 1 ? pickButtons(it) : takeButtons(it), true)).join("")}</div>
    ${s.passed?.length ? `<h2>You passed up</h2><div class="cards">${s.passed.map(it => itemCard(it)).join("")}</div>` : ""}
    <div class="row" style="margin-top:12px"><button data-finish>Take nothing</button></div>`;
}

function resplendentScene(r: Run) {
  if (r.scene.t !== "resplendent") return "";
  const s = r.scene;
  const monocle = Object.values(r.hero.equip).some(i => i?.base === "t_monocle");
  const cards = s.cards.map((c, i) => {
    if (s.picked === i) {
      return `<div class="flip"><div class="front">${c.kind === "scroll" ? `<div class="item r-legendary"><div class="nm">📜 Scroll of Revelation</div><p>Reveals one Legendary.</p></div>` : itemCard(c.item)}</div></div>`;
    }
    const tint = monocle && c.kind === "item" ? `tint-${c.item.rarity}` : "";
    const can = s.picked === null || s.glove;
    return `<div class="flip" ${can ? `data-card="${i}"` : ""}><div class="face back ${tint}">✦</div></div>`;
  }).join("");
  return `<div class="overlay"><div class="inner">
    <h1 class="center">Resplendent Chest</h1>
    <p class="center sub">${s.picked === null ? "Choose one card. The others will be lost." : s.glove ? "Gambler's Glove: give this up and pick another face-down card, or claim it." : "Claim your find."}</p>
    <div class="flipcards">${cards}</div>
    ${s.picked !== null ? `<div class="row" style="justify-content:center"><button class="primary" data-claim>Claim</button></div>` : ""}
  </div></div>`;
}

function talentScene(r: Run) {
  if (r.scene.t !== "talent") return "";
  return `<h2>Choose a talent</h2><div class="cards">${r.scene.options.map(id => {
    const t = getItem(id);
    const rank = (r.hero.talents[id] ?? 0) + 1;
    return `<button class="room talent" data-talent="${id}"><b>${esc(t.name)} ${"I".repeat(rank)}</b><span class="tdesc">${t.tags.join(" · ")}${t.rarity === "rare" ? " · Rare" : ""}</span><p class="teffect">${esc(t.text)}</p></button>`;
  }).join("")}</div>`;
}

function shopScene(r: Run) {
  if (r.scene.t !== "shop") return "";
  return `<h2>Merchant</h2><div class="cards">${r.scene.stock.map((e, i) => {
    const btn = `<button class="small primary" data-buy="${i}" ${e.sold ? "disabled" : ""}>${e.sold ? "Sold" : `Buy · ${e.price} 🪙`}</button>`;
    if (e.kind === "item" && e.item) return itemCard(e.item, btn, !e.sold);
    const label = e.kind === "potion" ? "🧪 Healing Potion — heal 12" : e.kind === "scroll" ? "📜 Scroll of Revelation — reveals a Legendary" : `💎 ${getItem(e.relic!).name} — ${getItem(e.relic!).text}`;
    return `<div class="item"><div class="nm">${esc(label)}</div><div class="row" style="margin-top:8px">${btn}</div></div>`;
  }).join("")}</div>
  <p class="sub">Bought gear goes to your bag; equip it from 🎒.</p>
  <h2>Sell</h2>
  ${r.scene.soldItem ? `<p class="sub">You sold ${esc(r.scene.soldItem)}. The Merchant won't buy anything else this visit.</p>`
    : `<p class="sub">The Merchant will buy one item per visit, for 40% of its price.</p><div class="cards">${allGear(r).map(it => itemCard(it, `<button class="small" data-sell="${it.uid}">Sell · ${sellPrice(it)} 🪙</button>`, false, equippedSlot(r, it))).join("")}</div>`}
  <div class="row" style="margin-top:12px">${r.shopRerolls >= MAX_SHOP_REROLLS ? `<button disabled>No rerolls left</button>` : `<button data-reroll>Reroll stock · ${shopRerollCost(r)} 🪙 (${MAX_SHOP_REROLLS - r.shopRerolls} left)</button>`}<button class="primary" data-leave>Leave</button></div>`;
}

const SLOT_LABEL: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket", trinket2: "Trinket", trinket3: "Trinket ★" };
/** "Main hand" etc. if the item is equipped, "" if it's in the bag. */
function equippedSlot(r: Run, it: GearItem): string {
  const s = EQUIP_SLOTS.find(k => r.hero.equip[k]?.uid === it.uid);
  return s ? SLOT_LABEL[s] : "";
}

function allGear(r: Run): GearItem[] {
  return [...EQUIP_SLOTS.map(s => r.hero.equip[s]).filter((x): x is GearItem => !!x), ...r.hero.backpack];
}

let forgeTab: "upgrade" | "offer" | "combine" | "transmute" = "upgrade";
const offerSel = new Set<number>();

function forgeScene(r: Run) {
  const h = r.hero;
  const fusions = availableFusions(r);
  const tabs = [["upgrade", "Upgrade & reroll"], ["offer", "Offering"], ["combine", "Combine"], ...(h.relics["transmuter"] ? [["transmute", "Transmute"]] : [])];
  let body = "";
  if (forgeTab === "upgrade") {
    body = `<p class="sub">Upgrading raises an item's level (more damage, stronger bonuses). Each reroll of the same item costs more.</p>
    <div class="cards">${allGear(r).map(it => itemCard(it, `<button class="small primary" data-up="${it.uid}">Upgrade · ${upgradeCost(it, r.hero)} ⚙️</button>${Object.keys(it.bonuses).length ? `<button class="small" data-rr="${it.uid}" ${rerollsLeft(it) ? "" : "disabled"}>${rerollsLeft(it) ? `Reroll · ${rerollCost(it, r.hero)} ⚙️ (${rerollsLeft(it)} left)` : "No rerolls left"}</button>` : ""}`, false, equippedSlot(r, it))).join("")}</div>`;
  } else if (forgeTab === "offer") {
    const chosen = h.backpack.filter(i => offerSel.has(i.uid));
    const odds = offeringOdds(offeringValue(chosen));
    body = `<p class="sub">Sacrifice two or more items from your bag for one new item. More items and rarer items mean better odds — but ${OFFERING_FAIL}% of the time the Forge takes everything and gives nothing.</p>
      ${chosen.length >= 2 ? `<div class="panel">Odds: <span class="chip">nothing ${OFFERING_FAIL}%</span> ${(["common", "uncommon", "rare", "epic", "legendary"] as const).filter(x => odds[x]).map(x => `<span class="chip">${x} ${Math.round((odds[x] ?? 0) * (100 - OFFERING_FAIL) / 100)}%</span>`).join(" ")}</div>` : ""}
      <div class="cards" style="margin-top:8px">${h.backpack.map(it => itemCard(it, `<button class="small ${offerSel.has(it.uid) ? "primary" : ""}" data-offersel="${it.uid}">${offerSel.has(it.uid) ? "✓ Offered" : "Offer"}</button>`)).join("") || `<p class="sub">Your bag is empty.</p>`}</div>
      <div class="row" style="margin-top:8px"><button class="primary" data-offer ${chosen.length >= 2 ? "" : "disabled"}>Sacrifice ${chosen.length} item${chosen.length === 1 ? "" : "s"}</button></div>`;
  } else if (forgeTab === "combine") {
    const pairs = combinablePairs(r);
    body = `<p class="sub">Combine two of the same item into one: a level higher, the best bonuses of both, and a 30% chance to rise a rarity (up to Epic).</p>
      ${pairs.length ? pairs.map(([a, b]) => `<div class="panel" style="margin-top:8px"><div class="cards">${itemCard(a, "", false, equippedSlot(r, a))}${itemCard(b, "", false, equippedSlot(r, b))}</div><button class="primary small" data-combine="${a.uid},${b.uid}">Combine</button></div>`).join("") : `<p class="sub">You don't have two of the same item.</p>`}`;
  } else {
    const commons = allGear(r).filter(i => i.rarity === "common");
    body = `<p class="sub">The Transmuter's Crucible turns a Common item into a Legendary of the same kind for ${TRANSMUTE_COST} ✴️ Starmetal (you have ${h.starmetal}). It arrives unrevealed.</p>
      <div class="cards">${commons.map(it => itemCard(it, `<button class="small primary" data-transmute="${it.uid}" ${h.starmetal >= TRANSMUTE_COST ? "" : "disabled"}>Transmute · ${TRANSMUTE_COST} ✴️</button>`, false, equippedSlot(r, it))).join("") || `<p class="sub">No Common items.</p>`}</div>`;
  }
  return `<h2>Forge</h2><p class="sub">⚙️ ${h.scrap} Scrap${h.starmetal ? ` · ✴️ ${h.starmetal} Starmetal` : ""}</p>
  ${fusions.length ? `<h2>Fusion!</h2><div class="cards">${fusions.map(x => { const o = getItem(x.out); return `<div class="item r-legendary"><div class="nm">${esc(o.name)}</div><p>${esc(getItem(x.a).name)} + ${esc(getItem(x.b).name)}</p><p>${esc(o.text)}</p><button class="primary small" data-fuse="${x.out}">Fuse</button></div>`; }).join("")}</div>` : ""}
  <div class="row" style="margin:8px 0">${tabs.map(([k, l]) => `<button class="small ${forgeTab === k ? "primary" : ""}" data-forgetab="${k}">${l}</button>`).join("")}</div>
  ${body}
  <div class="row" style="margin-top:12px"><button class="primary" data-leave>Leave</button></div>`;
}

function clearedScene(r: Run) {
  if (r.scene.t !== "cleared") return "";
  const s = r.scene;
  const next = s.floor + 1;
  return `<div class="victory cleared">
    <div class="victory-title">FLOOR ${s.floor} CLEARED</div>
    <p class="center">${esc(s.boss)} has fallen.</p>
    <p class="center sub">${r.stats.kills} kills · level ${r.hero.level} · ${r.hero.f.hp}/${r.hero.f.maxHp} HP</p>
    <p class="center" style="margin-top:10px">Below lies <b>Floor ${next} — ${esc(floorName(next))}</b>.</p>
    <div class="row" style="justify-content:center;margin-top:14px"><button class="primary big" data-descend>Descend to floor ${next} ↓</button></div>
    <p class="center sub" style="margin-top:8px">Check your 🎒 gear before you go.</p>
  </div>`;
}

function restScene(r: Run) {
  if (r.scene.t !== "rest") return "";
  const curses = Object.keys(r.hero.curses);
  return `<h2>Campfire</h2>${r.scene.done ? `<p>You rest a while.</p>` : `<div class="row"><button class="primary" data-rest="heal">Rest: heal 40% of Max HP</button>${curses.length ? `<button data-rest="cleanse">Cleanse ${esc(getItem(curses[0]).name)}</button>` : ""}</div>`}
  <div class="row" style="margin-top:12px"><button data-leave>Move on</button></div>`;
}

function eventScene(r: Run) {
  if (r.scene.t !== "event") return "";
  const s = r.scene;
  return `<h2>${s.ev.icon} ${esc(s.ev.title)}</h2><div class="panel"><p>${esc(s.ev.text)}</p>${s.found.length ? `<p class="sub">Waiting for you when you leave: <b>${s.found.length}</b> item${s.found.length > 1 ? "s" : ""}.</p>` : ""}</div>
    ${!s.result && s.note ? `<div class="toast">${esc(s.note)}</div>` : ""}
    ${s.result ? `<div class="toast">${esc(s.result)}</div><div class="row"><button class="primary" data-leave>Continue</button></div>`
      : `<div class="cards" style="margin-top:10px">${s.ev.options.map((o, i) => `<button class="room" data-event="${i}" ${eventOptionAvailable(r, i) ? "" : "disabled"}><b>${esc(o.label)}</b>${o.hint ? `<span class="sub">${esc(o.hint)}</span>` : ""}</button>`).join("")}</div>`}`;
}

function alchemistScene(r: Run) {
  if (r.scene.t !== "alchemist") return "";
  const s = r.scene;
  return `<h2>⚗️ The Alchemist</h2><div class="panel"><p>"Everything works on anything. Even the big ones. It isn't cheap."</p><p class="sub">Tonics are used in a fight, from the buttons under your actions. Using one doesn't take your turn. You have 🪙 <b>${r.hero.f.gold}</b>.</p></div>
    <div class="cards">${s.stock.map((e, i) => `<div class="item r-epic"><div class="nm">${TONICS[e.id].icon} ${esc(TONICS[e.id].name)}</div><p>${esc(TONICS[e.id].text)}.</p>
      <button class="small ${e.sold ? "" : "primary"}" data-tonicbuy="${i}" ${e.sold || r.hero.f.gold < e.price ? "disabled" : ""}>${e.sold ? "Sold" : `Buy · ${e.price} 🪙`}</button></div>`).join("")}</div>
    <div class="row" style="margin-top:12px"><button data-leave>Leave</button></div>`;
}

function smithScene(r: Run) {
  if (r.scene.t !== "smith") return "";
  const s = r.scene;
  return `<h2>⚒️ The Wandering Blacksmith</h2><div class="panel"><p>"Two jobs, free of charge. Pick your pieces."</p><p class="sub"><b>${s.uses}</b> free upgrade${s.uses === 1 ? "" : "s"} left. Each one raises an item's level by 1, like the Forge.</p></div>
    ${s.uses > 0 ? `<div class="cards">${allGear(r).map(it => itemCard(it, `<button class="small primary" data-smith="${it.uid}">Upgrade free · to level ${it.level + 1}</button>`)).join("")}</div>` : ""}
    <div class="row" style="margin-top:12px"><button class="${s.uses ? "" : "primary"}" data-leave>${s.uses ? "Leave the rest" : "Thank him and move on"}</button></div>`;
}

function confirmScene(r: Run) {
  if (r.scene.t !== "confirm") return "";
  const info = ROOM_INFO[r.scene.room];
  if (r.scene.room === "crimson_vault") {
    return `<h2>${info.icon} ${info.name}</h2><div class="panel crimson-foe"><p>${esc(info.text)}</p><p class="sub">Crimson bosses are far harder than a floor boss. Win and you choose between a Crimson item and two boss finds. Lose and <b>your run is over</b>. You have ${r.hero.crimsonKeys} key${r.hero.crimsonKeys === 1 ? "" : "s"}.</p></div>
    <div class="row" style="margin-top:12px"><button class="primary crimson-btn" data-risk="yes">Turn the key</button><button data-risk="no">Not yet</button></div>`;
  }
  return `<h2>${info.icon} ${info.name}</h2><div class="panel"><p>${esc(info.text)}</p><p class="sub">A Resplendent chest holds three face-down cards. Pick one; the rest are lost. Any of them could be Legendary.</p></div>
  <div class="row" style="margin-top:12px"><button class="primary" data-risk="yes">Accept the risk</button><button data-risk="no">Walk away</button></div>`;
}

function killerPanel(r: Run) {
  const k = r.killer!;
  const pct = k.maxHp ? Math.min(100, Math.max(0, (k.hp / k.maxHp) * 100)) : 0;
  return `<div class="panel fighter killer ${k.crimson ? "crimson-foe" : ""}">
    <div class="sub killer-tag">☠️ Slain by</div>
    <div class="row"><b>${esc(k.name)}</b>${k.title ? `<span class="sub">${esc(k.title)}</span>` : ""}<span class="grow"></span><span class="sub">${esc([k.family, k.crimson ? "Crimson" : "", k.rank].filter(Boolean).join(" · "))}</span></div>
    <div class="bar enemy"><i style="width:${pct}%"></i></div>
    <div class="sub">${big(k.hp)}/${big(k.maxHp)} HP left · ${k.name === "DEATH" ? "Power ☠️" : `Power ${big(k.damage)}`} · Armor ${k.armor}</div>
    <div class="chips">${k.traits.map(t => `<span class="chip">${esc(t)}</span>`).join("")}${k.statuses.map(([s, n]) => STATUS_INFO[s as StatusId] ? `<span class="chip">${STATUS_INFO[s as StatusId].icon} ${STATUS_INFO[s as StatusId].name} ${n}</span>` : "").join("")}</div>
  </div>`;
}

function overScene(r: Run) {
  if (r.scene.t !== "over") return "";
  const h = r.hero;
  const won = r.scene.won;
  return `<div class="banner ${won ? "won" : "lost"}">${r.finale ? "Nothing remains. You won everything." : won ? "The Hollow King falls. You win!" : r.abandoned ? "You gave up the run." : "You have fallen."}</div>
  ${!won && r.killer && !r.abandoned ? killerPanel(r) : ""}
  <div class="panel"><p>${r.mode === "endless" ? "Endless · " : ""}Floor ${r.floor} · Level ${h.level} · ${r.stats.kills} kills · ${r.stats.bosses} bosses · biggest hit ${r.stats.bestHit}</p>
  ${recorded ? `<p>🏅 +${recorded.earned} Renown (total ${meta.renown})${recorded.unlocked.length ? ` · Unlocked: <b>${recorded.unlocked.map(esc).join(", ")}</b>` : ""}</p>` : ""}
  <p class="sub">Final build:</p><div class="cards">${EQUIP_SLOTS.map(s => h.equip[s]).filter((x): x is GearItem => !!x).map(it => itemCard(it)).join("")}</div></div>
  <div class="row" style="margin-top:12px">${won && !r.finale ? `<button class="primary" data-endless>Keep delving · better rewards below</button>` : ""}<button class="${won ? "" : "primary"}" data-newrun>New run</button></div>`;
}

function bag(r: Run) {
  const h = r.hero;
  const inCombat = r.scene.t === "combat";
  const slotName: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket", trinket2: "Trinket", trinket3: "Trinket ★" };
  const equipped = openSlots(h).map(s => {
    const it = h.equip[s];
    return `<div><div class="sub">${slotName[s]}</div>${it ? itemCard(it, inCombat ? "" : `<button class="small" data-unequip="${s}">Unequip</button>${revealBtn(r, it)}`) : `<div class="item"><span class="sub">Empty</span></div>`}</div>`;
  }).join("");
  const pack = h.backpack.map(it => itemCard(it, inCombat ? "" : `${slotsFor(it, h).map(s => `<button class="small primary" data-equip="${it.uid}" data-slot="${s}">Equip${slotsFor(it, h).length > 1 ? ` (${slotName[s].toLowerCase()}${s === "trinket2" ? " 2" : ""})` : ""}</button>`).join("")}<button class="small" data-salvage="${it.uid}">Scrap</button>${revealBtn(r, it)}`, !inCombat)).join("");
  const list = (o: Record<string, number>) => Object.entries(o).map(([id, n]) => { const d = getItem(id); return `<p><b>${esc(d.name)}</b>${n > 1 ? ` ×${n}` : ""} — ${esc(fillText(d.text, n))}</p>`; }).join("") || `<p class="sub">None yet.</p>`;
  const passive = getItem(ORIGINS[h.origin].passive);
  const f = h.f;
  const crits = f.faces.filter(x => x.kind === "crit").length;
  const misses = f.faces.filter(x => x.kind === "miss").length;
  // Derived stats, so you can see what your build adds up to.
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  const sides = f.faces.length;
  const hitFaces = f.faces.filter(x => x.kind === "hit").length;
  const critChance = crits / sides + (hitFaces / sides) * ((f.critChance ?? 0) / 100);
  const missChance = (misses + f.faces.filter(x => x.kind === "graze").length * 0.5) / sides;
  const guardArmor = f.armor * ((f.items["r_fortress_heart"] ?? 0) > 0 ? 3 : 2);
  let healMul = 1;
  eachHook(f, "healMult", (fn, n) => (healMul *= fn(n)));
  let rxMul = 1;
  eachHook(f, "reactionMult", (fn, n) => (rxMul *= fn({} as never, f, n)));
  const staticCapNow = (f.items["t_boundless_static"] ?? 0) > 0 ? "∞" : (f.items["l_storm_rod"] ?? 0) > 0 || (f.items["lr_stormheart"] ?? 0) > 0 ? "20" : "10";
  const tile = (icon: string, label: string, value: string, tip = "") => `<div class="stile" title="${esc(tip)}"><span class="si">${icon}</span><span class="sl">${label}</span><b>${value}</b></div>`;
  const stats = `<div class="panel">
      <div class="row stat"><span>❤️ <b>${Math.max(0, f.hp)}</b>/${f.maxHp}</span><span>Lv <b>${h.level}</b> (${h.xp}/${xpToLevel(h.level)} XP)</span>
        <span>🪙 ${f.gold}</span><span>⚙️ ${h.scrap}</span><span>✴️ ${h.starmetal}</span><span>📜 ${h.scrolls}</span><span>🧪 ${h.potions}</span>${h.manaPotions ? `<span>🔷 ${h.manaPotions}</span>` : ""}</div>
      <div class="stiles">
        ${tile("⚔️", "Damage", `${f.damage}${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}`, "Main die damage (+ off-hand die)")}
        ${f.critDmg ? tile("💥", "Crit damage", `+${f.critDmg}%`, "Your Crits deal this much more") : ""}
        ${tile("🎯", "Crit chance", pct(critChance), `${crits} of ${sides} faces crit${f.critChance ? `, plus ${f.critChance}% Crit chance on Hits` : ""} (double damage, ignores Armor)`)}
        ${tile("🌫️", "Miss chance", pct(missChance), "Miss faces count fully, Grazes as half")}
        ${tile("🛡️", "Armor", `${f.armor}`, "Armor stops a percentage of each hit")}
        ${tile("🧱", "Damage stopped", `${pct(armorReduction(f.armor, false))}${canGuard(h) ? ` · ${pct(armorReduction(guardArmor, true))} guarding` : ""}`, canGuard(h) ? "How much of a hit your Armor stops, and while Guarding" : "How much of a hit your Armor stops (you need a shield to Guard)")}
        ${tile("💨", "Dodge", `${f.dodge ?? 0}%`, "Chance to dodge a hit entirely (max 60%)")}
        ${tile("💥", "Bash", `${f.bash ?? 0}%`, "Chance your weapon Bashes: Stun and +50% (max 30%)")}
        ${tile("🔮", "Spell Amp", `+${f.spellAmp ?? 0}%`, "Extra damage on spell faces")}
        ${f.dotAmp ? tile("🧪", "Status damage", `+${f.dotAmp}%`, "Burn, Bleed, Poison and Static on the enemy hurt more") : ""}
        ${tile("💚", "Healing", `${healMul >= 1 ? "+" : ""}${Math.round((healMul - 1) * 100)}%`, "Bonus to all healing you receive")}
        ${tile("✴️", "Reactions", `${rxMul >= 1 ? "+" : ""}${Math.round((rxMul - 1) * 100)}%`, "Bonus to reaction damage")}
        ${tile("🔋", "Static cap", staticCapNow, "Most Static you can stack on an enemy")}
      </div>
      <p class="sub" style="margin:6px 0 0">🎲 d${sides}: ${f.faces.map((x, i) => `${i + 1} ${x.name ?? x.kind}`).join(" · ")}</p></div>`;
  // Every slot you're using holds a Legendary (or Crimson): the whole bag glows.
  const slotsOpen = openSlots(h);
  const worn = slotsOpen.map(s => h.equip[s]);
  const twoHander = h.equip.main && effectiveBase(h.equip.main).twoHanded && !keepsOffHand(h);
  const needed = worn.filter((it, i) => !(slotsOpen[i] === "off" && twoHander && !it));
  const legendSet = needed.every(it => it && (it.rarity === "legendary" || it.rarity === "crimson"));
  return `<div class="overlay ${legendSet ? "legend-set" : ""}"><div class="inner">
    ${legendSet ? `<div class="legend-banner">★ Every piece you wear is a Legend ★</div>` : ""}
    <div class="row"><h1 class="grow">Inventory</h1><button data-closebag>Close</button></div>
    ${stats}
    ${inCombat ? `<p class="sub">You can look, but you can't change gear mid-fight.</p>${reactionsPanel(r)}` : ""}
    <p><b>${esc(passive.name)}</b> (origin) — ${esc(passive.text)}.</p>
    ${h.keepsake ? `<div class="item keepsake"><div class="meta">Keepsake</div><div class="nm">🕯️ ${esc(getItem(h.keepsake).name)}</div><p>${esc(getItem(h.keepsake).text)}.</p></div>`
      : `<div class="item keepsake empty-slot"><div class="meta">Keepsake</div><div class="nm">🕯️ Empty</div><p class="sub">Something rare could rest here. Bosses deep below sometimes leave one behind…</p></div>`}
    <div class="bag-extras">
      <div class="stile extra-tile key-tile"><span>🗝️</span><span><b>${h.crimsonKeys}</b> Crimson Key${h.crimsonKeys === 1 ? "" : "s"}<span class="sub">${h.crimsonKeys ? "A Crimson Vault will be on your path." : "Dropped by Crimson Elites, deep below."}</span></span></div>
      ${Object.keys(h.tonics ?? {}).length ? `<div class="stile extra-tile"><span>⚗️</span><span><b>Tonics</b><span class="sub">${Object.entries(h.tonics!).map(([id, n]) => `${TONICS[id].icon} ${esc(TONICS[id].name)}${n > 1 ? ` ×${n}` : ""}`).join(", ")}</span></span></div>` : ""}
      <div class="stile extra-tile scroll-tile"><span>📜</span><span><b>${h.scrolls}</b> Scroll${h.scrolls === 1 ? "" : "s"} of Revelation<span class="sub">${h.scrolls ? "Use one on a hidden Legendary below." : "Reveals a hidden Legendary's true power."}</span></span></div>
    </div>
    <h2>Blessings</h2>
    <div class="bag-extras">
      ${(h.f.persist["angelFights"] ?? 0) > 0 ? `<div class="stile extra-tile angel-tile"><span>👼</span><span><b>Angelic Blessing</b><span class="sub">Immune to negative statuses; heal 2 at the start of each fight · ${h.f.persist["angelFights"]} fight${h.f.persist["angelFights"] === 1 ? "" : "s"} left</span></span></div>` : ""}
      ${(h.f.persist["cloverChests"] ?? 0) > 0 ? `<div class="stile extra-tile clover-tile"><span>🍀</span><span><b>Four-Leaf Clover</b><span class="sub">Slightly better odds of Rare, Epic and Legendary from chests · ${h.f.persist["cloverChests"]} chest${h.f.persist["cloverChests"] === 1 ? "" : "s"} left</span></span></div>` : ""}
      ${(h.f.persist["blessFights"] ?? 0) > 0 ? `<div class="stile extra-tile bless-tile"><span>🐲</span><span><b>Dragon's Blessing</b><span class="sub">${esc(BLESSINGS[h.f.persist["blessKind"] ?? 0])} · ${h.f.persist["blessFights"]} fight${h.f.persist["blessFights"] === 1 ? "" : "s"} left</span></span></div>` : ""}
      ${(h.f.persist["angelFights"] ?? 0) <= 0 && (h.f.persist["blessFights"] ?? 0) <= 0 && (h.f.persist["cloverChests"] ?? 0) <= 0 ? `<div class="stile extra-tile empty-slot" style="grid-column: 1 / -1"><span>✨</span><span><b>None</b><span class="sub">Shrines and strange creatures in the dark sometimes grant blessings…</span></span></div>` : ""}
    </div>
    <h2>Equipped</h2><div class="cards">${equipped}</div>
    <h2>Backpack ${h.backpack.length}/${BACKPACK_SIZE}</h2><div class="cards">${pack || `<p class="sub">Empty.</p>`}</div>
    <h2>Relics</h2>${list(h.relics)}
    <h2>Talents</h2>${list(h.talents)}
    ${Object.keys(h.curses).length ? `<h2>Curses</h2>${list(h.curses)}` : ""}
    ${inCombat ? "" : reactionsPanel(r)}
  </div></div>`;
}

/** Wide screens: your equipped gear, always in view on the left. */
function sideEquip(r: Run) {
  const h = r.hero;
  const slotName: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket", trinket2: "Trinket", trinket3: "Trinket ★" };
  const rows = openSlots(h).map(s => {
    const it = h.equip[s];
    if (!it) return `<div class="se-item empty"><div class="se-slot">${slotName[s]}</div><span class="sub">Empty</span></div>`;
    const lines = itemLines(it).filter(l => !l.startsWith("Faces:") && !l.startsWith("✝️") && !l.startsWith("✨ Purify")).slice(0, 3);
    return `<div class="se-item r-${it.rarity}"><div class="se-slot">${slotName[s]} · ${rarityLabel(it.rarity)} · lv ${it.level}</div><div class="nm">${esc(itemName(it))}</div>
      ${lines.map(l => `<div class="se-line">${esc(l)}</div>`).join("")}</div>`;
  }).join("");
  const relics = Object.entries(h.relics).map(([id, n]) => `<span class="chip" title="${esc(fillText(getItem(id).text, n))}">${esc(getItem(id).name)}${n > 1 ? ` ×${n}` : ""}</span>`).join("");
  return `<aside class="side-equip"><h2>Equipped</h2>${rows}${relics ? `<h2>Relics</h2><div class="chips">${relics}</div>` : ""}</aside>`;
}

function revealBtn(r: Run, it: GearItem) {
  const b = baseOf(it.base);
  if (!b.legendary || it.revealed) return "";
  return `<button class="small primary" data-reveal="${it.uid}" ${r.hero.scrolls ? "" : "disabled"}>📜 Reveal</button>`;
}

// ---------- Popups: class choice, level up ----------

const ORIGIN_ICON: Record<OriginId, string> = { warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨" };
const ORIGIN_PITCH: Record<OriginId, string> = {
  warrior: "The Warrior wins by standing firm. Guarding is your craft — with a shield, or even with a two-handed weapon — and every Guard makes you hit harder. Once a fight, let loose a War Cry. Build into shields, heavy weapons and Armor and you become a wall that hits back.",
  rogue: "The Rogue wins by never being where the blow lands. Two dice, first strikes and crits — and Counter: brace, dodge the next attack and strike back with a hit that can't miss. Stack Dodge and crit gear and you'll dance through fights untouched.",
  mage: "The Mage wins by stacking statuses until they explode. Every face can be a spell; Burn, Chill, Static and more combine into reactions and bursts. With an elemental off-hand, raise an Elemental Barrier that throws your element back at attackers. Fragile early, devastating later.",
  cleric: "The Cleric wins by outlasting. Healing, Ward and Holy weapons that Smite the wicked — and Penance: kneel, take what they give you, and return every point of it in one blow. Survives what others can't, and turns suffering into damage."
};

const STORIES: Record<Mode, { icon: string; title: string; text: string }> = {
  campaign: { icon: "🏰", title: "Campaign", text: "Deep within a dungeon, a gate to the netherworld has been opened. Dark beasts and unspeakable horrors pour out from it. Your king has called upon you as the mightiest in the kingdom to venture into the dungeon and close the gate." },
  endless: { icon: "♾️", title: "Endless", text: "At the forsaken dungeon depths, a rift between worlds has been torn open. The fate of the lands has been sealed. You venture deep into the dungeon to take as many creatures of the dark with you before you are defeated." }
};

function helpPopup() {
  const sec = (t: string, items: string[]) => `<h2>${t}</h2><ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
  return `<div class="overlay"><div class="inner help">
    <div class="row"><h1 class="grow">❓ How to play</h1><button data-closehelp>Close</button></div>
    ${sec("The goal", [
      "Pick a class, then go down through <b>5 floors</b>. Each floor is a few rooms you choose from, then a boss. Beat the fifth boss to win.",
      "After winning you can keep going in <b>Endless</b> for better loot and harder bosses. Your run saves automatically at every path choice."])}
    ${sec("Your weapon is your die", [
      "Every weapon has its own die. Each face is a <b>Miss</b>, <b>Graze</b> (half damage), <b>Hit</b> or <b>Crit</b> (double damage, ignores Armor), and some faces cast spells or add effects. Bonus damage from passives, relics and trinkets only lands on a Hit or Crit.",
      "An off-hand weapon gives you a <b>second die</b>. Daggers, throwing knives, kunai and shuriken are built for it; ordinary weapons are clumsy there (60%). Grenades are thrown from the off-hand every 3rd round."])}
    ${sec("In a fight", [
      "<b>Attack</b>: roll and strike. <b>Guard</b> (needs a shield; Warriors can also Guard with a two-hander): double your Armor this round.",
      "Each class has its own move. <b>War Cry</b> (Warrior, once a fight): gain Might, Weaken the enemy. <b>Counter</b> (Rogue): +20% Dodge this round; dodge an attack and you strike back with a hit that can't miss. <b>Elemental Barrier</b> (Mage, needs an elemental off-hand): roll — 5–6 blocks the hit, 3–4 halves it, 1–2 blocks nothing; every roll gives attackers your element. <b>Penance</b> (Cleric): store what you suffer this round and add it to your next attack. Used at the wrong moment, they waste your turn.",
      "<b>Armor</b> stops a percentage of each hit. <b>Dodge</b> is a chance to avoid a hit entirely. Bosses show their next move — plan around it.",
      "🧪 Potions heal. 🔷 Mana Potions make your spells stronger for the fight."])}
    ${sec("Statuses and reactions", [
      "Burn, Poison, Bleed, Chill, Shock, Static and more pile up on enemies (and on you). Two statuses on the same fighter can <b>react</b> — Burn + Poison is Combustion, Static + Shock sets off all the Static at once.",
      "Pile up enough Chill, Bleed or Poison and it <b>bursts</b>. Open 🎒 mid-fight to see what's active and what your build can set off."])}
    ${sec("Loot", [
      "Rarities: Common, Uncommon, <span style='color:var(--rare)'>Rare</span>, <span style='color:var(--epic)'>Epic</span>, <span style='color:var(--legendary)'>Legendary</span> and <span style='color:var(--crimson)'>Crimson</span>. Legendaries arrive hidden — use a 📜 Scroll of Revelation to reveal them.",
      "<b>Resplendent chests</b> show face-down cards: pick one, lose the rest. The <b>Forge</b> upgrades, rerolls, combines and sacrifices gear. Merchants buy one item per visit.",
      "Relics are passive and stack. Each level-up offers a talent. <b>Fortune</b> ✦ grows every floor: deeper means better loot."])}
    ${sec("Tips", [
      "Your class is a starting point — you are what you wear. Build around what you find.",
      "Elites and Champions hit hard but drop great gear. Watch for <b>⛓️ Toll</b> enemies: every action you take costs HP.",
      "Read the enemy's chips (Unholy, Conductive, Thief…) — they tell you what works."])}
    ${helpGlossary()}
    <div class="row" style="justify-content:center;margin-top:14px"><button class="primary" data-closehelp>Got it</button></div>
  </div></div>`;
}

/** The full reference, built from the game's own data so it always matches what's in the game. */
function helpGlossary() {
  const neg = (Object.keys(STATUS_INFO) as StatusId[]).filter(x => (NEGATIVE_STATUSES as readonly string[]).includes(x));
  const pos = (Object.keys(STATUS_INFO) as StatusId[]).filter(x => !(NEGATIVE_STATUSES as readonly string[]).includes(x));
  const row = (icon: string, name: string, text: string) => `<p class="gl"><span class="gi">${icon}</span><b>${esc(name)}</b> — ${esc(text)}</p>`;
  const group = (title: string, body: string, open = false) => `<details class="gloss" ${open ? "open" : ""}><summary>${title}</summary>${body}</details>`;
  const enemyTraits = TRAITS.filter(t => !t.id.startsWith("m_") || ["m_toll", "m_thief", "m_lifedrink", "m_forge", "m_crackle"].includes(t.id));
  return `<h2>Reference</h2><p class="sub">Tap a heading to open it.</p>
  ${group("😖 Negative statuses (debuffs)", neg.map(x => row(STATUS_INFO[x].icon, STATUS_INFO[x].name, STATUS_INFO[x].text)).join(""))}
  ${group("💪 Positive statuses (buffs)", pos.map(x => row(STATUS_INFO[x].icon, STATUS_INFO[x].name, STATUS_INFO[x].text)).join(""))}
  ${group("✴️ Reactions — two statuses on the same fighter", REACTIONS.map(x => row(`${STATUS_INFO[x.a].icon}+${STATUS_INFO[x.b].icon}`, x.name, x.text)).join("") +
    row("💥", "Overpower", "Hit a Weak enemy while you have Might: +2 damage per Might, and it shakes off 1 Weak") +
    row("✝️", "Smite", "When your Ward blocks a status an enemy tried to put on you, your next hit with a Holy weapon also deals 20% of its Max HP (once per fight)"))}
  ${group("💥 Bursts — pile one status high enough", THRESHOLDS.map(t => row(t.icon, t.name, t.text)).join(""))}
  ${group("📊 Your stats", [
    row("⚔️", "Damage", "Added to every hit, then multiplied by the face: Graze ×½, Hit ×1, Crit ×2"),
    row("🛡️", "Armor", "Stops part of each hit: 3 Armor stops 21%, 10 stops 45%, 20 stops 60%, 30 stops 68%, 60 stops 77%. No cap, but each extra point counts for a little less. Crits and spells ignore it"),
    row("🧱", "Guard", "Needs a shield (Warriors can also Guard with a two-hander). Doubles your Armor this round"),
    row("💨", "Dodge", "A % chance to avoid a hit entirely (max 60%). Not the same as Evade: Dodge bonuses and Evade bonuses don't trigger each other"),
    row("💥", "Crit damage", "A % boost to the damage of your Crits (on top of the usual double)"),
    row("🎯", "Crit chance", "A % chance that a Hit becomes a Crit (max 50%), on top of your die's Crit faces"),
    row("💥", "Bash", "A % chance (from your weapon and rare relics only, max 30%) to Stun and deal +50%"),
    row("🧪", "Status damage", "Burn, Bleed, Poison and Static on the enemy deal this much more each time they tick. Mostly on robes for status builds"),
    row("🔮", "Spell Amp", "Spell faces (from wands, staffs and other magic weapons) deal this much more"),
    row("❤️", "Max HP", "Each level-up adds +3. Winning a fight heals 15%; beating a boss heals 30%"),
    row("🔋", "Static cap", "The most Static you can stack on an enemy (10, or more with certain items)")
  ].join(""))}
  ${group("🗡️ Weapons and gear", [
    row("🎲", "Faces", "Miss (nothing), Graze (half, and no passive or relic bonus damage), Hit, Crit (double, ignores Armor). Named faces add effects — spells, Bleed, Stun and so on"),
    row("✋", "Off-hand", "A weapon in your off-hand rolls a second die. Daggers, throwing knives, kunai, shuriken and wands are built for it; ordinary weapons deal only 60% there"),
    row("🙌", "Two-handed", "Takes both hands (unless you have Titan's Grip or the War Harness)"),
    row("💣", "Grenades", "Off-hand only. No damage — they apply a status, and are thrown on round 1 and every 3rd round after"),
    row("✝️", "Holy", "Holy weapons deal +50% to Undead, vampires, Crimson foes and anything that curses or Dooms, and can Smite"),
    row("✨", "Purify", "A face that strips every negative status off the enemy and deals 2× your Damage for each one (ignores Armor)"),
    row("🔨", "Heavy weapons", "Rare two-handed swords and axes. Every hit builds Stagger on the enemy (2 on a Crit). At 3 (Elites 4, bosses 5) it's Staggered: it loses its next action and your next hit deals double. Then it can't build again for 2 rounds"),
    row("🔥", "Sacrifice", "Holy Sacrifice weapons burn your current HP on each roll (a 1 burns 10%, a 6 burns 60%) and add it to the hit. Until your next roll, that same % of every hit you take heals you. Pair it with healing boosts"),
    row("🔨", "War hammers", "Heavy two-handed hammers (Rare and up): they build Stagger, always come with a Bash chance, and feed you Might"),
    row("🍀", "Four-Leaf Clover", "From the Lucky Pot, for all the Gold you carry: your next 4 chests have slightly better odds of Rare, Epic and Legendary"),
    row("👼", "Angelic Blessing", "From the Angelic Statue, for half your HP: lifts all curses, and for your next 2 fights you heal 2 at the start and no negative status can touch you"),
    row("🐲", "Dragon's Blessing", "From a blind old dragon, for 70% of your Gold: one blessing for your next 5 fights (more damage to, or less damage from, Elites, Champions or bosses)"),
    row("😤", "Reckless", "Some gear makes you deal more damage but also take more from every hit. It stacks, for better and worse"),
    row("⛓️", "Roll cap", "Some heavy gear stops your die rolling above 4 or 5; the Manacles do the same to the enemy's die"),
    row("🔗", "Hit streak", "Only counts while you have a streak relic, talent or trinket. Every Hit or Crit that gets through adds 1, and it carries across fights. A Miss, Graze, or an attack that's evaded, dodged or fully blocked resets it. Some relics, talents and trinkets grow with it"),
    row("🧱", "Guarding foes", "Some enemies and bosses raise their guard: Armor doubled plus a bit more for that round (you'll see it coming). Crits, spells and statuses ignore Armor, so they still get through"),
    row("🔮", "Elemental Barrier", "Mage off-hands with an element let the Mage raise a barrier: roll 5–6 to block (attackers get 4 stacks of the element), 3–4 to halve (2 stacks), 1–2 blocks nothing but still gives 2 stacks"),
    row("🕯️", "Keepsake", "One at a time, from bosses after floor 5. Each grants a powerful passive"),
    row("📜", "Legendaries", "Arrive hidden. Use a Scroll of Revelation to reveal them; until then they act like a plain item"),
    row("🩸", "Crimson", "Above Legendary. Only from Crimson bosses in Endless (Crimson Vaults need a Crimson Key from Crimson Elites)")
  ].join(""))}
  ${group("👹 Enemy traits", [
    row("☠️", "Unholy", "Undead, vampires, Crimson foes and anything that curses or Dooms: Holy weapons deal +50% to them"),
    row("⚡", "Conductive", "Constructs (golems, sentries): Shock, Static and electric reactions hit them twice as hard"),
    ...enemyTraits.map(t => row("•", t.name, t.text))
  ].join(""))}
  ${group("🧭 The dungeon", [
    row("✦", "Fortune", "Every floor deeper slightly improves your odds of Rare, Epic and Legendary finds"),
    row("💀", "Elites & Champions", "Tougher fights with random traits, and better loot"),
    row("✴️", "A Strange Presence", "A named, unique foe — once per run — that always drops an Epic or better"),
    row("💰", "Thieves", "Kill them within 5 rounds or they escape with 30% of your Gold; kill them and you get 60% on top"),
    row("🕯️", "Curses", "Lasting penalties from shrines, idols and cursing foes. A Campfire can cleanse one"),
    row("🔨", "Forge", "Upgrade or reroll gear with Scrap; sacrifice items in an Offering; Combine two of the same item"),
    row("🪙", "Merchant", "Buy gear, potions and scrolls, and sell one item per visit")
  ].join(""))}`;
}

function splashScreen() {
  const sv = savedSummary();
  return `<div class="splash">
    <div class="splash-dice">🎲</div>
    <h1 class="splash-title">DECK DUNGEON <span>2</span></h1>
    <p class="splash-tag">Venture into the depths of darkness. Slay the horrors within.</p>
    <div class="splash-buttons">
      ${musicBlocked() ? `<button class="small music-hint" data-startmusic>🎵 Tap for music</button>` : ""}
      <button class="primary big" data-play>${sv ? "▶ Play (continue available)" : "▶ Play"}</button>
      <button class="big" data-help>❓ How to play</button>
      <button class="big" data-options>⚙️ Options</button>
    </div>
    <p class="sub splash-foot">🏅 ${meta.renown} Renown · ${meta.runs} runs · ${meta.wins} wins</p>
    <p class="version">${VERSION}</p>
  </div>`;
}

function musicSliders(only?: Track) {
  const sl = (k: Track, label: string) => `<label class="music-row"><span>${label}</span><input type="range" min="0" max="100" step="5" value="${Math.round(musicVolume(k) * 100)}" data-music="${k}"><b data-musicval="${k}">${Math.round(musicVolume(k) * 100)}%</b></label>`;
  return `<div class="music-sliders"><div class="row"><button class="small ${isMusicOff() ? "" : "primary"}" data-togglemusic>${isMusicOff() ? "🎵 Music off" : "🎵 Music on"}</button></div>${!only || only === "title" ? sl("title", "🎵 Menu music") : ""}${!only || only === "game" ? sl("game", "🎵 Gameplay music") : ""}</div>`;
}

function optionsPopup() {
  const sp = (v: number, label: string) => `<button class="${speed === v ? "primary" : ""}" data-speed="${v}">${label}</button>`;
  return `<div class="overlay popup-wrap"><div class="popup">
    <button class="small closex" data-closeoptions aria-label="Close">✕</button>
    <h1 class="center bigname">⚙️ Options</h1>
    <h2>Sound</h2>
    <div class="row"><button data-mute class="${isMuted() ? "" : "primary"}">${isMuted() ? "🔇 Sound off" : "🔊 Sound on"}</button></div>
    ${musicSliders()}
    <h2>Combat speed</h2>
    <div class="row">${sp(1, "Normal")}${sp(0.5, "Fast")}${sp(0.2, "Very fast")}</div>
    <h2>Progress</h2>
    <p class="sub">Renown, unlocks, the Codex and any saved run are kept in this browser.</p>
    <div class="row"><button class="${resetArmed ? "danger" : ""}" data-reset>${resetArmed ? "Tap again to erase everything" : "Reset all progress"}</button></div>
    <div class="row" style="justify-content:center;margin-top:14px"><button class="primary" data-closeoptions>Done</button></div>
  </div></div>`;
}

function storyPopup(m: Mode) {
  const st = STORIES[m];
  return `<div class="overlay popup-wrap"><div class="popup story-pop">
    <button class="small closex" data-closestory aria-label="Close">✕</button>
    <div class="center bigicon">${st.icon}</div>
    <h1 class="center bigname">${st.title}</h1>
    <p class="story-text">${esc(st.text)}</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-closestory>Close</button></div>
  </div></div>`;
}

let winSeen = false;
/** A story moment: a centered popup with an icon, a title and a little text. */
function offlinePopup() {
  return `<div class="overlay popup-wrap"><div class="popup offline-pop">
    <div class="center bigicon">📡</div>
    <h1 class="center bigname">You're offline</h1>
    <p class="center">No worries: the game runs on your device, so you can keep playing.</p>
    <ul class="beat-list">
      <li>💾 Your run still saves on this device at every path choice.</li>
      <li>🎵 Music that hasn't loaded yet may stay quiet until you're back online.</li>
      <li>✨ New updates will wait until you reconnect.</li>
    </ul>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-closeoffline>Keep playing</button></div>
  </div></div>`;
}

function runMenu(r: Run) {
  const atMap = r.scene.t === "map";
  const over = r.scene.t === "over";
  return `<div class="overlay popup-wrap"><div class="popup">
    <h2>☰ Menu</h2>
    <div class="col" style="gap:8px;display:flex;flex-direction:column">
      <button class="primary big" data-closemenu>▶ Resume</button>
      <button class="big" data-mainmenu>🏠 Main menu</button>
      ${musicSliders("game")}
      <p class="sub center">${over ? "This run is over." : atMap ? "Your run is saved here; pick it up with Continue." : "Your run is saved at the last path choice; Continue picks it up from there."}</p>
      ${over ? "" : `<button class="big ${endArmed ? "danger" : ""}" data-endrun>${endArmed ? "Tap again to end this run" : "🏳️ End run"}</button>
      <p class="sub center">Ending the run counts as a death: you keep the Renown you've earned, but the run is gone.</p>`}
    </div></div></div>`;
}

function storyBeat(p: { icon: string; title: string; text: string; list?: string[] }, close = "data-closepopup") {
  return `<div class="overlay popup-wrap"><div class="popup story-pop beat">
    <div class="center bigicon">${p.icon}</div>
    <h1 class="center bigname">${esc(p.title)}</h1>
    <p class="story-text">${esc(p.text)}</p>
    ${p.list ? `<ul class="beat-list">${p.list.map(x => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" ${close}>Continue</button></div>
  </div></div>`;
}

function originPopup(o: OriginId) {
  const og = ORIGINS[o];
  const p = getItem(og.passive);
  return `<div class="overlay popup-wrap"><div class="popup">
    <button class="small closex" data-closeorigin aria-label="Close">✕</button>
    <h1 class="center bigname">${og.name}</h1>
    <div class="center bigicon">${ORIGIN_ICON[o]}</div>
    <p>${esc(ORIGIN_PITCH[o])}</p>
    <p class="sub"><b>${esc(p.name)}:</b> ${esc(p.text)}.</p>
    <p class="sub">Starts with ${og.hp} HP · ${og.kit.map(k => esc(baseOf(k).name)).join(", ")}</p>
    ${savedSummary() ? `<p class="sub warn">Starting a new run replaces your saved run.</p>` : ""}
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-start>Start run</button><button data-closeorigin>Back</button></div>
  </div></div>`;
}

/** "New relic!" popup: a relic is easy to miss in a line of text, so each one gets its own moment. */
function relicPopup(id: string, more: number) {
  if (id.startsWith("scroll:")) {
    const n = Number(id.split(":")[1]) || 1;
    const hidden = run ? [...EQUIP_SLOTS.map(s => run!.hero.equip[s]), ...run.hero.backpack].filter(it => it && !it.revealed).length : 0;
    return `<div class="overlay popup-wrap"><div class="popup relic-pop scroll-pop r-legendary">
    <div class="center relic-gem">📜</div>
    <div class="center relic-kicker scroll-kicker">${n > 1 ? `${n} SCROLLS` : "NEW SCROLL"}</div>
    <h1 class="center bigname nm">Scroll of Revelation</h1>
    <p class="center">Reveals a hidden Legendary's true power. You have <b>${run?.hero.scrolls ?? n}</b>.</p>
    <p class="center sub">${hidden ? `You're carrying ${hidden} unrevealed item${hidden > 1 ? "s" : ""}: open 🎒 Inventory to read one.` : "Keep it for when you find a Legendary: use it from 🎒 Inventory."}</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-relicok>${more ? `Next (${more} more)` : "Got it"}</button></div>
  </div></div>`;
  }
  const it = getItem(id);
  const rar = it.rarity ?? "common";
  const n = run?.hero.relics[id] ?? 1;
  return `<div class="overlay popup-wrap"><div class="popup relic-pop r-${rar}">
    <div class="center relic-gem">💎</div>
    <div class="center relic-kicker">NEW RELIC</div>
    <h1 class="center bigname nm">${esc(it.name)}${n > 1 ? ` ×${n}` : ""}</h1>
    <p class="center sub" style="text-transform:capitalize">${esc(rar)} relic · always active</p>
    <p class="center">${esc(fillText(it.text, n))}</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-relicok>${more ? `Next relic (${more} more)` : "Got it"}</button></div>
  </div></div>`;
}
const celebratedRelic = new Set<string>();
const celebratedPopup = new WeakSet<object>();

const celebratedLevel = new WeakSet<object>();
function levelUpPopup(r: Run) {
  return `<div class="overlay popup-wrap"><div class="popup levelup">
    <h1 class="center bigname">You have levelled up!</h1>
    <p class="center">Level <b>${r.hero.level}</b> · +3 Max HP</p>
    <div class="row" style="justify-content:center;margin-top:12px"><button class="primary" data-choosetalent>Choose talent</button></div>
  </div></div>`;
}

const ACTION_INFO: Record<Action, { label: (p: Fighter) => string; tip: string }> = {
  attack: { label: () => "Attack", tip: "Roll your die and strike." },
  guard: { label: () => "Guard", tip: "Double your Armor this round; Armor can stop a whole hit. Needs a shield (a Warrior can Guard with a two-hander)." },
  counter: { label: () => "Counter", tip: "Uses your turn. +20% Dodge this round; if you Dodge an attack, strike back with a hit that can't miss. If you're hit, you're off-balance for your next attack." },
  barrier: { label: () => "Elemental Barrier", tip: "Uses your turn. Roll: 5–6 blocks every hit this round and gives attackers 4 stacks of your off-hand's element; 3–4 halves them and gives 2; 1–2 blocks nothing but still gives 2." },
  penance: { label: p => `Penance${p.flags["penanceStore"] ? ` (${p.flags["penanceStore"]})` : ""}`, tip: "Uses your turn. Damage and negative statuses you take this round are stored; your next attack adds it all. A kill with it heals you." },
  warcry: { label: () => "War Cry", tip: "Once per fight. Uses your turn: gain Might and Weaken the enemy." },
  flee: { label: () => "Flee", tip: "Leave the fight (not Elites or bosses)." }
};

// ---------- Render ----------

// ---------- Loot fanfare ----------
const celebrated = new Set<number>();
let fanfareEl: HTMLElement | null = null;
/** Fanfares waiting their turn: a level-up and a big drop play one after the other, never on top of each other. */
const fanfareQueue: [string, string | undefined, boolean][] = [];
function celebrate(rarity: string, label?: string, banner = true) {
  if (!["rare", "epic", "legendary", "crimson", "epic_crimson", "legendary_crimson"].includes(rarity)) return;
  if (fanfareEl) { fanfareQueue.push([rarity, label, banner]); return; }
  playFanfare(rarity, label, banner);
}
function playFanfare(rarity: string, label?: string, banner = true) {
  // The Abyss tiers ride on the Crimson fanfare, bigger and in their own colours.
  if (rarity.endsWith("_crimson")) { label ??= rarityLabel(rarity).toUpperCase(); rarity = `crimson ${rarity}`; }
  const el = document.createElement("div");
  el.className = `fanfare ${rarity}`;
  const isCrimson = rarity.startsWith("crimson");
  const abyss = rarity.includes("_crimson");
  const sparks = rarity === "legendary" || isCrimson
    ? Array.from({ length: abyss ? 48 : 22 }, () => {
        const a = Math.random() * Math.PI * 2, d = 120 + Math.random() * 220;
        return `<i class="spark" style="left:50%;top:38%;--dx:${Math.cos(a) * d}px;--dy:${Math.sin(a) * d}px;animation-delay:${Math.random() * 0.25}s"></i>`;
      }).join("")
    : "";
  el.innerHTML = rarity === "rare" ? "" : `${banner ? `<div class="banner">${esc(label ?? rarity.toUpperCase())}</div>` : ""}${sparks}`;
  document.body.appendChild(el);
  fanfareEl = el;
  if (rarity !== "epic") navigator.vibrate?.(abyss ? [120, 60, 120, 60, 120, 60, 400] : isCrimson ? [80, 50, 80, 50, 200] : [60, 40, 120]);
  sfx(isCrimson ? "crimson" : rarity === "legendary" ? "legendary" : rarity === "epic" ? "epic" : "chest");
  if (abyss) setTimeout(() => sfx("legendary"), 600);
  setTimeout(() => {
    el.remove();
    if (fanfareEl === el) fanfareEl = null;
    // Next in line, after a short breath.
    const next = fanfareQueue.shift();
    if (next) setTimeout(() => (fanfareEl ? fanfareQueue.unshift(next) : playFanfare(...next)), 250);
  }, abyss ? 6500 : isCrimson ? 4300 : rarity === "rare" ? 1300 : 3500);
}
const RANK: Record<string, number> = { rare: 0.5, epic: 1, legendary: 2, crimson: 3, epic_crimson: 4, legendary_crimson: 5 };
/** Celebrate the best newly-seen Epic/Legendary in the current scene, once per item. */
function celebrateScene(r: Run) {
  const s = r.scene;
  const found: GearItem[] = s.t === "loot" || s.t === "pick" ? s.items
    : s.t === "resplendent" && s.picked !== null && s.cards[s.picked].kind === "item" ? [(s.cards[s.picked] as { item: GearItem }).item] : [];
  let best: GearItem | null = null;
  for (const it of found) {
    if (celebrated.has(it.uid) || !RANK[it.rarity]) continue;
    celebrated.add(it.uid);
    if (!best || RANK[it.rarity] > RANK[best.rarity]) best = it;
  }
  if (best) celebrate(best.rarity);
}

function render() {
  app.classList.toggle("with-side", !!run);
  render2();
  // The offline notice sits on top of everything, wherever you are.
  if (offlineOpen) {
    app.insertAdjacentHTML("beforeend", offlinePopup());
    app.querySelectorAll<HTMLElement>("[data-closeoffline]").forEach(el => (el.onclick = () => { offlineOpen = false; render(); }));
  }
}

function render2() {
  // Not in a run: a new build can load straight away.
  if (!run && updateReady()) applyUpdate();
  playMusic(run ? "game" : "title");
  if (!run) {
    app.innerHTML = view === "splash" ? `${splashScreen()}${optionsOpen ? optionsPopup() : ""}${helpOpen ? helpPopup() : ""}` : view === "codex" ? codexScreen() : `${titleScreen()}${pendingOrigin ? originPopup(pendingOrigin) : ""}${storyOpen ? storyPopup(storyOpen) : ""}${helpOpen ? helpPopup() : ""}`;
    bind();
    return;
  }
  const r = run;
  const s = r.scene;
  // Autosave at every path choice; a finished run clears the save.
  if (s.t === "map") saveRun(r, banked);
  // A new build is out: install it now that the run is safely saved at a path choice.
  if (updateReady() && (s.t === "map" || s.t === "over")) { applyUpdate(); }
  if (s.t === "over") clearSave();
  if (s.t === "combat" && s.battle !== currentBattle) {
    currentBattle = s.battle;
    lastRoll.player = lastRoll.enemy = null;
    dispHp.player = dispHp.enemy = null;
  }
  if (s.t === "over" && !recorded) {
    recorded = recordRun(meta, r, banked);
    banked += recorded.earned;
    sfx(s.won ? "win" : "lose");
  }
  const body =
    s.t === "map" ? mapScene(r) : s.t === "combat" ? combatScene(r) : s.t === "loot" ? lootScene(r) : s.t === "pick" ? pickScene(r)
    : s.t === "resplendent" ? mapScene(r) : s.t === "talent" ? talentScene(r) : s.t === "shop" ? shopScene(r) : s.t === "forge" ? forgeScene(r)
    : s.t === "cleared" ? clearedScene(r)
    : s.t === "smith" ? smithScene(r)
    : s.t === "alchemist" ? alchemistScene(r)
    : s.t === "rest" ? restScene(r) : s.t === "confirm" ? confirmScene(r) : s.t === "event" ? eventScene(r) : overScene(r);
  celebrateScene(r);
  const msg = [r.message, note].filter(Boolean);
  // Level up: once the rewards are picked, a fanfare and a popup before the talent choice.
  const levelPopup = s.t === "talent" && ackedTalentScene !== s;
  if (levelPopup && !celebratedLevel.has(s)) { celebratedLevel.add(s); celebrate("legendary", "LEVEL UP!"); }
  const winPopup = s.t === "over" && s.won && r.mode === "campaign" && !winSeen;
  // Story popups can carry their own fanfare (DEATH, the End).
  if (r.popup?.fanfare && !celebratedPopup.has(r.popup)) { celebratedPopup.add(r.popup); celebrate(r.popup.fanfare, r.popup.title, false); }
  // A new relic gets its own popup and a little fanfare (after any level-up popup).
  const relicNow = !levelPopup && !winPopup && s.t !== "combat" && r.relicNews?.length ? r.relicNews[0] : undefined;
  if (relicNow) {
    const key = `${relicNow}:${r.hero.relics[relicNow]}:${r.relicNews!.length}:${r.floor}:${r.step}`;
    if (!celebratedRelic.has(key)) {
      celebratedRelic.add(key);
      if (relicNow.startsWith("scroll:")) celebrate("epic", "SCROLL OF REVELATION", false);
      else celebrate(["rare", "epic", "legendary"].includes(getItem(relicNow).rarity ?? "") ? (getItem(relicNow).rarity as string) : "rare", "NEW RELIC", false);
    }
  }
  app.innerHTML = `${helpOpen ? helpPopup() : ""}${r.popup && !levelPopup ? storyBeat(r.popup) : ""}${winPopup ? storyBeat({ icon: "👑", title: "Victory!", text: "Your efforts have proven true! The gates of darkness have been shut. The kingdom has been saved!" }, "data-closewin") : ""}${levelPopup ? levelUpPopup(r) : ""}${relicNow ? relicPopup(relicNow, r.relicNews!.length - 1) : ""}${sideEquip(r)}${hud(r)}${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && noteBad && note ? "err" : ""}">${esc(m)}</div>`).join("")}${body}${s.t === "resplendent" ? resplendentScene(r) : ""}${bagOpen ? bag(r) : ""}${menuOpen ? runMenu(r) : ""}`;
  bind();
}

// ---------- Combat playback ----------

function floater(who: "player" | "enemy", text: string, cls: string) {
  const el = document.getElementById(`fp-${who}`);
  if (!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement("div");
  f.className = `floater ${cls}`;
  f.textContent = text;
  f.style.left = `${r.left + r.width / 2 + (Math.random() * 60 - 30)}px`;
  f.style.top = `${r.top + window.scrollY + r.height * 0.35}px`;
  document.body.appendChild(f);
  setTimeout(() => f.remove(), 1300);
}

function shake(who: "player" | "enemy", big = false) {
  const el = document.getElementById(`fp-${who}`);
  el?.classList.remove("shake");
  void el?.offsetWidth;
  el?.classList.add("shake");
  if (big) {
    app.classList.remove("screen-shake");
    void app.offsetWidth;
    app.classList.add("screen-shake");
  }
}

async function playFx(b: Battle) {
  while (b.fx.length) {
    const e = b.fx.shift()!;
    await showFx(e);
  }
}

async function showFx(e: Fx) {
  const who = e.who;
  switch (e.kind) {
    case "roll": {
      const side = e.who;
      const sides = e.sides ?? 6;
      for (let i = 0; i < 6; i++) {
        lastRoll[side] = { face: 1 + Math.floor(Math.random() * sides), name: "", kind: "hit", rolling: true };
        render();
        sfx("roll");
        await sleep(60);
      }
      lastRoll[side] = { face: e.face!, name: `${e.faceName}${e.offhand ? " (off-hand)" : ""}`, kind: e.faceKind ?? "hit" };
      render();
      await sleep(380);
      return;
    }
    case "dmg":
      dispHp[who] = (dispHp[who] ?? hpOf(who) + (e.value ?? 0)) - (e.value ?? 0);
      render();
      floater(who, `-${e.value}`, "dmg");
      shake(who);
      sfx("hit");
      await sleep(420);
      return;
    case "heal":
      dispHp[who] = (dispHp[who] ?? hpOf(who) - (e.value ?? 0)) + (e.value ?? 0);
      render();
      floater(who, `+${e.value}`, "heal");
      sfx("heal");
      await sleep(320);
      return;
    case "crit": floater(who, "CRIT!", "crit"); shake(who, true); sfx("crit"); await sleep(260); return;
    case "miss": floater(who, e.text ?? "Miss", "miss"); sfx("miss"); await sleep(420); return;
    case "block": floater(who, `${e.icon ?? "🛡️"} ${e.text ?? "Blocked"}`, "block"); sfx("block"); await sleep(380); return;
    case "status": render(); floater(who, `${e.icon ?? ""} ${e.text ?? ""}`, (e.value ?? 0) < 0 ? "status-neg" : "status-pos"); sfx("status"); await sleep(330); return;
    case "reaction": render(); floater(who, `💥 ${e.text}`, "reaction"); shake(who, true); sfx("reaction"); await sleep(520); return;
    case "text": floater(who, `${e.icon ?? ""} ${e.text ?? ""}`, "text"); await sleep(380); return;
  }
}

function hpOf(who: "player" | "enemy") {
  if (!run || run.scene.t !== "combat") return 0;
  return who === "player" ? run.scene.battle.player.hp : run.scene.battle.enemy.hp;
}

/** Play one round beat by beat: you, then the monster, then the end of the round. */
async function playTurn(action: Action) {
  if (!run || run.scene.t !== "combat" || busy) return;
  const r = run;
  if (!availableActions(r).includes(action)) return;
  const b = (r.scene as { battle: Battle }).battle;
  busy = true;
  const startEnemyHp = b.enemy.hp;
  const syncHp = () => { dispHp.player = b.player.hp; dispHp.enemy = b.enemy.hp; };
  syncHp();
  render();
  const first = beginRound(b);
  await playFx(b);
  const phase = async (fn: () => void) => {
    if (b.over) return;
    syncHp();
    fn();
    // Start displayed HP from where it was before this phase, then let the effects move it.
    await playFx(b);
    syncHp();
    render();
  };
  if (first) await phase(() => enemyPhase(b));
  await phase(() => heroPhase(b, action));
  if (!first && !b.over) {
    await sleep(350);
    await phase(() => enemyPhase(b));
  }
  if (!b.over) await phase(() => endRound(b));
  r.stats.bestHit = Math.max(r.stats.bestHit, startEnemyHp - Math.max(0, b.enemy.hp));
  busy = false;
  if (b.over) {
    if (b.over === "won") floater("enemy", "Defeated!", "crit");
    await sleep(b.over === "won" ? 650 : 900);
    dispHp.player = dispHp.enemy = null;
    settleCombat(r);
  }
  render();
}

// ---------- Input ----------

function on(sel: string, fn: (el: HTMLElement) => void) {
  app.querySelectorAll<HTMLElement>(sel).forEach(el => (el.onclick = ev => { ev.stopPropagation(); say(null); sfx("click"); fn(el); render(); }));
}

function bind() {
  on("[data-mute]", () => toggleMute());
  on("[data-togglemusic]", () => toggleMusic());
  on("[data-startmusic]", () => playMusic(run ? "game" : "title"));
  app.querySelectorAll<HTMLInputElement>("[data-music]").forEach(el => {
    el.oninput = () => {
      const k = el.dataset.music as Track;
      setMusicVolume(k, Number(el.value) / 100);
      const lab = app.querySelector(`[data-musicval="${k}"]`);
      if (lab) lab.textContent = `${el.value}%`;
    };
    el.onclick = ev => ev.stopPropagation();
  });
  if (!run) {
    on("[data-mode]", el => { mode = el.dataset.mode as Mode; });
    on("[data-story]", el => { storyOpen = el.dataset.story as Mode; });
    on("[data-closestory]", () => { storyOpen = null; });
    on("[data-codex]", () => { view = "codex"; });
    on("[data-back]", () => { view = "title"; });
    on("[data-play]", () => { view = "title"; });
    on("[data-home]", () => { view = "splash"; });
    on("[data-options]", () => { optionsOpen = true; resetArmed = false; });
    on("[data-closeoptions]", () => { optionsOpen = false; resetArmed = false; });
    on("[data-speed]", el => { speed = Number(el.dataset.speed); try { localStorage.setItem("dd2-speed", String(speed)); } catch { /* ignore */ } });
    on("[data-reset]", () => {
      if (!resetArmed) { resetArmed = true; return; }
      try { localStorage.removeItem("dd2-meta-v1"); } catch { /* ignore */ }
      clearSave();
      meta = loadMeta();
      resetArmed = false;
      optionsOpen = false;
      say("All progress has been reset.", false);
    });
    on("[data-origin]", el => { pendingOrigin = el.dataset.origin as OriginId; });
    on("[data-closeorigin]", () => { pendingOrigin = null; });
    on("[data-help]", () => { helpOpen = true; });
    on("[data-closehelp]", () => { helpOpen = false; });
    on("[data-continue]", () => { const l = loadRun(); if (!l) { say("That saved run couldn't be loaded."); clearSave(); return; } run = l.run; banked = l.banked; recorded = null; celebrated.clear(); winSeen = false; ackedTalentScene = null; mode = run.mode; });
    on("[data-start]", () => { const o = pendingOrigin; if (!o) return; pendingOrigin = null; recorded = null; celebrated.clear(); banked = 0; ackedTalentScene = null; winSeen = false; run = newRun(o, Date.now() & 0x7fffffff, mode, lockedIds(meta)); });
    return;
  }
  const r = run;
  on("[data-room]", el => {
    r.message = "";
    chooseRoom(r, el.dataset.room as never);
    if (["wooden", "iron"].includes(el.dataset.room!)) sfx("chest");
  });
  app.querySelectorAll<HTMLElement>("[data-act]").forEach(el => (el.onclick = () => { if (!busy) void playTurn(el.dataset.act as Action); }));
  on("[data-potion]", () => { drinkPotion(r); if (r.scene.t === "combat") void playFx(r.scene.battle).then(render); });
  on("[data-bag]", () => { bagOpen = true; });
  on("[data-closebag]", () => { bagOpen = false; });
  on("[data-take]", el => say(takeItem(r, Number(el.dataset.take), el.dataset.how as "equip" | "pack")));
  on("[data-scrapfound]", el => scrapFound(r, Number(el.dataset.scrapfound)));
  on("[data-finish]", () => { r.message = ""; finishLoot(r); });
  on("[data-card]", el => {
    pickResplendent(r, Number(el.dataset.card));
    const s = r.scene;
    if (s.t === "resplendent" && s.picked !== null) {
      const c = s.cards[s.picked];
      if (!(c.kind === "item" && RANK[c.item.rarity])) sfx("chest");
    }
  });
  on("[data-claim]", () => say(claimResplendent(r)));
  on("[data-mana]", () => { say(drinkMana(r)); if (r.scene.t === "combat") void playFx(r.scene.battle).then(render); });
  on("[data-keepsake]", () => { say(takeKeepsake(r), false); sfx("legendary"); });
  on("[data-choosetalent]", () => { ackedTalentScene = r.scene; });
  on("[data-closepopup]", () => { r.popup = undefined; });
  on("[data-relicok]", () => { r.relicNews?.shift(); });
  on("[data-menu]", () => { if (!busy) { menuOpen = true; endArmed = false; } });
  on("[data-closemenu]", () => { menuOpen = false; endArmed = false; });
  on("[data-mainmenu]", () => { menuOpen = false; endArmed = false; bagOpen = false; helpOpen = false; run = null; view = "title"; meta = loadMeta(); });
  on("[data-endrun]", () => {
    if (!endArmed) { endArmed = true; return; }
    endArmed = false; menuOpen = false; bagOpen = false;
    abandonRun(r);
  });
  on("[data-tonicbuy]", el => { say(buyTonic(r, Number(el.dataset.tonicbuy))); });
  on("[data-tonic]", el => { say(useTonic(r, el.dataset.tonic!)); sfx("status"); if (r.scene.t === "combat") void playFx(r.scene.battle).then(render); });
  on("[data-smith]", el => { smithUpgrade(r, Number(el.dataset.smith)); sfx("chest"); });
  on("[data-descend]", () => { r.message = ""; advance(r); });
  on("[data-help]", () => { helpOpen = true; });
  on("[data-closehelp]", () => { helpOpen = false; });
  on("[data-closewin]", () => { winSeen = true; });
  on("[data-talent]", el => chooseTalent(r, el.dataset.talent!));
  on("[data-buy]", el => say(buy(r, Number(el.dataset.buy))));
  on("[data-reroll]", () => say(rerollShop(r)));
  on("[data-sell]", el => { const err = sellItem(r, Number(el.dataset.sell)); say(err); if (!err) sfx("chest"); });
  on("[data-leave]", () => { r.message = ""; forgeTab = "upgrade"; offerSel.clear(); advance(r); });
  on("[data-up]", el => say(forgeUpgrade(r, Number(el.dataset.up))));
  on("[data-rr]", el => say(forgeReroll(r, Number(el.dataset.rr))));
  on("[data-forgetab]", el => { forgeTab = el.dataset.forgetab as typeof forgeTab; offerSel.clear(); });
  on("[data-offersel]", el => { const u = Number(el.dataset.offersel); if (offerSel.has(u)) offerSel.delete(u); else offerSel.add(u); });
  on("[data-offer]", () => { const out = forgeOffer(r, [...offerSel]); offerSel.clear(); if (typeof out === "string") { say(out); sfx("lose"); } else { say(`The Forge gives you: ${itemName(out)} (${out.rarity})`, false); if (RANK[out.rarity]) { celebrated.add(out.uid); celebrate(out.rarity); } else sfx("chest"); } });
  on("[data-combine]", el => { const [a, b] = el.dataset.combine!.split(",").map(Number); const out = forgeCombine(r, a, b); if (typeof out === "string") say(out); else { say(`Combined into ${itemName(out)} (${out.rarity}, lv ${out.level})`, false); if (RANK[out.rarity]) { celebrated.add(out.uid); celebrate(out.rarity, out.rarity === "epic" ? "EPIC FORGED" : undefined); } else sfx("chest"); } });
  on("[data-transmute]", el => { const out = forgeTransmute(r, Number(el.dataset.transmute)); if (typeof out === "string") say(out); else { say("The Crucible roars. A Legendary takes shape…", false); celebrate("legendary", "TRANSMUTED"); } });
  on("[data-fuse]", el => { const err = fuse(r, el.dataset.fuse!); say(err ?? `Fused: ${getItem(el.dataset.fuse!).name}!`, !!err); if (!err) sfx("legendary"); });
  on("[data-rest]", el => say(rest(r, el.dataset.rest as "heal" | "cleanse")));
  on("[data-risk]", el => confirmRisk(r, el.dataset.risk === "yes"));
  on("[data-event]", el => chooseEvent(r, Number(el.dataset.event)));
  on("[data-newrun]", () => { run = null; bagOpen = false; meta = loadMeta(); });
  on("[data-endless]", () => { continueEndless(r); recorded = null; });
  on("[data-unequip]", el => say(unequip(r.hero, el.dataset.unequip as EquipSlot)));
  on("[data-equip]", el => { const it = r.hero.backpack.find(i => i.uid === Number(el.dataset.equip)); if (it) say(equipItem(r.hero, it, el.dataset.slot as EquipSlot)); });
  on("[data-salvage]", el => { const n = salvage(r.hero, Number(el.dataset.salvage)); say(`+${n} Scrap`, false); });
  on("[data-reveal]", el => { const err = reveal(r.hero, Number(el.dataset.reveal)); say(err ?? "The Legendary reveals its true power!", !!err); if (!err) celebrate("legendary", "REVEALED"); });
}

render();

// Show or hide the "Tap for music" hint as the browser blocks or allows the music.
onMusicBlockChange(() => render());

// Check for new builds; reload at the next safe moment, and say so if that has to wait.
watchForUpdates(() => { if (run && run.scene.t !== "map" && run.scene.t !== "over") say("✨ An update is ready. It will load at your next path choice (your run is saved).", false); render(); });

// Going offline: tell the player what that means. Coming back: a quick note.
window.addEventListener("offline", () => { offlineOpen = true; render(); });
window.addEventListener("online", () => { offlineOpen = false; say("📶 You're back online.", false); render(); });
if (typeof navigator !== "undefined" && navigator.onLine === false) { offlineOpen = true; render(); }
