// Deck Dungeon 2 — the playable run.
import { loadLibrary } from "../data";
import { ORIGINS } from "../data/origins";
import { armorOf } from "../engine/combat";
import { getItem } from "../engine/registry";
import { REACTIONS, STATUS_INFO } from "../engine/statuses";
import type { Fighter, GearItem, OriginId, StatusId } from "../engine/types";
import { BACKPACK_SIZE, baseOf, EQUIP_SLOTS, type EquipSlot, equipItem, fillText, itemLines, itemName, REROLL_COST, reveal, salvage, slotsFor, unequip, upgradeCost, xpToLevel } from "../game/hero";
import {
  buy, chooseRoom, chooseTalent, claimResplendent, combatAction, confirmRisk, drinkPotion, finishLoot, FLOORS, forgeReroll, forgeUpgrade,
  newRun, pickResplendent, rerollShop, rest, ROOM_INFO, type Run, scrapFound, STEPS_PER_FLOOR, takeItem, advance
} from "../game/run";

loadLibrary();

const app = document.getElementById("app")!;
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

let run: Run | null = null;
let bagOpen = false;
let note = "";
let noteBad = false;

const say = (msg: string | null, bad = true) => {
  note = msg ?? "";
  noteBad = bad;
};

// ---------- Pieces ----------

const statusChips = (f: Fighter) =>
  (Object.entries(f.statuses) as [StatusId, number][])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `<span class="chip" title="${esc(STATUS_INFO[s].text)}">${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} ${n}</span>`)
    .join("");

function itemCard(it: GearItem, buttons = "") {
  const b = baseOf(it.base);
  const hidden = b.legendary && !it.revealed;
  return `<div class="item r-${it.rarity} ${hidden ? "unrevealed" : ""}">
    <div class="meta">${it.rarity} · ${b.slot === "main" ? "weapon" : b.slot === "off" ? "off-hand" : b.slot} · level ${it.level}</div>
    <div class="nm">${esc(itemName(it))}</div>
    <ul>${itemLines(it).map(l => `<li>${esc(l)}</li>`).join("")}</ul>
    <div class="row">${buttons}</div>
  </div>`;
}

function hud(r: Run) {
  const h = r.hero;
  const f = h.f;
  const need = xpToLevel(h.level);
  return `<div class="hud">
    <div class="row"><b>${esc(ORIGINS[h.origin].name)}</b><span class="stat">Lv ${h.level}</span><span class="grow"></span>
      <span class="stat">Floor <b>${Math.min(r.floor, FLOORS)}</b>/${FLOORS}</span></div>
    <div class="bar"><i style="width:${Math.max(0, (f.hp / f.maxHp) * 100)}%"></i></div>
    <div class="row stat"><span><b>${Math.max(0, f.hp)}</b>/${f.maxHp} HP</span><span>⚔️ <b>${f.damage}</b>${f.offDamage !== undefined ? ` + ${f.offDamage}` : ""}</span><span>🛡️ <b>${f.armor}</b></span>
      <span>🪙 <b>${f.gold}</b></span><span>⚙️ <b>${h.scrap}</b></span><span>🧪 <b>${h.potions}</b></span><span>📜 <b>${h.scrolls}</b></span></div>
    <div class="bar xp"><i style="width:${(h.xp / need) * 100}%"></i></div>
    <div class="steps">${Array.from({ length: STEPS_PER_FLOOR + 1 }, (_, i) => `<i class="${i < r.step || (r.step === STEPS_PER_FLOOR && i < STEPS_PER_FLOOR) ? "done" : ""}"></i>`).join("")}</div>
    <div class="row" style="margin-top:6px"><button class="small" data-bag>🎒 Gear & build</button>${h.potions && f.hp < f.maxHp ? `<button class="small" data-potion>🧪 Drink potion (+12)</button>` : ""}</div>
  </div>`;
}

// ---------- Scenes ----------

function titleScreen() {
  return `<h1>Deck Dungeon <span>2</span></h1>
  <p class="sub">You are what you wear and what you find. Your weapon is your die; gear, relics and talents bend it. Three floors, three bosses.</p>
  <h2>Choose an origin</h2>
  <div class="cards">${(Object.keys(ORIGINS) as OriginId[]).map(o => {
    const og = ORIGINS[o];
    const p = getItem(og.passive);
    return `<button class="room" data-origin="${o}"><span class="ic">${{ warrior: "🛡️", rogue: "🗡️", mage: "🔮", cleric: "✨" }[o]}</span><b>${og.name}</b>
      <span class="sub">${esc(og.blurb)}</span><p>${og.hp} HP · ${og.kit.map(k => esc(baseOf(k).name)).join(", ")}</p><p><b style="display:inline">${esc(p.name)}:</b> ${esc(p.text)}.</p></button>`;
  }).join("")}</div>`;
}

function mapScene(r: Run) {
  return `<h2>${r.step >= STEPS_PER_FLOOR ? "The boss awaits" : "Choose your path"}</h2>
  <div class="cards">${r.choices.map(c => `<button class="room" data-room="${c}"><span class="ic">${ROOM_INFO[c].icon}</span><b>${ROOM_INFO[c].name}</b><span class="sub">${esc(ROOM_INFO[c].text)}</span></button>`).join("")}</div>`;
}

function lastFace(r: Run): { face: number; name: string; kind: string } | null {
  if (r.scene.t !== "combat") return null;
  const b = r.scene.battle;
  for (let i = b.log.length - 1; i >= 0; i--) {
    const m = b.log[i].match(/^(.+) rolls (\d+)(?: \(off-hand\))?: (.+)\.$/);
    if (m && m[1] === b.player.name) {
      const f = b.player.faces[Number(m[2]) - 1];
      return { face: Number(m[2]), name: m[3], kind: f?.kind ?? "hit" };
    }
  }
  return null;
}

function combatScene(r: Run) {
  if (r.scene.t !== "combat") return "";
  const b = r.scene.battle;
  const e = b.enemy;
  const lf = lastFace(r);
  const traits = Object.keys(e.items).map(id => getItem(id)).map(d => `<span class="chip" title="${esc(d.text)}">${esc(d.name)}</span>`).join("");
  return `<div class="panel">
      <div class="row"><b>${esc(e.name)}</b><span class="grow"></span><span class="sub">${e.family ?? ""}${e.boss ? " · Boss" : e.champion ? " · Champion" : e.elite ? " · Elite" : ""}</span></div>
      <div class="bar enemy"><i style="width:${Math.max(0, (e.hp / e.maxHp) * 100)}%"></i></div>
      <div class="sub">${Math.max(0, e.hp)}/${e.maxHp} HP · Power ${e.damage} · Armor ${armorOf(e)}</div>
      <div class="chips">${traits}${statusChips(e)}</div>
    </div>
    <div class="panel" style="margin-top:10px">
      ${lf ? `<div class="die ${lf.kind}">${lf.face}</div><div class="facename">${esc(lf.name)}</div>` : `<p class="center sub">Your die: ${b.player.faces.map((f, i) => `${i + 1} ${f.name ?? f.kind}`).join(" · ")}</p>`}
      <div class="chips" style="justify-content:center">${statusChips(b.player)}</div>
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="primary" data-act="attack">Attack</button><button data-act="guard">Guard</button>${e.boss || e.elite ? "" : `<button data-act="flee">Flee</button>`}
      </div>
      <div class="log">${b.log.slice().reverse().map(l => `<div class="${l.startsWith("—") ? "round" : ""}">${esc(l)}</div>`).join("")}</div>
    </div>`;
}

const takeButtons = (it: GearItem, pick = false) =>
  `<button class="small primary" data-take="${it.uid}" data-how="equip">Equip</button><button class="small" data-take="${it.uid}" data-how="pack">To bag</button><button class="small" data-scrapfound="${it.uid}">Scrap</button>${pick ? "" : ""}`;

function lootScene(r: Run) {
  if (r.scene.t !== "loot") return "";
  const s = r.scene;
  const extras = [s.gold ? `🪙 ${s.gold} Gold` : "", s.potions ? `🧪 Potion` : "", s.scrolls ? `📜 Scroll of Revelation` : "", s.relic ? `💎 Relic: ${getItem(s.relic).name} — ${getItem(s.relic).text}` : ""].filter(Boolean);
  return `<h2>${esc(s.title)}</h2>
    ${extras.length ? `<div class="panel">${extras.map(x => `<p>${esc(x)}</p>`).join("")}</div>` : ""}
    <div class="cards" style="margin-top:10px">${s.items.map(it => itemCard(it, takeButtons(it))).join("")}</div>
    <div class="row" style="margin-top:12px"><button class="primary" data-finish>${s.items.length ? "Leave the rest" : "Continue"}${s.then === "resplendent" ? " → open the Resplendent chest" : ""}</button></div>`;
}

function pickScene(r: Run) {
  if (r.scene.t !== "pick") return "";
  const s = r.scene;
  return `<h2>${esc(s.title)}</h2>
    <div class="cards">${s.items.map(it => itemCard(it, takeButtons(it, true))).join("")}</div>
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
  return `<h2>Level up! Choose a talent</h2><div class="cards">${r.scene.options.map(id => {
    const t = getItem(id);
    const rank = (r.hero.talents[id] ?? 0) + 1;
    return `<button class="room" data-talent="${id}"><b>${esc(t.name)} ${"I".repeat(rank)}</b><span class="sub">${t.tags.join(" · ")}</span><p>${esc(t.text)}</p></button>`;
  }).join("")}</div>`;
}

function shopScene(r: Run) {
  if (r.scene.t !== "shop") return "";
  return `<h2>Merchant</h2><div class="cards">${r.scene.stock.map((e, i) => {
    const btn = `<button class="small primary" data-buy="${i}" ${e.sold ? "disabled" : ""}>${e.sold ? "Sold" : `Buy · ${e.price} 🪙`}</button>`;
    if (e.kind === "item" && e.item) return itemCard(e.item, btn);
    const label = e.kind === "potion" ? "🧪 Healing Potion — heal 12" : e.kind === "scroll" ? "📜 Scroll of Revelation — reveals a Legendary" : `💎 ${getItem(e.relic!).name} — ${getItem(e.relic!).text}`;
    return `<div class="item"><div class="nm">${esc(label)}</div><div class="row" style="margin-top:8px">${btn}</div></div>`;
  }).join("")}</div>
  <div class="row" style="margin-top:12px"><button data-reroll>Reroll stock · 10 🪙</button><button class="primary" data-leave>Leave</button></div>`;
}

function allGear(r: Run): GearItem[] {
  return [...EQUIP_SLOTS.map(s => r.hero.equip[s]).filter((x): x is GearItem => !!x), ...r.hero.backpack];
}

function forgeScene(r: Run) {
  const h = r.hero;
  return `<h2>Forge</h2><p class="sub">You have ⚙️ ${h.scrap} Scrap. Upgrading raises an item's level (more damage, stronger bonuses). Rerolling swaps one bonus.</p>
  <div class="cards">${allGear(r).map(it => itemCard(it, `<button class="small primary" data-up="${it.uid}">Upgrade · ${upgradeCost(it)} ⚙️</button>${Object.keys(it.bonuses).length ? `<button class="small" data-rr="${it.uid}">Reroll · ${REROLL_COST} ⚙️</button>` : ""}`)).join("")}</div>
  <div class="row" style="margin-top:12px"><button class="primary" data-leave>Leave</button></div>`;
}

function restScene(r: Run) {
  if (r.scene.t !== "rest") return "";
  const curses = Object.keys(r.hero.curses);
  return `<h2>Campfire</h2>${r.scene.done ? `<p>You rest a while.</p>` : `<div class="row"><button class="primary" data-rest="heal">Rest: heal 40% of Max HP</button>${curses.length ? `<button data-rest="cleanse">Cleanse ${esc(getItem(curses[0]).name)}</button>` : ""}</div>`}
  <div class="row" style="margin-top:12px"><button data-leave>Move on</button></div>`;
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
  return `<div class="banner ${r.scene.won ? "won" : "lost"}">${r.scene.won ? "The Hollow King falls. You win!" : "You have fallen."}</div>
  <div class="panel"><p>Floor ${Math.min(r.floor, FLOORS)} · Level ${h.level} · ${r.stats.kills} kills · biggest hit ${r.stats.bestHit}</p>
  <p class="sub">Final build:</p><div class="cards">${allGear(r).filter(i => Object.values(h.equip).includes(i)).map(it => itemCard(it)).join("")}</div></div>
  <div class="row" style="margin-top:12px"><button class="primary" data-newrun>New run</button></div>`;
}

function bag(r: Run) {
  const h = r.hero;
  const inCombat = r.scene.t === "combat";
  const slotName: Record<EquipSlot, string> = { main: "Main hand", off: "Off-hand", armour: "Armour", trinket1: "Trinket", trinket2: "Trinket" };
  const equipped = EQUIP_SLOTS.map(s => {
    const it = h.equip[s];
    return `<div><div class="sub">${slotName[s]}</div>${it ? itemCard(it, inCombat ? "" : `<button class="small" data-unequip="${s}">Unequip</button>${revealBtn(r, it)}`) : `<div class="item"><span class="sub">Empty</span></div>`}</div>`;
  }).join("");
  const pack = h.backpack.map(it => itemCard(it, inCombat ? "" : `${slotsFor(it).map(s => `<button class="small primary" data-equip="${it.uid}" data-slot="${s}">Equip${slotsFor(it).length > 1 ? ` (${slotName[s].toLowerCase()}${s === "trinket2" ? " 2" : ""})` : ""}</button>`).join("")}<button class="small" data-salvage="${it.uid}">Scrap</button>${revealBtn(r, it)}`)).join("");
  const list = (o: Record<string, number>) => Object.entries(o).map(([id, n]) => { const d = getItem(id); return `<p><b>${esc(d.name)}</b>${n > 1 ? ` ×${n}` : ""} — ${esc(fillText(d.text, n))}</p>`; }).join("") || `<p class="sub">None yet.</p>`;
  const passive = getItem(ORIGINS[h.origin].passive);
  return `<div class="overlay"><div class="inner">
    <div class="row"><h1 class="grow">Gear & build</h1><button data-closebag>Close</button></div>
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
    app.innerHTML = titleScreen();
    bind();
    return;
  }
  const r = run;
  const s = r.scene;
  const body =
    s.t === "map" ? mapScene(r) : s.t === "combat" ? combatScene(r) : s.t === "loot" ? lootScene(r) : s.t === "pick" ? pickScene(r)
    : s.t === "resplendent" ? mapScene(r) : s.t === "talent" ? talentScene(r) : s.t === "shop" ? shopScene(r) : s.t === "forge" ? forgeScene(r)
    : s.t === "rest" ? restScene(r) : s.t === "confirm" ? confirmScene(r) : overScene(r);
  const msg = [r.message, note].filter(Boolean);
  app.innerHTML = `${hud(r)}${msg.map((m, i) => `<div class="toast ${i === msg.length - 1 && noteBad && note ? "err" : ""}">${esc(m)}</div>`).join("")}${body}${s.t === "resplendent" ? resplendentScene(r) : ""}${bagOpen ? bag(r) : ""}`;
  bind();
}

function on(sel: string, fn: (el: HTMLElement) => void) {
  app.querySelectorAll<HTMLElement>(sel).forEach(el => (el.onclick = ev => { ev.stopPropagation(); say(null); fn(el); render(); }));
}

function bind() {
  on("[data-origin]", el => { run = newRun(el.dataset.origin as OriginId); });
  if (!run) return;
  const r = run;
  on("[data-room]", el => { r.message = ""; chooseRoom(r, el.dataset.room as never); });
  on("[data-act]", el => combatAction(r, el.dataset.act as never));
  on("[data-potion]", () => drinkPotion(r));
  on("[data-bag]", () => { bagOpen = true; });
  on("[data-closebag]", () => { bagOpen = false; });
  on("[data-take]", el => say(takeItem(r, Number(el.dataset.take), el.dataset.how as "equip" | "pack")));
  on("[data-scrapfound]", el => scrapFound(r, Number(el.dataset.scrapfound)));
  on("[data-finish]", () => { r.message = ""; finishLoot(r); });
  on("[data-card]", el => pickResplendent(r, Number(el.dataset.card)));
  on("[data-claim]", () => say(claimResplendent(r)));
  on("[data-talent]", el => chooseTalent(r, el.dataset.talent!));
  on("[data-buy]", el => say(buy(r, Number(el.dataset.buy))));
  on("[data-reroll]", () => say(rerollShop(r)));
  on("[data-leave]", () => { r.message = ""; advance(r); });
  on("[data-up]", el => say(forgeUpgrade(r, Number(el.dataset.up))));
  on("[data-rr]", el => say(forgeReroll(r, Number(el.dataset.rr))));
  on("[data-rest]", el => say(rest(r, el.dataset.rest as "heal" | "cleanse")));
  on("[data-risk]", el => confirmRisk(r, el.dataset.risk === "yes"));
  on("[data-newrun]", () => { run = null; bagOpen = false; });
  on("[data-unequip]", el => say(unequip(r.hero, el.dataset.unequip as EquipSlot)));
  on("[data-equip]", el => { const it = r.hero.backpack.find(i => i.uid === Number(el.dataset.equip)); if (it) say(equipItem(r.hero, it, el.dataset.slot as EquipSlot)); });
  on("[data-salvage]", el => { const n = salvage(r.hero, Number(el.dataset.salvage)); say(`+${n} Scrap`, false); });
  on("[data-reveal]", el => { const err = reveal(r.hero, Number(el.dataset.reveal)); say(err ?? "The Legendary reveals its true power!", !!err); });
}

render();
