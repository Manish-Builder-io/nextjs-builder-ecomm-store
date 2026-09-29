import { NextResponse, type NextRequest } from "next/server";

// Repro-only middleware (variant-container-repro). Writes the Builder user-attributes cookie on
// the server so the SSR inline script sees it on the very first visit.
// Switch locale with ?locale=fr-FR | en-US | ca-ES (default en-US).
export function middleware(request: NextRequest) {
  const locale = request.nextUrl.searchParams.get("locale") ?? "en-US";
  const response = NextResponse.next();
  // NOTE: must be written RAW (not URL-encoded). The SSR variants script does
  // JSON.parse(document.cookie value) without decodeURIComponent, so NextResponse.cookies.set()
  // (which encodes) silently makes the script fall back to the default variant.
  const value = JSON.stringify({
    urlPath: "/variant-container-repro/",
    host: request.nextUrl.host,
    device: "desktop",
    locale,
  });
  response.headers.append("Set-Cookie", `builder.userAttributes=${value}; Path=/`);
  return response;
}

export const config = {
  matcher: ["/variant-container-repro/:path*"],
};
