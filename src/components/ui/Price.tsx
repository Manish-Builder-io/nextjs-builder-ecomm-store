import React from "react";
import { formatPrice } from "@/utils/format";

interface PriceProps {
  amount: number;
  currency: string;
  compareAt?: number;
  className?: string;
}

export function Price({ amount, currency, compareAt, className }: PriceProps) {
  const isOnSale = typeof compareAt === "number" && compareAt > amount;

  return (
    <div className={`flex items-center gap-2 ${className ?? ""}`}>
      <span className="text-base font-semibold">{formatPrice(amount, currency)}</span>
      {isOnSale && (
        <span className="text-sm text-gray-500 line-through">
          {formatPrice(compareAt as number, currency)}
        </span>
      )}
    </div>
  );
}

export default Price;



