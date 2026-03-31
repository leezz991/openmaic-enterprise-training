import 'server-only';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { AUTH_COOKIE_NAME, verifySessionToken, type AuthenticatedSession } from '@/lib/auth/session';
import { hasPermission, type AppPermission } from '@/lib/auth/permissions';
import { getValidatedSessionFromTokenPayload } from '@/lib/server/user-store';

export async function getServerSession(): Promise<AuthenticatedSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  const tokenPayload = await verifySessionToken(token);
  if (!tokenPayload) {
    return null;
  }
  return getValidatedSessionFromTokenPayload(tokenPayload);
}

export function sessionHasPermission(
  session: Pick<AuthenticatedSession, 'permissions'> | null | undefined,
  permission: AppPermission,
) {
  return hasPermission(session?.permissions, permission);
}

export async function requireServerSession() {
  const session = await getServerSession();
  if (!session) {
    redirect('/login');
  }
  return session;
}

export async function requirePermission(permission: AppPermission) {
  const session = await requireServerSession();
  if (!sessionHasPermission(session, permission)) {
    redirect('/courses');
  }
  return session;
}

export async function requireAnyPermission(permissions: AppPermission[]) {
  const session = await requireServerSession();
  if (!permissions.some((permission) => sessionHasPermission(session, permission))) {
    redirect('/courses');
  }
  return session;
}

export async function requireAdminSession() {
  return requirePermission('users.manage');
}
