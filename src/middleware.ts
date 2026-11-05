import { NextResponse, type NextRequest } from "next/server";
import { getUrlLocale, stripUrlLocale } from "@/i18n/config";

// Repro-only: writes the Builder user-attributes cookie on the server so the SSR inline script
// sees it on the very first visit. Switch locale with ?locale=fr-FR | en-US | ca-ES.
function variantContainerRepro(request: NextRequest) {
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

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/variant-container-repro")) {
    return variantContainerRepro(request);
  }

  // Expose the (locale-stripped) path and URL locale to server components via request headers,
  // so layout-level Builder sections can target on urlPath/locale. Always overwritten, never trusted
  // from the client.
  const locale = getUrlLocale(pathname);
  const barePath = stripUrlLocale(pathname).replace(/(.)\/+$/, "$1");
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", barePath);
  if (locale) requestHeaders.set("x-locale", locale);
  else requestHeaders.delete("x-locale");

  // /fr-FR/cart/ is rewritten to /cart/ (the URL in the browser stays unchanged) and the locale travels
  // in the x-locale header, so EVERY route (Builder catch-all, cart, PDP, ...) is locale-aware without a
  // [locale] segment (which would shadow the root [...page] catch-all). The cookie lets un-prefixed
  // pages keep the visitor's locale; with no cookie they render in the default locale.
  if (!locale) return NextResponse.next({ request: { headers: requestHeaders } });
  const url = request.nextUrl.clone();
  url.pathname = stripUrlLocale(pathname);
  const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  response.cookies.set("NEXT_LOCALE", locale, { path: "/", sameSite: "lax", maxAge: 60 * 60 * 24 * 365 });
  return response;
}

export const config = {
  // Must be a literal: Next statically analyzes `config`. Skips Next internals, API routes and files.
  matcher: ["/((?!_next/|api/|.*\\..*).*)"],
};
