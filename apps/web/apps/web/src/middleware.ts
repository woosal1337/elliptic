import { NextResponse, type NextRequest } from "next/server";

function isAllowedNext(next: string | null | undefined): next is string {
  return Boolean(next) && (next!.startsWith("/app") || next!.startsWith("/authorize"));
}

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") ?? "").split(":")[0] ?? "";
  const { pathname } = request.nextUrl;

  if (host.startsWith("docs.")) {
    if (
      pathname.startsWith("/docs") ||
      pathname.startsWith("/_next") ||
      pathname.startsWith("/api") ||
      /\.[a-z0-9]+$/i.test(pathname)
    ) {
      return NextResponse.next();
    }
    const url = request.nextUrl.clone();
    url.pathname = pathname === "/" ? "/docs" : `/docs${pathname}`;
    return NextResponse.rewrite(url);
  }

  const appHost = process.env.APP_HOST;
  const docsHost = process.env.DOCS_HOST;
  if (appHost && docsHost && host === appHost && (pathname === "/docs" || pathname.startsWith("/docs/"))) {
    const url = request.nextUrl.clone();
    url.host = docsHost;
    url.pathname = pathname.replace(/^\/docs/, "") || "/";
    return NextResponse.redirect(url);
  }

  // Gate on the refresh token, not the access token. The access_token cookie
  // expires after ACCESS_TOKEN_EXPIRE_MINUTES (30 min) and the browser drops it,
  // while the refresh_token cookie lives for REFRESH_TOKEN_EXPIRE_DAYS (30 days).
  // The client (lib/api.ts) silently mints a fresh access token from the refresh
  // token on the first 401, so a present refresh token means the session is still
  // alive. Gating on access_token bounced idle users back to /login every 30
  // minutes even though their 30-day session was still valid.
  const hasSession = request.cookies.has("refresh_token");
  const isProtected = pathname.startsWith("/app") || pathname === "/authorize";

  if (isProtected && !hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  if ((pathname === "/login" || pathname === "/signup") && hasSession) {
    const next = request.nextUrl.searchParams.get("next");
    const target = isAllowedNext(next) ? next : "/app";
    return NextResponse.redirect(new URL(target, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
