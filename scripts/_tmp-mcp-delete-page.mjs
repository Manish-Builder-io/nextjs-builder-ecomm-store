import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const CONTENT_ID = "f3598b4633ef4764ba2204939539d1ce_e78f29def45a4f40ab0488d27d0b8a72";
const MODEL_NAME = "page";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const mcpConfig = JSON.parse(readFileSync(join(root, ".cursor/mcp.json"), "utf8"));
const AUTH = mcpConfig.mcpServers.builder.headers.Authorization;
const MCP_URL = mcpConfig.mcpServers.builder.url;

function parseMcpBody(text, headers) {
  const ctype = headers.get("content-type") || "";
  if (ctype.includes("text/event-stream") || text.startsWith("event:") || text.includes("\ndata:")) {
    const payloads = [];
    for (const line of text.split("\n")) {
      if (line.startsWith("data:")) {
        const raw = line.slice(5).trim();
        if (raw && raw !== "[DONE]") payloads.push(JSON.parse(raw));
      }
    }
    return payloads.at(-1) ?? JSON.parse(text);
  }
  return JSON.parse(text);
}

async function mcpRpc(session, method, params, id) {
  const headers = {
    Authorization: AUTH,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
  };
  if (session.sessionId) headers["Mcp-Session-Id"] = session.sessionId;

  const res = await fetch(MCP_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({ jsonrpc: "2.0", id, method, params }),
  });
  const sessionId = res.headers.get("mcp-session-id") || session.sessionId;
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} HTTP ${res.status}: ${text.slice(0, 800)}`);
  const json = text ? parseMcpBody(text, res.headers) : null;
  if (json?.error) throw new Error(`${method} RPC error: ${JSON.stringify(json.error)}`);
  return { sessionId, json };
}

async function tryMcpDelete() {
  const session = { sessionId: null };
  const init = await mcpRpc(
    session,
    "initialize",
    {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "cursor-local-script", version: "1.0" },
    },
    1
  );
  session.sessionId = init.sessionId;

  await fetch(MCP_URL, {
    method: "POST",
    headers: {
      Authorization: AUTH,
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(session.sessionId ? { "Mcp-Session-Id": session.sessionId } : {}),
    },
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });

  const listed = await mcpRpc(session, "tools/list", {}, 2);
  const tools = listed.json?.result?.tools || [];
  const deleteTool = tools.find((t) => /delete/i.test(t.name));
  if (!deleteTool) {
    console.log("mcp_has_no_delete_tool", tools.map((t) => t.name).join(", "));
    return false;
  }

  const created = await mcpRpc(
    session,
    "tools/call",
    {
      name: deleteTool.name,
      arguments: {
        contentId: CONTENT_ID,
        id: CONTENT_ID,
        modelName: MODEL_NAME,
        model: MODEL_NAME,
      },
    },
    3
  );
  console.log("MCP_DELETE_RESULT", JSON.stringify(created.json, null, 2).slice(0, 4000));
  return true;
}

async function writeApiDelete() {
  const url = `https://builder.io/api/v1/write/${MODEL_NAME}/${CONTENT_ID}`;
  const res = await fetch(url, {
    method: "DELETE",
    headers: { Authorization: AUTH },
  });
  const text = await res.text();
  console.log("WRITE_API_STATUS", res.status);
  console.log("WRITE_API_BODY", text.slice(0, 2000));
  if (!res.ok) throw new Error(`Write API delete failed: ${res.status} ${text.slice(0, 500)}`);
}

const deletedViaMcp = await tryMcpDelete();
if (!deletedViaMcp) {
  await writeApiDelete();
}
