import { NextResponse, type NextRequest } from "next/server";

const SUPPORTED_LOCALES = ["en-US", "ca-ES", "fr-FR"] as const;
type Locale = typeof SUPPORTED_LOCALES[number];
const DEFAULT_LOCALE: Locale = "en-US";

function getLocaleFromPath(pathname: string): Locale | null {
  const seg = pathname.split("/").filter(Boolean)[0];
  return (SUPPORTED_LOCALES as readonly string[]).includes(seg ?? "") ? (seg as Locale) : null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Skip next internals and static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/api") || pathname.match(/\.(?:\w{2,4})$/)) {
    return NextResponse.next();
  }

  const currentLocale = getLocaleFromPath(pathname);

  // If no locale prefix, redirect to default locale
  if (!currentLocale) {
    const url = request.nextUrl.clone();
    url.pathname = `/${DEFAULT_LOCALE}${pathname}`;
    return NextResponse.redirect(url);
  }

  // Persist locale in cookie and continue
  const response = NextResponse.next();
  response.cookies.set("NEXT_LOCALE", currentLocale, { path: "/" });
  return response;
}

export const config = {
  matcher: "/:path*",
};


