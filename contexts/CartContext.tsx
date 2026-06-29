"use client";

import React, { createContext, useContext, useEffect, useReducer } from "react";

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

type Action =
  | { type: "LOAD"; payload: CartItem[] }
  | { type: "ADD"; item: Omit<CartItem, "qty"> }
  | { type: "REMOVE"; variantId: string }
  | { type: "SET_QTY"; variantId: string; qty: number }
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
    case "CLEAR":
      return [];
    default:
      return state;
  }
}

type CartCtx = {
  items: CartItem[];
  totalItems: number;
  totalPrice: number;
  addItem: (item: Omit<CartItem, "qty">) => void;
  removeItem: (variantId: string) => void;
  setQty: (variantId: string, qty: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartCtx | null>(null);

const STORAGE_KEY = "dc_cart";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, dispatch] = useReducer(reducer, []);

  // Hydrate from localStorage once on mount (client-only)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) dispatch({ type: "LOAD", payload: JSON.parse(raw) });
    } catch {}
  }, []);

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const totalItems = items.reduce((s, i) => s + i.qty, 0);
  const totalPrice = items.reduce((s, i) => s + i.price * i.qty, 0);

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
