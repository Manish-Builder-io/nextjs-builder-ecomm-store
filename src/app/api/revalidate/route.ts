import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";

// Helper to create CORS headers
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Signature, X-Builder-Signature, X-Webhook-Event",
  };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    // Handle webhook validation requests (Builder.io sends these to verify the endpoint)
    const url = request.nextUrl;
    const validation = url.searchParams.get("validation");
    
    if (validation) {
      // Return validation response for Builder.io webhook setup
      return NextResponse.json(
        {
          success: true,
          message: "Webhook endpoint validated",
          validation: true,
        },
        { 
          status: 200,
          headers: getCorsHeaders(),
        }
      );
    }

    // Parse the webhook payload
    const body = await request.json().catch(() => ({}));
    const headers = Object.fromEntries(request.headers.entries());

    // Log webhook data for testing
    console.log("=== Webhook Received ===");
    console.log("Timestamp:", new Date().toISOString());
    console.log("Headers:", JSON.stringify(headers, null, 2));
    console.log("Body:", JSON.stringify(body, null, 2));
    console.log("======================");

    // Extract common webhook fields
    // Builder.io webhook payload: body.content.data.url holds the page path
    const eventType = body.type || body.event || headers["x-webhook-event"] || "unknown";
    const modelName = body.modelName || body.model || body.data?.model;
    const entryId = body.content?.id || body.id || body.entryId || body.data?.id;
    const urlPath =
      body.content?.data?.url ||
      body.content?.data?.urlPath ||
      body.urlPath ||
      body.data?.urlPath;

    // Optional: Validate webhook signature if provided
    const signature = headers["x-signature"] || headers["x-builder-signature"];
    if (process.env.WEBHOOK_SECRET && signature) {
      console.log("Signature received:", signature);
    }

    // Handle revalidation based on webhook data
    const revalidatedPaths: string[] = [];

    // Revalidate specific path if urlPath is provided
    if (urlPath && typeof urlPath === "string") {
      revalidatePath(urlPath, "page");
      revalidatedPaths.push(urlPath);
      console.log(`Revalidated path: ${urlPath}`);
    }

    // Always revalidate layout so all pages pick up the change
    if (revalidatedPaths.length === 0) {
      revalidatePath("/", "layout");
      revalidatedPaths.push("/ (layout)");
      console.log("Revalidated all pages via layout");
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Webhook received and processed",
        eventType,
        revalidated: {
          paths: revalidatedPaths,
        },
        received: {
          modelName,
          entryId,
          urlPath,
        },
        timestamp: new Date().toISOString(),
      },
      { 
        status: 200,
        headers: getCorsHeaders(),
      }
    );
  } catch (error) {
    console.error("Webhook processing error:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

// Also support GET for testing
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const testPath = searchParams.get("path");

  if (testPath) {
    revalidatePath(testPath);
    return NextResponse.json({
      success: true,
      message: `Revalidated path: ${testPath}`,
      timestamp: new Date().toISOString(),
    }, {
      headers: getCorsHeaders(),
    });
  }

  return NextResponse.json({
    message: "Webhook endpoint is active",
    usage: {
      POST: "Send webhook payload to revalidate content",
      GET: "Test revalidation with ?path=/some-path",
    },
    note: "For Builder.io webhooks, use a public URL (not localhost). Use ngrok or similar for local testing.",
    timestamp: new Date().toISOString(),
  }, {
    headers: getCorsHeaders(),
  });
}

