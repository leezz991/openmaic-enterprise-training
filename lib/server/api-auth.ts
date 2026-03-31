import { apiError, API_ERROR_CODES } from '@/lib/server/api-response';
import { getServerSession, sessionHasPermission } from '@/lib/server/auth';
import type { AppPermission } from '@/lib/auth/permissions';

export async function requireApiPermission(permission: AppPermission) {
  const session = await getServerSession();
  if (!session) {
    return {
      ok: false as const,
      response: apiError(API_ERROR_CODES.INVALID_REQUEST, 401, 'Authentication required'),
    };
  }
  if (!sessionHasPermission(session, permission)) {
    return {
      ok: false as const,
      response: apiError(API_ERROR_CODES.INVALID_REQUEST, 403, 'Permission denied'),
    };
  }
  return {
    ok: true as const,
    session,
  };
}
