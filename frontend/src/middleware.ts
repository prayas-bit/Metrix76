import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getRolesFromClaims, supabaseAnonKey, supabaseUrl } from '@/lib/supabaseClient';

const protectedRoutes = [
  { prefix: '/evaluations', allowedRoles: ['TECHNICIAN', 'ADMIN'] },
  { prefix: '/verification', allowedRoles: ['APPROVER', 'ADMIN'] },
  { prefix: '/instruments', allowedRoles: ['TECHNICIAN', 'ADMIN', 'APPROVER'] },
  { prefix: '/standards', allowedRoles: ['TECHNICIAN', 'ADMIN', 'APPROVER'] },
  { prefix: '/repository', allowedRoles: ['TECHNICIAN', 'ADMIN', 'APPROVER'] },
  { prefix: '/archive', allowedRoles: ['TECHNICIAN', 'ADMIN', 'APPROVER'] },
] as const;

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const route = protectedRoutes.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!route) {
    return NextResponse.next();
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Check verified Supabase user session
  let verifiedRoles: string[] = [];
  let isAuthenticated = false;

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isAuthenticated = true;
      const claims = {
        role: user.role,
        app_metadata: user.app_metadata,
        user_metadata: user.user_metadata,
      };
      verifiedRoles = getRolesFromClaims(claims);
    }
  } catch {
    // Supabase auth failed
  }

  // If unauthenticated, redirect to login page immediately
  if (!isAuthenticated) {
    const redirectUrl = new URL(`/login?redirect=${encodeURIComponent(pathname)}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Determine effective roles strictly from server-verified claims
  const effectiveRoles = [...verifiedRoles];
  const activeRoleCookie = request.cookies.get('oiml_active_role')?.value?.toUpperCase();
  if (activeRoleCookie && verifiedRoles.includes('ADMIN')) {
    // Verified Admins can switch persona views
    if (!effectiveRoles.includes(activeRoleCookie)) {
      effectiveRoles.push(activeRoleCookie);
    }
  }

  const isAuthorized = route.allowedRoles.some((allowedRole) => effectiveRoles.includes(allowedRole));

  if (!isAuthorized) {
    const redirectUrl = new URL(`/login?unauthorized=true&required=${route.allowedRoles.join(',')}`, request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    '/evaluations/:path*',
    '/verification/:path*',
    '/instruments/:path*',
    '/standards/:path*',
    '/repository/:path*',
    '/archive/:path*'
  ],
};
