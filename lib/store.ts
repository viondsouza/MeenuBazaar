"use client";

import { useSyncExternalStore } from "react";

// Does a saved value have the same shape as the starting value? (An array stays an array,
// an object keeps its keys and their types.) Anything else is treated as broken.
function sameShape(value: unknown, initial: unknown): boolean {
  if (Array.isArray(initial)) return Array.isArray(value);
  if (initial !== null && typeof initial === "object") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
    return Object.entries(initial).every(([k, v]) => sameShape((value as Record<string, unknown>)[k], v));
  }
  return typeof value === typeof initial;
}

// A tiny saved-in-this-browser store (cart, chosen area, language). It survives a page
// refresh, and every component using it updates together. If the browser blocks storage
// (private mode), it still works for the current visit. A saved value with the wrong shape
// (edited by hand, or left by an older version) is ignored, so it can't break a page;
// `clean` drops or fixes bad entries inside a value that has the right shape.
export function createStore<T>(key: string, initial: T, clean: (value: T) => T = (v) => v) {
  let value: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) {
        const parsed: unknown = JSON.parse(saved);
        if (sameShape(parsed, initial)) value = clean(parsed as T);
      }
    } catch {
      // storage blocked or corrupt: keep the initial value
    }
  }

  function set(next: T | ((prev: T) => T)) {
    load();
    value = typeof next === "function" ? (next as (prev: T) => T)(value) : next;
    try {
      window.localStorage.setItem(key, JSON.stringify(value));
    } catch {
      // storage blocked: the value still lives in memory for this visit
    }
    listeners.forEach((l) => l());
  }

  function subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function get() {
    load();
    return value;
  }

  function use(): T {
    return useSyncExternalStore(subscribe, get, () => initial);
  }

  return { use, set, get };
}

// Keeps only the entries of a saved map that pass a check, e.g. finite kg numbers.
export function keepEntries<V>(map: Record<string, V>, ok: (v: unknown) => boolean): Record<string, V> {
  return Object.fromEntries(Object.entries(map).filter(([, v]) => ok(v)));
}

// Wipes everything MeenuBazaar saved in this browser (used by the error page).
export function clearSavedData() {
  try {
    for (const k of Object.keys(window.localStorage)) if (k.startsWith("meenubazaar")) window.localStorage.removeItem(k);
  } catch {
    // storage blocked: nothing saved to clear
  }
}
