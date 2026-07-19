"use client";

import React, { createContext, useContext, useEffect, useReducer, useRef, useState } from "react";

export type CartItem = {
  productId: string;
  variantId: string;
  sku: string;
  name: string;
  variantLabel: string;
  price: number; // INR whole rupees
  qty: number;
  image: string;
};

// Keyed by the cart item's *current* variantId. `null` means the item is no
// longer resolvable (product deactivated or that size no longer exists) and
// should be dropped; otherwise the item is remapped to the live variant/price.
type SyncUpdates = Record<string, { variantId: string; productId: string; price: number } | null>;

type Action =
  | { type: "LOAD"; payload: CartItem[] }
  | { type: "ADD"; item: Omit<CartItem, "qty"> }
  | { type: "REMOVE"; variantId: string }
  | { type: "SET_QTY"; variantId: string; qty: number }
  | { type: "SYNC"; updates: SyncUpdates }
  | { type: "CLEAR" };

function reducer(state: CartItem[], action: Action): CartItem[] {
  switch (action.type) {
    case "LOAD":
      return action.payload;
    case "ADD": {
      const idx = state.findIndex((i) => i.variantId === action.item.variantId);
      if (idx >= 0) {
        return state.map((i, n) =>
          n === idx ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...state, { ...action.item, qty: 1 }];
    }
    case "REMOVE":
      return state.filter((i) => i.variantId !== action.variantId);
    case "SET_QTY":
      if (action.qty <= 0)
        return state.filter((i) => i.variantId !== action.variantId);
      return state.map((i) =>
        i.variantId === action.variantId ? { ...i, qty: action.qty } : i
      );
    case "SYNC":
      return state.flatMap((i) => {
        if (!(i.variantId in action.updates)) return [i];
        const update = action.updates[i.variantId];
        if (!update) return [];
        return [{ ...i, variantId: update.variantId, productId: update.productId, price: update.price }];
      });
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

export type CartSyncResult = { removed: string[]; updated: string[] };

type CartCtx = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
  syncCart: () => Promise<CartSyncResult>;
  // Set once, right after the cart is hydrated from localStorage, if that
  // hydration healed anything (see resolveSync below). Pages read this once
  // on mount to show a notice, then clear it so it doesn't linger.
  syncNotice: CartSyncResult | null;
  clearSyncNotice: () => void;
};

const CartContext = createContext<CartCtx | null>(null);

const STORAGE_KEY = "dc_cart";

// Re-resolves a given set of cart lines against the live catalogue (see
// /api/cart/sync) and computes remap/drop updates for any variantId that's
// gone stale — e.g. because an admin edit renamed/removed that size.
async function resolveSync(
  items: CartItem[],
): Promise<{ updates: SyncUpdates; removed: string[]; updated: string[] }> {
  const skus = Array.from(new Set(items.map((i) => i.sku)));
  if (skus.length === 0) return { updates: {}, removed: [], updated: [] };

  let products: Record<string, { productId: string; variants: { id: string; label: string; price: number }[] }>;
  try {
    const res = await fetch("/api/cart/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ skus }),
    });
    if (!res.ok) return { updates: {}, removed: [], updated: [] };
    ({ products } = await res.json());
  } catch {
    return { updates: {}, removed: [], updated: [] };
  }

  const updates: SyncUpdates = {};
  const removed: string[] = [];
  const updated: string[] = [];

  for (const item of items) {
    const entry = products[item.sku];
    if (!entry) {
      updates[item.variantId] = null;
      removed.push(item.name);
      continue;
    }
    const match =
      entry.variants.find((v) => v.id === item.variantId) ??
      entry.variants.find((v) => v.label.toLowerCase() === item.variantLabel.toLowerCase());

    if (!match) {
      updates[item.variantId] = null;
      removed.push(`${item.name} (${item.variantLabel})`);
    } else if (match.id !== item.variantId || match.price !== item.price || entry.productId !== item.productId) {
      updates[item.variantId] = { variantId: match.id, productId: entry.productId, price: match.price };
      updated.push(item.name);
    }
  }

  return { updates, removed, updated };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);
  const itemsRef = React.useRef(items);
  itemsRef.current = items;
  const [syncNotice, setSyncNotice] = useState<CartSyncResult | null>(null);

  // Both effects below fire on mount in the same pass, in declaration order.
  // The hydrate effect *dispatches* the loaded cart, but that update isn't
  // reflected in `items` until the next render — so without this guard, the
  // persist effect below would run first with the still-empty initial state
  // and immediately overwrite localStorage with "[]", wiping out a real
  // cart on every hard page reload. Skipping the very first persist pass
  // lets the hydrate dispatch land first; the effect re-fires right after
  // with the real loaded items and persists those instead.
  const skipNextPersist = useRef(true);

  // Hydrate from localStorage once on mount (client-only), then immediately
  // re-resolve against the live catalogue. This runs here — using the
  // freshly-parsed array directly — rather than leaving it to consuming
  // pages to call syncCart() in their own mount effect: a page's effect is a
  // *child* of this provider and fires before this provider's own effects,
  // so by the time it ran, `items` (and therefore itemsRef) would still be
  // the empty initial state and there'd be nothing yet to sync.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      let loaded: CartItem[] = [];
      try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) loaded = JSON.parse(raw);
      } catch {}
      if (loaded.length === 0) return;

      dispatch({ type: "LOAD", payload: loaded });
      const { updates, removed, updated } = await resolveSync(loaded);
      if (cancelled) return;
      if (Object.keys(updates).length > 0) dispatch({ type: "SYNC", updates });
      if (removed.length > 0 || updated.length > 0) setSyncNotice({ removed, updated });
    })();
    return () => { cancelled = true; };
  }, []);

  // Persist on every change
  useEffect(() => {
    if (skipNextPersist.current) {
      skipNextPersist.current = false;
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);

  // Manual re-sync — e.g. right before submitting an order, as a last-second
  // safety net against a catalogue change made while the customer was on the
  // page. Safe to call any time after hydration since it reads itemsRef.
  async function syncCart(): Promise<CartSyncResult> {
    const { updates, removed, updated } = await resolveSync(itemsRef.current);
    if (Object.keys(updates).length > 0) dispatch({ type: "SYNC", updates });
    return { removed, updated };
  }

  return (
    <CartContext.Provider
      value={{
        items,
        totalItems,
        totalPrice,
        addItem: (item) => dispatch({ type: "ADD", item }),
        removeItem: (variantId) => dispatch({ type: "REMOVE", variantId }),
        setQty: (variantId, qty) => dispatch({ type: "SET_QTY", variantId, qty }),
        clearCart: () => dispatch({ type: "CLEAR" }),
        syncCart,
        syncNotice,
        clearSyncNotice: () => setSyncNotice(null),
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside <CartProvider>");
  return ctx;
}
