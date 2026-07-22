import { NextRequest, NextResponse } from "next/server";

// Builder webhook payload shape (simplified — only fields we use)
interface BuilderEntry {
  id?: string;
  name?: string;
  modelId?: string;
  modelName?: string;
  published?: string;
  lastUpdatedBy?: string;
  lastUpdated?: number;
  createdDate?: number;
  data?: {
    title?: string;
    url?: string;
    [key: string]: unknown;
  };
}

interface BuilderWebhookBody {
  newValue?: BuilderEntry;
  previousValue?: BuilderEntry;
  operation?: string;
  modelName?: string;
  modelId?: string;
  id?: string;
  [key: string]: unknown;
}

function getCorsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function formatTimestamp(ms?: number): string {
  if (!ms) return "unknown";
  return new Date(ms).toISOString().replace("T", " ").slice(0, 19) + " UTC";
}

function operationEmoji(operation?: string): string {
  switch (operation) {
    case "publish":
    case "publishDraft":
      return ":white_check_mark:";
    case "unpublish":
      return ":pause_button:";
    case "archive":
      return ":file_folder:";
    case "delete":
      return ":wastebasket:";
    case "scheduledStart":
      return ":calendar:";
    case "scheduledEnd":
      return ":calendar:";
    default:
      return ":bell:";
  }
}

function buildSlackPayload(body: BuilderWebhookBody) {
  const entry = body.newValue ?? body.previousValue;
  const operation = body.operation ?? "update";
  const modelName = body.modelName ?? entry?.modelName ?? "content";
  const entryName = entry?.name ?? entry?.data?.title ?? "Untitled";
  const entryId = entry?.id ?? body.id ?? "";
  const pageUrl = entry?.data?.url;
  const updatedBy = entry?.lastUpdatedBy ?? "unknown";
  const updatedAt = formatTimestamp(entry?.lastUpdated ?? entry?.createdDate);
  const emoji = operationEmoji(operation);

  const headerText = `${emoji} Builder.io — *${modelName}* ${operation}`;

  const fields: Array<{ type: string; text: { type: string; text: string } }> =
    [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Entry:* ${entryName}${entryId ? `\n*ID:* \`${entryId}\`` : ""}`,
        },
      },
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*Operation:* \`${operation}\`\n*Updated by:* ${updatedBy}\n*At:* ${updatedAt}`,
        },
      },
    ];

  const blocks: unknown[] = [
    {
      type: "header",
      text: { type: "plain_text", text: `Builder.io — ${modelName} ${operation}`, emoji: true },
    },
    {
      type: "section",
      text: { type: "mrkdwn", text: headerText },
    },
    ...fields,
  ];

  if (pageUrl) {
    blocks.push({
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "View page", emoji: true },
          url: pageUrl,
          action_id: "view_page",
        },
      ],
    });
  }

  blocks.push({ type: "divider" });

  return { blocks };
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: getCorsHeaders() });
}

export async function POST(request: NextRequest) {
  const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
  if (!slackWebhookUrl) {
    return NextResponse.json(
      { error: "SLACK_WEBHOOK_URL environment variable is not set" },
      { status: 500, headers: getCorsHeaders() }
    );
  }

  let body: BuilderWebhookBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: getCorsHeaders() }
    );
  }

  const slackPayload = buildSlackPayload(body);

  const slackResponse = await fetch(slackWebhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(slackPayload),
  });

  if (!slackResponse.ok) {
    const slackError = await slackResponse.text();
    console.error("Slack webhook error:", slackError);
    return NextResponse.json(
      { error: "Failed to forward to Slack", detail: slackError },
      { status: 502, headers: getCorsHeaders() }
    );
  }

  return NextResponse.json(
    { message: "Notification sent to Slack" },
    { headers: getCorsHeaders() }
  );
}

export async function GET() {
  return new NextResponse("Method GET Not Allowed", {
    status: 405,
    headers: { Allow: "POST", ...getCorsHeaders() },
  });
}
