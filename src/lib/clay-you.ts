"use client";

// ─── Your clay pictures, on this device ──────────────────────────────────────
// The portrait and album moments are kept in IndexedDB (too big for
// localStorage). The album is painted in the background, two at a time, and
// any screen can watch it fill in through `useClayYou`.

import { useEffect, useSyncExternalStore } from "react";
import type { Look } from "./character";
import type { SceneKey } from "./clay-prompts";

export const ALBUM: SceneKey[] = ["family", "travel", "build", "abundant", "peaceful", "wealthier"];

type Pic = "portrait" | SceneKey;
export type ClayState = {
  pics: Partial<Record<Pic, string>>;
  painting: SceneKey[];
  /** The look the stored pictures were made from. */
  look: string | null;
};

// ── IndexedDB (failures are non-fatal: you just see the shared art) ─────────

const DB = "monifes-clay";
const STORE = "pics";

function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idb<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>) {
  const d = await db();
  return new Promise<T>((resolve, reject) => {
    const req = run(d.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// ── A tiny store screens can subscribe to ───────────────────────────────────

let state: ClayState = { pics: {}, painting: [], look: null };
let loaded = false;
const listeners = new Set<() => void>();

function set(next: Partial<ClayState>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

async function load() {
  if (loaded) return;
  loaded = true;
  try {
    const saved = await idb<{ pics: ClayState["pics"]; look: string } | undefined>(
      "readonly",
      (s) => s.get("you"),
    );
    if (saved) set({ pics: { ...saved.pics, ...state.pics }, look: state.look ?? saved.look });
  } catch {}
}

async function persist() {
  try {
    await idb("readwrite", (s) => s.put({ pics: state.pics, look: state.look }, "you"));
  } catch {}
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const SERVER: ClayState = { pics: {}, painting: [], look: null };

/** Your clay pictures as they exist (and arrive). */
export function useClayYou() {
  useEffect(() => {
    load();
  }, []);
  return useSyncExternalStore(subscribe, () => state, () => SERVER);
}

export const lookId = (look: Look) => JSON.stringify(look);

// ── Talking to the server ────────────────────────────────────────────────────

export type ClayError = "unavailable" | "limit" | "failed";

async function request(body: object): Promise<string> {
  let res: Response;
  try {
    res = await fetch("/api/clay", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw "failed" satisfies ClayError;
  }
  if (res.status === 503) throw "unavailable" satisfies ClayError;
  if (res.status === 429) throw "limit" satisfies ClayError;
  const json = (await res.json().catch(() => null)) as { image?: string } | null;
  if (!res.ok || !json?.image) throw "failed" satisfies ClayError;
  return json.image;
}

const inflight = new Map<string, Promise<string>>();

/**
 * Make your portrait. Not kept until you say it's you (`keepPortrait`).
 * Asking again for the same look while one is on its way shares it, unless
 * `fresh` (a deliberate "try again").
 */
export function makePortrait(look: Look, fresh = false) {
  const id = lookId(look);
  const pending = inflight.get(id);
  if (pending && !fresh) return pending;
  const p = request({ look }).finally(() => {
    if (inflight.get(id) === p) inflight.delete(id);
  });
  inflight.set(id, p);
  return p;
}

/** "That's me": keep the portrait and start painting your album. */
export async function keepPortrait(look: Look, portrait: string) {
  await load();
  set({ pics: { portrait }, look: lookId(look), painting: [...ALBUM] });
  persist();

  const queue = [...ALBUM];
  const worker = async () => {
    for (let scene = queue.shift(); scene; scene = queue.shift()) {
      try {
        const pic = await request({ look, scene, portrait });
        if (state.look !== lookId(look)) return; // you changed your look meanwhile
        set({ pics: { ...state.pics, [scene]: pic } });
        persist();
      } catch {
        // leave the shared art in its place
      }
      set({ painting: state.painting.filter((s) => s !== scene) });
    }
  };
  await Promise.all([worker(), worker()]);
}
