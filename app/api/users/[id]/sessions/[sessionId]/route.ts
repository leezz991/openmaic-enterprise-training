import { NextRequest } from 'next/server';
import { apiError, API_ERROR_CODES, apiSuccess } from '@/lib/server/api-response';
import { requireApiPermission } from '@/lib/server/api-auth';
import { revokeSession } from '@/lib/server/user-store';

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<unknown> },
) {
  const auth = await requireApiPermission('sessions.manage');
  if (!auth.ok) {
    return auth.response;
  }

  try {
    const { sessionId } = (await params) as { id: string; sessionId: string };
    await revokeSession(sessionId);
    return apiSuccess({ revoked: true });
  } catch (error) {
    return apiError(
      API_ERROR_CODES.INTERNAL_ERROR,
      500,
      'Failed to revoke session',
      error instanceof Error ? error.message : String(error),
    );
  }
}
