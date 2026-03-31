import { NextRequest } from 'next/server';
import { apiError, API_ERROR_CODES, apiSuccess } from '@/lib/server/api-response';
import { requireApiPermission } from '@/lib/server/api-auth';
import { deleteUserRecord, getUserRecordById, updateUserRecord } from '@/lib/server/user-store';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const auth = await requireApiPermission('users.manage');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = (await params) as { id: string };
    const body = await request.json();
    const user = await updateUserRecord(id, {
      username: typeof body.username === 'string' ? body.username : undefined,
      displayName: typeof body.displayName === 'string' ? body.displayName : undefined,
      role: typeof body.role === 'string' ? body.role : undefined,
      enabled: typeof body.enabled === 'boolean' ? body.enabled : undefined,
      grantedPermissions: Array.isArray(body.grantedPermissions) ? body.grantedPermissions : undefined,
      revokedPermissions: Array.isArray(body.revokedPermissions) ? body.revokedPermissions : undefined,
    });
    return apiSuccess({ user });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to update user',
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<unknown> }) {
  const auth = await requireApiPermission('users.manage');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { id } = (await params) as { id: string };
    const existing = await getUserRecordById(id);
    if (!existing) {
      return apiError(API_ERROR_CODES.INVALID_REQUEST, 404, 'User not found');
    }
    await deleteUserRecord(id);
    return apiSuccess({ deleted: true });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to delete user',
      error instanceof Error ? error.message : String(error),
    );
  }
}
