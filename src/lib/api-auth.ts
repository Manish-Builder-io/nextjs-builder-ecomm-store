import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/**
 * Shared-secret check for internal API routes. The secret may be sent as the `x-api-secret` header
 * or a `secret` query param (Builder webhooks can only configure a URL).
 * Returns "unconfigured" when the env var is missing so callers can fail closed.
 */
export function checkSecret(request: NextRequest, envName: string): "ok" | "denied" | "unconfigured" {
  const expected = process.env[envName];
  if (!expected) return "unconfigured";
  const provided = request.headers.get("x-api-secret") ?? request.nextUrl.searchParams.get("secret") ?? "";
  return safeEqual(provided, expected) ? "ok" : "denied";
}
