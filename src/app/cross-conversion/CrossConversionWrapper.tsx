"use client";

import { builder } from "@builder.io/sdk";
import { ReactNode, useCallback, useRef } from "react";

interface CrossConversionWrapperProps {
  children: ReactNode;
}

// Production configuration
const SHOPIFY_DOMAIN = "builder-dev.myshopify.com";

// Helper function to extract variation ID from cookies
const getVariationIdFromCookies = (): string | null => {
  try {
    const cookies = document.cookie.split('; ');
    // Look for any cookie that starts with 'builder.tests.'
    const testCookie = cookies.find(cookie => cookie.startsWith('builder.tests.'));
    if (testCookie) {
      const value = testCookie.split('=')[1];
      return value;
    }
    return null;
  } catch (error) {
    return null;
  }
};

// Helper function to safely get visitor ID from localStorage
const getVisitorId = (): string | null => {
  try {
    return localStorage.getItem('builderVisitorId');
  } catch (error) {
    return null;
  }
};

// Helper function to safely store tracking data
const storeTrackingData = (data: any): void => {
  try {
    localStorage.setItem('builderTrackingData', JSON.stringify(data));
  } catch (error) {
    // Silently fail
  }
};

export function CrossConversionWrapper({ children }: CrossConversionWrapperProps) {
  const isProcessingRef = useRef(false);

  const handleClick = useCallback((event: React.MouseEvent<HTMLDivElement>) => {
    // Prevent multiple rapid clicks
    if (isProcessingRef.current) {
      return;
    }

    try {
      const target = event.target as HTMLElement;
      const linkElement = target.closest(".products-grid__cta a") as HTMLAnchorElement;

      if (!linkElement) {
        return;
      }

      const href = linkElement.getAttribute("href") || linkElement.dataset.href;

      // Check if href contains the Shopify domain
      if (!href || !href.includes(SHOPIFY_DOMAIN)) {
        return;
      }

      isProcessingRef.current = true;

      // Get all the necessary tracking information before navigation
      const sessionId = builder.sessionId;
      const visitorId = getVisitorId();
      const variationId = getVariationIdFromCookies() || localStorage.getItem('builder.tests') || null;

      // Log tracking data extraction
      console.log("Cross-domain tracking data extracted", {
        sessionId,
        visitorId,
        variationId,
        href
      });

      event.preventDefault();

      // Add tracking parameters to URL for proper attribution
      const url = new URL(href);
      
      if (sessionId) {
        url.searchParams.set('builder.overrideSessionId', sessionId);
      }
      
      if (visitorId) {
        url.searchParams.set('builder.overrideVisitorId', visitorId);
      }
      
      if (variationId) {
        url.searchParams.set('builder.overrideVariationId', variationId);
      }

      // Store the tracking data in localStorage as a backup
      const trackingData = {
        sessionId,
        visitorId,
        variationId,
        timestamp: Date.now(),
        source: 'cross-conversion'
      };
      storeTrackingData(trackingData);

      // Navigate to the modified URL
      window.location.href = url.toString();

    } catch (error) {
      // Silently fail
    } finally {
      // Reset processing flag after a delay to prevent rapid clicks
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 1000);
    }
  }, []);

  return <div onClick={handleClick}>{children}</div>;
}
