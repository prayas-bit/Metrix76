import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { getRolesFromClaims, supabaseAnonKey, supabaseUrl } from '@/lib/supabaseClient';

const protectedRoutes = [
  { prefix: '/evaluations', allowedRoles: ['TECHNICIAN', 'ADMIN'] },
  { prefix: '/verification', allowedRoles: ['APPROVER', 'ADMIN'] },
  { prefix: '/verify', allowedRoles: ['APPROVER', 'ADMIN'] },
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

  // Verify server session securely using getUser() to avoid relying on untrusted/forged cookies
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Extract roles from verified user claims (app_metadata, user_metadata, user.role)
  const claims = {
    role: user.role,
    app_metadata: user.app_metadata,
    user_metadata: user.user_metadata,
  };
  const verifiedRoles = getRolesFromClaims(claims);

  const isAuthorized = route.allowedRoles.some((allowedRole) => verifiedRoles.includes(allowedRole));

  if (!isAuthorized) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}


export const config = {
  matcher: ['/evaluations/:path*', '/verification/:path*', '/verify/:path*'],
};
