import { NextRequest, NextResponse } from "next/server";

// Helper to create CORS headers
function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

interface BuilderPayload {
  name: string;
  published: string;
  data: Record<string, unknown>;
  meta?: Record<string, unknown>;
  createdDate?: number;
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function POST(request: NextRequest) {
  try {
    // Get Builder.io private API key from environment
    const privateKey = process.env.BUILDER_PRIVATE_API_KEY;
    
    if (!privateKey) {
      return NextResponse.json(
        {
          success: false,
          error: "BUILDER_PRIVATE_API_KEY environment variable is not set",
        },
        { 
          status: 500,
          headers: getCorsHeaders(),
        }
      );
    }

    // Parse the request body
    const body = await request.json() as Record<string, unknown>;
    
    // Extract model name from body or use default
    const modelName = (body.model as string) || (body.modelName as string) || "resource-guide-model";
    
    // Prepare the payload for Builder.io Write API
    const payload: BuilderPayload = {
      name: "",
      published: "draft",
      data: {},
    };
    
    // If body already has the correct structure (name, published, data, meta), use it directly
    if (body.name && body.data) {
      payload.name = body.name as string;
      payload.published = (body.published as string) || "draft";
      payload.data = body.data as Record<string, unknown>;
      if (body.meta) {
        payload.meta = body.meta as Record<string, unknown>;
      }
      if (body.createdDate) {
        payload.createdDate = body.createdDate as number;
      }
    } else {
      // Otherwise, structure it properly
      payload.name = (body.name as string) || "Untitled Content";
      payload.published = (body.published as string) || "draft";
      payload.data = (body.data as Record<string, unknown>) || body;
      if (body.meta) {
        payload.meta = body.meta as Record<string, unknown>;
      }
    }

    // Builder.io Write API endpoint for creating content
    const writeApiUrl = `https://builder.io/api/v1/write/${modelName}`;
    
    // Make the POST request to Builder.io Write API
    const response = await fetch(writeApiUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${privateKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    // Parse the response
    const responseData = await response.json() as Record<string, unknown>;

    if (!response.ok) {
      return NextResponse.json(
        {
          success: false,
          error: (responseData.message as string) || (responseData.error as string) || "Failed to create content",
          details: responseData,
          status: response.status,
        },
        { 
          status: response.status,
          headers: getCorsHeaders(),
        }
      );
    }

    // Return success response
    return NextResponse.json(
      {
        success: true,
        message: "Content created successfully",
        data: responseData,
        entryId: responseData.id as string,
        model: modelName,
        timestamp: new Date().toISOString(),
      },
      { 
        status: 200,
        headers: getCorsHeaders(),
      }
    );
  } catch (error) {
    console.error("Error creating Builder.io content:", error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
        timestamp: new Date().toISOString(),
      },
      { 
        status: 500,
        headers: getCorsHeaders(),
      }
    );
  }
}

// Also support GET for testing/documentation
export async function GET() {
  return NextResponse.json(
    {
      message: "Builder.io Content Creation API",
      usage: {
        method: "POST",
        endpoint: "/api/content/create",
        headers: {
          "Content-Type": "application/json",
        },
        body: {
          model: "resource-guide-model (optional, defaults to 'resource-guide-model')",
          name: "Content name",
          published: "draft | published (optional, defaults to 'draft')",
          data: "Content data object with blocks, title, slug, etc.",
          meta: "Metadata object (optional)",
        },
      },
      note: "Requires BUILDER_PRIVATE_API_KEY environment variable to be set",
      timestamp: new Date().toISOString(),
    },
    {
      headers: getCorsHeaders(),
    }
  );
}

