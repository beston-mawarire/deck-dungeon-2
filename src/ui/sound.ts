// Small synthesized sound effects (Web Audio), no files needed.
type Sfx = "roll" | "hit" | "crit" | "miss" | "block" | "status" | "heal" | "reaction" | "chest" | "epic" | "legendary" | "crimson" | "win" | "lose" | "click";

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
const TRACK_URL: Record<Track, string> = { title: "music/title.mp3", game: "music/gameplay.mp3" };
/** Default volumes: the gameplay track sits low under the action. */
const DEFAULT_VOL: Record<Track, number> = { title: 0.5, game: 0.15 };
const vol: Record<Track, number> = { ...DEFAULT_VOL };
for (const k of ["title", "game"] as Track[]) {
  try { const v = localStorage.getItem(`dd2-music-${k}`); if (v !== null && !Number.isNaN(Number(v))) vol[k] = Math.min(1, Math.max(0, Number(v))); } catch { /* ignore */ }
}
let music: HTMLAudioElement | null = null;
let musicKey: Track | null = null;
let unlockHooked = false;

export const musicVolume = (k: Track) => vol[k];
export function setMusicVolume(k: Track, v: number) {
  vol[k] = Math.min(1, Math.max(0, v));
  try { localStorage.setItem(`dd2-music-${k}`, String(vol[k])); } catch { /* ignore */ }
  applyVolume();
}
function applyVolume() {
  if (music && musicKey) music.volume = muted ? 0 : vol[musicKey];
}

/** Switch to a track (no-op if it's already playing). Browsers only allow sound after a tap, so we retry then. */
export function playMusic(k: Track) {
  if (typeof Audio === "undefined") return;
  if (musicKey === k && music) { applyVolume(); if (music.paused) void music.play().catch(() => {}); return; }
  if (music) { music.pause(); music.src = ""; }
  musicKey = k;
  music = new Audio(TRACK_URL[k]);
  music.loop = true;
  music.preload = "auto";
  applyVolume();
  void music.play().catch(() => {});
  if (!unlockHooked && typeof document !== "undefined") {
    unlockHooked = true;
    const unlock = () => { if (music && music.paused) void music.play().catch(() => {}); };
    document.addEventListener("pointerdown", unlock, true);
    document.addEventListener("keydown", unlock, true);
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
  switch (kind) {
    case "roll": noise(0.05, 0.08, 3000); break;
    case "hit": noise(0.12, 0.25, 900); tone(110, 0.12, "triangle", 0.15, 60); break;
    case "crit": noise(0.18, 0.3, 1400); tone(220, 0.2, "sawtooth", 0.1, 90); tone(660, 0.15, "square", 0.05, undefined, 0.03); break;
    case "miss": tone(500, 0.18, "sine", 0.06, 200); break;
    case "block": tone(900, 0.08, "square", 0.06); tone(1300, 0.18, "triangle", 0.05, 900, 0.02); break;
    case "status": tone(330, 0.12, "sine", 0.07, 260); break;
    case "heal": tone(520, 0.12, "sine", 0.07); tone(780, 0.16, "sine", 0.06, undefined, 0.08); break;
    case "reaction": noise(0.25, 0.2, 2500); tone(180, 0.3, "sawtooth", 0.08, 700); break;
    case "chest": tone(392, 0.1, "triangle", 0.08); tone(523, 0.12, "triangle", 0.08, undefined, 0.08); break;
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
