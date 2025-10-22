"use client";

import { builder } from "@builder.io/sdk";
import { ReactNode } from "react";

interface CrossConversionWrapperProps {
  children: ReactNode;
}

export function CrossConversionWrapper({ children }: CrossConversionWrapperProps) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const linkElement = target.closest(".products-grid__cta a") as HTMLAnchorElement;

    if (linkElement) {
      const href = linkElement.getAttribute("href") || linkElement.dataset.href;

      // Check if href contains 'builder-dev.myshopify.com'
      if (
        href &&
        href.includes("builder-dev.myshopify.com")
      ) {
        // Get all the necessary tracking information before navigation
        const sessionId = builder.sessionId;
        const visitorId = localStorage.getItem('builderVisitorId');
        
        // Get variation ID from builder tests cookie with correct format
        // Cookie format: builder.tests.{testId}={variationId}
        // Example: builder.tests.dbaa45faae53485498974c6cd037da87=c89dab8773af45c68f31908014201d5b
        const getVariationId = () => {
          const cookies = document.cookie.split('; ');
          // Look for any cookie that starts with 'builder.tests.'
          const testCookie = cookies.find(cookie => cookie.startsWith('builder.tests.'));
          if (testCookie) {
            const value = testCookie.split('=')[1];
            console.log("Found builder test cookie:", testCookie, "Value:", value);
            return value;
          }
          return null;
        };
        
        const variationId = getVariationId() || localStorage.getItem('builder.tests') || null;

        console.log("Tracking data:", { 
          href, 
          sessionId, 
          visitorId, 
          variationId,
          allCookies: document.cookie.split('; ').filter(c => c.includes('builder'))
        });
        
        event.preventDefault();
        
        // Track the conversion immediately
        builder.trackConversion();
        
        // Add both session and visitor parameters to URL for proper attribution
        const url = new URL(href);
        url.searchParams.set('builder.overrideSessionId', sessionId);
        
        // Also set visitor ID if available for better tracking
        if (visitorId) {
          url.searchParams.set('builder.overrideVisitorId', visitorId);
        }
        
        // Set variation ID if available
        if (variationId) {
          url.searchParams.set('builder.overrideVariationId', variationId);
        }
        
        console.log("Redirecting to:", url.toString());
        console.log("URL parameters being set:", {
          sessionId,
          visitorId,
          variationId,
          finalUrl: url.toString()
        });
        
        // Also store the tracking data in localStorage as a backup
        // in case URL parameters get lost during Shopify checkout flow
        const trackingData = {
          sessionId,
          visitorId,
          variationId,
          timestamp: Date.now(),
          source: 'cross-conversion'
        };
        localStorage.setItem('builderTrackingData', JSON.stringify(trackingData));
        console.log("Stored tracking data in localStorage:", trackingData);
        
        // Navigate to the modified URL
        window.location.href = url.toString();
      }
    }
  };

  return <div onClick={handleClick}>{children}</div>;
}
