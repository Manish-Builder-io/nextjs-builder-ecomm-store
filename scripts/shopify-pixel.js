// Builder.io Conversion Tracking Pixel for Shopify
// This pixel handles conversion tracking with proper A/B test attribution
// Production-ready version with optimized performance and error handling

const BUILDER_STORAGE_KEY = 'builderPendingEvents';
const API_KEY = 'db60bf3db7fa4db7be81ef05b72bd720';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const TRACKING_DATA_TTL = 30 * 60 * 1000; // 30 minutes

// Helper function to get URL parameters with multiple fallback methods
const getUrlParam = (param) => {
  try {
    // Method 1: Standard URLSearchParams
    const urlParams = new URLSearchParams(window.location.search);
    let value = urlParams.get(param);
    
    // Method 2: Check hash parameters if not found in search
    if (!value && window.location.hash) {
      const hashParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
      value = hashParams.get(param);
    }
    
    // Method 3: Check document referrer for cross-domain tracking
    if (!value && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        const referrerParams = new URLSearchParams(referrerUrl.search);
        value = referrerParams.get(param);
      } catch (e) {
        // Skip invalid referrer URLs
      }
    }
    
    return value;
  } catch (error) {
    return null;
  }
};

// Helper function to get session ID from Builder.io cookies
const getSessionIdFromBuilderCookies = () => {
  try {
    const cookies = document.cookie.split('; ');
    
    // Try multiple session ID cookie formats that Builder.io uses
    const sessionIdCookies = [
      'builderSessionId=',
      'builder.sessionId=',
      'builder_session_id=',
      'builder-session-id='
    ];
    
    for (const cookiePrefix of sessionIdCookies) {
      const sessionCookie = cookies.find(cookie => cookie.startsWith(cookiePrefix));
      if (sessionCookie) {
        const value = sessionCookie.split('=')[1];
        return value;
      }
    }
    
    // Try localStorage as fallback (in case it was stored there)
    const localStorageSessionId = localStorage.getItem('builderSessionId') || 
                                 localStorage.getItem('builder.sessionId') ||
                                 localStorage.getItem('builder_session_id');
    
    if (localStorageSessionId) {
      return localStorageSessionId;
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

// Helper function to get variation ID from builder.tests cookie
const getVariationIdFromCookie = () => {
  try {
    const cookies = document.cookie.split('; ');
    
    // Debug: Log all cookies to see what's available
    console.log("All cookies for variation ID search:", cookies);
    
    // Look for any cookie that starts with 'builder.tests.' or contains 'test'
    // Format: builder.tests.{testId}={variationId}
    // Example: builder.tests.dbaa45faae53485498974c6cd037da87=c89dab8773af45c68f31908014201d5b
    const testCookies = cookies.filter(cookie => 
      cookie.startsWith('builder.tests.') || 
      cookie.includes('builder') && cookie.includes('test')
    );
    
    // Also look for any cookie that might contain variation data
    const allBuilderCookies = cookies.filter(cookie => cookie.includes('builder'));
    console.log("All Builder.io cookies:", allBuilderCookies);
    
    console.log("Builder test cookies found:", testCookies);
    
    if (testCookies.length > 0) {
      // If multiple test cookies, use the first one (most recent)
      const testCookie = testCookies[0];
      const value = testCookie.split('=')[1];
      console.log("Using variation ID from cookie:", { cookie: testCookie, value });
      return value;
    }
    
    // Try localStorage as fallback
    const localStorageVariationId = localStorage.getItem('builderVariationId') ||
                                   localStorage.getItem('builder.variationId') ||
                                   localStorage.getItem('builder_variation_id') ||
                                   localStorage.getItem('builder.tests');
    
    console.log("localStorage variation ID check:", {
      builderVariationId: localStorage.getItem('builderVariationId'),
      'builder.variationId': localStorage.getItem('builder.variationId'),
      builder_variation_id: localStorage.getItem('builder_variation_id'),
      'builder.tests': localStorage.getItem('builder.tests')
    });
    
    if (localStorageVariationId) {
      console.log("Using variation ID from localStorage:", localStorageVariationId);
      return localStorageVariationId;
    }
    
    console.log("No variation ID found in cookies or localStorage");
    return null;
  } catch (error) {
    console.log("Error extracting variation ID:", error);
    return null;
  }
};

// Helper function to safely get storage data
const getPendingEvents = () => {
  try {
    const stored = localStorage.getItem(BUILDER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    return [];
  }
};

// Helper function to safely store data
const storePendingEvent = (eventData) => {
  try {
    const events = getPendingEvents();
    events.push(eventData);
    localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(events));
  } catch (error) {
    // Silently fail
  }
};

// Helper function to remove stored events
const removePendingEvents = () => {
  try {
    localStorage.removeItem(BUILDER_STORAGE_KEY);
  } catch (error) {
    // Silently fail
  }
};

// Function to send tracking data to Builder.io
const sendToBuilder = async (eventData, retryCount = 0) => {
  try {
    const payload = { events: [eventData] };
    
    const response = await fetch(
      `https://cdn.builder.io/api/v1/track?apiKey=${API_KEY}`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
        headers: {
          'content-type': 'application/json',
        },
        mode: 'cors',
        keepalive: true,
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Only log successful events
    console.log("Builder.io conversion tracked successfully", {
      type: eventData.type,
      amount: eventData.data?.amount,
      sessionId: eventData.data?.sessionId,
      variationId: eventData.data?.variationId
    });
    return true;
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      const delay = RETRY_DELAY * Math.pow(2, retryCount); // Exponential backoff
      await new Promise((resolve) => setTimeout(resolve, delay));
      return sendToBuilder(eventData, retryCount + 1);
    }

    storePendingEvent(eventData);
    return false;
  }
};

// Main tracking function with proper A/B test attribution
const trackConversion = ({ amountInfo, meta = {} }) => {
  // Check URL parameters first for overrides from cross-conversion page
  const overrideSessionId = getUrlParam('builder.overrideSessionId');
  const overrideVisitorId = getUrlParam('builder.overrideVisitorId');
  const overrideVariationId = getUrlParam('builder.overrideVariationId');
  
  // Check localStorage for tracking data if URL params are missing
  let backupTrackingData = null;
  if (!overrideSessionId || !overrideVariationId) {
    try {
      const stored = localStorage.getItem('builderTrackingData');
      if (stored) {
        backupTrackingData = JSON.parse(stored);
        
        // Check if the data is recent (within TTL)
        const dataAge = Date.now() - backupTrackingData.timestamp;
        if (dataAge >= TRACKING_DATA_TTL) {
          backupTrackingData = null;
        }
      }
    } catch (error) {
      // Silently fail
    }
  }
  
  // Fallback to cookies/localStorage if URL params not found
  const sessionId = overrideSessionId || 
    (backupTrackingData && backupTrackingData.sessionId) ||
    getSessionIdFromBuilderCookies() || null;

  const visitorId = overrideVisitorId || 
    (backupTrackingData && backupTrackingData.visitorId) ||
    localStorage.getItem('builderVisitorId') || null;

  // Use the proper variation ID extraction for A/B tests
  const variationId = overrideVariationId || 
    (backupTrackingData && backupTrackingData.variationId) ||
    getVariationIdFromCookie() || null;

  // Debug logging for variation ID extraction
  console.log("Variation ID extraction result:", {
    overrideVariationId,
    backupVariationId: backupTrackingData && backupTrackingData.variationId,
    cookieVariationId: getVariationIdFromCookie(),
    finalVariationId: variationId
  });

  // Extract URL path and host for proper attribution
  const urlPath = new URL(location.href).pathname;
  const host = new URL(location.href).host;
  
  // Detect device type (simplified)
  const device = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop';

  // Ensure amount is always a number
  const amount = typeof amountInfo.amount === 'string' 
    ? parseFloat(amountInfo.amount) 
    : Number(amountInfo.amount);

  const eventData = {
    type: 'conversion',
    data: {
      amount: amount,
      metadata: {
        sdkVersion: '6.1.2', // Match the working SDK version
        url: location.href,
        currency: amountInfo.currencyCode,
        timestamp: new Date().toISOString(),
        user: {}, // Add empty user object to match working format
        ...meta,
      },
      ownerId: API_KEY,
      userAttributes: {
        urlPath, // Add URL path for proper attribution
        host, // Add host for proper attribution
        device, // Add device information
        sessionId,
        visitorId,
        variationId, // This should now have the correct value
      },
      sessionId,
      visitorId,
    },
  };

  return sendToBuilder(eventData);
};

// Main event listener for checkout completion
analytics.subscribe('checkout_completed', (event) => {
  if (!event.data || !event.data.checkout) {
    return;
  }

  const checkout = event.data.checkout;

  trackConversion({
    amountInfo: checkout.totalPrice,
    meta: {
      additionalData: 'Conversion Recorded',
      eventId: event.id,
      clientId: event.clientId,
      order_id: checkout.order?.id || `checkout_token:${checkout.token}`,
    },
  });
});

// Track page views for better attribution
analytics.subscribe('page_viewed', (event) => {
  // Store current session and variation info
  const sessionId = getUrlParam('builder.overrideSessionId') || getSessionIdFromBuilderCookies() || null;
  const variationId = getUrlParam('builder.overrideVariationId') || getVariationIdFromCookie() || null;
  
  // Store tracking data for cross-domain use
  if (sessionId || variationId) {
    try {
      const trackingData = {
        sessionId,
        variationId,
        timestamp: Date.now(),
        source: 'page-view'
      };
      localStorage.setItem('builderTrackingData', JSON.stringify(trackingData));
    } catch (error) {
      // Silently fail
    }
  }
});

// Function to store current tracking data for cross-domain fallback
const storeCurrentTrackingData = () => {
  try {
    const sessionId = getSessionIdFromBuilderCookies();
    const visitorId = localStorage.getItem('builderVisitorId');
    const variationId = getVariationIdFromCookie();
    
    if (sessionId || visitorId || variationId) {
      const trackingData = {
        sessionId,
        visitorId,
        variationId,
        timestamp: Date.now(),
        url: location.href
      };
      
      localStorage.setItem('builderTrackingData', JSON.stringify(trackingData));
    }
  } catch (error) {
    // Silently fail
  }
};

// Try to send pending events on page load and store current tracking data
window.addEventListener('load', async () => {
  try {
    // Preserve tracking parameters from URL for multi-page flow
    window.preserveTrackingParams();
    
    // Store current tracking data for potential cross-domain use
    storeCurrentTrackingData();
    
    const pendingEvents = getPendingEvents();
    if (pendingEvents.length > 0) {
      const results = await Promise.all(
        pendingEvents.map((event) => sendToBuilder(event))
      );

      if (results.every(Boolean)) {
        removePendingEvents();
      }
    }
  } catch (error) {
    // Silently fail
  }
});

// Backup tracking before page unload using sendBeacon
window.addEventListener('beforeunload', () => {
  try {
    const pendingEvents = getPendingEvents();
    if (pendingEvents.length > 0) {
      // Send each event individually wrapped in { events: [...] }
      pendingEvents.forEach(event => {
        navigator.sendBeacon(
          `https://cdn.builder.io/api/v1/track?apiKey=${API_KEY}`,
          JSON.stringify({ events: [event] })
        );
      });
      removePendingEvents();
    }
  } catch (error) {
    // Silently fail
  }
});



// Cross-domain tracking helper function for multi-page flow
// This handles the journey: Builder.io → Product page → Cart → Checkout → Thank you
// 
// USAGE EXAMPLE:
// In your Builder.io page, before redirecting to any Shopify page:
// 
// const shopifyUrl = "https://builder-dev.myshopify.com/products/some-product";
// const enhancedUrl = window.setupCrossDomainTracking(shopifyUrl);
// window.location.href = enhancedUrl;
//
// Or for a button click:
// <button onclick="window.location.href = window.setupCrossDomainTracking('https://builder-dev.myshopify.com/products/some-product')">
//   View Product
// </button>
window.setupCrossDomainTracking = (shopifyUrl) => {
  try {
    const sessionId = getSessionIdFromBuilderCookies();
    const visitorId = localStorage.getItem('builderVisitorId');
    const variationId = getVariationIdFromCookie();
    
    if (shopifyUrl) {
      const url = new URL(shopifyUrl);
      
      // Add tracking parameters to the URL
      if (sessionId) {
        url.searchParams.set('builder.overrideSessionId', sessionId);
      }
      
      if (visitorId) {
        url.searchParams.set('builder.overrideVisitorId', visitorId);
      }
      
      if (variationId) {
        url.searchParams.set('builder.overrideVariationId', variationId);
      }
      
      // Store tracking data in localStorage for persistence across Shopify pages
      const trackingData = {
        sessionId,
        visitorId,
        variationId,
        timestamp: Date.now(),
        source: 'builder-to-shopify',
        originalUrl: shopifyUrl
      };
      
      try {
        localStorage.setItem('builderTrackingData', JSON.stringify(trackingData));
      } catch (error) {
        // Silently fail
      }
      
      return url.toString();
    }
    
    return shopifyUrl;
  } catch (error) {
    return shopifyUrl;
  }
};

// Helper function to preserve tracking parameters across Shopify pages
// This should be called on every Shopify page to maintain tracking continuity
window.preserveTrackingParams = () => {
  try {
    // Get current tracking parameters from URL
    const urlSessionId = getUrlParam('builder.overrideSessionId');
    const urlVisitorId = getUrlParam('builder.overrideVisitorId');
    const urlVariationId = getUrlParam('builder.overrideVariationId');
    
    // If we have URL parameters, store them for future pages
    if (urlSessionId || urlVisitorId || urlVariationId) {
      const trackingData = {
        sessionId: urlSessionId,
        visitorId: urlVisitorId,
        variationId: urlVariationId,
        timestamp: Date.now(),
        source: 'url-params',
        currentUrl: location.href
      };
      
      localStorage.setItem('builderTrackingData', JSON.stringify(trackingData));
      
      // Also add them to any internal links on the page to maintain continuity
      addTrackingToInternalLinks(urlSessionId, urlVisitorId, urlVariationId);
    }
  } catch (error) {
    // Silently fail
  }
};

// Helper function to add tracking parameters to internal Shopify links
const addTrackingToInternalLinks = (sessionId, visitorId, variationId) => {
  try {
    // Find all internal links (links to the same domain)
    const currentDomain = location.hostname;
    const links = document.querySelectorAll('a[href]');
    
    links.forEach(link => {
      try {
        const href = link.getAttribute('href');
        if (href && (href.startsWith('/') || href.includes(currentDomain))) {
          const url = new URL(href, location.origin);
          
          // Only add parameters if they don't already exist
          if (sessionId && !url.searchParams.has('builder.overrideSessionId')) {
            url.searchParams.set('builder.overrideSessionId', sessionId);
          }
          if (visitorId && !url.searchParams.has('builder.overrideVisitorId')) {
            url.searchParams.set('builder.overrideVisitorId', visitorId);
          }
          if (variationId && !url.searchParams.has('builder.overrideVariationId')) {
            url.searchParams.set('builder.overrideVariationId', variationId);
          }
          
          link.setAttribute('href', url.toString());
        }
      } catch (error) {
        // Skip invalid URLs
      }
    });
  } catch (error) {
    // Silently fail
  }
};

// Function to handle dynamic content loading (for Shopify's AJAX navigation)
const handleDynamicContent = () => {
  // Re-add tracking parameters to any new links that might have been loaded
  const urlSessionId = getUrlParam('builder.overrideSessionId');
  const urlVisitorId = getUrlParam('builder.overrideVisitorId');
  const urlVariationId = getUrlParam('builder.overrideVariationId');
  
  if (urlSessionId || urlVisitorId || urlVariationId) {
    addTrackingToInternalLinks(urlSessionId, urlVisitorId, urlVariationId);
  }
};

// Set up mutation observer to handle dynamically loaded content
const setupDynamicContentObserver = () => {
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      let shouldUpdateLinks = false;
      
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
          // Check if any new links were added
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.tagName === 'A' || node.querySelector('a')) {
                shouldUpdateLinks = true;
              }
            }
          });
        }
      });
      
      if (shouldUpdateLinks) {
        // Debounce the link updates
        setTimeout(handleDynamicContent, 100);
      }
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
};

// Initialize dynamic content handling when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupDynamicContentObserver);
} else {
  setupDynamicContentObserver();
}
