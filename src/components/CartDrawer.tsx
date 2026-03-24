"use client";

import React, { useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartDrawer() {
  const { items, isOpen, totalItems, subtotal, removeItem, updateQty, clearCart, closeCart } =
    useCart();

  // Lock body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeCart();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [closeCart]);

  return (
    <>
      {/* Backdrop */}
      <div
        aria-hidden="true"
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCart}
      />

      {/* Drawer panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-900">Your Cart</h2>
            {totalItems > 0 && (
              <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                {totalItems}
              </span>
            )}
          </div>
          <button
            onClick={closeCart}
            aria-label="Close cart"
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Cart items */}
        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gray-100">
              <svg className="h-10 w-10 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h9l3-8H6.4M7 13l-1.5 6h11M7 13H5m4 6a1 1 0 100 2 1 1 0 000-2zm8 0a1 1 0 100 2 1 1 0 000-2z" />
              </svg>
            </div>
            <div>
              <p className="text-base font-semibold text-gray-900">Your cart is empty</p>
              <p className="mt-1 text-sm text-gray-500">Add some items to get started.</p>
            </div>
            <Link
              href="/collections/all"
              onClick={closeCart}
              className="mt-2 inline-flex items-center gap-2 rounded-full bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
            >
              Browse Products
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        ) : (
          <>
            <ul className="flex-1 divide-y divide-gray-100 overflow-y-auto px-6 py-2">
              {items.map(({ product, quantity }) => (
                <li key={product.id} className="flex gap-4 py-5">
                  {/* Product image */}
                  <div className="relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-xl bg-gray-50">
                    {product.imageSrc ? (
                      <Image
                        src={product.imageSrc}
                        alt={product.title}
                        fill
                        sizes="80px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-gray-100 to-gray-200" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900 line-clamp-2 leading-snug">
                        {product.title}
                      </p>
                      <button
                        onClick={() => removeItem(product.id)}
                        aria-label={`Remove ${product.title}`}
                        className="flex-shrink-0 rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-red-500 transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      {/* Quantity stepper */}
                      <div className="flex items-center rounded-full border border-gray-200 bg-gray-50">
                        <button
                          onClick={() => updateQty(product.id, quantity - 1)}
                          aria-label="Decrease quantity"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
                          </svg>
                        </button>
                        <span className="w-8 text-center text-sm font-semibold text-gray-900">
                          {quantity}
                        </span>
                        <button
                          onClick={() => updateQty(product.id, quantity + 1)}
                          aria-label="Increase quantity"
                          className="flex h-8 w-8 items-center justify-center rounded-full text-gray-600 hover:bg-gray-200 transition-colors"
                        >
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                          </svg>
                        </button>
                      </div>

                      {/* Line total */}
                      <p className="text-sm font-semibold text-gray-900">
                        {new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: product.currency || "USD",
                        }).format(product.price * quantity)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="border-t border-gray-100 px-6 py-6 space-y-4">
              {/* Subtotal */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span className="text-lg font-bold text-gray-900">
                  {new Intl.NumberFormat("en-US", {
                    style: "currency",
                    currency: "USD",
                  }).format(subtotal)}
                </span>
              </div>
              <p className="text-xs text-gray-400">Shipping and taxes calculated at checkout.</p>

              {/* CTA */}
              <Link
                href="/checkout"
                onClick={closeCart}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-blue-600 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 hover:bg-blue-700 transition-colors"
              >
                Checkout
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>

              <div className="flex items-center justify-between">
                <Link
                  href="/collections/all"
                  onClick={closeCart}
                  className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  ← Continue Shopping
                </Link>
                <button
                  onClick={clearCart}
                  className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                >
                  Clear cart
                </button>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
}
