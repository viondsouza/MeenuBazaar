// Mangaluru areas we deliver to, with rough map positions, used to pick the nearest
// area from the customer's location. Bunder (Old Port) is where the boats land.
export const BUNDER = { name: "Bunder (Old Port)", lat: 12.8625, lng: 74.8355 };

export const AREAS = [
  { name: "Hampankatta", lat: 12.8697, lng: 74.843 },
  { name: "Falnir", lat: 12.8656, lng: 74.8467 },
  { name: "Attavar", lat: 12.8644, lng: 74.8517 },
  { name: "Valencia", lat: 12.8622, lng: 74.8574 },
  { name: "Kodialbail", lat: 12.877, lng: 74.842 },
  { name: "Kankanady", lat: 12.8721, lng: 74.8628 },
  { name: "Pumpwell", lat: 12.8697, lng: 74.8643 },
  { name: "Kadri", lat: 12.8846, lng: 74.8559 },
  { name: "Bejai", lat: 12.8885, lng: 74.8455 },
  { name: "Ladyhill", lat: 12.889, lng: 74.838 },
  { name: "Urwa", lat: 12.8936, lng: 74.8317 },
  { name: "Kulshekar", lat: 12.8812, lng: 74.8803 },
  { name: "Derebail", lat: 12.907, lng: 74.847 },
  { name: "Kottara", lat: 12.908, lng: 74.8355 },
  { name: "Surathkal", lat: 13.008, lng: 74.7954 },
  { name: "Thokottu", lat: 12.82, lng: 74.868 },
  { name: "Ullal", lat: 12.805, lng: 74.858 },
];

// Straight-line distance in km between two points on the map.
export function kmBetween(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

export function nearestArea(point: { lat: number; lng: number }) {
  return AREAS.reduce((best, a) => (kmBetween(point, a) < kmBetween(point, best) ? a : best));
}
