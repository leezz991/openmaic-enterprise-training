import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { AUTH_COOKIE_NAME, getPostLoginDestination, isRouteMatch, verifySessionToken } from '@/lib/auth/session';
import { hasPermission, type AppPermission } from '@/lib/auth/permissions';

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.redirect(loginUrl);
}

function redirectToCourses(request: NextRequest) {
  return NextResponse.redirect(new URL('/courses', request.url));
}

function unauthorizedJson(status: number, error: string) {
  return NextResponse.json({ success: false, error }, { status });
}

function hasAnyPermission(
  permissions: readonly AppPermission[] | undefined,
  required: AppPermission[],
): boolean {
  return required.some((permission) => hasPermission(permissions, permission));
}

const pageRules: Array<{ routes: string[]; permissions: AppPermission[] }> = [
  { routes: ['/courses'], permissions: ['courses.read'] },
  { routes: ['/learn'], permissions: ['courses.learn'] },
  { routes: ['/admin/courses'], permissions: ['courses.manage'] },
  { routes: ['/admin/users'], permissions: ['users.manage'] },
  { routes: ['/'], permissions: ['classroom.access'] },
  { routes: ['/creator'], permissions: ['classroom.access'] },
  { routes: ['/classroom'], permissions: ['classroom.access'] },
  { routes: ['/generation-preview'], permissions: ['classroom.generate'] },
];

const apiRules: Array<{ routes: string[]; permissions: AppPermission[]; methods?: string[] }> = [
  { routes: ['/api/courses/publish'], permissions: ['courses.manage', 'courses.publish'], methods: ['POST'] },
  { routes: ['/api/courses'], permissions: ['courses.manage'], methods: ['PATCH', 'POST', 'DELETE'] },
  { routes: ['/api/courses'], permissions: ['courses.read'], methods: ['GET'] },
  { routes: ['/api/classroom-media'], permissions: ['courses.learn', 'classroom.access'] },
  { routes: ['/api/users'], permissions: ['users.manage'] },
  { routes: ['/api/classroom'], permissions: ['classroom.access'] },
  { routes: ['/api/generate'], permissions: ['classroom.generate'] },
  { routes: ['/api/generate-classroom'], permissions: ['classroom.generate'] },
  { routes: ['/api/parse-pdf'], permissions: ['classroom.generate'] },
  { routes: ['/api/server-providers'], permissions: ['classroom.access'] },
  { routes: ['/api/verify-image-provider'], permissions: ['classroom.access'] },
  { routes: ['/api/verify-model'], permissions: ['classroom.access'] },
  { routes: ['/api/verify-pdf-provider'], permissions: ['classroom.access'] },
  { routes: ['/api/verify-video-provider'], permissions: ['classroom.access'] },
  { routes: ['/api/web-search'], permissions: ['classroom.access'] },
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(AUTH_COOKIE_NAME)?.value);

  if (pathname === '/login') {
    if (session) {
      return NextResponse.redirect(new URL(getPostLoginDestination(session.role), request.url));
    }
    return NextResponse.next();
  }

  const matchedApiRule = apiRules.find(
    (rule) =>
      (!rule.methods || rule.methods.includes(request.method)) &&
      rule.routes.some((route) => isRouteMatch(pathname, route)),
  );
  if (matchedApiRule) {
    if (!session) {
      return unauthorizedJson(401, 'Authentication required');
    }
    if (!hasAnyPermission(session.permissions, matchedApiRule.permissions)) {
      return unauthorizedJson(403, 'Permission denied');
    }
    return NextResponse.next();
  }

  const matchedPageRule = pageRules.find((rule) => rule.routes.some((route) => isRouteMatch(pathname, route)));
  if (matchedPageRule) {
    if (!session) {
      return redirectToLogin(request);
    }
    if (!hasAnyPermission(session.permissions, matchedPageRule.permissions)) {
      return redirectToCourses(request);
    }
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
