import { NextRequest } from 'next/server';
import { apiError, API_ERROR_CODES, apiSuccess } from '@/lib/server/api-response';
import { requireApiPermission } from '@/lib/server/api-auth';
import { resetUserPassword } from '@/lib/server/user-store';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const auth = await requireApiPermission('users.manage');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const body = await request.json();
    const password = String(body.password || '');
    if (!password) {
      return apiError(API_ERROR_CODES.MISSING_REQUIRED_FIELD, 400, 'Missing required field: password');
    }

    const { id } = (await params) as { id: string };
    const user = await resetUserPassword(id, password);
    return apiSuccess({ user });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to reset password',
      error instanceof Error ? error.message : String(error),
    );
  }
}
