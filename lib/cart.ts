"use client";

import { createStore } from "./store";

export type Cut = "whole" | "cleaned" | "fry";

// One fish from one boat. The price is the one the customer saw; checkout refuses the
// order if the boat has changed it since, so nobody pays a price they didn't agree to.
export type CartItem = {
  listingId: string;
  fishKey: string;
  fishName: string;
  fishKn: string | null;
  boat: string;
  harbour: string;
  pricePerKg: number;
  kg: number;
  cut: Cut;
};

const cart = createStore<CartItem[]>("meenubazaar-cart", []);

export const useCart = cart.use;

// Adding the same fish, from the same boat, with the same cut adds to its kg,
// never going above maxKg (what's left in stock, and at most 20 kg).
export function addToCart(item: CartItem, maxKg = 20) {
  const cap = Math.min(20, maxKg);
  cart.set((items) => {
    const same = items.find((i) => i.listingId === item.listingId && i.cut === item.cut);
    if (!same) return [...items, { ...item, kg: Math.min(cap, item.kg) }];
    return items.map((i) => (i === same ? { ...i, kg: Math.min(cap, i.kg + item.kg), pricePerKg: item.pricePerKg } : i));
  });
}

export function updateCartItem(index: number, change: Partial<CartItem>) {
  cart.set((items) => items.map((i, n) => (n === index ? { ...i, ...change } : i)));
}

// Change an item's kg by a step (e.g. +0.5), keeping it between 0.5 kg and maxKg.
export function stepCartItem(index: number, step: number, maxKg = 20) {
  const cap = Math.min(20, maxKg);
  cart.set((items) => items.map((i, n) => (n === index ? { ...i, kg: Math.min(cap, Math.max(0.5, i.kg + step)) } : i)));
}

export function removeFromCart(index: number) {
  cart.set((items) => items.filter((_, n) => n !== index));
}

export function clearCart() {
  cart.set([]);
}
