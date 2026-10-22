"use client";

import { createStore } from "./store";

// Fish the customer has saved with the ♥ button (by fish key), remembered in this browser.
const favs = createStore<string[]>("meenubazaar-favs", []);

export const useFavs = favs.use;
export function toggleFav(fishKey: string) {
  favs.set((list) => (list.includes(fishKey) ? list.filter((k) => k !== fishKey) : [...list, fishKey]));
}
