// Sound effects: recorded ones (Kenney's RPG Audio, CC0) where we have them, small synthesized ones otherwise.
import stepA from "../assets/sfx/footstep00.ogg";
import stepB from "../assets/sfx/footstep02.ogg";
import stepC from "../assets/sfx/footstep04.ogg";
import sliceA from "../assets/sfx/knifeSlice.ogg";
import sliceB from "../assets/sfx/knifeSlice2.ogg";
import creakU from "../assets/sfx/creak1.ogg";
import coinsU from "../assets/sfx/handleCoins.ogg";
import latchU from "../assets/sfx/metalLatch.ogg";
import drawU from "../assets/sfx/drawKnife2.ogg";
import clothU from "../assets/sfx/cloth2.ogg";
import potU from "../assets/sfx/metalPot2.ogg";
import pageU from "../assets/sfx/bookFlip2.ogg";
type Sfx = "roll" | "hit" | "graze" | "crit" | "miss" | "block" | "status" | "heal" | "reaction" | "chest" | "epic" | "legendary" | "crimson" | "win" | "lose" | "click" | "step" | "coins" | "equip" | "smash" | "page" | "drink";

/** Recorded clips, decoded on first use. */
const CLIPS: Partial<Record<Sfx, { urls: string[]; vol: number }>> = {
  step: { urls: [stepA, stepB, stepC], vol: 0.18 },
  // Hits, crits and reactions are the original punchy synth; only a graze uses a recorded slice.
  graze: { urls: [sliceA, sliceB], vol: 0.45 },
  chest: { urls: [creakU, latchU], vol: 0.5 },
  coins: { urls: [coinsU], vol: 0.45 },
  equip: { urls: [clothU, drawU], vol: 0.45 },
  smash: { urls: [potU], vol: 0.5 },
  page: { urls: [pageU], vol: 0.4 }
};
const decoded = new Map<string, AudioBuffer | null>();
function playClip(kind: Sfx): boolean {
  const c = CLIPS[kind];
  const a = ac();
  if (!c || !a) return false;
  const url = c.urls[Math.floor(Math.random() * c.urls.length)];
  const buf = decoded.get(url);
  if (buf === undefined) {
    decoded.set(url, null);
    void fetch(url).then(r => r.arrayBuffer()).then(d => a.decodeAudioData(d)).then(b => { decoded.set(url, b); }).catch(() => decoded.delete(url));
    return false;
  }
  if (!buf) return false;
  const src = a.createBufferSource();
  src.buffer = buf;
  src.playbackRate.value = 0.92 + Math.random() * 0.16;
  const g = a.createGain();
  g.gain.value = c.vol;
  src.connect(g).connect(a.destination);
  src.start();
  return true;
}
/** Start decoding the clips early (after the first tap), so the first hit already sounds right. */
export function warmClips() { for (const k of Object.keys(CLIPS) as Sfx[]) for (const u of CLIPS[k]!.urls) if (!decoded.has(u) && ac()) { decoded.set(u, null); void fetch(u).then(r => r.arrayBuffer()).then(d => ac()!.decodeAudioData(d)).then(b => { decoded.set(u, b); }).catch(() => decoded.delete(u)); } }

let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem("dd2-muted") === "1"; } catch { /* ignore */ }

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem("dd2-muted", muted ? "1" : "0"); } catch { /* ignore */ }
  applyVolume();
}

// ---------- Music: the title track on the menus, the gameplay track during a run ----------
export type Track = "title" | "game";
/** Where you are decides what plays: each place has a playlist that cycles track to track (a single track loops).
 *  The title and the Camp use the menu volume; the dungeon floors and the guardians' fights use the game volume. */
export type Place = "title" | "camp" | "floor" | "boss";
const PLAYLIST: Record<Place, string[]> = {
  title: ["music/title.mp3"],
  // (The Camp: one song, on loop.)
  camp: ["music/beyond_mist.mp3"],
  floor: ["music/hollow_vale.mp3", "music/silent_reach.mp3", "music/gameplay.mp3"],
  boss: ["music/moonlight.mp3", "music/pale_waters.mp3"]
};
const PLACE_TRACK: Record<Place, Track> = { title: "title", camp: "title", floor: "game", boss: "game" };
let place: Place | null = null;
const nextIn: Partial<Record<Place, number>> = {};
/** Default volumes: the gameplay track sits low under the action. */
const DEFAULT_VOL: Record<Track, number> = { title: 0.5, game: 0.15 };
const vol: Record<Track, number> = { ...DEFAULT_VOL };
for (const k of ["title", "game"] as Track[]) {
  try { const v = localStorage.getItem(`dd2-music-${k}`); if (v !== null && !Number.isNaN(Number(v))) vol[k] = Math.min(1, Math.max(0, Number(v))); } catch { /* ignore */ }
}
let music: HTMLAudioElement | null = null;
/** Music goes through a Web Audio gain node: iPhones ignore an audio element's own volume. */
let mctx: AudioContext | null = null;
let gain: GainNode | null = null;
let musicOff = false;
try { musicOff = localStorage.getItem("dd2-music-off") === "1"; } catch { /* ignore */ }
// Music used to have an on/off switch as well as sliders; now the sliders do it all. Music that was switched off becomes sliders at 0.
if (musicOff) { musicOff = false; try { localStorage.setItem("dd2-music-off", "0"); for (const k of Object.keys(vol) as Track[]) { vol[k] = 0; localStorage.setItem(`dd2-music-${k}`, "0"); } } catch { /* ignore */ } }
export const isMusicOff = () => musicOff;
export function toggleMusic() {
  musicOff = !musicOff;
  try { localStorage.setItem("dd2-music-off", musicOff ? "1" : "0"); } catch { /* ignore */ }
  applyVolume();
  if (!musicOff && music?.paused) tryPlay();
}
let musicKey: Track | null = null;
let unlockHooked = false;
/** True while the browser is refusing to play until the player taps (autoplay rules). */
let blocked = false;
let onUnblock: (() => void) | null = null;
export const musicBlocked = () => blocked && !muted && !musicOff;
/** Called when the music becomes blocked or starts after being blocked (to show/hide a "tap for music" hint). */
export function onMusicBlockChange(fn: () => void) { onUnblock = fn; }

/** Silence the music for a dramatic moment (DEATH's arrival); release to bring it back. */
let held = false;
export function holdMusic(on: boolean) {
  held = on;
  if (!music) return;
  if (on) music.pause();
  else tryPlay();
}

function tryPlay() {
  if (!music || held) return;
  const m = music;
  if (mctx && mctx.state === "suspended") void mctx.resume().catch(() => {});
  void m.play().then(() => {
    if (blocked) { blocked = false; onUnblock?.(); }
  }).catch(() => { if (m === music && !blocked) { blocked = true; onUnblock?.(); } });
}

export const musicVolume = (k: Track) => vol[k];
export function setMusicVolume(k: Track, v: number) {
  vol[k] = Math.min(1, Math.max(0, v));
  // The slider is the only music control now: turning it up brings the music back.
  if (vol[k] > 0 && musicOff) { musicOff = false; try { localStorage.setItem("dd2-music-off", "0"); } catch { /* ignore */ } if (music?.paused) tryPlay(); }
  try { localStorage.setItem(`dd2-music-${k}`, String(vol[k])); } catch { /* ignore */ }
  applyVolume();
}
function applyVolume() {
  if (!music || !musicKey) return;
  const v = muted || musicOff ? 0 : vol[musicKey];
  if (gain) {
    music.volume = 1;
    gain.gain.value = v;
  } else music.volume = v;
}

/** Hook a new track into the gain node (not for local files: browsers silence those through Web Audio). */
function routeThroughGain(m: HTMLAudioElement) {
  gain = null;
  if (typeof location === "undefined" || location.protocol === "file:") return;
  try {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    mctx ??= new AC();
    const g = mctx.createGain();
    mctx.createMediaElementSource(m).connect(g).connect(mctx.destination);
    gain = g;
  } catch {
    gain = null;
  }
}

/** The next track of a place's playlist (it starts somewhere different each session). */
function pickTrack(p: Place): string {
  const list = PLAYLIST[p];
  const i = (nextIn[p] ?? Math.floor(Math.random() * list.length)) % list.length;
  nextIn[p] = i + 1;
  return list[i];
}
/** Switch to a place's music (no-op if it's already playing). Browsers only allow sound after a tap, so we retry then. */
/** The dungeon: each floor gets the next track of the floor playlist, looped while you're on it. */
let floorKey = "";
export function playMusic(k: Track, where: Place = k === "title" ? "title" : "floor", key = "") {
  if (typeof Audio === "undefined") return;
  const newFloor = where === "floor" && key !== "" && key !== floorKey;
  if (place === where && music && !newFloor) { applyVolume(); if (music.paused) tryPlay(); return; }
  if (where === "floor" && key) floorKey = key;
  place = where;
  musicKey = PLACE_TRACK[where];
  const url = pickTrack(where);
  // One audio element for the whole session: making a new one (and a new Web Audio source) for every track change
  // leaked memory over many runs until the page slowed to a halt.
  if (music) { music.pause(); music.src = url; music.load(); }
  else {
    music = new Audio(url);
    music.preload = "auto";
    routeThroughGain(music);
    // At the end of a track, the place's next one (a playlist of one just loops).
    music.addEventListener("ended", () => { if (!music || !place) return; music.src = pickTrack(place); music.load(); tryPlay(); });
  }
  // (A floor's track loops until you leave the floor; a one-track playlist always loops.)
  music.loop = PLAYLIST[where].length === 1 || where === "floor";
  applyVolume();
  tryPlay();
  // Browsers (iPhones especially) only allow sound from a real tap or key press, and only some events
  // count: click and touchend do, pointerdown doesn't on iOS. Try again on the first one of them.
  if (!unlockHooked && typeof document !== "undefined") {
    unlockHooked = true;
    const unlock = () => { if (music && music.paused) tryPlay(); };
    for (const ev of ["click", "touchend", "keydown", "pointerup"]) document.addEventListener(ev, unlock, true);
  }
}

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(freq: number, dur: number, type: OscillatorType, vol = 0.12, slideTo?: number, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.15, cutoff = 1800, delay = 0) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + delay;
  const buf = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const f = a.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = cutoff;
  const g = a.createGain();
  g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t);
}

export function sfx(kind: Sfx) {
  if (muted) return;
  if (kind === "chest") { tone(392, 0.1, "triangle", 0.07); tone(523, 0.12, "triangle", 0.07, undefined, 0.08); tone(659, 0.16, "triangle", 0.06, undefined, 0.16); }
  if (CLIPS[kind] && playClip(kind)) return;
  switch (kind) {
    case "step": case "coins": case "equip": case "smash": case "page": return;
    case "roll": noise(0.05, 0.08, 3000); break;
    case "hit": noise(0.12, 0.25, 900); tone(110, 0.12, "triangle", 0.15, 60); break;
    case "crit": noise(0.18, 0.3, 1400); tone(220, 0.2, "sawtooth", 0.1, 90); tone(660, 0.15, "square", 0.05, undefined, 0.03); break;
    case "miss": tone(500, 0.18, "sine", 0.06, 200); break;
    case "block": tone(900, 0.08, "square", 0.06); tone(1300, 0.18, "triangle", 0.05, 900, 0.02); break;
    case "status": tone(330, 0.12, "sine", 0.07, 260); break;
    case "heal": tone(520, 0.12, "sine", 0.07); tone(780, 0.16, "sine", 0.06, undefined, 0.08); break;
    case "reaction": noise(0.25, 0.2, 2500); tone(180, 0.3, "sawtooth", 0.08, 700); break;
    case "chest": noise(0.08, 0.12, 1200); break;
    case "drink": // a clink of glass, then three gulps
      tone(1760, 0.05, "triangle", 0.035);
      tone(240, 0.09, "sine", 0.14, 430, 0.07); tone(220, 0.09, "sine", 0.14, 400, 0.2); tone(250, 0.1, "sine", 0.13, 470, 0.33);
      noise(0.05, 0.03, 900);
      break;
    case "graze": noise(0.08, 0.14, 1600); tone(160, 0.08, "triangle", 0.07, 90); break;
    case "epic": [523, 659, 784].forEach((f, i) => tone(f, 0.22, "triangle", 0.08, undefined, i * 0.08)); break;
    case "legendary":
      [392, 523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, "triangle", 0.09, undefined, i * 0.1));
      tone(1047, 0.9, "sine", 0.06, undefined, 0.5); tone(1568, 0.9, "sine", 0.035, undefined, 0.55); noise(0.6, 0.05, 6000, 0.45);
      break;
    case "crimson":
      tone(98, 1.2, "sawtooth", 0.08, 70); noise(0.5, 0.12, 900);
      [294, 349, 440, 523, 698].forEach((f, i) => tone(f, 0.32, "sawtooth", 0.06, undefined, 0.25 + i * 0.11));
      tone(1397, 1.1, "sine", 0.05, undefined, 0.85); tone(932, 1.1, "sine", 0.04, undefined, 0.85);
      break;
    case "win": [392, 523, 659, 784].forEach((f, i) => tone(f, 0.2, "square", 0.05, undefined, i * 0.1)); break;
    case "lose": [330, 262, 196].forEach((f, i) => tone(f, 0.3, "sawtooth", 0.06, undefined, i * 0.15)); break;
    case "click": tone(700, 0.03, "square", 0.03); break;
  }
}
