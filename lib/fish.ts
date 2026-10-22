import credits from "./photo-credits.json";

// Photos in public/photos (from Wikimedia Commons, credited in the footer) and the
// filter group each fish belongs to. Keys match the Supabase fish table.
export type Group = "fish" | "shellfish";

export const FISH_INFO: Record<string, { photo: string; group: Group }> = {
  bangude: { photo: "/photos/bangude.jpg", group: "fish" },
  bhutai: { photo: "/photos/bhutai.jpg", group: "fish" },
  anjal: { photo: "/photos/anjal.jpg", group: "fish" },
  maanji: { photo: "/photos/maanji.jpg", group: "fish" },
  kane: { photo: "/photos/kane.jpg", group: "fish" },
  balchatte: { photo: "/photos/balchatte.jpg", group: "fish" },
  etti: { photo: "/photos/etti.jpg", group: "shellfish" },
  bondas: { photo: "/photos/bondas.jpg", group: "shellfish" },
  denji: { photo: "/photos/denji.jpg", group: "shellfish" },
};

export const PHOTO_CREDITS = credits as Record<string, { author: string; license: string; source: string }>;
