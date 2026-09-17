import { NextResponse, type NextRequest } from "next/server";
import { AD_SCOPE_COOKIE, validAdScope } from "@/lib/ads/scope";

/** Establish the host-only rate-limit scope before any game can request an ad. */
export function middleware(request: NextRequest) {
  if (validAdScope(request.cookies.get(AD_SCOPE_COOKIE)?.value)) return NextResponse.next();
  const response = NextResponse.next();
  response.cookies.set(AD_SCOPE_COOKIE, crypto.randomUUID(), {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
  });
  return response;
}

export const config = { matcher: ["/games/:path*", "/webgl-loader/:path*"] };
