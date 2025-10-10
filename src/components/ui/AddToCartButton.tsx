"use client";
import React from "react";

interface AddToCartButtonProps {
  onAdd?: () => void;
  className?: string;
}

export function AddToCartButton({ onAdd, className }: AddToCartButtonProps) {
  return (
    <button
      type="button"
      onClick={onAdd}
      className={`inline-flex items-center justify-center rounded-md bg-black text-white px-4 py-2 text-sm font-medium hover:bg-black/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-black disabled:opacity-50 disabled:cursor-not-allowed dark:bg-white dark:text-black dark:hover:bg-white/90 ${className ?? ""}`}
    >
      Add to cart
    </button>
  );
}

export default AddToCartButton;



