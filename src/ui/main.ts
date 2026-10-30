// Deck Dungeon 2 — the playable game.
import { BONUSES, CURSES, EPIC_POWERS, FUSION_RELICS, GEAR_BASES, LEGENDARIES, RELICS, TALENTS, loadLibrary } from "../data";
import { FUSION_RECIPES } from "../data/fusions";
import { ORIGINS } from "../data/origins";
import { armorOf, beginRound, enemyPhase, endRound, heroPhase, type Action } from "../engine/combat";
import { getItem } from "../engine/registry";
import { REACTIONS, STATUS_INFO } from "../engine/statuses";
import type { Battle, Fighter, Fx, GearItem, OriginId, StatusId } from "../engine/types";
import {
  BACKPACK_SIZE, baseOf, effectiveBase, EQUIP_SLOTS, type EquipSlot, equipItem, fillText, type Hero, itemLines, itemName, rerollCost,
  reveal, salvage, slotsFor, unequip, upgradeCost, weaponDamage, xpToLevel
} from "../game/hero";
import { lockedIds, loadMeta, type Meta, recordRun, UNLOCK_TIERS } from "../game/meta";
import {
  advance, availableFusions, buy, chooseEvent, chooseRoom, chooseTalent, claimResplendent, confirmRisk, continueEndless, drinkPotion,
  eventOptionAvailable, finishLoot, FLOORS, forgeReroll, forgeUpgrade, fuse, type Mode, newRun, pickResplendent, rerollShop, rest,
  combinablePairs, forgeCombine, forgeOffer, forgeTransmute, offeringOdds, offeringValue, shopRerollCost, TRANSMUTE_COST,
  ROOM_INFO, type Run, scrapFound, settleCombat, STEPS_PER_FLOOR, takeItem, WALL_FLOOR
} from "../game/run";
import { isMuted, sfx, toggleMute } from "./sound";

loadLibrary();

const app = document.getElementById("app")!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

let meta: Meta = loadMeta();
let run: Run | null = null;
let view: "title" | "codex" = "title";
let mode: Mode = "campaign";
let bagOpen = false;
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

const statusChips = (f: Fighter) =>
  (Object.entries(f.statuses) as [StatusId, number][])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `<span class="chip" title="${esc(STATUS_INFO[s].text)}">${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} ${n}</span>`)
    .join("");

/** "Replaces X: Damage 4 → 6" for a found item against what's equipped in its slot. */
function compareHtml(h: Hero, it: GearItem): string {
  const slots = slotsFor(it);
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
  if (a.twoHanded && h.equip.off) rows.push(`<span class="down">Two-handed: your off-hand goes to the bag</span>`);
  return `<div class="compare">Replaces <b>${esc(itemName(cur))}</b> (${cur.rarity}, lv ${cur.level})${rows.length ? `<br>${rows.join(" · ")}` : ""}</div>`;
}

function itemCard(it: GearItem, buttons = "", compare = false) {
  const b = baseOf(it.base);
  const hidden = b.legendary && !it.revealed;
  return `<div class="item r-${it.rarity} ${hidden ? "unrevealed" : ""}">
    <div class="meta">${it.rarity} · ${b.slot === "main" ? "weapon" : b.slot === "off" ? "off-hand" : b.slot} · level ${it.level}</div>
    <div class="nm">${esc(itemName(it))}</div>
    <ul>${itemLines(it).map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    ${compare && run ? compareHtml(run.hero, it) : ""}
    <div class="row">${buttons}</div>
  </div>`;
}

const floorLabel = (r: Run) => (r.mode === "endless" ? `Floor <b>${r.floor}</b>${r.floor < WALL_FLOOR ? ` · wall at ${WALL_FLOOR}` : ""}` : `Floor <b>${Math.min(r.floor, FLOORS)}</b>/${FLOORS}`);

function hud(r: Run) {
  const h = r.hero;
  const f = h.f;
  const need = xpToLevel(h.level);
  return `<div class="hud">
    <div class="row"><b>${esc(ORIGINS[h.origin].name)}</b><span class="stat">Lv ${h.level}</span><span class="grow"></span><span class="stat">${floorLabel(r)}</span></div>
    <div class="bar"><i style="width:${Math.max(0, (f.hp / f.maxHp) * 100)}%"></i></div>
    <div class="row stat"><span><b>${Math.max(0, f.hp)}</b>/${f.maxHp} HP</span><span>⚔️ <b>${f.damage}</b>${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}</span><span>🛡️ <b>${f.armor}</b></span>
      <span>🪙 <b>${f.gold}</b></span><span>⚙️ <b>${h.scrap}</b></span><span>🧪 <b>${h.potions}</b></span><span>📜 <b>${h.scrolls}</b></span>${h.starmetal ? `<span>✴️ <b>${h.starmetal}</b></span>` : ""}</div>
    <div class="bar xp"><i style="width:${(h.xp / need) * 100}%"></i></div>
    <div class="steps">${Array.from({ length: STEPS_PER_FLOOR + 1 }, (_, i) => `<i class="${i < r.step || (r.step === STEPS_PER_FLOOR && i < STEPS_PER_FLOOR) ? "done" : ""}"></i>`).join("")}</div>
    <div class="row" style="margin-top:6px"><button class="small" data-bag>🎒 Gear & build</button>${h.potions && f.hp < f.maxHp && !busy ? `<button class="small" data-potion>🧪 Potion (+12)</button>` : ""}<span class="grow"></span><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button></div>
  </div>`;
}

// ---------- Title, Codex ----------

function titleScreen() {
  const locked = lockedIds(meta);
  const next = UNLOCK_TIERS.find(t => meta.renown < t.at);
  return `<div class="row"><h1 class="grow">Deck Dungeon <span>2</span></h1><button class="small" data-mute>${isMuted() ? "🔇" : "🔊"}</button></div>
  <p class="sub">You are what you wear and what you find. Your weapon is your die; gear, relics and talents bend it.</p>
  <div class="panel"><div class="row"><span>🏅 Renown <b>${meta.renown}</b></span><span class="sub">${meta.runs} runs · ${meta.wins} wins · best floor ${meta.bestFloor}</span><span class="grow"></span><button class="small" data-codex>📖 Codex</button></div>
    ${next ? `<p class="sub">Next unlock at ${next.at} Renown: <b>${esc(next.name)}</b> (${locked.size} items still locked)</p>` : `<p class="sub">Everything is unlocked.</p>`}</div>
  <h2>Mode</h2>
  <div class="row"><button data-mode="campaign" class="${mode === "campaign" ? "primary" : ""}">Campaign · 10 floors</button><button data-mode="endless" class="${mode === "endless" ? "primary" : ""}">Endless · how deep?</button></div>
  <p class="sub">${mode === "campaign" ? "Ten floors, ten bosses." : `Bosses beyond floor 10 are forged from a library of names, titles and powers. Floor ${WALL_FLOOR} is a wall only a broken build gets through.`}</p>
  <h2>Choose an origin</h2>
  <div class="cards">${(Object.keys(ORIGINS) as OriginId[]).map(o => {
    const og = ORIGINS[o];
    const p = getItem(og.passive);
    return `<button class="room" data-origin="${o}"><span class="ic">${{ warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨" }[o]}</span><b>${og.name}</b>
      <span class="sub">${esc(og.blurb)}</span><p>${og.hp} HP · ${og.kit.map(k => esc(baseOf(k).name)).join(", ")}</p><p><b style="display:inline">${esc(p.name)}:</b> ${esc(p.text)}.</p></button>`;
  }).join("")}</div>`;
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
    ${section("Epic powers", EPIC_POWERS)}
    ${section("Bonuses", BONUSES)}
    ${section("Relics", RELICS)}
    ${section("Fusions", FUSION_RELICS.map(f => ({ ...f, text: `${f.text}. Recipe: ${FUSION_RECIPES.filter(r => r.out === f.id).map(r => `${getItem(r.a).name} + ${getItem(r.b).name}`).join("")}` })))}
    ${section("Talents", TALENTS)}
    ${section("Curses", CURSES)}`;
}

// ---------- Scenes ----------

function mapScene(r: Run) {
  return `<h2>${r.step >= STEPS_PER_FLOOR ? (r.floor === WALL_FLOOR ? "The Wall" : "The boss awaits") : "Choose your path"}</h2>
  <div class="cards">${r.choices.map(c => `<button class="room" data-room="${c}"><span class="ic">${ROOM_INFO[c].icon}</span><b>${ROOM_INFO[c].name}</b><span class="sub">${esc(ROOM_INFO[c].text)}</span></button>`).join("")}</div>`;
}

function dieBox(who: "player" | "enemy", label: string) {
  const d = lastRoll[who];
  if (!d) return `<div class="diebox"><div class="who">${label}</div><div class="die ${who} empty">·</div><div class="facename">&nbsp;</div></div>`;
  return `<div class="diebox"><div class="who">${label}</div><div class="die ${who} ${d.kind} ${d.rolling ? "rolling" : ""}">${d.face}</div><div class="facename">${d.rolling ? "&nbsp;" : esc(d.name)}</div></div>`;
}

function fighterPanel(f: Fighter, who: "player" | "enemy") {
  const hp = dispHp[who] ?? f.hp;
  const intent = who === "enemy" && f.moves?.length ? f.moves[f.intent ?? 0] : null;
  const traits = who === "enemy" ? Object.keys(f.items).map(id => getItem(id)).map(d => `<span class="chip" title="${esc(d.text)}">${esc(d.name)}</span>`).join("") : "";
  return `<div class="panel fighter" id="fp-${who}">
    <div class="row"><b>${esc(f.name)}</b>${f.title ? `<span class="sub">${esc(f.title)}</span>` : ""}<span class="grow"></span><span class="sub">${who === "enemy" ? `${f.family ?? ""}${f.boss ? " · Boss" : f.champion ? " · Champion" : f.elite ? " · Elite" : ""}` : ""}</span></div>
    <div class="bar ${who === "enemy" ? "enemy" : ""}"><i style="width:${Math.max(0, (hp / f.maxHp) * 100)}%"></i></div>
    <div class="sub">${Math.max(0, hp)}/${f.maxHp} HP · ${who === "enemy" ? `Power ${f.damage}` : `Damage ${f.damage}${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}`} · Armor ${armorOf(f)}</div>
    <div class="chips">${traits}${statusChips(f)}</div>
    ${intent ? `<div class="intent">Next: ${intent.icon} <b>${esc(intent.name)}</b> — ${esc(intent.text)}</div>` : ""}
  </div>`;
}

function combatScene(r: Run) {
  if (r.scene.t !== "combat") return "";
  const b = r.scene.battle;
  const e = b.enemy;
  return `${fighterPanel(e, "enemy")}
    <div class="dice-row">${dieBox("player", "You")}${dieBox("enemy", "Enemy")}</div>
    ${fighterPanel(b.player, "player")}
    ${(b.player.statuses.stun ?? 0) > 0 ? `<div class="toast err">💫 You're Stunned: your next turn will be skipped.</div>` : ""}
    <div class="row ${busy ? "busy" : ""}" style="justify-content:center;margin-top:10px">
      <button class="primary" data-act="attack">Attack</button><button data-act="guard">Guard</button>${e.boss || e.elite ? "" : `<button data-act="flee">Flee</button>`}
    </div>
    <p class="center sub" style="margin-top:6px">Your die: ${b.player.faces.map((f, i) => `${i + 1} ${f.name ?? f.kind}`).join(" · ")}</p>
    <details><summary>Battle log</summary><div class="log">${b.log.slice().reverse().map(l => `<div class="${l.startsWith("—") ? "round" : ""}">${esc(l)}</div>`).join("")}</div></details>`;
}

const takeButtons = (it: GearItem) =>
  `<button class="small primary" data-take="${it.uid}" data-how="equip">Equip</button><button class="small" data-take="${it.uid}" data-how="pack">To bag</button><button class="small" data-scrapfound="${it.uid}">Scrap</button>`;

function lootScene(r: Run) {
  if (r.scene.t !== "loot") return "";
  const s = r.scene;
  const extras = [s.gold ? `🪙 ${s.gold} Gold` : "", s.potions ? `🧪 Potion` : "", s.scrolls ? `📜 Scroll of Revelation` : "", s.relic ? `💎 Relic: ${getItem(s.relic).name} — ${getItem(s.relic).text}` : ""].filter(Boolean);
  return `<h2>${esc(s.title)}</h2>
    ${extras.length ? `<div class="panel">${extras.map(x => `<p>${esc(x)}</p>`).join("")}</div>` : ""}
    <div class="cards" style="margin-top:10px">${s.items.map(it => itemCard(it, takeButtons(it), true)).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="primary" data-finish>${s.items.length ? "Leave the rest" : "Continue"}${s.then === "resplendent" ? " → open the Resplendent chest" : ""}</button></div>`;
}

function pickScene(r: Run) {
  if (r.scene.t !== "pick") return "";
  const s = r.scene;
  return `<h2>${esc(s.title)}</h2>
    <div class="cards">${s.items.map(it => itemCard(it, takeButtons(it), true)).join("")}</div>
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
  return `<h2>Level up! +3 Max HP — choose a talent</h2><div class="cards">${r.scene.options.map(id => {
    const t = getItem(id);
    const rank = (r.hero.talents[id] ?? 0) + 1;
    return `<button class="room" data-talent="${id}"><b>${esc(t.name)} ${"I".repeat(rank)}</b><span class="sub">${t.tags.join(" · ")}</span><p>${esc(t.text)}</p></button>`;
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
  <div class="row" style="margin-top:12px"><button data-reroll>Reroll stock · ${shopRerollCost(r)} 🪙</button><button class="primary" data-leave>Leave</button></div>`;
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
    <div class="cards">${allGear(r).map(it => itemCard(it, `<button class="small primary" data-up="${it.uid}">Upgrade · ${upgradeCost(it)} ⚙️</button>${Object.keys(it.bonuses).length ? `<button class="small" data-rr="${it.uid}">Reroll · ${rerollCost(it)} ⚙️</button>` : ""}`)).join("")}</div>`;
  } else if (forgeTab === "offer") {
    const chosen = h.backpack.filter(i => offerSel.has(i.uid));
    const odds = offeringOdds(offeringValue(chosen));
    body = `<p class="sub">Sacrifice two or more items from your bag for one new item. More items and rarer items mean better odds.</p>
      ${chosen.length >= 2 ? `<div class="panel">Odds: ${(["common", "uncommon", "rare", "epic", "legendary"] as const).filter(x => odds[x]).map(x => `<span class="chip">${x} ${odds[x]}%</span>`).join(" ")}</div>` : ""}
      <div class="cards" style="margin-top:8px">${h.backpack.map(it => itemCard(it, `<button class="small ${offerSel.has(it.uid) ? "primary" : ""}" data-offersel="${it.uid}">${offerSel.has(it.uid) ? "✓ Offered" : "Offer"}</button>`)).join("") || `<p class="sub">Your bag is empty.</p>`}</div>
      <div class="row" style="margin-top:8px"><button class="primary" data-offer ${chosen.length >= 2 ? "" : "disabled"}>Sacrifice ${chosen.length} item${chosen.length === 1 ? "" : "s"}</button></div>`;
  } else if (forgeTab === "combine") {
    const pairs = combinablePairs(r);
    body = `<p class="sub">Combine two of the same item into one: a level higher, the best bonuses of both, and a 30% chance to rise a rarity (up to Epic).</p>
      ${pairs.length ? pairs.map(([a, b]) => `<div class="panel" style="margin-top:8px"><div class="cards">${itemCard(a)}${itemCard(b)}</div><button class="primary small" data-combine="${a.uid},${b.uid}">Combine</button></div>`).join("") : `<p class="sub">You don't have two of the same item.</p>`}`;
  } else {
    const commons = allGear(r).filter(i => i.rarity === "common");
    body = `<p class="sub">The Transmuter's Crucible turns a Common item into a Legendary of the same kind for ${TRANSMUTE_COST} ✴️ Starmetal (you have ${h.starmetal}). It arrives unrevealed.</p>
      <div class="cards">${commons.map(it => itemCard(it, `<button class="small primary" data-transmute="${it.uid}" ${h.starmetal >= TRANSMUTE_COST ? "" : "disabled"}>Transmute · ${TRANSMUTE_COST} ✴️</button>`)).join("") || `<p class="sub">No Common items.</p>`}</div>`;
  }
  return `<h2>Forge</h2><p class="sub">⚙️ ${h.scrap} Scrap${h.starmetal ? ` · ✴️ ${h.starmetal} Starmetal` : ""}</p>
  ${fusions.length ? `<h2>Fusion!</h2><div class="cards">${fusions.map(x => { const o = getItem(x.out); return `<div class="item r-legendary"><div class="nm">${esc(o.name)}</div><p>${esc(getItem(x.a).name)} + ${esc(getItem(x.b).name)}</p><p>${esc(o.text)}</p><button class="primary small" data-fuse="${x.out}">Fuse</button></div>`; }).join("")}</div>` : ""}
  <div class="row" style="margin:8px 0">${tabs.map(([k, l]) => `<button class="small ${forgeTab === k ? "primary" : ""}" data-forgetab="${k}">${l}</button>`).join("")}</div>
  ${body}
  <div class="row" style="margin-top:12px"><button class="primary" data-leave>Leave</button></div>`;
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
  return `<h2>${s.ev.icon} ${esc(s.ev.title)}</h2><div class="panel"><p>${esc(s.ev.text)}</p></div>
    ${s.result ? `<div class="toast">${esc(s.result)}</div><div class="row"><button class="primary" data-leave>Continue</button></div>`
      : `<div class="cards" style="margin-top:10px">${s.ev.options.map((o, i) => `<button class="room" data-event="${i}" ${eventOptionAvailable(r, i) ? "" : "disabled"}><b>${esc(o.label)}</b>${o.hint ? `<span class="sub">${esc(o.hint)}</span>` : ""}</button>`).join("")}</div>`}`;
}

function confirmScene(r: Run) {
  if (r.scene.t !== "confirm") return "";
  const info = ROOM_INFO[r.scene.room];
  return `<h2>${info.icon} ${info.name}</h2><div class="panel"><p>${esc(info.text)}</p><p class="sub">A Resplendent chest holds three face-down cards. Pick one; the rest are lost. Any of them could be Legendary.</p></div>
  <div class="row" style="margin-top:12px"><button class="primary" data-risk="yes">Accept the risk</button><button data-risk="no">Walk away</button></div>`;
}

function overScene(r: Run) {
  if (r.scene.t !== "over") return "";
  const h = r.hero;
  const won = r.scene.won;
  return `<div class="banner ${won ? "won" : "lost"}">${won ? "The Hollow King falls. You win!" : "You have fallen."}</div>
  <div class="panel"><p>${r.mode === "endless" ? "Endless · " : ""}Floor ${r.floor} · Level ${h.level} · ${r.stats.kills} kills · ${r.stats.bosses} bosses · biggest hit ${r.stats.bestHit}</p>
  ${recorded ? `<p>🏅 +${recorded.earned} Renown (total ${meta.renown})${recorded.unlocked.length ? ` · Unlocked: <b>${recorded.unlocked.map(esc).join(", ")}</b>` : ""}</p>` : ""}
  <p class="sub">Final build:</p><div class="cards">${EQUIP_SLOTS.map(s => h.equip[s]).filter((x): x is GearItem => !!x).map(it => itemCard(it)).join("")}</div></div>
  <div class="row" style="margin-top:12px">${won ? `<button class="primary" data-endless>Keep delving (Endless)</button>` : ""}<button class="${won ? "" : "primary"}" data-newrun>New run</button></div>`;
}

function bag(r: Run) {
  const h = r.hero;
  const inCombat = r.scene.t === "combat";
  const slotName: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket", trinket2: "Trinket" };
  const equipped = EQUIP_SLOTS.map(s => {
    const it = h.equip[s];
    return `<div><div class="sub">${slotName[s]}</div>${it ? itemCard(it, inCombat ? "" : `<button class="small" data-unequip="${s}">Unequip</button>${revealBtn(r, it)}`) : `<div class="item"><span class="sub">Empty</span></div>`}</div>`;
  }).join("");
  const pack = h.backpack.map(it => itemCard(it, inCombat ? "" : `${slotsFor(it).map(s => `<button class="small primary" data-equip="${it.uid}" data-slot="${s}">Equip${slotsFor(it).length > 1 ? ` (${slotName[s].toLowerCase()}${s === "trinket2" ? " 2" : ""})` : ""}</button>`).join("")}<button class="small" data-salvage="${it.uid}">Scrap</button>${revealBtn(r, it)}`, !inCombat)).join("");
  const list = (o: Record<string, number>) => Object.entries(o).map(([id, n]) => { const d = getItem(id); return `<p><b>${esc(d.name)}</b>${n > 1 ? ` ×${n}` : ""} — ${esc(fillText(d.text, n))}</p>`; }).join("") || `<p class="sub">None yet.</p>`;
  const passive = getItem(ORIGINS[h.origin].passive);
  const f = h.f;
  const crits = f.faces.filter(x => x.kind === "crit").length;
  const misses = f.faces.filter(x => x.kind === "miss").length;
  const stats = `<div class="panel"><div class="row stat">
      <span>❤️ <b>${Math.max(0, f.hp)}</b>/${f.maxHp}</span><span>⚔️ Damage <b>${f.damage}</b>${f.offDamage !== undefined ? ` + off-hand <b>${f.offDamage}</b>` : ""}</span><span>🛡️ Armor <b>${f.armor}</b></span>
      <span>Lv <b>${h.level}</b> (${h.xp}/${xpToLevel(h.level)} XP)</span></div>
      <div class="row stat"><span>🎲 d${f.faces.length}: ${crits} crit face${crits === 1 ? "" : "s"}, ${misses} miss face${misses === 1 ? "" : "s"}</span></div>
      <div class="row stat"><span>🪙 ${f.gold}</span><span>⚙️ ${h.scrap}</span><span>✴️ ${h.starmetal}</span><span>📜 ${h.scrolls}</span><span>🧪 ${h.potions}</span></div>
      <p class="sub" style="margin:4px 0 0">${f.faces.map((x, i) => `${i + 1} ${x.name ?? x.kind}`).join(" · ")}</p>
      <p class="sub" style="margin:4px 0 0">Armor can't stop more than two-thirds of a hit unless you Guard.</p></div>`;
  return `<div class="overlay"><div class="inner">
    <div class="row"><h1 class="grow">Gear & build</h1><button data-closebag>Close</button></div>
    ${stats}
    ${inCombat ? `<p class="sub">You can look, but you can't change gear mid-fight.</p>` : ""}
    <p><b>${esc(passive.name)}</b> (origin) — ${esc(passive.text)}.</p>
    <h2>Equipped</h2><div class="cards">${equipped}</div>
    <h2>Backpack ${h.backpack.length}/${BACKPACK_SIZE}</h2><div class="cards">${pack || `<p class="sub">Empty.</p>`}</div>
    <h2>Relics</h2>${list(h.relics)}
    <h2>Talents</h2>${list(h.talents)}
    ${Object.keys(h.curses).length ? `<h2>Curses</h2>${list(h.curses)}` : ""}
    <details><summary>Statuses</summary>${(Object.keys(STATUS_INFO) as StatusId[]).map(s => `<p>${STATUS_INFO[s].icon} <b>${STATUS_INFO[s].name}</b> — ${esc(STATUS_INFO[s].text)}</p>`).join("")}</details>
    <details><summary>Reactions</summary>${REACTIONS.map(x => `<p>${STATUS_INFO[x.a].icon}+${STATUS_INFO[x.b].icon} <b>${x.name}</b> — ${esc(x.text)}</p>`).join("")}</details>
  </div></div>`;
}

function revealBtn(r: Run, it: GearItem) {
  const b = baseOf(it.base);
  if (!b.legendary || it.revealed) return "";
  return `<button class="small primary" data-reveal="${it.uid}" ${r.hero.scrolls ? "" : "disabled"}>📜 Reveal</button>`;
}

// ---------- Render ----------

function render() {
  if (!run) {
    app.innerHTML = view === "codex" ? codexScreen() : titleScreen();
    bind();
    return;
  }
  const r = run;
  const s = r.scene;
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
    : s.t === "rest" ? restScene(r) : s.t === "confirm" ? confirmScene(r) : s.t === "event" ? eventScene(r) : overScene(r);
  const msg = [r.message, note].filter(Boolean);
  app.innerHTML = `${hud(r)}${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && noteBad && note ? "err" : ""}">${esc(m)}</div>`).join("")}${body}${s.t === "resplendent" ? resplendentScene(r) : ""}${bagOpen ? bag(r) : ""}`;
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
  if (!run) {
    on("[data-mode]", el => { mode = el.dataset.mode as Mode; });
    on("[data-codex]", () => { view = "codex"; });
    on("[data-back]", () => { view = "title"; });
    on("[data-origin]", el => { recorded = null; banked = 0; run = newRun(el.dataset.origin as OriginId, Date.now() & 0x7fffffff, mode, lockedIds(meta)); });
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
      sfx(c.kind === "item" && (c.item.rarity === "legendary" || c.item.rarity === "epic") ? "legendary" : "chest");
    }
  });
  on("[data-claim]", () => say(claimResplendent(r)));
  on("[data-talent]", el => chooseTalent(r, el.dataset.talent!));
  on("[data-buy]", el => say(buy(r, Number(el.dataset.buy))));
  on("[data-reroll]", () => say(rerollShop(r)));
  on("[data-leave]", () => { r.message = ""; forgeTab = "upgrade"; offerSel.clear(); advance(r); });
  on("[data-up]", el => say(forgeUpgrade(r, Number(el.dataset.up))));
  on("[data-rr]", el => say(forgeReroll(r, Number(el.dataset.rr))));
  on("[data-forgetab]", el => { forgeTab = el.dataset.forgetab as typeof forgeTab; offerSel.clear(); });
  on("[data-offersel]", el => { const u = Number(el.dataset.offersel); if (offerSel.has(u)) offerSel.delete(u); else offerSel.add(u); });
  on("[data-offer]", () => { const out = forgeOffer(r, [...offerSel]); offerSel.clear(); if (typeof out === "string") say(out); else { say(`The Forge gives you: ${itemName(out)} (${out.rarity})`, false); sfx(out.rarity === "epic" || out.rarity === "legendary" ? "legendary" : "chest"); } });
  on("[data-combine]", el => { const [a, b] = el.dataset.combine!.split(",").map(Number); const out = forgeCombine(r, a, b); if (typeof out === "string") say(out); else { say(`Combined into ${itemName(out)} (${out.rarity}, lv ${out.level})`, false); sfx("chest"); } });
  on("[data-transmute]", el => { const out = forgeTransmute(r, Number(el.dataset.transmute)); if (typeof out === "string") say(out); else { say("The Crucible roars. A Legendary takes shape…", false); sfx("legendary"); } });
  on("[data-fuse]", el => { const err = fuse(r, el.dataset.fuse!); say(err ?? `Fused: ${getItem(el.dataset.fuse!).name}!`, !!err); if (!err) sfx("legendary"); });
  on("[data-rest]", el => say(rest(r, el.dataset.rest as "heal" | "cleanse")));
  on("[data-risk]", el => confirmRisk(r, el.dataset.risk === "yes"));
  on("[data-event]", el => chooseEvent(r, Number(el.dataset.event)));
  on("[data-newrun]", () => { run = null; bagOpen = false; meta = loadMeta(); });
  on("[data-endless]", () => { continueEndless(r); recorded = null; });
  on("[data-unequip]", el => say(unequip(r.hero, el.dataset.unequip as EquipSlot)));
  on("[data-equip]", el => { const it = r.hero.backpack.find(i => i.uid === Number(el.dataset.equip)); if (it) say(equipItem(r.hero, it, el.dataset.slot as EquipSlot)); });
  on("[data-salvage]", el => { const n = salvage(r.hero, Number(el.dataset.salvage)); say(`+${n} Scrap`, false); });
  on("[data-reveal]", el => { const err = reveal(r.hero, Number(el.dataset.reveal)); say(err ?? "The Legendary reveals its true power!", !!err); if (!err) sfx("legendary"); });
}

render();
