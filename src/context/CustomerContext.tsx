"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { builder } from "@builder.io/sdk";
import type { Product } from "@/types/product";

/**
 * Customer state: wishlist, signed-in customer and order history.
 *
 * NOTE: everything here is persisted in the visitor's browser (localStorage). That is enough for a
 * demo/storefront shell and for Builder targeting, but a real deployment must replace `signIn`,
 * `placeOrder` and the persistence with calls to its commerce backend / identity provider.
 */

export interface Customer {
  email: string;
  name: string;
  /** Used for Builder audience targeting (customerGroupids) */
  groups: string[];
}

export interface OrderLine {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  placedAt: string;
  lines: OrderLine[];
  subtotal: number;
  shipping: number;
  tax: number;
  total: number;
  currency: string;
  email: string;
  shippingAddress: { name: string; line1: string; city: string; postal: string; country: string };
}

interface CustomerContextValue {
  ready: boolean;
  customer: Customer | null;
  signIn: (email: string, name?: string) => void;
  signOut: () => void;
  wishlist: Product[];
  isWishlisted: (id: string) => boolean;
  toggleWishlist: (product: Product) => void;
  orders: Order[];
  placeOrder: (order: Omit<Order, "id" | "placedAt">) => Order;
  lastOrder: Order | null;
}

const CustomerContext = createContext<CustomerContextValue | null>(null);

const KEYS = { customer: "customer", wishlist: "wishlist", orders: "orders" } as const;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage unavailable (private mode / quota) — state still works for the session
  }
}

export function CustomerProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [wishlist, setWishlist] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    setCustomer(read<Customer | null>(KEYS.customer, null));
    setWishlist(read<Product[]>(KEYS.wishlist, []));
    setOrders(read<Order[]>(KEYS.orders, []));
    setReady(true);
  }, []);

  // Feed customer state into Builder targeting so signed-in / group audiences work client-side.
  useEffect(() => {
    if (!ready) return;
    builder.setUserAttributes({
      loggedIn: !!customer,
      customerGroupids: customer?.groups.join(",") ?? "g1",
    });
  }, [ready, customer]);

  const signIn = useCallback((email: string, name?: string) => {
    const next: Customer = { email, name: name?.trim() || email.split("@")[0], groups: ["g1"] };
    setCustomer(next);
    write(KEYS.customer, next);
  }, []);

  const signOut = useCallback(() => {
    setCustomer(null);
    try {
      localStorage.removeItem(KEYS.customer);
    } catch {}
  }, []);

  const toggleWishlist = useCallback((product: Product) => {
    setWishlist((prev) => {
      const next = prev.some((p) => p.id === product.id)
        ? prev.filter((p) => p.id !== product.id)
        : [...prev, product];
      write(KEYS.wishlist, next);
      return next;
    });
  }, []);

  const placeOrder = useCallback((order: Omit<Order, "id" | "placedAt">) => {
    const placed: Order = {
      ...order,
      id: `ORD-${Date.now().toString(36).toUpperCase()}`,
      placedAt: new Date().toISOString(),
    };
    setOrders((prev) => {
      const next = [placed, ...prev];
      write(KEYS.orders, next);
      return next;
    });
    return placed;
  }, []);

  const value = useMemo<CustomerContextValue>(
    () => ({
      ready,
      customer,
      signIn,
      signOut,
      wishlist,
      isWishlisted: (id) => wishlist.some((p) => p.id === id),
      toggleWishlist,
      orders,
      placeOrder,
      lastOrder: orders[0] ?? null,
    }),
    [ready, customer, signIn, signOut, wishlist, toggleWishlist, orders, placeOrder]
  );

  return <CustomerContext.Provider value={value}>{children}</CustomerContext.Provider>;
}

export function useCustomer(): CustomerContextValue {
  const ctx = useContext(CustomerContext);
  if (!ctx) throw new Error("useCustomer must be used within <CustomerProvider>");
  return ctx;
}
