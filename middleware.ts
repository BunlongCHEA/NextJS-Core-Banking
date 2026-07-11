import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const token = request.cookies.get("cbs_token")?.value;
  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith("/dashboard");
  const isLogin = pathname === "/login";

  if (isProtected && !token) {
    const url = new URL("/login", request.url);
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  if (isLogin && token) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
