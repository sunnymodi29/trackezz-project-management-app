import NextAuth from "next-auth";
import authConfig from "@/auth.config";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const { pathname } = req.nextUrl;
  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");
  const isProtected =
    pathname.startsWith("/dashboard") || pathname.startsWith("/api/v1");

  if (isProtected && !isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return Response.redirect(loginUrl);
  }

  if (isLoggedIn && isAuthRoute) {
    const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
    if (
      callbackUrl?.startsWith("/") &&
      !callbackUrl.startsWith("//") &&
      callbackUrl.startsWith("/invite/") &&
      callbackUrl.endsWith("/join")
    ) {
      return Response.redirect(new URL(callbackUrl, req.nextUrl.origin));
    }
    return Response.redirect(new URL("/dashboard", req.nextUrl.origin));
  }
});

export const config = {
  matcher: ["/dashboard/:path*", "/api/v1/:path*", "/login", "/register"],
};
