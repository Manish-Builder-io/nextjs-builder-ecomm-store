"use client";

import { builder } from "@builder.io/react";
import { useState } from "react";

interface ConversionButtonProps {
  text?: string;
  amount?: number;
  className?: string;
  variant?: "primary" | "secondary" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  onClick?: () => void;
}

export default function ConversionButton({
  text = "Track Conversion",
  amount,
  className = "",
  variant = "primary",
  size = "md",
  disabled = false,
  onClick,
}: ConversionButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    if (disabled || isLoading) return;

    setIsLoading(true);
    
    try {
      // Fire the conversion event
      if (amount !== undefined && amount > 0) {
        console.log(`Tracking conversion with amount: $${amount}`);
        builder.trackConversion(amount);
      } else {
        console.log("Tracking conversion without amount");
        builder.trackConversion();
      }

      // Call custom onClick if provided
      if (onClick) {
        onClick();
      }

      console.log("Conversion tracked successfully");
    } catch (error) {
      console.error("Error tracking conversion:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Base styles
  const baseStyles = "inline-flex items-center justify-center font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  // Variant styles
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    outline: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 focus:ring-blue-500",
  };

  // Size styles
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2 text-base",
    lg: "px-6 py-3 text-lg",
  };

  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`;

  return (
    <button
      type="button"
      className={buttonStyles}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <>
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Tracking...
        </>
      ) : (
        text
      )}
    </button>
  );
}
