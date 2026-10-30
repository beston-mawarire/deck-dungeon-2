// Combat Lab: pick a class, give it relics and talents, and fight enemies to test the library.
import { loadLibrary } from "../data";
import { ELITE_AFFIXES } from "../data/enemies";
import { RELICS } from "../data/relics";
import { TALENTS } from "../data/talents";
import { armorOf, damageOf, playRound, startBattle, type Action } from "../engine/combat";
import { CLASSES, makeEnemy, makeHero, SUIT_ICON } from "../engine/fighters";
import { makeRng } from "../engine/rng";
import { getItem } from "../engine/registry";
import { REACTIONS, STATUS_INFO } from "../engine/statuses";
import type { Battle, ClassId, Fighter, ItemDef, StatusId, Suit } from "../engine/types";

loadLibrary();

const app = document.getElementById("app")!;
const rng = makeRng(Date.now() & 0xffffffff);
const esc = (s: string) => s.replace(/[&<>]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!);

let cls: ClassId = "king";
let hero: Fighter = makeHero(cls, rng);
let battle: Battle | null = null;
let carnage = 0;
let act = 1;
let elite = false;
let fights = 0;
let tab: "relics" | "talents" = "relics";

function newHero(c: ClassId) {
  cls = c;
  hero = makeHero(c, rng);
  battle = null;
  carnage = 0;
  fights = 0;
}

function nextFight() {
  const suits: Suit[] = ["S", "C", "H", "D"];
  const suit = suits[Math.floor(rng() * 4)];
  const value = 2 + Math.floor(rng() * 9);
  const affixes = elite ? [ELITE_AFFIXES[Math.floor(rng() * ELITE_AFFIXES.length)].id] : [];
  const enemy = makeEnemy(value, suit, act, { elite, affixes });
  battle = startBattle(hero, enemy, Math.floor(rng() * 1e9), carnage);
  carnage = 0;
}

function bossFight() {
  const suits: Suit[] = ["S", "C", "H", "D"];
  const boss = (["J", "Q", "K"] as const)[act - 1];
  battle = startBattle(hero, makeEnemy(0, suits[Math.floor(rng() * 4)], act, { boss }), Math.floor(rng() * 1e9), carnage);
  carnage = 0;
}

function act_(a: Action) {
  if (!battle) return;
  playRound(battle, a);
  if (battle.over) {
    if (battle.over === "won") fights++;
    carnage = battle.carnage;
  }
  render();
}

const statusChips = (f: Fighter) =>
  (Object.entries(f.statuses) as [StatusId, number][])
    .filter(([, n]) => n > 0)
    .map(([s, n]) => `<span class="chip" title="${esc(STATUS_INFO[s].text)}">${STATUS_INFO[s].icon} ${STATUS_INFO[s].name} ${n}</span>`)
    .join("");

function fighterPanel(f: Fighter, enemy: boolean) {
  const pct = Math.max(0, (f.hp / f.maxHp) * 100);
  const extra = enemy
    ? Object.keys(f.items).map(id => getItem(id).name).join(", ")
    : `Damage ${damageOf(f)} · Armor ${armorOf(f)} · Gold ${f.gold ?? 0}`;
  return `<div class="panel">
    <div class="name">${esc(f.name)}${enemy ? "" : ` <span class="stats">— ${CLASSES[f.cls!].title}</span>`}</div>
    <div class="bar ${enemy ? "enemy" : ""}"><i style="width:${pct}%"></i></div>
    <div class="stats">${Math.max(0, f.hp)} / ${f.maxHp} HP${enemy ? ` · Power ${f.damage} · Armor ${armorOf(f)}` : ""}</div>
    <div class="stats">${esc(extra)}</div>
    <div class="chips">${statusChips(f)}</div>
  </div>`;
}

function lastRoll(b: Battle) {
  for (let i = b.log.length - 1; i >= 0; i--) {
    const m = b.log[i].match(/^(.*) rolls (\d)\.$/) ?? b.log[i].match(/^(.*) rolls (\d) and (\d)/);
    if (m && m[1] === b.player.name) return Number(m[2]);
    const c = b.log[i].match(/^(.*) plays (.*):/);
    if (c && c[1] === b.player.name) return c[2];
  }
  return null;
}

function itemRow(d: ItemDef) {
  const n = hero.items[d.id] ?? 0;
  const locked = d.cls && d.cls !== cls;
  if (locked) return "";
  return `<div class="item ${n ? "have" : ""}">
    <div class="r-${d.rarity}"><b>${esc(d.name)}</b><small>${esc(d.text)}</small><br><small>${d.tags.join(" · ")}${d.cls ? ` · ${CLASSES[d.cls].name} only` : ""}</small></div>
    <div class="stack"><button data-dec="${d.id}" ${n ? "" : "disabled"}>−</button><b>${n}</b><button data-inc="${d.id}">+</button></div>
  </div>`;
}

function render() {
  const b = battle;
  const roll = b ? lastRoll(b) : null;
  const dieCls = roll === 6 || roll === 7 ? "crit" : roll === 1 ? "graze" : "";
  const list = (tab === "relics" ? RELICS : TALENTS).filter(d => !(d.id === CLASSES[cls].start));

  app.innerHTML = `
    <h1>Deck Dungeon <span>2</span> — Combat Lab</h1>
    <p class="sub">Try the die faces, statuses and reactions. Pick a hero, add relics and talents, then fight.</p>

    <h2>Hero</h2>
    <div class="row">${(Object.keys(CLASSES) as ClassId[]).map(c => `<button data-cls="${c}" class="${c === cls ? "on" : ""}">${CLASSES[c].name}</button>`).join("")}</div>
    <p class="sub" style="margin-top:6px">${esc(CLASSES[cls].rule)} Starts with ${esc(getItem(CLASSES[cls].start).name)}: ${esc(getItem(CLASSES[cls].start).text)}.</p>

    <h2>Fight</h2>
    <div class="row">
      ${[1, 2, 3].map(a => `<button data-act="${a}" class="${a === act ? "on" : ""}">Act ${a}</button>`).join("")}
      <button data-elite class="${elite ? "on" : ""}">Elite</button>
      <button class="primary" data-next ${b && !b.over ? "disabled" : ""}>${b ? "Next fight" : "Start fight"}</button>
      <button data-boss ${b && !b.over ? "disabled" : ""}>Boss</button>
      <button data-reset>New hero</button>
    </div>
    <p class="sub" style="margin-top:6px">Fights won: ${fights}${carnage ? ` · 👑 Carnage ready: ${carnage}` : ""}</p>

    ${b ? `
    <div class="grid2">${fighterPanel(b.player, false)}${fighterPanel(b.enemy, true)}</div>
    <div class="panel" style="margin-top:10px">
      ${b.over ? `<div class="banner ${b.over === "lost" ? "lost" : "won"}">${b.over === "won" ? "Victory!" : b.over === "lost" ? "Defeated" : "Fled"}</div>` : ""}
      ${roll !== null ? `<div class="die ${dieCls}">${typeof roll === "number" ? roll : "🂠"}</div>${typeof roll === "string" ? `<p class="center">${esc(roll)}</p>` : ""}` : ""}
      <div class="row" style="justify-content:center;margin-top:10px">
        <button class="primary" data-a="attack" ${b.over ? "disabled" : ""}>Attack</button>
        <button data-a="guard" ${b.over ? "disabled" : ""}>Guard</button>
        <button data-a="flee" ${b.over ? "disabled" : ""}>Flee</button>
      </div>
      <div class="log" style="margin-top:10px">${b.log.slice().reverse().map(l => `<div class="${l.startsWith("—") ? "round" : ""}">${esc(l)}</div>`).join("")}</div>
    </div>` : `<div class="panel">${fighterPanel(hero, false)}</div>`}

    <h2>Build</h2>
    <div class="row"><button data-tab="relics" class="${tab === "relics" ? "on" : ""}">Relics</button><button data-tab="talents" class="${tab === "talents" ? "on" : ""}">Talents</button></div>
    <div class="items" style="margin-top:8px">${list.map(itemRow).join("")}</div>

    <details><summary>Status effects</summary><table>${(Object.keys(STATUS_INFO) as StatusId[]).map(s => `<tr><td>${STATUS_INFO[s].icon} ${STATUS_INFO[s].name}</td><td>${esc(STATUS_INFO[s].text)}</td></tr>`).join("")}</table></details>
    <details><summary>Reactions</summary><table>${REACTIONS.map(r => `<tr><td>${r.name}</td><td>${STATUS_INFO[r.a].icon} + ${STATUS_INFO[r.b].icon}</td><td>${esc(r.text)}</td></tr>`).join("")}</table></details>
    <details><summary>Faces</summary><p class="sub">1 = Graze (half damage) · 2–5 = Hit · 6 = Crit (double, ignores Armor). Items add effects to faces. Enemies: ${(["S", "C", "H", "D"] as Suit[]).map(s => `${SUIT_ICON[s]} ${esc(getItem("trait_" + s).text)}`).join(" · ")}.</p></details>
  `;

  app.querySelectorAll<HTMLButtonElement>("[data-cls]").forEach(el => (el.onclick = () => { newHero(el.dataset.cls as ClassId); render(); }));
  app.querySelectorAll<HTMLButtonElement>("[data-act]").forEach(el => (el.onclick = () => { act = Number(el.dataset.act); render(); }));
  app.querySelector<HTMLButtonElement>("[data-elite]")!.onclick = () => { elite = !elite; render(); };
  app.querySelector<HTMLButtonElement>("[data-next]")!.onclick = () => { nextFight(); render(); };
  app.querySelector<HTMLButtonElement>("[data-boss]")!.onclick = () => { bossFight(); render(); };
  app.querySelector<HTMLButtonElement>("[data-reset]")!.onclick = () => { newHero(cls); render(); };
  app.querySelectorAll<HTMLButtonElement>("[data-a]").forEach(el => (el.onclick = () => act_(el.dataset.a as Action)));
  app.querySelectorAll<HTMLButtonElement>("[data-tab]").forEach(el => (el.onclick = () => { tab = el.dataset.tab as typeof tab; render(); }));
  app.querySelectorAll<HTMLButtonElement>("[data-inc]").forEach(el => (el.onclick = () => { hero.items[el.dataset.inc!] = (hero.items[el.dataset.inc!] ?? 0) + 1; render(); }));
  app.querySelectorAll<HTMLButtonElement>("[data-dec]").forEach(el => (el.onclick = () => { const id = el.dataset.dec!; hero.items[id] = Math.max(0, (hero.items[id] ?? 0) - 1); if (!hero.items[id]) delete hero.items[id]; render(); }));
}

render();
