// The Great Reset: when RESET_EPOCH goes up, every device wipes everything this game keeps in the browser once
// (runs, meta, unlocks, shards, plates, gems, the Codex, name, settings, its player id, session storage and any caches)
// and starts fresh. Imported first, before anything reads a save.
//   Epoch 1: the Great Reset (1.40.0). Epoch 2: a second, complete wipe to be sure (1.42.0).
export const RESET_EPOCH = 2;
export let justReset = false;
try {
  if (Number(localStorage.getItem("dd2-epoch") ?? "0") < RESET_EPOCH) {
    const drop: string[] = [];
    for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k && k.startsWith("dd2-")) drop.push(k); }
    // A brand-new player has nothing to lose: only tell players who had something here.
    justReset = drop.some(k => k === "dd2-meta-v1" || k.startsWith("dd2-run") || k === "dd2-epoch");
    for (const k of drop) localStorage.removeItem(k);
    try { sessionStorage.clear(); } catch { /* ignore */ }
    localStorage.setItem("dd2-epoch", String(RESET_EPOCH));
    // Anything else the browser may hold for this site: caches, databases, service workers.
    try { if ("caches" in self) void caches.keys().then(ks => Promise.all(ks.map(k => caches.delete(k)))).catch(() => undefined); } catch { /* ignore */ }
    try { const idb = indexedDB as IDBFactory & { databases?: () => Promise<{ name?: string }[]> }; void idb.databases?.().then(ds => ds.forEach(d => d.name && idb.deleteDatabase(d.name))).catch(() => undefined); } catch { /* ignore */ }
    try { void navigator.serviceWorker?.getRegistrations().then(rs => rs.forEach(r => void r.unregister())).catch(() => undefined); } catch { /* ignore */ }
  }
} catch { /* storage unavailable */ }
