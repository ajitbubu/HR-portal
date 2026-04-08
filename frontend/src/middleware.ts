import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_ROLES = ["super_admin", "hr_admin"];
const MANAGER_ROLES = ["super_admin", "hr_admin", "manager"];

// Routes that require admin role
const ADMIN_ROUTES = ["/admin"];
// Routes that require at least manager role
const MANAGER_ROUTES = ["/approvals", "/leave/approvals", "/timesheets/approvals", "/wfh/approvals"];
// Public routes that never require auth
const PUBLIC_ROUTES = ["/login", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow public routes
  if (PUBLIC_ROUTES.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const role = request.cookies.get("user_role")?.value;

  // No role cookie → not logged in → send to login
  if (!role) {
    // Don't redirect if already on login page or root
    if (pathname === "/" || pathname === "/login") return NextResponse.next();
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // Admin route protection
  if (ADMIN_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!ADMIN_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Manager route protection
  if (MANAGER_ROUTES.some((r) => pathname.startsWith(r))) {
    if (!MANAGER_ROLES.includes(role)) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     * - public folder assets
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
