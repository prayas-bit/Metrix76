import { NextResponse, type NextRequest } from 'next/server';

const protectedRoutes = [
  { prefix: '/evaluations', allowedRoles: ['TECHNICIAN', 'ADMIN'] },
  { prefix: '/verification', allowedRoles: ['APPROVER', 'ADMIN'] },
  { prefix: '/verify', allowedRoles: ['APPROVER', 'ADMIN'] },
] as const;

function decodeJwtPayload(token?: string) {
  if (!token) return null;

  const parts = token.split('.');
  if (parts.length < 2) return null;

  const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=');

  try {
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf-8'));
  } catch {
    return null;
  }
}

function getCurrentRole(request: NextRequest): string | null {
  const cookieCandidates = [
    request.cookies.get('user-role')?.value,
    request.cookies.get('role')?.value,
    request.cookies.get('app-role')?.value,
    request.cookies.get('sb-role')?.value,
  ];

  const explicitRole = cookieCandidates.find((value) => !!value && value.trim().length > 0);
  if (explicitRole) return explicitRole.toUpperCase();

  const accessToken =
    request.cookies.get('sb-access-token')?.value ??
    request.cookies.get('supabase-auth-token')?.value ??
    request.cookies.get('access_token')?.value ??
    request.cookies.get('sb-auth-token')?.value;

  const claims = decodeJwtPayload(accessToken);
  if (!claims) return null;

  const roleFromToken =
    claims.role ??
    claims.user_role ??
    claims.userRole ??
    claims.app_metadata?.role ??
    claims.user_metadata?.role ??
    null;

  return roleFromToken ? String(roleFromToken).toUpperCase() : null;
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const route = protectedRoutes.find(({ prefix }) => pathname === prefix || pathname.startsWith(`${prefix}/`));

  if (!route) {
    return NextResponse.next();
  }

  const role = getCurrentRole(request);
  const isAuthorized = !!role && route.allowedRoles.some((allowedRole) => allowedRole === role);

  if (!isAuthorized) {
    const redirectUrl = new URL('/', request.url);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/evaluations/:path*', '/verification/:path*', '/verify/:path*'],
};
