import { NextResponse, type NextRequest } from "next/server";
import { getUrlLocale } from "@/i18n/config";

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

  // /fr-FR/... is served by app/localized/[locale]/[[...page]] (URL stays unchanged). A real
  // [locale] segment at the app root would shadow the root [...page] catch-all for every
  // single-segment URL, hence the rewrite. The cookie lets non-prefixed pages read the locale.
  // Un-prefixed URLs are left alone and render in the default locale.
  const locale = getUrlLocale(pathname);
  if (!locale) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.pathname = `/localized${pathname}`;
  const response = NextResponse.rewrite(url);
  response.cookies.set("NEXT_LOCALE", locale, { path: "/" });
  return response;
}

export const config = {
  matcher: [
    "/variant-container-repro/:path*",
    // Must be literals: Next statically analyzes `config`, so no spread/map here.
    "/en-US/:path*",
    "/ca-ES/:path*",
    "/fr-FR/:path*",
  ],
};
