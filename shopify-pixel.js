// Builder.io Conversion Tracking Pixel for Shopify
// This pixel handles conversion tracking with proper A/B test attribution

const BUILDER_STORAGE_KEY = 'builderPendingEvents';
const API_KEY = 'db60bf3db7fa4db7be81ef05b72bd720';
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

// Helper function to get URL parameters
const getUrlParam = (param) => {
  try {
    const urlParams = new URLSearchParams(window.location.search);
    const value = urlParams.get(param);
    console.log(`getUrlParam(${param}):`, value);
    return value;
  } catch (error) {
    console.error(`Error getting URL param ${param}:`, error);
    return null;
  }
};

// Helper function to get variation ID from builder.tests cookie
const getVariationIdFromCookie = () => {
  const cookies = document.cookie.split('; ');
  // Look for any cookie that starts with 'builder.tests.'
  // Format: builder.tests.{testId}={variationId}
  // Example: builder.tests.dbaa45faae53485498974c6cd037da87=c89dab8773af45c68f31908014201d5b
  const testCookie = cookies.find(cookie => cookie.startsWith('builder.tests.'));
  if (testCookie) {
    const value = testCookie.split('=')[1];
    console.log("Found builder test cookie:", testCookie, "Variation ID:", value);
    return value;
  }
  return null;
};

// Helper function to safely get storage data
const getPendingEvents = () => {
  try {
    const stored = localStorage.getItem(BUILDER_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Error reading pending events:', e);
    return [];
  }
};

// Helper function to safely store data
const storePendingEvent = (eventData) => {
  try {
    const events = getPendingEvents();
    events.push(eventData);
    localStorage.setItem(BUILDER_STORAGE_KEY, JSON.stringify(events));
  } catch (e) {
    console.error('Error storing pending event:', e);
  }
};

// Helper function to remove stored events
const removePendingEvents = () => {
  try {
    localStorage.removeItem(BUILDER_STORAGE_KEY);
  } catch (e) {
    console.error('Error removing pending events:', e);
  }
};

// Function to send tracking data to Builder.io
const sendToBuilder = async (eventData, retryCount = 0) => {
  try {
    const payload = { events: [eventData] };
    console.log("Sending to Builder...", eventData);
    console.log("Payload being sent:", JSON.stringify(payload, null, 2));
    
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

    console.log("Builder response:", response);
    return true;
  } catch (error) {
    console.error('Tracking error:', error);

    if (retryCount < MAX_RETRIES) {
      await new Promise((resolve) =>
        setTimeout(resolve, RETRY_DELAY * (retryCount + 1))
      );
      return sendToBuilder(eventData, retryCount + 1);
    }

    storePendingEvent(eventData);
    return false;
  }
};

// Main tracking function with proper A/B test attribution
const trackConversion = ({ amountInfo, meta = {} }) => {
  console.log("Track Conversion Started...");
  
  // 🔥 CRITICAL: Check URL parameters first for overrides from cross-conversion page
  const overrideSessionId = getUrlParam('builder.overrideSessionId');
  const overrideVisitorId = getUrlParam('builder.overrideVisitorId');
  const overrideVariationId = getUrlParam('builder.overrideVariationId');
  
  // Debug: Log URL parameter extraction
  console.log("URL Parameter Extraction Debug:");
  console.log("- Raw URL:", location.href);
  console.log("- URL Search:", location.search);
  console.log("- Override Session ID:", overrideSessionId);
  console.log("- Override Visitor ID:", overrideVisitorId);
  console.log("- Override Variation ID:", overrideVariationId);
  
  // 🔥 BACKUP: Check localStorage for tracking data if URL params are missing
  let backupTrackingData = null;
  if (!overrideSessionId || !overrideVariationId) {
    try {
      const stored = localStorage.getItem('builderTrackingData');
      if (stored) {
        backupTrackingData = JSON.parse(stored);
        console.log("Found backup tracking data in localStorage:", backupTrackingData);
        
        // Check if the data is recent (within last 30 minutes)
        const dataAge = Date.now() - backupTrackingData.timestamp;
        if (dataAge < 30 * 60 * 1000) { // 30 minutes
          console.log("Backup tracking data is recent, using it as fallback");
          console.log("Backup data age:", Math.round(dataAge / 1000), "seconds");
        } else {
          console.log("Backup tracking data is too old, ignoring");
          console.log("Backup data age:", Math.round(dataAge / 1000), "seconds");
          backupTrackingData = null;
        }
      } else {
        console.log("No backup tracking data found in localStorage");
      }
    } catch (e) {
      console.error("Error reading backup tracking data:", e);
    }
  } else {
    console.log("URL parameters found, skipping backup data check");
  }
  
  // Fallback to cookies/localStorage if URL params not found
  const sessionId = overrideSessionId || 
    (backupTrackingData && backupTrackingData.sessionId) ||
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('builderSessionId='))
      ?.split('=')[1] || 
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('builder.sessionId='))
      ?.split('=')[1] || null;

  const visitorId = overrideVisitorId || 
    (backupTrackingData && backupTrackingData.visitorId) ||
    localStorage.getItem('builderVisitorId') || null;

  // 🔥 CRITICAL FIX: Use the proper variation ID extraction for A/B tests
  const variationId = overrideVariationId || 
    (backupTrackingData && backupTrackingData.variationId) ||
    getVariationIdFromCookie() || null;
    
  // Debug variation ID extraction
  console.log("Variation ID extraction debug:", {
    overrideVariationId,
    backupVariationId: backupTrackingData && backupTrackingData.variationId,
    cookieVariationId: getVariationIdFromCookie(),
    finalVariationId: variationId
  });

  console.log("Session ID:", sessionId);
  console.log("Variation ID:", variationId);
  console.log("Visitor ID:", visitorId);
  console.log("Amount:", amountInfo.amount);
  console.log("URL Overrides:", { 
    overrideSessionId, 
    overrideVisitorId, 
    overrideVariationId 
  });
  console.log("Data Sources:", {
    sessionIdSource: overrideSessionId ? 'URL' : (backupTrackingData && backupTrackingData.sessionId) ? 'localStorage backup' : 'cookies',
    variationIdSource: overrideVariationId ? 'URL' : (backupTrackingData && backupTrackingData.variationId) ? 'localStorage backup' : 'cookies',
    visitorIdSource: overrideVisitorId ? 'URL' : (backupTrackingData && backupTrackingData.visitorId) ? 'localStorage backup' : 'localStorage'
  });

  // Debug: Log all builder-related cookies
  const allBuilderCookies = document.cookie
    .split('; ')
    .filter(cookie => cookie.includes('builder'));
  console.log("All Builder cookies:", allBuilderCookies);

  // Extract URL path and host for proper attribution
  const urlPath = new URL(location.href).pathname;
  const host = new URL(location.href).host;
  
  // Detect device type (simplified)
  const device = /Mobile|Android|iPhone|iPad/.test(navigator.userAgent) ? 'mobile' : 'desktop';

  const eventData = {
    type: 'conversion',
    data: {
      amount: amountInfo.amount,
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

  console.log("Event data being sent:", eventData);
  console.log("Final variation ID in event data:", eventData.data.userAttributes.variationId);
  console.log("Final session ID in event data:", eventData.data.userAttributes.sessionId);
  return sendToBuilder(eventData);
};

// ✅ Main event listener for checkout completion
analytics.subscribe('checkout_completed', (event) => {
  console.log("Checkout Completed Event Received:", event);
  
  if (!event.data || !event.data.checkout) {
    console.error('Invalid checkout data received');
    return;
  }

  const checkout = event.data.checkout;
  console.log("Processing checkout:", checkout);

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

// Optional: Track page views for better attribution
analytics.subscribe('page_viewed', (event) => {
  console.log("Page Viewed Event:", event);
  
  // Log current session and variation info for debugging
  const sessionId = getUrlParam('builder.overrideSessionId') || 
    document.cookie
      .split('; ')
      .find((row) => row.startsWith('builderSessionId='))
      ?.split('=')[1] || null;
      
  const variationId = getUrlParam('builder.overrideVariationId') || getVariationIdFromCookie() || null;
  
  console.log("Page view session info:", { sessionId, variationId, url: location.href });
});

// Try to send pending events on page load
window.addEventListener('load', async () => {
  const pendingEvents = getPendingEvents();
  if (pendingEvents.length > 0) {
    console.log("Processing pending events:", pendingEvents);
    const results = await Promise.all(
      pendingEvents.map((event) => sendToBuilder(event))
    );

    if (results.every(Boolean)) {
      removePendingEvents();
    }
  }
});

// Backup tracking before page unload using sendBeacon
window.addEventListener('beforeunload', () => {
  const pendingEvents = getPendingEvents();
  if (pendingEvents.length > 0) {
    try {
      // Send each event individually wrapped in { events: [...] }
      pendingEvents.forEach(event => {
        navigator.sendBeacon(
          `https://cdn.builder.io/api/v1/track?apiKey=${API_KEY}`,
          JSON.stringify({ events: [event] })
        );
      });
      removePendingEvents();
    } catch (e) {
      console.error('Error sending beacon:', e);
    }
  }
});

// Debug function to test URL parameter extraction
const debugUrlParams = () => {
  console.log("=== URL PARAMETER DEBUG ===");
  console.log("Current URL:", location.href);
  console.log("URL Search:", location.search);
  
  const urlParams = new URLSearchParams(location.search);
  console.log("All URL Parameters:", Object.fromEntries(urlParams));
  
  console.log("Builder Override Parameters:");
  console.log("- builder.overrideSessionId:", urlParams.get('builder.overrideSessionId'));
  console.log("- builder.overrideVisitorId:", urlParams.get('builder.overrideVisitorId'));
  console.log("- builder.overrideVariationId:", urlParams.get('builder.overrideVariationId'));
  console.log("=== END DEBUG ===");
};

// Debug: Log initialization
console.log("Builder.io conversion tracking pixel initialized");
console.log("API Key:", API_KEY);
debugUrlParams();
