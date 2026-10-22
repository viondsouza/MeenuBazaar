"use client";

import { useSyncExternalStore } from "react";

// A tiny saved-in-this-browser store (cart, chosen area, language). It survives a page
// refresh, and every component using it updates together. If the browser blocks storage
// (private mode), it still works for the current visit.
export function createStore<T>(key: string, initial: T) {
  let value: T = initial;
  let loaded = false;
  const listeners = new Set<() => void>();

  function load() {
    if (loaded || typeof window === "undefined") return;
    loaded = true;
    try {
      const saved = window.localStorage.getItem(key);
      if (saved) value = JSON.parse(saved) as T;
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
