"use client";

import { createStore } from "./store";

export type Cut = "whole" | "cleaned" | "fry";

// One fish, cut a certain way. Normally the best boats are picked at checkout (and a big
// order is split across boats); listingId is set only if the customer chose one boat.
export type CartItem = {
  fishKey: string;
  fishName: string;
  fishKn: string;
  cut: Cut;
  kg: number;
  listingId?: string;
};

const cart = createStore<CartItem[]>("meenubazaar-cart-v2", []);

export const useCart = cart.use;

// Adding the same fish, from the same boat, with the same cut adds to its kg,
// never going above maxKg (what's left in stock, and at most 20 kg).
export function addToCart(item: CartItem, maxKg = 20) {
  const cap = Math.min(20, maxKg);
  cart.set((items) => {
    const same = items.find((i) => i.fishKey === item.fishKey && i.cut === item.cut && i.listingId === item.listingId);
    if (!same) return [...items, { ...item, kg: Math.min(cap, item.kg) }];
    return items.map((i) => (i === same ? { ...i, kg: Math.min(cap, i.kg + item.kg) } : i));
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
