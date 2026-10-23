"use client";

import { createStore } from "./store";

export type Lang = "en" | "kn";

// The delivery area and language the customer picked, remembered in this browser.
const prefs = createStore<{ area: string; lang: Lang }>("meenubazaar-prefs", { area: "", lang: "en" }, (p) => ({
  ...p,
  lang: p.lang === "kn" ? "kn" : "en",
}));

export const usePrefs = prefs.use;
export const setArea = (area: string) => prefs.set((p) => ({ ...p, area }));
export const setLang = (lang: Lang) => prefs.set((p) => ({ ...p, lang }));
