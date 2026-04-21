import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 认证检查现在由客户端处理
// Middleware 只负责基本的路由匹配，不做服务端 cookie 检查
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Public paths
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/(auth)") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // 直接放行，客户端会处理认证检查
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
