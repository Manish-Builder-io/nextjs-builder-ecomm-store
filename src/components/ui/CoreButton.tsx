"use client";

import React from "react";

interface CoreButtonProps {
  variant?: "primary" | "secondary" | "outline" | "ghost";
  fontSize?: string;
  text?: string;
  link?: string;
  target?: "_self" | "_blank" | "_parent" | "_top";
  className?: string;
}

export default function CoreButton({
  variant = "primary",
  fontSize = "16",
  text = "Button",
  link = "#",
  target = "_self",
  className = "",
}: CoreButtonProps) {
  // Base button styles
  const baseStyles = "inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2";
  
  // Variant-specific styles
  const variantStyles = {
    primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-500",
    secondary: "bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500",
    outline: "border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
    ghost: "text-blue-600 hover:bg-blue-50 focus:ring-blue-500",
  };

  // Size-based padding (you can adjust these)
  const paddingStyles = "px-4 py-2 rounded-md";

  const buttonStyles = `${baseStyles} ${variantStyles[variant]} ${paddingStyles} ${className}`;
  const style = fontSize ? { fontSize: `${fontSize}px` } : {};

  // Handle click for anchor links (same-page navigation)
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (!link || target !== "_self") return;
    
    // Check if it's a pure anchor link (starts with #)
    if (link.startsWith("#")) {
      e.preventDefault();
      const targetId = link.substring(1); // Remove the # symbol
      const targetElement = document.getElementById(targetId);
      
      if (targetElement) {
        // Smooth scroll to the target element
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
        
        // Update URL hash without triggering scroll
        window.history.pushState(null, "", link);
      }
      return;
    }
    
    // Check if it's a relative URL with hash fragment (e.g., /page#section)
    const hashIndex = link.indexOf("#");
    if (hashIndex !== -1 && !link.startsWith("http")) {
      // Check if we're on the same page (same pathname)
      const currentPath = window.location.pathname;
      const linkPath = link.substring(0, hashIndex);
      
      // If the path matches current path or is empty (same page), handle anchor
      if (linkPath === currentPath || linkPath === "" || linkPath === "/") {
        e.preventDefault();
        const hash = link.substring(hashIndex); // Get the hash part (#section)
        const targetId = hash.substring(1); // Remove the # symbol
        const targetElement = document.getElementById(targetId);
        
        if (targetElement) {
          // Smooth scroll to the target element
          targetElement.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
          
          // Update URL hash
          window.history.pushState(null, "", hash);
        }
      }
    }
    // For external links or links with target="_blank", let default behavior handle it
  };

  // Check if it's an anchor link that needs special handling
  const isAnchorLink = link && target === "_self" && 
    (link.startsWith("#") || (link.includes("#") && !link.startsWith("http")));

  // If link is provided, render as anchor tag, otherwise as button
  if (link && link !== "#") {
    return (
      <a
        href={link}
        target={target}
        rel={target === "_blank" ? "noopener noreferrer" : undefined}
        onClick={isAnchorLink ? handleClick : undefined}
        className={buttonStyles}
        style={style}
      >
        {text}
      </a>
    );
  }

  return (
    <button
      type="button"
      className={buttonStyles}
      style={style}
    >
      {text}
    </button>
  );
}
