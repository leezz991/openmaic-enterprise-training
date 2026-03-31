import { apiError, API_ERROR_CODES, apiSuccess } from '@/lib/server/api-response';
import { requireApiPermission } from '@/lib/server/api-auth';
import { createUserRecord, getUserWithStatsList } from '@/lib/server/user-store';
import { isAppRole } from '@/lib/auth/permissions';

export async function GET() {
  const auth = await requireApiPermission('users.read');
  if (!auth.ok) {
    return auth.response;
  }

  const users = await getUserWithStatsList();
  return apiSuccess({ users });
}

export async function POST(request: Request) {
  const auth = await requireApiPermission('users.manage');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const username = String(body.username || '').trim();
    const displayName = String(body.displayName || '').trim();
    const password = String(body.password || '');
    const role = String(body.role || '');

    if (!username || !displayName || !password || !isAppRole(role)) {
      return apiError(
        API_ERROR_CODES.MISSING_REQUIRED_FIELD,
        400,
        'Missing or invalid fields: username, displayName, password, role',
      );
    }

    const user = await createUserRecord({
      username,
      displayName,
      password,
      role,
      enabled: body.enabled !== false,
      grantedPermissions: Array.isArray(body.grantedPermissions) ? body.grantedPermissions : [],
      revokedPermissions: Array.isArray(body.revokedPermissions) ? body.revokedPermissions : [],
    });

    return apiSuccess({ user }, 201);
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to create user',
      error instanceof Error ? error.message : String(error),
    );
  }
}
